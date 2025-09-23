import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  popularEmojis?: string[];
}

// Default emoji categories with popular emojis
const DEFAULT_EMOJIS = {
  recent: ['👍', '❤️', '😂', '😊', '🎉', '👏'],
  smileys: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  ],
  gestures: [
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
    '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝',
  ],
  hearts: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
    '💘', '💝', '💟', '♥️', '💯', '🔥', '⭐', '🌟',
  ],
  activities: [
    '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁',
    '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⚽', '🏀',
    '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
  ],
};

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onClose,
  onSelectEmoji,
  popularEmojis = DEFAULT_EMOJIS.recent,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState('recent');

  const categories = [
    { key: 'recent', label: 'Recent', emojis: popularEmojis },
    { key: 'smileys', label: 'Smileys', emojis: DEFAULT_EMOJIS.smileys },
    { key: 'gestures', label: 'Gestures', emojis: DEFAULT_EMOJIS.gestures },
    { key: 'hearts', label: 'Hearts', emojis: DEFAULT_EMOJIS.hearts },
    { key: 'activities', label: 'Activities', emojis: DEFAULT_EMOJIS.activities },
  ];

  const handleEmojiSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    onClose();
  };

  const currentEmojis = categories.find(c => c.key === selectedCategory)?.emojis || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onClose}
      >
        <View className="flex-1 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl shadow-2xl">
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                <Text className="text-lg font-semibold text-gray-900">
                  Add Reaction
                </Text>
                <TouchableOpacity onPress={onClose} className="p-1">
                  <MaterialIcon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Quick Reactions */}
              <View className="p-4 border-b border-gray-100">
                <Text className="text-sm font-medium text-gray-700 mb-3">
                  Quick Reactions
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
                >
                  {popularEmojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleEmojiSelect(emoji)}
                      className="w-12 h-12 items-center justify-center bg-gray-50 rounded-xl mr-3"
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Category Tabs */}
              <View className="flex-row border-b border-gray-100">
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.key}
                      onPress={() => setSelectedCategory(category.key)}
                      className={`px-4 py-3 border-b-2 ${
                        selectedCategory === category.key
                          ? 'border-blue-500'
                          : 'border-transparent'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        selectedCategory === category.key
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Emoji Grid */}
              <View className="p-4" style={{ maxHeight: 300 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap justify-between">
                    {currentEmojis.map((emoji, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleEmojiSelect(emoji)}
                        className="w-12 h-12 items-center justify-center rounded-lg mb-2"
                        style={{ width: '12.5%' }}
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};