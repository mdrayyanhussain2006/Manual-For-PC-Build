/**
 * Ask Builder — DeepSeek Provider
 * Implements the AIProvider interface using the DeepSeek API.
 * The API key is NEVER exposed to the client — this file runs
 * only on the server side via the /api/ask-builder endpoint.
 */

import type { AIProvider, AIProviderSendOptions } from '../AIProvider.js';
import type { AIResponsePayload, ConversationMessage } from '../types.js';

const API_BASE = process.env.AI_BASE_URL || 'https://api.deepseek.com';
const API_MODEL = process.env.AI_MODEL || 'deepseek-chat';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * DeepSeek response payload shape for JSON output mode.
 */
interface DeepSeekChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class DeepSeekProvider implements AIProvider {
  readonly name = 'DeepSeekProvider';

  private get apiKey(): string {
    const key = process.env.AI_API_KEY;
    if (!key) throw new Error('AI_API_KEY environment variable is not set');
    return key;
  }

  async sendMessage(options: AIProviderSendOptions): Promise<AIResponsePayload> {
    const messages = this.buildMessages(
      options.systemPrompt,
      options.history,
      options.userMessage
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let raw: DeepSeekChatResponse;

    try {
      const res = await fetch(`${API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: API_MODEL,
          messages,
          max_tokens: options.maxTokens ?? 512,
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // Do NOT forward the full body — may contain key hints
        throw new Error(`DeepSeek API error: HTTP ${res.status}`);
      }

      raw = (await res.json()) as DeepSeekChatResponse;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI provider request timed out');
      }
      throw err;
    }

    const content = raw.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI provider');

    return this.parseResponse(content);
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

  private buildMessages(
    systemPrompt: string,
    history: ConversationMessage[],
    userMessage: string
  ): Array<{ role: string; content: string }> {
    const msgs: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Truncate history to last 12 messages (6 turns) to stay within budget
    const trimmed = history.slice(-12);
    for (const m of trimmed) {
      msgs.push({ role: m.role, content: m.content });
    }

    msgs.push({ role: 'user', content: userMessage });
    return msgs;
  }

  private parseResponse(content: string): AIResponsePayload {
    let parsed: unknown;
    try {
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
      throw new Error('AI response did not match expected schema');
    }

    const obj = parsed as Record<string, unknown>;
    return {
      message: obj.message as string,
      actions: Array.isArray(obj.actions) ? (obj.actions as any[]) : [],
    };
  }
}
