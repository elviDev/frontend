import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '../../utils/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  onFocus,
  onBlur,
  isPassword = false,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const focusAnimation = useSharedValue(0);

  // Determine if this is a password field
  const isPasswordField = isPassword || secureTextEntry;

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [Colors.primary, Colors.primary],
    );

    return {
      borderColor,
      borderWidth: withTiming(focusAnimation.value ? 2 : 1),
    };
  });

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnimation.value = withTiming(1);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnimation.value = withTiming(0);
    onBlur?.(e);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const getEyeIcon = () => {
    return isPasswordVisible ? '🙈' : '👁️';
  };

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text
          style={[
            {
              fontSize: 14,
              color: Colors.text.secondary,
              marginBottom: 8,
              fontWeight: '500',
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          {
            borderRadius: 24,
            backgroundColor: Colors.gray[100],
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'center',
          },
          animatedBorderStyle,
        ]}
      >
        <TextInput
          style={[
            {
              flex: 1,
              paddingHorizontal: 20,
              paddingVertical: 16,
              fontSize: 16,
              color: Colors.text.primary,
              backgroundColor: 'transparent',
            },
            inputStyle,
          ]}
          placeholderTextColor={Colors.text.tertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPasswordField ? !isPasswordVisible : false}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={{
              padding: 16,
              justifyContent: 'center',
              alignItems: 'center',
              minWidth: 48,
            }}
            activeOpacity={0.7}
            accessibilityLabel={
              isPasswordVisible ? 'Hide password' : 'Show password'
            }
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: 20,
                color: Colors.text.secondary,
              }}
            >
              {getEyeIcon()}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <Text
          style={{
            fontSize: 12,
            color: Colors.error,
            marginTop: 4,
            marginLeft: 20,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};