import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
// Using custom progress selector instead of external slider
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskProgressModalProps {
  visible: boolean;
  currentProgress: number;
  onClose: () => void;
  onUpdateProgress: (progress: number) => Promise<void>;
  isLoading?: boolean;
}

export const TaskProgressModal: React.FC<TaskProgressModalProps> = ({
  visible,
  currentProgress,
  onClose,
  onUpdateProgress,
  isLoading = false,
}) => {
  const [progress, setProgress] = useState(currentProgress);
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (visible) {
      setProgress(currentProgress);
    }
  }, [visible, currentProgress]);

  const handleSave = async () => {
    try {
      await onUpdateProgress(Math.round(progress));
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return '#10B981';
    if (value >= 60) return '#3B82F6';
    if (value >= 40) return '#F59E0B';
    if (value >= 20) return '#EF4444';
    return '#6B7280';
  };

  const getProgressDescription = (value: number) => {
    if (value === 100) return 'Task Complete! 🎉';
    if (value >= 80) return 'Almost done! 🚀';
    if (value >= 60) return 'Making good progress 📈';
    if (value >= 40) return 'Halfway there 💪';
    if (value >= 20) return 'Getting started 🌱';
    return 'Just started ⭐';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
          paddingHorizontal: 20,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(300).delay(100)}
          exiting={FadeOut.duration(200)}
          style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            maxHeight: screenHeight * 0.85,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcon name="trending-up" size={24} color="#3B82F6" />
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#1F2937',
                marginLeft: 8,
              }}>
                Update Progress
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Progress Display */}
          <View style={{
            alignItems: 'center',
            marginBottom: 32,
          }}>
            <Text style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: getProgressColor(progress),
              marginBottom: 8,
            }}>
              {Math.round(progress)}%
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
              textAlign: 'center',
            }}>
              {getProgressDescription(progress)}
            </Text>
          </View>

          {/* Progress Selector */}
          <View style={{ marginBottom: 32 }}>
            {/* Progress Bar Visual */}
            <View style={{
              height: 8,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              marginBottom: 16,
            }}>
              <View style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: getProgressColor(progress),
                borderRadius: 4,
              }} />
            </View>
            
            {/* Progress Options Grid */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: -4,
              justifyContent: 'center',
            }}>
              {/* First row: 0-40% */}
              <View style={{
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'space-evenly',
                marginBottom: 8,
              }}>
                {[0, 10, 20, 30, 40].map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setProgress(value)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: progress === value ? getProgressColor(value) : '#F3F4F6',
                      borderWidth: 1,
                      borderColor: progress === value ? getProgressColor(value) : '#E5E7EB',
                      minWidth: 40,
                      alignItems: 'center',
                      marginHorizontal: 2,
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: progress === value ? 'white' : '#6B7280',
                    }}>
                      {value}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Second row: 50-90% */}
              <View style={{
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'space-evenly',
                marginBottom: 8,
              }}>
                {[50, 60, 70, 80, 90].map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setProgress(value)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: progress === value ? getProgressColor(value) : '#F3F4F6',
                      borderWidth: 1,
                      borderColor: progress === value ? getProgressColor(value) : '#E5E7EB',
                      minWidth: 40,
                      alignItems: 'center',
                      marginHorizontal: 2,
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: progress === value ? 'white' : '#6B7280',
                    }}>
                      {value}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Third row: 100% (centered) */}
              <View style={{
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'center',
              }}>
                <TouchableOpacity
                  onPress={() => setProgress(100)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: progress === 100 ? getProgressColor(100) : '#F3F4F6',
                    borderWidth: 1,
                    borderColor: progress === 100 ? getProgressColor(100) : '#E5E7EB',
                    minWidth: 60,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: progress === 100 ? 'white' : '#6B7280',
                  }}>
                    100%
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 16,
              justifyContent: 'center',
            }}>
              <TouchableOpacity
                onPress={() => setProgress(Math.max(0, progress - 5))}
                disabled={progress <= 0}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: progress <= 0 ? '#F3F4F6' : '#EFF6FF',
                  borderWidth: 1,
                  borderColor: progress <= 0 ? '#E5E7EB' : '#DBEAFE',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialIcon 
                  name="remove" 
                  size={16} 
                  color={progress <= 0 ? '#9CA3AF' : '#3B82F6'} 
                  style={{ marginRight: 4 }}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: progress <= 0 ? '#9CA3AF' : '#3B82F6',
                }}>
                  -5%
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setProgress(Math.min(100, progress + 5))}
                disabled={progress >= 100}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: progress >= 100 ? '#F3F4F6' : '#EFF6FF',
                  borderWidth: 1,
                  borderColor: progress >= 100 ? '#E5E7EB' : '#DBEAFE',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialIcon 
                  name="add" 
                  size={16} 
                  color={progress >= 100 ? '#9CA3AF' : '#3B82F6'} 
                  style={{ marginRight: 4 }}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: progress >= 100 ? '#9CA3AF' : '#3B82F6',
                }}>
                  +5%
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
          }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#6B7280',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: isLoading ? '#9CA3AF' : '#3B82F6',
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
              ) : (
                <MaterialIcon name="save" size={18} color="white" style={{ marginRight: 8 }} />
              )}
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: 'white',
              }}>
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};