import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeIn, SlideInUp, SlideOutDown, FadeOut } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

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
  const handleOptionPress = (option: ActionSheetOption) => {
    option.onPress();
    onClose();
  };

  const getIconComponent = (option: ActionSheetOption) => {
    if (!option.icon) return null;
    
    const iconColor = option.style === 'destructive' ? '#EF4444' : option.style === 'cancel' ? '#6B7280' : '#374151';
    
    if (option.iconLibrary === 'ionicon') {
      return <IonIcon name={option.icon} size={20} color={iconColor} />;
    }
    return <MaterialIcon name={option.icon} size={20} color={iconColor} />;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'flex-end',
          zIndex: 9999,
        }}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={onClose}
          activeOpacity={1}
        />
        
        <Animated.View
          entering={SlideInUp.duration(450).springify().damping(18).stiffness(120)}
          exiting={SlideOutDown.duration(250)}
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 34,
            maxHeight: screenHeight * 0.8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.15,
            shadowRadius: 28,
            elevation: 25,
            borderTopWidth: 0.5,
            borderTopColor: 'rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Elegant Handle bar */}
          <View className="items-center py-3">
            <View 
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#E5E7EB',
                borderRadius: 2,
              }}
            />
          </View>

          {/* Clean Header */}
          {(title || message) && (
            <View className="px-6 pb-4">
              {title && (
                <Text className="text-lg font-bold text-gray-900 text-center mb-2">
                  {title}
                </Text>
              )}
              {message && (
                <Text className="text-sm text-gray-500 text-center leading-5 px-2">
                  {message}
                </Text>
              )}
            </View>
          )}

          {/* Clean Options */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-4">
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleOptionPress(option)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 18,
                    marginVertical: 4,
                    borderRadius: 16,
                    backgroundColor: option.style === 'cancel' 
                      ? '#F9FAFB' 
                      : 'white',
                    borderBottomWidth: index < options.length - 1 ? 0.5 : 0,
                    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
                  }}
                  className="active:bg-gray-50"
                >
                  {option.icon && (
                    <View 
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16,
                        backgroundColor: option.style === 'destructive' 
                          ? '#FEF2F2' 
                          : option.style === 'cancel'
                          ? '#F3F4F6'
                          : '#F0F9FF',
                      }}
                    >
                      {getIconComponent(option)}
                    </View>
                  )}
                  <View className="flex-1">
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: option.style === 'destructive'
                          ? '#DC2626'
                          : option.style === 'cancel'
                          ? '#6B7280'
                          : '#111827',
                      }}
                    >
                      {option.text}
                    </Text>
                    {option.style === 'destructive' && (
                      <Text className="text-xs text-red-400 mt-1">
                        This action cannot be undone
                      </Text>
                    )}
                  </View>
                  
                  {/* Clean Arrow for non-cancel options */}
                  {option.style !== 'cancel' && (
                    <MaterialIcon 
                      name="chevron-right" 
                      size={22} 
                      color="#9CA3AF" 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
