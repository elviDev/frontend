import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface FloatingAIButtonProps {
  onPress: () => void;
  bottom?: number;
  right?: number;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
  onPress,
  bottom = 100,
  right = 20,
}) => {
  const pulseAnimation = useSharedValue(0);

  React.useEffect(() => {
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.1]);
    return {
      transform: [{ scale }],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(pulseAnimation.value, [0, 1], [0.3, 0.5]);
    return {
      shadowOpacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom,
          right,
          zIndex: 1000,
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 8,
        },
        shadowStyle,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcon 
              name="smart-toy" 
              size={28} 
              color="white" 
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Ripple effect background */}
      <View
        style={{
          position: 'absolute',
          top: -8,
          left: -8,
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#3B82F6',
          opacity: 0.1,
          zIndex: -1,
        }}
      />
    </Animated.View>
  );
};