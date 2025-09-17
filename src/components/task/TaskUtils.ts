import { TaskPriority, TaskStatus, TaskType } from '../../types/task.types';

export const TaskUtils = {
  getPriorityColor: (priority: TaskPriority): string => {
    const colors: Record<TaskPriority, string> = {
      urgent: '#EF4444',
      high: '#EA580C',
      medium: '#CA8A04',
      low: '#16A34A',
      critical: '#DC2626',
    };
    return colors[priority] || colors.medium;
  },

  getStatusColor: (status: TaskStatus): string => {
    const colors: Record<TaskStatus, string> = {
      pending: '#6B7280',
      in_progress: '#2563EB',
      review: '#8B5CF6',
      completed: '#16A34A',
      on_hold: '#D97706',
      cancelled: '#DC2626',
    };
    return colors[status] || colors.pending;
  },

  getTaskTypeIcon: (taskType: TaskType): string => {
    const icons: Record<TaskType, string> = {
      general: 'clipboard',
      project: 'briefcase',
      maintenance: 'tool',
      emergency: 'alert-circle',
      research: 'search',
      approval: 'check-circle',
    };
    return icons[taskType] || 'clipboard';
  },

  getCategoryIcon: (category: string): string => {
    const icons: Record<string, string> = {
      development: 'code',
      design: 'palette',
      marketing: 'campaign',
      operations: 'business',
      research: 'search',
      general: 'work',
      project: 'folder',
      maintenance: 'build',
      emergency: 'warning',
      approval: 'check-circle',
      meeting: 'people',
      documentation: 'description',
      testing: 'bug-report',
      deployment: 'cloud-upload',
    };
    return icons[category] || 'work';
  },

  formatDueDate: (dueDate: Date): string => {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  },

  formatTimeAgo: (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  isOverdue: (dueDate: Date, status: TaskStatus): boolean => {
    return dueDate < new Date() && status !== 'completed';
  },

  isDueSoon: (dueDate: Date, status: TaskStatus): boolean => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return dueDate <= tomorrow && dueDate > new Date() && status !== 'completed';
  },
};