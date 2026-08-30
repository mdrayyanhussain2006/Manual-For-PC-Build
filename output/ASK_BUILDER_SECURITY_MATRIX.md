# ASK BUILDER — SECURITY MATRIX

| Threat | Control | Layer | Status |
|--------|---------|-------|--------|
| API key exposure in HTML | Key stored only in server env vars (`process.env.AI_API_KEY`) | Server | ✅ SECURED |
| API key exposure in client JS | API call proxied through `/api/ask-builder` server endpoint | Server | ✅ SECURED |
| API key in localStorage | Never stored anywhere client-side | Client | ✅ SECURED |
| API key committed to repo | `.env` added to `.gitignore` | Config | ✅ SECURED |
| Route injection — external URL | `ALLOWED_ROUTES` set + hostname check in `isInternalRoute()` | Server + Client | ✅ BLOCKED |
| Route injection — `javascript:` | Scheme check in `isInternalRoute()` + client `isInternalPath()` | Server + Client | ✅ BLOCKED |
| Route injection — `file:` | Scheme check in `isInternalRoute()` + client `isInternalPath()` | Server + Client | ✅ BLOCKED |
| Route injection — `data:` | Scheme check in `isInternalRoute()` | Server + Client | ✅ BLOCKED |
| Route injection — unknown internal path | `ALLOWED_ROUTES` allowlist enforced | Server | ✅ BLOCKED |
| Unknown component slug | `ALLOWED_COMPONENT_SLUGS` from `COMPONENT_REGISTRY` | Server | ✅ BLOCKED |
| Unknown semantic ID | `ALLOWED_SEMANTIC_IDS` from registry `fullPcSemanticIds` | Server | ✅ BLOCKED |
| Unknown action type | Default case in `validateAction()` returns null | Server | ✅ BLOCKED |
| Invalid build step | Range check [1, 10] + integer validation | Server | ✅ BLOCKED |
| Unknown troubleshooting topic | `ALLOWED_TROUBLESHOOTING_TOPICS` allowlist | Server | ✅ BLOCKED |
| Prompt injection via user message | Message treated as plain string, not code; JSON response contract | Server | ✅ MITIGATED |
| Arbitrary code execution via AI | No eval(), no Function(), no innerHTML for AI content | Client | ✅ BLOCKED |
| XSS via message content | All AI message content set via `textContent` (not `innerHTML`) | Client | ✅ BLOCKED |
| XSS via context chip | Context values escaped with `escText()` before single innerHTML use | Client | ✅ BLOCKED |
| Request body flood | 32 KB content-length check + text length cap | Server | ✅ LIMITED |
| Message length attack | 2,000 character `slice()` on server | Server | ✅ LIMITED |
| History flooding | Capped to 20 messages on server | Server | ✅ LIMITED |
| Provider timeout | 35s endpoint timeout + 30s provider timeout | Server | ✅ LIMITED |
| Error leakage (stack traces) | `sanitiseError()` strips paths, key mentions, caps at 200 chars | Server | ✅ SANITISED |
| Error leakage (provider internals) | HTTP status masked as generic message | Server | ✅ SANITISED |
| Analytics/telemetry | None added | — | ✅ NONE |
| Storage of conversations | In-memory only, resets on navigation | Client | ✅ EPHEMERAL |
