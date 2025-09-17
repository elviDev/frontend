import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { 
  FadeInUp, 
  useAnimatedStyle, 
  SharedValue, 
  withSpring 
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskDetailFloatingActionsProps {
  fabScale: SharedValue<number>;
  onEditPress: () => void;
  onCompletePress: () => void;
}

export const TaskDetailFloatingActions: React.FC<TaskDetailFloatingActionsProps> = ({
  fabScale,
  onEditPress,
  onCompletePress,
}) => {
  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handlePress = (action: () => void) => {
    fabScale.value = withSpring(0.9, {}, () => {
      fabScale.value = withSpring(1);
    });
    action();
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(800).duration(600)}
      className="absolute bottom-6 right-6 flex-row gap-3"
      style={animatedFabStyle}
    >
      <TouchableOpacity
        onPress={() => handlePress(onEditPress)}
        className="w-14 h-14 bg-white rounded-full items-center justify-center shadow-lg border border-gray-200"
      >
        <MaterialIcon name="edit" size={20} color="#6B7280" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress(onCompletePress)}
        className="w-14 h-14 rounded-full shadow-lg border border-gray-200"
       
      >
        <LinearGradient
          colors={['#2563EB', '#7C3AED']}
         style={{ flex: 1, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcon name="done" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};