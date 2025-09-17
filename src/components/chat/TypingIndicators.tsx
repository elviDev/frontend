import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';

interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface TypingIndicatorsProps {
  typingUsers: TypingUser[];
  replyingTo?: {
    messageId: string;
    parentUser: string;
  } | null;
}

export const TypingIndicators: React.FC<TypingIndicatorsProps> = ({
  typingUsers,
  replyingTo,
}) => {
  const [dotAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (typingUsers.length > 0) {
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
  }, [typingUsers.length]);

  const renderTypingText = () => {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map(user => user.userName);
    
    let text = '';
    if (names.length === 1) {
      text = `${names[0]} is typing`;
    } else if (names.length === 2) {
      text = `${names[0]} and ${names[1]} are typing`;
    } else if (names.length === 3) {
      text = `${names[0]}, ${names[1]}, and ${names[2]} are typing`;
    } else {
      text = `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing`;
    }

    if (replyingTo) {
      text += ` in reply to ${replyingTo.parentUser}`;
    }

    return text;
  };

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <View className="px-4 py-2 bg-gray-50">
      <View className="flex-row items-center">
        <View className="flex-row items-center mr-2">
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              className="w-2 h-2 bg-gray-400 rounded-full mx-0.5"
              style={{
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
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