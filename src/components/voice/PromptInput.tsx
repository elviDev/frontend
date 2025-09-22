import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  withSequence,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Voice from '../../services/voice/CustomVoice';
import {
  showVoiceErrorDialog,
  runVoiceDiagnostics,
} from '../../utils/voiceErrorHandler';
import {
  pick,
  types,
} from '@react-native-documents/picker';
import {
  launchImageLibraryAsync,
  ImagePickerResult,
  MediaTypeOptions,
} from 'expo-image-picker';
import CustomAudioRecorderPlayer from '../../services/audio/CustomAudioRecorderPlayer';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { EmojiPicker } from '../chat/EmojiPicker';
import { openAIService } from '../../services/ai/OpenAIService';
import { PermissionDialog } from '../common/PermissionDialog';
import { ActionDialog } from '../common/ActionDialog';
import { useActionDialog } from '../../hooks/useActionDialog';
import { useToast } from '../../contexts/ToastContext';

interface PromptInputProps {
  onSendMessage?: (text: string) => void;
  onSendRecording?: (audioUri: string, transcript?: string) => void;
  onSendVoiceMessage?: (audioUri: string, transcript?: string) => void; // Alias for compatibility
  onEditMessage?: (messageId: string, content: string) => void;
  onAttachFile?: (file: any) => void;
  onAttachImage?: (image: any) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onStartReplyTyping?: (parentMessageId: string, parentUserName: string) => void;
  onStopReplyTyping?: (parentMessageId: string) => void;
  onClose?: () => void; // For modal mode
  placeholder?: string;
  disabled?: boolean;
  showCloseButton?: boolean; // For modal mode
  isLoading?: boolean; // Show loading indicator
  channelMembers?: MentionUser[]; // Add channel members for mentions
  replyingTo?: {
    id: string;
    content: string;
    sender: string;
  } | null;
  onCancelReply?: () => void;
  editingMessage?: {
    id: string;
    content: string;
  } | null;
  onCancelEdit?: () => void;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioPath: string;
}

interface MentionUser {
  id: string;
  name: string;
  username: string;
}

// Channel members will be passed via props instead of hardcoded data


export const PromptInput: React.FC<PromptInputProps> = ({
  onSendMessage,
  onSendRecording,
  onSendVoiceMessage,
  onEditMessage,
  onAttachFile,
  onAttachImage,
  onStartTyping,
  onStopTyping,
  onStartReplyTyping,
  onStopReplyTyping,
  onClose,
  placeholder = 'Enter a prompt here...',
  disabled = false,
  showCloseButton = false,
  isLoading = false,
  channelMembers = [],
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}) => {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioPath: '',
  });
  const [voiceResults, setVoiceResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [, setAttachedFiles] = useState<any[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const { dialogProps, showDialog, hideDialog } = useActionDialog();
  const { showError, showSuccess, showInfo } = useToast();

  const audioRecorderPlayer = useRef(new CustomAudioRecorderPlayer()).current;
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);
  const sendButtonScale = useSharedValue(1);

  // Helper functions


  const handleTextChange = (newText: string) => {
    setText(newText);

    // Handle typing indicators with reply support
    const wasEmpty = text.trim() === '';
    const isEmpty = newText.trim() === '';
    
    if (!wasEmpty && isEmpty) {
      // User cleared input - stop typing
      if (replyingTo && onStopReplyTyping) {
        onStopReplyTyping(replyingTo.id);
      } else {
        onStopTyping?.();
      }
    } else if (wasEmpty && !isEmpty) {
      // User started typing - start typing indicator
      if (replyingTo && onStartReplyTyping) {
        onStartReplyTyping(replyingTo.id, replyingTo.sender);
      } else {
        onStartTyping?.();
      }
    } else if (!isEmpty) {
      // User is continuing to type - refresh typing indicator
      if (replyingTo && onStartReplyTyping) {
        onStartReplyTyping(replyingTo.id, replyingTo.sender);
      } else {
        onStartTyping?.();
      }
    }

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce mention detection to avoid excessive calls
    debounceTimer.current = setTimeout(() => {
      checkForMentions(newText, selectionStart);
    }, 300); // 300ms debounce delay
  };

  const checkForMentions = (currentText: string, cursorPos: number) => {
    // Get text before cursor position
    const textBeforeCursor = currentText.substring(0, cursorPos);

    // Look for @ pattern at the end of text before cursor
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1] || '';
      setMentionQuery(query);
      setShowMentionSuggestions(true);
      console.log('✅ Mention detected:', query, 'at position:', cursorPos);
    } else {
      setShowMentionSuggestions(false);
      setMentionQuery('');
      console.log('❌ No mention found in:', textBeforeCursor);
    }
  };

  const insertMention = (user: MentionUser) => {
    const currentText = text;
    const cursorPos = selectionStart;
    const textBeforeCursor = currentText.substring(0, cursorPos);
    const textAfterCursor = currentText.substring(cursorPos);

    // Find the @ symbol position
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (mentionMatch) {
      const atPosition = mentionMatch.index!;
      const newText =
        currentText.substring(0, atPosition) +
        `@${user.username} ` +
        textAfterCursor;

      setText(newText);
      setShowMentionSuggestions(false);
      setMentionQuery('');

      // Update cursor position
      const newCursorPos = atPosition + user.username.length + 2; // +2 for @ and space
      setSelectionStart(newCursorPos);

      // Focus back to input
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);

      console.log('Mention inserted:', user.username);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = selectionStart || text.length;
    const newText =
      text.substring(0, cursorPos) + emoji + text.substring(cursorPos);

    console.log('✅ Inserting emoji:', emoji, 'at position:', cursorPos);
    setText(newText);
    setSelectionStart(cursorPos + emoji.length);

    // Focus back to input after a brief delay
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };


  // Filter channel members based on mention query
  const filteredMentionUsers = channelMembers.filter(
    user =>
      user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  // Set initial text when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      setTimeout(() => textInputRef.current?.focus(), 100);
    } else {
      setText('');
    }
  }, [editingMessage]);

  // Check for mentions when cursor position changes
  useEffect(() => {
    if (text) {
      checkForMentions(text, selectionStart);
    }
  }, [selectionStart]);

  // Voice recognition setup
  useEffect(() => {
    // Debug voice system on component mount
    // Debug voice system (functions removed during cleanup)

    // Run comprehensive diagnostics
    runVoiceDiagnostics();

    try {
      if (Voice.isModuleAvailable()) {
        setVoiceAvailable(true);
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechRecognized = onSpeechRecognized;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechPartialResults = onSpeechPartialResults;
        console.log('✅ Voice recognition setup completed');
      } else {
        setVoiceAvailable(false);
        console.warn(
          '⚠️ Voice module not available - voice recognition disabled',
        );
      }
    } catch (error) {
      setVoiceAvailable(false);
      console.warn('❌ Voice recognition setup failed:', error);
    }

    return () => {
      try {
        if (Voice.isModuleAvailable()) {
          Voice.destroy()
            .then(() => Voice.removeAllListeners())
            .catch(console.warn);
        }
      } catch (error) {
        console.warn('Voice cleanup failed:', error);
      }
      
      // Clear debounce timer on cleanup
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Voice event handlers
  const onSpeechStart = () => setIsListening(true);
  const onSpeechRecognized = () => {};
  const onSpeechEnd = () => {
    console.log('🛑 Speech end detected');
    setIsListening(false);
    // Don't automatically stop recording - let user control it
  };
  const onSpeechError = (error: any) => {
    console.log('❌ Voice error received:', error);
    setIsListening(false);

    // Show detailed error information
    showVoiceErrorDialog(error);
  };
  const onSpeechResults = (event: any) => {
    console.log('📝 Speech results received:', event.value);
    setVoiceResults(event.value);
    // Don't automatically stop - accumulate results for continuous speech
  };
  const onSpeechPartialResults = (event: any) => {
    setVoiceResults(event.value);
  };

  // Permission handlers
  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Audio Recording Permission',
            message:
              'This app needs access to your microphone to record audio messages.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const showPermissionRequest = () => {
    setShowPermissionDialog(true);
  };

  // Recording functions
  const startRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      showPermissionRequest();
      return;
    }

    try {
      const audioPath = `${RNFS.DocumentDirectoryPath}/audio_${Date.now()}.m4a`;

      await audioRecorderPlayer.startRecorder(audioPath);

      setRecording({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioPath,
      });

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      // Start animations
      recordingScale.value = withSpring(1.1, { damping: 10 });
      recordingOpacity.value = withTiming(1, { duration: 200 });
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true,
      );

      // Start voice recognition
      try {
        if (Voice.isModuleAvailable()) {
          console.log('🎤 Starting voice recognition...');
          await Voice.start('en-US');
          console.log('✅ Voice recognition started successfully');
        } else {
          console.warn(
            '⚠️ Voice module not available - continuing with audio recording only',
          );
        }
      } catch (voiceError: any) {
        console.warn('❌ Voice recognition failed to start:', voiceError);
        console.warn('Error details:', voiceError.message);
        // Continue with recording even if voice recognition fails
        showInfo('Voice recognition is not available, but audio recording will continue.');
      }
    } catch (error) {
      console.error('Start recording error:', error);
      showError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorderPlayer.stopRecorder();

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      // Stop voice recognition
      try {
        if (Voice.isModuleAvailable()) {
          console.log('🛑 Stopping voice recognition...');
          await Voice.stop();
          console.log('✅ Voice recognition stopped successfully');
        }
      } catch (voiceError: any) {
        console.warn('❌ Voice recognition failed to stop:', voiceError);
        console.warn('Error details:', voiceError.message);
      }

      // Reset animations
      recordingScale.value = withSpring(1);
      recordingOpacity.value = withTiming(0);
      pulseAnimation.value = withTiming(0);

      // Get transcript
      const rawTranscript = voiceResults.length > 0 ? voiceResults[0] : '';
      console.log('📝 Raw transcript:', rawTranscript);

      let finalTranscript = rawTranscript;

      // Enhance transcript with OpenAI if available
      if (rawTranscript.trim()) {
        try {
          console.log('🔄 Correcting transcription with OpenAI...');
          finalTranscript =
            await openAIService.correctTranscription(rawTranscript);
          console.log('✅ Transcription corrected:', finalTranscript);
        } catch (error) {
          console.warn(
            '⚠️ Transcription correction failed, using original:',
            error,
          );
          finalTranscript = rawTranscript;
        }
      }

      // Send recording with corrected transcript - support both callbacks
      if (onSendRecording) {
        onSendRecording(recording.audioPath, finalTranscript);
      } else if (onSendVoiceMessage) {
        onSendVoiceMessage(recording.audioPath, finalTranscript);
      }

      // Reset state
      setRecording({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioPath: '',
      });
      setVoiceResults([]);
    } catch (error) {
      console.error('Stop recording error:', error);
      showError('Failed to stop recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    try {
      await audioRecorderPlayer.stopRecorder();
      try {
        await Voice.stop();
      } catch (voiceError) {
        console.warn('Voice stop failed during cancel:', voiceError);
      }

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      // Delete audio file
      if (recording.audioPath && (await RNFS.exists(recording.audioPath))) {
        await RNFS.unlink(recording.audioPath);
      }

      // Reset animations and state
      recordingScale.value = withSpring(1);
      recordingOpacity.value = withTiming(0);
      pulseAnimation.value = withTiming(0);

      // Completely reset recording state to restore mic icon
      setRecording({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioPath: '', // This ensures the mic icon is shown again
      });
      setVoiceResults([]);
      setIsListening(false);
    } catch (error) {
      console.error('Cancel recording error:', error);
    }
  };

  const pauseRecording = async () => {
    try {
      await audioRecorderPlayer.pauseRecorder();
      setRecording(prev => ({ ...prev, isPaused: true }));

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      recordingScale.value = withSpring(1);
      pulseAnimation.value = withTiming(0);
    } catch (error) {
      console.error('Pause recording error:', error);
    }
  };

  const resumeRecording = async () => {
    try {
      await audioRecorderPlayer.resumeRecorder();
      setRecording(prev => ({ ...prev, isPaused: false }));

      // Restart timer
      recordingTimer.current = setInterval(() => {
        setRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      recordingScale.value = withSpring(1.1, { damping: 10 });
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true,
      );
    } catch (error) {
      console.error('Resume recording error:', error);
    }
  };

  // File handling
  const handleFilePicker = async () => {
    try {
      const results = await pick({
        allowMultiSelection: false,
        type: [types.allFiles],
      });

      if (results && results.length > 0) {
        const file = results[0];
        setAttachedFiles(prev => [...prev, file]);
        onAttachFile?.(file);
      }
    } catch (error) {
      // @react-native-documents/picker throws an error when user cancels
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        if (errorCode !== 'DOCUMENT_PICKER_CANCELED') {
          console.error('File picker error:', error);
          showError('Failed to pick file. Please try again.');
        }
      } else {
        console.error('File picker error:', error);
        showError('Failed to pick file. Please try again.');
      }
    }
  };

  const handleImagePicker = async () => {
    const options = {
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3] as [number, number],
      quality: 0.8,
    };

    try {
      const response: ImagePickerResult = await launchImageLibraryAsync(options);
      if (!response.canceled && response.assets && response.assets.length > 0) {
        const image = response.assets[0];
        setAttachedFiles(prev => [...prev, image]);
        onAttachImage?.(image);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showError('Failed to pick image. Please try again.');
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      sendButtonScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );

      // Stop typing indicator immediately
      if (replyingTo && onStopReplyTyping) {
        onStopReplyTyping(replyingTo.id);
      } else {
        onStopTyping?.();
      }

      // Handle editing vs sending new message
      if (editingMessage && onEditMessage) {
        // Edit existing message
        onEditMessage(editingMessage.id, text.trim());
        if (onCancelEdit) {
          onCancelEdit();
        }
      } else {
        // Send new message (including replies)
        onSendMessage?.(text.trim());
      }

      setText('');
      setAttachedFiles([]);
    }
  };

  const handleCancel = () => {
    // Stop typing indicator
    if (replyingTo && onStopReplyTyping) {
      onStopReplyTyping(replyingTo.id);
    } else {
      onStopTyping?.();
    }

    setText('');
    if (replyingTo && onCancelReply) {
      onCancelReply();
    }
    if (editingMessage && onCancelEdit) {
      onCancelEdit();
    }
  };


  const handleFocus = () => {
    // Remove animations to prevent flickering
  };

  const handleBlur = () => {
    // Remove animations to prevent flickering
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const recordingAnimatedStyle = useAnimatedStyle(() => {
    const pulseScale = interpolate(pulseAnimation.value, [0, 1], [1, 1.1]);

    return {
      transform: [{ scale: recordingScale.value * pulseScale }],
      opacity: recordingOpacity.value,
    };
  });


  if (disabled) {
    return (
      <View className="px-4 py-2">
        <View className="bg-gray-200 rounded-md px-4 py-3">
          <Text className="text-gray-500 text-center">Input disabled</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="relative">
      {/* Close Button for Modal Mode */}
      {showCloseButton && (
        <View className="flex-row justify-end p-4">
          <TouchableOpacity onPress={onClose} className="p-2">
            <MaterialIcon name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <View className="mx-4 mb-2 flex-row items-center px-4 py-2 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <MaterialIcon name="reply" size={16} color="#3B82F6" />
          <View className="flex-1 ml-2">
            <Text className="text-blue-600 text-xs font-medium">
              Replying to {replyingTo.sender}
            </Text>
            <Text className="text-gray-600 text-sm" numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancel} className="p-1">
            <MaterialIcon name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <View className="mx-4 mb-2 flex-row items-center px-4 py-2 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
          <MaterialIcon name="edit" size={16} color="#F59E0B" />
          <View className="flex-1 ml-2">
            <Text className="text-amber-600 text-xs font-medium">
              Editing message
            </Text>
            <Text className="text-gray-600 text-sm" numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancel} className="p-1">
            <MaterialIcon name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="px-1 py-1"
      >
        {/* Main Input Container */}
        <View className="relative">
        <LinearGradient
          colors={['#3933C6', '#A05FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 2,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 12,
              minHeight: 50,
            }}
          >
            {/* Text Input Area - Full Width */}
            <TextInput
              ref={textInputRef}
              placeholder={
                recording.isRecording
                  ? `Recording ${formatDuration(recording.duration)}${recording.isPaused ? ' (Paused)' : ''}...`
                  : replyingTo
                  ? `Reply to ${replyingTo.sender}...`
                  : editingMessage
                  ? 'Edit message...'
                  : placeholder
              }
              value={
                recording.isRecording && voiceResults.length > 0
                  ? voiceResults[0]
                  : text
              }
              onChangeText={
                recording.isRecording ? undefined : handleTextChange
              }
              onSelectionChange={event => {
                setSelectionStart(event.nativeEvent.selection.start);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="text-gray-800 mb-3"
              placeholderTextColor={
                recording.isRecording ? '#EF4444' : '#999999'
              }
              multiline={true}
              editable={!recording.isRecording}
              style={{
                fontSize: 16,
                fontWeight: '400',
                backgroundColor: 'transparent',
                paddingVertical: 8,
                paddingHorizontal: 8,
                maxHeight: 100,
                minHeight: 40,
                color: recording.isRecording ? '#EF4444' : '#374151',
              }}
            />

            {/* Bottom Action Buttons Row */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-4">
                {/* Plus Button - Hidden during recording */}
                {!recording.isRecording && (
                  <TouchableOpacity
                    onPress={() => setShowAttachmentModal(true)}
                  >
                    <Icon name="plus" size={20} color="#666666" />
                  </TouchableOpacity>
                )}

                {/* Emoji Button - Hidden during recording */}
                {!recording.isRecording && (
                  <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                    <Text className="text-xl">😊</Text>
                  </TouchableOpacity>
                )}

                {/* Recording Controls - Show during recording */}
                {recording.isRecording && (
                  <View className="flex-row items-center space-x-4">
                    {/* Delete/Cancel Button */}
                    <TouchableOpacity
                      onPress={cancelRecording}
                      className="w-8 h-8 bg-red-100 rounded-full items-center justify-center"
                    >
                      <MaterialIcon name="delete" size={16} color="#EF4444" />
                    </TouchableOpacity>

                    {/* Pause/Resume Button */}
                    <TouchableOpacity
                      onPress={
                        recording.isPaused ? resumeRecording : pauseRecording
                      }
                      className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center"
                    >
                      <MaterialIcon
                        name={recording.isPaused ? 'play-arrow' : 'pause'}
                        size={16}
                        color="#F97316"
                      />
                    </TouchableOpacity>

                    {/* Recording indicator */}
                    <View className="flex-row items-center">
                      <Animated.View
                        style={recordingAnimatedStyle}
                        className="w-2 h-2 bg-red-500 rounded-full mr-2"
                      />
                      <Text className="text-red-500 text-xs font-medium">
                        {formatDuration(recording.duration)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View className="flex-row items-center space-x-4">
                {/* Sound/Record Button - Hidden during recording */}
                {!recording.isRecording && (
                  <TouchableOpacity onPress={() => console.log('Sound/Record')}>
                    <MaterialIcon name="graphic-eq" size={24} color="#666666" />
                  </TouchableOpacity>
                )}

                {/* Microphone/Send Button - Always rightmost */}
                {recording.isRecording ? (
                  <TouchableOpacity onPress={stopRecording}>
                    <MaterialIcon name="send" size={24} color="#4285F4" />
                  </TouchableOpacity>
                ) : text.trim() ? (
                  <TouchableOpacity onPress={handleSend} disabled={isLoading}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                      <MaterialIcon name="send" size={24} color="#4285F4" />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={startRecording}>
                    <MaterialIcon name="mic" size={24} color="#666666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Attachment Modal */}
      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowAttachmentModal(false)}
        >
          <View className="bg-white rounded-2xl p-6 m-6 w-80">
            <Text className="text-xl font-bold text-gray-800 mb-6 text-center">
              Choose Attachment
            </Text>

            <View className="space-y-4">
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentModal(false);
                  handleFilePicker();
                }}
                className="flex-row items-center py-4 px-4 bg-blue-50 rounded-xl"
              >
                <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mr-4">
                  <Icon name="file-text" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">
                    Document
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Select a file or document
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentModal(false);
                  handleImagePicker();
                }}
                className="flex-row items-center py-4 px-4 bg-green-50 rounded-xl"
              >
                <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mr-4">
                  <Icon name="image" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">
                    Image
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Select a photo or image
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowAttachmentModal(false)}
              className="mt-6 py-3 px-6 bg-gray-100 rounded-xl"
            >
              <Text className="text-center text-gray-700 font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <Modal
          visible={showEmojiPicker}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </Modal>
      )}

      {/* Voice Recognition Status */}
      {isListening && !recording.isRecording && (
        <View className="mt-2 px-4 flex-row items-center justify-center">
          <MaterialIcon name="mic" size={16} color="#3B82F6" />
          <Text className="text-blue-600 text-sm ml-2">Listening...</Text>
        </View>
      )}

        {/* Voice Debug Info */}
        {__DEV__ && (
          <View className="mt-2 px-4">
            <Text className="text-xs text-gray-500 text-center">
              Voice Module: {voiceAvailable ? '✅ Available' : '❌ Not Available'}
            </Text>
            {voiceResults.length > 0 && (
              <Text className="text-xs text-blue-600 text-center mt-1">
                Last: {voiceResults[0]}
              </Text>
            )}
            {showMentionSuggestions && (
              <Text className="text-xs text-green-600 text-center mt-1">
                Mention suggestions: {filteredMentionUsers.length} users found for "{mentionQuery}"
              </Text>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Mention Suggestions - Outside KeyboardAvoidingView for better positioning */}
      {showMentionSuggestions && filteredMentionUsers.length > 0 && (
        <View className="absolute bottom-full mb-2 left-2 right-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 z-50">
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            {filteredMentionUsers.slice(0, 5).map((user, index) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => insertMention(user)}
                className={`px-4 py-3 flex-row items-center ${
                  index < filteredMentionUsers.slice(0, 5).length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-purple-600 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">{user.name}</Text>
                  <Text className="text-gray-500 text-sm">@{user.username}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Permission Dialog */}
      <PermissionDialog
        visible={showPermissionDialog}
        title="Microphone Permission"
        message="Allow access to your microphone to record voice messages with transcription."
        permissionType="microphone"
        onAllow={async () => {
          const hasPermission = await requestAudioPermission();
          if (hasPermission) {
            showSuccess('Microphone permission granted!');
            // Auto-start recording if permission was just granted
            setTimeout(() => startRecording(), 300);
          } else {
            showError('Microphone permission denied. You can enable it in Settings.');
          }
        }}
        onDeny={() => {
          showInfo('Voice recording requires microphone permission.');
        }}
        onClose={() => setShowPermissionDialog(false)}
      />

      {/* Action Dialog */}
      <ActionDialog {...dialogProps} onClose={hideDialog} />
    </View>
  );
};
