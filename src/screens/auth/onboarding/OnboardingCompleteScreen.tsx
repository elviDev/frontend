import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { CurvedBackground } from '../../../components/common/CurvedBackground/CurvedBackground';
import { Button } from '../../../components/common/Botton';
import { StepIndicator } from '../../../components/common/StepIndicator';
import { Colors } from '../../../utils/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/AuthNavigator';

type OnboardingCompleteScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'OnboardingComplete'
>;

export const OnboardingCompleteScreen: React.FC<
  OnboardingCompleteScreenProps
> = ({ navigation, route }) => {
  const { userEmail, skipped = false } = route.params;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const iconScale = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withSpring(0, { damping: 15 });
    iconScale.value = withSequence(
      withTiming(1.2, { duration: 400 }),
      withTiming(1, { duration: 200 }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleContinueToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <CurvedBackground customColor={Colors.primary} opacity={0.3}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 60,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          {/* Step Indicator */}
          <StepIndicator
            totalSteps={3}
            currentStep={3}
            titles={['Basic Info', 'Work Details', 'Complete']}
          />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Success Icon */}
            <Animated.View style={[iconAnimatedStyle, { marginBottom: 32 }]}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: Colors.success || Colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 32,
                }}
              >
                <Text
                  style={{
                    fontSize: 48,
                    color: Colors.white,
                  }}
                >
                  ✓
                </Text>
              </View>
            </Animated.View>

            {/* Success Message */}
            <View
              style={{
                alignItems: 'center',
                marginBottom: 40,
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: Colors.text.primary,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {skipped ? 'Account Created!' : 'Welcome Aboard!'}
              </Text>

              <Text
                style={{
                  fontSize: 18,
                  color: Colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: 26,
                  marginBottom: 16,
                }}
              >
                Your account has been successfully created.
              </Text>

              <View
                style={{
                  backgroundColor: Colors.warning?.light || Colors.gray[100],
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderRadius: 12,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.warning?.dark || Colors.text.primary,
                    textAlign: 'center',
                    fontWeight: '500',
                  }}
                >
                  📧 Verification Required
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                    marginTop: 8,
                    lineHeight: 20,
                  }}
                >
                  We've sent a verification email to{'\n'}
                  <Text
                    style={{ fontWeight: '600', color: Colors.text.primary }}
                  >
                    {userEmail}
                  </Text>
                  {'\n'}Please check your inbox and verify your account to
                  continue.
                </Text>
              </View>

              {skipped && (
                <View
                  style={{
                    backgroundColor: Colors.info?.light || Colors.blue[50],
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderRadius: 12,
                    marginBottom: 24,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: Colors.info?.dark || Colors.blue[700],
                      textAlign: 'center',
                      fontWeight: '500',
                    }}
                  >
                    💼 Complete Your Profile
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: Colors.text.secondary,
                      textAlign: 'center',
                      marginTop: 8,
                      lineHeight: 20,
                    }}
                  >
                    You can complete your work information and profile details
                    later from the settings menu.
                  </Text>
                </View>
              )}
            </View>

            {/* Action Section */}
            <View style={{ width: '100%', marginBottom: 24 }}>
              <Button
                title="Continue to Sign In"
                onPress={handleContinueToLogin}
                style={{ marginBottom: 16 }}
              />

              <TouchableOpacity
                onPress={() => navigation.popToTop()}
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
                  Back to Welcome
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </CurvedBackground>
  );
};
