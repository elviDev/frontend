import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskAssignee } from '../../types/task.types';
import { Avatar } from '../common/Avatar';

interface TaskAssigneesCardProps {
  assignees: TaskAssignee[];
  onAddAssignee: () => void;
  onAssigneePress?: (assigneeId: string) => void;
}

export const TaskAssigneesCard: React.FC<TaskAssigneesCardProps> = ({
  assignees,
  onAddAssignee,
  onAssigneePress,
}) => {
  return (
    <Animated.View
      entering={FadeInUp.delay(400).duration(600)}
      className="bg-white mx-6 mt-4 rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900">Team Members</Text>
        <TouchableOpacity
          onPress={onAddAssignee}
          className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center"
        >
          <MaterialIcon name="add" size={16} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View className="gap-4">
        {assignees.map((assignee, index) => (
          <TouchableOpacity
            key={assignee.id}
            onPress={() => onAssigneePress?.(assignee.id)}
            activeOpacity={0.7}
          >
            <Animated.View
              entering={SlideInRight.delay(index * 100).duration(600)}
              className="flex-row items-center"
            >

              <Avatar user={assignee} size="md"  />

              <View className="flex-1 ml-2">
                <Text className="text-gray-900 font-semibold text-base">
                  {assignee.name}
                </Text>
                <Text className="text-gray-500 text-sm">{assignee.role}</Text>
              </View>
              <View className="w-2 h-2 bg-green-400 rounded-full" />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};