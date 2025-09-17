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

interface ResetPasswordScreenProps {
  navigation: any;
  route: {
    params: {
      token: string;
    };
  };
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
  route,
}) => {
  const { confirmReset, isLoading, error, clearAuthError } = useAuth();
  const { showSuccess, showError } = useToast();
  const { token } = route.params;

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });

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
    const newErrors = {
      newPassword: '',
      confirmPassword: '',
    };

    if (!passwords.newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (passwords.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!passwords.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwords.newPassword !== passwords.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return !newErrors.newPassword && !newErrors.confirmPassword;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    clearAuthError();

    try {
      const result = await confirmReset(token, passwords.newPassword);
      if (result.type === 'auth/confirmReset/fulfilled') {
        showSuccess('Your password has been successfully reset. You can now log in with your new password.');
        setTimeout(() => navigation.navigate('Login'), 2000); // Navigate after toast shows
      } else {
        const errorMessage = result.payload as string;
        showError(`Reset Failed: ${errorMessage}`);
      }
    } catch (error: any) {
      showError(
        error.message || 'An unexpected error occurred'
      );
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
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
              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: Colors.text.primary,
                    marginBottom: 8,
                  }}
                >
                  Reset Password
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  Enter your new password below
                </Text>
              </View>

              {/* New Password Input */}
              <Input
                label="New Password"
                placeholder="Enter your new password"
                value={passwords.newPassword}
                onChangeText={newPassword =>
                  setPasswords(prev => ({ ...prev, newPassword }))
                }
                error={errors.newPassword}
                isPassword
                autoCapitalize="none"
              />

              {/* Confirm Password Input */}
              <Input
                label="Confirm Password"
                placeholder="Confirm your new password"
                value={passwords.confirmPassword}
                onChangeText={confirmPassword =>
                  setPasswords(prev => ({ ...prev, confirmPassword }))
                }
                error={errors.confirmPassword}
                isPassword
                autoCapitalize="none"
              />

              {/* Reset Password Button */}
              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                loading={isLoading}
                style={{ marginBottom: 24 }}
              />

              {/* Back to Login Link */}
              <TouchableOpacity
                onPress={handleBackToLogin}
                style={{ alignItems: 'center' }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.text.secondary,
                  }}
                >
                  Remember your password?{' '}
                  <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                    Back to Login
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
