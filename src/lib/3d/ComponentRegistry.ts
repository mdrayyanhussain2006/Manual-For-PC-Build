/**
 * ComponentRegistry.ts
 * Authoritative registry defining all 12 solo PC components and their mapping to the Full-PC experience.
 */

export type FullPcUsage = 'mapped' | 'contextual' | 'libraryOnly';

export interface ComponentMetadata {
  slug: string;
  displayName: string;
  category: string;
  modelAsset: {
    lod0: string;
    lod1: string;
  };
  manifestUrl: string;
  partsCopyUrl: string;
  route: string;
  fullPcUsage: FullPcUsage;
  fullPcSemanticIds?: string[];
  defaultFocusState: 'hero';
  supportedFeatures: {
    explode: boolean;
    xray: boolean;
    annotations: boolean;
  };
  description: string;
  specs?: Array<{ label: string; value: string }>;
}

export const COMPONENT_REGISTRY: Record<string, ComponentMetadata> = {
  'ram': {
    slug: 'ram',
    displayName: 'Memory (RAM)',
    category: 'Memory',
    modelAsset: {
      lod0: '/models/ram/ram.lod0.glb',
      lod1: '/models/ram/ram.lod1.glb',
    },
    manifestUrl: '/component-data/ram/manifest.json',
    partsCopyUrl: '/component-data/ram/parts.en.json',
    route: '/components/ram/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['RAM_01', 'RAM_02', 'RAM_03', 'RAM_04'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'High-speed DDR5 memory modules providing ultra-fast transient workspace for the CPU and operating system.',
    specs: [
      { label: 'Type', value: 'DDR5 DIMM' },
      { label: 'Speed', value: '6000 MT/s' },
      { label: 'Capacity', value: '32GB (2 × 16GB)' },
      { label: 'Voltage', value: '1.35V' },
    ],
  },
  'storage-m2': {
    slug: 'storage-m2',
    displayName: 'NVMe M.2 SSD',
    category: 'Storage',
    modelAsset: {
      lod0: '/models/storage-m2/storage-m2.lod0.glb',
      lod1: '/models/storage-m2/storage-m2.lod1.glb',
    },
    manifestUrl: '/component-data/storage-m2/manifest.json',
    partsCopyUrl: '/component-data/storage-m2/parts.en.json',
    route: '/components/storage-m2/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['M2_SSD'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Direct-to-PCIe M.2 solid-state storage offering multi-gigabyte per second sequential read and write speeds.',
    specs: [
      { label: 'Form factor', value: 'M.2 2280' },
      { label: 'Interface', value: 'PCIe 4.0 ×4 NVMe' },
      { label: 'Capacity', value: '2TB' },
      { label: 'Read Speed', value: 'Up to 7,400 MB/s' },
    ],
  },
  'case-fan': {
    slug: 'case-fan',
    displayName: 'Chassis Fan',
    category: 'Cooling',
    modelAsset: {
      lod0: '/models/case-fan/case-fan.lod0.glb',
      lod1: '/models/case-fan/case-fan.lod1.glb',
    },
    manifestUrl: '/component-data/case-fan/manifest.json',
    partsCopyUrl: '/component-data/case-fan/parts.en.json',
    route: '/components/case-fan/',
    fullPcUsage: 'contextual',
    fullPcSemanticIds: ['CASE_FAN_01', 'CASE_FAN_02', 'CASE_FAN_03'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: '120mm PWM hydrodynamic chassis cooling fan creating positive air pressure and expelling hot exhaust.',
    specs: [
      { label: 'Dimensions', value: '120 × 120 × 25 mm' },
      { label: 'Speed', value: '500 – 1,800 RPM' },
      { label: 'Airflow', value: '62.8 CFM' },
      { label: 'Connector', value: '4-Pin PWM' },
    ],
  },
  'cpu': {
    slug: 'cpu',
    displayName: 'Central Processing Unit (CPU)',
    category: 'Processor',
    modelAsset: {
      lod0: '/models/cpu/cpu.lod0.glb',
      lod1: '/models/cpu/cpu.lod1.glb',
    },
    manifestUrl: '/component-data/cpu/manifest.json',
    partsCopyUrl: '/component-data/cpu/parts.en.json',
    route: '/components/cpu/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['CPU'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'The primary computational brain of the system, executing all core instructions and logic.',
    specs: [
      { label: 'Cores / Threads', value: '16 Cores / 24 Threads' },
      { label: 'Socket', value: 'LGA1700 / AM5' },
      { label: 'Base Clock', value: '3.4 GHz' },
      { label: 'TDP', value: '125W' },
    ],
  },
  'storage-hdd': {
    slug: 'storage-hdd',
    displayName: 'Hard Disk Drive (HDD)',
    category: 'Storage',
    modelAsset: {
      lod0: '/models/storage-hdd/storage-hdd.lod0.glb',
      lod1: '/models/storage-hdd/storage-hdd.lod1.glb',
    },
    manifestUrl: '/component-data/storage-hdd/manifest.json',
    partsCopyUrl: '/component-data/storage-hdd/parts.en.json',
    route: '/components/storage-hdd/',
    fullPcUsage: 'libraryOnly',
    fullPcSemanticIds: ['STORAGE'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'High-capacity 3.5" magnetic mechanical drive ideal for bulk storage, archiving, and media libraries.',
    specs: [
      { label: 'Form factor', value: '3.5-inch' },
      { label: 'Interface', value: 'SATA 6Gb/s' },
      { label: 'Rotational Speed', value: '7,200 RPM' },
      { label: 'Capacity', value: '4TB – 8TB' },
    ],
  },
  'psu': {
    slug: 'psu',
    displayName: 'Power Supply Unit (PSU)',
    category: 'Power',
    modelAsset: {
      lod0: '/models/psu/psu.lod0.glb',
      lod1: '/models/psu/psu.lod1.glb',
    },
    manifestUrl: '/component-data/psu/manifest.json',
    partsCopyUrl: '/component-data/psu/parts.en.json',
    route: '/components/psu/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['PSU'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Fully modular power conversion unit stepping down high-voltage AC wall power into stable DC rails.',
    specs: [
      { label: 'Wattage', value: '850W' },
      { label: 'Efficiency', value: '80 PLUS Gold' },
      { label: 'Modularity', value: 'Fully Modular' },
      { label: 'Form Factor', value: 'ATX' },
    ],
  },
  'cpu-cooler-air': {
    slug: 'cpu-cooler-air',
    displayName: 'CPU Cooler (Air)',
    category: 'Cooling',
    modelAsset: {
      lod0: '/models/cpu-cooler-air/cpu-cooler-air.lod0.glb',
      lod1: '/models/cpu-cooler-air/cpu-cooler-air.lod1.glb',
    },
    manifestUrl: '/component-data/cpu-cooler-air/manifest.json',
    partsCopyUrl: '/component-data/cpu-cooler-air/parts.en.json',
    route: '/components/cpu-cooler-air/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['CPU_COOLER'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Dual-tower direct-contact copper heat pipe air cooler dissipating thermal load away from the CPU IHS.',
    specs: [
      { label: 'Type', value: 'Dual-Tower Air' },
      { label: 'Heatpipes', value: '6 × 6mm Copper' },
      { label: 'Fan Size', value: '120mm PWM' },
      { label: 'TDP Support', value: 'Up to 250W' },
    ],
  },
  'cpu-cooler-liquid': {
    slug: 'cpu-cooler-liquid',
    displayName: 'CPU Cooler (Liquid AIO)',
    category: 'Cooling',
    modelAsset: {
      lod0: '/models/cpu-cooler-liquid/cpu-cooler-liquid.lod0.glb',
      lod1: '/models/cpu-cooler-liquid/cpu-cooler-liquid.lod1.glb',
    },
    manifestUrl: '/component-data/cpu-cooler-liquid/manifest.json',
    partsCopyUrl: '/component-data/cpu-cooler-liquid/parts.en.json',
    route: '/components/cpu-cooler-liquid/',
    fullPcUsage: 'libraryOnly',
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Closed-loop 240mm/360mm liquid cooler with integrated cold plate pump and radiator heat dissipation.',
    specs: [
      { label: 'Radiator', value: '240mm / 360mm Aluminum' },
      { label: 'Pump Speed', value: '2,800 RPM' },
      { label: 'Tubing', value: 'Braided Low-Permeation Rubber' },
      { label: 'TDP Support', value: 'Up to 300W' },
    ],
  },
  'gpu': {
    slug: 'gpu',
    displayName: 'Graphics Card (GPU)',
    category: 'Graphics',
    modelAsset: {
      lod0: '/models/gpu/gpu.lod0.glb',
      lod1: '/models/gpu/gpu.lod1.glb',
    },
    manifestUrl: '/component-data/gpu/manifest.json',
    partsCopyUrl: '/component-data/gpu/parts.en.json',
    route: '/components/gpu/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['GPU'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Dedicated PCIe graphics processing unit driving 3D rendering, video encoding, and display outputs.',
    specs: [
      { label: 'Interface', value: 'PCIe 4.0 / 5.0 x16' },
      { label: 'VRAM', value: '16GB GDDR6X' },
      { label: 'Power Connector', value: '16-Pin 12VHPWR' },
      { label: 'Display Outputs', value: '3× DisplayPort, 1× HDMI' },
    ],
  },
  'cables': {
    slug: 'cables',
    displayName: 'Power & Data Cables',
    category: 'Wiring',
    modelAsset: {
      lod0: '/models/cables/cables.lod0.glb',
      lod1: '/models/cables/cables.lod1.glb',
    },
    manifestUrl: '/component-data/cables/manifest.json',
    partsCopyUrl: '/component-data/cables/parts.en.json',
    route: '/components/cables/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['CABLE_24PIN', 'CABLE_CPU_POWER', 'CABLE_GPU_POWER'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Internal harness routing high-current DC power from the PSU to the Motherboard, CPU, and Graphics Card.',
    specs: [
      { label: 'Main ATX', value: '24-Pin' },
      { label: 'EPS / CPU', value: '8-Pin (4+4)' },
      { label: 'PCIe / GPU', value: '12VHPWR / 8-Pin' },
      { label: 'Gauge', value: '16 AWG / 18 AWG' },
    ],
  },
  'pc-case': {
    slug: 'pc-case',
    displayName: 'PC Chassis (Case)',
    category: 'Enclosure',
    modelAsset: {
      lod0: '/models/pc-case/pc-case.lod0.glb',
      lod1: '/models/pc-case/pc-case.lod1.glb',
    },
    manifestUrl: '/component-data/pc-case/manifest.json',
    partsCopyUrl: '/component-data/pc-case/parts.en.json',
    route: '/components/pc-case/',
    fullPcUsage: 'contextual',
    fullPcSemanticIds: ['CASE', 'CASE_SIDE_PANEL'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'Mid-tower steel and tempered glass enclosure providing mounting points, acoustic shielding, and airflow paths.',
    specs: [
      { label: 'Form Factor', value: 'Mid-Tower ATX' },
      { label: 'Motherboard Support', value: 'Mini-ITX, Micro-ATX, ATX' },
      { label: 'GPU Clearance', value: 'Up to 380 mm' },
      { label: 'Side Panel', value: 'Tempered Glass' },
    ],
  },
  'motherboard': {
    slug: 'motherboard',
    displayName: 'Motherboard',
    category: 'Motherboard',
    modelAsset: {
      lod0: '/models/motherboard/motherboard.lod0.glb',
      lod1: '/models/motherboard/motherboard.lod1.glb',
    },
    manifestUrl: '/component-data/motherboard/manifest.json',
    partsCopyUrl: '/component-data/motherboard/parts.en.json',
    route: '/components/motherboard/',
    fullPcUsage: 'mapped',
    fullPcSemanticIds: ['MOTHERBOARD'],
    defaultFocusState: 'hero',
    supportedFeatures: {
      explode: true,
      xray: true,
      annotations: true,
    },
    description: 'The backbone printed circuit board interconnecting CPU, memory, expansion buses, power, and I/O channels.',
    specs: [
      { label: 'Form factor', value: 'ATX' },
      { label: 'Socket', value: 'LGA1700 / AM5' },
      { label: 'Memory slots', value: '4 × DDR5' },
      { label: 'Expansion slots', value: '1× PCIe 5.0 x16' },
    ],
  },
};

/**
 * Route aliases mapping legacy/alternate paths to canonical slugs
 */
export const ROUTE_ALIASES: Record<string, string> = {
  'case': 'pc-case',
  'cpu-cooler': 'cpu-cooler-air',
  'storage': 'storage-m2',
};

/**
 * Lookup component metadata by canonical slug or alias
 */
export function getComponentBySlug(slugOrAlias: string): ComponentMetadata | null {
  const canonical = ROUTE_ALIASES[slugOrAlias] || slugOrAlias;
  return COMPONENT_REGISTRY[canonical] ?? null;
}

/**
 * Lookup component by full-PC semantic ID (e.g. 'GPU' -> 'gpu', 'RAM_01' -> 'ram')
 */
export function getComponentBySemanticId(semanticId: string): ComponentMetadata | null {
  for (const component of Object.values(COMPONENT_REGISTRY)) {
    if (component.fullPcSemanticIds?.includes(semanticId)) {
      return component;
    }
  }
  return null;
}

/**
 * Get all 12 canonical components in sequential library order
 */
export function getAllComponents(): ComponentMetadata[] {
  return [
    COMPONENT_REGISTRY['pc-case'],
    COMPONENT_REGISTRY['motherboard'],
    COMPONENT_REGISTRY['cpu'],
    COMPONENT_REGISTRY['cpu-cooler-air'],
    COMPONENT_REGISTRY['cpu-cooler-liquid'],
    COMPONENT_REGISTRY['ram'],
    COMPONENT_REGISTRY['storage-m2'],
    COMPONENT_REGISTRY['storage-hdd'],
    COMPONENT_REGISTRY['psu'],
    COMPONENT_REGISTRY['gpu'],
    COMPONENT_REGISTRY['case-fan'],
    COMPONENT_REGISTRY['cables'],
  ];
}
