import { Task, TaskAssignee, CreateTaskData } from '../types/task.types';

// Mock users for assignments
export const SEED_USERS: TaskAssignee[] = [
  {
    id: 'user-1',
    name: 'John Smith',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    role: 'Frontend Developer',
    email: 'john.smith@company.com'
  },
  {
    id: 'user-2',
    name: 'Sarah Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    role: 'Backend Developer',
    email: 'sarah.johnson@company.com'
  },
  {
    id: 'user-3',
    name: 'Mike Chen',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    role: 'DevOps Engineer',
    email: 'mike.chen@company.com'
  },
  {
    id: 'user-4',
    name: 'Emily Rodriguez',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    role: 'UI/UX Designer',
    email: 'emily.rodriguez@company.com'
  },
  {
    id: 'user-5',
    name: 'David Kim',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
    role: 'Product Manager',
    email: 'david.kim@company.com'
  },
  {
    id: 'user-6',
    name: 'Lisa Wang',
    avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
    role: 'QA Engineer',
    email: 'lisa.wang@company.com'
  }
];

// Seed tasks with realistic project scenarios
export const SEED_TASKS: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>[] = [
  // High priority active tasks
  {
    title: 'Fix critical payment gateway bug',
    description: 'Users are unable to complete transactions due to a timeout error in the payment processing system. This is causing significant revenue loss and needs immediate attention.',
    status: 'in-progress',
    priority: 'urgent',
    category: 'development',
    assignees: [SEED_USERS[0], SEED_USERS[1]],
    reporter: SEED_USERS[4],
    channelId: 'channel-backend',
    channelName: 'Backend Development',
    tags: ['bug', 'payment', 'critical', 'production'],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    estimatedHours: 8,
    actualHours: 6,
    progress: 75,
    subtasks: [
      { id: 'sub-1', title: 'Identify root cause', completed: true, assignee: SEED_USERS[1] },
      { id: 'sub-2', title: 'Implement fix', completed: true, assignee: SEED_USERS[0] },
      { id: 'sub-3', title: 'Test in staging', completed: false, assignee: SEED_USERS[5] }
    ],
    comments: [
      {
        id: 'comment-1',
        content: 'Found the issue - timeout value is too low for international transactions',
        author: SEED_USERS[1],
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
      }
    ],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4], SEED_USERS[2]]
  },
  {
    title: 'Implement user authentication with 2FA',
    description: 'Add two-factor authentication to improve security. Support SMS and authenticator app methods. Include backup codes for recovery.',
    status: 'pending',
    priority: 'high',
    category: 'development',
    assignees: [SEED_USERS[1]],
    reporter: SEED_USERS[4],
    channelId: 'channel-security',
    channelName: 'Security & Auth',
    tags: ['security', 'authentication', '2fa', 'enhancement'],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    estimatedHours: 16,
    progress: 0,
    subtasks: [
      { id: 'sub-4', title: 'Research 2FA libraries', completed: false, assignee: SEED_USERS[1] },
      { id: 'sub-5', title: 'Design user flow', completed: false, assignee: SEED_USERS[3] },
      { id: 'sub-6', title: 'Implement SMS 2FA', completed: false, assignee: SEED_USERS[1] },
      { id: 'sub-7', title: 'Implement TOTP 2FA', completed: false, assignee: SEED_USERS[1] },
      { id: 'sub-8', title: 'Add backup codes', completed: false, assignee: SEED_USERS[1] }
    ],
    comments: [],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4]]
  },
  {
    title: 'Mobile app performance optimization',
    description: 'App is experiencing slow loading times and high memory usage. Need to optimize image loading, reduce bundle size, and improve startup time.',
    status: 'in-progress',
    priority: 'high',
    category: 'development',
    assignees: [SEED_USERS[0], SEED_USERS[2]],
    reporter: SEED_USERS[4],
    channelId: 'channel-mobile',
    channelName: 'Mobile Development',
    tags: ['performance', 'mobile', 'optimization', 'react-native'],
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    estimatedHours: 24,
    actualHours: 12,
    progress: 45,
    subtasks: [
      { id: 'sub-9', title: 'Analyze bundle size', completed: true, assignee: SEED_USERS[2] },
      { id: 'sub-10', title: 'Optimize images', completed: true, assignee: SEED_USERS[0] },
      { id: 'sub-11', title: 'Implement lazy loading', completed: false, assignee: SEED_USERS[0] },
      { id: 'sub-12', title: 'Memory leak fixes', completed: false, assignee: SEED_USERS[2] }
    ],
    comments: [
      {
        id: 'comment-2',
        content: 'Bundle size reduced by 30% after removing unused dependencies',
        author: SEED_USERS[2],
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4]]
  },
  
  // Medium priority tasks
  {
    title: 'Design new dashboard layout',
    description: 'Create a more intuitive dashboard with better data visualization and user-friendly navigation. Include dark mode support.',
    status: 'pending',
    priority: 'medium',
    category: 'design',
    assignees: [SEED_USERS[3]],
    reporter: SEED_USERS[4],
    channelId: 'channel-design',
    channelName: 'Design Team',
    tags: ['design', 'dashboard', 'ui', 'ux', 'dark-mode'],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    estimatedHours: 20,
    progress: 0,
    subtasks: [
      { id: 'sub-13', title: 'User research and requirements', completed: false, assignee: SEED_USERS[3] },
      { id: 'sub-14', title: 'Wireframes', completed: false, assignee: SEED_USERS[3] },
      { id: 'sub-15', title: 'High-fidelity mockups', completed: false, assignee: SEED_USERS[3] },
      { id: 'sub-16', title: 'Dark mode variants', completed: false, assignee: SEED_USERS[3] }
    ],
    comments: [],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4], SEED_USERS[0]]
  },
  {
    title: 'API documentation update',
    description: 'Update API documentation to reflect recent changes. Add more examples and improve error handling documentation.',
    status: 'pending',
    priority: 'medium',
    category: 'documentation',
    assignees: [SEED_USERS[1]],
    reporter: SEED_USERS[4],
    channelId: 'channel-backend',
    channelName: 'Backend Development',
    tags: ['documentation', 'api', 'swagger', 'examples'],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    estimatedHours: 8,
    progress: 0,
    subtasks: [
      { id: 'sub-17', title: 'Review current documentation', completed: false, assignee: SEED_USERS[1] },
      { id: 'sub-18', title: 'Add new endpoint docs', completed: false, assignee: SEED_USERS[1] },
      { id: 'sub-19', title: 'Update examples', completed: false, assignee: SEED_USERS[1] }
    ],
    comments: [],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[0]]
  },
  {
    title: 'Implement automated testing pipeline',
    description: 'Set up comprehensive testing pipeline with unit tests, integration tests, and E2E tests. Include code coverage reporting.',
    status: 'pending',
    priority: 'medium',
    category: 'testing',
    assignees: [SEED_USERS[5], SEED_USERS[2]],
    reporter: SEED_USERS[4],
    channelId: 'channel-devops',
    channelName: 'DevOps & Infrastructure',
    tags: ['testing', 'automation', 'ci-cd', 'quality'],
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    estimatedHours: 32,
    progress: 0,
    subtasks: [
      { id: 'sub-20', title: 'Set up Jest for unit tests', completed: false, assignee: SEED_USERS[5] },
      { id: 'sub-21', title: 'Configure Cypress for E2E', completed: false, assignee: SEED_USERS[2] },
      { id: 'sub-22', title: 'Set up code coverage', completed: false, assignee: SEED_USERS[5] },
      { id: 'sub-23', title: 'Integrate with CI/CD', completed: false, assignee: SEED_USERS[2] }
    ],
    comments: [],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4], SEED_USERS[1]]
  },
  
  // Completed tasks
  {
    title: 'Database migration to PostgreSQL',
    description: 'Migrate from MySQL to PostgreSQL for better performance and advanced features. Include data migration scripts.',
    status: 'completed',
    priority: 'high',
    category: 'development',
    assignees: [SEED_USERS[1], SEED_USERS[2]],
    reporter: SEED_USERS[4],
    channelId: 'channel-backend',
    channelName: 'Backend Development',
    tags: ['database', 'migration', 'postgresql', 'performance'],
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    estimatedHours: 40,
    actualHours: 45,
    progress: 100,
    subtasks: [
      { id: 'sub-24', title: 'Schema conversion', completed: true, assignee: SEED_USERS[1] },
      { id: 'sub-25', title: 'Data migration scripts', completed: true, assignee: SEED_USERS[1] },
      { id: 'sub-26', title: 'Performance testing', completed: true, assignee: SEED_USERS[2] },
      { id: 'sub-27', title: 'Production deployment', completed: true, assignee: SEED_USERS[2] }
    ],
    comments: [
      {
        id: 'comment-3',
        content: 'Migration completed successfully. Performance improved by 40%!',
        author: SEED_USERS[2],
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4]]
  },
  {
    title: 'User onboarding flow redesign',
    description: 'Redesigned the user onboarding experience to reduce drop-off rates and improve user engagement.',
    status: 'completed',
    priority: 'medium',
    category: 'design',
    assignees: [SEED_USERS[3], SEED_USERS[0]],
    reporter: SEED_USERS[4],
    channelId: 'channel-design',
    channelName: 'Design Team',
    tags: ['onboarding', 'ux', 'conversion', 'user-flow'],
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    estimatedHours: 16,
    actualHours: 18,
    progress: 100,
    subtasks: [
      { id: 'sub-28', title: 'User journey mapping', completed: true, assignee: SEED_USERS[3] },
      { id: 'sub-29', title: 'Prototype creation', completed: true, assignee: SEED_USERS[3] },
      { id: 'sub-30', title: 'Frontend implementation', completed: true, assignee: SEED_USERS[0] }
    ],
    comments: [],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4]]
  },
  
  // On hold tasks
  {
    title: 'Integration with third-party analytics',
    description: 'Integrate with Google Analytics and Mixpanel for comprehensive user behavior tracking and business intelligence.',
    status: 'on-hold',
    priority: 'low',
    category: 'development',
    assignees: [SEED_USERS[0]],
    reporter: SEED_USERS[4],
    channelId: 'channel-analytics',
    channelName: 'Analytics & Data',
    tags: ['analytics', 'integration', 'google-analytics', 'mixpanel'],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
    estimatedHours: 12,
    progress: 10,
    subtasks: [
      { id: 'sub-31', title: 'Research analytics tools', completed: true, assignee: SEED_USERS[0] },
      { id: 'sub-32', title: 'Set up Google Analytics', completed: false, assignee: SEED_USERS[0] },
      { id: 'sub-33', title: 'Configure Mixpanel', completed: false, assignee: SEED_USERS[0] }
    ],
    comments: [
      {
        id: 'comment-4',
        content: 'On hold pending legal review of data collection policies',
        author: SEED_USERS[4],
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ],
    attachments: [],
    dependencies: [],
    watchers: [SEED_USERS[4]]
  }
];

// Activity feed seed data
export interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_assigned' | 'announcement' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  read: boolean;
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

export const SEED_ACTIVITIES: ActivityItem[] = [
  {
    id: 'activity-1',
    type: 'announcement',
    title: '🎉 New Feature: Voice Commands Now Available!',
    description: 'We\'re excited to announce that voice commands are now live! You can now create tasks, send messages, and navigate the app using voice controls.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    priority: 'high',
    data: {
      announcementType: 'feature',
      actionUrl: '/features/voice-commands',
      imageUrl: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=400'
    },
    read: false
  },
  {
    id: 'activity-2',
    type: 'task_completed',
    title: 'Task Completed: Database migration to PostgreSQL',
    description: 'Mike Chen completed the database migration with 40% performance improvement',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    priority: 'medium',
    data: {
      taskId: 'task-completed-1',
      taskTitle: 'Database migration to PostgreSQL',
      channelName: 'Backend Development'
    },
    read: false,
    userId: 'user-3',
    userName: 'Mike Chen',
    userAvatar: 'https://randomuser.me/api/portraits/men/3.jpg'
  },
  {
    id: 'activity-3',
    type: 'task_created',
    title: 'New Critical Task: Fix payment gateway bug',
    description: 'John Smith created a critical task that needs immediate attention',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    priority: 'critical',
    data: {
      taskId: 'task-critical-1',
      taskTitle: 'Fix critical payment gateway bug',
      channelName: 'Backend Development'
    },
    read: true,
    userId: 'user-1',
    userName: 'John Smith',
    userAvatar: 'https://randomuser.me/api/portraits/men/1.jpg'
  },
  {
    id: 'activity-4',
    type: 'announcement',
    title: '📅 Scheduled Maintenance: System Update Tonight',
    description: 'We\'ll be performing system maintenance tonight from 2 AM to 4 AM EST. The service may be temporarily unavailable during this time.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    priority: 'medium',
    data: {
      announcementType: 'maintenance',
      maintenanceWindow: {
        start: new Date(Date.now() + 18 * 60 * 60 * 1000),
        end: new Date(Date.now() + 20 * 60 * 60 * 1000)
      }
    },
    read: true
  },
  {
    id: 'activity-5',
    type: 'task_assigned',
    title: 'You were assigned to: Mobile app performance optimization',
    description: 'David Kim assigned you to work on mobile performance improvements',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    priority: 'high',
    data: {
      taskId: 'task-perf-1',
      taskTitle: 'Mobile app performance optimization',
      assignedBy: 'David Kim',
      channelName: 'Mobile Development'
    },
    read: false,
    userId: 'user-5',
    userName: 'David Kim',
    userAvatar: 'https://randomuser.me/api/portraits/men/5.jpg'
  },
  {
    id: 'activity-6',
    type: 'system',
    title: '🔄 Automatic Backup Completed',
    description: 'Daily backup completed successfully. All data is securely stored.',
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
    priority: 'low',
    data: {
      backupSize: '2.4 GB',
      backupDuration: '15 minutes'
    },
    read: true
  },
  {
    id: 'activity-7',
    type: 'task_updated',
    title: 'Task Progress Updated: User authentication with 2FA',
    description: 'Sarah Johnson updated the progress and added new comments',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    priority: 'medium',
    data: {
      taskId: 'task-2fa-1',
      taskTitle: 'Implement user authentication with 2FA',
      progressChange: { from: 15, to: 35 },
      channelName: 'Security & Auth'
    },
    read: true,
    userId: 'user-2',
    userName: 'Sarah Johnson',
    userAvatar: 'https://randomuser.me/api/portraits/women/2.jpg'
  },
  {
    id: 'activity-8',
    type: 'announcement',
    title: '🎯 Q4 Goals and Objectives',
    description: 'Our Q4 roadmap is now available! Focus areas include performance optimization, security enhancements, and user experience improvements.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    priority: 'medium',
    data: {
      announcementType: 'roadmap',
      actionUrl: '/roadmap/q4-2024',
      quarters: 'Q4 2024'
    },
    read: true
  },
  {
    id: 'activity-9',
    type: 'task_completed',
    title: 'Task Completed: User onboarding flow redesign',
    description: 'Emily Rodriguez completed the onboarding redesign with improved conversion rates',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    priority: 'medium',
    data: {
      taskId: 'task-onboarding-1',
      taskTitle: 'User onboarding flow redesign',
      channelName: 'Design Team'
    },
    read: true,
    userId: 'user-4',
    userName: 'Emily Rodriguez',
    userAvatar: 'https://randomuser.me/api/portraits/women/4.jpg'
  }
];

// Announcement types for admin interface
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'feature' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: 'all' | 'admins' | 'developers' | 'designers' | 'managers';
  scheduledFor?: Date;
  expiresAt?: Date;
  actionButton?: {
    text: string;
    url: string;
  };
  imageUrl?: string;
  createdBy: string;
  createdAt: Date;
  published: boolean;
  readBy: string[]; // User IDs who have seen this announcement
}

export const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announce-1',
    title: 'New Voice Commands Feature Released!',
    content: 'We\'re excited to announce that voice commands are now available across the platform. Create tasks, send messages, and navigate using your voice!',
    type: 'feature',
    priority: 'high',
    targetAudience: 'all',
    actionButton: {
      text: 'Learn More',
      url: '/features/voice-commands'
    },
    imageUrl: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=400',
    createdBy: 'admin-1',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    published: true,
    readBy: []
  },
  {
    id: 'announce-2',
    title: 'Scheduled System Maintenance',
    content: 'We will be performing system maintenance tonight from 2 AM to 4 AM EST. Please save your work and expect brief service interruptions.',
    type: 'maintenance',
    priority: 'medium',
    targetAudience: 'all',
    scheduledFor: new Date(Date.now() + 18 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdBy: 'admin-1',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    published: true,
    readBy: ['user-1', 'user-3']
  },
  {
    id: 'announce-3',
    title: 'Q4 2024 Roadmap Available',
    content: 'Our Q4 roadmap is now available! This quarter focuses on performance optimization, enhanced security features, and improved user experience.',
    type: 'info',
    priority: 'medium',
    targetAudience: 'all',
    actionButton: {
      text: 'View Roadmap',
      url: '/roadmap/q4-2024'
    },
    createdBy: 'admin-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    published: true,
    readBy: ['user-1', 'user-2', 'user-4']
  }
];