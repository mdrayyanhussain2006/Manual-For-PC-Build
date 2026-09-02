/**
 * Ask Builder — Knowledge Layer & System Prompt Builder
 * Builds a structured, context-aware system prompt from:
 *  1. Static site knowledge (components, routes, build steps)
 *  2. Runtime context snapshot (current page, active component, etc.)
 *  3. Semantic part knowledge (126 parts across 12 components)
 *
 * This file runs server-side only.
 * It does NOT invent facts — it uses data from ComponentRegistry and the semantic parts registry.
 * The prompt stays focused on the active component and relevant facts rather than dumping the full dataset.
 */

import { COMPONENT_REGISTRY, getAllComponents } from '../3d/ComponentRegistry.js';
import { getComponentPartMap, getPartIdsForComponent } from './semanticPartsRegistry.js';
import type { AskBuilderContext } from './types.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENT_DATA_DIR = join(__dirname, '../../../public/component-data');

// Cache for semantic parts knowledge
let semanticPartsCache: Map<string, Record<string, any>> | null = null;

async function loadSemanticPartsKnowledge(): Promise<Map<string, Record<string, any>>> {
  if (semanticPartsCache) return semanticPartsCache;

  const partsMap = new Map<string, Record<string, any>>();

  for (const [slug, comp] of Object.entries(COMPONENT_REGISTRY)) {
    const partsPath = join(COMPONENT_DATA_DIR, slug, 'parts.en.json');
    try {
      const content = await readFile(partsPath, 'utf-8');
      const parts = JSON.parse(content);
      partsMap.set(slug, parts);
    } catch {
      // Component may not have parts data
      partsMap.set(slug, {});
    }
  }

  semanticPartsCache = partsMap;
  return partsMap;
}

function buildSemanticPartsKnowledge(): string {
  // This is called synchronously, so we return a static summary
  // The full data is available via loadSemanticPartsKnowledge() for async use
  const lines: string[] = ['## Semantic Parts Knowledge (126 parts across 12 components)'];

  for (const [slug, comp] of Object.entries(COMPONENT_REGISTRY)) {
    const fullPcIds = comp.fullPcSemanticIds ?? [];
    if (fullPcIds.length > 0) {
      lines.push(`\n### ${comp.displayName} (${slug})`);
      lines.push(`Full-PC Semantic IDs: ${fullPcIds.join(', ')}`);
      lines.push(`Route: ${comp.route}`);
    }
  }

  lines.push('\n---');
  lines.push('NOTE: Detailed per-part information (title, description, function, importance, facts)');
  lines.push('is available for the active component via context. When a user asks about a');
  lines.push('specific part on a component page, use the activeSemanticId from context to');
  lines.push('provide precise information about that part.');

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE: SITE NAVIGATION
// ──────────────────────────────────────────────────────────────

const SITE_KNOWLEDGE = `
# Site: BuildForge Lab
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
Valid topics: no-power, no-post, ram-not-detected, gpu-not-detected, storage-not-detected, random-shutdowns, overheating.
Omit topic to link to the general troubleshooting page.

Focus a 3D feature:
{"type":"focusFeature","component":"cpu","semanticId":"heat_spreader"}
The semanticId MUST be an exact part id listed in the Component Parts Reference below.
Never use full-PC semantic ids like "GPU" or "CPU" — use the lowercase underscore part ids instead.

IMPORTANT: Only include actions that are genuinely helpful. Omit actions array if no navigation is needed.
IMPORTANT: Do not use external URLs. Do not execute code. Only use the action types listed above.
`.trim();

// ──────────────────────────────────────────────────────────────
// CONTEXT-AWARE PROMPT SECTION
// ──────────────────────────────────────────────────────────────

async function loadActiveComponentParts(ctx: AskBuilderContext): Promise<string> {
  if (!ctx.activeComponent) return '';

  const partsMap = await loadSemanticPartsKnowledge();
  const parts = partsMap.get(ctx.activeComponent);
  if (!parts || Object.keys(parts).length === 0) return '';

  const lines: string[] = [`\n### Active Component Parts Detail (${ctx.activeComponent})`];

  // If there's a specific semantic ID highlighted, prioritize it
  if (ctx.activeSemanticId && parts[ctx.activeSemanticId]) {
    const part = parts[ctx.activeSemanticId];
    lines.push(`\n#### Highlighted Part: ${part.title} (${ctx.activeSemanticId})`);
    if (part.description) lines.push(`Description: ${part.description}`);
    if (part.function) lines.push(`Function: ${part.function}`);
    if (part.importance) lines.push(`Importance: ${part.importance}`);
    if (part.facts && part.facts.length > 0) {
      lines.push('Facts:');
      for (const fact of part.facts) {
        lines.push(`  - ${fact}`);
      }
    }
    lines.push('\n---');
    lines.push('Other parts in this component:');
  }

  for (const [id, part] of Object.entries(parts)) {
    if (id === ctx.activeSemanticId) continue;
    lines.push(`\n#### ${part.title} (${id})`);
    if (part.description) lines.push(`Description: ${part.description}`);
    if (part.function) lines.push(`Function: ${part.function}`);
    if (part.importance) lines.push(`Importance: ${part.importance}`);
    if (part.facts && part.facts.length > 0) {
      lines.push('Key facts:');
      for (const fact of part.facts.slice(0, 3)) {
        lines.push(`  - ${fact}`);
      }
    }
  }

  return lines.join('\n');
}

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
    // Provide the exact part ids for ONLY the active component (targeted context)
    const partIds = getPartIdsForComponent(ctx.activeComponent);
    if (partIds.length > 0) {
      lines.push(`  Available part ids for focusFeature: ${partIds.join(', ')}`);
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
// CONTEXT-AWARE COMPONENT PARTS REFERENCE
// Provides the AI with semantic part IDs only for relevant components
// to reduce prompt size and improve focus.
// ──────────────────────────────────────────────────────────────

function buildRelevantPartsReference(ctx: AskBuilderContext): string {
  const lines: string[] = ['## Component Parts Reference (for focusFeature actions)'];
  
  // Only include parts for the active component to keep prompt focused
  if (ctx.activeComponent) {
    const partIds = getPartIdsForComponent(ctx.activeComponent);
    if (partIds.length > 0) {
      lines.push(`${ctx.activeComponent}: ${partIds.join(', ')}`);
    }
  }
  
  // If no active component, provide a minimal reference for common components
  if (!ctx.activeComponent && lines.length === 1) {
    lines.push('(Focus a component to see available part IDs)');
  }
  
  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────
// PUBLIC: BUILD SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────

export async function buildSystemPrompt(ctx: AskBuilderContext): Promise<string> {
  const componentKnowledge = buildComponentKnowledge();
  const semanticPartsKnowledge = buildSemanticPartsKnowledge();
  const activePartsDetail = await loadActiveComponentParts(ctx);
  const componentPartsRef = buildRelevantPartsReference(ctx);

  return `You are Ask Builder, the AI assistant embedded in BuildForge Lab — an interactive educational website for people building their first PC.

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

${semanticPartsKnowledge}
${activePartsDetail}

---

${componentPartsRef}

---

${BUILD_STEPS}

---

${SAFETY_KNOWLEDGE}

---

${TROUBLESHOOTING_KNOWLEDGE}

---

${componentPartsRef}

---

${ACTIONS_REFERENCE}

---

${buildContextSection(ctx)}

---

Keep responses concise (2-4 sentences for simple questions, longer for step-by-step guidance).
Use plain, accessible language. The user may be a first-time builder.
Do not roleplay as a human. Do not discuss topics unrelated to PC building and this website.`;
}
