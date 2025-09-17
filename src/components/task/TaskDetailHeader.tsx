import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskDetailHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onEdit: () => void;
  isEditing?: boolean;
  onMore?: () => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onEdit,
  isEditing = false,
  onMore,
}) => {

  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.duration(600)}
      className="bg-white border-b border-gray-200"
    >
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <MaterialIcon name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>

          <View className="flex-1 mx-4">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5">
              {subtitle}
            </Text>
          </View>

          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={onEdit}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isEditing ? 'bg-blue-500' : 'bg-blue-50'
              }`}
            >
              <MaterialIcon 
                name="edit" 
                size={18} 
                color={isEditing ? "white" : "#2563EB"} 
              />
            </TouchableOpacity>
            {onMore && (
              <TouchableOpacity 
                onPress={onMore}
                className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              >
                <MaterialIcon name="more-vert" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};