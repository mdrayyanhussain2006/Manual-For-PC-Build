/**
 * SoloComponentAdapter.ts
 * Integrates the proven 3D model, camera, explode, x-ray, and annotation capabilities
 * from pc-3d-anatomy into the Astro website without style collisions.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getComponentBySlug } from './ComponentRegistry';
import { integrationState } from './IntegrationState';

export interface SoloComponentOptions {
  hostElement: HTMLElement;
  canvas: HTMLCanvasElement;
  slug: string;
  lod?: 0 | 1;
  badgesContainer?: HTMLElement;
  onPartSelect?: (partNumber: string | null, partData: any | null) => void;
  onLoadProgress?: (ratio: number | null) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface PartInfo {
  number: string;
  id: string;
  title: string;
  summary?: string;
  role?: string;
  specs?: string[];
  connectionTips?: string[];
  meshes: THREE.Mesh[];
  anchor: THREE.Vector3;
}

export class SoloComponentAdapter {
  readonly #options: SoloComponentOptions;
  #renderer: THREE.WebGLRenderer | null = null;
  #scene: THREE.Scene | null = null;
  #camera: THREE.PerspectiveCamera | null = null;
  #controls: OrbitControls | null = null;
  #pmrem: THREE.PMREMGenerator | null = null;

  #root: THREE.Group | null = null;
  #partsGroup: THREE.Group | null = null;
  #normScale = 1;
  #manifest: any = null;
  #copy: any = null;

  #partsByNum = new Map<string, PartInfo>();
  #restPos = new Map<THREE.Mesh, THREE.Vector3>();
  #originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  #explodeOffsets = new Map<string, THREE.Vector3>();
  #badgeElements = new Map<string, HTMLButtonElement>();

  #selectedPartNumber: string | null = null;
  #xrayActive = false;
  #explodeProgress = 0;

  #rafId = 0;
  #disposed = false;
  #resizeObserver: ResizeObserver | null = null;

  // Tween state for smooth camera transitions
  #cameraTween: {
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startLookAt: THREE.Vector3;
    targetLookAt: THREE.Vector3;
  } | null = null;

  // Occlusion raycaster
  #raycaster = new THREE.Raycaster();

  constructor(options: SoloComponentOptions) {
    this.#options = options;
  }

  get slug(): string {
    return this.#options.slug;
  }

  get selectedPart(): string | null {
    return this.#selectedPartNumber;
  }

  get parts(): PartInfo[] {
    return Array.from(this.#partsByNum.values());
  }

  get isXray(): boolean {
    return this.#xrayActive;
  }

  get explodeValue(): number {
    return this.#explodeProgress;
  }

  getCameraSnapshot(): { position: [number, number, number]; target: [number, number, number]; quaternion: [number, number, number, number]; distance: number; fov: number } | null {
    if (!this.#camera || !this.#controls) return null;
    const p = this.#camera.position;
    const t = this.#controls.target;
    const q = this.#camera.quaternion;
    return {
      position: [Number(p.x.toFixed(6)), Number(p.y.toFixed(6)), Number(p.z.toFixed(6))],
      target: [Number(t.x.toFixed(6)), Number(t.y.toFixed(6)), Number(t.z.toFixed(6))],
      quaternion: [Number(q.x.toFixed(6)), Number(q.y.toFixed(6)), Number(q.z.toFixed(6)), Number(q.w.toFixed(6))],
      distance: Number(p.distanceTo(t).toFixed(6)),
      fov: Number(this.#camera.fov.toFixed(3)),
    };
  }

  async initialize(): Promise<void> {
    if (this.#disposed) return;
    const { canvas, hostElement } = this.#options;

    // 1. Setup Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(hostElement.clientWidth, hostElement.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.#renderer = renderer;

    // 2. Setup Scene & Environment
    const scene = new THREE.Scene();
    this.#scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.#pmrem = pmrem;
    const roomTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = roomTex;

    // 3. Lighting Rig (Proven Studio Lighting)
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbfd9ff, 1.1);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    // 4. Camera & OrbitControls
    const aspect = Math.max(hostElement.clientWidth / Math.max(hostElement.clientHeight, 1), 0.1);
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.01, 60);
    camera.position.set(2.2, 1.6, 2.4);
    this.#camera = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    this.#controls = controls;

    // 5. Setup Resize Observer
    this.#resizeObserver = new ResizeObserver(() => this.#onResize());
    this.#resizeObserver.observe(hostElement);

    // 6. Click on canvas for raycast selection
    canvas.addEventListener('click', this.#onCanvasClick);

    // 7. Load Asset & Metadata
    await this.#loadDataAndModel();

    // 8. Start Loop
    this.#startRenderLoop();
  }

  async #loadDataAndModel(): Promise<void> {
    const { slug, lod = 0 } = this.#options;
    const compMeta = getComponentBySlug(slug);

    const manifestUrl = compMeta?.manifestUrl || `/component-data/${slug}/manifest.json`;
    const copyUrl = compMeta?.partsCopyUrl || `/component-data/${slug}/parts.en.json`;
    const tier = lod === 1 ? 'lod1' : 'lod0';
    const modelUrl = compMeta?.modelAsset[tier] || `/models/${slug}/${slug}.${tier}.glb`;

    try {
      this.#options.onLoadProgress?.(0.1);
      const [manifestRes, copyRes] = await Promise.all([
        fetch(manifestUrl),
        fetch(copyUrl),
      ]);

      if (!manifestRes.ok) throw new Error(`Failed to load manifest: ${manifestRes.statusText}`);
      if (!copyRes.ok) throw new Error(`Failed to load copy: ${copyRes.statusText}`);

      this.#manifest = await manifestRes.json();
      this.#copy = await copyRes.json();
      this.#options.onLoadProgress?.(0.3);

      await MeshoptDecoder.ready;

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.setMeshoptDecoder(MeshoptDecoder);

      const gltf: GLTF = await new Promise((resolve, reject) => {
        loader.load(
          modelUrl,
          (loadedGltf) => {
            dracoLoader.dispose();
            resolve(loadedGltf);
          },
          (progress) => {
            if (progress.total > 0) {
              const ratio = 0.3 + (progress.loaded / progress.total) * 0.6;
              this.#options.onLoadProgress?.(ratio);
            }
          },
          (err) => {
            dracoLoader.dispose();
            reject(err);
          },
        );
      });

      this.#buildSceneGraph(gltf);
      this.#options.onLoadProgress?.(1.0);
      this.#options.onReady?.();
    } catch (err) {
      console.error(`[SoloComponentAdapter] Error loading ${slug}:`, err);
      this.#options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  #buildSceneGraph(gltf: GLTF): void {
    if (!this.#scene || this.#disposed) return;
    const model = gltf.scene ?? gltf.scenes?.[0];

    // Compute bounding sphere to normalize to unit radius
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this.#normScale = 1 / Math.max(sphere.radius, 1e-9);

    const wrapper = new THREE.Group();
    wrapper.name = 'normalized-root';
    model.position.sub(sphere.center);
    wrapper.scale.setScalar(this.#normScale);
    wrapper.add(model);
    this.#scene.add(wrapper);
    this.#root = wrapper;

    const partsGroup = new THREE.Group();
    partsGroup.name = 'parts';
    wrapper.add(partsGroup);
    this.#partsGroup = partsGroup;

    // Collect P{nn} meshes and H{nn} anchor nodes
    const anchorNodes = new Map<string, THREE.Object3D>();
    const meshNodes: THREE.Mesh[] = [];

    model.traverse((o) => {
      if (o.isMesh) {
        const pm = o.name.match(/^P(\d{2})/);
        if (pm) meshNodes.push(o as THREE.Mesh);
      }
      const am = o.name.match(/^H(\d{2})$/);
      if (am) anchorNodes.set(am[1], o);
    });

    for (const mesh of meshNodes) {
      partsGroup.attach(mesh);
      // Clone material for independent selection highlighting
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else {
        mesh.material = mesh.material.clone();
      }
      this.#originalMaterials.set(mesh, mesh.material);
      this.#restPos.set(mesh, mesh.position.clone());
    }

    // Group meshes into PartInfo
    this.#partsByNum.clear();
    for (const part of this.#manifest.parts ?? []) {
      const nn = String(part.number).padStart(2, '0');
      const copyData = this.#copy?.[part.id] || {};
      const node = anchorNodes.get(nn);
      const meshes = meshNodes.filter((m) => {
        const mnn = m.name.match(/^P(\d{2})/)?.[1];
        return mnn === nn;
      });

      let anchorPos = new THREE.Vector3();
      if (node) {
        anchorPos = node.getWorldPosition(new THREE.Vector3());
      } else if (part.fallbackOffset) {
        const center = this.#calculateMeshesCenter(meshes);
        anchorPos = center.add(new THREE.Vector3(...part.fallbackOffset));
      } else {
        anchorPos = this.#calculateMeshesCenter(meshes);
      }

      this.#partsByNum.set(nn, {
        number: nn,
        id: part.id,
        title: copyData.title || part.id,
        summary: copyData.description || copyData.summary || copyData.function,
        role: copyData.function || copyData.role,
        specs: copyData.facts || copyData.specs,
        connectionTips: copyData.connectionTips,
        meshes,
        anchor: anchorPos,
      });

      // Calculate explode offset vector
      if (part.explodeDirection) {
        const dir = new THREE.Vector3(...part.explodeDirection).normalize();
        const dist = part.explodeDistance ?? 0.45;
        this.#explodeOffsets.set(nn, dir.multiplyScalar(dist));
      } else {
        const center = this.#calculateMeshesCenter(meshes);
        const dir = center.clone().normalize();
        this.#explodeOffsets.set(nn, dir.multiplyScalar(0.4));
      }
    }

    // Setup initial camera from manifest or default
    this.resetView(true);

    // Create Badges
    this.#createBadges();
  }

  #calculateMeshesCenter(meshes: THREE.Mesh[]): THREE.Vector3 {
    if (!meshes.length) return new THREE.Vector3();
    const box = new THREE.Box3();
    for (const m of meshes) box.expandByObject(m);
    return box.getCenter(new THREE.Vector3());
  }

  #createBadges(): void {
    const container = this.#options.badgesContainer;
    if (!container) return;
    container.replaceChildren();
    this.#badgeElements.clear();

    for (const [nn, part] of this.#partsByNum.entries()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'badge-anchor';
      btn.dataset.part = nn;
      btn.setAttribute('aria-label', `Part ${nn}: ${part.title}`);

      const chipSpan = document.createElement('span');
      chipSpan.className = 'badge-chip';
      chipSpan.textContent = nn;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'badge-label';
      labelSpan.textContent = part.title;

      btn.append(chipSpan, labelSpan);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectPart(this.#selectedPartNumber === nn ? null : nn);
      });

      container.appendChild(btn);
      this.#badgeElements.set(nn, btn);
    }
  }

  #updateBadgesPosition(): void {
    if (!this.#camera || !this.#options.badgesContainer) return;
    const { clientWidth, clientHeight } = this.#options.hostElement;
    if (clientWidth === 0 || clientHeight === 0) return;

    for (const [nn, btn] of this.#badgeElements.entries()) {
      const part = this.#partsByNum.get(nn);
      if (!part) continue;

      const pos = part.anchor.clone();
      if (this.#explodeProgress > 0) {
        const offset = this.#explodeOffsets.get(nn);
        if (offset) {
          pos.addScaledVector(offset, this.#explodeProgress);
        }
      }

      // part.anchor is already in world space (captured via getWorldPosition after
      // the normalized-root scaling was applied) — project it directly.
      const projected = pos.project(this.#camera);

      // Check if behind camera
      if (projected.z > 1) {
        btn.style.display = 'none';
        continue;
      }

      btn.style.display = 'inline-flex';
      const x = ((projected.x + 1) * 0.5) * clientWidth;
      const y = ((-projected.y + 1) * 0.5) * clientHeight;

      btn.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }
  }

  selectPart(partNumber: string | null, focusCamera = true): void {
    if (this.#disposed) return;
    this.#selectedPartNumber = partNumber;

    // Update DOM Badges
    for (const [nn, btn] of this.#badgeElements.entries()) {
      if (nn === partNumber) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }

    const part = partNumber ? this.#partsByNum.get(partNumber) ?? null : null;

    // Update Materials for Selection Highlight (isolated 3D interaction presentation)
    const selectionEmissiveColor = new THREE.Color(0x3880ff);

    for (const [nn, p] of this.#partsByNum.entries()) {
      const isSelected = nn === partNumber;
      for (const mesh of p.meshes) {
        const mat = mesh.material;
        if (mat && 'emissive' in mat) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          if (isSelected) {
            stdMat.emissive.copy(selectionEmissiveColor);
            stdMat.emissiveIntensity = 0.35;
          } else {
            stdMat.emissive.setHex(0x000000);
            stdMat.emissiveIntensity = 0;
          }
        }
      }
    }

    // Camera Focus
    if (partNumber && focusCamera && part) {
      this.focusOnPart(partNumber);
    }

    this.#options.onPartSelect?.(partNumber, part);
    integrationState.update3DState({
      activeComponent: partNumber,
      cameraTarget: part ? part.title : null,
    });
  }

  setExplode(progress: number): void {
    this.#explodeProgress = Math.max(0, Math.min(1, progress));
    for (const [nn, part] of this.#partsByNum.entries()) {
      const offset = this.#explodeOffsets.get(nn);
      if (!offset) continue;
      for (const mesh of part.meshes) {
        const rest = this.#restPos.get(mesh);
        if (rest) {
          mesh.position.copy(rest).addScaledVector(offset, this.#explodeProgress);
        }
      }
    }
    integrationState.update3DState({ explodeProgress: this.#explodeProgress });
  }

  setXray(active: boolean): void {
    this.#xrayActive = active;
    for (const [nn, part] of this.#partsByNum.entries()) {
      const isSelected = nn === this.#selectedPartNumber;
      for (const mesh of part.meshes) {
        const mat = mesh.material;
        if (mat && 'opacity' in mat && 'transparent' in mat) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          if (active) {
            stdMat.transparent = true;
            stdMat.opacity = isSelected ? 0.95 : 0.22;
            stdMat.depthWrite = isSelected;
          } else {
            stdMat.transparent = false;
            stdMat.opacity = 1.0;
            stdMat.depthWrite = true;
          }
        }
      }
    }
    integrationState.update3DState({ xrayActive: active });
  }

  focusOnPart(partNumber: string): void {
    if (!this.#camera || !this.#controls) return;
    const part = this.#partsByNum.get(partNumber);
    if (!part || !part.meshes.length) return;

    const center = this.#calculateMeshesCenter(part.meshes);
    const box = new THREE.Box3();
    for (const m of part.meshes) box.expandByObject(m);
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius;

    const dist = Math.max(radius * 3.2, 1.2);
    const dir = this.#camera.position.clone().sub(this.#controls.target).normalize();
    const targetPos = center.clone().add(dir.multiplyScalar(dist));

    this.#startCameraTween(targetPos, center);
  }

  resetView(immediate = false): void {
    if (!this.#camera || !this.#controls) return;
    const defaultPos = new THREE.Vector3(2.2, 1.6, 2.4);
    const defaultTarget = new THREE.Vector3(0, 0, 0);

    if (immediate) {
      this.#camera.position.copy(defaultPos);
      this.#controls.target.copy(defaultTarget);
      this.#controls.update();
      this.#cameraTween = null;
    } else {
      this.#startCameraTween(defaultPos, defaultTarget);
    }
  }

  #startCameraTween(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 650): void {
    if (!this.#camera || !this.#controls) return;
    this.#cameraTween = {
      startTime: performance.now(),
      duration,
      startPos: this.#camera.position.clone(),
      targetPos,
      startLookAt: this.#controls.target.clone(),
      targetLookAt,
    };
  }

  #onCanvasClick = (e: MouseEvent): void => {
    if (!this.#camera || !this.#partsGroup) return;
    const rect = this.#options.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.#raycaster.setFromCamera(new THREE.Vector2(x, y), this.#camera);
    const intersects = this.#raycaster.intersectObjects(this.#partsGroup.children, true);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const mnn = hitMesh.name.match(/^P(\d{2})/)?.[1];
      if (mnn) {
        this.selectPart(this.#selectedPartNumber === mnn ? null : mnn);
      }
    } else {
      this.selectPart(null);
    }
  };

  #onResize(): void {
    if (!this.#renderer || !this.#camera || this.#disposed) return;
    const { clientWidth, clientHeight } = this.#options.hostElement;
    if (clientWidth === 0 || clientHeight === 0) return;

    this.#camera.aspect = clientWidth / clientHeight;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(clientWidth, clientHeight, false);
  }

  #startRenderLoop(): void {
    const loop = (time: number) => {
      if (this.#disposed) return;
      this.#rafId = requestAnimationFrame(loop);

      // Handle Camera Tween
      if (this.#cameraTween && this.#camera && this.#controls) {
        const elapsed = time - this.#cameraTween.startTime;
        const rawT = Math.min(elapsed / this.#cameraTween.duration, 1);
        // easeOutCubic
        const t = 1 - Math.pow(1 - rawT, 3);

        this.#camera.position.lerpVectors(this.#cameraTween.startPos, this.#cameraTween.targetPos, t);
        this.#controls.target.lerpVectors(this.#cameraTween.startLookAt, this.#cameraTween.targetLookAt, t);
        this.#controls.update();

        if (rawT >= 1) {
          this.#cameraTween = null;
        }
      } else {
        this.#controls?.update();
      }

      // Render Scene
      if (this.#renderer && this.#scene && this.#camera) {
        this.#renderer.render(this.#scene, this.#camera);
      }

      // Project Badges
      this.#updateBadgesPosition();
    };

    this.#rafId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    cancelAnimationFrame(this.#rafId);

    this.#resizeObserver?.disconnect();
    this.#options.canvas.removeEventListener('click', this.#onCanvasClick);

    if (this.#root && this.#scene) {
      this.#root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
              (m as any)?.[key]?.dispose?.();
            }
            m?.dispose?.();
          }
        }
      });
      this.#scene.remove(this.#root);
      this.#root = null;
    }

    this.#pmrem?.dispose();
    this.#controls?.dispose();
    this.#renderer?.dispose();

    this.#partsByNum.clear();
    this.#restPos.clear();
    this.#originalMaterials.clear();
    this.#explodeOffsets.clear();
    this.#badgeElements.clear();
  }
}
