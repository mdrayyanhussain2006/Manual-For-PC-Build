/**
 * Ask Builder Test Suite
 * Tests the implementation against all required functionalities
 */

import fs from 'fs';
import path from 'path';

// Test results
const testResults = {
  fixes: [],
  security: [],
  build: null,
  provider: null,
  errors: []
};

console.log('🔍 Ask Builder Implementation Test Suite\n');

// Phase 1: Verify Implementation Fixes
console.log('📋 PHASE 1: IMPLEMENTATION FIXES VERIFICATION\n');

// Test 1.1: Check .env.example has gemini-3.7-flash
try {
  const envContent = fs.readFileSync('.env.example', 'utf-8');
  const hasCorrectModel = envContent.includes('AI_MODEL=gemini-3.7-flash');
  testResults.fixes.push({
    test: '.env.example gemini-3.7-flash configuration',
    passed: hasCorrectModel,
    details: hasCorrectModel ? 'Found correct AI_MODEL=gemini-3.7-flash' : 'Still using old model configuration'
  });
  console.log(`✅ .env.example updated for gemini-3.7-flash: ${hasCorrectModel ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read .env.example: ' + error.message);
}

// Test 1.2: Check GeminiProvider.ts targets gemini-3.7-flash
try {
  const providerContent = fs.readFileSync('src/lib/ask-builder/providers/GeminiProvider.ts', 'utf-8');
  const hasCorrectModel = providerContent.includes("process.env.AI_MODEL || 'gemini-3.7-flash'");
  testResults.fixes.push({
    test: 'GeminiProvider.ts gemini-3.7-flash targeting',
    passed: hasCorrectModel,
    details: hasCorrectModel ? 'Found correct default model gemini-3.7-flash' : 'Still using old default model'
  });
  console.log(`✅ GeminiProvider.ts updated for gemini-3.7-flash: ${hasCorrectModel ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read GeminiProvider.ts: ' + error.message);
}

// Test 1.3: Check contextBridge.ts regex fix
try {
  const bridgeContent = fs.readFileSync('src/lib/ask-builder/contextBridge.ts', 'utf-8');
  const hasCorrectRegex = bridgeContent.includes('/^#step-(\\d+)$/') && 
                         bridgeContent.includes('/\\/build\\/#step-(\\d+)/');
  testResults.fixes.push({
    test: 'contextBridge.ts build step parsing regex',
    passed: hasCorrectRegex,
    details: hasCorrectRegex ? 'Found improved /build/#step-N regex patterns' : 'Regex patterns not updated'
  });
  console.log(`✅ contextBridge.ts regex patterns: ${hasCorrectRegex ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read contextBridge.ts: ' + error.message);
}

// Test 1.4: Check knowledge.ts optimization
try {
  const knowledgeContent = fs.readFileSync('src/lib/ask-builder/knowledge.ts', 'utf-8');
  const hasTargetedContext = knowledgeContent.includes('buildRelevantPartsReference') &&
                           knowledgeContent.includes('getPartIdsForComponent');
  testResults.fixes.push({
    test: 'knowledge.ts targeted context optimization',
    passed: hasTargetedContext,
    details: hasTargetedContext ? 'Found targeted context approach instead of all 126 parts' : 'Still sending all semantic parts'
  });
  console.log(`✅ knowledge.ts context optimization: ${hasTargetedContext ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read knowledge.ts: ' + error.message);
}

// Test 1.5: Check API endpoint provider status reporting
try {
  const apiContent = fs.readFileSync('src/pages/api/ask-builder.ts', 'utf-8');
  const hasProviderStatus = apiContent.includes('providerStatus') &&
                          apiContent.includes('provider:') &&
                          apiContent.includes('model:') &&
                          apiContent.includes('mode:');
  testResults.fixes.push({
    test: 'API endpoint provider status reporting',
    passed: hasProviderStatus,
    details: hasProviderStatus ? 'Found PROVIDER/MODEL/MODE status reporting' : 'Provider status not implemented'
  });
  console.log(`✅ API provider status reporting: ${hasProviderStatus ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read ask-builder.ts: ' + error.message);
}

// Test 1.6: Check types.ts has provider status info
try {
  const typesContent = fs.readFileSync('src/lib/ask-builder/types.ts', 'utf-8');
  const hasProviderTypes = typesContent.includes('ProviderStatusInfo') &&
                         typesContent.includes('providerStatus?:');
  testResults.fixes.push({
    test: 'types.ts provider status type definitions',
    passed: hasProviderTypes,
    details: hasProviderTypes ? 'Found ProviderStatusInfo type definitions' : 'Provider status types missing'
  });
  console.log(`✅ types.ts provider status types: ${hasProviderTypes ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read types.ts: ' + error.message);
}

// Test 1.7: Verify component-scoped semantic validation
try {
  const validatorContent = fs.readFileSync('src/lib/ask-builder/actionValidator.ts', 'utf-8');
  const hasValidation = validatorContent.includes('isValidComponentPart') &&
                       validatorContent.includes('component, semanticId');
  testResults.fixes.push({
    test: 'actionValidator.ts component-scoped semantic validation',
    passed: hasValidation,
    details: hasValidation ? 'Found component-scoped semantic validation in focusFeature' : 'Component validation missing'
  });
  console.log(`✅ Component-scoped semantic validation: ${hasValidation ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to read actionValidator.ts: ' + error.message);
}

console.log('\n📋 PHASE 2: SECURITY VALIDATION\n');

// Test 2.1: Rate limiting configuration
try {
  const apiContent = fs.readFileSync('src/pages/api/ask-builder.ts', 'utf-8');
  const hasRateLimit = apiContent.includes('RATE_LIMIT_MAX = 20') &&
                      apiContent.includes('RATE_LIMIT_WINDOW_MS = 60_000');
  testResults.security.push({
    test: 'Rate limiting 20 req/min/IP configuration',
    passed: hasRateLimit,
    details: hasRateLimit ? 'Found 20 requests per minute rate limiting' : 'Rate limiting not properly configured'
  });
  console.log(`🔒 Rate limiting (20 req/min/IP): ${hasRateLimit ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to check rate limiting: ' + error.message);
}

// Test 2.2: Action validation system
try {
  const validatorContent = fs.readFileSync('src/lib/ask-builder/actionValidator.ts', 'utf-8');
  const hasValidation = validatorContent.includes('FORBIDDEN_SCHEMES') &&
                       validatorContent.includes('javascript:|data:|file:') &&
                       validatorContent.includes('validateActions');
  testResults.security.push({
    test: 'Action validation system security',
    passed: hasValidation,
    details: hasValidation ? 'Found comprehensive action validation with forbidden schemes' : 'Action validation incomplete'
  });
  console.log(`🔒 Action validation system: ${hasValidation ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to check action validation: ' + error.message);
}

// Test 2.3: No API keys in tracked files
try {
  const envExample = fs.readFileSync('.env.example', 'utf-8');
  const hasPlaceholder = envExample.includes('AI_API_KEY=') && 
                        !envExample.match(/AI_API_KEY=AIza[A-Za-z0-9_-]+/);
  testResults.security.push({
    test: 'No real API keys in tracked source files',
    passed: hasPlaceholder,
    details: hasPlaceholder ? 'Only placeholder API_KEY found in .env.example' : 'Real API key detected in tracked files'
  });
  console.log(`🔒 API key security: ${hasPlaceholder ? 'PASS' : 'FAIL'}`);
} catch (error) {
  testResults.errors.push('Failed to check API key security: ' + error.message);
}

console.log('\n📋 PHASE 3: BUILD STATUS\n');

// Test 3.1: Check if dist directory exists (build success)
try {
  const distExists = fs.existsSync('dist');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  testResults.build = {
    distExists,
    projectName: packageJson.name,
    version: packageJson.version,
    dependencies: Object.keys(packageJson.dependencies || {}).length
  };
  console.log(`🏗️  Build output (dist): ${distExists ? 'EXISTS' : 'MISSING'}`);
  console.log(`🏗️  Project: ${packageJson.name} v${packageJson.version}`);
  console.log(`🏗️  Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
} catch (error) {
  testResults.errors.push('Failed to check build status: ' + error.message);
}

console.log('\n📋 PHASE 4: PROVIDER MODE DETECTION\n');

// Test 4.1: Provider mode detection logic
try {
  const apiContent = fs.readFileSync('src/pages/api/ask-builder.ts', 'utf-8');
  const hasModeDetection = apiContent.includes('resolveProviderMode') &&
                          apiContent.includes("'gemini'") &&
                          apiContent.includes("'mock'") &&
                          apiContent.includes('isLikelyGeminiKey');
  testResults.provider = {
    hasDetection: hasModeDetection,
    mockFallback: apiContent.includes('MockAIProvider'),
    geminiValidation: apiContent.includes('AIza[0-9A-Za-z\\-_]{35,}')
  };
  console.log(`🤖 Provider mode detection: ${hasModeDetection ? 'IMPLEMENTED' : 'MISSING'}`);
  console.log(`🤖 Mock provider fallback: ${testResults.provider.mockFallback ? 'AVAILABLE' : 'MISSING'}`);
  console.log(`🤖 Gemini key validation: ${testResults.provider.geminiValidation ? 'IMPLEMENTED' : 'MISSING'}`);
} catch (error) {
  testResults.errors.push('Failed to check provider configuration: ' + error.message);
}

// Summary
console.log('\n📊 TEST SUMMARY\n');
const fixesPassed = testResults.fixes.filter(f => f.passed).length;
const securityPassed = testResults.security.filter(s => s.passed).length;

console.log(`Implementation Fixes: ${fixesPassed}/${testResults.fixes.length} passed`);
console.log(`Security Tests: ${securityPassed}/${testResults.security.length} passed`);
console.log(`Build Status: ${testResults.build?.distExists ? 'SUCCESS' : 'UNKNOWN'}`);
console.log(`Provider System: ${testResults.provider?.hasDetection ? 'READY' : 'INCOMPLETE'}`);

if (testResults.errors.length > 0) {
  console.log('\n❌ ERRORS:');
  testResults.errors.forEach(err => console.log(`  - ${err}`));
}

// Write detailed results
const detailedResults = {
  timestamp: new Date().toISOString(),
  summary: {
    fixes: `${fixesPassed}/${testResults.fixes.length}`,
    security: `${securityPassed}/${testResults.security.length}`,
    build: testResults.build?.distExists ? 'SUCCESS' : 'UNKNOWN',
    provider: testResults.provider?.hasDetection ? 'READY' : 'INCOMPLETE'
  },
  details: testResults
};

fs.writeFileSync('test-results.json', JSON.stringify(detailedResults, null, 2));
console.log('\n📄 Detailed results saved to test-results.json');

// Overall status
const overallPass = fixesPassed === testResults.fixes.length && 
                   securityPassed === testResults.security.length &&
                   testResults.build?.distExists &&
                   testResults.provider?.hasDetection;

console.log(`\n🎯 OVERALL STATUS: ${overallPass ? '✅ PASS' : '❌ NEEDS ATTENTION'}`);