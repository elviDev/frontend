import { Alert, Linking } from 'react-native';
import Voice from '../services/voice/CustomVoice';

export interface VoiceErrorInfo {
  code: number;
  message: string;
  suggestions: string[];
  canRetry: boolean;
}

export const handleVoiceError = async (error: any): Promise<VoiceErrorInfo> => {
  const errorCode = error.error || error.code || 0;
  const errorMessage = error.message || 'Unknown voice error';
  
  console.log('🔍 Handling voice error:', { errorCode, errorMessage });
  
  let suggestions: string[] = [];
  let canRetry = false;
  
  switch (errorCode) {
    case 5: // ERROR_CLIENT
      suggestions = [
        'Check if Google app is installed',
        'Verify speech recognition services are available',
        'Restart the app and try again',
        'Check device compatibility with speech recognition'
      ];
      
      try {
        // Run diagnostics for ERROR_CLIENT
        const diagnostics = await Voice.checkSpeechRecognitionSetup();
        console.log('📊 ERROR_CLIENT Diagnostics:', diagnostics);
        
        if (!diagnostics.googleAppInstalled) {
          suggestions.unshift('Install Google app from Play Store');
        }
        
        if (!diagnostics.hasAudioPermission) {
          suggestions.unshift('Grant microphone permission in app settings');
        }
        
        if (diagnostics.speechServicesCount === 0) {
          suggestions.unshift('No speech recognition services found - check Google Play Services');
        }
        
        canRetry = diagnostics.speechRecognitionAvailable && diagnostics.hasAudioPermission;
        
      } catch (diagError) {
        console.warn('Failed to run diagnostics:', diagError);
      }
      break;
      
    case 1: // ERROR_NETWORK
      suggestions = [
        'Check internet connection',
        'Try again when connected to Wi-Fi',
        'Check if speech recognition requires internet'
      ];
      canRetry = true;
      break;
      
    case 2: // ERROR_SERVER
      suggestions = [
        'Speech recognition server error',
        'Try again in a few moments',
        'Check Google Play Services status'
      ];
      canRetry = true;
      break;
      
    case 3: // ERROR_AUDIO
      suggestions = [
        'Check microphone permissions',
        'Ensure microphone is not blocked by other apps',
        'Check device microphone hardware'
      ];
      canRetry = true;
      break;
      
    case 6: // ERROR_NO_MATCH
      suggestions = [
        'Speak more clearly',
        'Try speaking louder',
        'Reduce background noise',
        'Speak closer to the microphone'
      ];
      canRetry = true;
      break;
      
    case 7: // ERROR_RECOGNIZER_BUSY
      suggestions = [
        'Speech recognizer is busy',
        'Wait a moment and try again',
        'Close other apps using voice recognition'
      ];
      canRetry = true;
      break;
      
    case 8: // ERROR_INSUFFICIENT_PERMISSIONS
      suggestions = [
        'Grant microphone permission',
        'Check app permissions in device settings',
        'Restart app after granting permissions'
      ];
      canRetry = true;
      break;
      
    default:
      suggestions = [
        'Unknown voice recognition error',
        'Try restarting the app',
        'Check device speech recognition settings'
      ];
      canRetry = true;
  }
  
  return {
    code: errorCode,
    message: errorMessage,
    suggestions,
    canRetry
  };
};

export const showVoiceErrorDialog = async (error: any) => {
  const errorInfo = await handleVoiceError(error);
  
  const title = `Voice Recognition Error (${errorInfo.code})`;
  const message = `${errorInfo.message}\n\nSuggestions:\n${errorInfo.suggestions.map(s => `• ${s}`).join('\n')}`;
  
  const buttons = [];
  
  if (errorInfo.code === 5) { // ERROR_CLIENT
    buttons.push({
      text: 'Install Google App',
      onPress: () => {
        Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox');
      }
    });
  }
  
  if (errorInfo.canRetry) {
    buttons.push({
      text: 'Retry',
      onPress: () => {
        // Return retry signal
        return 'retry';
      }
    });
  }
  
  buttons.push({
    text: 'OK',
    style: 'cancel' as const
  });
  
  Alert.alert(title, message, buttons);
};

export const runVoiceDiagnostics = async () => {
  console.log('🔬 === VOICE DIAGNOSTICS ===');
  
  try {
    if (!Voice.isModuleAvailable()) {
      console.log('❌ Voice module not available');
      return false;
    }
    
    const diagnostics = await Voice.checkSpeechRecognitionSetup();
    const services = await Voice.getSpeechRecognitionServices();
    
    console.log('📊 System Diagnostics:');
    console.log('  - Audio Permission:', diagnostics.hasAudioPermission ? '✅' : '❌');
    console.log('  - Speech Recognition Available:', diagnostics.speechRecognitionAvailable ? '✅' : '❌');
    console.log('  - Google App Installed:', diagnostics.googleAppInstalled ? '✅' : '❌');
    console.log('  - Speech Services Count:', diagnostics.speechServicesCount);
    console.log('  - Available Services:', services);
    
    // Provide specific recommendations
    if (!diagnostics.hasAudioPermission) {
      console.log('🔧 ACTION NEEDED: Grant microphone permission');
    }
    
    if (!diagnostics.googleAppInstalled) {
      console.log('🔧 RECOMMENDED: Install Google app for better speech recognition');
    }
    
    if (diagnostics.speechServicesCount === 0) {
      console.log('❌ CRITICAL: No speech recognition services available');
    }
    
    return diagnostics;
    
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
    return false;
  }
};
