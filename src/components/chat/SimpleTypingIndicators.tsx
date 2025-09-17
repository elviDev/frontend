import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';

interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
  lastTypingTime?: number;
}

interface SimpleTypingIndicatorsProps {
  typingUsers: TypingUser[];
  currentUserId?: string;
}

export const SimpleTypingIndicators: React.FC<SimpleTypingIndicatorsProps> = ({
  typingUsers,
  currentUserId = 'current_user',
}) => {
  const [dotAnimation] = useState(new Animated.Value(0));

  // Filter out current user and only show typing users
  const activeTypingUsers = typingUsers.filter(
    user => user.isTyping && user.userId !== currentUserId
  );

  useEffect(() => {
    if (activeTypingUsers.length > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [activeTypingUsers.length]);

  if (activeTypingUsers.length === 0) {
    return null;
  }

  const renderTypingText = () => {
    const names = activeTypingUsers.map(user => user.userName);
    
    if (names.length === 1) {
      return `${names[0]} is typing`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing`;
    } else if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing`;
    } else {
      return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing`;
    }
  };

  return (
    <View className="px-4 py-2 bg-gray-50 border-t border-gray-100">
      <View className="flex-row items-center">
        {/* Animated typing dots */}
        <View className="flex-row items-center mr-2">
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              className="w-1.5 h-1.5 bg-gray-500 rounded-full mx-0.5"
              style={{
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
                transform: [
                  {
                    scale: dotAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 0.8],
                    }),
                  },
                ],
              }}
            />
          ))}
        </View>
        <Text className="text-gray-600 text-sm italic">
          {renderTypingText()}
        </Text>
      </View>
    </View>
  );
};