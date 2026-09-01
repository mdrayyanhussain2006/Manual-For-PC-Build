import { GeminiProvider } from './src/lib/ask-builder/providers/GeminiProvider.js';
import { buildSystemPrompt } from './src/lib/ask-builder/knowledge.js';
// NOTE: Reads AI_API_KEY from .env — do not hardcode credentials here.
// Set AI_API_KEY in your .env file and it will be picked up automatically.

async function test() {
  const provider = new GeminiProvider();
  const context = {
    route: '/components/gpu/',
    theme: 'dark',
    activeComponent: 'gpu',
    activeSemanticId: 'GPU',
    cameraTarget: null,
    timelineProgress: 0,
    explodeProgress: 0,
    xrayActive: false,
    isInteracting: false,
    buildStep: null,
  };

  const systemPrompt = buildSystemPrompt(context);
  console.log('Sending test prompt to Gemini...');
  try {
    const res = await provider.sendMessage({
      systemPrompt,
      userMessage: 'What does the GPU do in a PC build?',
      history: [],
      maxTokens: 2048,
    });
    console.log('SUCCESSFUL GEMINI RESPONSE:\n', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('FAILED WITH ERROR:', err);
  }
}

test();
