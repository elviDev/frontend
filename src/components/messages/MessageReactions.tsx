import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { ReactionPicker } from './ReactionPicker';
import type { MessageReaction } from '../../types/message';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReactionPress: (emoji: string) => void;
  currentUserId: string;
  popularEmojis?: string[];
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionPress,
  currentUserId,
  popularEmojis,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const hasReactions = reactions.length > 0;

  return (
    <>
      <View className="mt-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <View className="flex-row items-center">
            {/* Existing Reactions */}
            {reactions.map((reaction, index) => {
              const hasUserReacted = reaction.users.some(user => user.id === currentUserId);
              
              return (
                <TouchableOpacity
                  key={`reaction-${reaction.emoji}-${reaction.count}-${index}`}
                  onPress={() => onReactionPress(reaction.emoji)}
                  className={`
                    flex-row items-center px-2 py-1 rounded-full border mr-1
                    ${hasUserReacted 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                    }
                  `}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <Text className="text-base mr-1">{reaction.emoji}</Text>
                  <Text 
                    className={`text-sm font-medium ${
                      hasUserReacted ? 'text-blue-700' : 'text-gray-600'
                    }`}
                  >
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add Reaction Button */}
            <TouchableOpacity
              onPress={() => setShowReactionPicker(true)}
              className="w-8 h-8 items-center justify-center bg-gray-100 border border-gray-200 rounded-full ml-1"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <MaterialIcon name="add" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Reaction Picker Modal */}
      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
        onSelectEmoji={onReactionPress}
        popularEmojis={popularEmojis}
      />
    </>
  );
};