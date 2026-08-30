/**
 * Ask Builder — Google Gemini Provider
 * Implements the AIProvider interface using the Google Gemini API.
 * The API key is NEVER exposed to the client — this file runs
 * only on the server side via the /api/ask-builder endpoint.
 */

import type { AIProvider, AIProviderSendOptions } from '../AIProvider.js';
import type { AIResponsePayload, ConversationMessage } from '../types.js';

const API_BASE = 'https://generativelanguage.googleapis.com';
const API_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Gemini generateContent response shape (REST API v1beta).
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiProvider implements AIProvider {
  readonly name = 'GeminiProvider';

  private get apiKey(): string {
    const key = process.env.AI_API_KEY;
    if (!key) throw new Error('AI_API_KEY environment variable is not set');
    return key;
  }

  async sendMessage(options: AIProviderSendOptions): Promise<AIResponsePayload> {
    const { contents, systemInstruction } = this.buildContents(
      options.systemPrompt,
      options.history,
      options.userMessage
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let raw: GeminiResponse;

    try {
      const url = `${API_BASE}/v1beta/models/${API_MODEL}:generateContent?key=${this.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents,
          generationConfig: {
            maxOutputTokens: options.maxTokens ?? 512,
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Do NOT forward full error body — may contain key hints
        throw new Error(`Gemini API error: HTTP ${res.status}`);
      }

      raw = (await res.json()) as GeminiResponse;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI provider request timed out');
      }
      throw err;
    }

    if (raw.error) {
      // Don't expose raw error message (may contain key/quota details)
      throw new Error(`Gemini API returned an error: ${raw.error.status}`);
    }

    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    return this.parseResponse(text);
  }

  async getHealth(): Promise<{ ok: boolean; latencyMs?: number; message?: string }> {
    try {
      const start = Date.now();
      await this.sendMessage({
        systemPrompt: 'Respond with {"message":"ok","actions":[]}',
        userMessage: 'health check',
        history: [],
        maxTokens: 32,
      });
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Gemini uses a "contents" array with alternating user/model roles.
   * System instructions go in a separate "system_instruction" field.
   */
  private buildContents(
    systemPrompt: string,
    history: ConversationMessage[],
    userMessage: string
  ): {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    systemInstruction: { parts: Array<{ text: string }> };
  } {
    const systemInstruction = {
      parts: [{ text: systemPrompt }],
    };

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Gemini roles: 'user' | 'model' (not 'assistant')
    const trimmed = history.slice(-12);
    for (const m of trimmed) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }

    // Current user message
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    return { contents, systemInstruction };
  }

  private parseResponse(content: string): AIResponsePayload {
    let parsed: unknown;
    try {
      // Gemini with responseMimeType:'application/json' returns clean JSON
      parsed = JSON.parse(content);
    } catch {
      // Fallback: treat as plain text message
      return { message: content, actions: [] };
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).message !== 'string'
    ) {
      // Model returned valid JSON but wrong shape — extract any text
      const obj = parsed as Record<string, unknown>;
      const fallbackText =
        typeof obj.text === 'string'
          ? obj.text
          : typeof obj.response === 'string'
          ? obj.response
          : 'I could not generate a properly structured response. Please try again.';
      return { message: fallbackText, actions: [] };
    }

    const obj = parsed as Record<string, unknown>;
    return {
      message: obj.message as string,
      actions: Array.isArray(obj.actions) ? (obj.actions as any[]) : [],
    };
  }
}
