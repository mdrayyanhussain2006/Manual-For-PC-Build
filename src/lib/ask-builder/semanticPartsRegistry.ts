/**
 * Ask Builder — Semantic Parts Registry (server-side)
 *
 * Builds a compact, component-scoped lookup of every semantic part ID
 * across all 12 components. Used by the action validator to enforce that
 * focusFeature(component, semanticId) is component-specific — e.g.
 * "gpu" + "graphics_processor" is valid, but "gpu" + "compute_die" is not.
 *
 * This file runs server-side ONLY.
 * Part IDs are read from /public/component-data/{slug}/manifest.json
 * at module load time so there is zero runtime I/O per request.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Maps componentSlug → Set of valid part IDs (manifest id field) */
export type ComponentPartMap = Map<string, Set<string>>;

function loadManifestPartIds(slug: string): string[] {
  try {
    const manifestPath = path.resolve(
      process.cwd(),
      'public',
      'component-data',
      slug,
      'manifest.json'
    );
    if (!fs.existsSync(manifestPath)) return [];
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as { parts?: Array<{ id?: string }> };
    return (manifest.parts ?? [])
      .map((p) => p.id)
      .filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function buildComponentPartMap(): ComponentPartMap {
  const map: ComponentPartMap = new Map();

  const slugs = [
    'cpu',
    'gpu',
    'ram',
    'motherboard',
    'psu',
    'cpu-cooler-air',
    'cpu-cooler-liquid',
    'storage-m2',
    'storage-hdd',
    'pc-case',
    'case-fan',
    'cables',
  ];

  for (const slug of slugs) {
    const ids = loadManifestPartIds(slug);
    if (ids.length > 0) {
      map.set(slug, new Set(ids));
    }
  }

  return map;
}

let _registry: ComponentPartMap | null = null;

export function getComponentPartMap(): ComponentPartMap {
  if (!_registry) {
    _registry = buildComponentPartMap();
  }
  return _registry;
}

/**
 * Returns true only if the component slug is known AND the part ID belongs to it.
 * Cross-component semantic IDs are explicitly rejected.
 */
export function isValidComponentPart(slug: string, semanticId: string): boolean {
  const map = getComponentPartMap();
  const parts = map.get(slug);
  if (!parts) return false;
  return parts.has(semanticId);
}

/**
 * Get all valid part IDs for a component, or an empty array if unknown.
 */
export function getPartIdsForComponent(slug: string): string[] {
  const map = getComponentPartMap();
  const parts = map.get(slug);
  return parts ? Array.from(parts) : [];
}
