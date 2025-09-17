import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskComment,
  TaskAssignee,
} from '../../types/task.types';
import { taskService } from '../../services/api/taskService';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../components/common/UIProvider';

// Import existing components
import { TaskDetailHeader } from '../../components/task/TaskDetailHeader';
import { TaskOverviewCard } from '../../components/task/TaskOverviewCard';
import { TaskProgressCard } from '../../components/task/TaskProgressCard';
import { TaskAssigneesCard } from '../../components/task/TaskAssigneesCard';
import { TaskSubtasksCard } from '../../components/task/TaskSubtasksCard';
import { TaskCommentsCard } from '../../components/task/TaskCommentsCard';
import { TaskTagsCard } from '../../components/task/TaskTagsCard';
import { TaskStatusModal } from '../../components/task/TaskStatusModal';
import { TaskPriorityModal } from '../../components/task/TaskPriorityModal';
import { TaskDetailFloatingActions } from '../../components/task/TaskDetailFloatingActions';
import { TaskDetailsCard } from '../../components/task/TaskDetailsCard';
import { TaskUtils } from '../../components/task/TaskUtils';

interface TaskDetailScreenProps {
  navigation: any;
  route: {
    params: {
      taskId: string;
    };
  };
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { taskId } = route.params;

  // State
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [_showAssigneeModal, _setShowAssigneeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  const { showErrorAlert, showConfirm, showSuccess } = useUI();

  // Animation values
  const commentInputScale = useSharedValue(1);
  const fabScale = useSharedValue(1);

  // Load task details
  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  // Add focus listener to refresh data when screen comes back into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (task) {
        // Refresh task data when screen comes back into focus
        loadTaskDetails();
      }
    });

    return unsubscribe;
  }, [navigation, task]);

  const loadTaskDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await taskService.getTask(taskId);
      if (response.success && response.data) {
        const taskData = response.data;
        
        // Transform backend data to match component expectations
        const transformedTask: Task = {
          ...taskData,
          // Map backend fields to legacy component fields for compatibility
          assignees: taskData.assigned_to.map(userId => {
            // In a real app, you'd fetch user details or have them cached
            return {
              id: userId,
              name: `User ${userId.substring(0, 8)}`,
              avatar: userId.substring(0, 2).toUpperCase(),
              role: 'Team Member',
              email: `${userId}@company.com`,
            } as TaskAssignee;
          }),
          reporter: {
            id: taskData.created_by,
            name: `User ${taskData.created_by.substring(0, 8)}`,
            avatar: taskData.created_by.substring(0, 2).toUpperCase(),
            role: 'Task Creator',
            email: `${taskData.created_by}@company.com`,
          },
          channelId: taskData.channel_id,
          channelName: taskData.channel_name || 'General',
          dueDate: taskData.due_date ? new Date(taskData.due_date) : undefined,
          createdAt: new Date(taskData.created_at),
          updatedAt: new Date(taskData.updated_at),
          completedAt: taskData.completed_at ? new Date(taskData.completed_at) : undefined,
          estimatedHours: taskData.estimated_hours || 0,
          actualHours: taskData.actual_hours || 0,
          progress: taskData.progress_percentage || 0,
          category: taskData.task_type || 'general',
          // Initialize empty arrays - these should be populated from separate API calls in a real app
          subtasks: [],
          comments: [], // Will be loaded separately
          attachments: [],
          dependencies: [],
          // Preserve all backend fields
          task_type: taskData.task_type,
          business_value: taskData.business_value,
          complexity: taskData.complexity,
          voice_created: taskData.voice_created || false,
          voice_instructions: taskData.voice_instructions,
          labels: taskData.labels || {},
          custom_fields: taskData.custom_fields || {},
          start_date: taskData.start_date ? new Date(taskData.start_date) : undefined,
          owned_by: taskData.owned_by,
          watchers: taskData.watchers || [],
        };
        
        setTask(transformedTask);
        
        // Load comments separately
        try {
          const commentsResponse = await taskService.getTaskComments(taskId);
          if (commentsResponse.success) {
            setTask(prevTask => prevTask ? {
              ...prevTask,
              comments: commentsResponse.data
            } : prevTask);
          }
        } catch (commentsError) {
          console.warn('Failed to load comments:', commentsError);
          // Don't show error to user, just log it - comments are not critical
        }
      } else {
        setError('Failed to load task details');
      }
    } catch (err) {
      console.error('Error loading task:', err);
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTaskDetails(true);
  };

  // Action handlers
  const updateTaskStatus = async (newStatus: TaskStatus) => {
    if (!task) return;
    
    try {
      const response = await taskService.updateTaskStatus(task.id, newStatus);
      if (response.success && response.data) {
        const updatedData = response.data;
        setTask({
          ...task,
          status: updatedData.status,
          updatedAt: new Date(updatedData.updated_at),
          completed_at: updatedData.completed_at,
          progress: updatedData.progress_percentage,
        });
        setShowStatusModal(false);
        
        showSuccess(`Task status updated to ${newStatus}`);
      } else {
        showErrorAlert('Error', 'Failed to update task status');
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      showErrorAlert('Error', 'Failed to update task status');
    }
  };

  const updateTaskPriority = async (newPriority: TaskPriority) => {
    if (!task) return;
    
    try {
      const response = await taskService.updateTask(task.id, { priority: newPriority });
      if (response.success && response.data) {
        const updatedData = response.data;
        setTask({
          ...task,
          priority: updatedData.priority,
          updatedAt: new Date(updatedData.updated_at),
        });
        setShowPriorityModal(false);
        
        showSuccess(`Task priority updated to ${newPriority}`);
      } else {
        showErrorAlert('Error', 'Failed to update task priority');
      }
    } catch (err) {
      console.error('Error updating task priority:', err);
      showErrorAlert('Error', 'Failed to update task priority');
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    if (task) {
      const updatedSubtasks = task.subtasks.map(subtask =>
        subtask.id === subtaskId
          ? { ...subtask, completed: !subtask.completed }
          : subtask,
      );
      const completedCount = updatedSubtasks.filter(s => s.completed).length;
      const progress = Math.round(
        (completedCount / updatedSubtasks.length) * 100,
      );

      setTask({
        ...task,
        subtasks: updatedSubtasks,
        progress,
        updatedAt: new Date(),
      });
    }
  };

  // Check if current user can comment on this task
  const canComment = () => {
    if (!user || !task) return false;
    
    // CEO can comment on any task
    if (user.role?.toLowerCase() === 'ceo') return true;
    
    // Check if user is assigned to the task
    const isAssigned = task.assignees?.some(assignee => assignee.id === user.id) || false;
    const isReporter = task.reporter?.id === user.id;
    const isOwner = task.owned_by === user.id;
    
    return isAssigned || isReporter || isOwner;
  };

  const addComment = async () => {
    if (newComment.trim() && task && user && canComment()) {
      const tempComment: TaskComment = {
        id: `temp-${Date.now()}`,
        content: newComment.trim(),
        author: {
          id: user.id,
          name: user.name || 'You',
          avatar: user.name?.charAt(0).toUpperCase() || 'U',
          role: user.role || 'Team Member',
          email: user.email || 'user@company.com',
        },
        timestamp: new Date(),
      };

      // Optimistically update UI
      const updatedTask = {
        ...task,
        comments: [...task.comments, tempComment],
        updatedAt: new Date(),
      };
      setTask(updatedTask);
      setNewComment('');

      // Animation feedback
      commentInputScale.value = withSpring(0.95, {}, () => {
        commentInputScale.value = withSpring(1);
      });

      try {
        // Make API call to persist comment
        const response = await taskService.addComment(task.id, tempComment.content);
        if (response.success) {
          // Replace temporary comment with real one
          setTask({
            ...updatedTask,
            comments: updatedTask.comments.map(c => 
              c.id === tempComment.id ? response.data : c
            ),
          });
        } else {
          throw new Error('Failed to add comment');
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        // Revert optimistic update on error
        setTask({
          ...task,
          comments: task.comments.filter(c => c.id !== tempComment.id),
        });
        showErrorAlert('Error', 'Failed to add comment');
      }
    }
  };

  const editComment = async (commentId: string, newContent: string) => {
    if (task && user) {
      // Store original comment for potential rollback
      const originalComment = task.comments.find(c => c.id === commentId);
      if (!originalComment) return;

      // Optimistically update UI
      const updatedComments = task.comments.map(comment =>
        comment.id === commentId
          ? { ...comment, content: newContent, timestamp: new Date() }
          : comment
      );

      const updatedTask = {
        ...task,
        comments: updatedComments,
        updatedAt: new Date(),
      };
      setTask(updatedTask);

      try {
        // Make API call to persist edit
        const response = await taskService.updateComment(task.id, commentId, newContent);
        if (response.success) {
          // Update with server response
          setTask({
            ...updatedTask,
            comments: updatedTask.comments.map(c => 
              c.id === commentId ? response.data : c
            ),
          });
        } else {
          throw new Error('Failed to edit comment');
        }
      } catch (error) {
        console.error('Error editing comment:', error);
        // Revert on error
        setTask({
          ...task,
          comments: task.comments.map(c => 
            c.id === commentId ? originalComment : c
          ),
        });
        showErrorAlert('Error', 'Failed to edit comment');
      }
    }
  };

  const deleteComment = async (commentId: string) => {
    if (task) {
      // Store original comment for potential rollback
      const originalComment = task.comments.find(c => c.id === commentId);
      if (!originalComment) return;

      // Optimistically update UI
      const updatedComments = task.comments.filter(comment => comment.id !== commentId);
      const updatedTask = {
        ...task,
        comments: updatedComments,
        updatedAt: new Date(),
      };
      setTask(updatedTask);

      try {
        // Make API call to persist deletion
        const response = await taskService.deleteComment(task.id, commentId);
        if (!response.success) {
          throw new Error('Failed to delete comment');
        }
        // Keep the optimistic update since deletion was successful
      } catch (error) {
        console.error('Error deleting comment:', error);
        // Revert on error - restore the deleted comment
        setTask({
          ...task,
          comments: [...task.comments, originalComment].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
        });
        showErrorAlert('Error', 'Failed to delete comment');
      }
    }
  };

  const handleEditPress = () => {
    if (task) {
      navigation.navigate('TaskCreateScreen', { 
        taskId: task.id,
        channelId: task.channel_id 
      });
    }
  };

  const handleCompletePress = () => {
    if (task?.status !== 'completed') {
      showConfirm(
        'Complete Task',
        'Are you sure you want to mark this task as completed?',
        () => updateTaskStatus('completed'),
        undefined,
        {
          confirmText: 'Complete',
          cancelText: 'Cancel',
        }
      );
    }
  };

  const handleAddAssignee = () => {
    // Future: implement add assignee functionality
    console.log('Add assignee');
  };

  if (isLoading) {
    return (
      <View
        className="flex-1 bg-gray-50 items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <View className="items-center">
          <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Text className="text-blue-600 text-lg font-bold">⏳</Text>
          </View>
          <Text className="text-gray-600 text-lg font-medium">Loading task...</Text>
          <Text className="text-gray-400 text-sm mt-1">Please wait a moment</Text>
        </View>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View
        className="flex-1 bg-gray-50 items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <View className="items-center">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <Text className="text-red-600 text-lg font-bold">⚠️</Text>
          </View>
          <Text className="text-gray-600 text-lg font-medium">{error || 'Task not found'}</Text>
          <Text className="text-gray-400 text-sm mt-1">Please check the task ID</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Clean Header */}
      <TaskDetailHeader
        title="Task Details"
        subtitle={task.channelName!}
        onBack={() => navigation.goBack()}
        onEdit={handleEditPress}
        isEditing={isEditing}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* Task Overview Card */}
        <TaskOverviewCard
          task={task}
          onStatusPress={() => setShowStatusModal(true)}
          onPriorityPress={() => setShowPriorityModal(true)}
        />

        {/* Progress & Additional Details Row */}
        <View className="mx-6 mt-4">
          <TaskProgressCard
            task={task}
            formatDueDate={TaskUtils.formatDueDate}
          />
        </View>

        {/* Additional Task Details */}
        <TaskDetailsCard task={task} />

        {/* People Section */}
        <TaskAssigneesCard
          assignees={task.assignees!}
          onAddAssignee={handleAddAssignee}
          onAssigneePress={(assigneeId) => {
            navigation.navigate('UserProfile', { userId: assigneeId });
          }}
        />

        {/* Task Management Section */}
        {task.subtasks && task.subtasks.length > 0 && (
          <TaskSubtasksCard
            subtasks={task.subtasks}
            onToggleSubtask={toggleSubtask}
            onAddSubtask={() => {
              // Future: implement add subtask functionality
              console.log('Add subtask');
            }}
          />
        )}

        {/* Tags */}
        <TaskTagsCard tags={task.tags} />

        {/* Comments Section */}
        <TaskCommentsCard
          comments={task.comments}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          onAddComment={addComment}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
          formatTimeAgo={TaskUtils.formatTimeAgo}
          commentInputScale={commentInputScale}
          onAuthorPress={(authorId) => {
            navigation.navigate('UserProfile', { userId: authorId });
          }}
          currentUserId={user?.id || ''}
          currentUserRole={user?.role}
          canComment={canComment()}
        />

        {/* Bottom Spacing */}
        <View className="h-4" />
      </ScrollView>

      {/* Floating Action Buttons */}
      <TaskDetailFloatingActions
        fabScale={fabScale}
        onEditPress={handleEditPress}
        onCompletePress={handleCompletePress}
      />

      {/* Status Modal */}
      <TaskStatusModal
        visible={showStatusModal}
        currentStatus={task.status}
        onStatusChange={updateTaskStatus}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Priority Modal */}
      <TaskPriorityModal
        visible={showPriorityModal}
        currentPriority={task.priority}
        onPriorityChange={updateTaskPriority}
        onClose={() => setShowPriorityModal(false)}
      />
    </View>
  );
};