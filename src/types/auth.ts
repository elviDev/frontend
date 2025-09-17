export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'manager' | 'staff';
  avatar_url?: string;
  department?: string;
  job_title?: string;
  language_preference?: string;
  timezone?: string;
  notification_settings?: any;
  voice_settings?: any;
  email_verified: boolean;
  last_active?: string;
  created_at: string;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role: 'ceo' | 'manager' | 'staff';
  department?: string;
  job_title?: string;
  phone?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}