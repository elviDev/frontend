/**
 * Centralized Token Manager
 * Single source of truth for authentication tokens across the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store/store';
import type { AuthTokens } from '../types/auth';
import { API_BASE_URL } from '../config/api';
// import { logout } from '../store/slices/authSlice';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: string;
}

class TokenManager {
  private static instance: TokenManager;
  private tokenCache: TokenData | null = null;
  private listeners: Array<(token: string | null) => void> = [];
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Subscribe to token changes
   */
  onTokenChange(listener: (token: string | null) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of token change
   */
  private notifyListeners(token: string | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(token);
      } catch (error) {
        console.error('TokenManager: Error in token change listener:', error);
      }
    });
  }

  /**
   * Store tokens securely
   */
  async storeTokens(tokenData: TokenData): Promise<void> {
    try {
      console.log('🔐 TokenManager: Storing tokens', {
        hasAccessToken: !!tokenData.accessToken,
        hasRefreshToken: !!tokenData.refreshToken,
        expiresAt: new Date(tokenData.expiresAt).toISOString(),
        userId: tokenData.userId
      });

      // Store in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('accessToken', tokenData.accessToken),
        AsyncStorage.setItem('refreshToken', tokenData.refreshToken),
        AsyncStorage.setItem('tokenExpiresAt', tokenData.expiresAt.toString()),
        tokenData.userId ? AsyncStorage.setItem('userId', tokenData.userId) : Promise.resolve()
      ]);

      // Update cache
      this.tokenCache = tokenData;

      // Schedule proactive refresh
      this.scheduleTokenRefresh(tokenData.expiresAt);

      // Notify listeners (WebSocket, etc.)
      this.notifyListeners(tokenData.accessToken);

      // Update Redux store
      try {
        store.dispatch({
          type: 'auth/updateTokensFromManager',
          payload: {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresAt: tokenData.expiresAt
          }
        });
      } catch (error) {
        console.warn('⚠️ TokenManager: Failed to update Redux store:', error);
      }

      console.log('✅ TokenManager: Tokens stored successfully');
    } catch (error) {
      console.error('❌ TokenManager: Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Get current valid access token
   */
  async getCurrentToken(): Promise<string | null> {
    try {
      // First check cache
      if (this.tokenCache && this.isTokenValid(this.tokenCache)) {
        return this.tokenCache.accessToken;
      }

      // Check Redux store
      const state = store.getState();
      const reduxToken = state.auth.tokens?.accessToken;
      const reduxExpiresIn = state.auth.tokens?.expiresIn;

      if (reduxToken && reduxExpiresIn && Date.now() < reduxExpiresIn) {
        // Update cache from Redux
        this.tokenCache = {
          accessToken: reduxToken,
          refreshToken: state.auth.tokens?.refreshToken || '',
          expiresAt: reduxExpiresIn,
          userId: state.auth.user?.id
        };
        return reduxToken;
      }

      // Fall back to AsyncStorage
      const [accessToken, refreshToken, expiresAtStr, userId] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('tokenExpiresAt'),
        AsyncStorage.getItem('userId')
      ]);

      if (accessToken && expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr);
        
        if (Date.now() < expiresAt) {
          // Token is still valid, update cache
          this.tokenCache = {
            accessToken,
            refreshToken: refreshToken || '',
            expiresAt,
            userId: userId || undefined
          };
          
          // Schedule refresh for the existing token
          this.scheduleTokenRefresh(expiresAt);
          
          console.log('🔄 TokenManager: Retrieved valid token from storage');
          return accessToken;
        } else {
          console.log('⏰ TokenManager: Token expired, clearing storage');
          await this.clearTokens();
        }
      }

      return null;
    } catch (error) {
      console.error('❌ TokenManager: Error getting current token:', error);
      return null;
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(tokenData: TokenData): boolean {
    return Date.now() < tokenData.expiresAt;
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    try {
      console.log('🧹 TokenManager: Clearing all tokens');

      // Clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('refreshToken'),
        AsyncStorage.removeItem('tokenExpiresAt'),
        AsyncStorage.removeItem('userId')
      ]);

      // Clear cache
      this.tokenCache = null;

      // Clear refresh timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Notify listeners that token is gone
      this.notifyListeners(null);

      // Update Redux store
      try {
        store.dispatch({ type: 'auth/clearAuth' });
      } catch (error) {
        console.warn('⚠️ TokenManager: Failed to update Redux store:', error);
      }

      console.log('✅ TokenManager: All tokens cleared');
    } catch (error) {
      console.error('❌ TokenManager: Error clearing tokens:', error);
    }
  }

  /**
   * Force refresh token from storage
   */
  async refreshFromStorage(): Promise<string | null> {
    this.tokenCache = null; // Clear cache to force reload
    return await this.getCurrentToken();
  }

  /**
   * Get current refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      // Check cache first
      if (this.tokenCache && this.tokenCache.refreshToken) {
        return this.tokenCache.refreshToken;
      }

      // Check Redux store
      const state = store.getState();
      const reduxRefreshToken = state.auth.tokens?.refreshToken;
      if (reduxRefreshToken) {
        return reduxRefreshToken;
      }

      // Fall back to AsyncStorage
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      return refreshToken;
    } catch (error) {
      console.error('❌ TokenManager: Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Schedule proactive token refresh
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Calculate time to refresh (5 minutes before expiration)
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000); // 5 minutes buffer
    
    if (refreshTime > 0) {
      console.log(`🔄 TokenManager: Scheduling refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
      
      this.refreshTimer = setTimeout(async () => {
        console.log('⏰ TokenManager: Proactive token refresh triggered');
        await this.refreshAccessToken();
      }, refreshTime);
    } else {
      // Token expires soon, refresh immediately
      console.log('⚠️ TokenManager: Token expires soon, refreshing immediately');
      setTimeout(() => this.refreshAccessToken(), 1000);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      console.log('🔄 TokenManager: Refresh already in progress, waiting...');
      return await this.getCurrentToken();
    }

    try {
      this.isRefreshing = true;
      console.log('🔄 TokenManager: Attempting to refresh access token...');
      
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ TokenManager: No refresh token available');
        await this.clearTokens();
        return null;
      }

      try {
        // Make the refresh request directly to avoid circular dependency


        // const API_BASE_URL is now imported
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as {
          success: boolean;
          data: AuthTokens;
        };

        if (result.success) {
          const newTokens = result.data;
          const expirationTime = Date.now() + newTokens.expiresIn * 1000;
          
          // Store the new tokens
          await this.storeTokens({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresAt: expirationTime,
          });

          console.log('✅ TokenManager: Successfully refreshed access token');
          return newTokens.accessToken;
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.error('❌ TokenManager: Token refresh failed:', error);
        // Clear tokens since refresh failed
        await this.clearTokens();
        
        // Dispatch logout action to update Redux state
        store.dispatch({ type: 'auth/logout' });
        return null;
      }
    } catch (error) {
      console.error('❌ TokenManager: Error during token refresh:', error);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get token info for debugging
   */
  async getTokenInfo(): Promise<{
    hasToken: boolean;
    isExpired: boolean;
    expiresAt: string | null;
    source: 'cache' | 'redux' | 'storage' | 'none';
  }> {
    try {
      // Check cache first
      if (this.tokenCache) {
        return {
          hasToken: true,
          isExpired: !this.isTokenValid(this.tokenCache),
          expiresAt: new Date(this.tokenCache.expiresAt).toISOString(),
          source: 'cache'
        };
      }

      // Check Redux
      const state = store.getState();
      if (state.auth.tokens?.accessToken && state.auth.tokens?.expiresIn) {
        return {
          hasToken: true,
          isExpired: Date.now() >= state.auth.tokens.expiresIn,
          expiresAt: new Date(state.auth.tokens.expiresIn).toISOString(),
          source: 'redux'
        };
      }

      // Check storage
      const [accessToken, expiresAtStr] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('tokenExpiresAt')
      ]);

      if (accessToken && expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr);
        return {
          hasToken: true,
          isExpired: Date.now() >= expiresAt,
          expiresAt: new Date(expiresAt).toISOString(),
          source: 'storage'
        };
      }

      return {
        hasToken: false,
        isExpired: true,
        expiresAt: null,
        source: 'none'
      };
    } catch (error) {
      console.error('❌ TokenManager: Error getting token info:', error);
      return {
        hasToken: false,
        isExpired: true,
        expiresAt: null,
        source: 'none'
      };
    }
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();