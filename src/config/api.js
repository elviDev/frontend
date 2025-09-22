/**
 * API Configuration
 * This file contains all the API endpoints and configuration
 */

const API_CONFIG = {
  BASE_URL: 'https://backend-sy9q.onrender.com/api/v1',
  WS_URL: 'https://backend-sy9q.onrender.com',
  
  // Development fallback
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, use your machine's IP address
  DEV_BASE_URL: 'http://10.0.2.2:3000/api/v1',
  DEV_WS_URL: 'http://10.0.2.2:3000',
};

// Use development URLs for local development
// export const API_BASE_URL = API_CONFIG.BASE_URL;
// export const WS_BASE_URL = API_CONFIG.WS_URL;
export const API_BASE_URL = API_CONFIG.DEV_BASE_URL;
export const WS_BASE_URL = API_CONFIG.DEV_WS_URL;

export default API_CONFIG;