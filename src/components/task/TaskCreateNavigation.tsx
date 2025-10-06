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
    <View style={{
      backgroundColor: 'white',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Back button */}
        {canGoBack && currentStep > 1 ? (
          <TouchableOpacity
            onPress={onPrevious}
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 120,
            }}
          >
            <MaterialIcon name="arrow-back" size={20} color="#6B7280" />
            <Text style={{
              color: '#374151',
              fontWeight: '600',
              fontSize: 16,
              marginLeft: 8,
            }}>
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
                style={{
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcon name="check-circle" size={22} color="white" />
                )}
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 16,
                  marginLeft: 8,
                }}>
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
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 16,
                  marginRight: 8,
                }}>
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
