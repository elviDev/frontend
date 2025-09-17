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

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const { requestReset, isLoading, error, clearAuthError } = useAuth();
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

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

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleRequestReset = async () => {
    if (!validateEmail()) return;

    clearAuthError();

    try {
      const result = await requestReset(email);
      if (result.meta && result.meta.requestStatus === 'fulfilled') {
        showSuccess("Reset link sent! Please check your email for password reset instructions. If you don't see the email, check your spam folder.");
        setTimeout(() => navigation.navigate('Login'), 2000); // Navigate after toast shows
      } else {
        const errorMessage = result.payload as string;
        showError(`Request Failed: ${errorMessage}`);
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
                  Forgot Password?
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  Enter your email address and we'll send you a link to reset
                  your password
                </Text>
              </View>

              {/* Email Input */}
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Send Reset Link Button */}
              <Button
                title="Send Reset Link"
                onPress={handleRequestReset}
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
