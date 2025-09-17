import React from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../utils/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Gradient Text Component for secondary buttons
const GradientText: React.FC<{
  children: string;
  style?: TextStyle | TextStyle[];
}> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={['#3933C6', '#A05FFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 4 }}
    >
      <Text style={[style, { backgroundColor: 'transparent', color: 'white' }]}>
        {children}
      </Text>
    </LinearGradient>
  );
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    opacity.value = withTiming(0.8);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1);
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    const sizeStyles = {
      small: { paddingVertical: 8, paddingHorizontal: 16 },
      medium: { paddingVertical: 16, paddingHorizontal: 24 },
      large: { paddingVertical: 20, paddingHorizontal: 32 },
    };

    const variantStyles = {
      primary: {
        // backgroundColor removed since we're using gradient
        shadowColor: '#3933C6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
      secondary: {
        backgroundColor: 'transparent',
        // Remove border since we'll use gradient border
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && { opacity: 0.5 }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles = {
      primary: { color: Colors.text.inverse },
      secondary: { color: 'transparent' }, // Will be overridden by gradient
      outline: { color: Colors.primary },
      ghost: { color: Colors.primary },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, variant !== 'primary' && variant !== 'secondary' ? getButtonStyle() : null, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {variant === 'primary' ? (
        <AnimatedLinearGradient
          colors={['#3933C6', '#A05FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[getButtonStyle()]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} size="small" />
          ) : (
            <>
              {icon}
              <Text style={[getTextStyle(), textStyle, icon ? { marginLeft: 8 } : null]}>
                {title}
              </Text>
            </>
          )}
        </AnimatedLinearGradient>
      ) : variant === 'secondary' ? (
        <LinearGradient
          colors={['#3933C6', '#A05FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[getButtonStyle(), { padding: 2 }]}
        >
          <View style={[getButtonStyle(), { backgroundColor: 'white', margin: 0, padding: 0 }]}>
            {loading ? (
              <ActivityIndicator color="#3933C6" size="small" />
            ) : (
              <>
                {icon}
                <GradientText style={{
                  ...getTextStyle(),
                  ...textStyle,
                  ...(icon ? { marginLeft: 8 } : {})
                }}>
                  {title}
                </GradientText>
              </>
            )}
          </View>
        </LinearGradient>
      ) : (
        <>
          {loading ? (
            <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.text.inverse} size="small" />
          ) : (
            <>
              {icon}
              <Text style={[getTextStyle(), textStyle, icon ? { marginLeft: 8 } : null]}>
                {title}
              </Text>
            </>
          )}
        </>
      )}
    </AnimatedTouchableOpacity>
  );
};