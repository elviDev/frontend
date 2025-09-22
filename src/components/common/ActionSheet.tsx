import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Animated, { 
  SlideInUp, 
  SlideOutDown, 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

const { height: screenHeight } = Dimensions.get('window');

interface ActionSheetOption {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
  icon?: string;
  iconLibrary?: 'material' | 'ionicon';
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  title,
  message,
  options,
  onClose,
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Reset values when the ActionSheet becomes visible
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      opacity.value = 1;
    }
  }, [visible, translateY, opacity]);

  const handleOptionPress = (option: ActionSheetOption) => {
    // Execute action immediately without delay
    option.onPress();
    // Close modal immediately after action
    onClose();
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      // Only allow downward movement
      const newTranslateY = context.startY + event.translationY;
      if (newTranslateY >= 0) {
        translateY.value = newTranslateY;
        // Reduce opacity as user swipes down
        opacity.value = Math.max(0.3, 1 - newTranslateY / 200);
      }
    },
    onEnd: (event) => {
      const shouldDismiss = event.translationY > 100 || event.velocityY > 500;
      
      if (shouldDismiss) {
        // Animate out and close
        translateY.value = withSpring(300, { damping: 20, stiffness: 300 });
        opacity.value = withSpring(0, { damping: 20, stiffness: 300 });
        runOnJS(onClose)();
      } else {
        // Snap back to original position
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const getIconComponent = (option: ActionSheetOption) => {
    if (!option.icon) return null;
    
    const iconColor = option.style === 'destructive' ? '#EF4444' : option.style === 'cancel' ? '#6B7280' : '#374151';
    
    if (option.iconLibrary === 'ionicon') {
      return <IonIcon name={option.icon} size={20} color={iconColor} />;
    }
    return <MaterialIcon name={option.icon} size={20} color={iconColor} />;
  };

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          entering={SlideInUp.duration(400).springify().damping(12).stiffness(100)}
          exiting={SlideOutDown.duration(250)}
          style={[
            {
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: 34,
              maxHeight: screenHeight * 0.7,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 20,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: '#F1F5F9',
            },
            animatedStyle,
          ]}
        >
          {/* Draggable Handle bar */}
          <TouchableOpacity 
            onPress={onClose}
            className="items-center py-4"
            activeOpacity={0.7}
          >
            <View 
              style={{
                width: 48,
                height: 5,
                backgroundColor: '#CBD5E1',
                borderRadius: 3,
              }}
            />
          </TouchableOpacity>

          {/* Clean Header */}
          {(title || message) && (
            <View style={{
              paddingHorizontal: 24,
              paddingBottom: 16,
              marginBottom: 8,
            }}>
              {title && (
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#0F172A',
                  textAlign: 'center',
                  marginBottom: 6,
                }}>
                  {title}
                </Text>
              )}
              {message && (
                <Text style={{
                  fontSize: 14,
                  color: '#64748B',
                  textAlign: 'center',
                  lineHeight: 20,
                }}>
                  {message}
                </Text>
              )}
            </View>
          )}

          {/* Clean Options */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              {options.map((option, index) => {
                const isCancel = option.style === 'cancel';
                const isDestructive = option.style === 'destructive';
                
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleOptionPress(option)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      marginBottom: isCancel ? 12 : 6,
                      marginTop: isCancel ? 8 : 0,
                      borderRadius: 16,
                      backgroundColor: isCancel 
                        ? '#F8FAFC' 
                        : '#FFFFFF',
                      borderWidth: isCancel ? 1 : 0,
                      borderColor: '#E2E8F0',
                      borderBottomWidth: !isCancel && index < options.length - 1 ? 0.5 : 0,
                      borderBottomColor: '#F1F5F9',
                    }}
                    activeOpacity={0.7}
                  >
                    {option.icon && (
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        backgroundColor: isDestructive 
                          ? '#FEF2F2'
                          : isCancel
                          ? '#F1F5F9'
                          : '#F8FAFC',
                      }}>
                        {getIconComponent(option)}
                      </View>
                    )}
                    
                    <View className="flex-1">
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: isDestructive
                            ? '#DC2626'
                            : isCancel
                            ? '#64748B'
                            : '#0F172A',
                          marginBottom: isDestructive ? 2 : 0,
                        }}
                      >
                        {option.text}
                      </Text>
                      {isDestructive && (
                        <Text style={{
                          fontSize: 12,
                          color: '#94A3B8',
                          fontWeight: '400',
                        }}>
                          This action cannot be undone
                        </Text>
                      )}
                    </View>
                    
                    {!isCancel && (
                      <MaterialIcon 
                        name="chevron-right" 
                        size={20} 
                        color="#CBD5E1"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};
