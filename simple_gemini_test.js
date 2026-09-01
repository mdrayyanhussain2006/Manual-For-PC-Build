// Simple Gemini API Test
const fs = require('fs');

// Read API key from .env
const envContent = fs.readFileSync('.env', 'utf-8');
const apiKeyMatch = envContent.match(/AI_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

console.log('Testing Gemini 3.7 Flash API...');
console.log('API Key:', apiKey.substring(0, 10) + '...');

// Simple fetch test
const https = require('https');
const testData = JSON.stringify({
  contents: [{
    role: 'user', 
    parts: [{ text: 'Say "test successful" in JSON format: {"message":"test successful"}' }]
  }],
  generationConfig: { maxOutputTokens: 32, responseMimeType: 'application/json' }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.error) {
        console.log('❌ API Error:', response.error.message);
        console.log('❌ Gemini 3.7 Flash may not be available or API key invalid');
      } else {
        console.log('✅ Success! Gemini 3.7 Flash is working');
        console.log('✅ Provider Mode: REAL GEMINI (no longer Mock)');
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) console.log('Response:', text);
      }
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Raw response:', data.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection Error:', error.message);
});

req.write(testData);
req.end();