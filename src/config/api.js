/**
 * API Configuration
 * This file contains all the API endpoints and configuration
 */

import { OPENAI_API_KEY } from "@env";

const API_CONFIG = {
  BASE_URL: 'https://backend-sy9q.onrender.com/api/v1',
  WS_URL: 'https://backend-sy9q.onrender.com',
  OPENAI_API_KEY: OPENAI_API_KEY,
  
  // Development URLs
  // For real device USB debugging, use your machine's IP address
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, use your machine's IP address
  DEV_BASE_URL: 'http://172.17.241.181:3001/api/v1',  // Updated for USB debugging
  DEV_WS_URL: 'http://172.17.241.181:3001',
  
  // Emulator URLs (uncomment if using emulator)
  // DEV_BASE_URL: 'http://10.0.2.2:3001/api/v1',
  // DEV_WS_URL: 'http://10.0.2.2:3001',
};

// Development environment for real device USB debugging
export const API_BASE_URL = API_CONFIG.DEV_BASE_URL;
export const WS_BASE_URL = API_CONFIG.DEV_WS_URL;

// Production environment (uncomment for release builds)
// export const API_BASE_URL = API_CONFIG.BASE_URL;
// export const WS_BASE_URL = API_CONFIG.WS_URL;
export default API_CONFIG