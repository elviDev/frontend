import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import { Task, TaskStatus } from '../../types/task.types';
import { TaskCard } from './TaskCard';
import { TaskUtils } from './TaskUtils';

interface TaskBoardViewProps {
  filteredTasks: Task[];
  onTaskPress: (task: Task) => void;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  filteredTasks,
  onTaskPress,
}) => {
  const statusColumns: TaskStatus[] = ['pending', 'in_progress', 'completed'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
    >
      {statusColumns.map((status, columnIndex) => {
        const columnTasks = filteredTasks.filter(task => task.status === status);
        
        return (
          <Animated.View
            key={status}
            entering={FadeInRight.delay(columnIndex * 100).duration(600)}
            className="w-80 mr-4"
          >
            {/* Column Header */}
            <View className="bg-white rounded-t-2xl p-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: TaskUtils.getStatusColor(status) }}
                  />
                  <Text className="text-lg font-bold text-gray-900">
                    {status.replace('-', ' ').toUpperCase()}
                  </Text>
                </View>
                <View className="bg-gray-100 rounded-full px-2 py-1">
                  <Text className="text-gray-600 text-sm font-medium">
                    {columnTasks.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Column Tasks */}
            <ScrollView
              className="bg-gray-50 rounded-b-2xl"
              style={{ minHeight: 400, maxHeight: 600 }}
              showsVerticalScrollIndicator={false}
            >
              {columnTasks.map((task, index) => (
                <View key={task.id} className="mx-3">
                  <TaskCard
                    task={task}
                    index={index}
                    onPress={onTaskPress}
                    viewMode="board"
                  />
                </View>
              ))}

              {columnTasks.length === 0 && (
                <View className="items-center justify-center py-8">
                  <Feather name="plus-circle" size={24} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-2">
                    No tasks
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};