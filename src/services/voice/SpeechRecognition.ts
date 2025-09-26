import { Platform } from 'react-native';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechRecognitionCallbacks {
  onResult: (result: SpeechRecognitionResult) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

/**
 * Speech Recognition Service
 * Provides cross-platform speech-to-text functionality
 */
class SpeechRecognitionService {
  private isListening = false;
  private recognition: any = null;
  private callbacks: SpeechRecognitionCallbacks | null = null;
  private currentConfig: SpeechRecognitionConfig = {};

  /**
   * Check if speech recognition is available
   */
  isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' &&
        ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    }

    // For React Native, we assume voice recognition is available
    // In production, you'd check for react-native-voice or similar library
    return true;
  }

  /**
   * Initialize speech recognition
   */
  initialize(config: SpeechRecognitionConfig = {}): void {
    this.currentConfig = {
      language: 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      ...config,
    };

    if (Platform.OS === 'web') {
      this.initializeWebSpeechAPI();
    } else {
      this.initializeNativeSpeechRecognition();
    }
  }

  /**
   * Initialize Web Speech API
   */
  private initializeWebSpeechAPI(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.currentConfig.continuous;
    this.recognition.interimResults = this.currentConfig.interimResults;
    this.recognition.lang = this.currentConfig.language;
    this.recognition.maxAlternatives = this.currentConfig.maxAlternatives;

    this.recognition.onstart = () => {
      console.log('<� Speech recognition started');
      this.isListening = true;
      this.callbacks?.onStart();
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      console.log('=� Speech result:', { transcript, confidence, isFinal });

      this.callbacks?.onResult({
        transcript,
        confidence: confidence || 0.5,
        isFinal,
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('L Speech recognition error:', event.error);
      this.isListening = false;
      this.callbacks?.onError(event.error);
    };

    this.recognition.onend = () => {
      console.log('<� Speech recognition ended');
      this.isListening = false;
      this.callbacks?.onEnd();
    };
  }

  /**
   * Initialize native speech recognition (React Native)
   */
  private initializeNativeSpeechRecognition(): void {
    // This would use react-native-voice or similar library
    // For now, we'll implement a mock for development
    console.log('<� Native speech recognition initialized (mock)');

    // Mock implementation for development
    this.recognition = {
      start: async () => {
        this.isListening = true;
        this.callbacks?.onStart();

        // Simulate speech recognition after 3 seconds
        setTimeout(() => {
          this.callbacks?.onResult({
            transcript: 'This is a mock speech recognition result',
            confidence: 0.9,
            isFinal: true,
          });

          setTimeout(() => {
            this.isListening = false;
            this.callbacks?.onEnd();
          }, 500);
        }, 3000);
      },
      stop: () => {
        this.isListening = false;
        this.callbacks?.onEnd();
      },
      cancel: () => {
        this.isListening = false;
        this.callbacks?.onEnd();
      },
    };
  }

  /**
   * Start listening for speech
   */
  async start(callbacks: SpeechRecognitionCallbacks): Promise<void> {
    if (this.isListening) {
      console.warn('� Speech recognition already running');
      return;
    }

    if (!this.recognition) {
      throw new Error('Speech recognition not initialized');
    }

    this.callbacks = callbacks;

    try {
      if (Platform.OS === 'web') {
        this.recognition.start();
      } else {
        await this.recognition.start();
      }
    } catch (error) {
      console.error('L Failed to start speech recognition:', error);
      this.callbacks?.onError(error instanceof Error ? error.message : 'Failed to start speech recognition');
    }
  }

  /**
   * Stop listening for speech
   */
  stop(): void {
    if (!this.isListening) {
      console.warn('� Speech recognition not running');
      return;
    }

    try {
      if (Platform.OS === 'web') {
        this.recognition?.stop();
      } else {
        this.recognition?.stop();
      }
    } catch (error) {
      console.error('L Failed to stop speech recognition:', error);
    }
  }

  /**
   * Cancel speech recognition
   */
  cancel(): void {
    if (!this.isListening) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        this.recognition?.abort();
      } else {
        this.recognition?.cancel();
      }

      this.isListening = false;
      this.callbacks?.onEnd();
    } catch (error) {
      console.error('L Failed to cancel speech recognition:', error);
    }
  }

  /**
   * Get current listening state
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get supported languages (mock data)
   */
  getSupportedLanguages(): string[] {
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'es-ES', // Spanish (Spain)
      'es-MX', // Spanish (Mexico)
      'fr-FR', // French (France)
      'de-DE', // German (Germany)
      'it-IT', // Italian (Italy)
      'pt-BR', // Portuguese (Brazil)
      'ru-RU', // Russian (Russia)
      'zh-CN', // Chinese (Simplified)
      'ja-JP', // Japanese (Japan)
      'ko-KR', // Korean (Korea)
    ];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.isListening) {
      this.cancel();
    }

    this.recognition = null;
    this.callbacks = null;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();

// Auto-initialize with default config
speechRecognitionService.initialize();