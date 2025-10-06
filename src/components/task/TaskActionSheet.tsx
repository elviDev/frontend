import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  Dimensions,
  PanResponder,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Feather from 'react-native-vector-icons/Feather';
import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import { useAuth } from '../../hooks/useAuth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TaskActionSheetProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onAssign: (task: Task) => void;
}

export const TaskActionSheet: React.FC<TaskActionSheetProps> = ({
  visible,
  task,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onAssign,
}) => {
  const { user } = useAuth();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
      opacity.value = withSpring(0);
    }
  }, [visible]);

  const closeSheet = () => {
    translateY.value = withSpring(SCREEN_HEIGHT, {}, () => {
      runOnJS(onClose)();
    });
    opacity.value = withSpring(0);
  };

  // Pan gesture for closing
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newTranslateY = Math.max(0, event.translationY);
      translateY.value = newTranslateY;
      
      // Adjust opacity based on drag distance
      const dragProgress = Math.min(newTranslateY / 100, 1);
      opacity.value = withSpring(1 - dragProgress * 0.5);
    })
    .onEnd((event) => {
      const shouldClose = event.translationY > 100 || event.velocityY > 500;
      
      if (shouldClose) {
        closeSheet();
      } else {
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!task) return null;

  // Check user permissions
  const canEdit = user?.role === 'ceo' || 
                  task.assigned_to?.includes(user?.id || '') || 
                  task.created_by === user?.id ||
                  task.owned_by === user?.id;
  
  const canDelete = user?.role === 'ceo' || user?.role === 'manager';

  const handleStatusChange = (newStatus: TaskStatus) => {
    onStatusChange(task.id, newStatus);
    closeSheet();
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    onPriorityChange(task.id, newPriority);
    closeSheet();
  };

  const handleEdit = () => {
    onEdit(task);
    closeSheet();
  };

  const handleAssign = () => {
    onAssign(task);
    closeSheet();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(task.id);
            closeSheet();
          },
        },
      ]
    );
  };

  const statusOptions: { status: TaskStatus; label: string; icon: string; color: string }[] = [
    { status: 'pending', label: 'Pending', icon: 'clock', color: '#F59E0B' },
    { status: 'in_progress', label: 'In Progress', icon: 'play-circle', color: '#3B82F6' },
    { status: 'review', label: 'In Review', icon: 'eye', color: '#8B5CF6' },
    { status: 'completed', label: 'Completed', icon: 'check-circle', color: '#10B981' },
    { status: 'on_hold', label: 'On Hold', icon: 'pause-circle', color: '#6B7280' },
    { status: 'cancelled', label: 'Cancelled', icon: 'x-circle', color: '#EF4444' },
  ];

  const priorityOptions: { priority: TaskPriority; label: string; icon: string; color: string }[] = [
    { priority: 'low', label: 'Low Priority', icon: 'arrow-down', color: '#10B981' },
    { priority: 'medium', label: 'Medium Priority', icon: 'minus', color: '#F59E0B' },
    { priority: 'high', label: 'High Priority', icon: 'arrow-up', color: '#EF4444' },
    { priority: 'urgent', label: 'Urgent', icon: 'alert-triangle', color: '#DC2626' },
    { priority: 'critical', label: 'Critical', icon: 'alert-octagon', color: '#991B1B' },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
          },
          animatedBackdropStyle,
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={closeSheet}
        />
      </Animated.View>
      
      {/* Bottom Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              minHeight: 300,
              maxHeight: SCREEN_HEIGHT * 0.8,
            },
            animatedSheetStyle,
          ]}
        >
          <SafeAreaView>
            {/* Handle bar */}
            <View style={{
              alignItems: 'center',
              paddingVertical: 12,
            }}>
              <View style={{
                width: 36,
                height: 4,
                backgroundColor: '#E5E7EB',
                borderRadius: 2,
              }} />
            </View>

            {/* Task info */}
            <View style={{
              paddingHorizontal: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: 4,
              }} numberOfLines={2}>
                {task.title}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6B7280',
              }}>
                {task.channel_name ? `#${task.channel_name}` : 'Personal Task'}
              </Text>
            </View>

            {/* Quick Status Actions */}
            <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: 12,
              }}>
                Quick Actions
              </Text>
              
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                {statusOptions
                  .filter(option => option.status !== task.status)
                  .slice(0, 3)
                  .map((option) => (
                    <TouchableOpacity
                      key={option.status}
                      onPress={() => handleStatusChange(option.status)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F9FAFB',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <Feather
                        name={option.icon}
                        size={14}
                        color={option.color}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{
                        fontSize: 12,
                        color: '#374151',
                        fontWeight: '500',
                      }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            {/* Main Actions */}
            <View style={{ paddingHorizontal: 24 }}>
              {canEdit && (
                <>
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#EFF6FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16,
                    }}>
                      <Feather name="edit-3" size={18} color="#3B82F6" />
                    </View>
                    <Text style={{
                      fontSize: 16,
                      color: '#1F2937',
                      fontWeight: '500',
                    }}>
                      Edit Task
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAssign}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#F0FDF4',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16,
                    }}>
                      <Feather name="user-plus" size={18} color="#10B981" />
                    </View>
                    <Text style={{
                      fontSize: 16,
                      color: '#1F2937',
                      fontWeight: '500',
                    }}>
                      Manage Assignees
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FEF2F2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}>
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#EF4444',
                    fontWeight: '500',
                  }}>
                    Delete Task
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 24 }} />
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
};