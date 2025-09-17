import React from 'react';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { MeetingSummaryModal } from './MeetingSummaryModal';
import { KeyPointsModal } from './KeyPointsModal';
import { ChannelTaskIntegration } from '../channel/ChannelTaskIntegration';
import type { Message, ChannelSummary } from '../../types/chat';

interface ChannelModalsContainerProps {
  // Emoji Picker
  showEmojiPicker: string | null;
  onCloseEmojiPicker: () => void;
  onEmojiSelect: (emoji: string) => void;
  
  // Meeting Summary Modal
  showSummaryModal: boolean;
  channelSummary: ChannelSummary | null;
  onCloseSummaryModal: () => void;
  onShareSummary: () => void;
  onCreateTasksFromSummary: () => void;
  
  // Key Points Modal
  showKeyPointsModal: boolean;
  messages: Message[];
  onCloseKeyPointsModal: () => void;
  onCreateTaskFromKeyPoints: (taskData: any) => void;
  
  // Channel Task Integration
  showTaskIntegration: boolean;
  channelId: string;
  channelName: string;
  memberIds: string[];
  onCloseTaskIntegration: () => void;
}

export const ChannelModalsContainer: React.FC<ChannelModalsContainerProps> = ({
  showEmojiPicker,
  onCloseEmojiPicker,
  onEmojiSelect,
  showSummaryModal,
  channelSummary,
  onCloseSummaryModal,
  onShareSummary,
  onCreateTasksFromSummary,
  showKeyPointsModal,
  messages,
  onCloseKeyPointsModal,
  onCreateTaskFromKeyPoints,
  showTaskIntegration,
  channelId,
  channelName,
  memberIds,
  onCloseTaskIntegration,
}) => {
  return (
    <>
      {/* Emoji Picker */}
      <EmojiReactionPicker
        visible={!!showEmojiPicker}
        onClose={onCloseEmojiPicker}
        onEmojiSelect={(emoji) => {
          if (showEmojiPicker) {
            onEmojiSelect(emoji);
          }
        }}
        title="React to Message"
      />

      {/* Meeting Summary Modal */}
      <MeetingSummaryModal
        visible={showSummaryModal}
        summary={channelSummary}
        onClose={onCloseSummaryModal}
        onShare={onShareSummary}
        onCreateTasks={onCreateTasksFromSummary}
      />

      {/* Key Points Modal */}
      <KeyPointsModal
        visible={showKeyPointsModal}
        messages={messages}
        onClose={onCloseKeyPointsModal}
        onCreateTask={onCreateTaskFromKeyPoints}
      />

      {/* Channel Task Integration */}
      <ChannelTaskIntegration
        channelId={channelId}
        channelName={channelName}
        members={memberIds}
        visible={showTaskIntegration}
        onClose={onCloseTaskIntegration}
        initialTaskData={{
          title: 'AI-Generated Task from Discussion',
          description: 'Task created from channel conversation analysis',
          priority: 'medium',
        }}
      />
    </>
  );
};
