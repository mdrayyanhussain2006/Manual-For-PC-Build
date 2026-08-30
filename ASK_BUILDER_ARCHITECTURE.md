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
         ├─ Input sanitisation
         ├─ buildSystemPrompt(context) → knowledge layer
         │
         ├─ createProvider(mode)
         │       ├─ MockAIProvider  (when AI_API_KEY is empty/dev mode)
         │       └─ DeepSeekProvider (when AI_API_KEY is set)
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
| `src/lib/ask-builder/providers/DeepSeekProvider.ts` | DeepSeek implementation | Server |
| `src/lib/ask-builder/providers/MockAIProvider.ts` | Deterministic mock | Server |
| `src/lib/ask-builder/knowledge.ts` | System prompt builder | Server |
| `src/lib/ask-builder/actionValidator.ts` | Action security validator | Server |
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

The provider is selected at **server startup** based on the presence of `AI_API_KEY`. No provider selection logic ever reaches the browser.

---

## DeepSeek Configuration

- **API base**: `https://api.deepseek.com` (configurable via `AI_BASE_URL`)
- **Model**: `deepseek-chat` (configurable via `AI_MODEL`)
- **Output mode**: JSON object (`response_format: { type: 'json_object' }`)
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

The `MockAIProvider` activates automatically when `AI_API_KEY` is empty or unset.

- All responses are prefixed with `[MOCK]` so they are never confused with real AI
- 15 keyword-matched PC build scenarios
- Simulates ~600–1000ms latency
- No external network calls

---

## Knowledge Layer

`src/lib/ask-builder/knowledge.ts` builds the system prompt from:

1. **Static site knowledge** — navigation routes, page purposes
2. **ComponentRegistry** — all 12 component descriptions and specs (from `ComponentRegistry.ts`)
3. **Build sequence** — 10-step guided build knowledge
4. **Safety guidelines** — conservative installation guidance
5. **Troubleshooting** — common first-build failure modes
6. **Runtime context** — `AskBuilderContext` snapshot (current page, active component, X-Ray state, etc.)

The prompt instructs the model to:
- Respond in structured JSON only
- Never invent specs, voltages, or compatibility claims
- State uncertainty clearly
- Recommend manufacturer documentation for model-specific details

---

## Context Model

`AskBuilderContext` snapshot provided with each request:

```typescript
interface AskBuilderContext {
  route: string;              // Current pathname, e.g. /components/gpu/
  theme: 'light' | 'dark' | 'accent';
  activeComponent: string | null;    // e.g. 'gpu'
  activeSemanticId: string | null;   // e.g. 'GPU'
  cameraTarget: string | null;
  timelineProgress: number;          // 0-1 scroll progress
  explodeProgress: number;           // 0-1 explode state
  xrayActive: boolean;
  isInteracting: boolean;
  buildStep: number | null;          // 1-10 or null
}
```

This is derived from `IntegrationState.getSnapshot()` via `contextBridge.ts`. The 3D state system is not duplicated.

---

## Actions

Ask Builder can request these application-owned actions:

| Action | Effect |
|--------|--------|
| `navigate` | Navigate to an internal route |
| `openComponent` | Open a component page by slug |
| `openBuildStep` | Navigate to a build step anchor |
| `focusFeature` | Dispatch `ask-builder:focus-feature` event |
| `openTroubleshooting` | Navigate to troubleshooting page |

**All actions are validated server-side before being sent to the browser, and validated again client-side before execution.**

---

## Environment Setup

Copy `.env.example` to `.env` and set `AI_API_KEY`:

```env
AI_API_KEY=your_deepseek_api_key_here
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

When `AI_API_KEY` is empty, Ask Builder automatically uses `MockAIProvider` for development.

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
