import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'small',
  color = '#3B82F6',
  text,
}) => {
  return (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text className="text-gray-500 text-sm mt-2">{text}</Text>
      )}
    </View>
  );
};