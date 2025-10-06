import type { Task } from '../types/task.types';
import type { User } from '../types/auth';

export interface TaskPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canComment: boolean;
  canChangeStatus: boolean;
  canManage: boolean;
}

/**
 * Calculate user permissions for a specific task using backend authorization logic
 */
export function getTaskPermissions(
  task: Task | null,
  user: User | null
): TaskPermissions {
  // Default permissions (no access)
  const defaultPermissions: TaskPermissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canComment: false,
    canChangeStatus: false,
    canManage: false,
  };

  if (!task || !user) {
    return defaultPermissions;
  }

  const userId = user.id;
  const userRole = user.role;
  
  // Check if user is task creator
  const isCreator = task.created_by === userId;
  
  // Check if user is task owner
  const isOwner = task.owned_by === userId;
  
  // Check if user is assigned to the task
  const isAssigned = task.assigned_to && task.assigned_to.includes(userId);
  
  // CEO has full access to all tasks
  if (userRole === 'ceo') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canComment: true,
      canChangeStatus: true,
      canManage: true,
    };
  }

  // Manager permissions - matches backend requireManagerOrCEO middleware
  if (userRole === 'manager') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canComment: true,
      canChangeStatus: true,
      canManage: true,
    };
  }

  // Task creator/owner permissions
  if (isCreator || isOwner) {
    return {
      canView: true,
      canEdit: true,
      canDelete: false, // Only CEO/Manager can delete tasks
      canAssign: true,
      canComment: true,
      canChangeStatus: true,
      canManage: false,
    };
  }

  // Task assignee permissions
  if (isAssigned) {
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canAssign: false,
      canComment: true, // Matches backend requireTaskCommentAccess
      canChangeStatus: true, // Assignees can update task status
      canManage: false,
    };
  }

  // Staff role with no assignment - limited access
  if (userRole === 'staff') {
    return {
      canView: true, // Staff can view all tasks
      canEdit: false,
      canDelete: false,
      canAssign: false,
      canComment: false, // Can only comment on assigned tasks
      canChangeStatus: false,
      canManage: false,
    };
  }

  return defaultPermissions;
}

/**
 * Check if user can create tasks
 */
export function canCreateTask(user: User | null): boolean {
  if (!user) return false;
  
  // Only CEO and Manager can create tasks - matches backend requireManagerOrCEO
  return user.role === 'ceo' || user.role === 'manager';
}

/**
 * Check if user can view a task
 */
export function canViewTask(task: Task | null, user: User | null): boolean {
  const permissions = getTaskPermissions(task, user);
  return permissions.canView;
}

/**
 * Check if user can edit a task
 */
export function canEditTask(task: Task | null, user: User | null): boolean {
  const permissions = getTaskPermissions(task, user);
  return permissions.canEdit;
}

/**
 * Check if user can delete a task
 */
export function canDeleteTask(task: Task | null, user: User | null): boolean {
  const permissions = getTaskPermissions(task, user);
  return permissions.canDelete;
}

/**
 * Check if user can assign users to a task
 */
export function canAssignTask(task: Task | null, user: User | null): boolean {
  const permissions = getTaskPermissions(task, user);
  return permissions.canAssign;
}

/**
 * Check if user can comment on a task
 */
export function canCommentOnTask(task: Task | null, user: User | null): boolean {
  const permissions = getTaskPermissions(task, user);
  return permissions.canComment;
}

/**
 * Check if user can change task status
 */
export function canChangeTaskStatus(task: Task | null, user: User | null): boolean {
  const permissions = getTaskPermissions(task, user);
  return permissions.canChangeStatus;
}

/**
 * Get user-friendly reason why task action is denied
 */
export function getTaskActionDeniedReason(
  task: Task | null,
  user: User | null,
  action: 'create' | 'edit' | 'delete' | 'assign' | 'comment'
): string {
  if (!task || !user) {
    return 'Unable to verify task permissions';
  }

  const userRole = user.role;
  const isAssigned = task.assigned_to?.includes(user.id) || false;
  const isOwner = task.owned_by === user.id || task.created_by === user.id;

  switch (action) {
    case 'create':
      if (userRole === 'staff') {
        return 'Only managers and CEOs can create tasks';
      }
      break;
      
    case 'edit':
      if (userRole === 'staff' && !isOwner && !isAssigned) {
        return 'You can only edit tasks you created or are assigned to';
      }
      break;
      
    case 'delete':
      if (userRole !== 'ceo' && userRole !== 'manager') {
        return 'Only managers and CEOs can delete tasks';
      }
      break;
      
    case 'assign':
      if (userRole === 'staff' && !isOwner) {
        return 'You can only assign users to tasks you created';
      }
      break;
      
    case 'comment':
      if (userRole === 'staff' && !isAssigned && !isOwner) {
        return 'You can only comment on tasks you are assigned to or created';
      }
      break;
  }

  return 'You do not have permission to perform this action';
}