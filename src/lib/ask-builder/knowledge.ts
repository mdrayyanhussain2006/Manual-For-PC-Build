/**
 * Ask Builder — Knowledge Layer & System Prompt Builder
 * Builds a structured, context-aware system prompt from:
 *  1. Static site knowledge (components, routes, build steps)
 *  2. Runtime context snapshot (current page, active component, etc.)
 *
 * This file runs server-side only.
 * It does NOT invent facts — it uses data from ComponentRegistry.
 */

import { COMPONENT_REGISTRY, getAllComponents } from '../3d/ComponentRegistry.js';
import type { AskBuilderContext } from './types.js';

// ──────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE: SITE NAVIGATION
// ──────────────────────────────────────────────────────────────

const SITE_KNOWLEDGE = `
# Site: PC Customization Manual
A documentation-style interactive PC-building manual for beginners to intermediate builders.

## Pages
- / (Landing): Full-PC 3D scroll assembly animation. Introduction to the build guide.
- /get-ready/ : Tools, ESD safety, workspace setup, and pre-build checklist.
- /components/ : Component Library — 12 interactive 3D component models.
- /build/ : Guided Build — 10 sequential steps for assembling a PC.
- /troubleshooting/ : Troubleshooting reference for common first-build problems.

## Component Library Routes
${getAllComponents()
  .map((c) => `- ${c.route} — ${c.displayName} (${c.category})`)
  .join('\n')}
`.trim();

// ──────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE: COMPONENTS
// ──────────────────────────────────────────────────────────────

function buildComponentKnowledge(): string {
  return getAllComponents()
    .map((c) => {
      const specs = c.specs
        ? c.specs.map((s) => `  - ${s.label}: ${s.value}`).join('\n')
        : '  (no specs)';
      return `### ${c.displayName} (slug: ${c.slug})
Description: ${c.description}
Specs:\n${specs}
Route: ${c.route}`;
    })
    .join('\n\n');
}

// ──────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE: BUILD SEQUENCE
// ──────────────────────────────────────────────────────────────

const BUILD_STEPS = `
## Guided Build — 10-Step Sequence
1. Open the case — familiarise with layout, locate standoffs and I/O headers.
2. Install CPU — align triangle marker to socket, zero-insertion-force lever.
3. Install CPU cooler — apply thermal paste (pea-sized), diagonal screw tightening.
4. Install RAM — match color-coded slots for dual-channel (usually slots 2 & 4).
5. Install M.2 SSD — into motherboard M.2 slot, no cables needed.
6. Mount motherboard — lower onto standoffs, secure with M3 screws.
7. Install PSU — mount in PSU shroud, route cables before closing.
8. Install GPU — press into PCIe x16 slot until clip clicks, connect PCIe power.
9. Cable management — 24-pin ATX, 8-pin EPS, PCIe, SATA, front-panel headers.
10. Final checks — power on, verify POST, install OS.
`.trim();

// ──────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE: SAFETY
// ──────────────────────────────────────────────────────────────

const SAFETY_KNOWLEDGE = `
## PC Build Safety Guidelines
- Always power off and disconnect the PSU before installing or removing components.
- Ground yourself before handling components (use an anti-static wrist strap or touch a grounded metal surface).
- Never force connectors — check orientation first (keyed connectors only fit one way).
- Handle CPUs and RAM by their edges — avoid touching gold contacts.
- Apply thermal paste sparingly — a pea-sized amount at the center is sufficient.
- For model-specific compatibility (TDP, socket revision, BIOS version), consult the manufacturer's documentation.
- Verify PSU wattage is sufficient for your specific GPU and CPU combination.
`.trim();

// ──────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE: TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────

const TROUBLESHOOTING_KNOWLEDGE = `
## Common Troubleshooting Scenarios
- No POST / no display: check RAM seating, CPU power (8-pin EPS), GPU PCIe connection, monitor cable.
- No display only: confirm GPU is in the primary PCIe x16 slot, monitor connected to GPU not motherboard.
- System powers off immediately: check CPU cooler mounting, thermal paste application.
- Random shutdowns: likely overheating or PSU under-specification.
- Slow boot: SSD may not be detected as primary boot device — check BIOS boot order.
- USB not detected: front-panel USB header may be incorrect — consult motherboard manual.
- Storage not detected: confirm M.2 slot supports NVMe (not just SATA), or SATA cable seated.
- GPU not detected: reseat GPU, confirm PCIe power connectors, try different PCIe slot.
`.trim();

// ──────────────────────────────────────────────────────────────
// ACTIONS REFERENCE (for the model)
// ──────────────────────────────────────────────────────────────

const ACTIONS_REFERENCE = `
## Available Actions
You may include an "actions" array in your JSON response with zero or more of these action objects:

Navigate to a page:
{"type":"navigate","route":"/components/gpu/"}
Valid routes: /, /get-ready/, /components/, /build/, /troubleshooting/, and all component routes listed above.

Open a component:
{"type":"openComponent","slug":"gpu"}
Valid slugs: ${Object.keys(COMPONENT_REGISTRY).join(', ')}

Open a build step:
{"type":"openBuildStep","step":3}
Valid steps: 1 through 10.

Troubleshooting:
{"type":"openTroubleshooting","topic":"no-post"}
Valid topics: no-post, no-display, random-shutdowns, overheating, slow-boot, usb-not-detected, storage-not-detected, gpu-not-detected, ram-not-detected.

Focus a 3D feature:
{"type":"focusFeature","component":"cpu","semanticId":"CPU"}

IMPORTANT: Only include actions that are genuinely helpful. Omit actions array if no navigation is needed.
IMPORTANT: Do not use external URLs. Do not execute code. Only use the action types listed above.
`.trim();

// ──────────────────────────────────────────────────────────────
// CONTEXT-AWARE PROMPT SECTION
// ──────────────────────────────────────────────────────────────

function buildContextSection(ctx: AskBuilderContext): string {
  const lines: string[] = ['## Current User Context'];

  lines.push(`- Current page: ${ctx.route}`);
  lines.push(`- Theme: ${ctx.theme}`);

  if (ctx.activeComponent) {
    const comp = COMPONENT_REGISTRY[ctx.activeComponent];
    lines.push(
      `- Active 3D component: ${comp ? comp.displayName : ctx.activeComponent} (slug: ${ctx.activeComponent})`
    );
    if (comp) {
      lines.push(`  Description: ${comp.description}`);
    }
  }

  if (ctx.activeSemanticId) {
    lines.push(`- Highlighted part (semantic ID): ${ctx.activeSemanticId}`);
  }

  if (ctx.buildStep !== null && ctx.buildStep !== undefined) {
    lines.push(`- Guided build step: ${ctx.buildStep} of 10`);
  }

  if (ctx.timelineProgress > 0) {
    lines.push(
      `- Full-PC disassembly timeline: ${Math.round(ctx.timelineProgress * 100)}% complete`
    );
  }

  if (ctx.explodeProgress > 0) {
    lines.push(`- Explode view: ${Math.round(ctx.explodeProgress * 100)}% open`);
  }

  if (ctx.xrayActive) {
    lines.push('- X-Ray view: active');
  }

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────
// PUBLIC: BUILD SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────

export function buildSystemPrompt(ctx: AskBuilderContext): string {
  const componentKnowledge = buildComponentKnowledge();

  return `You are Ask Builder, the AI assistant embedded in PC Customization Manual — an interactive educational website for people building their first PC.

Your role:
- Guide users through PC assembly with accurate, conservative advice
- Explain components, cables, build steps, and troubleshooting
- Use context about what the user is currently viewing to give relevant answers
- Recommend the manufacturer's documentation for model-specific specifications
- Never invent compatibility, voltages, power limits, or unsupported connector claims
- State uncertainty clearly when you are unsure

## Response Format (REQUIRED)
Always respond with valid JSON in exactly this shape:
{
  "message": "Your helpful text response here",
  "actions": []
}
The "message" field is plain text (no markdown, no HTML).
The "actions" array may be empty or contain 1-3 action objects (see Available Actions below).

---

${SITE_KNOWLEDGE}

---

## Component Knowledge
${componentKnowledge}

---

${BUILD_STEPS}

---

${SAFETY_KNOWLEDGE}

---

${TROUBLESHOOTING_KNOWLEDGE}

---

${ACTIONS_REFERENCE}

---

${buildContextSection(ctx)}

---

Keep responses concise (2-4 sentences for simple questions, longer for step-by-step guidance).
Use plain, accessible language. The user may be a first-time builder.
Do not roleplay as a human. Do not discuss topics unrelated to PC building and this website.`;
}
