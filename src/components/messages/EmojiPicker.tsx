import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉',
  '🔥', '⭐', '💯', '✅', '❌', '🤔', '😍', '😊',
  '👏', '🙏', '💪', '🎯', '💡', '⚡', '🚀', '🎨',
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  visible,
  onClose,
  onEmojiSelect,
}) => {
  const handleEmojiPress = (emoji: string) => {
    try {
      console.log('🎭 EmojiPicker: Emoji selected:', emoji);
      onEmojiSelect(emoji);
      onClose();
    } catch (error) {
      console.error('🚨 EmojiPicker: Error selecting emoji:', error);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={onClose}
      >
        <View className="flex-1 justify-center items-center p-4">
          <Pressable
            className="bg-white rounded-2xl p-4 w-full max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-center mb-4">
              React with an emoji
            </Text>
            
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="max-h-64"
            >
              <View className="flex-row flex-wrap justify-center">
                {COMMON_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleEmojiPress(emoji)}
                    className="w-12 h-12 justify-center items-center m-1 rounded-lg bg-gray-50 active:bg-gray-100"
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <TouchableOpacity
              onPress={onClose}
              className="mt-4 bg-gray-200 py-3 rounded-lg"
            >
              <Text className="text-center text-gray-700 font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};