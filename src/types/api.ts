// API Response Types for Message Service
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    has_more?: boolean; // Backend field
  };
  timestamp: string;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
    statusCode: number;
  };
  timestamp: string;
}

// Message API Types
export interface ApiMessage {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  user_details?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    role: string;
  };
  message_type: 'text' | 'voice' | 'file' | 'system';
  reply_to_id?: string;
  reply_to?: {
    id: string;
    content: string;
    user_details: {
      id: string;
      name: string;
      email: string;
      avatar_url?: string;
    };
  };
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      email?: string;
      avatar_url?: string;
    }>;
  }>;
  attachments: Array<{
    file_id: string;
    filename: string;
    file_type: string;
    file_size: number;
    url?: string;
  }>;
  voice_data?: {
    duration: number;
    transcript?: string;
    voice_file_id?: string;
  };
  mentions?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  edited_at?: string;
  deleted_at?: string;
  reply_count?: number;
  last_reply_timestamp?: string;
}

// Reaction API Types
export interface ApiReactionResponse {
  action: 'added' | 'removed';
  message_id: string;
  emoji: string;
  current_reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  }>;
}

export interface ApiReactionStatsResponse {
  message_id: string;
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  }>;
  total_reactions: number;
  user_reactions: string[];
}

// Send Message Request Types
export interface SendMessageRequest {
  content: string;
  message_type?: 'text' | 'voice' | 'file' | 'system';
  reply_to_id?: string;
  mentions?: string[];
  attachments?: Array<{
    file_id: string;
    filename: string;
    file_type: string;
    file_size: number;
  }>;
  voice_data?: {
    duration: number;
    transcript?: string;
    voice_file_id?: string;
  };
  metadata?: Record<string, any>;
}

// Channel Activity Types
export interface ApiChannelReactionActivity {
  channel_id: string;
  activities: Array<{
    reaction: {
      id: string;
      message_id: string;
      user_id: string;
      emoji: string;
      created_at: string;
      user_details: {
        id: string;
        name: string;
        email: string;
        avatar_url?: string;
        role: string;
      };
    };
    message: {
      id: string;
      content: string;
      channel_id: string;
    };
  }>;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ApiPopularReactionsResponse {
  channel_id: string;
  popular_reactions: Array<{
    emoji: string;
    count: number;
    usage_percentage: number;
  }>;
}

export interface ApiChannelReactionStatsResponse {
  channel_id: string;
  total_reactions: number;
  unique_emojis: number;
  most_used_emoji?: string;
  top_reactors: Array<{
    user_id: string;
    user_name: string;
    reaction_count: number;
  }>;
}