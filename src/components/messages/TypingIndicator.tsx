import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import type { TypingUser } from '../../types/message';

interface TypingIndicatorProps {
  users: TypingUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (users.length > 0) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [users.length, opacity, scale]);

  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].userName} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`;
    } else {
      return `${users[0].userName} and ${users.length - 1} others are typing...`;
    }
  };

  const AnimatedDot = ({ delay }: { delay: number }) => {
    const dotOpacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };

      const timer = setTimeout(animate, delay);
      return () => clearTimeout(timer);
    }, [dotOpacity, delay]);

    return (
      <Animated.View
        style={{ opacity: dotOpacity }}
        className="w-2 h-2 bg-gray-400 rounded-full mx-0.5"
      />
    );
  };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }],
      }}
      className="px-4 py-2"
    >
      <View className="flex-row items-center">
        <View className="w-10 mr-3 items-center">
          <View className="flex-row items-center">
            <AnimatedDot delay={0} />
            <AnimatedDot delay={200} />
            <AnimatedDot delay={400} />
          </View>
        </View>
        <Text className="text-gray-500 text-sm italic">
          {getTypingText()}
        </Text>
      </View>
    </Animated.View>
  );
};