# PHASE 2.1 TARGETED EXECUTION REPORT — Activity[1]-Manual

Generated: 2026-08-29 · Targeted recovery execution for D1 + D2 + D3 with real browser verification
Base commit: `fab14a9` on `main` · Verified against `HALTED_PROJECT_RECOVERY_REPORT.md`

---

## 1. Scope & Constraints Applied

- Existing working tree protected — no `git clean`, no discard, no force-push, no re-architecture.
- Untracked integration files (`public/`, `src/lib/`, 7 new component routes) left untouched except for the three targeted fixes.
- No production GLB was modified or regenerated.
- Accent Mode / Ask Builder were not implemented (out of scope for this phase).
- No secrets were added; safe DOM construction (`createElement` / `textContent` / `replaceChildren`) was preserved.
- 3D model appearance was not altered — material/presentation changes are strictly the two presentation bugs (D2 zoom/touch policy, D3 projection).

---

## 2. D1 — Landing Scroll → Timeline Mapping

### Before

`src/lib/3d/FullPCExperienceAdapter.ts:62` read:

```ts
const snap = this.#runtime.timelineController?.getSnapshot();
this.#totalTimelineDuration = snap?.totalDuration ?? 10.0;
```

`src/lib/3d/runtime/animation/types.ts:23` `TimelineSnapshot` had **no `totalDuration` field** — `snap.totalDuration` was always `undefined` → fallback `10.0 s`. Actual timeline (from `src/lib/3d/runtime/animation/animation_stages.json:4` and `src/lib/3d/runtime/animation/stage-data.ts:25`) is `974 / 24 ≈ 40.58 s`. Scroll position 1.0 mapped to `t = 1.0 × 10.0 = 10 s` (frame ≈ 240) — only ~25% of the 11-stage disassembly was reachable. The landing `stages` label array in `src/pages/index.astro:304` was hard-coded to 5 thresholds (`0, 0.15, 0.35, 0.55, 0.75, 0.90`) that did not correspond to the real `STAGES` start times.

### Root cause

The copied runtime's `TimelineSnapshot` never exposed the canonical duration, and the adapter fell back to a hard-coded guess. No type-check script existed to surface the `Property 'totalDuration' does not exist on type 'TimelineSnapshot'` error (Vite/esbuild strips types without checking).

### Fix

- `src/lib/3d/runtime/animation/types.ts:23` — added `totalDuration: number` to `TimelineSnapshot` (`src/lib/3d/runtime/animation/types.ts:23`).
- `src/lib/3d/runtime/animation/timeline-controller.ts:189` — `getSnapshot()` now returns `totalDuration: TIMELINE_DURATION` (the canonical constant from `src/lib/3d/runtime/animation/stage-data.ts:25`, which is `frame_end / fps` from the JSON).
- `src/pages/index.astro:206` — imported `STAGES` and `TIMELINE_DURATION` in the client script and derived `stages` canonically:

```ts
const STAGE_LABELS: Record<string, string> = {
  ASSEMBLED: 'Assembled System', OPEN_CASE: 'Chassis & Side Panel Disassembly',
  MOTHERBOARD_OUT: 'Motherboard Extraction', CPU_COOLER_OUT: 'CPU Cooler Removal',
  CPU_OUT: 'CPU Extraction', RAM_OUT: 'Memory Removal', GPU_OUT: 'Graphics Card Extraction',
  STORAGE_OUT: 'Storage Removal', PSU_OUT: 'Power Supply Removal',
  SECONDARY_OUT: 'Secondary Components Out', FINAL_EXPLODE: 'Final Explode View',
};
const stages = STAGES.map((stage) => ({
  name: STAGE_LABELS[stage.id] ?? stage.id,
  threshold: stage.startTime / TIMELINE_DURATION,
}));
```

The hard-coded `const stages = [{threshold: 0.15}, ...]` inside `initLandingScrollExperience` was removed. No second duration source was created; the JSON remains the single source of truth.

### After

Scroll `p ∈ [0,1]` maps to `targetTime = p × 40.58 s`. Stage HUD thresholds are the normalized start times of the 11 canonical stages, so the HUD label now matches the actual animation timeline.

### Evidence

Dev server (`npm run dev -- --port 4321`) + Playwright Chromium, evaluated via `await import('/src/lib/3d/IntegrationState.ts')` (same Vite module instance as the app):

| Scroll target `p` | `timelineProgress` (via `integrationState`) | HUD `%` | HUD stage label |
|---:|---:|---:|---|
| 0.00 | 0.0000 | 0% | Assembled System |
| 0.25 | 0.2489 | 25% | CPU Cooler Removal |
| 0.50 | 0.4991 | 50% | Memory Removal |
| 0.75 | 0.7489 | 75% | Power Supply Removal |
| 1.00 | 0.9992 | 100% | Final Explode View |
| reverse → 0.00 | 0.0012 | — | — |

Sampled with convergence polling (lerp is per-frame `0.15`, so at headless SwiftShader ~2 fps each 0.25 step needs ~90 s to converge; real GPU converges in <1 s). The final stage at `scroll 1.0` shows the fully exploded PC (screenshot `shots2/d1-100pct.png`). No console errors on the landing page during this sequence.

---

## 3. D2 — Landing-Page Scroll Trap

### Source reasoning

Landing `src/pages/index.astro:96` hosts a full-screen `touch-none` canvas (`#landing-experience-canvas`) inside a 350vh scroll section with a `sticky top-0 h-screen` viewport. The copied `ExperienceRuntime` creates `OrbitControls` (`src/lib/3d/runtime/core/experience-runtime.ts:142`) whose wheel handler at `three@0.179.1` does:

```js
function onMouseWheel(event) {
  if (scope.enabled === false || scope.enableZoom === false || scope.state !== STATE.NONE) return;
  event.preventDefault(); // ← wheel hijack
}
```

and whose constructor sets `domElement.style.touchAction = 'none'` (`three/examples/jsm/controls/OrbitControls.js`). Wheel over canvas was expected to drive OrbitControls dolly instead of page scroll, and touch swipes were expected to be consumed by the canvas (`touch-action: none`) preventing page scroll.

### Browser evidence — pre-fix

Chromium headless (SwiftShader) — landing section scrolled to mid-track, `page.mouse.wheel(0, 480)` at canvas center:

- `defaultPrevented: true` on canvas wheel, `pageScrolled: false`, canvas pixels changed (buffer delta `41490` bytes) → camera zoomed, page did not scroll.
- Wheel over ordinary component card (foreground, `pointer-events-auto`): `defaultPrevented: false` (normal path).
- Touch `touchMove` over canvas: fired (6 events) but `pageScrolled: false` and `touchSwipeOverCanvas` delta `0` → touch gesture was swallowed by `touch-action: none`.

### Fix (landing-specific only)

- `src/lib/3d/runtime/core/experience-runtime.ts:24` — new option `enableCameraZoom?: boolean` on `ExperienceRuntimeOptions`; threaded into `CameraController`.
- `src/lib/3d/runtime/camera/camera-controller.ts:26` — new `enableZoom?` on `CameraControllerOptions`; `src/lib/3d/runtime/camera/camera-controller.ts:95` now `this.#controls.enableZoom = options.enableZoom ?? true`.
- `src/lib/3d/FullPCExperienceAdapter.ts:12` — `FullPCExperienceOptions.enableCameraZoom?` threaded to `ExperienceRuntime`.
- `src/pages/index.astro:247` — landing adapter constructed with `enableCameraZoom: false`.
- `src/pages/index.astro:275` — `canvas.style.touchAction = 'pan-y'` set after `adapter.initialize()` — overrides the OrbitControls inline `none`, so **vertical swipes scroll the page** (browser handles them) while horizontal drags still rotate (pointer events to the canvas). `enableZoom=false` makes `onMouseWheel` return **before `preventDefault`** — the browser default wheel scroll runs.

No global control state was changed — solo component pages keep `enableZoom: true` (their canvases should zoom).

### Browser evidence — post-fix

Same measurement, now with `touchAction: "pan-y"` on the landing canvas:

- Wheel over canvas (both headless and headed Chromium): `defaultPrevented: false`, page scrolls. Headless trajectory: `704 → 1304` on `wheel(0,600)` and `1304 → 704` on `wheel(0,-600)`. Headed trajectory (real compositor) matches: down 600 → scrollY +600 within 250 ms, up → back. Hero-control wheel down: `0 → 600` as expected. Full wheel log confirms `target: CANVAS` with `defaultPrevented: false`.
- Touch swipe over canvas at `375×812` (hasTouch + `CDP Input.dispatchTouchEvent` swipe): `before: 937 → after: 1122`, `pageScrolled: true`, `touchAction: "pan-y"`.
- Drag-rotate on the canvas was not disabled (only `enableZoom` touched; `enablePan`/`enableRotate` left at defaults per `src/lib/3d/runtime/camera/camera-controller.ts:93`).

### Status

**D2 FIXED** — landing scroll is native; wheel and touch over the canvas scroll the page; camera no longer competes. Horizontal drag to rotate is preserved.

---

## 4. D3 — Badge-Anchor Double Scaling

### Source reasoning

`src/lib/3d/SoloComponentAdapter.ts:235` builds `part.anchor` via `node.getWorldPosition()` or `calculateMeshesCenter(meshes)` — both use `Box3.expandByObject` with world matrices **after** `wrapper.scale = normScale = 1 / sphere.radius` (`src/lib/3d/SoloComponentAdapter.ts:246`) has been applied and the wrapper added to the scene. `part.anchor` is therefore already in **world space**.

`src/lib/3d/SoloComponentAdapter.ts:392` (`#updateBadgesPosition`) then did:

```ts
const worldPos = pos.clone().multiplyScalar(this.#normScale);
const projected = worldPos.project(this.#camera);
```

— multiplying world-space anchors by `normScale` a second time (toward `pos × normScale²` overall). When `normScale ≈ 1` the error is invisible; with the actual GLBs `normScale ≈ 0.25` (GLBs authored at radius ≈ 4 units — confirmed on all 12 solo models), badges clustered at ~25% of their correct distance from the origin.

### Browser evidence — pre-fix

Replicated the solo camera exactly in-page (`PerspectiveCamera(38, aspect, 0.01, 60)` at `(2.2,1.6,2.4)` → target origin — matching `src/lib/3d/SoloComponentAdapter.ts:149`). Compared actual badge DOM `transform: translate(x,y)` against `project(anchor × k)` for `k ∈ {0.25,…,3}`. Mean error per candidate (ram shown — all 8 measured components behave identically):

| `k` | mean error (px) |
|---:|---:|
| **0.25** | **14.31** |
| 0.33 | 19.07 |
| 0.50 | 29.03 |
| 0.75 | 43.31 |
| **1.0** | **57.21** |
| 2.0 | 109.80 |

Best-fit `k = 0.25` on **all 8** tested components (ram, storage-m2, case-fan, cpu, gpu, cables, pc-case, motherboard) — `57 px` error at the correct projection vs `14 px` at `k=0.25`. Badges were visibly bunched toward the model center on asymmetric models (gpu, cables, motherboard, pc-case).

### Fix

`src/lib/3d/SoloComponentAdapter.ts:374` — removed the extra scaling:

```diff
-const worldPos = pos.clone().multiplyScalar(this.#normScale);
-const projected = worldPos.project(this.#camera);
+// part.anchor is already in world space (captured via getWorldPosition after
+// the normalized-root scaling was applied) — project it directly.
+const projected = pos.project(this.#camera);
```

### Browser evidence — post-fix

Same 8 components, same measurement pipeline:

| Component | badge count | bestFit `k` | mean error at `k=1` |
|---|---:|---:|---:|
| ram | 8 | **1** | **0.00 px** |
| storage-m2 | 8 | **1** | **0.00 px** |
| case-fan | 8 | **1** | **0.00 px** |
| cpu | 8 | **1** | **0.00 px** |
| gpu | 14 | **1** | **0.00 px** |
| cables | 8 | **1** | **0.00 px** |
| pc-case | 12 | **1** | **0.00 px** |
| motherboard | 16 | **1** | **0.00 px** |

Mean error at `k=1` is **exactly 0.00 px** on every model — the badge DOM positions now match the true `project(anchor)` exactly, proving the fix and validating the replication camera. No console errors; no geometry was altered.

### Status

**D3 FIXED** — badges sit precisely on their anatomy on every solo model; the fix was strictly the one double-scaling line. Explode offset mixing (local vs world) was noted as a secondary presentation nuance but left untouched per the minimal-fix policy — explode is triggered globally (`badgesMovedOnExplode: true` on all 12) and remains visually correct because the offset magnitude (≈ 0.4 world units) was authored consistently with a unit-normalized scene.

---

## 5. Landing Page Test

| Check | Result |
|---|---|
| Existing hero + release notes + 4 section teasers intact | PASS |
| Full-PC canvas + loading overlay → model visible | PASS (`data-landing-loading` display `none` in ~13 s) |
| Scroll `0` | HUD `0%` · `Assembled System` |
| Scroll `0.25` | `25%` · `CPU Cooler Removal` · `timelineProgress 0.2489` |
| Scroll `0.50` | `50%` · `Memory Removal` · `0.4991` |
| Scroll `0.75` | `75%` · `Power Supply Removal` · `0.7489` |
| Scroll `1.00` | `100%` · `Final Explode View` · `0.9992` · screenshot shows final exploded PC |
| Reverse scroll `1.00 → 0` | converged `0.0012`, no camera drift |
| Resize `1440×900 → 1024×768` | canvas buffer resizes `1024×768`, no errors |
| Reload | loading + model load PASS |
| No scroll trapping (wheel/touch) | PASS (D2 fix) |
| No failed asset requests on landing | PASS |
| No console errors on landing | PASS (only SwiftShader ReadPixels perf warnings, see §10) |

---

## 6. All 12 Component Tests

Each row executed in a fresh Playwright context (1440×900, fresh WebGL context) via the **same** `SoloComponentAdapter` public getters — no test harness was added to production. For each slug: load → click first badge → second badge → enable explode (slider `0→1`) → enable X-Ray → reset → canvas raycast click → reload.

| Slug | loaded | title | badges `≡` parts | badge click → `selectedPart` | active class | camera focused (badge transform changed) | explode `1` + badges move | X-Ray ≡ checked | reset clears `selected=null, explode=0, xray=false` + checkbox | canvas raycast | reload badge count |
|---|:---:|---|---|---|---|---|---|---|:---:|---|:---:|
| `ram` | ✓ | Memory (RAM) | 8 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `01` | 8 |
| `storage-m2` | ✓ | NVMe M.2 SSD | 8 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `08` | 8 |
| `case-fan` | ✓ | Chassis Fan | 8 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `02` | 8 |
| `cpu` | ✓ | CPU | 8 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `01` | 8 |
| `storage-hdd` | ✓ | HDD | 10 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `02` | 10 |
| `psu` | ✓ | PSU | 12 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `06` | 12 |
| `cpu-cooler-air` | ✓ | CPU Cooler (Air) | 10 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `01` | 10 |
| `cpu-cooler-liquid` | ✓ | CPU Cooler (Liquid AIO) | 12 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `null`¹ | 12 |
| `gpu` | ✓ | Graphics Card | 14 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `08` | 14 |
| `cables` | ✓ | Power & Data Cables | 8 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `01` | 8 |
| `pc-case` | ✓ | PC Chassis | 12 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `02` | 12 |
| `motherboard` | ✓ | Motherboard | 16 | `01` | ✓ | ✓ | ✓ + ✓ | ✓ | ✓ + ✓ | `02` | 16 |

¹ `cpu-cooler-liquid`: canvas click at viewport-center `(0.5, 0.45)` raycast hit empty space → correctly clears selection (`null`) — badge-click path still passes.

All `supportedFeatures` (`explode`, `xray`, `annotations`) evaluate to `true` on every canonical slug per `ComponentRegistry`, recorded `NOT APPLICABLE` was never needed — every capability is exercised.

---

## 7. Routing Test

| Path | Result |
|---|---|
| `GET /components/` index | **13** `a[href^="/components/"]` (12 canonical component cards + 1 nav link), titles in registry order `PC Chassis (Case)` → `Power & Data Cables` |
| Click card `→ /components/ram/` | nav → `http://localhost:4321/components/ram/` · `h1: Memory (RAM)` · model loaded |
| Back | `http://localhost:4321/components/` |
| Forward | `http://localhost:4321/components/ram/` |
| Reload | same URL, model reload PASS |

**Legacy aliases** (untouched, verified):

| Alias | `h1` | `data-slug` attr | model load |
|---|---:|---|:---:|
| `/components/case/` | PC Chassis (Case) | `pc-case` | ✓ |
| `/components/cpu-cooler/` | CPU Cooler (Air) | `cpu-cooler-air` | ✓ |
| `/components/storage/` | NVMe M.2 SSD | `storage-m2` | ✓ |

All aliases delegate to their canonical entry via `ComponentRegistry.ROUTE_ALIASES` — no second mapping system exists.

---

## 8. Responsive Test

| Viewport | Landing (model + canvas) | Library | GPU solo viewer (14 badges) |
|---|---|---|---|
| `1440×900` | loaded · canvas `1440×900` · no h-overflow | 13 cards · no h-overflow | loaded · `14/14` badges in viewport · no h-overflow · explode `1` + xray `true` functional |
| `1024×768` | loaded · canvas `1024×768` · no h-overflow | no h-overflow | same — all PASS |
| `375×812` | loaded · canvas `375×812` · no h-overflow | no h-overflow | same — all PASS |

Additional: landing resize `1440→1024` resized the WebGL buffer `1024×768` cleanly; landing reload PASS. Tailwind breakpoints (`sm: 375, md: 768, lg: 1280`) and `max-w-content: 1200` hold at all sizes.

---

## 9. Console / Network

Captured across **~30 page loads** (landing × multiple, 12 solo pages × 2 visits, alias routes, responsive pages) via Playwright `page.on('console')` + `page.on('response')` + `page.on('pageerror')`:

- **`pageerror` / `console.error`:** **0**. No uncaught exceptions, no failed module imports, no missing-mesh errors.
- **`console.warning`:** 4× `GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels` emitted once each on `ram` — headless SwiftShader artifact triggered by Playwright `page.screenshot()` (readback from software GL), **not** an application defect. The "(this message will no longer repeat)" deduplication line was logged once.
- **`response` status ≥ 400:** **0**. No `404`/`4xx`/`5xx`. The only external fetch is the Draco decoder via `https://www.gstatic.com/draco/versioned/decoders/1.5.7/` — not hit during these runs (all test models used Meshopt-only `pc_anatomy_web_final.glb` and `*.lod0.glb` with no Draco strings) and the font CDN was served via build-time inline in production.

The known footer dead link `/changelog/` (flagged as `D6` low priority in the recovery report) was **not** navigated during these passes — it is still a 404 stub and is intentionally left for a later docs step.

---

## 10. Build / Runtime Check

```
npm run build
```

Both before-ship and after-fix builds succeed (`astro build` static, ~1.1–2.5 s, 20 pages):

```
generating static routes
  ├─ /build/index.html
  ├─ /components/cables/index.html
  ├─ /components/case/index.html
  ├─ /components/case-fan/index.html
  ├─ /components/cpu/index.html
  ├─ /components/cpu-cooler/index.html
  ├─ /components/cpu-cooler-air/index.html
  ├─ /components/cpu-cooler-liquid/index.html
  ├─ /components/gpu/index.html
  ├─ /components/motherboard/index.html
  ├─ /components/pc-case/index.html
  ├─ /components/psu/index.html
  ├─ /components/ram/index.html
  ├─ /components/storage/index.html
  ├─ /components/storage-hdd/index.html
  ├─ /components/storage-m2/index.html
  ├─ /components/index.html
  ├─ /get-ready/index.html
  ├─ /troubleshooting/index.html
  └─ /index.html
  ✓ 20 page(s)
```

One Vite warning persists (expected): `Some chunks are larger than 500 kB after minification` — the Three.js bundle. No typecheck script exists in `package.json` (`dev` / `build` / `preview` only) — not fabricated. Type generation step `[types] Generated` runs cleanly.

---

## 11. Performance Observations

Measured on the real Windows project via `npm run dev` + Chromium headless (SwiftShader — software GL, so fps is CPU-bound; real-GPU numbers will be higher):

| Signal | Landing (`/`) | Solo `GPU` |
|---|---:|---:|
| GLB requests | `1` — `pc_anatomy_web_final.glb` (526 KB) | `1` — `gpu.lod0.glb` (112 KB) — never duplicated even across reloads |
| Canvas elements | `1` | `1` |
| WebGL contexts | `1` | `1` |
| `requestAnimationFrame` callbacks per second (measured by a competing rAF probe) | `2` | `3` |
| JS heap (if exposed) | `26 MB` | `25 MB` |
| Resize behavior | buffer tracked viewport | buffer tracked viewport |

`2–3` competing rAF callbacks per second in **SwiftShader** implies the two landing loops (separate `requestAnimationFrame` chains: `FullPCExperienceAdapter.#startSeekingLoop` at `src/lib/3d/FullPCExperienceAdapter.ts:113` and `ExperienceRuntime.#tick` at `src/lib/3d/runtime/core/experience-runtime.ts:291`; solo pages have one loop `SoloComponentAdapter.#startRenderLoop` at `src/lib/3d/SoloComponentAdapter.ts:568`) are running — real compositing on a GPU hits ~60 fps. No evidence of duplicate GLB fetches, repeated `PMREMGenerator` creation (1× per adapter), or accumulated listeners after navigation — each component context was torn down (`dispose()` at `src/lib/3d/SoloComponentAdapter.ts:603` / `ExperienceRuntime.dispose()` at `src/lib/3d/runtime/core/experience-runtime.ts:258`) via fresh Playwright contexts.

No premature geometry optimization was performed.

---

## 12. Git Safety

- No `git clean`, no `git reset`, no `git checkout <branch>`, no force-push was executed.
- Modified tracked files (integration work plus the 5 D1–D3 fix files): left **unstaged** — the diff is visible in `git diff --stat` and the working tree is exactly as the next agent will find it.
- Untracked integration files (`public/`, `src/lib/`, 7 new routes) were **not** deleted.
- No `git add` / `git commit` / `git push` was issued in this task.

---

## 13. Handoff & Evidence Locations

- Recovery report: `HALTED_PROJECT_RECOVERY_REPORT.md`
- This report: `PHASE_2_1_TARGETED_EXECUTION_REPORT.md`
- Modified source (5 fix files — no new dependencies):
  - `src/lib/3d/runtime/animation/types.ts:23`
  - `src/lib/3d/runtime/animation/timeline-controller.ts:189`
  - `src/pages/index.astro:206` / `src/pages/index.astro:275`
  - `src/lib/3d/FullPCExperienceAdapter.ts:12` / `src/lib/3d/runtime/core/experience-runtime.ts:24` / `src/lib/3d/runtime/camera/camera-controller.ts:26`
  - `src/lib/3d/SoloComponentAdapter.ts:374`
- Browser evidence (raw JSON + screenshots — not committed, in temp dir `C:\Users\zuray\AppData\Local\Temp\opencode\p21\out\`):
  - D1 convergence run → `shots2/d1-*.png`, `out/landing2-results.json` content reproduced in §5
  - D2 pre/post wheel/touch → `out/d2-results.json`, `out/wheel-diag.json`, `shots/d2-*.png`, `shots2/d2-*.png`
  - D3 projection classification pre/post → `out/d2fix-d3-results.json`, `out/d3post-results.json`, `shots3/`, `shots4/`
  - Full matrix → `out/matrix-results.json`, `shots-matrix/*.png` (48 screenshots — selected/exploded/xray/reset per component + responsive)
  - Performance → `out/perf.json`

---

## 14. Security / Theme / Asset Posture (re-checked)

- Still **no** `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval(` / `new Function` in `src/` (re-grepped after fixes).
- No `API_KEY` / `PASSWORD` / `TOKEN` strings introduced.
- Website theme continues to affect **only** CSS vars / badges DOM — model materials remain fixed (`0x3880ff` selection emissive in `SoloComponentAdapter.ts:431`, hover `0x333333` / selected `0x666666` in `runtime/interaction/interaction-controller.ts:421`).
- Accent Mode was **not** implemented; Light/Dark were not redesigned.

---

PHASE 2.1 TARGETED STATUS:
READY FOR FINAL REGRESSION
