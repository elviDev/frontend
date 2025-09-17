import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskOverviewCardProps {
  task: Task;
  onStatusPress: () => void;
  onPriorityPress: () => void;
}

export const TaskOverviewCard: React.FC<TaskOverviewCardProps> = ({
  task,
  onStatusPress,
  onPriorityPress,
}) => {

  return (
    <Animated.View
      entering={FadeInUp.delay(200).duration(600)}
      className="bg-white mx-6 mt-6 rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      {/* Category Badge */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="bg-blue-50 px-3 py-1.5 rounded-full flex-row items-center">
          <MaterialIcon 
            name={TaskUtils.getCategoryIcon(task.category!)} 
            size={14} 
            color="#2563EB" 
          />
          <Text className="text-blue-700 text-xs font-semibold ml-1.5 uppercase tracking-wide">
            {task.category}
          </Text>
        </View>
        
        {/* Creation Info */}
        <View className="flex-row items-center">
          <MaterialIcon name="schedule" size={12} color="#9CA3AF" />
          <Text className="text-gray-400 text-xs ml-1">
            {TaskUtils.formatTimeAgo(task.createdAt)}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
        {task.title}
      </Text>

      {/* Description */}
      <Text className="text-gray-600 text-base leading-relaxed mb-6">
        {task.description}
      </Text>

      {/* Status Row */}
      <View className="flex-row gap-4">
        {/* Status */}
        <TouchableOpacity
          onPress={onStatusPress}
          className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200"
        >
          <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
            Status
          </Text>
          <View className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: TaskUtils.getStatusColor(task.status) }}
            />
            <Text className="text-gray-900 font-semibold text-sm">
              {task.status.replace('-', ' ')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Priority */}
        <TouchableOpacity
          onPress={onPriorityPress}
          className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200"
        >
          <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
            Priority
          </Text>
          <View className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: TaskUtils.getPriorityColor(task.priority) }}
            />
            <Text className="text-gray-900 font-semibold text-sm capitalize">
              {task.priority}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};