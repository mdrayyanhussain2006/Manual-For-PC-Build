/**
 * Ask Builder — Action Validator
 * ALL model-produced actions MUST pass through this validator before execution.
 * Treats every AI output as untrusted input.
 *
 * Security invariants:
 * - Only application-owned action types are allowed
 * - Routes are validated against an internal allowlist
 * - Component slugs are validated against the ComponentRegistry
 * - Semantic IDs are validated against the component's allowed semantic IDs (component-scoped)
 * - No external URLs, javascript:, file:, data:, or about: are ever executable
 * - Invalid actions are silently dropped (not thrown to client)
 */

import { COMPONENT_REGISTRY } from '../3d/ComponentRegistry.js';
import type {
  AssistantAction,
  ActionNavigate,
  ActionOpenComponent,
  ActionOpenBuildStep,
  ActionFocusFeature,
  ActionOpenTroubleshooting,
} from './types.js';

// ──────────────────────────────────────────────────────────────
// INTERNAL ALLOWLISTS
// ──────────────────────────────────────────────────────────────

/** All navigable internal routes */
export const ALLOWED_ROUTES: ReadonlySet<string> = new Set([
  '/',
  '/get-ready/',
  '/components/',
  '/build/',
  '/troubleshooting/',
  // Component routes are derived from the registry below
  ...Object.values(COMPONENT_REGISTRY).map((c) => c.route),
]);

/** Valid build steps (1-indexed, currently 10 steps) */
export const BUILD_STEP_RANGE: [number, number] = [1, 10];

/** Known troubleshooting topic anchors */
export const ALLOWED_TROUBLESHOOTING_TOPICS: ReadonlySet<string> = new Set([
  'no-power',
  'no-post',
  'ram-not-detected',
  'gpu-not-detected',
  'storage-not-detected',
  'random-shutdowns',
]);

/** All valid component slugs */
export const ALLOWED_COMPONENT_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(COMPONENT_REGISTRY)
);

/**
 * Semantic IDs scoped by component slug.
 * Each component only allows its own semantic IDs.
 */
export const COMPONENT_SEMANTIC_IDS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(COMPONENT_REGISTRY).map(([slug, comp]) => [
    slug,
    new Set(comp.fullPcSemanticIds ?? []),
  ])
);

// ──────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ──────────────────────────────────────────────────────────────

const FORBIDDEN_SCHEMES = /^(javascript:|data:|file:|about:|ftp:|mailto:)/i;

function isInternalRoute(route: unknown): route is string {
  if (typeof route !== 'string') return false;
  if (FORBIDDEN_SCHEMES.test(route)) return false;
  // Must not be an absolute URL (no protocol + host)
  try {
    const url = new URL(route, 'http://localhost');
    if (url.hostname !== 'localhost') return false;
  } catch {
    return false;
  }
  return ALLOWED_ROUTES.has(route);
}

function isValidComponentSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && ALLOWED_COMPONENT_SLUGS.has(slug);
}

function isValidBuildStep(step: unknown): step is number {
  return (
    typeof step === 'number' &&
    Number.isInteger(step) &&
    step >= BUILD_STEP_RANGE[0] &&
    step <= BUILD_STEP_RANGE[1]
  );
}

/**
 * Validate semanticId against the component's allowed semantic IDs.
 * This is component-scoped: a semanticId is only valid if it belongs to the specified component.
 */
function isValidSemanticIdForComponent(component: string, semanticId: unknown): semanticId is string {
  if (typeof semanticId !== 'string') return false;
  const allowed = COMPONENT_SEMANTIC_IDS.get(component);
  if (!allowed) return false;
  return allowed.has(semanticId);
}

function isValidTroubleshootingTopic(topic: unknown): topic is string | undefined {
  if (topic === undefined) return true;
  return typeof topic === 'string' && ALLOWED_TROUBLESHOOTING_TOPICS.has(topic);
}

// ──────────────────────────────────────────────────────────────
// PER-ACTION VALIDATORS
// ──────────────────────────────────────────────────────────────

function validateNavigate(raw: Record<string, unknown>): ActionNavigate | null {
  if (!isInternalRoute(raw.route)) {
    console.warn('[ActionValidator] Rejected navigate — invalid route:', raw.route);
    return null;
  }
  return { type: 'navigate', route: raw.route as string };
}

function validateOpenComponent(raw: Record<string, unknown>): ActionOpenComponent | null {
  if (!isValidComponentSlug(raw.slug)) {
    console.warn('[ActionValidator] Rejected openComponent — unknown slug:', raw.slug);
    return null;
  }
  return { type: 'openComponent', slug: raw.slug as string };
}

function validateOpenBuildStep(raw: Record<string, unknown>): ActionOpenBuildStep | null {
  if (!isValidBuildStep(raw.step)) {
    console.warn('[ActionValidator] Rejected openBuildStep — invalid step:', raw.step);
    return null;
  }
  return { type: 'openBuildStep', step: raw.step as number };
}

function validateFocusFeature(raw: Record<string, unknown>): ActionFocusFeature | null {
  if (!isValidComponentSlug(raw.component)) {
    console.warn('[ActionValidator] Rejected focusFeature — unknown component:', raw.component);
    return null;
  }
  if (!isValidSemanticIdForComponent(raw.component as string, raw.semanticId)) {
    console.warn('[ActionValidator] Rejected focusFeature — semanticId not valid for component:', {
      component: raw.component,
      semanticId: raw.semanticId,
    });
    return null;
  }
  return {
    type: 'focusFeature',
    component: raw.component as string,
    semanticId: raw.semanticId as string,
  };
}

function validateOpenTroubleshooting(
  raw: Record<string, unknown>
): ActionOpenTroubleshooting | null {
  if (!isValidTroubleshootingTopic(raw.topic)) {
    console.warn('[ActionValidator] Rejected openTroubleshooting — unknown topic:', raw.topic);
    return null;
  }
  return { type: 'openTroubleshooting', topic: raw.topic as string | undefined };
}

// ──────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────

/**
 * Validate a single raw action object from AI output.
 * Returns a strongly-typed AssistantAction or null if invalid.
 */
export function validateAction(raw: unknown): AssistantAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  switch (obj.type) {
    case 'navigate':
      return validateNavigate(obj);
    case 'openComponent':
      return validateOpenComponent(obj);
    case 'openBuildStep':
      return validateOpenBuildStep(obj);
    case 'focusFeature':
      return validateFocusFeature(obj);
    case 'openTroubleshooting':
      return validateOpenTroubleshooting(obj);
    default:
      console.warn('[ActionValidator] Rejected unknown action type:', obj.type);
      return null;
  }
}

/**
 * Validate an array of raw actions, silently dropping invalid ones.
 * Returns only the valid, typed actions.
 */
export function validateActions(rawActions: unknown[]): AssistantAction[] {
  if (!Array.isArray(rawActions)) return [];
  return rawActions.map(validateAction).filter((a): a is AssistantAction => a !== null);
}
