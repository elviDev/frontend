import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskPriority } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskPriorityModalProps {
  visible: boolean;
  currentPriority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
  onClose: () => void;
}

export const TaskPriorityModal: React.FC<TaskPriorityModalProps> = ({
  visible,
  currentPriority,
  onPriorityChange,
  onClose,
}) => {
  const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center px-6">
        <Animated.View
          entering={FadeInUp.duration(400)}
          className="bg-white rounded-2xl p-6"
        >
          <Text className="text-xl font-bold text-gray-900 mb-6">
            Update Priority
          </Text>
          
          <View className="space-y-3">
            {priorityOptions.map(priority => (
              <TouchableOpacity
                key={priority}
                onPress={() => onPriorityChange(priority)}
                className={`flex-row items-center p-4 rounded-xl ${
                  currentPriority === priority ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                }`}
              >
                <View
                  className="w-4 h-4 rounded-full mr-4"
                  style={{ backgroundColor: TaskUtils.getPriorityColor(priority) }}
                />
                <Text className="flex-1 text-gray-900 font-medium capitalize">
                  {priority}
                </Text>
                {currentPriority === priority && (
                  <MaterialIcon name="check" size={18} color="#EA580C" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="mt-6 bg-gray-100 rounded-xl py-4"
          >
            <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};