export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: Date;
  action: VoiceAction;
  parameters: Record<string, any>;
}

export interface VoiceAction {
  type: 'create_channel' | 'assign_task' | 'schedule_meeting' | 'send_notification';
  description: string;
  requiredParams: string[];
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  lastCommand: VoiceCommand | null;
}