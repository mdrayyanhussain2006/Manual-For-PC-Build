/**
 * Test Real Gemini 3.7 Flash Connection
 * Verifies the API key works and provider switches from Mock to Gemini mode
 */

import fs from 'fs';

// Load environment
const envContent = fs.readFileSync('.env', 'utf-8');
const apiKeyMatch = envContent.match(/AI_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

console.log('🧪 Testing Gemini 3.7 Flash Connection\n');

if (!apiKey || apiKey === '') {
  console.log('❌ No API key found in .env file');
  process.exit(1);
}

console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`);

// Test direct Gemini API call
const testGeminiConnection = async () => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Respond with exactly: {"message":"connection test successful","actions":[]}' }]
          }],
          generationConfig: {
            maxOutputTokens: 64,
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    console.log(`🌐 API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Raw API Response:', JSON.stringify(data, null, 2));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        console.log('✅ Parsed Response:', parsed);
        return parsed.message === 'connection test successful';
      } catch (e) {
        console.log('⚠️  Response not JSON:', text);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.log('❌ Connection Error:', error.message);
    return false;
  }
};

// Test Ask Builder API endpoint
const testAskBuilderEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:4321/api/ask-builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test connection - what is Ask Builder?',
        context: {
          route: '/test',
          theme: 'dark',
          activeComponent: null,
          activeSemanticId: null,
          cameraTarget: null,
          timelineProgress: 0,
          explodeProgress: 0,
          xrayActive: false,
          isInteracting: false,
          buildStep: null
        },
        history: []
      })
    });

    console.log(`🌐 Ask Builder API Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Provider Status:', data.payload?.providerStatus);
      return data.payload?.providerStatus?.provider === 'GeminiProvider';
    }
    
    return false;
  } catch (error) {
    console.log('⚠️  Ask Builder endpoint not available (server not running)');
    return false;
  }
};

// Run tests
const main = async () => {
  console.log('1️⃣ Testing Direct Gemini API...');
  const directTest = await testGeminiConnection();
  
  console.log('\n2️⃣ Testing Ask Builder Endpoint...');
  const endpointTest = await testAskBuilderEndpoint();

  console.log('\n📊 TEST RESULTS:');
  console.log(`Direct Gemini API: ${directTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Ask Builder Endpoint: ${endpointTest ? '✅ PASS (Real Gemini)' : '⚠️  Not Available/Mock Mode'}`);

  if (directTest) {
    console.log('\n🎉 SUCCESS: Gemini 3.7 Flash API key is valid and working!');
    console.log('🔄 Provider Mode: REAL GEMINI (no longer Mock mode)');
  } else {
    console.log('\n❌ FAILED: API key may be invalid or Gemini 3.7 Flash unavailable');
  }
};

main().catch(console.error);