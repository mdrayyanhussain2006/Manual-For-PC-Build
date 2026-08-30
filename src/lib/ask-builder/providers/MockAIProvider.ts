/**
 * Ask Builder — Mock AI Provider
 * Deterministic responses for development / testing.
 * Never silently pretends to be a real provider.
 * Label "[MOCK]" is always visible in responses.
 */

import type { AIProvider, AIProviderSendOptions } from '../AIProvider.js';
import type { AIResponsePayload } from '../types.js';

// Mock scenarios matched by keywords in the user message
interface MockScenario {
  keywords: string[];
  response: AIResponsePayload;
}

const MOCK_SCENARIOS: MockScenario[] = [
  {
    keywords: ['gpu', 'graphics', 'video card'],
    response: {
      message:
        "[MOCK] The GPU (Graphics Card) is your PC's dedicated rendering engine. It connects to the primary PCIe x16 slot on the motherboard and requires a 12VHPWR or 8-pin power connector from the PSU. Let me open the GPU guide for you.",
      actions: [{ type: 'navigate', route: '/components/gpu/' }],
    },
  },
  {
    keywords: ['cpu', 'processor', 'brain'],
    response: {
      message:
        '[MOCK] The CPU is the central processing unit — the primary computational brain. It seats in the CPU socket on the motherboard and requires a CPU cooler. Always handle it by its edges and align the triangle marker to the socket.',
      actions: [{ type: 'navigate', route: '/components/cpu/' }],
    },
  },
  {
    keywords: ['ram', 'memory', 'dimm'],
    response: {
      message:
        '[MOCK] RAM provides ultra-fast temporary workspace for the CPU. Seat sticks in matching-color slots (usually slots 2 and 4 for dual-channel). Push firmly until both clips snap.',
      actions: [{ type: 'navigate', route: '/components/ram/' }],
    },
  },
  {
    keywords: ['motherboard', 'mobo', 'main board'],
    response: {
      message:
        '[MOCK] The motherboard is the backbone that interconnects every component. Install it outside the case first: CPU → cooler → RAM, then lower it into the case onto standoffs.',
      actions: [{ type: 'navigate', route: '/components/motherboard/' }],
    },
  },
  {
    keywords: ['psu', 'power supply', 'power'],
    response: {
      message:
        '[MOCK] The PSU converts wall AC power to stable DC rails. Connect the 24-pin ATX to the motherboard, the 8-pin EPS to the CPU header, and the PCIe cable to the GPU.',
      actions: [{ type: 'navigate', route: '/components/psu/' }],
    },
  },
  {
    keywords: ['storage', 'm.2', 'ssd', 'nvme'],
    response: {
      message:
        '[MOCK] The NVMe M.2 SSD plugs directly into an M.2 slot on the motherboard — no cables required. Slide it in at ~30°, press flat, and secure with the retention screw.',
      actions: [{ type: 'navigate', route: '/components/storage-m2/' }],
    },
  },
  {
    keywords: ['cable', 'wire', 'connector'],
    response: {
      message:
        '[MOCK] Key cable connections: 24-pin ATX to motherboard, 8-pin EPS to CPU, 12VHPWR or 8-pin PCIe to GPU. Never force a connector — check orientation first.',
      actions: [{ type: 'navigate', route: '/components/cables/' }],
    },
  },
  {
    keywords: ['cooler', 'cooling', 'heatsink', 'fan'],
    response: {
      message:
        '[MOCK] CPU coolers mount over the CPU with thermal paste in between. Apply a pea-sized amount of paste, seat the cooler, and tighten screws in a diagonal cross pattern to distribute pressure evenly.',
      actions: [{ type: 'navigate', route: '/components/cpu-cooler-air/' }],
    },
  },
  {
    keywords: ["doesn't boot", "won't boot", 'no post', 'post', 'troubleshoot', "doesn't work", 'problem'],
    response: {
      message:
        '[MOCK] No POST is usually one of: RAM not fully seated, CPU power connector missing, or GPU not clicked into the PCIe slot. Let me open the troubleshooting guide.',
      actions: [{ type: 'openTroubleshooting', topic: 'no-post' }],
    },
  },
  {
    keywords: ['first', 'start', 'begin', 'install next', 'what next', 'next step'],
    response: {
      message:
        '[MOCK] Start with the PC case — get familiar with the layout. Then prep the motherboard outside the case: CPU → cooler → RAM → M.2 SSD. Lower the board into the case last.',
      actions: [{ type: 'openBuildStep', step: 1 }],
    },
  },
  {
    keywords: ['build', 'guide', 'steps', 'order'],
    response: {
      message:
        '[MOCK] The guided build walks you through 10 sequential steps from opening the case to final power-on checks. The order matters — installing components in the right sequence prevents you from blocking access later.',
      actions: [{ type: 'navigate', route: '/build/' }],
    },
  },
];

const DEFAULT_RESPONSE: AIResponsePayload = {
  message:
    "[MOCK] I'm Ask Builder — your AI guide for PC assembly. You can ask me about any component, cable, build step, or troubleshooting scenario. What would you like to know?",
  actions: [],
};

export class MockAIProvider implements AIProvider {
  readonly name = 'MockAIProvider';

  async sendMessage(options: AIProviderSendOptions): Promise<AIResponsePayload> {
    // Simulate network latency
    await delay(600 + Math.random() * 400);

    const lower = options.userMessage.toLowerCase();

    // Match scenario
    for (const scenario of MOCK_SCENARIOS) {
      if (scenario.keywords.some((kw) => lower.includes(kw))) {
        return scenario.response;
      }
    }

    return DEFAULT_RESPONSE;
  }

  async getHealth(): Promise<{ ok: boolean; latencyMs?: number; message?: string }> {
    await delay(50);
    return { ok: true, latencyMs: 50, message: 'Mock provider healthy — no real API key needed' };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
