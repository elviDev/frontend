import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { AuthState, User, AuthTokens, LoginCredentials, RegisterCredentials } from '../../types/auth';
import { authService } from '../../services/api/authService';
import { tokenManager } from '../../services/tokenManager';
import { webSocketService } from '../../services/websocketService';

const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get user profile');
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authService.requestPasswordReset(email);
      return response.message;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password reset request failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(token, newPassword);
      return response.message;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password reset failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      // Use centralized token manager for refresh
      const newToken = await tokenManager.refreshAccessToken();
      if (newToken) {
        // Get updated token info from token manager
        const tokenInfo = await tokenManager.getTokenInfo();
        const refreshToken = await tokenManager.getRefreshToken();
        
        return {
          accessToken: newToken,
          refreshToken: refreshToken || '',
          expiresIn: tokenInfo.expiresAt ? Math.floor((new Date(tokenInfo.expiresAt).getTime() - Date.now()) / 1000) : 900,
          user: null // User info will be fetched separately
        };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthenticated: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isLoading = false;
    },
    updateTokensFromManager: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; expiresAt: number }>) => {
      if (state.tokens) {
        state.tokens.accessToken = action.payload.accessToken;
        state.tokens.refreshToken = action.payload.refreshToken;
        state.tokens.expiresIn = action.payload.expiresAt;
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.tokens = {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          expiresIn: action.payload.expiresIn,
        };
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        
        // Connect WebSocket immediately after successful login
        webSocketService.connect().catch(error => {
          console.error('Failed to connect WebSocket after login:', error);
        });
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })

    // Register
    .addCase(registerUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    })
    .addCase(registerUser.fulfilled, (state) => {
      state.isLoading = false;
      state.error = null;
    })
    .addCase(registerUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    })

    // Logout
    .addCase(logoutUser.pending, (state) => {
      state.isLoading = true;
    })
    .addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      
      // Disconnect WebSocket on logout
      webSocketService.disconnect();
    })
    .addCase(logoutUser.rejected, (state, action) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload as string;
    })

    // Get current user
    .addCase(getCurrentUser.pending, (state) => {
      state.isLoading = true;
    })
    .addCase(getCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      
      // Connect WebSocket if user is authenticated (e.g., page refresh)
      webSocketService.connect().catch(error => {
        console.error('Failed to connect WebSocket after user verification:', error);
      });
    })
    .addCase(getCurrentUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
      state.user = null;
      state.tokens = null;
    })

    // Password reset request
    .addCase(requestPasswordReset.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    })
    .addCase(requestPasswordReset.fulfilled, (state) => {
      state.isLoading = false;
      state.error = null;
    })
    .addCase(requestPasswordReset.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    })

    // Password reset
    .addCase(resetPassword.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    })
    .addCase(resetPassword.fulfilled, (state) => {
      state.isLoading = false;
      state.error = null;
    })
    .addCase(resetPassword.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    })

    // Refresh token
    .addCase(refreshToken.pending, (state) => {
      state.isLoading = true;
    })
    .addCase(refreshToken.fulfilled, (state, action) => {
      state.tokens = action.payload;
      state.isLoading = false;
      state.error = null;
    })
    .addCase(refreshToken.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
      state.user = null;
      state.tokens = null;
    });
  },
});

export const { clearError, setAuthenticated, clearAuth, updateTokensFromManager } = authSlice.actions;

export default authSlice.reducer;