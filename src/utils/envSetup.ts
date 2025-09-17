/**
 * Environment Setup Verification Script
 * Run this to diagnose environment variable loading issues
 */

import { getAPIKey } from '../config/apiKeys';

// Test 1: Direct import from @env
let envImportTest = false;
let envKey = '';
try {
  const { OPENAI_API_KEY } = require('@env');
  envKey = OPENAI_API_KEY;
  envImportTest = !!OPENAI_API_KEY;
  console.log('✅ Test 1 - @env import:', envImportTest ? 'PASSED' : 'FAILED');
} catch (error) {
  console.log('❌ Test 1 - @env import: FAILED');
  console.log('   Error:', error);
}

// Test 2: Fallback config method
const fallbackKey = getAPIKey();
const fallbackTest = !!fallbackKey;
console.log('✅ Test 2 - Fallback config:', fallbackTest ? 'PASSED' : 'FAILED');

// Test 3: Key validation
const finalKey = envKey || fallbackKey;
const keyValidation = finalKey && finalKey.startsWith('sk-');
console.log('✅ Test 3 - Key validation:', keyValidation ? 'PASSED' : 'FAILED');

// Summary
console.log('\n📋 ENVIRONMENT SETUP SUMMARY:');
console.log('================================');
console.log('🔍 @env module loading:', envImportTest ? '✅ Working' : '❌ Failed');
console.log('🔍 Fallback config:', fallbackTest ? '✅ Working' : '❌ Failed');
console.log('🔍 Final API key present:', !!finalKey ? '✅ Yes' : '❌ No');
console.log('🔍 Key format valid:', keyValidation ? '✅ Valid' : '❌ Invalid');
console.log('🔍 Key preview:', finalKey ? finalKey.substring(0, 15) + '...' : 'NOT FOUND');

if (!envImportTest) {
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('1. Make sure .env file exists in project root');
  console.log('2. Restart Metro bundler: npx react-native start --reset-cache');
  console.log('3. Make sure babel.config.js includes react-native-dotenv plugin');
  console.log('4. Try updating src/config/apiKeys.ts with your key as fallback');
}

export const envSetupStatus = {
  envImport: envImportTest,
  fallbackConfig: fallbackTest,
  keyPresent: !!finalKey,
  keyValid: keyValidation,
  key: finalKey
};
