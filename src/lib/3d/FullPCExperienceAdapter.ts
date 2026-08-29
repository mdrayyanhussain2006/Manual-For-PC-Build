/**
 * FullPCExperienceAdapter.ts
 * Integrates the proven pc-components-manual ExperienceRuntime into the Astro website landing page.
 * Manages scroll-to-timeline mapping, selection, and data-driven navigation to solo component routes.
 */

import { ExperienceRuntime } from './runtime/core/experience-runtime';
import type { SemanticComponentId } from './runtime/core/types';
import { getComponentBySemanticId, type ComponentMetadata } from './ComponentRegistry';
import { integrationState } from './IntegrationState';

export interface FullPCExperienceOptions {
  canvas: HTMLCanvasElement;
  /** false → wheel over the canvas scrolls the page instead of zooming the camera (landing scroll sections). */
  enableCameraZoom?: boolean;
  onLoadProgress?: (ratio: number | null) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onComponentSelect?: (component: ComponentMetadata | null, semanticId: string | null) => void;
}

export class FullPCExperienceAdapter {
  readonly #options: FullPCExperienceOptions;
  #runtime: ExperienceRuntime | null = null;
  #disposed = false;

  #pendingProgress = 0;
  #currentProgress = 0;
  #rafId = 0;
  #isSeeking = false;
  #totalTimelineDuration = 0;

  constructor(options: FullPCExperienceOptions) {
    this.#options = options;
  }

  async initialize(): Promise<void> {
    if (this.#disposed) return;
    const { canvas } = this.#options;

    try {
      this.#runtime = new ExperienceRuntime({
        canvas,
        debug: false,
        enableCameraZoom: this.#options.enableCameraZoom ?? true,
        onLoadProgress: (ratio) => {
          this.#options.onLoadProgress?.(ratio);
        },
        onFatalError: (msg, err) => {
          console.error('[FullPCExperienceAdapter] Fatal error:', msg, err);
          this.#options.onError?.(err instanceof Error ? err : new Error(String(err)));
        },
        onContextRestored: () => {
          void this.initialize();
        },
      });

      const result = await this.#runtime.initialize();
      if (this.#disposed) {
        this.#runtime.dispose();
        return;
      }

      // Compute total timeline duration
      const snap = this.#runtime.timelineController?.getSnapshot();
      this.#totalTimelineDuration = snap?.totalDuration ?? 10.0;

      // Subscribe to education controller for component selection events
      this.#runtime.educationController?.subscribe((eduSnap) => {
        const selectedId = eduSnap.selectedComponent as SemanticComponentId | null;
        const compMeta = selectedId ? getComponentBySemanticId(selectedId) : null;

        this.#options.onComponentSelect?.(compMeta, selectedId);
        integrationState.update3DState({
          activeSemanticId: selectedId,
          activeComponent: compMeta?.slug ?? null,
        });
      });

      // Start the single controlled requestAnimationFrame seeking/rendering loop
      this.#startSeekingLoop();

      this.#options.onReady?.();
    } catch (err) {
      console.error('[FullPCExperienceAdapter] Initialization failed:', err);
      this.#options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Non-blocking scroll progress update (normalized 0.0 to 1.0)
   */
  updateScrollProgress(progress: number): void {
    this.#pendingProgress = Math.max(0, Math.min(1, progress));
  }

  selectComponent(semanticId: string | null): void {
    if (!this.#runtime) return;
    if (semanticId) {
      this.#runtime.interactionController?.select(semanticId as SemanticComponentId);
      const bounds = this.#runtime.interactionController?.getComponentBounds(semanticId as SemanticComponentId);
      if (bounds) {
        this.#runtime.cameraController?.focusOn(bounds, semanticId, false);
      }
    } else {
      this.#runtime.interactionController?.clear();
      this.#runtime.cameraController?.hero(false);
    }
  }

  resetView(): void {
    this.#runtime?.interactionController?.clear();
    this.#runtime?.cameraController?.hero(false);
  }

  #startSeekingLoop(): void {
    const loop = () => {
      if (this.#disposed) return;
      this.#rafId = requestAnimationFrame(loop);

      // Smooth lerp seeking towards pendingProgress
      const diff = this.#pendingProgress - this.#currentProgress;
      if (Math.abs(diff) > 0.0005) {
        this.#currentProgress += diff * 0.15; // Smooth spring damp
        const targetTime = this.#currentProgress * this.#totalTimelineDuration;
        this.#runtime?.timelineController?.seekTo(targetTime);
        integrationState.update3DState({ timelineProgress: this.#currentProgress });
      }
    };

    this.#rafId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    cancelAnimationFrame(this.#rafId);
    this.#runtime?.dispose();
    this.#runtime = null;
  }
}
