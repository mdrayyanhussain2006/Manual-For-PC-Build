/**
 * Ask Builder — Core Types
 * All public-facing type contracts for the AI assistant feature.
 */

// ──────────────────────────────────────────────────────────────
// CONTEXT — what the browser sends to the server
// ──────────────────────────────────────────────────────────────

export interface AskBuilderContext {
  /** Current URL pathname, e.g. /components/gpu/ */
  route: string;
  /** User-visible theme */
  theme: 'light' | 'dark' | 'accent';
  /** Slug of the component currently displayed, if any */
  activeComponent: string | null;
  /** Semantic-ID of the highlighted mesh part, if any */
  activeSemanticId: string | null;
  /** Camera target label, if any */
  cameraTarget: string | null;
  /** 0–1 scroll progress through the assembly timeline */
  timelineProgress: number;
  /** 0–1 explode progress */
  explodeProgress: number;
  /** Whether X-Ray mode is active */
  xrayActive: boolean;
  /** Whether the user is currently dragging / interacting */
  isInteracting: boolean;
  /** Current guided-build step number (1-indexed) or null */
  buildStep: number | null;
}

// ──────────────────────────────────────────────────────────────
// CONVERSATION MESSAGE
// ──────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

// ──────────────────────────────────────────────────────────────
// AI RESPONSE CONTRACT (structured JSON from provider)
// ──────────────────────────────────────────────────────────────

/** Navigate to an internal route */
export interface ActionNavigate {
  type: 'navigate';
  route: string;
}

/** Open a specific component page */
export interface ActionOpenComponent {
  type: 'openComponent';
  slug: string;
}

/** Jump to a guided-build step */
export interface ActionOpenBuildStep {
  type: 'openBuildStep';
  step: number;
}

/** Focus a specific semantic part on the current 3D model */
export interface ActionFocusFeature {
  type: 'focusFeature';
  component: string;
  semanticId: string;
}

/** Open the troubleshooting page, optionally at a topic anchor */
export interface ActionOpenTroubleshooting {
  type: 'openTroubleshooting';
  topic?: string;
}

export type AssistantAction =
  | ActionNavigate
  | ActionOpenComponent
  | ActionOpenBuildStep
  | ActionFocusFeature
  | ActionOpenTroubleshooting;

/** The normalised JSON shape the AI returns */
export interface AIResponsePayload {
  message: string;
  actions?: AssistantAction[];
  providerStatus?: ProviderStatusInfo;
}

/** Provider status information for debugging and monitoring */
export interface ProviderStatusInfo {
  provider: string;
  model: string;
  mode: string;
}

// ──────────────────────────────────────────────────────────────
// API REQUEST / RESPONSE ENVELOPE
// ──────────────────────────────────────────────────────────────

export interface AskBuilderRequest {
  message: string;
  context: AskBuilderContext;
  history: ConversationMessage[];
}

export interface AskBuilderResponse {
  ok: true;
  payload: AIResponsePayload;
}

export interface AskBuilderErrorResponse {
  ok: false;
  error: string;
}

// ──────────────────────────────────────────────────────────────
// PANEL STATE MODEL
// ──────────────────────────────────────────────────────────────

export type PanelStatus =
  | 'closed'
  | 'opening'
  | 'open'
  | 'thinking'
  | 'success'
  | 'error'
  | 'retry';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AssistantAction[];
  error?: boolean;
  timestamp: number;
}
