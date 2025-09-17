import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskCreateNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  isLoading?: boolean;
  canGoBack?: boolean;
  buttonScale: any;
  completeText?: string;
}

export const TaskCreateNavigation: React.FC<TaskCreateNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onComplete,
  isLoading = false,
  canGoBack = true,
  buttonScale,
  completeText = 'Create Task',
}) => {
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const isLastStep = currentStep >= totalSteps;

  return (
    <View className="bg-white border-t border-gray-200 p-4 shadow-sm">
      <View className="flex-row justify-between items-center">
        {/* Back button */}
        {canGoBack && currentStep > 1 ? (
          <TouchableOpacity
            onPress={onPrevious}
            className="bg-gray-100 rounded-2xl py-3 px-4 flex-row items-center justify-center"
            style={{ minWidth: 120 }}
          >
            <MaterialIcon name="arrow-back" size={20} color="#6B7280" />
            <Text className="text-gray-700 font-semibold text-base ml-2">
              Previous
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}

        {/* Continue/Complete button */}
        <Animated.View style={[animatedButtonStyle, { minWidth: 150 }]}>
          {isLastStep ? (
            <TouchableOpacity
              onPress={onComplete}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isLoading ? ['#9CA3AF', '#6B7280'] : ['#16A34A', '#15803D']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-2xl py-3 px-5 flex-row items-center justify-center"
                style={{
                  borderRadius: 12,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcon name="check-circle" size={22} color="white" />
                )}
                <Text className="text-white font-bold text-base ml-2">
                  {isLoading ? (completeText === 'Update Task' ? 'Updating...' : 'Creating...') : completeText}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onNext} activeOpacity={0.8}>
              <LinearGradient
                colors={['#3933C6', '#A05FFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 12,
                }}
                className="rounded-2xl py-3 px-5 flex-row items-center justify-center"
              >
                <Text className="text-white font-bold text-base mr-2">
                  Continue
                </Text>
                <MaterialIcon name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
  );
};
