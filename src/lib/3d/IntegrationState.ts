/**
 * IntegrationState.ts
 * Centralized state coordination between the Astro UI and WebGL runtime adapters.
 * Provides the forward-compatible integration boundary for future assistant features.
 */

export interface WebsiteContext {
  route: string;
  theme: 'light' | 'dark' | 'accent';
}

export interface Current3DState {
  activeComponent: string | null;
  activeSemanticId: string | null;
  cameraTarget: string | null;
  timelineProgress: number;
  explodeProgress: number;
  xrayActive: boolean;
  isInteracting: boolean;
}

export interface GlobalIntegrationSnapshot {
  websiteContext: WebsiteContext;
  current3DState: Current3DState;
  timestamp: number;
}

export type IntegrationStateListener = (snapshot: GlobalIntegrationSnapshot) => void;

class IntegrationStateManager {
  #websiteContext: WebsiteContext = {
    route: typeof window !== 'undefined' ? window.location.pathname : '/',
    theme: 'dark',
  };

  #current3DState: Current3DState = {
    activeComponent: null,
    activeSemanticId: null,
    cameraTarget: null,
    timelineProgress: 0,
    explodeProgress: 0,
    xrayActive: false,
    isInteracting: false,
  };

  #listeners = new Set<IntegrationStateListener>();

  constructor() {
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(() => {
        const theme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | 'accent' | null;
        if (theme) {
          this.#websiteContext.theme = theme;
          this.#notify();
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
  }

  getSnapshot(): GlobalIntegrationSnapshot {
    return {
      websiteContext: { ...this.#websiteContext },
      current3DState: { ...this.#current3DState },
      timestamp: Date.now(),
    };
  }

  setWebsiteRoute(route: string): void {
    this.#websiteContext.route = route;
    this.#notify();
  }

  setWebsiteTheme(theme: 'light' | 'dark' | 'accent'): void {
    this.#websiteContext.theme = theme;
    this.#notify();
  }

  update3DState(partial: Partial<Current3DState>): void {
    this.#current3DState = {
      ...this.#current3DState,
      ...partial,
    };
    this.#notify();
  }

  subscribe(listener: IntegrationStateListener): () => void {
    this.#listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.#listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[IntegrationState] Listener error:', err);
      }
    }
  }
}

export const integrationState = new IntegrationStateManager();
