import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface TaskSearchAndFiltersProps {
  searchQuery: string;
  isSearchFocused: boolean;
  onSearchChange: (text: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onFilterPress: () => void;
  onSortPress: () => void;
  filterButtonScale: SharedValue<number>;
}

export const TaskSearchAndFilters: React.FC<TaskSearchAndFiltersProps> = ({
  searchQuery,
  isSearchFocused,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onFilterPress,
  onSortPress,
  filterButtonScale,
}) => {
  const animatedFilterButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: filterButtonScale.value }],
    height: 58,
    elevation: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }));

  return (
    <View className="flex-row gap-1 items-center space-x-3 ml-4 mb-4 mr-1">
      {/* Search Input */}
      <View className="flex-1 justify-center" style={{ maxHeight: 56 }}>
        <LinearGradient
          colors={['#3933C6', '#A05FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 12,
            padding: 2,
          }}
        >
          <View
            className="bg-white rounded-xl flex-row items-center"
            style={{ paddingHorizontal: 12, height: 48 }}
          >
            <Feather
              name="search"
              size={20}
              color={isSearchFocused ? '#3933C6' : '#9CA3AF'}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={onSearchChange}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              className="flex-1 text-gray-900"
              placeholderTextColor="#9CA3AF"
              style={{
                fontSize: 16,
                paddingVertical: 0,
                height: 40,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <Feather
                  name="x"
                  size={20}
                  color="#9CA3AF"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Filter Button */}
      <AnimatedTouchableOpacity
        style={[
          animatedFilterButtonStyle,
          {
            height: 48,
            width: 48,
            borderRadius: 12,
            padding: 0,
            marginLeft: 4,
          }, // Match search input height and style
        ]}
        onPress={onFilterPress}
        className="bg-white rounded-md items-center justify-center"
      >
        <Feather name="filter" size={22} color="#A05FFF" />
      </AnimatedTouchableOpacity>
    </View>
  );
};
