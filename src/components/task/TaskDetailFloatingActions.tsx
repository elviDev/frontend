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
  onDeletePress: () => void;
  onCompletePress: () => void;
  showDeleteButton: boolean;
}

export const TaskDetailFloatingActions: React.FC<TaskDetailFloatingActionsProps> = ({
  fabScale,
  onDeletePress,
  onCompletePress,
  showDeleteButton,
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
      style={[
        {
          position: 'absolute',
          bottom: 24,
          right: 24,
          flexDirection: 'row',
          gap: 12,
        },
        animatedFabStyle,
      ]}
    >
      {showDeleteButton && (
        <TouchableOpacity
          onPress={() => handlePress(onDeletePress)}
          style={{
            width: 56,
            height: 56,
            backgroundColor: 'white',
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            borderWidth: 1,
            borderColor: '#FEE2E2',
          }}
        >
          <MaterialIcon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => handlePress(onCompletePress)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <LinearGradient
          colors={['#2563EB', '#7C3AED']}
          style={{ flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcon name="done" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};