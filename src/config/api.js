/**
 * API Configuration
 * This file contains all the API endpoints and configuration
 */

const API_CONFIG = {
  BASE_URL: 'https://backend-sy9q.onrender.com/api/v1',
  WS_URL: 'https://backend-sy9q.onrender.com',
  
  // Development fallback
  DEV_BASE_URL: 'http://localhost:3001/api/v1',
  DEV_WS_URL: 'http://localhost:3001',
};

// Use production URLs for now
export const API_BASE_URL = API_CONFIG.BASE_URL;
export const WS_BASE_URL = API_CONFIG.WS_URL;

export default API_CONFIG;