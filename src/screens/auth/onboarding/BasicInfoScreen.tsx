import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
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
import { StepIndicator } from '../../../components/common/StepIndicator';
import { Colors } from '../../../utils/colors';
import { useAuth } from '../../../hooks/useAuth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/AuthNavigator';

type BasicInfoScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'BasicInfoStep'
>;

interface BasicCredentials {
  name: string;
  email: string;
  password: string;
}

export const BasicInfoScreen: React.FC<BasicInfoScreenProps> = ({
  navigation,
}) => {
  const { isLoading } = useAuth();
  const [credentials, setCredentials] = useState<BasicCredentials>({
    name: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<
    Partial<BasicCredentials & { confirmPassword?: string }>
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
    const newErrors: Partial<BasicCredentials & { confirmPassword?: string }> =
      {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    // Navigate to work info screen with basic credentials
    navigation.navigate('WorkInfoStep', {
      basicCredentials: credentials,
    });
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
                currentStep={1}
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
                  Let's Get Started
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  First, we need some basic information to create your account
                </Text>
              </View>
            </View>

            {/* Form Content */}
            <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
              {/* Form Section */}
              <View style={{ marginBottom: 32 }}>
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
                  label="Email Address"
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

                <Input
                  label="Password"
                  placeholder="Create a secure password (min 8 characters)"
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
              <View style={{ marginBottom: 24 }}>
                <Button
                  title="Continue"
                  onPress={handleContinue}
                  loading={isLoading}
                  style={{ marginBottom: 20 }}
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
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedBackground>
  );
};
