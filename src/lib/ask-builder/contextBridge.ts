/**
 * Ask Builder — Context Bridge (client-side)
 * Reads from IntegrationState and produces a safe AskBuilderContext snapshot.
 * Only exposes what is useful to the assistant — never exposes
 * API keys, server paths, or raw renderer internals.
 */

import { integrationState } from '../3d/IntegrationState.js';
import type { AskBuilderContext } from './types.js';

/**
 * Derive the current guided-build step number from the URL pathname + hash.
 * Returns null if not on a build page or no step hash is present.
 */
function parseBuildStep(route: string): number | null {
  if (!route.startsWith('/build')) return null;

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/build/')) {
    const hash = window.location.hash;
    const hashMatch = hash.match(/#step-(\d+)/);
    if (hashMatch) return parseInt(hashMatch[1], 10);
  }

  const routeMatch = route.match(/\/build\/.*#step-(\d+)/);
  if (routeMatch) return parseInt(routeMatch[1], 10);

  return null;
}

/**
 * Get the current AskBuilderContext from IntegrationState.
 * Safe to call from client-side scripts.
 */
export function getAskBuilderContext(): AskBuilderContext {
  const snapshot = integrationState.getSnapshot();
  const { websiteContext, current3DState } = snapshot;

  return {
    route: websiteContext.route,
    theme: websiteContext.theme,
    activeComponent: current3DState.activeComponent,
    activeSemanticId: current3DState.activeSemanticId,
    cameraTarget: current3DState.cameraTarget,
    timelineProgress: current3DState.timelineProgress,
    explodeProgress: current3DState.explodeProgress,
    xrayActive: current3DState.xrayActive,
    isInteracting: current3DState.isInteracting,
    buildStep: parseBuildStep(websiteContext.route),
  };
}

/**
 * Subscribe to context changes and invoke a callback.
 * Returns an unsubscribe function.
 */
export function subscribeAskBuilderContext(
  callback: (ctx: AskBuilderContext) => void
): () => void {
  return integrationState.subscribe(() => {
    callback(getAskBuilderContext());
  });
}
