import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskStatus } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskStatusModalProps {
  visible: boolean;
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  onClose: () => void;
}

export const TaskStatusModal: React.FC<TaskStatusModalProps> = ({
  visible,
  currentStatus,
  onStatusChange,
  onClose,
}) => {
  const statusOptions: TaskStatus[] = [
    'pending',
    'in-progress',
    'completed',
    'on-hold',
    'cancelled'
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center px-6">
        <Animated.View
          entering={FadeInUp.duration(400)}
          className="bg-white rounded-2xl p-6"
        >
          <Text className="text-xl font-bold text-gray-900 mb-6">
            Update Status
          </Text>
          
          <View className="space-y-3">
            {statusOptions.map(status => (
              <TouchableOpacity
                key={status}
                onPress={() => onStatusChange(status)}
                className={`flex-row items-center p-4 rounded-xl ${
                  currentStatus === status ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <View
                  className="w-4 h-4 rounded-full mr-4"
                  style={{ backgroundColor: TaskUtils.getStatusColor(status) }}
                />
                <Text className="flex-1 text-gray-900 font-medium capitalize">
                  {status.replace('-', ' ')}
                </Text>
                {currentStatus === status && (
                  <MaterialIcon name="check" size={18} color="#2563EB" />
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