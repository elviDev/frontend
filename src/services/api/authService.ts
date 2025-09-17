import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { tokenManager } from '../tokenManager';
import type { User, AuthTokens } from '../../types/auth';

import { API_BASE_URL } from '../../config/api';
console.log("BASE URL FOR THE BACKEND!!!!!!!",API_BASE_URL)

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'ceo' | 'manager' | 'staff';
  department?: string;
  job_title?: string;
  phone?: string;
}

interface PasswordResetRequest {
  email: string;
}

interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface AuthResponse {
  success: boolean;
  data: AuthTokens & {
    user: User;
  };
}

interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode?: number;
  };
}

export class AuthError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const getReadableErrorMessage = (error: any, defaultMessage: string): string => {
  // Handle network errors
  if (error.message === 'Network request failed' || error.name === 'TypeError') {
    return 'Unable to connect to server. Please check your internet connection and try again.';
  }

  // Handle timeout errors
  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    return 'Request timed out. Please try again.';
  }

  // Handle specific auth errors
  if (error.message?.includes('Invalid email or password')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (error.message?.includes('email address exists')) {
    return 'An account with this email already exists. Please try logging in instead.';
  }

  if (error.message?.includes('verify your email')) {
    return 'Please check your email and verify your account before logging in.';
  }

  if (error.message?.includes('token') && error.message?.includes('expired')) {
    return 'Your session has expired. Please log in again.';
  }

  // Return the original error message if it's user-friendly, otherwise use default
  return error.message && error.message.length < 100 ? error.message : defaultMessage;
};

class AuthService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const shouldAddToken = token &&
      !endpoint.includes('refresh') &&
      !endpoint.includes('login') &&
      !endpoint.includes('register');

    console.log('🌐 makeRequest debug:', {
      endpoint,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      shouldAddToken,
      willAddAuthHeader: shouldAddToken
    });

    if (shouldAddToken) {
      headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.log('❌ No authorization header added:', {
        hasToken: !!token,
        isLoginEndpoint: endpoint.includes('login'),
        isRegisterEndpoint: endpoint.includes('register'),
        isRefreshEndpoint: endpoint.includes('refresh')
      });
    }
    console.log(`🌐 Making API request to ${API_BASE_URL}${endpoint}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      let responseText = '';
      try {
        responseText = await response.text();
        
        if (!responseText.trim()) {
          throw new AuthError(
            'Server returned empty response',
            'EMPTY_RESPONSE', 
            response.status
          );
        }
        
        // Check if response is HTML (server error page)
        if (responseText.trim().startsWith('<')) {
          throw new AuthError(
            'Server returned HTML instead of JSON - possible server error',
            'HTML_RESPONSE',
            response.status
          );
        }
        
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error('❌ Response parsing failed:', {
          error: parseError.message,
          status: response.status,
          responseStart: responseText.substring(0, 200),
          contentType: response.headers.get('content-type')
        });
        
        throw new AuthError(
          'Server returned invalid response format',
          'INVALID_RESPONSE',
          response.status
        );
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || `Request failed with status ${response.status}`;
        const errorCode = data.error?.code || 'REQUEST_FAILED';
        throw new AuthError(errorMessage, errorCode, response.status);
      }

      return data;
    } catch (error: any) {
      console.error('API Request failed:', error);
      
      // Handle abort signal (timeout)
      if (error.name === 'AbortError') {
        throw new AuthError(
          'Request timed out. Please check your connection and try again.',
          'TIMEOUT',
          408
        );
      }

      // Re-throw AuthError as-is
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle network and other errors with better debugging info
      console.error('❌ Network error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        endpoint: `${API_BASE_URL}${endpoint}`
      });

      const readableMessage = getReadableErrorMessage(error, 'Network connection failed. Check if backend server is running.');
      throw new AuthError(readableMessage, 'NETWORK_ERROR', 0);
    }
  }

  // Test connectivity to backend
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing backend connectivity...');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✅ Backend reachable, status: ${response.status}`);
      return true;
    } catch (error: any) {
      console.error('❌ Backend connectivity test failed:', error.message);
      return false;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Test connectivity first in development mode
    if (__DEV__) {
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new AuthError(
          'Cannot connect to backend server. Please ensure the backend is running at https://backend-sy9q.onrender.com',
          'CONNECTION_FAILED',
          0
        );
      }
    }

    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success) {
      await this.storeTokens(response.data);
    }

    return response;
  }

  async register(
    userData: RegisterRequest,
  ): Promise<{ success: boolean; data: { user: User; message: string } }> {
    const response = await this.makeRequest<{
      success: boolean;
      data: { user: User; message: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout request failed, proceeding with local logout');
    } finally {
      await this.clearTokens();
    }
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{
      success: boolean;
      message: string;
    }>('/auth/password-reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return response;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{
      success: boolean;
      message: string;
    }>('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });

    return response;
  }

  async refreshToken(): Promise<AuthTokens> {
    // In development, don't try to refresh - just clear tokens
    if (__DEV__) {
      console.log('🚫 Development mode: Refresh token disabled, clearing tokens');
      await this.clearTokens();
      throw new Error('Development mode: Token refresh disabled');
    }

    const refreshToken = await this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.makeRequest<{
      success: boolean;
      data: AuthTokens;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success) {
      await this.storeTokens(response.data);
      return response.data;
    }

    throw new Error('Token refresh failed');
  }

  async getCurrentUser(): Promise<{ success: boolean; data: { user: User } }> {
    const response = await this.makeRequest<{
      success: boolean;
      data: { user: User };
    }>('/auth/me');
    return response;
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{
      success: boolean;
      message: string;
    }>(`/auth/verify-email/${token}`);
    return response;
  }

  async resendEmailVerification(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{
      success: boolean;
      message: string;
    }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  // Token management
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      const expirationTime = Date.now() + tokens.expiresIn * 1000;
      console.log('🔒 Storing tokens via TokenManager:', {
        accessTokenLength: tokens.accessToken?.length || 0,
        refreshTokenLength: tokens.refreshToken?.length || 0,
        expiresIn: tokens.expiresIn,
        expirationTime,
        expirationDate: new Date(expirationTime).toISOString(),
        userId: tokens.user?.id
      });

      // Use centralized token manager
      await tokenManager.storeTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: expirationTime,
        userId: tokens.user?.id
      });

      // Legacy AsyncStorage for backward compatibility (can be removed later)
      await AsyncStorage.multiSet([
        ['accessToken', tokens.accessToken],
        ['refreshToken', tokens.refreshToken],
        ['tokenExpiresAt', expirationTime.toString()],
      ]);

      console.log('✅ Tokens stored successfully');
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      // Use centralized token manager
      const token = await tokenManager.getCurrentToken();
      
      // Debug info
      const tokenInfo = await tokenManager.getTokenInfo();
      console.log('🔑 Token retrieval via TokenManager:', {
        hasToken: tokenInfo.hasToken,
        isExpired: tokenInfo.isExpired,
        expiresAt: tokenInfo.expiresAt,
        source: tokenInfo.source,
        tokenLength: token ? token.length : 0
      });

      if (!token) {
        console.log('❌ No valid token available');
        return null;
      }

      console.log('✅ Token is valid and will be used');
      return token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      // Use centralized token manager
      return await tokenManager.getRefreshToken();
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      // Use centralized token manager
      await tokenManager.clearTokens();
      
      // Legacy cleanup for backward compatibility
      await AsyncStorage.multiRemove([
        'accessToken',
        'refreshToken',
        'tokenExpiresAt',
      ]);
      console.log('🧹 All auth tokens cleared from storage');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Force clear all auth-related storage - useful for development
  async forceLogout(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('🧹 All AsyncStorage cleared for fresh start');
    } catch (error) {
      console.error('Failed to clear all storage:', error);
    }
  }

  async getStoredToken(): Promise<string | null> {
    // Use centralized token manager
    return await tokenManager.getCurrentToken();
  }

  async isTokenValid(): Promise<boolean> {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        return false;
      }
      
      // In development, mock tokens are always valid
      if (__DEV__ && token.startsWith('dev-')) {
        console.log('🎭 Mock token is valid');
        return true;
      }
      
      // For real tokens, check with token manager
      const tokenInfo = await tokenManager.getTokenInfo();
      return tokenInfo.hasToken && !tokenInfo.isExpired;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Auto-refresh token wrapper
  async withAuth<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      // In development mode, don't try to refresh tokens
      if (__DEV__) {
        throw error;
      }
      
      if (
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized')
      ) {
        try {
          // Use centralized token manager for refresh
          const newToken = await tokenManager.refreshAccessToken();
          if (newToken) {
            return await apiCall();
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError) {
          await tokenManager.clearTokens();
          throw new Error('Session expired. Please login again.');
        }
      }
      throw error;
    }
  }
}

export const authService = new AuthService();

// Development helper - accessible globally in __DEV__ mode
if (__DEV__) {
  (global as any).clearAllAuth = async () => {
    console.log('🧹 DEVELOPMENT: Clearing all authentication data...');
    await authService.forceLogout();
    console.log('✅ All auth data cleared. Please reload the app.');
  };
  
  (global as any).loginTestUser = async (role: 'ceo' | 'manager' | 'staff' = 'ceo') => {
    const credentials = {
      ceo: { email: 'ceo@test.com', password: 'test123' },
      manager: { email: 'manager@test.com', password: 'test123' },  
      staff: { email: 'staff@test.com', password: 'test123' }
    };
    
    console.log(`🎭 DEVELOPMENT: Auto-login as ${role}...`);
    const result = await authService.login(credentials[role]);
    console.log('✅ Development login result:', result.success);
    return result;
  };
  
  console.log('🛠️ Development auth helpers available:');
  console.log('  - clearAllAuth() - Clear all stored auth data');
  console.log('  - loginTestUser("ceo"|"manager"|"staff") - Quick login');
}
