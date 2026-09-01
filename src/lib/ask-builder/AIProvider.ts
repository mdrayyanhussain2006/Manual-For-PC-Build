/**
 * Ask Builder — AI Provider Interface
 * Provider-agnostic abstraction. Gemini is the primary provider,
 * but this interface allows future replacement without changing
 * the rest of the application.
 */

import type { ConversationMessage, AIResponsePayload } from './types.js';

// ──────────────────────────────────────────────────────────────
// PROVIDER INTERFACE
// ──────────────────────────────────────────────────────────────

export interface AIProviderSendOptions {
  systemPrompt: string;
  userMessage: string;
  history: ConversationMessage[];
  /** Max tokens to request (default: 512) */
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  sendMessage(options: AIProviderSendOptions): Promise<AIResponsePayload>;
  getHealth(): Promise<{ ok: boolean; latencyMs?: number; message?: string }>;
}

// ──────────────────────────────────────────────────────────────
// PROVIDER FACTORY — lazy imports to avoid loading both providers
// ──────────────────────────────────────────────────────────────

export type ProviderMode = 'gemini' | 'nvidia' | 'mock';

export async function createProvider(mode: ProviderMode): Promise<AIProvider> {
  if (mode === 'mock') {
    const { MockAIProvider } = await import('./providers/MockAIProvider.js');
    return new MockAIProvider();
  }

  if (mode === 'nvidia') {
    const { NvidiaProvider } = await import('./providers/NvidiaProvider.js');
    return new NvidiaProvider();
  }

  const { GeminiProvider } = await import('./providers/GeminiProvider.js');
  return new GeminiProvider();
}
