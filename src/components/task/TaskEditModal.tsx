import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInUp, 
  SlideOutUp 
} from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import { Task, TaskStatus, TaskPriority, CreateTaskData } from '../../types/task.types';
import { useAuth } from '../../hooks/useAuth';

interface TaskEditModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<CreateTaskData>) => Promise<void>;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  visible,
  task,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    due_date: '',
    tags: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        tags: task.tags || [],
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<CreateTaskData> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };

      await onSave(task.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#10B981' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'high', label: 'High', color: '#EF4444' },
    { value: 'urgent', label: 'Urgent', color: '#DC2626' },
    { value: 'critical', label: 'Critical', color: '#991B1B' },
  ];

  const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: '#F59E0B' },
    { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
    { value: 'review', label: 'In Review', color: '#8B5CF6' },
    { value: 'completed', label: 'Completed', color: '#10B981' },
    { value: 'on_hold', label: 'On Hold', color: '#6B7280' },
    { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
  ];

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <Animated.View
            entering={SlideInUp.delay(100)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#6B7280" />
            </TouchableOpacity>
            
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#1F2937',
            }}>
              Edit Task
            </Text>
            
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading || !formData.title.trim()}
              style={{
                backgroundColor: formData.title.trim() ? '#3B82F6' : '#E5E7EB',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
              }}
            >
              <Text style={{
                color: formData.title.trim() ? '#FFFFFF' : '#9CA3AF',
                fontWeight: '600',
                fontSize: 14,
              }}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 20 }}>
              {/* Title */}
              <Animated.View
                entering={SlideInUp.delay(200)}
                style={{ marginBottom: 24 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 8,
                }}>
                  Title *
                </Text>
                <TextInput
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="Enter task title"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#1F2937',
                  }}
                  placeholderTextColor="#9CA3AF"
                />
              </Animated.View>

              {/* Description */}
              <Animated.View
                entering={SlideInUp.delay(300)}
                style={{ marginBottom: 24 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 8,
                }}>
                  Description
                </Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Enter task description"
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#1F2937',
                    textAlignVertical: 'top',
                    minHeight: 100,
                  }}
                  placeholderTextColor="#9CA3AF"
                />
              </Animated.View>

              {/* Priority */}
              <Animated.View
                entering={SlideInUp.delay(400)}
                style={{ marginBottom: 24 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 12,
                }}>
                  Priority
                </Text>
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: formData.priority === option.value ? option.color : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: option.color,
                      }}
                    >
                      <Text style={{
                        color: formData.priority === option.value ? '#FFFFFF' : option.color,
                        fontWeight: '600',
                        fontSize: 14,
                      }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Status */}
              <Animated.View
                entering={SlideInUp.delay(500)}
                style={{ marginBottom: 24 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 12,
                }}>
                  Status
                </Text>
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setFormData(prev => ({ ...prev, status: option.value }))}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: formData.status === option.value ? option.color : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: option.color,
                      }}
                    >
                      <Text style={{
                        color: formData.status === option.value ? '#FFFFFF' : option.color,
                        fontWeight: '600',
                        fontSize: 14,
                      }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Due Date */}
              <Animated.View
                entering={SlideInUp.delay(600)}
                style={{ marginBottom: 24 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 8,
                }}>
                  Due Date
                </Text>
                <TextInput
                  value={formData.due_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, due_date: text }))}
                  placeholder="YYYY-MM-DD"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#1F2937',
                  }}
                  placeholderTextColor="#9CA3AF"
                />
              </Animated.View>

              {/* Tags */}
              <Animated.View
                entering={SlideInUp.delay(700)}
                style={{ marginBottom: 24 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 8,
                }}>
                  Tags
                </Text>
                
                {/* Existing tags */}
                {formData.tags.length > 0 && (
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 12,
                  }}>
                    {formData.tags.map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => removeTag(tag)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#EFF6FF',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: '#DBEAFE',
                        }}
                      >
                        <Text style={{
                          color: '#3B82F6',
                          fontSize: 14,
                          marginRight: 6,
                        }}>
                          {tag}
                        </Text>
                        <Feather name="x" size={12} color="#3B82F6" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Add new tag */}
                <View style={{
                  flexDirection: 'row',
                  gap: 8,
                }}>
                  <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Add a tag"
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: '#1F2937',
                    }}
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={addTag}
                  />
                  <TouchableOpacity
                    onPress={addTag}
                    style={{
                      backgroundColor: '#3B82F6',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="plus" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};