import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskCreateHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export const TaskCreateHeader: React.FC<TaskCreateHeaderProps> = ({
  title,
  subtitle,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.duration(600)}
      className="bg-white border-b border-gray-200"
      style={{ paddingTop: insets.top }}
    >
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <MaterialIcon name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>

          <View className="flex-1 mx-4">
            <Text className="text-xl font-bold text-gray-900">{title}</Text>
            <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>
          </View>

          <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
            <Text className="text-blue-600 font-bold text-sm">
              {currentStep}/{totalSteps}
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View className="flex-row space-x-2">
          {Array.from({ length: totalSteps }, (_, index) => (
            <View
              key={index}
              className={`flex-1 h-1 rounded-full ${
                index < currentStep
                  ? 'bg-blue-500'
                  : index === currentStep - 1
                  ? 'bg-blue-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};