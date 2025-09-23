import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

export const ThreadEmptyState: React.FC = () => {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="items-center mb-6">
        <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
          <MaterialIcon name="forum" size={24} color="#3B82F6" />
        </View>
        <Text className="text-gray-900 font-bold text-lg mb-2">
          No replies yet
        </Text>
        <Text className="text-gray-500 text-center text-base leading-6">
          Start a conversation by adding the first reply to this thread.
        </Text>
      </View>

      <View className="w-full max-w-sm">
        <View className="flex-row items-center mb-3 p-3 bg-gray-50 rounded-lg">
          <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
            <Feather name="corner-up-left" size={16} color="#10B981" />
          </View>
          <Text className="text-gray-700 text-sm flex-1">
            Reply directly to the original message
          </Text>
        </View>

        <View className="flex-row items-center p-3 bg-gray-50 rounded-lg">
          <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
            <Feather name="message-square" size={16} color="#8B5CF6" />
          </View>
          <Text className="text-gray-700 text-sm flex-1">
            Keep discussions organized in threads
          </Text>
        </View>
      </View>
    </View>
  );
};