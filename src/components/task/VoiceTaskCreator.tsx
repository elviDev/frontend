import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { VoiceMessage } from '../messages/VoiceMessage';
import { textToSpeechService } from '../../services/voice/TextToSpeech';
import { useToast } from '../../contexts/ToastContext';

interface VoiceTaskCreatorProps {
  visible: boolean;
  onClose: () => void;
  onTaskCreate: (taskData: { title: string; description: string; voiceCreated: boolean }) => void;
  channelId?: string;
}

export const VoiceTaskCreator: React.FC<VoiceTaskCreatorProps> = ({
  visible,
  onClose,
  onTaskCreate,
  channelId,
}) => {
  const [transcript, setTranscript] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'record' | 'process' | 'review'>('record');
  const { showSuccess, showError } = useToast();

  const handleVoiceRecorded = async (voiceTranscript: string) => {
    try {
      setTranscript(voiceTranscript);
      setIsProcessing(true);
      setStep('process');

      // Process the transcript to extract task information
      await processVoiceCommand(voiceTranscript);

      setStep('review');
    } catch (error) {
      console.error('Error processing voice command:', error);
      showError('Failed to process voice command');
      setStep('record');
    } finally {
      setIsProcessing(false);
    }
  };

  const processVoiceCommand = async (voiceTranscript: string) => {
    // Simple natural language processing for task creation
    // In production, you might want to use OpenAI or another NLP service

    const text = voiceTranscript.toLowerCase().trim();

    // Extract task title and description using simple patterns
    let title = '';
    let description = voiceTranscript;

    // Common patterns for task creation
    const patterns = [
      /create (?:a )?task (?:to |for |about )?(.+)/i,
      /(?:i need to|need to|should|must) (.+)/i,
      /(?:task|todo|to do):?\s*(.+)/i,
      /(?:remind me to|remember to) (.+)/i,
    ];

    for (const pattern of patterns) {
      const match = voiceTranscript.match(pattern);
      if (match) {
        title = match[1];
        description = voiceTranscript;
        break;
      }
    }

    // If no pattern matched, use the first sentence as title
    if (!title) {
      const sentences = voiceTranscript.split(/[.!?]+/);
      if (sentences.length > 0) {
        title = sentences[0].trim();
        if (sentences.length > 1) {
          description = sentences.slice(1).join('. ').trim();
        }
      }
    }

    // Clean up title (remove common task prefixes)
    title = title
      .replace(/^(create|make|add|do|complete|finish|work on)\s+/i, '')
      .replace(/^(a|an|the)\s+/i, '')
      .trim();

    // Capitalize first letter
    if (title) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // If title is too long, truncate it
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // If no title extracted, use a generic one
    if (!title) {
      title = 'Voice-created task';
    }

    setTaskTitle(title);
    setTaskDescription(description || voiceTranscript);
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) {
      showError('Task title is required');
      return;
    }

    const taskData = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      voiceCreated: true,
    };

    onTaskCreate(taskData);
    resetForm();
    onClose();
    showSuccess('Voice task created successfully!');
  };

  const handlePlayback = async (text: string) => {
    try {
      await textToSpeechService.speak(text, {
        language: 'en-US',
        rate: 1,
        pitch: 1,
        volume: 0.8,
      });
    } catch (error) {
      console.error('Failed to play back text:', error);
      Alert.alert('Playback Failed', 'Unable to play back the text.');
    }
  };

  const resetForm = () => {
    setTranscript('');
    setTaskTitle('');
    setTaskDescription('');
    setStep('record');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderRecordingStep = () => (
    <View className="flex-1 items-center justify-center p-6">
      <Icon name="mic" size={64} color="#3B82F6" />

      <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">
        Voice Task Creator
      </Text>

      <Text className="text-gray-600 text-center mb-8">
        Describe your task using your voice. Speak naturally - I'll extract the task details for you.
      </Text>

      <VoiceMessage
        onVoiceRecorded={handleVoiceRecorded}
        onError={(error) => {
          showError(error);
          console.error('Voice recording error:', error);
        }}
        showTranscription={true}
        autoSend={false}
      />

      <View className="mt-8 bg-blue-50 rounded-lg p-4">
        <Text className="text-blue-900 text-sm font-medium mb-2">💡 Tips:</Text>
        <Text className="text-blue-800 text-sm">
          • Say "Create a task to..." or "I need to..."
          • Speak clearly and describe what needs to be done
          • Include any important details or deadlines
        </Text>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View className="flex-1 items-center justify-center p-6">
      <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-6">
        <Icon name="brain" size={32} color="#3B82F6" />
      </View>

      <Text className="text-xl font-bold text-gray-900 mb-2">
        Processing Voice Command
      </Text>

      <Text className="text-gray-600 text-center mb-6">
        Analyzing your voice input to create a task...
      </Text>

      <View className="w-full bg-gray-200 rounded-full h-2">
        <View className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <ScrollView className="flex-1 p-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Review Task</Text>
      <Text className="text-gray-600 mb-6">
        Review and edit the task details extracted from your voice input.
      </Text>

      {/* Original Transcript */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-semibold text-gray-700">Original Voice Input:</Text>
          <TouchableOpacity
            onPress={() => handlePlayback(transcript)}
            className="flex-row items-center px-2 py-1 bg-blue-100 rounded"
          >
            <Icon name="play" size={14} color="#3B82F6" />
            <Text className="text-blue-600 text-sm ml-1">Play</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-gray-50 rounded-lg p-3">
          <Text className="text-gray-800 italic">"{transcript}"</Text>
        </View>
      </View>

      {/* Task Title */}
      <View className="mb-4">
        <Text className="font-semibold text-gray-700 mb-2">Task Title:</Text>
        <TextInput
          value={taskTitle}
          onChangeText={setTaskTitle}
          className="border border-gray-300 rounded-lg px-3 py-3 bg-white"
          placeholder="Enter task title"
          multiline={false}
        />
      </View>

      {/* Task Description */}
      <View className="mb-6">
        <Text className="font-semibold text-gray-700 mb-2">Task Description:</Text>
        <TextInput
          value={taskDescription}
          onChangeText={setTaskDescription}
          className="border border-gray-300 rounded-lg px-3 py-3 bg-white h-24"
          placeholder="Enter task description"
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View className="flex-row space-x-3 mt-auto">
        <TouchableOpacity
          onPress={() => setStep('record')}
          className="flex-1 bg-gray-100 py-3 rounded-lg"
        >
          <Text className="text-center text-gray-700 font-medium">Record Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCreateTask}
          className="flex-1 bg-blue-500 py-3 rounded-lg"
          disabled={!taskTitle.trim()}
        >
          <Text className="text-center text-white font-medium">Create Task</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (step) {
      case 'record':
        return renderRecordingStep();
      case 'process':
        return renderProcessingStep();
      case 'review':
        return renderReviewStep();
      default:
        return renderRecordingStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <TouchableOpacity
            onPress={handleClose}
            className="p-2"
          >
            <Icon name="x" size={24} color="#6B7280" />
          </TouchableOpacity>

          <Text className="font-semibold text-lg text-gray-900">
            {step === 'record' && 'Voice Task Creator'}
            {step === 'process' && 'Processing...'}
            {step === 'review' && 'Review Task'}
          </Text>

          <View className="w-10" />
        </View>

        {/* Content */}
        {renderContent()}
      </View>
    </Modal>
  );
};