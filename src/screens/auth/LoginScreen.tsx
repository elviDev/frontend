import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      newErrors.email = t('errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = t('errors.emailInvalid');
    }

    if (!credentials.password) {
      newErrors.password = t('errors.passwordRequired');
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
          showSuccess(t('auth.loginSuccess'));
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
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
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
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
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
                title={t('auth.login')}
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
                  {t('auth.forgotPassword')}
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
                  {t('auth.noAccount')}{' '}
                  <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                    {t('auth.createAccount')}
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
