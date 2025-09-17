import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Avatar } from './Avatar';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ChannelCardProps {
  title: string;
  description: string;
  category: string;
  tags: string[];
  memberAvatars: string[];
  messages: number;
  files: number;
  members: number;
  isPrivate: boolean;
  onPress: () => void;
  onOptionsPress: () => void;
  index: number;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  title,
  description,
  category,
  tags,
  memberAvatars,
  messages,
  files,
  members,
  isPrivate,
  onPress,
  onOptionsPress,
  index,
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);
  const optionsPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(pressed.value ? 0.98 : scale.value, {
            damping: 15,
            stiffness: 200,
          }),
        },
      ],
    };
  });

  const handlePressIn = () => {
    pressed.value = true;
  };

  const handlePressOut = () => {
    pressed.value = false;
  };

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );

    setTimeout(() => {
      runOnJS(onPress)();
    }, 50);
  };

  const optionsAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(optionsPressed.value ? 0.9 : 1, {
            damping: 15,
            stiffness: 300,
          }),
        },
      ],
    };
  });

  const handleOptionsPress = () => {
    optionsPressed.value = true;
    setTimeout(() => {
      optionsPressed.value = false;
      runOnJS(onOptionsPress)();
    }, 100);
  };

  return (
    <AnimatedTouchableOpacity
      entering={FadeInDown.delay(index * 150)
        .duration(600)
        .springify()
        .damping(12)
        .stiffness(100)}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle]}
      className="bg-white rounded-2xl p-4 mb-4 mx-4"
      activeOpacity={1}
    >
      <Animated.View
        style={{
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {/* Header Row */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center space-x-2">
            <Animated.View
              entering={FadeInUp.delay(index * 150 + 200).duration(400)}
              className="bg-green-100 px-3 py-1 rounded-full"
            >
              <Text className="text-green-600 text-xs font-medium">
                {category}
              </Text>
            </Animated.View>
            {isPrivate && (
              <Animated.View
                entering={FadeInUp.delay(index * 150 + 220).duration(400)}
                className="bg-orange-100 px-2 py-1 rounded-full flex-row items-center"
              >
                <MaterialIcon name="lock" size={10} color="#F97316" />
                <Text className="text-orange-600 text-xs font-medium ml-1">Private</Text>
              </Animated.View>
            )}
          </View>
          <AnimatedTouchableOpacity
            entering={FadeInUp.delay(index * 150 + 250).duration(400)}
            className="bg-gray-50/80 hover:bg-purple-50 active:bg-purple-100 rounded-full p-2"
            onPress={handleOptionsPress}
            style={[
              {
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 3,
              },
              optionsAnimatedStyle,
            ]}
          >
            <MaterialIcon name="more-vert" size={18} color="#6B7280" />
          </AnimatedTouchableOpacity>
        </View>

        {/* Title and Description */}
        <Animated.View
          entering={FadeInUp.delay(index * 150 + 300).duration(500)}
        >
          <Text className="text-gray-900 text-xl font-bold mb-2">{title}</Text>
          <Text className="text-gray-500 text-sm mb-3 leading-5">
            {description}
          </Text>
          
          {/* Tags */}
          {tags && tags.length > 0 && (
            <View className="flex-row flex-wrap mb-3">
              {tags.map((tag, tagIndex) => (
                <View
                  key={tagIndex}
                  className="bg-purple-50 px-2 py-1 rounded-md mr-2 mb-1"
                >
                  <Text className="text-purple-600 text-xs font-medium">#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Bottom Section */}
        <Animated.View
          entering={FadeInUp.delay(index * 150 + 400).duration(500)}
          className="flex-row items-center justify-between"
        >
          {/* Member Avatars */}
          <View className="flex-row -space-x-3">
            {memberAvatars.slice(0, 4).map((avatarOrInitial, avatarIndex) => (
              <Animated.View
                key={avatarIndex}
                entering={FadeInUp.delay(index * 150 + 500 + avatarIndex * 100)
                  .duration(400)
                  .springify()}
                style={{ zIndex: memberAvatars.length - avatarIndex }}
              >
                {/* Check if it's a URL (contains http) or just initials */}
                {avatarOrInitial && (avatarOrInitial.startsWith('http') || avatarOrInitial.startsWith('https')) ? (
                  <Avatar
                    user={{
                      id: `member_${avatarIndex}`,
                      name: avatarOrInitial, // Name will be used for fallback if image fails
                      avatar: avatarOrInitial,
                    }}
                    size="sm"
                  />
                ) : (
                  <LinearGradient
                    colors={avatarIndex % 2 === 0 ? ['#3933C6', '#A05FFF'] : ['#A05FFF', '#3933C6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 2,
                      borderColor: 'white',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                  >
                    <Text className="text-white text-xs font-bold">
                      {avatarOrInitial?.charAt(0) || '?'}
                    </Text>
                  </LinearGradient>
                )}
              </Animated.View>
            ))}
            {memberAvatars.length > 4 && (
              <Animated.View
                entering={FadeInUp.delay(index * 150 + 500 + 4 * 100)
                  .duration(400)
                  .springify()}
                style={{ zIndex: 0 }}
              >
                <View className="w-9 h-9 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    +{memberAvatars.length - 4}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Stats */}
          <View className="flex-row items-center gap-2 space-x-3">
            <Animated.View
              entering={FadeInUp.delay(index * 150 + 600).duration(400)}
              className="flex-row items-center"
            >
              <IonIcon
                name="chatbox-ellipses-outline"
                size={18}
                color="#9E9E9E"
              />
              <Text className="text-gray-400 text-sm ml-1">{messages}</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(index * 150 + 625).duration(400)}
              className="flex-row items-center"
            >
              <IonIcon name="folder-outline" size={18} color="#9E9E9E" />
              <Text className="text-gray-400 text-sm ml-1">{files}</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(index * 150 + 650).duration(400)}
              className="flex-row items-center"
            >
              <IonIcon name="people-outline" size={18} color="#9E9E9E" />
              <Text className="text-gray-400 text-sm ml-1">{members}</Text>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
};
