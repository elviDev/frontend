import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskTimelineProps {
  startDate: Date;
  endDate: Date;
  estimatedHours: string;
  tags: string[];
  errors: {
    endDate: string;
  };
  onStartDatePress: () => void;
  onEndDatePress: () => void;
  onEstimatedHoursChange: (text: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  startDate,
  endDate,
  estimatedHours,
  tags,
  errors,
  onStartDatePress,
  onEndDatePress,
  onEstimatedHoursChange,
  onAddTag,
  onRemoveTag,
}) => {
  const [tagInput, setTagInput] = React.useState('');

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onAddTag(tag);
      setTagInput('');
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(600)} className="gap-8 flex-col">
      {/* Date Selection */}
      <View className="flex-row gap-4">
        {/* Start Date */}
        <View className="flex-1">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center mr-2">
              <MaterialIcon name="play-arrow" size={16} color="#10B981" />
            </View>
            <Text className="text-gray-900 font-bold text-base">Start Date</Text>
          </View>
          <TouchableOpacity
            onPress={onStartDatePress}
            className="border-2 border-gray-200 rounded-xl p-3 bg-white flex-row items-center"
          >
            <MaterialIcon name="calendar-today" size={18} color="#6B7280" />
            <Text className="text-gray-700 ml-2 flex-1 font-medium">
              {startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Date */}
        <View className="flex-1">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-red-100 rounded-lg items-center justify-center mr-2">
              <MaterialIcon name="flag" size={16} color="#EF4444" />
            </View>
            <Text className="text-gray-900 font-bold text-base">Due Date</Text>
          </View>
          <TouchableOpacity
            onPress={onEndDatePress}
            className={`border-2 rounded-xl p-3 bg-white flex-row items-center ${
              errors.endDate ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <MaterialIcon name="event" size={18} color="#6B7280" />
            <Text className="text-gray-700 ml-2 flex-1 font-medium">
              {endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {errors.endDate ? (
            <Text className="text-red-500 text-sm mt-1">{errors.endDate}</Text>
          ) : null}
        </View>
      </View>

      {/* Estimated Hours */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-yellow-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="schedule" size={20} color="#F59E0B" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Estimated Hours</Text>
            <Text className="text-gray-500 text-sm">How long do you expect this to take?</Text>
          </View>
        </View>
        <View className="border-2 border-gray-200 rounded-xl p-4 bg-white">
          <TextInput
            placeholder="e.g., 40"
            value={estimatedHours}
            onChangeText={onEstimatedHoursChange}
            className="text-gray-900 text-lg font-medium"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Tags */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-indigo-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="label" size={20} color="#6366F1" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Tags</Text>
            <Text className="text-gray-500 text-sm">Add labels to help organize this task</Text>
          </View>
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 border-2 border-gray-200 rounded-xl p-3 bg-white mr-3">
            <TextInput
              placeholder="Enter a tag..."
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              className="text-gray-900 text-base"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            onPress={handleAddTag}
            className="bg-indigo-600 rounded-xl px-4 justify-center"
          >
            <MaterialIcon name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {tags.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Animated.View
                key={index}
                entering={ZoomIn.delay(index * 100)}
                className="bg-indigo-100 rounded-full px-3 py-2 flex-row items-center"
              >
                <Text className="text-indigo-700 font-medium">#{tag}</Text>
                <TouchableOpacity
                  onPress={() => onRemoveTag(tag)}
                  className="ml-2 w-5 h-5 bg-indigo-200 rounded-full items-center justify-center"
                >
                  <MaterialIcon name="close" size={12} color="#6366F1" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};