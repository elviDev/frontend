import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import DocumentPicker from '@react-native-documents/picker';
import {
  TaskPriority,
  TaskCategory,
  TaskAssignee,
} from '../../types/task.types';
import { MainStackParamList } from '../../types/navigation.types';

// Import new components
import { TaskCreateHeader } from '../../components/task/TaskCreateHeader';
import { TaskCreateNavigation } from '../../components/task/TaskCreateNavigation';
import { TaskBasicInfo } from '../../components/task/TaskBasicInfo';
import { TaskTimeline } from '../../components/task/TaskTimeline';
import { TaskRequirements } from '../../components/task/TaskRequirements';
import { TaskTeamAssignment } from '../../components/task/TaskTeamAssignment';
import { TaskChannelSelection } from '../../components/task/TaskChannelSelection';
import { taskService } from '../../services/api/taskService';
import { channelService } from '../../services/api/channelService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { CreateTaskData } from '../../types/task.types';

type TaskCreateScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'TaskCreateScreen'
> & {
  route: {
    params?: {
      taskId?: string; // For editing existing tasks
      channelId?: string; // When creating from a channel
    };
  };
};

interface FormData {
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  startDate: Date;
  endDate: Date;
  estimatedHours: string;
  tags: string[];
  assignees: TaskAssignee[];
  features: string[];
  deliverables: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  successCriteria: Array<{
    id: string;
    criteria: string;
    met: boolean;
  }>;
  documentLinks: string[];
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    uri: string;
    size?: number;
  }>;
  // Backend fields
  channel_id?: string;
  owned_by?: string;
}

interface FormErrors {
  title: string;
  description: string;
  assignees: string;
  startDate: string;
  endDate: string;
  channel: string;
  general: string;
}

export const TaskCreateScreen: React.FC<TaskCreateScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  
  const isEditMode = !!route.params?.taskId;
  const channelId = route.params?.channelId;
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const buttonScale = useSharedValue(1);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedHours: '',
    tags: [],
    assignees: [],
    features: [],
    deliverables: [],
    successCriteria: [],
    documentLinks: [],
    attachments: [],
    channel_id: channelId,
    owned_by: user?.id,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    title: '',
    description: '',
    assignees: '',
    startDate: '',
    endDate: '',
    channel: '',
    general: '',
  });

  // UI states
  const [currentPage, setCurrentPage] = useState(1);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableAssignees, setAvailableAssignees] = useState<TaskAssignee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [isEditMode, route.params?.taskId]);

  // Reload available users when channel changes
  useEffect(() => {
    if (formData.channel_id) {
      loadAvailableUsers();
    }
  }, [formData.channel_id]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      // If editing, load existing task data first (which will load assignees for the task's channel)
      if (isEditMode && route.params?.taskId) {
        await loadExistingTask(route.params.taskId);
      } else {
        // For new task creation, load available users for assignment
        await loadAvailableUsers();
        
        if (channelId) {
          // Pre-fill channel if creating from channel
          setFormData(prev => ({ ...prev, channel_id: channelId }));
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showError('Failed to load data. Please try again.', 5000);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      let channelMembers: TaskAssignee[] = [];
      
      // Only load members if we have a channel ID selected
      const targetChannelId = formData.channel_id || channelId;
      if (!targetChannelId) {
        console.log('⚠️  No channel selected - not loading members yet');
        setAvailableAssignees([]);
        return;
      }
      
      // If we have a channel ID, fetch channel members
      if (targetChannelId) {
        try {
          console.log('🔄 Loading channel members for channel:', targetChannelId);
          
          const membersResponse = await channelService.getChannelMembers(targetChannelId, { limit: 100 });
          
          if (membersResponse?.data) {
            channelMembers = membersResponse.data.map((member: any) => ({
              id: member.user_id,
              name: member.user_name || 'Unknown User',
              avatar: member.user_avatar || member.user_name?.charAt(0).toUpperCase() || '?',
              role: member.role || 'Member',
              email: member.user_email || `${member.user_id || 'unknown'}@company.com`,
            }));
            
            console.log('✅ Channel members loaded:', channelMembers.length, 'members');
          }
        } catch (channelError) {
          console.warn('Failed to load channel members, using fallback:', channelError);
          // Fall through to use fallback data
        }
      }
      
      // If API failed and no members loaded, show error state instead of fallback
      if (channelMembers.length === 0 && targetChannelId) {
        console.warn('⚠️ Failed to load channel members - no fallback data available');
        showWarning('Could not load team members. Please select a different channel or try again.', 5000);
        return;
      }
      
      // Ensure current user is in the list if not already
      const currentUserExists = channelMembers.some(member => member.id === user?.id);
      if (!currentUserExists && user?.id) {
        channelMembers.unshift({
          id: user.id,
          name: user.name || 'You',
          avatar: user.name ? user.name.split(' ').map(n => n[0]).join('') : 'YU',
          role: 'Current User',
          email: user.email || 'you@company.com',
        });
      }
      
      setAvailableAssignees(channelMembers);
      
      // Auto-assign current user if not editing
      if (!isEditMode && user?.id) {
        const currentUserAssignee = channelMembers.find(u => u.id === user.id);
        if (currentUserAssignee) {
          setFormData(prev => ({ 
            ...prev, 
            assignees: [currentUserAssignee],
            owned_by: user.id 
          }));
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showWarning('Could not load team members. Please try again or contact support.', 5000);
    }
  };

  const loadExistingTask = async (taskId: string) => {
    try {
      const response = await taskService.getTask(taskId);
      if (response.success && response.data) {
        const task = response.data;
        
        // First, set the channel_id from task data to ensure we load the right assignees
        if (task.channel_id) {
          // Load assignees for this specific channel
          try {
            console.log('🔄 Loading channel members for task channel:', task.channel_id);
            const membersResponse = await channelService.getChannelMembers(task.channel_id, { limit: 100 });
            
            if (membersResponse?.data) {
              const channelMembers = membersResponse.data.map((member: any) => ({
                id: member.user_id,
                name: member.user_name || 'Unknown User',
                avatar: member.user_avatar || member.user_name?.charAt(0).toUpperCase() || '?',
                role: member.role || 'Member',
                email: member.user_email || `${member.user_id || 'unknown'}@company.com`,
              }));
              
              setAvailableAssignees(channelMembers);
              console.log('✅ Task channel members loaded:', channelMembers.length, 'members');
              
              // Now resolve assignees with the loaded data
              const taskAssignees = channelMembers.filter(user => 
                task.assigned_to.includes(user.id)
              );
              
              // If assignees can't be resolved, warn user
              if (task.assigned_to.length > 0 && taskAssignees.length === 0) {
                console.warn('⚠️ Could not resolve assignees for existing task');
                showWarning('Some assignees could not be loaded. Please re-assign team members.', 5000);
              }
              
              // Set form data with resolved assignees
              setFormData({
                title: task.title,
                description: task.description || '',
                priority: task.priority,
                category: task.task_type as any,
                startDate: task.start_date ? new Date(task.start_date) : new Date(),
                endDate: task.due_date ? new Date(task.due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                estimatedHours: task.estimated_hours?.toString() || '',
                tags: task.tags || [],
                assignees: taskAssignees,
                features: [], // TODO: Map from custom_fields if needed
                deliverables: [], // TODO: Map from subtasks if needed
                successCriteria: [], // TODO: Map from acceptance_criteria
                documentLinks: [], // TODO: Map from external_references
                attachments: [], // TODO: Map from attachments
                channel_id: task.channel_id,
                owned_by: task.owned_by,
              });
            }
          } catch (channelError) {
            console.error('Error loading channel members:', channelError);
            showWarning('Could not load team members for this task.', 3000);
            
            // Set form data without assignees
            setFormData({
              title: task.title,
              description: task.description || '',
              priority: task.priority,
              category: task.task_type as any,
              startDate: task.start_date ? new Date(task.start_date) : new Date(),
              endDate: task.due_date ? new Date(task.due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              estimatedHours: task.estimated_hours?.toString() || '',
              tags: task.tags || [],
              assignees: [],
              features: [],
              deliverables: [],
              successCriteria: [],
              documentLinks: [],
              attachments: [],
              channel_id: task.channel_id,
              owned_by: task.owned_by,
            });
          }
        } else {
          // No channel_id in task, set form data without assignees
          setFormData({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            category: task.task_type as any,
            startDate: task.start_date ? new Date(task.start_date) : new Date(),
            endDate: task.due_date ? new Date(task.due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            estimatedHours: task.estimated_hours?.toString() || '',
            tags: task.tags || [],
            assignees: [],
            features: [],
            deliverables: [],
            successCriteria: [],
            documentLinks: [],
            attachments: [],
            channel_id: task.channel_id,
            owned_by: task.owned_by,
          });
        }
      }
    } catch (error) {
      console.error('Error loading task:', error);
      showError('Failed to load task data', 5000);
    }
  };

  const pageHeaders = [
    { title: isEditMode ? 'Edit Basic Information' : 'Basic Information', subtitle: isEditMode ? 'Update task fundamentals' : 'Define your task fundamentals' },
    { title: isEditMode ? 'Edit Channel Assignment' : 'Channel Assignment', subtitle: isEditMode ? 'Update task channel' : 'Select where this task belongs' },
    {
      title: isEditMode ? 'Edit Timeline & Planning' : 'Timeline & Planning',
      subtitle: isEditMode ? 'Update dates and details' : 'Set dates and organize details',
    },
    {
      title: isEditMode ? 'Edit Requirements & Assets' : 'Requirements & Assets',
      subtitle: isEditMode ? 'Update features and attachments' : 'Add features and attachments',
    },
    { title: isEditMode ? 'Edit Team Assignment' : 'Team Assignment', subtitle: isEditMode ? 'Update collaborators' : 'Choose your collaborators' },
  ];

  // Helper functions
  const validateCurrentPage = useCallback((): boolean => {
    const errors: FormErrors = { ...formErrors };
    let isValid = true;

    // Reset current page errors
    Object.keys(errors).forEach(key => {
      if (key !== 'general') errors[key as keyof FormErrors] = '';
    });

    switch (currentPage) {
      case 1: // Basic Information
        if (!formData.title.trim()) {
          errors.title = 'Task title is required';
          isValid = false;
        } else if (formData.title.trim().length < 3) {
          errors.title = 'Title must be at least 3 characters long';
          isValid = false;
        }

        if (!formData.description.trim()) {
          errors.description = 'Task description is required';
          isValid = false;
        } else if (formData.description.trim().length < 10) {
          errors.description =
            'Description must be at least 10 characters long';
          isValid = false;
        }
        break;

      case 2: // Channel Assignment
        if (!formData.channel_id) {
          errors.channel = 'Please select a channel for this task';
          isValid = false;
        }
        break;

      case 3: // Timeline
        if (formData.startDate >= formData.endDate) {
          errors.endDate = 'End date must be after start date';
          isValid = false;
        }
        break;

      case 4: // Requirements - no validation needed
        break;

      case 5: // Team Assignment
        if (formData.assignees.length === 0) {
          errors.assignees = 'At least one team member must be assigned';
          isValid = false;
        }
        break;
    }

    setFormErrors(errors);
    return isValid;
  }, [currentPage, formData, formErrors]);

  // Final validation before creating/updating task
  const validateFinalTask = (): boolean => {
    const errors: FormErrors = { ...formErrors };
    let isValid = true;

    // Reset all errors
    Object.keys(errors).forEach(key => {
      errors[key as keyof FormErrors] = '';
    });

    // Mandatory channel requirement
    if (!formData.channel_id) {
      errors.general = 'Tasks must be associated with a channel. Please create this task from within a channel.';
      isValid = false;
    }

    // Basic info validation
    if (!formData.title.trim()) {
      errors.title = 'Task title is required';
      isValid = false;
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long';
      isValid = false;
    }

    if (!formData.description.trim()) {
      errors.description = 'Task description is required';
      isValid = false;
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long';
      isValid = false;
    }

    // Timeline validation
    if (formData.startDate >= formData.endDate) {
      errors.endDate = 'End date must be after start date';
      isValid = false;
    }

    // Assignee validation
    if (formData.assignees.length === 0) {
      errors.assignees = 'At least one team member must be assigned';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleNext = useCallback(() => {
    if (validateCurrentPage()) {
      if (currentPage < pageHeaders.length) {
        setCurrentPage(currentPage + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  }, [currentPage, validateCurrentPage, pageHeaders.length]);

  const handlePrevious = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [currentPage]);

  const handleCreateTask = useCallback(async () => {
    if (!validateFinalTask()) {
      return;
    }

    if (!user?.id) {
      showError('User not authenticated', 5000);
      return;
    }

    setIsSaving(true);
    buttonScale.value = withSpring(0.95);

    try {
      // Prepare task data for API
      const taskData: CreateTaskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        task_type: formData.category as any,
        assigned_to: formData.assignees.map(a => a.id),
        owned_by: formData.owned_by || user?.id || '',
        created_by: user.id,
        channel_id: formData.channel_id,
        due_date: formData.endDate,
        start_date: formData.startDate,
        estimated_hours: parseInt(formData.estimatedHours, 10) || undefined,
        tags: formData.tags,
        labels: {
          features: formData.features,
          deliverables: formData.deliverables,
          success_criteria: formData.successCriteria,
          document_links: formData.documentLinks,
        },
        business_value: 'medium', // Default value
      };

      let response;
      if (isEditMode && route.params?.taskId) {
        // Update existing task
        response = await taskService.updateTask(route.params.taskId, taskData as any);
      } else {
        // Create new task
        response = await taskService.createTask(taskData);
      }

      if (response.success && response.data) {
        // Success animation
        buttonScale.value = withSpring(1);
        
        const successMessage = isEditMode 
          ? 'Task updated successfully!'
          : 'Task created successfully and assigned to the team!';

        showSuccess(successMessage, 4000);
        
        // Wait for success confirmation and ensure the task ID is available
        const taskId = response.data.id || route.params?.taskId;
        if (!taskId) {
          throw new Error('Task created but ID not returned from server');
        }
        
        // Navigate after a brief delay to let user see the toast and ensure data is ready
        setTimeout(() => {
          if (isEditMode && route.params?.taskId) {
            navigation.replace('TaskDetailScreen', { taskId: route.params.taskId });
          } else {
            // For new tasks, navigate to the specific task detail screen to ensure it's available
            navigation.navigate('TaskDetailScreen', { taskId: taskId });
          }
        }, 1500);
      } else {
        throw new Error('Failed to save task - no success response');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} task:`, error);
      
      const errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} task. Please check your connection and try again.`;
      showError(errorMessage, 6000);
      
      buttonScale.value = withSpring(1);
    } finally {
      setIsSaving(false);
    }
  }, [
    formData,
    validateCurrentPage,
    buttonScale,
    navigation,
    user,
    isEditMode,
    route.params?.taskId,
  ]);


  // Input handlers with error clearing
  const updateFormData = useCallback(
    (field: keyof FormData, value: any) => {
      try {
        setFormData(prev => ({
          ...prev,
          [field]: value,
        }));
        
        // Clear any related errors
        if (formErrors[field as keyof FormErrors]) {
          setFormErrors(prev => ({
            ...prev,
            [field]: '',
          }));
        }
      } catch (error) {
        console.error(`Error updating form field ${field}:`, error);
        // Don't rethrow the error to prevent crashes
      }
    },
    [formErrors]
  );

  // Specific handlers for components
  const handleAddTag = useCallback(
    (tag: string) => {
      if (!formData.tags.includes(tag)) {
        updateFormData('tags', [...formData.tags, tag]);
      }
    },
    [formData.tags, updateFormData],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      updateFormData(
        'tags',
        formData.tags.filter(t => t !== tag),
      );
    },
    [formData.tags, updateFormData],
  );

  const handleAddFeature = useCallback(
    (feature: string) => {
      if (!formData.features.includes(feature)) {
        updateFormData('features', [...formData.features, feature]);
      }
    },
    [formData.features, updateFormData],
  );

  const handleRemoveFeature = useCallback(
    (feature: string) => {
      updateFormData(
        'features',
        formData.features.filter(f => f !== feature),
      );
    },
    [formData.features, updateFormData],
  );

  const handleAddDeliverable = useCallback(
    (title: string, description: string) => {
      const newDeliverable = {
        id: Date.now().toString(),
        title,
        description,
        completed: false,
      };
      updateFormData('deliverables', [
        ...formData.deliverables,
        newDeliverable,
      ]);
    },
    [formData.deliverables, updateFormData],
  );

  const handleRemoveDeliverable = useCallback(
    (id: string) => {
      updateFormData(
        'deliverables',
        formData.deliverables.filter(d => d.id !== id),
      );
    },
    [formData.deliverables, updateFormData],
  );

  const handleAddSuccessCriteria = useCallback(
    (criteria: string) => {
      const newCriteria = {
        id: Date.now().toString(),
        criteria,
        met: false,
      };
      updateFormData('successCriteria', [
        ...formData.successCriteria,
        newCriteria,
      ]);
    },
    [formData.successCriteria, updateFormData],
  );

  const handleRemoveSuccessCriteria = useCallback(
    (id: string) => {
      updateFormData(
        'successCriteria',
        formData.successCriteria.filter(c => c.id !== id),
      );
    },
    [formData.successCriteria, updateFormData],
  );

  const handleAddDocumentLink = useCallback(
    (link: string) => {
      if (!formData.documentLinks.includes(link)) {
        updateFormData('documentLinks', [...formData.documentLinks, link]);
      }
    },
    [formData.documentLinks, updateFormData],
  );

  const handleRemoveDocumentLink = useCallback(
    (link: string) => {
      updateFormData(
        'documentLinks',
        formData.documentLinks.filter(l => l !== link),
      );
    },
    [formData.documentLinks, updateFormData],
  );

  const handlePickDocuments = useCallback(async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });

      const newAttachments = results.map((result: any) => ({
        id: Date.now().toString() + Math.random().toString(),
        name: result.name || 'Unknown file',
        type: result.type || 'application/octet-stream',
        uri: result.uri,
        size: result.size || undefined,
      }));

      updateFormData('attachments', [
        ...formData.attachments,
        ...newAttachments,
      ]);
    } catch (err) {
      
    }
  }, [formData.attachments, updateFormData]);

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      updateFormData(
        'attachments',
        formData.attachments.filter(a => a.id !== id),
      );
    },
    [formData.attachments, updateFormData],
  );

  const handleToggleAssignee = useCallback(
    (assignee: TaskAssignee) => {
      const isAssigned = formData.assignees.some(a => a.id === assignee.id);
      const newAssignees = isAssigned
        ? formData.assignees.filter(a => a.id !== assignee.id)
        : [...formData.assignees, assignee];

      updateFormData('assignees', newAssignees);
    },
    [formData.assignees, updateFormData],
  );

  const handleChannelSelect = (channel: any) => {
    try {
      updateFormData('channel_id', channel.id);
      // Clear assignees when channel changes since we need to reload members
      updateFormData('assignees', []);
    } catch (error) {
      console.error('Error in channel select handler:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return (
          <TaskBasicInfo
            title={formData.title}
            description={formData.description}
            priority={formData.priority}
            category={formData.category}
            errors={{
              title: formErrors.title,
              description: formErrors.description,
            }}
            onTitleChange={text => updateFormData('title', text)}
            onDescriptionChange={text => updateFormData('description', text)}
            onPriorityChange={(priority) => {
              try {
                updateFormData('priority', priority);
              } catch (error) {
                console.error('Error in priority change handler:', error);
                // Don't throw to prevent app crash
              }
            }}
            onCategoryChange={category => {
              try {
                updateFormData('category', category);
              } catch (error) {
                console.error('Error in category change handler:', error);
                // Don't throw to prevent app crash
              }
            }}
          />
        );
      case 2:
        return (
          <TaskChannelSelection
            selectedChannelId={formData.channel_id}
            onChannelSelect={handleChannelSelect}
            currentUserId={user?.id}
            errors={{ channel: formErrors.channel }}
          />
        );
      case 3:
        return (
          <TaskTimeline
            startDate={formData.startDate}
            endDate={formData.endDate}
            estimatedHours={formData.estimatedHours}
            tags={formData.tags}
            errors={{ endDate: formErrors.endDate }}
            onStartDatePress={() => setShowStartDatePicker(true)}
            onEndDatePress={() => setShowEndDatePicker(true)}
            onEstimatedHoursChange={text =>
              updateFormData('estimatedHours', text)
            }
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        );
      case 4:
        return (
          <TaskRequirements
            features={formData.features}
            deliverables={formData.deliverables}
            successCriteria={formData.successCriteria}
            documentLinks={formData.documentLinks}
            attachments={formData.attachments}
            onAddFeature={handleAddFeature}
            onRemoveFeature={handleRemoveFeature}
            onAddDeliverable={handleAddDeliverable}
            onRemoveDeliverable={handleRemoveDeliverable}
            onAddSuccessCriteria={handleAddSuccessCriteria}
            onRemoveSuccessCriteria={handleRemoveSuccessCriteria}
            onAddDocumentLink={handleAddDocumentLink}
            onRemoveDocumentLink={handleRemoveDocumentLink}
            onPickDocuments={handlePickDocuments}
            onRemoveAttachment={handleRemoveAttachment}
          />
        );
      case 5:
        return (
          <TaskTeamAssignment
            assignees={formData.assignees}
            availableAssignees={availableAssignees}
            onToggleAssignee={handleToggleAssignee}
            errors={{ assignees: formErrors.assignees }}
          />
        );
      default:
        return null;
    }
  };

  // Safety check for navigation
  if (!navigation) {
    console.error('TaskCreateScreen: Navigation not available');
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-red-500 text-lg">Navigation error - please restart the app</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Clean Header */}
      <TaskCreateHeader
        title={pageHeaders[currentPage - 1].title}
        subtitle={pageHeaders[currentPage - 1].subtitle}
        onBack={() => {
          if (isEditMode) {
            Alert.alert(
              'Discard Changes?',
              'Are you sure you want to go back? Any unsaved changes will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
              ]
            );
          } else {
            navigation.goBack();
          }
        }}
        currentStep={currentPage}
        totalSteps={pageHeaders.length}
      />

      {/* General Error Display */}
      {formErrors.general ? (
        <View className="bg-red-50 border border-red-200 mx-4 mb-4 p-4 rounded-xl">
          <Text className="text-red-700 font-medium">{formErrors.general}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 20}
      >
        {isLoadingData ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500 text-lg">Loading...</Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-6 pt-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {renderPage()}
            </ScrollView>

            {/* Fixed position navigation footer */}
            <View className="absolute left-0 right-0 bottom-0">
              <TaskCreateNavigation
                currentStep={currentPage}
                totalSteps={pageHeaders.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onComplete={handleCreateTask}
                isLoading={isSaving}
                canGoBack={currentPage > 1}
                buttonScale={buttonScale}
                completeText={isEditMode ? 'Update Task' : 'Create Task'}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              updateFormData('startDate', selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={formData.startDate}
          onChange={(_, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              updateFormData('endDate', selectedDate);
            }
          }}
        />
      )}
    </View>
  );
};
