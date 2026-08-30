# ASK BUILDER — FINAL SECURITY MATRIX

## Overview

This matrix documents the security posture of Ask Builder after the forensic correction and Gemini integration. All tests pass.

---

## 1. API Key Protection

| Control | Implementation | Verified |
|---------|----------------|----------|
| Key only in server env | `process.env.GEMINI_API_KEY` in server modules only | ✅ |
| Key never in client bundle | `@astrojs/node` adapter separates server/client | ✅ |
| Key never in localStorage | No client-side storage of credentials | ✅ |
| .env in .gitignore | Added to `.gitignore` | ✅ |
| .env.example has no real key | Template only | ✅ |

---

## 2. Action Validation (Server + Client)

### Route Validation

| Test Case | Expected | Result |
|-----------|----------|--------|
| `navigate` to `/components/gpu/` | ALLOWED | ✅ |
| `navigate` to `https://example.com` | REJECTED | ✅ |
| `navigate` to `javascript:alert(1)` | REJECTED | ✅ |
| `navigate` to `file:///etc/passwd` | REJECTED | ✅ |
| `navigate` to `data:text/html,<script>` | REJECTED | ✅ |
| `navigate` to unknown `/evil/` | REJECTED | ✅ |

### Component Slug Validation

| Test Case | Expected | Result |
|-----------|----------|--------|
| `openComponent` slug `gpu` | ALLOWED | ✅ |
| `openComponent` slug `evil` | REJECTED | ✅ |

### Component-Scoped Semantic ID Validation

| Test Case | Expected | Result |
|-----------|----------|--------|
| `focusFeature` component `gpu`, semanticId `graphics_processor` | ALLOWED | ✅ |
| `focusFeature` component `cpu`, semanticId `graphics_processor` | REJECTED | ✅ |
| `focusFeature` component `gpu`, semanticId `CPU` | REJECTED | ✅ |
| `focusFeature` component `cpu`, semanticId `heat_spreader` | ALLOWED | ✅ |

### Build Step Validation

| Test Case | Expected | Result |
|-----------|----------|--------|
| `openBuildStep` step `5` | ALLOWED | ✅ |
| `openBuildStep` step `11` | REJECTED | ✅ |
| `openBuildStep` step `0` | REJECTED | ✅ |
| `openBuildStep` step `"five"` | REJECTED | ✅ |

### Troubleshooting Topic Validation

| Test Case | Expected | Result |
|-----------|----------|--------|
| `openTroubleshooting` topic `no-post` | ALLOWED | ✅ |
| `openTroubleshooting` topic `no-power` | ALLOWED | ✅ |
| `openTroubleshooting` topic `evil` | REJECTED | ✅ |

### Unknown Action Type

| Test Case | Expected | Result |
|-----------|----------|--------|
| `runCode` | REJECTED | ✅ |
| `deleteFile` | REJECTED | ✅ |

---

## 3. Request Limits

| Limit | Value | Enforced |
|-------|-------|----------|
| Max request body | 32 KB | ✅ 413 response |
| Max message length | 2,000 chars | ✅ Truncated |
| Max history turns | 20 messages | ✅ Sliced |
| Request timeout | 35 seconds | ✅ AbortController |
| Provider timeout | 30 seconds | ✅ AbortController |

---

## 4. Rate Limiting

| Parameter | Value |
|-----------|-------|
| Window | 60 seconds |
| Max requests per IP | 20 |
| Response on exceed | 429 Too Many Requests |
| Headers | `Retry-After` (seconds) |
| Cleanup interval | 5 minutes |
| Client ID source | `x-forwarded-for` / `x-real-ip` |

**Test**: 21 sequential requests → Requests 1-20: 200 OK, Request 21+: 429 with Retry-After header ✅

---

## 5. Error Sanitisation

| Threat | Control |
|--------|---------|
| API key in error messages | Stripped via `sanitiseError()` |
| Stack traces | Never forwarded to client |
| Server file paths | Never forwarded |
| Provider error details | Masked to generic message |
| Error message length | Capped at 200 chars |

---

## 6. DOM Security

| Pattern | Usage in Ask Builder |
|---------|---------------------|
| `innerHTML` | Only in context bar with entity-escaped data |
| `outerHTML` | Not used |
| `insertAdjacentHTML` | Not used |
| `document.write` | Not used |
| `eval()` | Not used |
| `new Function()` | Not used |
| Message content | Assigned via `textContent` (safe) |

---

## 7. Content Security

| Check | Result |
|-------|--------|
| No hardcoded secrets in source | ✅ |
| No Bearer tokens in source | ✅ |
| No credentials in public/ | ✅ |
| No credentials in client JS | ✅ |
| `.env` not committed | ✅ (gitignored) |

---

## 8. 3D State Preservation

| State | Preserved During Ask Builder Use |
|-------|----------------------------------|
| GLB model loaded | ✅ No reload |
| WebGL context | ✅ No recreation |
| Camera position | ✅ No reset (unless focusFeature) |
| Explode progress | ✅ No reset |
| X-Ray mode | ✅ No corruption |
| RAF loops | ✅ No duplicates |

---

## 9. Provider Abstraction

| Aspect | Implementation |
|--------|----------------|
| Interface | `AIProvider` (sendMessage, getHealth) |
| Factory | `createProvider(mode)` — lazy imports |
| Current provider | `GeminiProvider` (Gemini 2.5 Flash) |
| Fallback provider | `MockAIProvider` (deterministic) |
| Swappable | Yes — add new provider implementing interface |

---

## 10. Summary

| Category | Status |
|----------|--------|
| API Key Protection | ✅ SECURE |
| Action Validation | ✅ SECURE (server + client) |
| Request Limits | ✅ ENFORCED |
| Rate Limiting | ✅ IMPLEMENTED |
| Error Sanitisation | ✅ ENFORCED |
| DOM Security | ✅ SECURE |
| Content Security | ✅ CLEAN |
| 3D State Preservation | ✅ VERIFIED |
| Provider Abstraction | ✅ MAINTAINED |

**Overall Security Posture: SECURE**