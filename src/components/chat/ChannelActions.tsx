import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

interface ChannelActionsProps {
  onGenerateSummary: () => void;
  onCreateTasks: () => void;
  isGeneratingSummary?: boolean;
  isCreatingTasks?: boolean;
}

export const ChannelActions: React.FC<ChannelActionsProps> = ({
  onGenerateSummary,
  onCreateTasks,
  isGeneratingSummary = false,
  isCreatingTasks = false,
}) => {
  const summaryScale = useSharedValue(1);
  const tasksScale = useSharedValue(1);

  const summaryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: summaryScale.value }],
  }));

  const tasksAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tasksScale.value }],
  }));

  return (
    <View className="bg-gray-50 px-6 py-3">
      <View className="flex-row items-center mb-2">
        <MaterialIcon name="auto-awesome" size={16} color="#8B5CF6" />
        <Text className="text-gray-600 text-xs font-semibold uppercase tracking-wider ml-2">
          AI Assistant
        </Text>
      </View>
      
      <View className="flex-row space-x-3">
        {/* Generate Summary Button */}
        <Animated.View style={[summaryAnimatedStyle, { flex: 1 }]}>
          <TouchableOpacity
            onPress={onGenerateSummary}
            disabled={isGeneratingSummary}
            className={`bg-white border-2 ${isGeneratingSummary ? 'border-purple-200 bg-purple-50' : 'border-purple-100'} rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm`}
          >
            <MaterialIcon 
              name={isGeneratingSummary ? "hourglass-empty" : "auto-stories"} 
              size={18} 
              color={isGeneratingSummary ? "#A855F7" : "#8B5CF6"}
            />
            <Text className={`${isGeneratingSummary ? 'text-purple-600' : 'text-purple-700'} text-sm font-semibold ml-2`}>
              {isGeneratingSummary ? 'Summarizing...' : 'Summarize'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Create Tasks Button */}
        <Animated.View style={[tasksAnimatedStyle, { flex: 1 }]}>
          <TouchableOpacity
            onPress={onCreateTasks}
            disabled={isCreatingTasks}
            className={`bg-white border-2 ${isCreatingTasks ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-100'} rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm`}
          >
            <MaterialIcon 
              name={isCreatingTasks ? "hourglass-empty" : "checklist"} 
              size={18} 
              color={isCreatingTasks ? "#10B981" : "#059669"}
            />
            <Text className={`${isCreatingTasks ? 'text-emerald-600' : 'text-emerald-700'} text-sm font-semibold ml-2`}>
              {isCreatingTasks ? 'Creating...' : 'Create Tasks'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};