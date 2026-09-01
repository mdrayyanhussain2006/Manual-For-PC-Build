/**
 * Ask Builder — NVIDIA Provider
 * Uses a lightweight, fast-inference model for local build guidance.
 * Preferred model: meta/llama-3.1-8b-instruct
 */

import type { AIProvider, AIProviderSendOptions } from '../AIProvider.js';
import type { AIResponsePayload, ConversationMessage } from '../types.js';

const DEFAULT_MODEL = 'meta/llama-3.2-11b-vision-instruct';
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export class NvidiaProvider implements AIProvider {
  readonly name = 'NvidiaProvider';

  private get apiKey(): string {
    const envKey = process.env.NVIDIA_API_KEY || (import.meta.env as Record<string, any>)?.NVIDIA_API_KEY;
    if (typeof envKey === 'string' && envKey.trim() !== '') return envKey.trim();
    throw new Error('NVIDIA_API_KEY is missing');
  }

  async sendMessage(options: AIProviderSendOptions): Promise<AIResponsePayload> {
    const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
    const body = {
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        ...options.history.slice(-12).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: options.userMessage },
      ],
      max_tokens: options.maxTokens ?? 512,
      temperature: 0.2,
      top_p: 0.9,
      stream: false,
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`NVIDIA API error: HTTP ${res.status}${errText ? ` - ${errText.slice(0, 200)}` : ''}`);
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content.map((part) => typeof part === 'string' ? part : (part?.text ?? '')).join('')
      : typeof content === 'string'
        ? content
        : '';

    if (!text) {
      throw new Error('Empty response from NVIDIA');
    }

    return this.parseResponse(text);
  }

  async getHealth(): Promise<{ ok: boolean; latencyMs?: number; message?: string }> {
    const start = Date.now();
    try {
      await this.sendMessage({
        systemPrompt: 'Reply with JSON {"message":"ok","actions":[]} and nothing else.',
        userMessage: 'health check',
        history: [],
        maxTokens: 32,
      });
      return { ok: true, latencyMs: Date.now() - start, message: 'NVIDIA provider healthy' };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private parseResponse(content: string): AIResponsePayload {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && typeof (parsed as any).message === 'string') {
        return {
          message: (parsed as any).message,
          actions: Array.isArray((parsed as any).actions) ? (parsed as any).actions : [],
        };
      }
    } catch {
      // treat as plain text if JSON parse fails
    }

    return {
      message: content.trim() || 'I could not generate a response right now.',
      actions: [],
    };
  }
}
