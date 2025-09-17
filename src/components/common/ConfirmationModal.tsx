import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'default',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onCancel}
          activeOpacity={1}
        />
        
        <Animated.View
          entering={ZoomIn.duration(400).springify().damping(15)}
          exiting={ZoomOut.duration(300)}
          style={{
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 0,
            width: '100%',
            maxWidth: 380,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 20,
          }}
        >
          {/* Icon Header */}
          <View className="items-center pt-8 pb-4">
            <Animated.View 
              entering={ZoomIn.delay(200).duration(500).springify()}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <LinearGradient
                colors={confirmStyle === 'destructive' 
                  ? ['#FEE2E2', '#FECACA'] 
                  : ['#DBEAFE', '#BFDBFE']
                }
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: confirmStyle === 'destructive' ? '#EF4444' : '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <MaterialIcon
                  name={confirmStyle === 'destructive' ? 'delete-outline' : 'help-outline'}
                  size={36}
                  color={confirmStyle === 'destructive' ? '#DC2626' : '#2563EB'}
                />
              </LinearGradient>
            </Animated.View>
            
            {/* Title */}
            <Animated.View entering={FadeIn.delay(300).duration(400)}>
              <Text 
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#111827',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                {title}
              </Text>
            </Animated.View>
          </View>

          {/* Message */}
          <Animated.View entering={FadeIn.delay(400).duration(400)} className="px-6 pb-8">
            <Text 
              style={{
                fontSize: 16,
                lineHeight: 24,
                color: '#6B7280',
                textAlign: 'center',
              }}
            >
              {message}
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View 
            entering={SlideInDown.delay(500).duration(400)}
            className="px-6 pb-6"
          >
            <View className="space-y-3">
              {/* Primary Action Button */}
              <TouchableOpacity
                onPress={onConfirm}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  backgroundColor: confirmStyle === 'destructive' ? '#DC2626' : '#2563EB',
                  shadowColor: confirmStyle === 'destructive' ? '#DC2626' : '#2563EB',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                className="active:scale-95"
              >
                <Text 
                  style={{
                    color: 'white',
                    fontSize: 17,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
              
              {/* Secondary Cancel Button */}
              <TouchableOpacity
                onPress={onCancel}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  backgroundColor: '#F9FAFB',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                className="active:bg-gray-200"
              >
                <Text 
                  style={{
                    color: '#6B7280',
                    fontSize: 17,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
