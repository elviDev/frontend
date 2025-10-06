import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInUp, 
  SlideOutUp 
} from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import { Task } from '../../types/task.types';
import { User } from '../../types/user.types';
import { userService } from '../../services/api/userService';
import { useAuth } from '../../hooks/useAuth';

interface TaskAssignModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onAssign: (taskId: string, userIds: string[]) => Promise<void>;
}

export const TaskAssignModal: React.FC<TaskAssignModalProps> = ({
  visible,
  task,
  onClose,
  onAssign,
}) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible && task) {
      loadUsers();
      setSelectedUserIds(task.assigned_to || []);
    }
  }, [visible, task]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    setLoading(true);
    try {
      await onAssign(task.id, selectedUserIds);
      onClose();
    } catch (error) {
      console.error('Failed to assign users:', error);
      Alert.alert('Error', 'Failed to update task assignments');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item: user }: { item: User }) => {
    const isSelected = selectedUserIds.includes(user.id);
    const isCurrentUser = user.id === currentUser?.id;

    return (
      <TouchableOpacity
        onPress={() => toggleUserSelection(user.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        {/* Avatar */}
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isSelected ? '#3B82F6' : '#E5E7EB',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          {user.avatar_url ? (
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Text style={{
              color: isSelected ? '#FFFFFF' : '#6B7280',
              fontSize: 16,
              fontWeight: '600',
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        {/* User Info */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: 2,
          }}>
            {user.name}
            {isCurrentUser && (
              <Text style={{
                fontSize: 14,
                fontWeight: '400',
                color: '#6B7280',
              }}>
                {' '}(You)
              </Text>
            )}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
          }}>
            {user.email}
          </Text>
          {user.role && (
            <Text style={{
              fontSize: 12,
              color: '#3B82F6',
              fontWeight: '500',
              textTransform: 'capitalize',
            }}>
              {user.role}
            </Text>
          )}
        </View>

        {/* Selection indicator */}
        {isSelected && (
          <Feather name="check-circle" size={20} color="#3B82F6" />
        )}
      </TouchableOpacity>
    );
  };

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
              Manage Assignees
            </Text>
            
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={{
                backgroundColor: '#3B82F6',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontWeight: '600',
                fontSize: 14,
              }}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Task Info */}
          <Animated.View
            entering={SlideInUp.delay(200)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <Text style={{
              fontSize: 16,
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
              {selectedUserIds.length} assignee{selectedUserIds.length !== 1 ? 's' : ''} selected
            </Text>
          </Animated.View>

          {/* Search */}
          <Animated.View
            entering={SlideInUp.delay(300)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}>
              <Feather name="search" size={16} color="#6B7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search users..."
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 16,
                  color: '#1F2937',
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </Animated.View>

          {/* Users List */}
          <Animated.View
            entering={SlideInUp.delay(400)}
            style={{ flex: 1 }}
          >
            {loading ? (
              <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: 16,
                  color: '#6B7280',
                }}>
                  Loading users...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};