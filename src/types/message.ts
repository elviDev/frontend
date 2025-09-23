export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  avatar_url?: string; // API field
  role?: string;
  phone?: string;
  isOnline?: boolean;
}

export interface MessageReaction {
  emoji: string;
  users: User[];
  count: number;
}

export interface MessageAttachment {
  id: string;
  file_id?: string; // API field
  name: string;
  filename?: string; // API field
  url: string;
  type: 'image' | 'file' | 'video' | 'audio';
  file_type?: string; // API field
  size?: number;
  file_size?: number; // API field
  mimeType?: string;
}

export interface ThreadInfo {
  replyCount: number;
  reply_count?: number; // API field
  lastReplyAt?: Date;
  last_reply_at?: string; // API field
  lastReplyBy?: User;
  last_reply_by_details?: User; // API field
  participants: User[];
  participant_details?: User[]; // API field
  participant_count?: number; // API field
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  user_details?: User; // API field that contains the user info with avatar_url
  user_id?: string; // API field
  channelId: string;
  channel_id?: string; // API field
  task_id?: string; // API field
  timestamp: Date;
  created_at?: string; // API field
  updated_at?: string; // API field
  type: 'text' | 'image' | 'file' | 'voice' | 'system';
  message_type?: string; // API field
  
  // Thread support
  threadRootId?: string;
  thread_root_id?: string; // API field
  isThreadRoot?: boolean;
  threadInfo?: ThreadInfo;
  thread_info?: ThreadInfo; // API field
  reply_to_id?: string; // API field
  
  // Reactions
  reactions: MessageReaction[];
  
  // Attachments
  attachments?: MessageAttachment[];
  
  // Status
  isEdited?: boolean;
  is_edited?: boolean; // API field
  editedAt?: Date;
  edited_at?: string; // API field
  isDeleted?: boolean;
  deletedAt?: Date;
  
  // Voice/Transcription
  voice_data?: any; // API field
  transcription?: string; // API field
  
  // Moderation
  is_pinned?: boolean; // API field
  is_announcement?: boolean; // API field
  
  // Mentions and metadata
  mentions?: string[]; // API field
  ai_generated?: boolean; // API field
  ai_context?: any; // API field
  command_execution_id?: string; // API field
  metadata?: Record<string, any>; // API field
  
  // Reply reference
  replyTo?: {
    id: string;
    content: string;
    sender: User;
  };
  reply_to?: any; // API field
  
  // Thread counts (for thread root messages)
  reply_count?: number; // API field
  last_reply_timestamp?: string; // API field
  
  // Optimistic updates and state tracking
  isOptimistic?: boolean;
  isSending?: boolean;
  sendError?: string;
  hasFailed?: boolean;
  isBeingEdited?: boolean;
  isBeingDeleted?: boolean;
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