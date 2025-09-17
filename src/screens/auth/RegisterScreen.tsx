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
import { CustomPicker } from '../../components/common/CustomPicker';
import { Colors } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import type { RegisterCredentials } from '../../types/auth';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  navigation,
}) => {
  // Redirect to new onboarding flow
  React.useEffect(() => {
    navigation.replace('BasicInfoStep');
  }, [navigation]);

  const { register, isLoading, error, clearAuthError } = useAuth();
  const { showSuccess, showError } = useToast();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    department: '',
    job_title: '',
    phone: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<
    Partial<
      Omit<RegisterCredentials, 'role'> & {
        role?: string;
        confirmPassword?: string;
      }
    >
  >({});

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
    const newErrors: Partial<
      Omit<RegisterCredentials, 'role'> & {
        role?: string;
        confirmPassword?: string;
      }
    > = {};

    if (!credentials.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (credentials.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!credentials.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    clearAuthError();

    try {
      const result = await register(credentials);
      if (result.type === 'auth/register/fulfilled') {
        showSuccess('Registration successful! Please check your email to verify your account before logging in.');
        setTimeout(() => navigation.navigate('Login'), 2000); // Navigate after toast shows
      } else {
        const errorMessage = result.payload as string;
        showError(`Registration Failed: ${errorMessage}`);
      }
    } catch (error: any) {
      showError(
        error.message || 'An unexpected error occurred'
      );
    }
  };

  return (
    <CurvedBackground customColor={Colors.primary} opacity={0.3}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            paddingBottom: 0,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[animatedStyle]}>
            {/* Header Section */}
            <View
              style={{
                alignItems: 'center',
                marginBottom: 12,
                paddingVertical: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: Colors.text.primary,
                  marginBottom: 8,
                }}
              >
                Create Account
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: Colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                Fill in your details to get started
              </Text>
            </View>

            {/* Personal Information Section */}
            <View style={{ marginBottom: 0 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: Colors.text.primary,
                  marginBottom: 16,
                }}
              >
                Personal Information
              </Text>
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={credentials.name}
                onChangeText={name =>
                  setCredentials(prev => ({ ...prev, name }))
                }
                error={errors.name}
                autoCapitalize="words"
                autoCorrect={false}
              />

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
            </View>

            {/* Work Information Section */}
            <View style={{ marginBottom: 0 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: Colors.text.primary,
                  marginBottom: 16,
                }}
              >
                Work Information
              </Text>

              <CustomPicker
                label="Role"
                placeholder="Select your role"
                selectedValue={credentials.role}
                items={[
                  { label: 'Staff', value: 'staff' },
                  { label: 'Manager', value: 'manager' },
                  { label: 'CEO', value: 'ceo' },
                ]}
                onValueChange={role =>
                  setCredentials(prev => ({
                    ...prev,
                    role: role as 'ceo' | 'manager' | 'staff',
                  }))
                }
                error={errors.role}
              />

              <Input
                label="Department (Optional)"
                placeholder="Enter your department"
                value={credentials.department || ''}
                onChangeText={department =>
                  setCredentials(prev => ({ ...prev, department }))
                }
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Input
                label="Job Title (Optional)"
                placeholder="Enter your job title"
                value={credentials.job_title || ''}
                onChangeText={job_title =>
                  setCredentials(prev => ({ ...prev, job_title }))
                }
                autoCapitalize="words"
                autoCorrect={false}
              />

              <Input
                label="Phone (Optional)"
                placeholder="Enter your phone number"
                value={credentials.phone || ''}
                onChangeText={phone =>
                  setCredentials(prev => ({ ...prev, phone }))
                }
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Security Section */}
            <View style={{ marginBottom: 0 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: Colors.text.primary,
                  marginBottom: 16,
                }}
              >
                Security
              </Text>

              <Input
                label="Password"
                placeholder="Enter your password (min 8 characters)"
                value={credentials.password}
                onChangeText={password =>
                  setCredentials(prev => ({ ...prev, password }))
                }
                error={errors.password}
                isPassword
                autoCapitalize="none"
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                isPassword
                autoCapitalize="none"
              />
            </View>

            {/* Action Section */}
            <View style={{ marginBottom: 0 }}>
              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                style={{ marginBottom: 16 }}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={{
                  alignItems: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                  }}
                >
                  Already have an account?{' '}
                  <Text
                    style={{
                      color: Colors.primary,
                      fontWeight: '600',
                      textDecorationLine: 'underline',
                    }}
                  >
                    Sign In
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
