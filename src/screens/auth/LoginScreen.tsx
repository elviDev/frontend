import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { CurvedBackground } from '../../components/common/CurvedBackground/CurvedBackground';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Botton';
import { Colors } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { AuthError } from '../../services/api/authService';
import type { LoginCredentials } from '../../types/auth';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, isLoading, error, clearAuthError } = useAuth();
  const { showSuccess, showError, showInfo, showToast } = useToast();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    clearAuthError();

    try {
      const result = await login(credentials);
      if (result.type === 'auth/login/fulfilled') {
        // Check if user's email is verified and show warning if not
        const user = result.payload?.user;
        if (user && !user.email_verified) {
          showToast(
            'Your email address is not verified. Please check your email and verify your account for full access to all features.',
            'warning',
            {
              duration: 8000,
              action: {
                text: 'Resend Email',
                onPress: () => {
                  navigation.navigate('EmailVerification', {
                    email: credentials.email,
                    fromRegistration: false,
                  });
                },
              },
            }
          );
        } else {
          showSuccess('Welcome back! Login successful.');
        }
        // Navigation will be handled by the AuthNavigator based on auth state
      } else {
        const errorMessage = result.payload as string;
        // Handle specific error cases with actionable messages
        if (errorMessage.includes('verify your email')) {
          showToast(errorMessage, 'error', {
            duration: 0,
            action: {
              text: 'Resend',
              onPress: () => {
                navigation.navigate('EmailVerification', {
                  email: credentials.email,
                  fromRegistration: false,
                });
              },
            },
          });
        } else {
          showError(errorMessage || 'Login failed. Please check your credentials.');
        }
      }
    } catch (error: any) {
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Something went wrong. Please try again.');
      }
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <CurvedBackground customColor={Colors.primary} opacity={0.3}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              {
                flex: 1,
                paddingHorizontal: 24,
                justifyContent: 'center',
                paddingTop: 120,
              },
              animatedStyle,
            ]}
          >
            <View style={{ marginBottom: 40 }}>
              {/* Email Input */}
              <Input
                label="Email"
                placeholder="Enter your email"
                value={credentials.email}
                onChangeText={email =>
                  setCredentials(prev => ({ ...prev, email }))
                }
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Password Input */}
              <Input
                label="Password"
                placeholder="Enter your password"
                value={credentials.password}
                onChangeText={password =>
                  setCredentials(prev => ({ ...prev, password }))
                }
                error={errors.password}
                isPassword
                autoCapitalize="none"
              />

              {/* Sign In Button */}
              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                style={{ marginBottom: 16 }}
              />

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={{ alignItems: 'center', marginBottom: 24 }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.primary,
                    fontWeight: '600',
                  }}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {/* Create Account Link */}
              <TouchableOpacity
                onPress={() => navigation.navigate('BasicInfoStep')}
                style={{ alignItems: 'center', marginTop: 24 }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.text.secondary,
                  }}
                >
                  Don't have an account?{' '}
                  <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                    Create account
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedBackground>
  );
};
