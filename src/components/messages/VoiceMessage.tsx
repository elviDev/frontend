import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { speechRecognitionService, SpeechRecognitionResult } from '../../services/voice/SpeechRecognition';
import { textToSpeechService } from '../../services/voice/TextToSpeech';

interface VoiceMessageProps {
  onVoiceRecorded?: (transcript: string, voiceData?: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  style?: any;
  showTranscription?: boolean;
  autoSend?: boolean;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  onVoiceRecorded,
  onError,
  disabled = false,
  style,
  showTranscription = true,
  autoSend = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (isRecording) {
        speechRecognitionService.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Update duration while recording
    if (isRecording) {
      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    if (!speechRecognitionService.isAvailable()) {
      onError?.('Voice recording is not available on this device');
      return;
    }

    try {
      setIsRecording(true);
      setTranscript('');
      setIsProcessing(false);

      await speechRecognitionService.start({
        onResult: (result: SpeechRecognitionResult) => {
          console.log('🎤 Voice result:', result);
          setTranscript(result.transcript);

          if (result.isFinal) {
            setIsProcessing(true);

            if (autoSend && result.transcript.trim()) {
              // Auto-send the message
              onVoiceRecorded?.(result.transcript.trim());
              setIsRecording(false);
              setIsProcessing(false);
              setTranscript('');
            } else if (showTranscription) {
              // Show transcript for review
              setShowTranscriptModal(true);
              setIsRecording(false);
              setIsProcessing(false);
            } else {
              // Send without showing transcript
              onVoiceRecorded?.(result.transcript.trim());
              setIsRecording(false);
              setIsProcessing(false);
              setTranscript('');
            }
          }
        },
        onError: (error: string) => {
          console.error('🎤 Voice recording error:', error);
          setIsRecording(false);
          setIsProcessing(false);
          onError?.(error);
        },
        onStart: () => {
          console.log('🎤 Voice recording started');
        },
        onEnd: () => {
          console.log('🎤 Voice recording ended');
        },
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      onError?.(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      speechRecognitionService.stop();
      setIsProcessing(true);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      speechRecognitionService.cancel();
      setIsRecording(false);
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const handleSendTranscript = () => {
    if (transcript.trim()) {
      onVoiceRecorded?.(transcript.trim());
      setShowTranscriptModal(false);
      setTranscript('');
    }
  };

  const handlePlayback = async () => {
    if (transcript.trim()) {
      try {
        await textToSpeechService.speak(transcript, {
          language: 'en-US',
          rate: 1,
          pitch: 1,
          volume: 0.8,
        });
      } catch (error) {
        console.error('Failed to play back transcript:', error);
        Alert.alert('Playback Failed', 'Unable to play back the transcript.');
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRecordingButton = () => {
    if (isProcessing) {
      return (
        <View className="w-16 h-16 rounded-full bg-blue-500 items-center justify-center">
          <ActivityIndicator size="small" color="white" />
        </View>
      );
    }

    if (isRecording) {
      return (
        <TouchableOpacity
          onPress={stopRecording}
          className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
          activeOpacity={0.8}
        >
          <View className="w-6 h-6 bg-white rounded-sm" />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={startRecording}
        disabled={disabled}
        className={`w-16 h-16 rounded-full items-center justify-center ${
          disabled ? 'bg-gray-300' : 'bg-blue-500'
        }`}
        activeOpacity={0.8}
      >
        <Icon name="mic" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const renderTranscriptModal = () => {
    if (!showTranscriptModal || !transcript) return null;

    return (
      <View className="absolute inset-0 bg-black/50 items-center justify-center p-4 z-10">
        <View className="bg-white rounded-xl p-6 w-full max-w-md">
          <Text className="text-lg font-semibold mb-4">Voice Message</Text>

          <View className="bg-gray-50 rounded-lg p-4 mb-4">
            <Text className="text-gray-900">{transcript}</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={handlePlayback}
              className="flex-row items-center px-3 py-2 bg-blue-100 rounded-lg"
            >
              <Icon name="play" size={16} color="#3B82F6" />
              <Text className="text-blue-600 ml-2 font-medium">Play</Text>
            </TouchableOpacity>

            <Text className="text-gray-500 text-sm">
              {transcript.length} characters
            </Text>
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => {
                setShowTranscriptModal(false);
                setTranscript('');
              }}
              className="flex-1 bg-gray-100 py-3 rounded-lg"
            >
              <Text className="text-center text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendTranscript}
              className="flex-1 bg-blue-500 py-3 rounded-lg"
            >
              <Text className="text-center text-white font-medium">Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className={`items-center ${style || ''}`}>
      {/* Recording Button */}
      <View className="items-center mb-2">
        {renderRecordingButton()}
      </View>

      {/* Recording Status */}
      {(isRecording || isProcessing) && (
        <View className="items-center mb-2">
          {isRecording && (
            <Text className="text-red-500 font-medium">
              Recording... {formatDuration(recordingDuration)}
            </Text>
          )}
          {isProcessing && (
            <Text className="text-blue-500 font-medium">
              Processing...
            </Text>
          )}
        </View>
      )}

      {/* Live Transcript (if enabled and recording) */}
      {isRecording && transcript && showTranscription && (
        <View className="bg-blue-50 rounded-lg p-3 mt-2 max-w-xs">
          <Text className="text-blue-900 text-sm text-center">
            "{transcript}"
          </Text>
        </View>
      )}

      {/* Cancel Button (while recording) */}
      {isRecording && (
        <TouchableOpacity
          onPress={cancelRecording}
          className="mt-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <Text className="text-gray-700 text-sm font-medium">Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Transcript Modal */}
      {renderTranscriptModal()}
    </View>
  );
};

// Compact version for inline use
export const CompactVoiceMessage: React.FC<Omit<VoiceMessageProps, 'showTranscription'>> = (props) => {
  return (
    <VoiceMessage
      {...props}
      showTranscription={false}
      autoSend={true}
      style="flex-row items-center"
    />
  );
};