export const APP_CONFIG = {
  name: 'Javier',
  version: '1.0.0',
  apiBaseUrl: 'https://api.javier.ai',
  voiceTimeout: 5000,
  maxVoiceRecordingTime: 30000,
};

export const SCREEN_NAMES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  WELCOME: 'Welcome',
  
  // Main
  DASHBOARD: 'Dashboard',
  PROJECT_MANAGEMENT: 'ProjectManagement',
  
  // Onboarding
  ONBOARDING: 'Onboarding',
} as const;

export const QUICK_ACTIONS = [
  {
    id: 'create-channel',
    title: 'Create a\nChannel',
    action: 'create_channel',
  },
  {
    id: 'schedule-meeting',
    title: 'Schedule a\nMeeting',
    action: 'schedule_meeting',
  },
  {
    id: 'assign-task',
    title: 'Assign a\nTask',
    action: 'assign_task',
  },
] as const;

export const PROJECT_ROLES = {
  LEAD_DESIGNER: 'Lead Designer',
  ENGINEERING_LEAD: 'Engineering Lead',
  PM: 'Product Manager',
  MYSELF: 'Project Owner',
} as const;

export const VOICE_COMMANDS = {
  CREATE_CHANNEL: 'create channel',
  ASSIGN_TASK: 'assign task',
  SCHEDULE_MEETING: 'schedule meeting',
  SEND_NOTIFICATION: 'send notification',
} as const;