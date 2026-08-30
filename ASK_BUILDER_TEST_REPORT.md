# ASK BUILDER — TEST REPORT

## Test Environment
- **Date**: 2026-08-31
- **Browser**: Chromium (Playwright) / Manual verification
- **Server**: Astro dev server on localhost:4322
- **Provider Mode**: MockAIProvider (no GEMINI_API_KEY configured)
- **Themes tested**: Light, Dark, Accent

---

## Functional Tests

### Core Panel

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Trigger visible on landing page | ✅ PASS | Bottom-right fixed position |
| 2 | Trigger opens panel on click | ✅ PASS | Smooth slide animation |
| 3 | Panel close button works | ✅ PASS | Panel slides out |
| 4 | Escape key closes panel | ✅ PASS | Focus returns to trigger |
| 5 | Panel aria-hidden updates correctly | ✅ PASS | `aria-hidden="true/false"` |
| 6 | aria-expanded on trigger updates | ✅ PASS | Reflects open/closed state |

### Welcome State & BUILD Motif

| # | Test | Result | Notes |
|---|------|--------|-------|
| 7 | Welcome message displays | ✅ PASS | "Hey — I'm Ask Builder" |
| 8 | BUILD pixel SVG motif visible | ✅ PASS | Colored pixel-art letters (6 colors) |
| 9 | Suggestion chips visible | ✅ PASS | 6 context chips shown |
| 10 | Context footnote visible | ✅ PASS | Shows "understands your context" |
| 11 | Footer shows "Ask Builder" (no "Gemini") | ✅ PASS | Brand identity correct |

### Conversation Flow

| # | Test | Result | Notes |
|---|------|--------|-------|
| 12 | Suggestion chip submits message | ✅ PASS | User bubble appears |
| 13 | Welcome state hidden after first message | ✅ PASS | Welcome div removed |
| 14 | Thinking indicator appears | ✅ PASS | Animated dots + "Thinking…" |
| 15 | Mock response appears | ✅ PASS | [MOCK] prefix confirmed |
| 16 | Response time 600-1000ms | ✅ PASS | Matches mock delay |
| 17 | Action chips rendered below response | ✅ PASS | Navigation chips shown |
| 18 | Composer: text input works | ✅ PASS | Types and auto-resizes |
| 19 | Composer: Enter sends message | ✅ PASS | Sends without newline |
| 20 | Composer: Shift+Enter is newline | ✅ PASS | Does not send |
| 21 | Send button enabled when text present | ✅ PASS | |
| 22 | Send button disabled when empty | ✅ PASS | |
| 23 | Send button disabled while thinking | ✅ PASS | |
| 24 | Clear conversation resets to welcome | ✅ PASS | History wiped, welcome shown |

### Navigation Actions

| # | Test | Result | Notes |
|---|------|--------|-------|
| 25 | Action chip "→ /components/gpu/" navigates | ✅ PASS | Navigated to GPU page |
| 26 | Action chip "Troubleshooting: no-post" | ✅ PASS | Navigated to troubleshooting |
| 27 | Action chip "Go to Step 1" | ✅ PASS | Navigated with anchor |
| 28 | External URL rejected client-side | ✅ PASS | `isInternalPath` blocks it |

### Context Awareness

| # | Test | Result | Notes |
|---|------|--------|-------|
| 29 | Context bar updates with route | ✅ PASS | Shows on component pages |
| 30 | Ask "What does the GPU do?" on GPU page | ✅ PASS | GPU response returned |
| 31 | Ask "What does this part do?" with activeSemanticId | ✅ PASS | Part-aware response |
| 32 | Mock uses "gpu" keyword to match | ✅ PASS | Scenario matched |

### Build Knowledge

| # | Test | Result | Notes |
|---|------|--------|-------|
| 33 | "What should I install next?" | ✅ PASS | Returns build order guidance |
| 34 | "My PC won't POST" | ✅ PASS | Returns troubleshooting + action |
| 35 | "What does the GPU do?" | ✅ PASS | Returns GPU knowledge |
| 36 | On /build/#step-06, buildStep context = 6 | ✅ PASS | Hash parsed correctly |

### Themes

| # | Test | Result | Notes |
|---|------|--------|-------|
| 37 | Light theme | ✅ PASS | Panel uses light surface tokens |
| 38 | Dark theme | ✅ PASS | Panel uses dark surface tokens |
| 39 | Accent theme | ✅ PASS | Brutalist styling applied |
| 40 | Theme switch with panel open | ✅ PASS | Panel updates in real-time |

### Focus Feature

| # | Test | Result | Notes |
|---|------|--------|-------|
| 41 | focusFeature action dispatched | ✅ PASS | CustomEvent sent |
| 42 | Consumer in Model3D.astro receives event | ✅ PASS | Routes to correct adapter |
| 43 | Adapter selects part by semanticId | ✅ PASS | Finds part number, calls selectPart |
| 44 | GPU P01 (graphics_processor) focuses | ✅ PASS | Camera moves, badge highlights |
| 45 | CPU P03 (compute_die) focuses | ✅ PASS | Camera moves, badge highlights |
| 46 | RAM P04 (dram_packages) focuses | ✅ PASS | Camera moves, badge highlights |

### Accessibility

| # | Test | Result | Notes |
|---|------|--------|-------|
| 47 | Trigger has aria-label | ✅ PASS | "Open Ask Builder assistant" |
| 48 | Panel has role="dialog" | ✅ PASS | |
| 49 | Panel has aria-modal="true" | ✅ PASS | |
| 50 | Close button has aria-label | ✅ PASS | "Close Ask Builder" |
| 51 | Messages have role="log" | ✅ PASS | |
| 52 | Focus enters panel on open | ✅ PASS | |
| 53 | Focus returns to trigger on close | ✅ PASS | |
| 54 | Escape closes panel | ✅ PASS | |
| 55 | Focus-visible styles present | ✅ PASS | Accent outline on all controls |
| 56 | Tab order logical | ✅ PASS | Header → messages → composer |

### Responsive

| # | Test | Result | Notes |
|---|------|--------|-------|
| 57 | Desktop (1920px) | ✅ PASS | Right-side panel |
| 58 | Tablet (768px) | ✅ PASS | Right-side panel |
| 59 | Mobile (480px) | ✅ PASS | Bottom sheet (85dvh) |

---

## Security Tests

| # | Test | Expected | Result |
|---|------|----------|--------|
| S1 | navigate to `https://example.com` | REJECTED | ✅ Rejected |
| S2 | navigate to `javascript:alert(1)` | REJECTED | ✅ Rejected |
| S3 | navigate to `file:///etc/passwd` | REJECTED | ✅ Rejected |
| S4 | navigate to unknown route `/evil/` | REJECTED | ✅ Rejected |
| S5 | openComponent with unknown slug | REJECTED | ✅ Rejected |
| S6 | focusFeature with unknown semanticId | REJECTED | ✅ Rejected |
| S7 | focusFeature cross-component (cpu + graphics_processor) | REJECTED | ✅ Rejected |
| S8 | Unknown action type `runCode` | REJECTED | ✅ Rejected |
| S9 | GEMINI_API_KEY not in client HTML | CONFIRMED | ✅ Not present |
| S10 | GEMINI_API_KEY not in client JS | CONFIRMED | ✅ Not present |
| S11 | Error messages don't expose internals | CONFIRMED | ✅ Sanitised |
| S12 | Rate limit exceeded (21st req) | 429 + Retry-After | ✅ Blocked |

---

## 3D State Preservation

Manual test on `/components/gpu/`:

1. Opened the 3D model viewer — GPU model loaded
2. Triggered Explode view — GPU exploded correctly
3. Opened Ask Builder panel
4. Asked a question — response received
5. Closed Ask Builder panel
6. Verified 3D state — no GLB reload, no camera reset, no Explode reset

**Result**: ✅ PASS — Ask Builder panel is a CSS-only layer that does not interact with the WebGL renderer. No RAF loops created, no WebGL contexts created.

---

## Mock Provider Scenarios Tested

| Scenario | Response Contains | Actions |
|----------|-------------------|---------|
| "What should I install next?" | Build sequence guidance | openBuildStep(1) |
| "What does the GPU do?" | GPU description | navigate /components/gpu/ |
| "My PC won't POST" | No-POST guidance | openTroubleshooting(no-post) |
| "Where does the cable go?" | Cable connection guidance | navigate /components/cables/ |
| Default (unmatched) | Generic introduction | none |

---

## Known Notes

1. **Conversation resets on navigation**: The component is re-initialised on each Astro page load. This is expected behaviour for the current implementation — session persistence was listed as optional. Conversation state is in-memory only.

2. **[MOCK] prefix in responses**: This is intentional — the mock provider always labels its responses to prevent confusion with real AI responses.

3. **Accent mode trigger position**: The trigger moves to translate(2px, 2px) on hover per Accent mode design conventions — this is correct behaviour.
