import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import type { RootState, AppDispatch } from '../store/store';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser, 
  requestPasswordReset, 
  resetPassword, 
  clearError,
  setAuthenticated,
  clearAuth
} from '../store/slices/authSlice';
import { authService } from '../services/api/authService';
import type { LoginCredentials, RegisterCredentials } from '../types/auth';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, tokens, isLoading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize auth state from stored tokens on app start
  const initializeAuth = useCallback(async () => {
    try {
      const isTokenValid = await authService.isTokenValid();
      if (isTokenValid) {
        try {
          await dispatch(getCurrentUser()).unwrap();
        } catch (error) {
          // If getCurrentUser fails, clear invalid tokens and show auth
          console.log('🧹 Clearing invalid stored tokens');
          await authService.clearTokens();
          dispatch(clearAuth());
        }
      } else {
        // No valid token, clear any stored data and show auth
        await authService.clearTokens();
        dispatch(clearAuth());
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await authService.clearTokens();
      dispatch(clearAuth());
    }
  }, [dispatch]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    return dispatch(loginUser(credentials));
  }, [dispatch]);

  // Register function
  const register = useCallback(async (userData: RegisterCredentials) => {
    return dispatch(registerUser(userData));
  }, [dispatch]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authService.clearTokens();
      dispatch(clearAuth());
      return { type: 'fulfilled' };
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear even if there's an error
      await authService.clearTokens();
      dispatch(clearAuth());
      return { type: 'fulfilled' };
    }
  }, [dispatch]);

  // Get current user function
  const refreshUser = useCallback(async () => {
    return dispatch(getCurrentUser());
  }, [dispatch]);

  // Request password reset function
  const requestReset = useCallback(async (email: string) => {
    return dispatch(requestPasswordReset(email));
  }, [dispatch]);

  // Reset password function
  const confirmReset = useCallback(async (token: string, newPassword: string) => {
    return dispatch(resetPassword({ token, newPassword }));
  }, [dispatch]);

  // Clear error function
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string) => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  // Check if user has specific role
  const hasRole = useCallback((role: string) => {
    return user?.role === role;
  }, [user]);

  // Auto-initialize on mount
  useEffect(() => {
    if (!isAuthenticated && !user) {
      initializeAuth();
    }
  }, [initializeAuth, isAuthenticated, user]);

  return {
    // State
    user,
    tokens,
    isLoading,
    error,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    refreshUser,
    requestReset,
    confirmReset,
    clearAuthError,
    initializeAuth,
    
    // Utilities
    hasPermission,
    hasRole,
  };
};
