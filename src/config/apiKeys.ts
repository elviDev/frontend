// Alternative configuration approach
export const CONFIG = {
  OPENAI_API_KEY: '', // Remove hardcoded key for security - use environment variables
  // Add other API keys here as needed
};

// You can switch between @env and CONFIG based on what works
export const getAPIKey = () => {
  // Try environment variable first, fallback to config
  try {
    const { OPENAI_API_KEY } = require('@env');
    if (OPENAI_API_KEY) {
      return OPENAI_API_KEY;
    }
  } catch (error) {
    console.warn('Failed to load from @env, using fallback config');
  }
  
  // Return empty string if no key is found - handle this in your service
  return CONFIG.OPENAI_API_KEY || '';
};
