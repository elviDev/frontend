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
  task_id: string | null;
  user_id: string;
  content: string;
  message_type: string;
  voice_data: any;
  transcription: string | null;
  attachments: Record<string, any>;
  reply_to: any;
  thread_root: any;
  is_edited: boolean;
  is_pinned: boolean;
  is_announcement: boolean;
  reactions: any[];
  mentions: any[];
  ai_generated: boolean;
  ai_context: any;
  command_execution_id: string | null;
  metadata: Record<string, any>;
  formatting: Record<string, any>;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  version: number;
  deleted_at: string | null;
  deleted_by: string | null;
  thread_root_id: string | null;
  reply_to_id: string | null;
  is_thread_root: boolean;
  thread_info: any;
  reply_count: number;
  last_reply_timestamp: string | null;
  deleted_by_name: string | null;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  user_role: string;

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
    hasMore: boolean;
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