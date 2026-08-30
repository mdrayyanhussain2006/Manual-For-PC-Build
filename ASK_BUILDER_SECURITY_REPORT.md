# ASK BUILDER — SECURITY REPORT

## Security Model

Ask Builder treats all AI output as **untrusted user input**. The security model is enforced at multiple layers.

---

## 1. API Key Protection

| Threat | Control |
|--------|---------|
| Key exposed in browser HTML | ✅ Key only in server env vars, never rendered |
| Key exposed in client JS | ✅ API call made server-side only |
| Key in localStorage/sessionStorage | ✅ Not stored anywhere client-side |
| Key committed to repository | ✅ `.env` in `.gitignore`; `.env.example` has no real key |
| Key in dist/ output | ✅ Server module not bundled into client assets |

---

## 2. Action Validation

All AI-produced actions pass through `actionValidator.ts` **server-side** before being returned to the browser, and are validated again **client-side** before execution.

### Route Validation
```
ALLOWED_ROUTES = { '/', '/get-ready/', '/components/', '/build/', '/troubleshooting/', ...all component routes }
```
Any route not in this allowlist is **silently rejected**.

### Forbidden URL Schemes
```
javascript:  → REJECTED
data:        → REJECTED
file:        → REJECTED
about:       → REJECTED
ftp:         → REJECTED
mailto:      → REJECTED
http(s)://external → REJECTED (hostname must be localhost)
```

### Client-Side Double-Check
```typescript
function isInternalPath(path: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false; // no protocol
  if (path.startsWith('//')) return false;              // no protocol-relative
  if (!path.startsWith('/')) return false;              // must be root-relative
  return true;
}
```

### Component Slug Validation
Only slugs in `COMPONENT_REGISTRY` are accepted.

### Component-Scoped Semantic ID Validation
Only IDs from the **requested component's** `fullPcSemanticIds` array are accepted. Cross-component IDs are rejected.

```typescript
function isValidSemanticIdForComponent(component: string, semanticId: unknown): boolean {
  if (typeof semanticId !== 'string') return false;
  const allowed = COMPONENT_SEMANTIC_IDS.get(component);
  if (!allowed) return false;
  return allowed.has(semanticId);
}
```

### Build Step Validation
Steps must be integers in range [1, 10].

### Troubleshooting Topic Validation
Only a fixed allowlist derived from actual page anchors is accepted: `no-power`, `no-post`, `ram-not-detected`, `gpu-not-detected`, `storage-not-detected`, `random-shutdowns`.

---

## 3. Request Limits

| Limit | Value |
|-------|-------|
| Max request body | 32 KB |
| Max user message length | 2,000 characters |
| Max conversation history | 20 messages |
| Request timeout | 35 seconds |
| Provider internal timeout | 30 seconds |
| Rate limit (per IP) | 20 requests/minute |

---

## 4. Rate Limiting

Lightweight per-IP rate limiting implemented in `/api/ask-builder.ts`:
- Sliding window: 1 minute
- Max requests: 20 per window
- Returns 429 with `Retry-After` header when exceeded
- Automatic cleanup of expired entries every 5 minutes
- Client identifier from `x-forwarded-for` / `x-real-ip` headers

---

## 5. Error Sanitisation

Server errors are sanitised before returning to the browser:
- API key strings are never included in error messages
- Stack traces are never forwarded
- Server file paths are never forwarded
- Provider-specific error details are masked
- Error messages are capped at 200 characters

---

## 6. DOM Security

### innerHTML usage
The only `innerHTML` assignment in `AskBuilder.astro` is in the context bar:
```javascript
chips.innerHTML = parts.join('');
```
The `parts` array is constructed exclusively from:
- `escText(ctx.activeComponent)` — entity-escaped user data
- Literal template strings with hardcoded class names and CSS values

All **message content** is assigned via `element.textContent` (safe, no HTML parsing).

No `eval()`, `new Function()`, `document.write()`, `outerHTML`, or `insertAdjacentHTML` is used anywhere in Ask Builder code.

### Event-based 3D interface
The `focusFeature` action dispatches a `CustomEvent` — it does not call any WebGL or Three.js APIs directly.

---

## 7. Arbitrary Code Prevention

The AI model is instructed in the system prompt:
> "Do not roleplay as a human. Do not discuss topics unrelated to PC building and this website."

Structurally, the model can only return JSON with `message` (text) and `actions` (validated action objects). There is no code execution path from model output.

---

## 8. No Analytics / No Tracking

Ask Builder contains:
- No analytics calls
- No telemetry
- No external beacon URLs
- No session IDs sent to third parties

---

## 9. Security Test Results

| Test Case | Expected | Result |
|-----------|----------|--------|
| `navigate` to `https://example.com` | REJECTED | ✅ Rejected by `isInternalRoute()` |
| `navigate` to `javascript:alert(1)` | REJECTED | ✅ Rejected by scheme check |
| `navigate` to `file:///etc/passwd` | REJECTED | ✅ Rejected by scheme check |
| `navigate` to unknown route `/evil/` | REJECTED | ✅ Not in ALLOWED_ROUTES |
| `openComponent` with slug `evil` | REJECTED | ✅ Not in COMPONENT_REGISTRY |
| `focusFeature` with unknown semanticId | REJECTED | ✅ Not in component's semantic IDs |
| `focusFeature` with cross-component semanticId (cpu + graphics_processor) | REJECTED | ✅ Component-scoped validation |
| Unknown action type `runCode` | REJECTED | ✅ Default case in validator |
| Malformed JSON from provider | HANDLED | ✅ Falls back to plain text message |
| Request body > 32KB | REJECTED | ✅ 413 response |
| Message > 2000 chars | TRUNCATED | ✅ Sliced server-side |
| Rate limit exceeded (21st request) | 429 | ✅ Returns 429 with Retry-After |

---

## 10. Secret Scanning

Scan of Ask Builder source files for hardcoded secrets:
- `GEMINI_API_KEY` — never appears as a value, only as an env var key
- No Bearer tokens in source code
- No hardcoded API endpoints with credentials
- `.env` is gitignored
