import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

export const EmptyState: React.FC = () => {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="items-center mb-8">
        <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
          <MaterialIcon name="chat-bubble-outline" size={32} color="#3B82F6" />
        </View>
        <Text className="text-gray-900 font-bold text-xl mb-2">
          Start the conversation
        </Text>
        <Text className="text-gray-500 text-center text-base leading-6">
          Be the first to share your thoughts and get the discussion going!
        </Text>
      </View>

      <View className="w-full max-w-sm">
        <View className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-lg">
          <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
            <Feather name="message-circle" size={16} color="#10B981" />
          </View>
          <Text className="text-gray-700 text-sm flex-1">
            Share updates, ask questions, or brainstorm ideas
          </Text>
        </View>

        <View className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-lg">
          <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
            <Feather name="paperclip" size={16} color="#8B5CF6" />
          </View>
          <Text className="text-gray-700 text-sm flex-1">
            Attach files, images, or documents to share
          </Text>
        </View>

        <View className="flex-row items-center p-3 bg-gray-50 rounded-lg">
          <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
            <Feather name="users" size={16} color="#F59E0B" />
          </View>
          <Text className="text-gray-700 text-sm flex-1">
            Mention teammates with @ to get their attention
          </Text>
        </View>
      </View>
    </View>
  );
};