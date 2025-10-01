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
  interpolate,
  withSequence,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Voice from '@react-native-voice/voice';
import {
  pick,
  types,
} from '@react-native-documents/picker';
import {
  launchImageLibraryAsync,
  ImagePickerResult,
} from 'expo-image-picker';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { EmojiPicker } from '../chat/EmojiPicker';
import { useToast } from '../../contexts/ToastContext';

interface PromptInputProps {
  onSendMessage?: (text: string) => void;
  onSendVoiceMessage?: (audioUri: string, transcript?: string) => void;
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
  autoFocus?: boolean;
  permissionMessage?: string;
}

interface MentionUser {
  id: string;
  name: string;
  username: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSendMessage,
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
  autoFocus = false,
  permissionMessage,
}) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [, setAttachedFiles] = useState<any[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);

  const { showError, showSuccess, showInfo } = useToast();

  const textInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const pulseAnimation = useSharedValue(0);
  const sendButtonScale = useSharedValue(1);

  // Voice Setup
  useEffect(() => {
    const setupVoice = async () => {
      try {
        // Check if Voice module is properly initialized
        if (!Voice || typeof Voice.isAvailable !== 'function') {
          console.log('Voice module not properly initialized');
          return;
        }

        // Check if Voice is available first
        const isAvailable = await Voice.isAvailable();
        if (!isAvailable) {
          console.log('Voice recognition not available on this device');
          return;
        }

        // Setup event listeners with null checks
        if (Voice.onSpeechStart) Voice.onSpeechStart = onSpeechStart;
        if (Voice.onSpeechEnd) Voice.onSpeechEnd = onSpeechEnd;
        if (Voice.onSpeechResults) Voice.onSpeechResults = onSpeechResults;
        if (Voice.onSpeechError) Voice.onSpeechError = onSpeechError;

        const androidPermissionChecking = async () => {
          if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              {
                title: 'Microphone Permission',
                message: 'This app needs access to your microphone to recognize speech',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );

            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              console.log('Microphone permission granted');
            } else {
              console.log('Microphone permission denied');
              showError('Microphone permission is required for voice input');
            }

            try {
              const getService = await Voice.getSpeechRecognitionServices();
              console.log('Speech recognition services:', getService);
            } catch (error) {
              console.log('Error getting speech services:', error);
            }
          }
        };

        await androidPermissionChecking();
      } catch (error) {
        console.log('Voice setup error:', error);
      }
    };

    setupVoice();

    return () => {
      try {
        // Clean up voice listeners and destroy instance
        if (Voice && typeof Voice.destroy === 'function') {
          Voice.destroy().then(() => {
            if (Voice.removeAllListeners) {
              Voice.removeAllListeners();
            }
          }).catch(console.warn);
        }
      } catch (error) {
        console.warn('Voice cleanup error:', error);
      }
    };
  }, []);

  // Voice Event Handlers
  const onSpeechStart = () => {
    console.log('Speech recognition started');
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    console.log('Speech recognition ended');
    setIsListening(false);
  };

  const onSpeechResults = (event: any) => {
    console.log('Speech results:', event);
    if (event.value && event.value.length > 0) {
      const recognizedText = event.value[0];
      
      // Get current cursor position or append to end
      const cursorPos = selectionStart || text.length;
      const textBefore = text.substring(0, cursorPos);
      const textAfter = text.substring(cursorPos);
      
      // Add space before recognized text if there's existing text
      const separator = textBefore.trim() ? ' ' : '';
      const newText = textBefore + separator + recognizedText + textAfter;
      
      setText(newText);
      
      // Update cursor position to end of inserted text
      const newCursorPos = cursorPos + separator.length + recognizedText.length;
      setSelectionStart(newCursorPos);
      
      // Focus the text input
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      
      showSuccess('Voice input added!');
    }
  };

  const onSpeechError = (error: any) => {
    console.log('Speech error:', error);
    setIsListening(false);
    pulseAnimation.value = withTiming(0);
    
    // Handle different error codes more gracefully
    if (error?.error?.code === '7' || error?.error?.message?.includes('No match')) {
      // No match found - this is normal, just inform user
      showInfo('No speech detected. Try speaking louder or closer to the microphone.');
    } else if (error?.error?.code === '6') {
      // No input
      showInfo('No speech detected. Please try again.');
    } else {
      // Other errors
      showError('Voice recognition error. Please try again.');
    }
  };

  // Voice Control Functions
  const startListening = async () => {
    try {
      if (!Voice || typeof Voice.start !== 'function') {
        showError('Voice recognition not available');
        return;
      }
      
      await Voice.start('en-US');
      setIsListening(true);
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true,
      );
      showInfo('Listening... Speak now');
    } catch (error) {
      console.log('Start listening error:', error);
      showError('Failed to start voice recognition');
    }
  };

  const stopListening = async () => {
    try {
      if (!Voice || typeof Voice.stop !== 'function') {
        setIsListening(false);
        pulseAnimation.value = withTiming(0);
        return;
      }
      
      await Voice.stop();
      setIsListening(false);
      pulseAnimation.value = withTiming(0);
    } catch (error) {
      console.log('Stop listening error:', error);
    }
  };

  // Text handling functions
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
    } else {
      setShowMentionSuggestions(false);
      setMentionQuery('');
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

  // Auto-focus when replying to a message
  useEffect(() => {
    if (replyingTo) {
      setTimeout(() => textInputRef.current?.focus(), 100);
    }
  }, [replyingTo]);

  // Auto-focus when autoFocus prop is true (for channel opening)
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => textInputRef.current?.focus(), 200);
    }
  }, [autoFocus]);

  // Check for mentions when cursor position changes
  useEffect(() => {
    if (text) {
      checkForMentions(text, selectionStart);
    }
  }, [selectionStart]);

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

  // Animation styles
  const pulseAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.2]);
    return {
      transform: [{ scale }],
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
        {/* Permission Message */}
        {disabled && permissionMessage && (
          <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
            <View className="flex-row items-center">
              <MaterialIcon name="info" size={20} color="#F59E0B" />
              <Text className="text-orange-700 text-sm ml-2 flex-1">
                {permissionMessage}
              </Text>
            </View>
          </View>
        )}

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
                isListening
                  ? '🎤 Listening... Speak now'
                  : replyingTo
                  ? `Reply to ${replyingTo.sender}...`
                  : editingMessage
                  ? 'Edit message...'
                  : placeholder
              }
              value={text}
              onChangeText={handleTextChange}
              onSelectionChange={event => {
                setSelectionStart(event.nativeEvent.selection.start);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="text-gray-800 mb-3"
              placeholderTextColor={
                isListening ? '#3B82F6' : '#999999'
              }
              multiline={true}
              editable={!isListening}
              style={{
                fontSize: 16,
                fontWeight: '400',
                backgroundColor: 'transparent',
                paddingVertical: 8,
                paddingHorizontal: 8,
                maxHeight: 100,
                minHeight: 40,
                color: '#374151',
              }}
            />

            {/* Bottom Action Buttons Row */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-4">
                {/* Plus Button */}
                <TouchableOpacity
                  onPress={() => setShowAttachmentModal(true)}
                >
                  <Icon name="plus" size={20} color="#666666" />
                </TouchableOpacity>

                {/* Emoji Button */}
                <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                  <Text className="text-xl">😊</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center space-x-4">
                {/* Microphone Button */}
                <TouchableOpacity 
                  onPress={isListening ? stopListening : startListening}
                  className="items-center"
                >
                  {isListening ? (
                    <Animated.View style={pulseAnimatedStyle}>
                      <View className="flex-row items-center justify-center">
                        <View className="w-2 h-2 bg-blue-500 rounded-full mx-1" />
                        <View className="w-2 h-2 bg-blue-500 rounded-full mx-1" />
                        <View className="w-2 h-2 bg-blue-500 rounded-full mx-1" />
                      </View>
                    </Animated.View>
                  ) : (
                    <MaterialIcon name="mic" size={24} color="#666666" />
                  )}
                  <Text className="text-xs text-gray-500 mt-1">
                    {isListening ? 'Listening...' : 'Voice'}
                  </Text>
                </TouchableOpacity>

                {/* Send Button */}
                {text.trim() && (
                  <TouchableOpacity onPress={handleSend} disabled={isLoading}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                      <MaterialIcon name="send" size={24} color="#4285F4" />
                    )}
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
      {isListening && (
        <View className="mt-2 px-4 flex-row items-center justify-center">
          <MaterialIcon name="mic" size={16} color="#3B82F6" />
          <Text className="text-blue-600 text-sm ml-2">Listening for speech...</Text>
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
    </View>
  );
};