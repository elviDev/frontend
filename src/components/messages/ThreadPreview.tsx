import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from '../common/Avatar';
import type { ThreadInfo } from '../../types/message';

interface ThreadPreviewProps {
  threadInfo: ThreadInfo;
  onPress: () => void;
}

export const ThreadPreview: React.FC<ThreadPreviewProps> = ({
  threadInfo,
  onPress,
}) => {
  const { replyCount, lastReplyAt, lastReplyBy, participants } = threadInfo;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg"
      style={{
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <MaterialIcon name="forum" size={16} color="#3B82F6" />
            <Text className="ml-1 text-blue-700 font-medium text-sm">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'} in thread
            </Text>
          </View>
          
          {lastReplyAt && lastReplyBy && (
            <Text className="text-blue-600 text-xs">
              Last reply by {lastReplyBy.name} at {format(lastReplyAt, 'HH:mm')}
            </Text>
          )}
        </View>

        {/* Participant Avatars */}
        <View className="flex-row items-center ml-2">
          <View className="flex-row -space-x-1">
            {participants.slice(0, 2).map((participant, index) => (
              <View
                key={participant.id}
                style={{ zIndex: participants.length - index }}
                className="border-2 border-white rounded-full"
              >
                <Avatar
                  user={participant}
                  size="xs"
                />
              </View>
            ))}
            {participants.length > 2 && (
              <View className="w-6 h-6 bg-blue-200 rounded-full border-2 border-white items-center justify-center ml-1">
                <Text className="text-blue-700 text-xs font-semibold">
                  +{participants.length - 2}
                </Text>
              </View>
            )}
          </View>
          <MaterialIcon name="chevron-right" size={16} color="#3B82F6" className="ml-1" />
        </View>
      </View>
    </TouchableOpacity>
  );
};