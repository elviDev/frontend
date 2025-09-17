export interface Message {
  id: string;
  type: 'text' | 'voice' | 'file' | 'image' | 'task' | 'system';
  content: string;
  voiceTranscript?: string;
  audioUri?: string;
  fileUrl?: string;
  fileName?: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  timestamp: Date;
  reactions: Reaction[];
  replies: Reply[];
  mentions: string[];
  isEdited: boolean;
  isOptimistic?: boolean; // Flag for optimistic updates
  
  // Delete support
  deletedBy?: string; // Name of user who deleted the message
  deletedAt?: Date; // When the message was deleted
  
  // Threading support
  connectedTo?: string; // reply_to - immediate parent message ID
  threadRoot?: string; // thread_root - root message of the thread
  replyCount?: number; // Number of replies in this thread
  lastReplyTimestamp?: Date; // Timestamp of last reply
  
  aiSummary?: string;
  taskAssignments?: TaskAssignment[];
}

export interface Reply {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  reactions?: Reaction[];
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface TaskAssignment {
  id: string;
  title: string;
  assigneeId: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ChannelSummary {
  id: string;
  title: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: TaskAssignment[];
  participants: string[];
  duration: string;
  generatedAt: Date;
}
