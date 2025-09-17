import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskProgressCardProps {
  task: Task;
  formatDueDate: (date: Date) => string;
}

export const TaskProgressCard: React.FC<TaskProgressCardProps> = ({
  task,
  formatDueDate,
}) => {
  const progressPercentage = task.progress || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10B981';
    if (progress >= 60) return '#3B82F6';  
    if (progress >= 40) return '#F59E0B';
    if (progress >= 20) return '#EF4444';
    return '#6B7280';
  };

  const getProgressIcon = (progress: number) => {
    if (progress === 100) return 'check-circle';
    if (progress >= 75) return 'trending-up';
    if (progress >= 50) return 'schedule';
    if (progress >= 25) return 'hourglass-empty';
    return 'play-circle-outline';
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(300).duration(600)}
      className="bg-white rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      {/* Header with Progress */}
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center">
          <MaterialIcon 
            name={getProgressIcon(progressPercentage)} 
            size={20} 
            color={getProgressColor(progressPercentage)}
            style={{ marginRight: 8 }}
          />
          <Text className="text-lg font-bold text-gray-900">Progress</Text>
        </View>
        <View className="items-end">
          <Text 
            className="text-2xl font-bold"
            style={{ color: getProgressColor(progressPercentage) }}
          >
            {progressPercentage}%
          </Text>
          {progressPercentage === 100 && (
            <Text className="text-xs text-green-600 font-medium">Complete!</Text>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View className="bg-gray-200 h-3 rounded-full mb-5 overflow-hidden">
        <Animated.View
          entering={ZoomIn.delay(500).duration(800)}
          className="h-full rounded-full"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: getProgressColor(progressPercentage),
          }}
        />
      </View>

      {/* Progress Details */}
      <View className="space-y-3">
        {/* Subtasks Progress */}
        {totalSubtasks > 0 && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcon name="task-alt" size={16} color="#6B7280" />
              <Text className="text-gray-500 text-sm ml-2">Subtasks</Text>
            </View>
            <Text className="text-gray-900 font-semibold text-sm">
              {completedSubtasks} of {totalSubtasks}
            </Text>
          </View>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcon name="schedule" size={16} color="#6B7280" />
              <Text className="text-gray-500 text-sm ml-2">Due Date</Text>
            </View>
            <Text className="text-gray-900 font-semibold text-sm">
              {formatDueDate(task.dueDate)}
            </Text>
          </View>
        )}

        {/* Time Tracking */}
        {(task.estimatedHours || task.actualHours) && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcon name="access-time" size={16} color="#6B7280" />
              <Text className="text-gray-500 text-sm ml-2">Time</Text>
            </View>
            <Text className="text-gray-900 font-semibold text-sm">
              {task.actualHours || 0}h / {task.estimatedHours || 0}h
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};