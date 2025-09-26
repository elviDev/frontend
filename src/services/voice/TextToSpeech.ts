import { Platform } from 'react-native';

export interface TextToSpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  quality?: 'low' | 'normal' | 'high' | 'premium';
}

export interface SpeechCallbacks {
  onStart?: () => void;
  onProgress?: (charIndex: number, charLength: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

/**
 * Text-to-Speech Service
 * Provides cross-platform text-to-speech functionality
 */
class TextToSpeechService {
  private isSpeaking = false;
  private isPaused = false;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private availableVoices: Voice[] = [];
  private callbacks: SpeechCallbacks | null = null;

  /**
   * Initialize Text-to-Speech
   */
  initialize(): void {
    if (Platform.OS === 'web') {
      this.initializeWebSpeechAPI();
    } else {
      this.initializeNativeTTS();
    }
  }

  /**
   * Initialize Web Speech API
   */
  private initializeWebSpeechAPI(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();

      // Load voices when they become available
      this.synthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    } else {
      console.error('L Speech Synthesis not supported in this browser');
    }
  }

  /**
   * Initialize native TTS (React Native)
   */
  private initializeNativeTTS(): void {
    // This would use react-native-tts or similar library
    // For now, we'll implement a mock for development
    console.log('=� Native TTS initialized (mock)');

    // Mock voices for development
    this.availableVoices = [
      {
        id: 'native-en-us-female',
        name: 'Native Female Voice (US)',
        language: 'en-US',
        gender: 'female',
        quality: 'high'
      },
      {
        id: 'native-en-us-male',
        name: 'Native Male Voice (US)',
        language: 'en-US',
        gender: 'male',
        quality: 'high'
      },
    ];
  }

  /**
   * Load available voices
   */
  private loadVoices(): void {
    if (!this.synthesis) return;

    const voices = this.synthesis.getVoices();
    this.availableVoices = voices.map(voice => ({
      id: voice.voiceURI || voice.name,
      name: voice.name,
      language: voice.lang,
      gender: this.inferGender(voice.name),
      quality: voice.localService ? 'high' : 'normal'
    }));

    console.log(`=� Loaded ${this.availableVoices.length} TTS voices`);
  }

  /**
   * Infer gender from voice name (heuristic)
   */
  private inferGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();

    // Common female voice indicators
    if (name.includes('female') || name.includes('woman') || name.includes('samantha') ||
        name.includes('victoria') || name.includes('karen') || name.includes('zira') ||
        name.includes('paulina') || name.includes('amelie')) {
      return 'female';
    }

    // Common male voice indicators
    if (name.includes('male') || name.includes('man') || name.includes('david') ||
        name.includes('mark') || name.includes('daniel') || name.includes('thomas') ||
        name.includes('diego') || name.includes('alex')) {
      return 'male';
    }

    return 'neutral';
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }
    return true; // Assume available on native platforms
  }

  /**
   * Get available voices
   */
  getVoices(): Voice[] {
    return this.availableVoices;
  }

  /**
   * Get voices for specific language
   */
  getVoicesForLanguage(language: string): Voice[] {
    return this.availableVoices.filter(voice =>
      voice.language.startsWith(language.split('-')[0])
    );
  }

  /**
   * Get default voice for language
   */
  getDefaultVoice(language: string = 'en-US'): Voice | null {
    const languageVoices = this.getVoicesForLanguage(language);
    return languageVoices.length > 0 ? languageVoices[0] : null;
  }

  /**
   * Speak text
   */
  async speak(
    text: string,
    options: TextToSpeechOptions = {},
    callbacks?: SpeechCallbacks
  ): Promise<void> {
    if (this.isSpeaking) {
      console.warn('� TTS already speaking. Stop current speech first.');
      return;
    }

    if (!text.trim()) {
      console.warn('� No text provided for TTS');
      return;
    }

    this.callbacks = callbacks || null;

    if (Platform.OS === 'web') {
      return this.speakWeb(text, options);
    } else {
      return this.speakNative(text, options);
    }
  }

  /**
   * Speak using Web Speech API
   */
  private async speakWeb(text: string, options: TextToSpeechOptions): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not available');
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    if (typeof window === 'undefined') return;

    this.currentUtterance = new (window as any).SpeechSynthesisUtterance(text);

    // Set options
    this.currentUtterance.lang = options.language || 'en-US';
    this.currentUtterance.pitch = options.pitch || 1;
    this.currentUtterance.rate = options.rate || 1;
    this.currentUtterance.volume = options.volume || 1;

    // Find and set voice
    if (options.voice) {
      const voice = this.synthesis.getVoices().find(v =>
        v.voiceURI === options.voice || v.name === options.voice
      );
      if (voice) {
        this.currentUtterance.voice = voice;
      }
    }

    // Set up event handlers
    this.currentUtterance.onstart = () => {
      console.log('=� TTS started');
      this.isSpeaking = true;
      this.isPaused = false;
      this.callbacks?.onStart?.();
    };

    this.currentUtterance.onend = () => {
      console.log('=� TTS completed');
      this.isSpeaking = false;
      this.isPaused = false;
      this.callbacks?.onComplete?.();
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = (event) => {
      console.error('L TTS error:', event.error);
      this.isSpeaking = false;
      this.isPaused = false;
      this.callbacks?.onError?.(event.error);
      this.currentUtterance = null;
    };

    this.currentUtterance.onboundary = (event) => {
      if (event.name === 'word' || event.name === 'sentence') {
        this.callbacks?.onProgress?.(event.charIndex, event.charLength || 0);
      }
    };

    // Start speaking
    this.synthesis.speak(this.currentUtterance);
  }

  /**
   * Speak using native TTS (mock implementation)
   */
  private async speakNative(text: string, options: TextToSpeechOptions): Promise<void> {
    console.log('=� Native TTS speaking (mock):', text.substring(0, 50) + '...');

    this.isSpeaking = true;
    this.callbacks?.onStart?.();

    // Simulate speech duration based on text length
    const duration = Math.max(1000, text.length * 50); // ~50ms per character

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(progressInterval);
        return;
      }

      const progress = Math.random() * text.length;
      this.callbacks?.onProgress?.(Math.floor(progress), 1);
    }, 500);

    // Simulate completion
    setTimeout(() => {
      clearInterval(progressInterval);
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.callbacks?.onComplete?.();
      }
    }, duration);
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (!this.isSpeaking) {
      console.warn('� TTS not currently speaking');
      return;
    }

    if (Platform.OS === 'web' && this.synthesis) {
      this.synthesis.cancel();
    }

    this.isSpeaking = false;
    this.isPaused = false;
    this.callbacks?.onStop?.();
    this.currentUtterance = null;

    console.log('=� TTS stopped');
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (!this.isSpeaking || this.isPaused) {
      console.warn('� TTS not currently speaking or already paused');
      return;
    }

    if (Platform.OS === 'web' && this.synthesis) {
      this.synthesis.pause();
    }

    this.isPaused = true;
    this.callbacks?.onPause?.();
    console.log('=� TTS paused');
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (!this.isSpeaking || !this.isPaused) {
      console.warn('� TTS not currently paused');
      return;
    }

    if (Platform.OS === 'web' && this.synthesis) {
      this.synthesis.resume();
    }

    this.isPaused = false;
    this.callbacks?.onResume?.();
    console.log('=� TTS resumed');
  }

  /**
   * Get current speaking state
   */
  isTTSSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get current paused state
   */
  isTTSPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    const languages = new Set(this.availableVoices.map(voice => voice.language));
    return Array.from(languages).sort();
  }

  /**
   * Test TTS with sample text
   */
  async test(language: string = 'en-US'): Promise<void> {
    const sampleTexts: { [key: string]: string } = {
      'en-US': 'Hello! This is a test of the text-to-speech system.',
      'es-ES': 'Hola! Esta es una prueba del sistema de texto a voz.',
      'fr-FR': 'Bonjour! Ceci est un test du syst�me de synth�se vocale.',
      'de-DE': 'Hallo! Dies ist ein Test des Text-zu-Sprache-Systems.',
      'it-IT': 'Ciao! Questo � un test del sistema di sintesi vocale.',
      'pt-BR': 'Ol�! Este � um teste do sistema de convers�o de texto em fala.',
    };

    const text = sampleTexts[language] || sampleTexts['en-US'];
    const voice = this.getDefaultVoice(language);

    await this.speak(text, {
      language,
      voice: voice?.id,
      rate: 1,
      pitch: 1,
      volume: 0.8,
    }, {
      onStart: () => console.log('<� TTS test started'),
      onComplete: () => console.log(' TTS test completed'),
      onError: (error) => console.error('L TTS test failed:', error),
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.synthesis = null;
    this.currentUtterance = null;
    this.callbacks = null;
    this.availableVoices = [];
  }
}

export const textToSpeechService = new TextToSpeechService();

// Auto-initialize
textToSpeechService.initialize();