/**
 * Ask Builder — Server API Endpoint
 * POST /api/ask-builder
 *
 * Security guarantees:
 * - GEMINI_API_KEY never leaves the server
 * - All AI actions are validated before returning to client
 * - Request size and message length are capped
 * - Error responses are sanitised (no stack traces, no server paths)
 * - CORS is not needed — same-origin request
 */

import type { APIRoute } from 'astro';
import { createProvider } from '../../lib/ask-builder/AIProvider.js';
import { buildSystemPrompt } from '../../lib/ask-builder/knowledge.js';
import { validateActions } from '../../lib/ask-builder/actionValidator.js';
import type { AskBuilderRequest, AskBuilderResponse, AskBuilderErrorResponse } from '../../lib/ask-builder/types.js';

// ──────────────────────────────────────────────────────────────
// LIMITS
// ──────────────────────────────────────────────────────────────

const MAX_REQUEST_BYTES = 32_768;   // 32KB request body cap
const MAX_MESSAGE_LENGTH = 2_000;   // characters per user message
const MAX_HISTORY_TURNS = 20;       // messages in conversation history
const REQUEST_TIMEOUT_MS = 35_000;  // 35 s total endpoint timeout

import fs from 'node:fs';
import path from 'node:path';

// Ensure .env is loaded in all execution modes
function getApiKey(): string | undefined {
  if (process.env.AI_API_KEY && process.env.AI_API_KEY.trim() !== '') {
    return process.env.AI_API_KEY.trim();
  }
  // Try import.meta.env
  const metaKey = (import.meta.env as Record<string, any>)?.AI_API_KEY;
  if (metaKey && typeof metaKey === 'string' && metaKey.trim() !== '') {
    return metaKey.trim();
  }
  // Fallback: load directly from .env file
  try {
    const envPaths = [
      path.resolve('.env'),
      path.resolve(process.cwd(), '.env'),
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('AI_API_KEY=')) {
            const val = trimmed.slice('AI_API_KEY='.length).trim();
            if (val) {
              process.env.AI_API_KEY = val;
              return val;
            }
          }
          if (trimmed.startsWith('AI_MODEL=')) {
            const val = trimmed.slice('AI_MODEL='.length).trim();
            if (val) process.env.AI_MODEL = val;
          }
        }
      }
    }
  } catch {}
  return undefined;
}

// ──────────────────────────────────────────────────────────────
// PROVIDER SELECTION
// ──────────────────────────────────────────────────────────────

function isLikelyGeminiKey(value: string): boolean {
  // Support both AIza format and AQ. format for Gemini keys
  return /^(AIza[0-9A-Za-z\-_]{35,}|AQ\.[0-9A-Za-z\-_\.]{30,})$/.test(value.trim());
}

function getNvidiaApiKey(): string | undefined {
  if (process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim() !== '') {
    return process.env.NVIDIA_API_KEY.trim();
  }
  const metaKey = (import.meta.env as Record<string, any>)?.NVIDIA_API_KEY;
  if (metaKey && typeof metaKey === 'string' && metaKey.trim() !== '') {
    return metaKey.trim();
  }
  try {
    const envPaths = [path.resolve('.env'), path.resolve(process.cwd(), '.env')];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('NVIDIA_API_KEY=')) {
            const val = trimmed.slice('NVIDIA_API_KEY='.length).trim();
            if (val) {
              process.env.NVIDIA_API_KEY = val;
              return val;
            }
          }
        }
      }
    }
  } catch {}
  return undefined;
}

function resolveProviderMode(): 'gemini' | 'nvidia' | 'mock' {
  const nvidiaKey = getNvidiaApiKey();
  if (nvidiaKey && nvidiaKey.trim() !== '') {
    console.info('[ask-builder] NVIDIA key detected — using NvidiaProvider');
    return 'nvidia';
  }

  const key = getApiKey();
  if (!key || key.trim() === '' || !isLikelyGeminiKey(key)) {
    console.info('[ask-builder] No valid Gemini or Nvidia key — using MockAIProvider');
    return 'mock';
  }
  return 'gemini';
}

// ──────────────────────────────────────────────────────────────
// VALIDATION
// ──────────────────────────────────────────────────────────────

function isValidRequest(body: unknown): body is AskBuilderRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.message !== 'string') return false;
  if (typeof b.context !== 'object' || b.context === null) return false;
  if (!Array.isArray(b.history)) return false;
  return true;
}

function sanitiseError(err: unknown): string {
  if (err instanceof Error) {
    // Strip anything that might contain server paths or keys
    const msg = err.message;
    if (msg.includes('API_KEY') || msg.includes('Bearer') || msg.includes(process.cwd())) {
      return 'The AI provider is temporarily unavailable. Please try again.';
    }
    return msg.slice(0, 200); // cap length
  }
  return 'An unexpected error occurred. Please try again.';
}

// ──────────────────────────────────────────────────────────────
// RATE LIMITING — 20 requests/minute/IP (server-side, in-memory)
// ──────────────────────────────────────────────────────────────

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_MAX = 20;       // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1-minute window

// In-memory store: IP → { count, windowStart }
// Map is GC'd naturally; old entries are cleaned on access.
const rateLimitStore = new Map<string, RateLimitRecord>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    // Prune old entries occasionally (every ~100 checks)
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now - v.windowStart >= RATE_LIMIT_WINDOW_MS * 2) rateLimitStore.delete(k);
      }
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((record.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

// ──────────────────────────────────────────────────────────────
// HANDLER
// ──────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  // ── Rate limit check ──
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Too many requests. Please wait a moment before asking again.' } satisfies AskBuilderErrorResponse),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSeconds),
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      }
    );
  }

  // ── Request size guard ──
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BYTES) {
    return jsonResponse({ ok: false, error: 'Request too large.' } satisfies AskBuilderErrorResponse, 413);
  }

  // ── Parse body ──
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: 'Request too large.' } satisfies AskBuilderErrorResponse, 413);
    }
    body = JSON.parse(text);
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' } satisfies AskBuilderErrorResponse, 400);
  }

  // ── Validate structure ──
  if (!isValidRequest(body)) {
    return jsonResponse({ ok: false, error: 'Malformed request.' } satisfies AskBuilderErrorResponse, 400);
  }

  // ── Sanitise inputs ──
  const userMessage = body.message.slice(0, MAX_MESSAGE_LENGTH);
  const history = (body.history as unknown[])
    .slice(-MAX_HISTORY_TURNS)
    .filter(
      (m): m is { role: string; content: string } =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as any).role === 'string' &&
        typeof (m as any).content === 'string'
    );
  const context = body.context;

  // ── Build system prompt with context ──
  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemPrompt(context as any);
  } catch {
    systemPrompt = 'You are Ask Builder, an AI assistant for PC building. Respond with JSON: {"message":"...","actions":[]}.';
  }

  // ── Resolve provider ──
  const mode = resolveProviderMode();
  let provider;
  try {
    provider = await createProvider(mode);
  } catch (err) {
    console.error('[ask-builder] Provider init error:', err);
    return jsonResponse(
      { ok: false, error: 'Could not initialise AI provider.' } satisfies AskBuilderErrorResponse,
      503
    );
  }

  // ── Call provider with timeout ──
  let payload;
  let providerStatus: { provider: string; model: string; mode: string };
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), REQUEST_TIMEOUT_MS)
    );

    const responsePayload = await Promise.race([
      provider.sendMessage({ systemPrompt, userMessage, history, maxTokens: 512 }),
      timeoutPromise,
    ]);

    // ── Validate actions produced by AI ──
    const validatedActions = validateActions(responsePayload.actions ?? []);

    // ── Provider status reporting ──
    const currentModel = process.env.AI_MODEL || 'gemini-3.7-flash';
    providerStatus = {
      provider:
        mode === 'gemini'
          ? 'GeminiProvider'
          : mode === 'nvidia'
            ? 'NvidiaProvider'
            : 'MockAIProvider',
      model: mode === 'gemini' ? currentModel : mode === 'nvidia' ? (process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct') : 'mock',
      mode: mode.toUpperCase(),
    };

    payload = {
      message: typeof responsePayload.message === 'string'
        ? responsePayload.message
        : 'I could not generate a response. Please try again.',
      actions: validatedActions,
      providerStatus,
    };
  } catch (err) {
    console.error('[ask-builder] Provider error:', err);
    return jsonResponse(
      { ok: false, error: sanitiseError(err) } satisfies AskBuilderErrorResponse,
      502
    );
  }

  const response: AskBuilderResponse = { ok: true, payload };
  return jsonResponse(response, 200);
};

// Reject non-POST methods
export const GET: APIRoute = () =>
  jsonResponse({ ok: false, error: 'Method not allowed.' } satisfies AskBuilderErrorResponse, 405);

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      ...extraHeaders,
    },
  });
}
