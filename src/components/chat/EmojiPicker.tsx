import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);

  const slideY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    slideY.value = withSpring(0, { damping: 15 });
    backdropOpacity.value = withTiming(0.5, { duration: 300 });
  }, []);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const emojiCategories = [
    {
      name: '😊 Smileys',
      emojis: [
        '😀',
        '😃',
        '😄',
        '😁',
        '😅',
        '😂',
        '🤣',
        '😊',
        '😇',
        '🙂',
        '😉',
        '😌',
        '😍',
        '🥰',
        '😘',
        '😗',
        '😙',
        '😚',
        '😋',
        '😛',
        '😝',
        '😜',
        '🤪',
        '🤨',
        '🧐',
        '🤓',
        '😎',
        '🤩',
        '🥳',
        '😏',
        '😒',
        '😞',
        '😔',
        '😟',
        '😕',
        '🙁',
        '☹️',
        '😣',
        '😖',
        '😫',
        '😩',
        '🥺',
        '😢',
        '😭',
        '😤',
        '😠',
        '😡',
        '🤬',
        '🤯',
        '😳',
        '🥵',
        '🥶',
        '😱',
        '😨',
        '😰',
        '😥',
        '😓',
      ],
    },
    {
      name: '👍 Gestures',
      emojis: [
        '👍',
        '👎',
        '👌',
        '🤏',
        '✌️',
        '🤞',
        '🤟',
        '🤘',
        '🤙',
        '👈',
        '👉',
        '👆',
        '🖕',
        '👇',
        '☝️',
        '👋',
        '🤚',
        '🖐',
        '✋',
        '🖖',
        '👏',
        '🙌',
        '🤲',
        '🤝',
        '🙏',
        '✍️',
        '💅',
        '🤳',
        '💪',
        '🦾',
        '🦿',
        '🦵',
        '🦶',
        '👂',
        '🦻',
        '👃',
        '🧠',
        '🫀',
        '🫁',
        '🦷',
        '🦴',
        '👀',
        '👁',
        '👅',
        '👄',
      ],
    },
    {
      name: '❤️ Hearts',
      emojis: [
        '❤️',
        '🧡',
        '💛',
        '💚',
        '💙',
        '💜',
        '🖤',
        '🤍',
        '🤎',
        '💔',
        '❣️',
        '💕',
        '💞',
        '💓',
        '💗',
        '💖',
        '💘',
        '💝',
        '💟',
        '♥️',
        '💌',
        '💤',
        '💢',
        '💣',
        '💥',
        '💦',
        '💨',
        '💫',
        '💬',
        '👁️‍🗨️',
        '🗨️',
        '🗯️',
        '💭',
      ],
    },
    {
      name: '🎉 Activities',
      emojis: [
        '⚽',
        '🏀',
        '🏈',
        '⚾',
        '🥎',
        '🎾',
        '🏐',
        '🏉',
        '🥏',
        '🎱',
        '🪀',
        '🏓',
        '🏸',
        '🏒',
        '🏑',
        '🥍',
        '🏏',
        '🪃',
        '🥅',
        '⛳',
        '🪁',
        '🏹',
        '🎣',
        '🤿',
        '🥊',
        '🥋',
        '🎽',
        '🛹',
        '🛷',
        '⛸️',
        '🥌',
        '🎿',
        '⛷️',
        '🏂',
        '🪂',
        '🏋️‍♀️',
        '🏋️',
        '🏋️‍♂️',
        '🤼‍♀️',
        '🤼',
        '🤼‍♂️',
      ],
    },
    {
      name: '🌟 Objects',
      emojis: [
        '💯',
        '💥',
        '💫',
        '💦',
        '💨',
        '🕳️',
        '💬',
        '👁️‍🗨️',
        '🗨️',
        '🗯️',
        '💭',
        '💤',
        '⚡',
        '🔥',
        '💧',
        '🌊',
        '🎆',
        '🎇',
        '✨',
        '🎊',
        '🎉',
        '🎈',
        '🎁',
        '🏆',
        '🥇',
        '🥈',
        '🥉',
        '🏅',
        '🎖️',
        '🏵️',
        '🎗️',
        '🎫',
        '🎟️',
        '🎪',
        '🎭',
        '🩰',
        '🎨',
        '🎬',
        '🎤',
        '🎧',
        '🎼',
        '🎵',
        '🎶',
        '🎹',
        '🥁',
        '🪘',
        '🎷',
        '🎺',
        '🪗',
        '🎸',
        '🪕',
        '🎻',
      ],
    },
    {
      name: '🍎 Food',
      emojis: [
        '🍎',
        '🍐',
        '🍊',
        '🍋',
        '🍌',
        '🍉',
        '🍇',
        '🍓',
        '🫐',
        '🍈',
        '🍒',
        '🍑',
        '🥭',
        '🍍',
        '🥥',
        '🥝',
        '🍅',
        '🍆',
        '🥑',
        '🥦',
        '🥬',
        '🥒',
        '🌶️',
        '🫑',
        '🌽',
        '🥕',
        '🫒',
        '🧄',
        '🧅',
        '🥔',
        '🍠',
        '🥐',
        '🥯',
        '🍞',
        '🥖',
        '🥨',
        '🧀',
        '🥚',
        '🍳',
        '🧈',
        '🥞',
        '🧇',
        '🥓',
        '🥩',
        '🍗',
        '🍖',
        '🦴',
        '🌭',
        '🍔',
        '🍟',
        '🍕',
      ],
    },
    {
      name: '🌍 Nature',
      emojis: [
        '🌍',
        '🌎',
        '🌏',
        '🌐',
        '🗺️',
        '🗾',
        '🧭',
        '🏔️',
        '⛰️',
        '🌋',
        '🗻',
        '🏕️',
        '🏖️',
        '🏜️',
        '🏝️',
        '🏞️',
        '🏟️',
        '🏛️',
        '🏗️',
        '🧱',
        '🪨',
        '🪵',
        '🛖',
        '🏘️',
        '🏚️',
        '🏠',
        '🏡',
        '🏢',
        '🏣',
        '🏤',
        '🏥',
        '🏦',
        '🏨',
        '🏩',
        '🏪',
        '🏫',
        '🏬',
        '🏭',
        '🏯',
        '🏰',
        '🗼',
        '🗽',
        '⛪',
        '🕌',
        '🛕',
        '🕍',
        '⛩️',
        '🕋',
        '⛲',
        '⛺',
        '🌁',
        '🌃',
        '🏙️',
        '🌄',
        '🌅',
        '🌆',
        '🌇',
        '🌉',
        '♨️',
      ],
    },
    {
      name: '🚗 Travel',
      emojis: [
        '🚗',
        '🚕',
        '🚙',
        '🚌',
        '🚎',
        '🏎️',
        '🚓',
        '🚑',
        '🚒',
        '🚐',
        '🛻',
        '🚚',
        '🚛',
        '🚜',
        '🏍️',
        '🛵',
        '🚲',
        '🛴',
        '🛹',
        '🛼',
        '🚁',
        '🛸',
        '✈️',
        '🛩️',
        '🛫',
        '🛬',
        '🪂',
        '💺',
        '🚀',
        '🛰️',
        '🚢',
        '⛵',
        '🚤',
        '🛥️',
        '🛳️',
        '⛴️',
        '🚧',
        '⛽',
        '🚨',
        '🚥',
        '🚦',
        '🛑',
        '🚏',
        '⚓',
        '🚪',
        '🛗',
        '🚇',
        '🚈',
        '🚉',
        '🚊',
        '🚝',
        '🚞',
        '🚋',
        '🚃',
        '🚂',
        '🚄',
        '🚅',
        '🚆',
      ],
    },
  ];

  const recentEmojis = ['😊', '👍', '❤️', '😂', '🔥', '💯', '🎉', '👏'];

  const getFilteredEmojis = () => {
    if (!searchQuery) {
      return selectedCategory === -1
        ? recentEmojis
        : emojiCategories[selectedCategory].emojis;
    }

    // Simple search through all emojis
    const allEmojis = emojiCategories.flatMap(cat => cat.emojis);
    return allEmojis.filter(emoji => {
      // This is a simplified search - in a real app you'd have emoji names/keywords
      return emoji.includes(searchQuery);
    });
  };

  const handleEmojiPress = (emoji: string) => {
    onEmojiSelect(emoji);
  };

  const categoryNames = [
    'Recent',
    ...emojiCategories.map(cat => cat.name.split(' ')[1]),
  ];

  return (
    <View className="flex-1">
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
          },
          backdropAnimatedStyle,
        ]}
      />

      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1"
      />

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: height * 0.7,
          },
          animatedModalStyle,
        ]}
        className="bg-white rounded-t-3xl"
      >
        {/* Handle */}
        <View className="items-center py-3">
          <View className="w-12 h-1 bg-gray-300 rounded-full" />
        </View>

        {/* Header */}
        <View className="px-6 pb-4 border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">
              Choose Emoji
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
            >
              <Text className="text-gray-600">×</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
            <Text className="text-gray-400 mr-2">🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search emojis..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-gray-900"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text className="text-gray-400 ml-2">×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        {!searchQuery && (
          <View className="px-2 py-2 border-b border-gray-100">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-1">
                {categoryNames.map((name, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedCategory(index - 1)}
                    className={`px-4 py-2 rounded-full ${
                      selectedCategory === index - 1
                        ? 'bg-blue-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedCategory === index - 1
                          ? 'text-white'
                          : 'text-gray-600'
                      }`}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Emoji Grid */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="py-4">
            <View className="flex-row flex-wrap justify-between">
              {getFilteredEmojis().map((emoji, index) => (
                <TouchableOpacity
                  key={`${emoji}-${index}`}
                  onPress={() => handleEmojiPress(emoji)}
                  className="w-12 h-12 items-center justify-center m-1 rounded-lg bg-gray-50"
                  style={{
                    width: (width - 64) / 8, // 8 emojis per row with padding
                    height: (width - 64) / 8,
                  }}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {getFilteredEmojis().length === 0 && searchQuery && (
              <View className="items-center py-8">
                <Text className="text-gray-400 text-lg mb-2">🤔</Text>
                <Text className="text-gray-400">
                  No emojis found for "{searchQuery}"
                </Text>
              </View>
            )}
          </View>
          <View className="h-4" />
        </ScrollView>
      </Animated.View>
    </View>
  );
};
