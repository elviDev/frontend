// Backend User Details (exactly as received from API)
export interface UserDetails {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  phone: string;
}

// Backend Message (exactly as received from API)
export interface Message {
  id: string;
  channel_id: string;
  task_id?: string | null;
  user_id: string;
  user_details: UserDetails; // Required - always provided by backend
  content: string;
  message_type: 'text' | 'voice' | 'file' | 'system';
  voice_data?: any;
  transcription?: string | null;
  attachments: Array<{
    file_id: string;
    filename: string;
    file_type: string;
    file_size: number;
  }>;
  reply_to_id?: string | null;
  thread_root_id?: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  is_announcement: boolean;
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  }>;
  thread_info?: {
    reply_count: number;
    participant_count: number;
    last_reply_at?: string;
    last_reply_by_details?: {
      id: string;
      name: string;
      avatar_url?: string;
    };
  };
  mentions: string[];
  ai_generated: boolean;
  ai_context?: any;
  command_execution_id?: string | null;
  metadata: Record<string, any>;
  reply_count?: number;
  last_reply_timestamp?: string | null;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;

  // Computed fields from backend joins (for backward compatibility)
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  user_role?: string;

  // Deprecated fields - will be removed
  reply_to?: any; // Use reply_to_id instead
  thread_root?: any; // Use thread_root_id instead
  formatting?: Record<string, any>;
  version?: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
  is_thread_root?: boolean;
  deleted_by_name?: string | null;

  // Frontend-only fields for state management
  isOptimistic?: boolean;
  isSending?: boolean;
  sendError?: string;
  hasFailed?: boolean;
  isBeingEdited?: boolean;
  isBeingDeleted?: boolean;
}

// API Response structure
export interface MessagesResponse {
  success: boolean;
  data: Message[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean; // Frontend compatibility
    has_more?: boolean; // Backend format
  };
  timestamp: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  isTyping: boolean;
  lastTypingTime?: number;
}

export interface MessageContextMenuAction {
  id: string;
  label: string;
  icon: string;
  destructive?: boolean;
  action: () => void;
}