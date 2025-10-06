import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

interface VoiceResultModalProps {
  visible: boolean;
  title: string;
  confidence: number;
  reasoning: string;
  extractedData: any;
  onAccept: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const VoiceResultModal: React.FC<VoiceResultModalProps> = ({
  visible,
  title,
  confidence,
  reasoning,
  extractedData,
  onAccept,
  onCancel,
  isProcessing = false,
}) => {
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return { primary: '#10B981', secondary: '#059669', bg: '#D1FAE5' };
    if (confidence >= 0.6) return { primary: '#F59E0B', secondary: '#D97706', bg: '#FEF3C7' };
    return { primary: '#EF4444', secondary: '#DC2626', bg: '#FEE2E2' };
  };

  const confidenceColors = getConfidenceColor();

  const renderExtractedData = () => {
    if (!extractedData) return null;
    
    return Object.entries(extractedData).map(([key, value]) => {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) return null;
      
      const fieldName = key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase());
      
      return (
        <View key={key} className="mb-3">
          <Text className="text-sm font-semibold text-gray-700 mb-1">
            {fieldName}
          </Text>
          <View className="bg-gray-50 rounded-lg p-3">
            {Array.isArray(value) ? (
              // Handle arrays (tags, features, assignees, etc.)
              <View>
                {value.map((item, index) => (
                  <View key={index} className="mb-1">
                    {typeof item === 'object' ? (
                      // Handle object arrays (deliverables, success criteria)
                      <View className="bg-white rounded-md p-2 border border-gray-200">
                        {Object.entries(item).map(([objKey, objValue]) => (
                          <Text key={objKey} className="text-gray-800 text-sm">
                            <Text className="font-medium">{objKey}:</Text> {String(objValue)}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      // Handle simple arrays (tags, features)
                      <View className="bg-blue-100 rounded-full px-2 py-1 inline-flex mr-1 mb-1">
                        <Text className="text-blue-700 text-sm">{String(item)}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : value instanceof Date ? (
              // Handle date objects
              <Text className="text-gray-800 text-base">
                {value.toLocaleDateString()} ({value.toLocaleDateString('en-US', { weekday: 'long' })})
              </Text>
            ) : typeof value === 'object' ? (
              // Handle single objects
              <View>
                {Object.entries(value).map(([objKey, objValue]) => (
                  <Text key={objKey} className="text-gray-800 text-sm mb-1">
                    <Text className="font-medium">{objKey}:</Text> {String(objValue)}
                  </Text>
                ))}
              </View>
            ) : (
              // Handle simple values
              <Text className="text-gray-800 text-base">{String(value)}</Text>
            )}
          </View>
        </View>
      );
    }).filter(Boolean);
  };

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
            maxWidth: 420,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 20,
          }}
        >
          {/* Header */}
          <View className="items-center pt-6 pb-4">
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
                colors={[confidenceColors.bg, confidenceColors.bg]}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: confidenceColors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <MaterialIcon
                  name="voice-chat"
                  size={36}
                  color={confidenceColors.primary}
                />
              </LinearGradient>
            </Animated.View>
            
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

            {/* Confidence Indicator */}
            <Animated.View 
              entering={FadeIn.delay(400).duration(400)}
              className="flex-row items-center bg-gray-50 rounded-full px-4 py-2"
            >
              <View 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: confidenceColors.primary }}
              />
              <Text className="text-gray-700 font-medium">
                {Math.round(confidence * 100)}% Confidence
              </Text>
            </Animated.View>
          </View>

          {/* Content */}
          <ScrollView 
            className="max-h-80"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeIn.delay(500).duration(400)} className="px-6">
              {/* Reasoning */}
              {reasoning && (
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-gray-800 mb-3">
                    AI Analysis
                  </Text>
                  <View className="bg-blue-50 rounded-lg p-4">
                    <Text className="text-gray-700 leading-relaxed">
                      {reasoning}
                    </Text>
                  </View>
                </View>
              )}

              {/* Extracted Data */}
              {extractedData && Object.keys(extractedData).length > 0 && (
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-gray-800 mb-3">
                    Extracted Information
                  </Text>
                  {renderExtractedData()}
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Action Buttons */}
          <Animated.View 
            entering={SlideInDown.delay(600).duration(400)}
            className="px-6 pb-6 pt-4"
          >
            <View className="space-y-3">
              <TouchableOpacity
                onPress={onAccept}
                disabled={isProcessing}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  backgroundColor: isProcessing ? '#9CA3AF' : confidenceColors.primary,
                  shadowColor: confidenceColors.primary,
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
                  {isProcessing ? 'Creating...' : 'Use This Information'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={onCancel}
                disabled={isProcessing}
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
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};