import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface EmojiReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  title?: string;
}

const EMOJI_CATEGORIES = {
  'Smileys & People': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯'
  ],
  'Objects & Symbols': [
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋',
    '🖖', '👏', '🙌', '🤝', '👐', '🤲', '🤜', '🤛', '✊', '👊',
    '💪', '🦾', '✍️', '🙏', '🦶', '🦵', '🦿', '💄', '💋',
    '🫦', '🦷', '👅', '👂', '🦻', '👃', '👣', '👀', '🫀'
  ],
  'Work & Projects': [
    '💼', '📊', '📈', '📉', '📋', '📌', '📍', '📎', '🖇️', '📏',
    '📐', '✂️', '🗃️', '🗂️', '📂', '📁', '📄', '📃', '📑', '📜',
    '📰', '🗞️', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚',
    '💻', '🖥️', '🖨️', '⌨️', '🖱️', '💾', '💿', '📞', '☎️', '📱',
    '🔍', '🔎', '💡', '🔦', '🏮', '🪔', '⌚'
  ],
  'Reactions': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
    '💯', '🔥', '⭐', '🌟', '✨', '💫', '⚡', '☄️', '💥', '💢',
    '💨', '💦', '💤', '🕳️', '👥', '👤', '🗣️', '👁️‍🗨️', '🧠', '💭'
  ]
};

export const EmojiReactionPicker: React.FC<EmojiReactionPickerProps> = ({
  visible,
  onClose,
  onEmojiSelect,
  title = "Add Reaction"
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onClose}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            margin: 20,
            maxWidth: 350,
            maxHeight: 500,
          }}
          activeOpacity={1}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-800">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <MaterialIcon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <View key={category} className="mb-4">
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  {category}
                </Text>
                <View className="flex-row flex-wrap">
                  {emojis.map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => {
                        onEmojiSelect(emoji);
                        onClose();
                      }}
                      className="p-2 m-1 bg-gray-50 rounded-lg"
                      style={{ minWidth: 44, alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};