import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { BasicInfoScreen } from '../screens/auth/onboarding/BasicInfoScreen';
import { WorkInfoScreen } from '../screens/auth/onboarding/WorkInfoScreen';
import { OnboardingCompleteScreen } from '../screens/auth/onboarding/OnboardingCompleteScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  BasicInfoStep: undefined;
  WorkInfoStep: {
    basicCredentials: {
      name: string;
      email: string;
      password: string;
    };
  };
  OnboardingComplete: {
    userEmail: string;
    skipped?: boolean;
  };
  ForgotPassword: undefined;
  ResetPassword: {
    token: string;
  };
  EmailVerification: {
    email: string;
    fromRegistration?: boolean;
    verificationToken?: string;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="BasicInfoStep" component={BasicInfoScreen} />
      <Stack.Screen name="WorkInfoStep" component={WorkInfoScreen} />
      <Stack.Screen
        name="OnboardingComplete"
        component={OnboardingCompleteScreen}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        initialParams={{ token: '' }}
      />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </Stack.Navigator>
  );
};
