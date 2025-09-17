import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskSubtask } from '../../types/task.types';

interface TaskSubtasksCardProps {
  subtasks: TaskSubtask[];
  onToggleSubtask: (subtaskId: string) => void;
  onAddSubtask?: () => void;
}

export const TaskSubtasksCard: React.FC<TaskSubtasksCardProps> = ({
  subtasks,
  onToggleSubtask,
  onAddSubtask,
}) => {
  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <Animated.View
      entering={FadeInUp.delay(500).duration(600)}
      className="bg-white mx-6 mt-4 rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-lg font-bold text-gray-900">
          Subtasks ({completedCount}/{subtasks.length})
        </Text>
        {onAddSubtask && (
          <TouchableOpacity 
            onPress={onAddSubtask}
            className="w-8 h-8 bg-green-50 rounded-full items-center justify-center"
          >
            <MaterialIcon name="add" size={16} color="#16A34A" />
          </TouchableOpacity>
        )}
      </View>

      <View className="space-y-4">
        {subtasks.map((subtask, index) => (
          <Animated.View
            key={subtask.id}
            entering={FadeInRight.delay(index * 100).duration(400)}
            className="flex-row items-center"
          >
            <TouchableOpacity
              onPress={() => onToggleSubtask(subtask.id)}
              className={`w-6 h-6 rounded-lg mr-4 items-center justify-center border-2 ${
                subtask.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {subtask.completed && (
                <MaterialIcon name="check" size={14} color="white" />
              )}
            </TouchableOpacity>

            <Text
              className={`flex-1 text-base ${
                subtask.completed
                  ? 'text-gray-400 line-through'
                  : 'text-gray-900'
              }`}
            >
              {subtask.title}
            </Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};