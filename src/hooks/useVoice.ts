import { useState, useCallback } from 'react';
import { VoiceService } from '../services/api/voiceService';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setError(null);
      setTranscript('');
      
      // Simulate voice recognition
      setTimeout(() => {
        setTranscript('Create a channel for E-commerce Website Project');
        setIsListening(false);
      }, 3000);
      
    } catch (err) {
      setError('Failed to start voice recognition');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setTranscript('');
  }, []);

  const processCommand = useCallback(async (command: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await VoiceService.processVoiceCommand(command);
      
      return result;
    } catch (err) {
      setError('Failed to process voice command');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    processCommand,
    clearTranscript,
  };
}