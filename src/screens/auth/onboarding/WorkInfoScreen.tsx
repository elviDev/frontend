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
import { CurvedBackground } from '../../../components/common/CurvedBackground/CurvedBackground';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Botton';
import { CustomPicker } from '../../../components/common/CustomPicker';
import { StepIndicator } from '../../../components/common/StepIndicator';
import { Colors } from '../../../utils/colors';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../contexts/ToastContext';
import { AuthError } from '../../../services/api/authService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/AuthNavigator';

type WorkInfoScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'WorkInfoStep'
>;

interface WorkCredentials {
  role: 'ceo' | 'manager' | 'staff';
  department?: string;
  job_title?: string;
  phone?: string;
}

interface WorkErrors {
  role?: string;
  department?: string;
  job_title?: string;
  phone?: string;
}

export const WorkInfoScreen: React.FC<WorkInfoScreenProps> = ({
  navigation,
  route,
}) => {
  const { register, isLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { basicCredentials } = route.params;

  const [workInfo, setWorkInfo] = useState<WorkCredentials>({
    role: 'staff',
    department: '',
    job_title: '',
    phone: '',
  });
  const [errors, setErrors] = useState<WorkErrors>({});

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
    const newErrors: WorkErrors = {};

    if (!workInfo.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    try {
      // Combine basic credentials with work info
      const completeCredentials = {
        ...basicCredentials,
        ...workInfo,
      };

      const result = await register(completeCredentials);

      if (result.type === 'auth/register/fulfilled') {
        showSuccess('Account created successfully! Please check your email to verify your account.');
        // Navigate to email verification screen
        navigation.navigate('EmailVerification', {
          email: basicCredentials.email,
          fromRegistration: true,
        });
      } else {
        const errorMessage = result.payload as string;
        showError(errorMessage || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Something went wrong. Please try again.');
      }
    }
  };

  const handleSkip = async () => {
    // Create account with minimal info (role defaults to 'staff')
    try {
      const minimalCredentials = {
        ...basicCredentials,
        role: 'staff' as const,
      };

      const result = await register(minimalCredentials);

      if (result.type === 'auth/register/fulfilled') {
        showSuccess('Account created successfully! Please check your email to verify your account.');
        // Navigate to email verification screen
        navigation.navigate('EmailVerification', {
          email: basicCredentials.email,
          fromRegistration: true,
        });
      } else {
        const errorMessage = result.payload as string;
        showError(errorMessage || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Something went wrong. Please try again.');
      }
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
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[animatedStyle]}>
            {/* Header Section */}
            <View
              style={{
                paddingBottom: 16,
                paddingHorizontal: 0,
              }}
            >
              {/* Step Indicator */}
              <StepIndicator
                totalSteps={3}
                currentStep={2}
                titles={['Basic Info', 'Work Details', 'Complete']}
              />

              {/* Header Section */}
              <View
                style={{
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 8,
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
                  Work Information
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  Help us understand your role in the organization
                </Text>
              </View>
            </View>

            {/* Form Content */}
            <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
              {/* Form Section */}
              <View style={{ marginBottom: 32 }}>
                <CustomPicker
                  label="Your Role"
                  placeholder="Select your role"
                  selectedValue={workInfo.role}
                  items={[
                    { label: 'Staff Member', value: 'staff' },
                    { label: 'Manager', value: 'manager' },
                    { label: 'CEO/Executive', value: 'ceo' },
                  ]}
                  onValueChange={role =>
                    setWorkInfo(prev => ({
                      ...prev,
                      role: role as 'ceo' | 'manager' | 'staff',
                    }))
                  }
                  error={errors.role}
                />

                <Input
                  label="Department (Optional)"
                  placeholder="e.g., Marketing, Engineering, Sales"
                  value={workInfo.department || ''}
                  onChangeText={department =>
                    setWorkInfo(prev => ({ ...prev, department }))
                  }
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                <Input
                  label="Job Title (Optional)"
                  placeholder="e.g., Senior Developer, Marketing Specialist"
                  value={workInfo.job_title || ''}
                  onChangeText={job_title =>
                    setWorkInfo(prev => ({ ...prev, job_title }))
                  }
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                <Input
                  label="Phone Number (Optional)"
                  placeholder="Enter your work phone"
                  value={workInfo.phone || ''}
                  onChangeText={phone =>
                    setWorkInfo(prev => ({ ...prev, phone }))
                  }
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Section */}
              <View style={{ marginBottom: 24 }}>
                <Button
                  title="Create Account"
                  onPress={handleCreateAccount}
                  loading={isLoading}
                  style={{ marginBottom: 16 }}
                />

                <TouchableOpacity
                  onPress={handleSkip}
                  disabled={isLoading}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: Colors.gray[300],
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: Colors.text.primary,
                      fontWeight: '500',
                    }}
                  >
                    Skip for Now
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
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
                    ← Back to Basic Information
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedBackground>
  );
};
