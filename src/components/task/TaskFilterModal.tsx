import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { TaskFilter, TaskPriority, TaskStatus } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskFilterModalProps {
  visible: boolean;
  selectedFilter: TaskFilter;
  onClose: () => void;
  onFilterChange: (filter: TaskFilter) => void;
  onClearAll: () => void;
}

export const TaskFilterModal: React.FC<TaskFilterModalProps> = ({
  visible,
  selectedFilter,
  onClose,
  onFilterChange,
  onClearAll,
}) => {
  const handleStatusToggle = (status: TaskStatus) => {
    const currentStatuses = selectedFilter.status || [];
    const isSelected = currentStatuses.includes(status);
    const newStatuses = isSelected
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    onFilterChange({
      ...selectedFilter,
      status: newStatuses,
    });
  };

  const handlePriorityToggle = (priority: TaskPriority) => {
    const currentPriorities = selectedFilter.priority || [];
    const isSelected = currentPriorities.includes(priority);
    const newPriorities = isSelected
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];

    onFilterChange({
      ...selectedFilter,
      priority: newPriorities,
    });
  };

  const statusOptions: TaskStatus[] = [
    'pending',
    'in_progress',
    'review',
    'completed',
    'cancelled',
    'on_hold',
  ];
  const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent', 'critical'];

  // Helper function to get user-friendly status labels
  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case 'in_progress':
        return 'IN PROGRESS';
      case 'on_hold':
        return 'ON HOLD';
      default:
        return status.toUpperCase();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/20 bg-opacity-50 justify-end">
        <View
          className="bg-white rounded-t-3xl p-6"
          style={{ maxHeight: '80%' }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Status
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleStatusToggle(status)}
                    className={`px-4 py-2 rounded-full border ${
                      selectedFilter.status?.includes(status)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedFilter.status?.includes(status)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {getStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Priority
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {priorityOptions.map(priority => (
                  <TouchableOpacity
                    key={priority}
                    onPress={() => handlePriorityToggle(priority)}
                    className={`px-4 py-2 rounded-full border ${
                      selectedFilter.priority?.includes(priority)
                        ? 'border-transparent'
                        : 'bg-white border-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedFilter.priority?.includes(
                        priority,
                      )
                        ? TaskUtils.getPriorityColor(priority)
                        : undefined,
                    }}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedFilter.priority?.includes(priority)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Filter Actions */}
          <View className="flex-row space-x-3 pt-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onClearAll}
              className="flex-1 bg-gray-200 rounded-xl py-3"
            >
              <Text className="text-center text-gray-700 font-semibold">
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-blue-500 rounded-xl py-3"
            >
              <Text className="text-center text-white font-semibold">
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
