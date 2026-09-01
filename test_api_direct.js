// Test API Key Direct
const https = require('https');
const fs = require('fs');

// Get API key
const envContent = fs.readFileSync('.env', 'utf-8');
const apiKey = envContent.match(/AI_API_KEY=(.+)/)?.[1]?.trim();

console.log('Testing API Key:', apiKey?.substring(0, 10) + '...');

const postData = JSON.stringify({
  contents: [{
    role: 'user',
    parts: [{ text: 'Say hello' }]
  }],
  generationConfig: {
    maxOutputTokens: 50
  }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response:', data.substring(0, 500));
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.log('❌ ERROR:', json.error.message);
        if (json.error.code === 400) {
          console.log('💡 This might be an invalid API key or wrong model name');
        }
      } else {
        console.log('✅ SUCCESS: API key works!');
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.log('Request error:', error.message);
});

req.write(postData);
req.end();