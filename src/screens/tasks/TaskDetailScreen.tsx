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
import { userService } from '../../services/api/userService';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../components/common/UIProvider';

// Import existing components
import { TaskDetailHeader } from '../../components/task/TaskDetailHeader';
import { TaskOverviewCard } from '../../components/task/TaskOverviewCard';
import { TaskProgressCard } from '../../components/task/TaskProgressCard';
import { TaskAssigneesCard } from '../../components/task/TaskAssigneesCard';
// TaskSubtasksCard removed - subtasks not implemented yet
import { TaskCommentsCard } from '../../components/task/TaskCommentsCard';
import { TaskTagsCard } from '../../components/task/TaskTagsCard';
import { TaskStatusModal } from '../../components/task/TaskStatusModal';
import { TaskPriorityModal } from '../../components/task/TaskPriorityModal';
import { TaskProgressModal } from '../../components/task/TaskProgressModal';
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
  const [task, setTask] = useState<(Task & { assignees?: TaskAssignee[]; reporter?: TaskAssignee }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [_showAssigneeModal, _setShowAssigneeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentLoadingStates, setCommentLoadingStates] = useState<{
    [commentId: string]: {
      editing?: boolean;
      deleting?: boolean;
    };
  }>({});
  const [reactionLoadingStates, setReactionLoadingStates] = useState<{
    [commentId: string]: {
      thumbs_up?: boolean;
      thumbs_down?: boolean;
    };
  }>({});
  
  // Get current user from auth context
  const { user } = useAuth();
  const { showErrorAlert, showConfirm, showSuccess } = useUI();
  
  // Debug current user
  React.useEffect(() => {
    console.log('🔧 TaskDetailScreen user debug:', {
      user,
      userId: user?.id,
      userIdType: typeof user?.id,
      userRole: user?.role,
      userEmail: user?.email
    });
  }, [user]);

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
      // Always refresh when screen comes into focus to ensure we have latest data
      console.log('🔄 Screen focused, forcing fresh data reload...');
      
      // Clear current state to force fresh API call
      setTask(null);
      setError(null);
      
      // Force fresh load from backend
      loadTaskDetails();
    });

    return unsubscribe;
  }, [navigation]); // Removed 'task' dependency to prevent multiple listeners

  // Helper function to fetch user details
  const fetchUserDetails = async (userId: string): Promise<TaskAssignee> => {
    try {
      const user = await userService.getUserById(userId);
      return {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role || 'Team Member',
        email: user.email,
      };
    } catch (error) {
      console.warn('Failed to fetch user details for:', userId, error);
      // Fallback to dummy data if API call fails
      return {
        id: userId,
        name: `User ${userId.substring(0, 8)}`,
        avatar_url: undefined,
        role: 'Team Member',
        email: `${userId}@company.com`,
      };
    }
  };

  const loadTaskDetails = async (isRefresh = false) => {
    try {
      console.log('🔧 loadTaskDetails started for taskId:', taskId);
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      if (!taskId) {
        throw new Error('No task ID provided');
      }
      
      console.log('🔧 Making FRESH getTask API call for taskId:', taskId);
      console.log('🔧 API Base URL:', API_BASE_URL);
      console.log('🔧 Forcing fresh backend data fetch...');
      
      // Add timeout to prevent hanging (shorter for local dev)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          console.log('⏰ API call timed out after 8 seconds for taskId:', taskId);
          reject(new Error('Request timeout - API call took too long'));
        }, 8000)
      );
      
      const apiCallPromise = taskService.getTask(taskId);
      console.log('🔧 Starting Promise.race between API call and timeout...');
      
      const response = await Promise.race([
        apiCallPromise,
        timeoutPromise
      ]) as any;
      console.log('🔧 getTask response received:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'no data'
      });
      if (response.success && response.data) {
        const taskData = response.data;
        
        // Use assignee_details from backend response (no need for separate API calls)
        console.log('🔧 Using assignee_details from backend response...');
        
        // Transform assignee_details to TaskAssignee format
        const assignees: TaskAssignee[] = (taskData as any).assignee_details?.map((assigneeDetail: any) => ({
          id: assigneeDetail.id,
          name: assigneeDetail.name,
          avatar_url: assigneeDetail.avatar_url,
          role: assigneeDetail.role || 'Team Member',
          email: assigneeDetail.email,
        })) || [];
        
        // For reporter, try to find in assignee_details first, then use owner_name, otherwise fetch separately
        let reporter: TaskAssignee;
        const reporterFromAssignees = assignees.find(assignee => assignee.id === taskData.created_by);
        
        if (reporterFromAssignees) {
          reporter = { ...reporterFromAssignees, role: 'Task Creator' };
        } else if ((taskData as any).owner_name) {
          // Use owner_name from backend response
          reporter = {
            id: taskData.created_by,
            name: (taskData as any).owner_name,
            avatar_url: undefined,
            role: 'Task Creator',
            email: `${taskData.created_by}@company.com`, // Fallback email
          };
        } else {
          // If reporter is not in assignees and no owner_name, fetch separately
          reporter = await fetchUserDetails(taskData.created_by);
          reporter.role = 'Task Creator';
        }
        
        console.log('🔧 User details processed:', {
          assigneesCount: assignees.length,
          reporterId: reporter.id,
          reporterName: reporter.name,
          assigneeNames: assignees.map(a => a.name),
          hasAssigneeDetails: !!(taskData as any).assignee_details
        });

        // Load comments in parallel with task data
        let transformedComments: TaskComment[] = [];
        
        try {
          console.log('🔧 Loading comments for taskId:', taskId);
          const commentsResponse = await taskService.getTaskComments(taskId);
          console.log('🔧 Comments response received:', commentsResponse.success);
          
          if (commentsResponse.success && Array.isArray(commentsResponse.data)) {
            console.log('🗨️ Loading comments from API:', commentsResponse.data.length, 'comments');
            
            // Transform backend comment format to frontend TaskComment format
            transformedComments = commentsResponse.data.map((apiComment: any) => ({
              id: apiComment.id,
              content: apiComment.content,
              author: {
                id: apiComment.author_id,
                name: apiComment.author_name || 'Unknown User',
                email: apiComment.author_email || '',
                avatar_url: undefined,
                role: 'Team Member' // Default role since backend doesn't provide it
              },
              timestamp: apiComment.created_at ? new Date(apiComment.created_at) : new Date(),
              reactions: { 
                thumbs_up: apiComment.up_count ? parseInt(apiComment.up_count) : 0, 
                thumbs_down: apiComment.down_count ? parseInt(apiComment.down_count) : 0 
              },
              userReactions: {},
              // Include only essential API response fields
              up_count: apiComment.up_count || '0',
              down_count: apiComment.down_count || '0',
              total_reactions: apiComment.total_reactions || '0',
              user_reaction: apiComment.user_reaction || null
            }));
            
            console.log('🗨️ Transformed comments:', transformedComments.length);
          } else {
            console.warn('🗨️ Invalid comments response:', commentsResponse);
          }
        } catch (commentsError) {
          console.error('❌ Failed to load comments:', commentsError);
          // Comments will remain empty array
        }

        // Transform backend data to match component expectations
        const transformedTask: Task & { 
          assignees?: TaskAssignee[]; 
          reporter?: TaskAssignee;
          channelId?: string;
          channelName?: string;
          dueDate?: Date;
          createdAt?: Date;
          updatedAt?: Date;
          completedAt?: Date;
          estimatedHours?: number;
          actualHours?: number;
          progress?: number;
          category?: string;
          comments?: TaskComment[];
          attachments?: any[];
          dependencies?: any[];
          subtasks?: any[];
        } = {
          ...taskData,
          // Use real user data instead of dummy data
          assignees,
          reporter,
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
          // Include comments fetched from API
          comments: transformedComments,
          attachments: [], // Not implemented yet
          dependencies: [], // Not implemented yet
          subtasks: [], // Not implemented yet
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
        
        // Set task state once with all data
        console.log('🔧 Setting complete task data:', {
          taskId: transformedTask.id,
          assigneesCount: transformedTask.assignees?.length || 0,
          commentsCount: transformedTask.comments?.length || 0,
          status: transformedTask.status,
          priority: transformedTask.priority
        });
        
        setTask(transformedTask);
      } else {
        console.log('❌ API response indicates failure:', {
          success: response.success,
          hasData: !!response.data,
          response: response
        });
        setError('Failed to load task details - API returned error');
      }
    } catch (err) {
      console.error('❌ Error loading task details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        taskId: taskId,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load task';
      console.log('🔧 Setting error state:', errorMessage);
      setError(errorMessage);
      
      // If it's an auth error, we should redirect to login
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        console.log('🔧 Authentication error detected, user needs to login');
        setError('Authentication required. Please log in again.');
      }
    } finally {
      console.log('🔧 loadTaskDetails finally block - setting loading to false');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered, forcing fresh data from backend...');
    
    // Clear all cached state
    setTask(null);
    setError(null);
    
    // Force fresh API call
    loadTaskDetails(true);
  };

  // Action handlers
  const updateTaskStatus = async (newStatus: TaskStatus) => {
    if (!task) {
      console.error('❌ No task available for status update');
      return;
    }
    
    try {
      console.log('🔄 Updating task status:', { taskId: task.id, newStatus, oldStatus: task.status });
      
      // Prepare complete task data with updated status
      const updatedTaskData = {
        title: task.title,
        description: task.description,
        status: newStatus,
        priority: task.priority,
        task_type: task.task_type,
        assigned_to: task.assignees?.map(a => a.id) || [],
        owned_by: task.owned_by,
        created_by: task.created_by || task.owned_by,
        channel_id: task.channel_id,
        due_date: task.due_date,
        start_date: task.start_date,
        estimated_hours: task.estimated_hours,
        tags: task.tags || [],
        business_value: task.business_value || 'medium',
        labels: task.labels || {},
      };
      
      console.log('🔄 Sending complete task data:', updatedTaskData);
      const response = await taskService.updateTask(task.id, updatedTaskData);
      console.log('🔄 Status update response:', { success: response.success, hasData: !!response.data });
      
      if (response.success && response.data) {
        setShowStatusModal(false);
        
        console.log('✅ Task status updated successfully, waiting for backend sync...');
        
        // Wait a moment for backend to fully process the update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear all cached state and force fresh reload from API
        setTask(null);
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Fetching fresh task data from backend...');
        await loadTaskDetails();
        
        showSuccess(`Task status updated to ${newStatus}`);
      } else {
        console.error('❌ Status update failed:', response);
        showErrorAlert('Error', 'Failed to update task status');
      }
    } catch (err) {
      console.error('❌ Error updating task status:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        taskId: task.id,
        newStatus
      });
      showErrorAlert('Error', `Failed to update task status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const updateTaskPriority = async (newPriority: TaskPriority) => {
    if (!task) {
      console.error('❌ No task available for priority update');
      return;
    }
    
    try {
      console.log('🔄 Updating task priority:', { taskId: task.id, newPriority, oldPriority: task.priority });
      
      // Prepare complete task data with updated priority
      const updatedTaskData = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: newPriority,
        task_type: task.task_type,
        assigned_to: task.assignees?.map(a => a.id) || [],
        owned_by: task.owned_by,
        created_by: task.created_by || task.owned_by,
        channel_id: task.channel_id,
        due_date: task.due_date,
        start_date: task.start_date,
        estimated_hours: task.estimated_hours,
        tags: task.tags || [],
        business_value: task.business_value || 'medium',
        labels: task.labels || {},
      };
      
      console.log('🔄 Sending complete task data:', updatedTaskData);
      const response = await taskService.updateTask(task.id, updatedTaskData);
      console.log('🔄 Priority update response:', { success: response.success, hasData: !!response.data });
      
      if (response.success && response.data) {
        setShowPriorityModal(false);
        
        console.log('✅ Task priority updated successfully, waiting for backend sync...');
        
        // Wait a moment for backend to fully process the update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear all cached state and force fresh reload from API
        setTask(null);
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Fetching fresh task data from backend...');
        await loadTaskDetails();
        
        showSuccess(`Task priority updated to ${newPriority}`);
      } else {
        console.error('❌ Priority update failed:', response);
        showErrorAlert('Error', 'Failed to update task priority');
      }
    } catch (err) {
      console.error('❌ Error updating task priority:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        taskId: task.id,
        newPriority
      });
      showErrorAlert('Error', `Failed to update task priority: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const updateTaskProgress = async (newProgress: number) => {
    if (!task) {
      console.error('❌ No task available for progress update');
      return;
    }
    
    try {
      setIsUpdatingProgress(true);
      console.log('🔄 Updating task progress:', { taskId: task.id, newProgress, oldProgress: task.progress_percentage });
      
      // Prepare complete task data with updated progress
      const updatedTaskData = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        task_type: task.task_type,
        assigned_to: task.assignees?.map(a => a.id) || [],
        owned_by: task.owned_by,
        created_by: task.created_by || task.owned_by,
        channel_id: task.channel_id,
        due_date: task.due_date,
        start_date: task.start_date,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        progress_percentage: newProgress, // This is the key field we're updating
        tags: task.tags || [],
        business_value: task.business_value || 'medium',
        labels: task.labels || {},
      };
      
      console.log('🔄 Sending complete task data with updated progress:', updatedTaskData);
      const response = await taskService.updateTask(task.id, updatedTaskData);
      console.log('🔄 Progress update response:', { success: response.success, hasData: !!response.data });
      
      if (response.success && response.data) {
        console.log('✅ Task progress updated successfully, waiting for backend sync...');
        
        // Wait a moment for backend to fully process the update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear all cached state and force fresh reload from API
        setTask(null);
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Fetching fresh task data from backend...');
        await loadTaskDetails();
        
        showSuccess(`Task progress updated to ${newProgress}%`);
      } else {
        console.error('❌ Progress update failed:', response);
        showErrorAlert('Error', 'Failed to update task progress');
      }
    } catch (err) {
      console.error('❌ Error updating task progress:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        taskId: task.id,
        newProgress
      });
      showErrorAlert('Error', `Failed to update task progress: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Subtasks functionality removed - not implemented in backend yet

  // Check if current user can comment on this task
  const canComment = () => {
    if (!user || !task) {
      console.log('🚫 Cannot comment: Missing user or task', { hasUser: !!user, hasTask: !!task });
      return false;
    }
    
    // CEO can comment on any task
    if (user.role?.toLowerCase() === 'ceo') {
      console.log('✅ Can comment: User is CEO');
      return true;
    }
    
    // Check if user is assigned to the task
    const isAssigned = task.assignees?.some(assignee => assignee.id === user.id) || false;
    const isReporter = task.reporter?.id === user.id;
    const isOwner = task.owned_by === user.id;
    
    console.log('🔍 Comment permission check:', {
      userId: user.id,
      userRole: user.role,
      taskId: task.id,
      isAssigned,
      isReporter,
      isOwner,
      assigneesIds: task.assignees?.map(a => a.id),
      reporterId: task.reporter?.id,
      ownedBy: task.owned_by,
      canComment: isAssigned || isReporter || isOwner
    });
    
    return isAssigned || isReporter || isOwner;
  };

  // Check if current user can delete this task
  const canDelete = () => {
    if (!user || !task) {
      return false;
    }
    
    // Only CEO and managers can delete tasks
    return user.role?.toLowerCase() === 'ceo' || user.role?.toLowerCase() === 'manager';
  };

  const addComment = async (content?: string) => {
    const commentContent = content || newComment;
    
    if (!commentContent?.trim()) {
      showErrorAlert('Error', 'Please enter a comment before posting.');
      return;
    }
    
    if (!task) {
      showErrorAlert('Error', 'Task not found. Please refresh and try again.');
      return;
    }
    
    if (!user) {
      showErrorAlert('Error', 'User not authenticated. Please log in again.');
      return;
    }
    
    if (!canComment()) {
      showErrorAlert('Error', 'You are not authorized to comment on this task. Only assigned team members, the task creator, or CEO can add comments.');
      return;
    }

    // Set loading state
    setIsAddingComment(true);
    setNewComment('');

    // Animation feedback
    commentInputScale.value = withSpring(0.95, {}, () => {
      commentInputScale.value = withSpring(1);
    });

    try {
      console.log('🗨️ Adding comment to task:', {
        taskId: task.id,
        userId: user.id,
        contentLength: commentContent.trim().length,
        canComment: canComment()
      });
      
      // Make API call to add comment
      const response = await taskService.addComment(task.id, commentContent.trim(), user.id);
      
      if (response.success) {
        console.log('🗨️ Comment added successfully, refreshing comments...');
        // Reload comments to get the updated list from backend
        const commentsResponse = await taskService.getTaskComments(task.id);
        
        if (commentsResponse.success && Array.isArray(commentsResponse.data)) {
          // Transform comments with backend data
          const transformedComments: TaskComment[] = commentsResponse.data.map((apiComment: any) => ({
            id: apiComment.id,
            content: apiComment.content,
            author: {
              id: apiComment.author_id,
              name: apiComment.author_name || 'Unknown User',
              email: apiComment.author_email || '',
              avatar_url: undefined,
              role: 'Team Member'
            },
            timestamp: apiComment.created_at ? new Date(apiComment.created_at) : new Date(),
            reactions: { 
              thumbs_up: apiComment.up_count ? parseInt(apiComment.up_count) : 0, 
              thumbs_down: apiComment.down_count ? parseInt(apiComment.down_count) : 0 
            },
            userReactions: {},
            // Include API response fields
            up_count: apiComment.up_count || '0',
            down_count: apiComment.down_count || '0',
            total_reactions: apiComment.total_reactions || '0',
            user_reaction: apiComment.user_reaction || null
          }));
          
          // Update task with fresh comments
          setTask(prevTask => prevTask ? {
            ...prevTask,
            comments: transformedComments,
            updatedAt: new Date()
          } : prevTask);
          
          showSuccess('Comment added successfully!');
          console.log('🗨️ Comments updated with backend data');
        }
      } else {
        throw new Error('Server returned unsuccessful response');
      }
    } catch (error: any) {
      console.error('❌ Error adding comment:', {
        error: error.message || error,
        statusCode: error.statusCode,
        code: error.code,
        taskId: task.id,
        userId: user.id
      });
      
      // Restore the comment text on error
      setNewComment(commentContent);
      
      // Show appropriate error message based on error type
      let errorMessage = 'Failed to add comment. Please try again.';
      
      if (error.statusCode === 401 || error.statusCode === 403) {
        errorMessage = 'You are not authorized to comment on this task. Please check your permissions.';
      } else if (error.statusCode === 404) {
        errorMessage = 'Task not found. It may have been deleted or you may not have access to it.';
      } else if (error.statusCode === 422) {
        errorMessage = 'Invalid comment data. Please check your input and try again.';
      } else if (error.statusCode >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      
      showErrorAlert('Comment Failed', errorMessage);
    } finally {
      setIsAddingComment(false);
    }
  };

  const editComment = async (commentId: string, newContent: string) => {
    if (!task || !user) {
      console.log('🔧 Missing task or user, cannot edit comment');
      return;
    }

    // Set loading state for this comment
    setCommentLoadingStates(prev => ({
      ...prev,
      [commentId]: {
        ...prev[commentId],
        editing: true
      }
    }));

    try {
      console.log('🔧 Editing comment:', { commentId, newContent: newContent.substring(0, 50) });
      
      // Make API call to edit comment
      const response = await taskService.updateComment(task.id, commentId, newContent);
      
      if (response.success) {
        console.log('🔧 Comment edited successfully, refreshing comments...');
        // Reload comments to get the updated list from backend
        const commentsResponse = await taskService.getTaskComments(task.id);
        
        if (commentsResponse.success && Array.isArray(commentsResponse.data)) {
          // Transform comments with backend data
          const transformedComments: TaskComment[] = commentsResponse.data.map((apiComment: any) => ({
            id: apiComment.id,
            content: apiComment.content,
            author: {
              id: apiComment.author_id,
              name: apiComment.author_name || 'Unknown User',
              email: apiComment.author_email || '',
              avatar_url: undefined,
              role: 'Team Member'
            },
            timestamp: apiComment.created_at ? new Date(apiComment.created_at) : new Date(),
            reactions: { 
              thumbs_up: apiComment.up_count ? parseInt(apiComment.up_count) : 0, 
              thumbs_down: apiComment.down_count ? parseInt(apiComment.down_count) : 0 
            },
            userReactions: {},
            // Include API response fields
            up_count: apiComment.up_count || '0',
            down_count: apiComment.down_count || '0',
            total_reactions: apiComment.total_reactions || '0',
            user_reaction: apiComment.user_reaction || null
          }));
          
          // Update task with fresh comments
          setTask(prevTask => prevTask ? {
            ...prevTask,
            comments: transformedComments,
            updatedAt: new Date()
          } : prevTask);
          
          showSuccess('Comment updated successfully!');
          console.log('🔧 Comments updated with backend data after edit');
        }
      } else {
        throw new Error('Failed to edit comment');
      }
    } catch (error: any) {
      console.error('🔧 Error editing comment:', error);
      showErrorAlert('Error', 'Failed to edit comment');
    } finally {
      // Clear loading state
      setCommentLoadingStates(prev => ({
        ...prev,
        [commentId]: {
          ...prev[commentId],
          editing: false
        }
      }));
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!task) {
      console.log('🔧 Missing task, cannot delete comment');
      return;
    }

    // Set loading state for this comment
    setCommentLoadingStates(prev => ({
      ...prev,
      [commentId]: {
        ...prev[commentId],
        deleting: true
      }
    }));

    try {
      console.log('🔧 Deleting comment:', { commentId });
      
      // Make API call to delete comment
      const response = await taskService.deleteComment(task.id, commentId);
      
      if (response.success) {
        console.log('🔧 Comment deleted successfully, refreshing comments...');
        // Reload comments to get the updated list from backend
        const commentsResponse = await taskService.getTaskComments(task.id);
        
        if (commentsResponse.success && Array.isArray(commentsResponse.data)) {
          // Transform comments with backend data
          const transformedComments: TaskComment[] = commentsResponse.data.map((apiComment: any) => ({
            id: apiComment.id,
            content: apiComment.content,
            author: {
              id: apiComment.author_id,
              name: apiComment.author_name || 'Unknown User',
              email: apiComment.author_email || '',
              avatar_url: undefined,
              role: 'Team Member'
            },
            timestamp: apiComment.created_at ? new Date(apiComment.created_at) : new Date(),
            reactions: { 
              thumbs_up: apiComment.up_count ? parseInt(apiComment.up_count) : 0, 
              thumbs_down: apiComment.down_count ? parseInt(apiComment.down_count) : 0 
            },
            userReactions: {},
            // Include API response fields
            up_count: apiComment.up_count || '0',
            down_count: apiComment.down_count || '0',
            total_reactions: apiComment.total_reactions || '0',
            user_reaction: apiComment.user_reaction || null
          }));
          
          // Update task with fresh comments
          setTask(prevTask => prevTask ? {
            ...prevTask,
            comments: transformedComments,
            updatedAt: new Date()
          } : prevTask);
          
          showSuccess('Comment deleted successfully!');
          console.log('🔧 Comments updated with backend data after delete');
        }
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error: any) {
      console.error('🔧 Error deleting comment:', error);
      showErrorAlert('Error', 'Failed to delete comment');
    } finally {
      // Clear loading state
      setCommentLoadingStates(prev => ({
        ...prev,
        [commentId]: {
          ...prev[commentId],
          deleting: false
        }
      }));
    }
  };

  const reactToComment = async (commentId: string, reaction: 'thumbs_up' | 'thumbs_down') => {
    console.log('🔧 reactToComment called:', {
      commentId,
      reaction,
      hasTask: !!task,
      hasUser: !!user
    });

    if (!task || !user) {
      console.log('🔧 Missing task or user, cannot react');
      return;
    }

    // Set loading state for this specific reaction
    setReactionLoadingStates(prev => ({
      ...prev,
      [commentId]: {
        ...prev[commentId],
        [reaction]: true
      }
    }));

    try {
      console.log('🔧 Making API call to react to comment...');
      const response = await taskService.reactToComment(task.id, commentId, reaction);
      
      if (response.success) {
        console.log('🔧 Reaction API call successful, refreshing comments...');
        // Reload comments to get the updated reaction counts from backend
        const commentsResponse = await taskService.getTaskComments(task.id);
        
        if (commentsResponse.success && Array.isArray(commentsResponse.data)) {
          // Transform comments with backend data
          const transformedComments: TaskComment[] = commentsResponse.data.map((apiComment: any) => ({
            id: apiComment.id,
            content: apiComment.content,
            author: {
              id: apiComment.author_id,
              name: apiComment.author_name || 'Unknown User',
              email: apiComment.author_email || '',
              avatar_url: undefined,
              role: 'Team Member'
            },
            timestamp: apiComment.created_at ? new Date(apiComment.created_at) : new Date(),
            reactions: { 
              thumbs_up: apiComment.up_count ? parseInt(apiComment.up_count) : 0, 
              thumbs_down: apiComment.down_count ? parseInt(apiComment.down_count) : 0 
            },
            userReactions: {},
            // Include API response fields
            up_count: apiComment.up_count || '0',
            down_count: apiComment.down_count || '0',
            total_reactions: apiComment.total_reactions || '0',
            user_reaction: apiComment.user_reaction || null
          }));
          
          // Update task with fresh comments
          setTask(prevTask => prevTask ? {
            ...prevTask,
            comments: transformedComments
          } : prevTask);
          
          console.log('🔧 Comments updated with backend data');
        }
      } else {
        throw new Error('Failed to react to comment');
      }
    } catch (error) {
      console.error('🔧 Error reacting to comment:', error);
      showErrorAlert('Error', 'Failed to react to comment');
    } finally {
      // Clear loading state
      setReactionLoadingStates(prev => ({
        ...prev,
        [commentId]: {
          ...prev[commentId],
          [reaction]: false
        }
      }));
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
        'Are you sure you want to mark this task as completed? This will change the status to completed but won\'t automatically set progress to 100%.',
        () => updateTaskStatus('completed'),
        undefined,
        {
          confirmText: 'Complete',
          cancelText: 'Cancel',
        }
      );
    }
  };

  const handleDeletePress = () => {
    if (!task || !canDelete()) {
      return;
    }

    showConfirm(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      async () => {
        try {
          // Import taskService for delete operation
          const { taskService } = await import('../../services/api/taskService');
          
          const response = await taskService.deleteTask(task.id);
          if (response.success) {
            showSuccess('Task deleted successfully');
            // Navigate to tasks screen and refresh the list
            navigation.reset({
              index: 0,
              routes: [{ name: 'TasksScreen' }],
            });
          } else {
            throw new Error('Failed to delete task');
          }
        } catch (error) {
          console.error('Error deleting task:', error);
          showErrorAlert('Error', 'Failed to delete task. Please try again.');
        }
      },
      undefined,
      {
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }
    );
  };

  const handleAddAssignee = () => {
    // Future: implement add assignee functionality
    console.log('Add assignee');
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F9FAFB',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{
            width: 64,
            height: 64,
            backgroundColor: '#DBEAFE',
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <Text style={{ color: '#2563EB', fontSize: 18, fontWeight: 'bold' }}>⏳</Text>
          </View>
          <Text style={{ color: '#4B5563', fontSize: 18, fontWeight: '500' }}>Loading task...</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F9FAFB',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{
            width: 64,
            height: 64,
            backgroundColor: '#FEE2E2',
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <Text style={{ color: '#DC2626', fontSize: 18, fontWeight: 'bold' }}>⚠️</Text>
          </View>
          <Text style={{ color: '#4B5563', fontSize: 18, fontWeight: '500' }}>{error || 'Task not found'}</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>Please check the task ID</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Clean Header */}
      <TaskDetailHeader
        title="Task Details"
        subtitle={task.channel_name!}
        onBack={() => navigation.goBack()}
        onEdit={handleEditPress}
        isEditing={false}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={{ flex: 1 }}
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
        <View style={{ marginHorizontal: 24, marginTop: 16 }}>
          <TaskProgressCard
            task={task}
            formatDueDate={TaskUtils.formatDueDate}
            onProgressPress={() => setShowProgressModal(true)}
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

        {/* Subtasks removed - not implemented in backend yet */}

        {/* Tags */}
        <TaskTagsCard tags={task.tags} />

        {/* Comments Section */}
        {(() => {
          console.log('🔧 About to render TaskCommentsCard with:', {
            taskExists: !!task,
            commentsCount: task.comments?.length || 0,
            commentsArray: task.comments,
            firstComment: task.comments?.[0]
          });
          return null;
        })()}
        <TaskCommentsCard
          comments={task.comments}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          onAddComment={addComment}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
          onReactToComment={reactToComment}
          formatTimeAgo={TaskUtils.formatTimeAgo}
          commentInputScale={commentInputScale}
          onAuthorPress={(authorId) => {
            navigation.navigate('UserProfile', { userId: authorId });
          }}
          currentUserId={user?.id || user?.email || ''}
          currentUserRole={user?.role}
          canComment={canComment()}
          taskAssignees={task.assignees || []}
          isAddingComment={isAddingComment}
          reactionLoadingStates={reactionLoadingStates}
          commentLoadingStates={commentLoadingStates}
        />

        {/* Bottom Spacing */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <TaskDetailFloatingActions
        fabScale={fabScale}
        onDeletePress={handleDeletePress}
        onCompletePress={handleCompletePress}
        showDeleteButton={canDelete()}
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

      {/* Progress Modal */}
      <TaskProgressModal
        visible={showProgressModal}
        currentProgress={task.progress_percentage || 0}
        onUpdateProgress={updateTaskProgress}
        onClose={() => setShowProgressModal(false)}
        isLoading={isUpdatingProgress}
      />
    </View>
  );
};