import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Voice from '@react-native-voice/voice';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useToast } from '../../contexts/ToastContext';

interface DirectVoiceInputProps {
  onVoiceResult: (transcript: string) => void;
  onError?: (error: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  buttonText?: string;
  size?: 'small' | 'medium' | 'large';
}

export const DirectVoiceInput: React.FC<DirectVoiceInputProps> = ({
  onVoiceResult,
  onError,
  isProcessing = false,
  disabled = false,
  buttonText = 'Voice',
  size = 'medium',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { showError, showInfo } = useToast();
  
  const pulseAnimation = useSharedValue(0);
  
  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.1]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.8, 1]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Size configurations
  const sizeConfig = {
    small: { iconSize: 16, padding: 8, textSize: 'text-xs' },
    medium: { iconSize: 20, padding: 12, textSize: 'text-sm' },
    large: { iconSize: 24, padding: 16, textSize: 'text-base' },
  };

  const config = sizeConfig[size];

  // Voice setup
  useEffect(() => {
    const setupVoice = async () => {
      try {
        if (!Voice) {
          console.log('Voice module not available');
          return;
        }

        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;

        // Check permissions on Android
        if (Platform.OS === 'android') {
          try {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              {
                title: 'Microphone Permission',
                message: 'This app needs access to your microphone for voice input',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              console.log('Microphone permission denied');
            }
          } catch (error) {
            console.log('Permission error:', error);
          }
        }
      } catch (error) {
        console.log('Voice setup error:', error);
      }
    };

    setupVoice();

    return () => {
      try {
        if (Voice) {
          Voice.stop().catch(() => {});
          Voice.cancel().catch(() => {});
          Voice.destroy().catch(() => {});
        }
      } catch (error) {
        console.log('Voice cleanup error:', error);
      }
    };
  }, []);

  const onSpeechStart = () => {
    console.log('Speech started');
    setIsListening(true);
    setTranscript('');
    pulseAnimation.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    showInfo('Listening... Speak now');
  };

  const onSpeechEnd = () => {
    console.log('Speech ended');
    setIsListening(false);
    pulseAnimation.value = withTiming(0);
  };

  const onSpeechResults = (event: any) => {
    console.log('Speech results:', event);
    if (event?.value?.[0]) {
      const result = event.value[0];
      setTranscript(result);
      onVoiceResult(result);
    }
    setIsListening(false);
    pulseAnimation.value = withTiming(0);
  };

  const onSpeechError = (error: any) => {
    console.log('Speech error:', error);
    setIsListening(false);
    pulseAnimation.value = withTiming(0);
    
    // Only show error for meaningful failures, not initialization issues
    const errorCode = error?.error?.code || error?.code;
    const errorMessage = error?.error?.message || error?.message || 'Voice recognition failed';
    
    // Common error codes that shouldn't show user errors:
    // 7 = ERROR_NO_MATCH (no speech detected)
    // 6 = ERROR_SPEECH_TIMEOUT (speech timeout)
    // 5 = ERROR_CLIENT (client side error during init)
    if (errorCode !== 7 && errorCode !== 6 && errorCode !== 5) {
      showError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const startListening = async () => {
    if (isListening || isProcessing || disabled) return;

    try {
      // Check permissions first on Android
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (!hasPermission) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'This app needs access to your microphone for voice input',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            showError('Microphone permission is required for voice input');
            return;
          }
        }
      }

      await Voice.start('en-US');
    } catch (error) {
      console.log('Start error:', error);
      showError('Failed to start voice recognition');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.log('Stop error:', error);
    }
  };

  const getButtonColor = () => {
    if (disabled || isProcessing) return 'bg-gray-300';
    if (isListening) return 'bg-red-500';
    return 'bg-blue-500';
  };

  const getButtonIcon = () => {
    if (isProcessing) return null;
    if (isListening) return 'stop';
    return 'mic';
  };

  return (
    <View className="items-center">
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={isListening ? stopListening : startListening}
          disabled={disabled || isProcessing}
          className={`${getButtonColor()} rounded-full flex-row items-center justify-center`}
          style={{ padding: config.padding }}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialIcon 
              name={getButtonIcon()!} 
              size={config.iconSize} 
              color="white" 
            />
          )}
          
          {buttonText && (
            <Text className={`text-white font-medium ml-2 ${config.textSize}`}>
              {isProcessing ? 'Processing...' : isListening ? 'Listening...' : buttonText}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {/* Transcript Preview */}
      {transcript && (
        <View className="mt-2 px-3 py-2 bg-gray-100 rounded-lg max-w-xs">
          <Text className="text-gray-700 text-sm text-center">{transcript}</Text>
        </View>
      )}
      
      {/* Status Indicator */}
      {isListening && (
        <View className="mt-2 flex-row items-center">
          <View className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <Text className="text-red-500 text-xs ml-2">Recording...</Text>
        </View>
      )}
    </View>
  );
};