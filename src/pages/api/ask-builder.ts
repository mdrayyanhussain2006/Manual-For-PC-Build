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
// RATE LIMITING
// ──────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 20;  // 20 requests per minute per IP
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxy environments)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return ip;
}

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetTime < now) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitMap.set(identifier, newEntry);
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: newEntry.resetTime };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetTime: entry.resetTime };
}

// ──────────────────────────────────────────────────────────────
// LIMITS
// ──────────────────────────────────────────────────────────────

const MAX_REQUEST_BYTES = 32_768;   // 32KB request body cap
const MAX_MESSAGE_LENGTH = 2_000;   // characters per user message
const MAX_HISTORY_TURNS = 20;       // messages in conversation history
const REQUEST_TIMEOUT_MS = 35_000;  // 35 s total endpoint timeout

// ──────────────────────────────────────────────────────────────
// PROVIDER SELECTION
// ──────────────────────────────────────────────────────────────

function resolveProviderMode(): 'gemini' | 'mock' {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '') {
    console.info('[ask-builder] No GEMINI_API_KEY — using MockAIProvider');
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
// HANDLER
// ──────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  // ── Rate limiting ──
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return jsonResponse(
      { ok: false, error: 'Too many requests. Please wait before trying again.' } satisfies AskBuilderErrorResponse,
      429,
      { 'Retry-After': String(retryAfter) }
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

    payload = {
      message: typeof responsePayload.message === 'string'
        ? responsePayload.message
        : 'I could not generate a response. Please try again.',
      actions: validatedActions,
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
