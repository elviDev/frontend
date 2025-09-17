import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskPriority, TaskCategory } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskBasicInfoProps {
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  errors: {
    title: string;
    description: string;
  };
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onCategoryChange: (category: TaskCategory) => void;
}

export const TaskBasicInfo: React.FC<TaskBasicInfoProps> = ({
  title,
  description,
  priority,
  category,
  errors,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onCategoryChange,
}) => {

  const handlePriorityChange = (newPriority: TaskPriority) => {
    try {
      if (onPriorityChange && typeof onPriorityChange === 'function') {
        onPriorityChange(newPriority);
      }
    } catch (error) {
      console.error('Error changing priority:', error);
      // Don't rethrow to prevent app crashes
    }
  };

  const handleCategoryChange = (newCategory: TaskCategory) => {
    try {
      if (onCategoryChange && typeof onCategoryChange === 'function') {
        onCategoryChange(newCategory);
      }
    } catch (error) {
      console.error('Error changing category:', error);
      // Don't rethrow to prevent app crashes
    }
  };

  const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent', 'critical'];
  
  const categoryOptions: TaskCategory[] = [
    'general',
    'project',
    'maintenance',
    'emergency',
    'research',
    'approval',
  ];

  return (
    <Animated.View entering={FadeInDown.duration(600)} className="gap-y-8">
      {/* Title Input */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="title" size={20} color="#3B82F6" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Task Title</Text>
            <Text className="text-gray-500 text-sm">
              Give your task a clear, descriptive name
            </Text>
          </View>
        </View>
        <View
          className={`border-2 rounded-2xl p-4 bg-white ${
            errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        >
          <TextInput
            placeholder="e.g., Implement user authentication system"
            value={title}
            onChangeText={onTitleChange}
            className="text-gray-900 text-lg font-medium"
            placeholderTextColor="#9CA3AF"
            style={{ minHeight: 24 }}
          />
        </View>
        {errors.title ? (
          <Animated.Text
            entering={BounceIn}
            className="text-red-500 text-sm mt-2 ml-1"
          >
            {errors.title}
          </Animated.Text>
        ) : null}
      </View>

      {/* Description Input */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="description" size={20} color="#10B981" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Description</Text>
            <Text className="text-gray-500 text-sm">
              Explain what needs to be accomplished
            </Text>
          </View>
        </View>
        <View
          className={`border-2 rounded-2xl p-4 bg-white ${
            errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        >
          <TextInput
            placeholder="Provide detailed information about requirements, context, and expectations..."
            value={description}
            onChangeText={onDescriptionChange}
            className="text-gray-900 text-base"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={{ minHeight: 120 }}
          />
        </View>
        {errors.description ? (
          <Animated.Text
            entering={BounceIn}
            className="text-red-500 text-sm mt-2 ml-1"
          >
            {errors.description}
          </Animated.Text>
        ) : null}
      </View>

      {/* Priority Selection */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-orange-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="priority-high" size={20} color="#F97316" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">
              Priority Level
            </Text>
            <Text className="text-gray-500 text-sm">
              How urgent is this task?
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {priorityOptions.map(p => {
            const isSelected = priority === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => handlePriorityChange(p)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? 'transparent' : '#E5E7EB',
                  backgroundColor: isSelected ? TaskUtils.getPriorityColor(p) : '#F9FAFB',
                  flexDirection: 'row',
                  alignItems: 'center',
                  minWidth: 80,
                  ...(isSelected && {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }),
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: isSelected ? 'white' : TaskUtils.getPriorityColor(p),
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{
                    fontWeight: '600',
                    color: isSelected ? 'white' : '#374151',
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Category Selection */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-purple-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="category" size={20} color="#8B5CF6" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Category</Text>
            <Text className="text-gray-500 text-sm">
              What type of work is this?
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4, paddingBottom: 4 }}>
            {categoryOptions.map(c => {
              const isSelected = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => handleCategoryChange(c)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isSelected ? '#8B5CF6' : '#E5E7EB',
                    backgroundColor: isSelected ? '#8B5CF6' : '#F9FAFB',
                    flexDirection: 'row',
                    alignItems: 'center',
                    minWidth: 120,
                    ...(isSelected && {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }),
                  }}
                >
                  <MaterialIcon
                    name={TaskUtils.getCategoryIcon(c)}
                    size={18}
                    color={isSelected ? 'white' : '#6B7280'}
                  />
                  <Text
                    style={{
                      fontWeight: '500',
                      color: isSelected ? 'white' : '#374151',
                      marginLeft: 8,
                    }}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
};
