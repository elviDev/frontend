import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { CurvedBackground } from '../../components/common/CurvedBackground/CurvedBackground';
import { Button } from '../../components/common/Botton';
import { Colors } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { authService, AuthError } from '../../services/api/authService';

interface EmailVerificationScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
      fromRegistration?: boolean;
      verificationToken?: string;
    };
  };
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { email, fromRegistration, verificationToken } = route.params;
  const { showSuccess, showError, showInfo } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withSpring(0, { damping: 15 });

    // If we have a verification token, automatically verify it
    if (verificationToken) {
      handleVerifyToken(verificationToken);
    }

    // Set up deep link listener for verification links
    const handleDeepLink = (url: string) => {
      const tokenMatch = url.match(/verify-email\/([^?&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        handleVerifyToken(tokenMatch[1]);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, [verificationToken]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      // Call the actual resend verification endpoint
      await authService.resendEmailVerification(email);
      showSuccess('Verification email sent! Please check your inbox and spam folder.');
      
      // Start cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyToken = async (token: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    try {
      const response = await authService.verifyEmail(token);
      if (response.success) {
        setVerificationStatus('verified');
        showSuccess('Email verified successfully! You can now log in.');
        // Auto-navigate to login after a delay
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      } else {
        setVerificationStatus('failed');
        showError('Email verification failed. Please try again or request a new verification email.');
      }
    } catch (error: any) {
      setVerificationStatus('failed');
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Invalid or expired verification token. Please request a new verification email.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualTokenInput = () => {
    Alert.prompt(
      'Enter Verification Code',
      'If you have a verification code from your email, enter it here:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Verify',
          onPress: (token) => {
            if (token && token.trim()) {
              handleVerifyToken(token.trim());
            } else {
              showError('Please enter a valid verification code.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  const handleChangeEmail = () => {
    if (fromRegistration) {
      navigation.goBack();
    } else {
      navigation.navigate('Register');
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📧';
    }
  };

  const getStatusTitle = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Email Verified!';
      case 'failed':
        return 'Verification Failed';
      default:
        return 'Check Your Email';
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Your email has been successfully verified. You will be redirected to login shortly.';
      case 'failed':
        return 'The verification link has expired or is invalid. Please request a new verification email.';
      default:
        return `We've sent a verification link to: ${email}`;
    }
  };

  return (
    <CurvedBackground customColor={Colors.primary} opacity={0.3}>
      <View style={styles.container}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {/* Icon */}
          <View style={[
            styles.iconContainer,
            verificationStatus === 'verified' && styles.successIconContainer,
            verificationStatus === 'failed' && styles.errorIconContainer,
          ]}>
            <Text style={styles.icon}>{getStatusIcon()}</Text>
            {isVerifying && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Header */}
          <Text style={styles.title}>{getStatusTitle()}</Text>
          <Text style={styles.subtitle}>{getStatusMessage()}</Text>

          {verificationStatus === 'pending' && (
            <>
              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionTitle}>Next steps:</Text>
                <View style={styles.instruction}>
                  <Text style={styles.bulletPoint}>1.</Text>
                  <Text style={styles.instructionText}>
                    Check your email inbox (and spam folder)
                  </Text>
                </View>
                <View style={styles.instruction}>
                  <Text style={styles.bulletPoint}>2.</Text>
                  <Text style={styles.instructionText}>
                    Click the verification link in the email
                  </Text>
                </View>
                <View style={styles.instruction}>
                  <Text style={styles.bulletPoint}>3.</Text>
                  <Text style={styles.instructionText}>
                    Or enter the verification code manually below
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <Button
                  title="Enter Verification Code"
                  onPress={handleManualTokenInput}
                  style={[styles.primaryButton, styles.secondaryButton]}
                />

                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    (isResending || resendCooldown > 0) && styles.disabledButton,
                  ]}
                  onPress={handleResendVerification}
                  disabled={isResending || resendCooldown > 0}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.resendText}>
                      {resendCooldown > 0
                        ? `Resend email in ${resendCooldown}s`
                        : 'Resend verification email'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {verificationStatus !== 'pending' && (
            <View style={styles.actionsContainer}>
              <Button
                title="Go to Login"
                onPress={handleGoToLogin}
                style={styles.primaryButton}
              />
            </View>
          )}

          {/* Alternative actions */}
          <View style={styles.alternativeActions}>
            <TouchableOpacity
              style={styles.changeEmailButton}
              onPress={handleChangeEmail}
            >
              <Text style={styles.changeEmailText}>Wrong email address?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeEmailButton}
              onPress={handleGoToLogin}
            >
              <Text style={styles.changeEmailText}>Skip verification for now</Text>
            </TouchableOpacity>
          </View>

          {/* Help text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              💡 Tip: If you don't see the email, check your spam folder or try
              resending the verification email. The verification link will expire in 24 hours.
            </Text>
          </View>
        </Animated.View>
      </View>
    </CurvedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  successIconContainer: {
    backgroundColor: '#10B981',
  },
  errorIconContainer: {
    backgroundColor: '#EF4444',
  },
  icon: {
    fontSize: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  instruction: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 12,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 22,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  resendText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  alternativeActions: {
    alignItems: 'center',
    marginBottom: 24,
  },
  changeEmailButton: {
    paddingVertical: 8,
  },
  changeEmailText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textDecorationLine: 'underline',
  },
  helpContainer: {
    paddingHorizontal: 16,
  },
  helpText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});