# ASK BUILDER — ARCHITECTURE

## Overview

Ask Builder is a persistent AI assistant embedded in the PC Customization Manual website. It helps users understand components, navigate the build guide, and troubleshoot common issues through a conversational interface.

The architecture enforces a strict security boundary: **the browser never holds the AI API key.**

---

## System Architecture

```
Browser (client)
  │
  ├─ AskBuilder.astro          ← UI component (trigger + panel)
  ├─ contextBridge.ts          ← reads IntegrationState → AskBuilderContext
  │
  └─ POST /api/ask-builder
         │
         ▼
    Astro API Route (server)
         │
         ├─ Request validation (size, message length, history length)
         ├─ Rate limiting (per-IP, 20 req/min)
         ├─ Input sanitisation
         ├─ buildSystemPrompt(context) → knowledge layer (async)
         │
         ├─ createProvider(mode)
         │       ├─ MockAIProvider  (when GEMINI_API_KEY is empty/dev mode)
         │       └─ GeminiProvider (when GEMINI_API_KEY is set)
         │
         ├─ provider.sendMessage(...)  → AIResponsePayload
         │
         ├─ validateActions(payload.actions)  ← action validator
         │                                       (rejects all invalid actions)
         └─ AskBuilderResponse { ok, payload } → browser
```

---

## Component Map

| File | Role | Runtime |
|------|------|---------|
| `src/components/AskBuilder.astro` | UI trigger + panel + client logic | Client |
| `src/lib/ask-builder/types.ts` | All shared TypeScript types | Both |
| `src/lib/ask-builder/AIProvider.ts` | Provider interface + factory | Server |
| `src/lib/ask-builder/providers/GeminiProvider.ts` | Google Gemini implementation | Server |
| `src/lib/ask-builder/providers/MockAIProvider.ts` | Deterministic mock | Server |
| `src/lib/ask-builder/knowledge.ts` | System prompt builder (async, semantic parts) | Server |
| `src/lib/ask-builder/actionValidator.ts` | Action security validator (component-scoped) | Server |
| `src/lib/ask-builder/contextBridge.ts` | IntegrationState → context snapshot | Client |
| `src/pages/api/ask-builder.ts` | Server endpoint | Server |
| `src/styles/global.css` (appended) | `ab-*` scoped styles | Client |

---

## Provider Interface

```typescript
interface AIProvider {
  readonly name: string;
  sendMessage(options: AIProviderSendOptions): Promise<AIResponsePayload>;
  getHealth(): Promise<{ ok: boolean; latencyMs?: number; message?: string }>;
}
```

The provider is selected at **server startup** based on the presence of `GEMINI_API_KEY`. No provider selection logic ever reaches the browser.

---

## Gemini Configuration

- **API base**: `https://generativelanguage.googleapis.com`
- **Model**: `gemini-2.5-flash` (configurable via `AI_MODEL`)
- **Output mode**: `application/json` via `generationConfig.responseMimeType`
- **Temperature**: 0.3 (consistent, factual answers)
- **Max tokens**: 512 per response
- **Timeout**: 30s per request, 35s at endpoint level

The model is prompted to always respond with:
```json
{
  "message": "Plain text response",
  "actions": []
}
```

---

## Mock Provider

The `MockAIProvider` activates automatically when `GEMINI_API_KEY` is empty or unset.

- All responses are prefixed with `[MOCK]` so they are never confused with real AI
- 15 keyword-matched PC build scenarios
- Simulates ~600–1000ms latency
- No external network calls

---

## Knowledge Layer

`src/lib/ask-builder/knowledge.ts` builds the system prompt from:

1. **Static site knowledge** — navigation routes, page purposes
2. **ComponentRegistry** — all 12 component descriptions and specs (from `ComponentRegistry.ts`)
3. **Semantic parts knowledge** — 126 parts across 12 components loaded from `public/component-data/*/parts.en.json`
4. **Build sequence** — 10-step guided build knowledge
5. **Safety guidelines** — conservative installation guidance
6. **Troubleshooting** — common first-build failure modes (anchors from `/troubleshooting/`)
7. **Runtime context** — `AskBuilderContext` snapshot (current page, active component, activeSemanticId, X-Ray state, etc.)

The prompt instructs the model to:
- Respond in structured JSON only
- Never invent specs, voltages, or compatibility claims
- State uncertainty clearly
- Recommend manufacturer documentation for model-specific details
- Use component-scoped semantic IDs for focusFeature actions

---

## Context Model

`AskBuilderContext` snapshot provided with each request:

```typescript
interface AskBuilderContext {
  route: string;              // Current pathname, e.g. /components/gpu/
  theme: 'light' | 'dark' | 'accent';
  activeComponent: string | null;    // e.g. 'gpu' (canonical slug)
  activeSemanticId: string | null;   // e.g. 'graphics_processor' (from parts.en.json)
  cameraTarget: string | null;
  timelineProgress: number;          // 0-1 scroll progress
  explodeProgress: number;           // 0-1 explode state
  xrayActive: boolean;
  isInteracting: boolean;
  buildStep: number | null;          // 1-10 or null (from URL hash #step-N)
}
```

This is derived from `IntegrationState.getSnapshot()` via `contextBridge.ts`. The 3D state system is not duplicated.

**Critical fixes:**
- `activeComponent` is now the canonical slug (e.g., `cpu`, `gpu`), never a part number
- `activeSemanticId` is populated from the component's `parts.en.json` ID (e.g., `heat_spreader`, `compute_die`)
- `buildStep` is parsed from `window.location.hash` on `/build/` pages (e.g., `#step-06`)

---

## Actions

Ask Builder can request these application-owned actions:

| Action | Effect |
|--------|--------|
| `navigate` | Navigate to an internal route |
| `openComponent` | Open a component page by slug |
| `openBuildStep` | Navigate to a build step anchor (`/build/#step-N`) |
| `focusFeature` | Dispatch `ask-builder:focus-feature` event with component + semanticId |
| `openTroubleshooting` | Navigate to troubleshooting page with valid topic anchor |

**All actions are validated server-side before being sent to the browser, and validated again client-side before execution.**

---

## Environment Setup

Copy `.env.example` to `.env` and set `GEMINI_API_KEY`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-2.5-flash
```

When `GEMINI_API_KEY` is empty, Ask Builder automatically uses `MockAIProvider` for development.

---

## Build System Change

`astro.config.mjs` was updated to `output: 'server'` with `@astrojs/node` adapter. This is required for the server-side API endpoint. The rest of the site renders identically.

---

## No Unrelated Changes

Only the following were modified outside the `ask-builder/` directory:
- `astro.config.mjs`: Added `output: 'server'` and node adapter (required)
- `src/styles/global.css`: Appended `.ab-*` scoped styles (no existing rules changed)
- `src/layouts/BaseLayout.astro`: Added `<AskBuilder />` import and render (no existing code changed)
- `.gitignore`: Added `.env` entry
