import { Alert, Linking } from 'react-native';
import Voice from '../services/voice/CustomVoice';
import i18n from '../i18n';

export interface VoiceErrorInfo {
  code: number;
  message: string;
  suggestions: string[];
  canRetry: boolean;
}

export const handleVoiceError = async (error: any): Promise<VoiceErrorInfo> => {
  const errorCode = error.error || error.code || 0;
  const errorMessage = error.message || i18n.t('errors.unknownError');

  console.log('🔍 Handling voice error:', { errorCode, errorMessage });

  let suggestions: string[] = [];
  let canRetry = false;

  switch (errorCode) {
    case 5: // ERROR_CLIENT
      suggestions = [
        i18n.t('voice.checkGoogleApp'),
        i18n.t('voice.verifySpeechServices'),
        i18n.t('voice.restartApp'),
        i18n.t('voice.checkCompatibility')
      ];
      
      try {
        // Run diagnostics for ERROR_CLIENT
        const diagnostics = await Voice.checkSpeechRecognitionSetup();
        console.log('📊 ERROR_CLIENT Diagnostics:', diagnostics);
        
        if (!diagnostics.googleAppInstalled) {
          suggestions.unshift(i18n.t('voice.installGoogleApp'));
        }

        if (!diagnostics.hasAudioPermission) {
          suggestions.unshift(i18n.t('voice.grantMicPermission'));
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
        i18n.t('voice.checkInternet'),
        i18n.t('voice.speechRequiresInternet')
      ];
      canRetry = true;
      break;
      
    case 2: // ERROR_SERVER
      suggestions = [
        i18n.t('voice.serverError'),
        i18n.t('voice.tryAgainLater'),
        i18n.t('voice.checkPlayServices')
      ];
      canRetry = true;
      break;
      
    case 3: // ERROR_AUDIO
      suggestions = [
        i18n.t('voice.checkMicPermissions'),
        i18n.t('voice.micNotBlocked'),
        i18n.t('voice.checkMicHardware')
      ];
      canRetry = true;
      break;
      
    case 6: // ERROR_NO_MATCH
      suggestions = [
        i18n.t('voice.speakClearly'),
        i18n.t('voice.speakLouder'),
        i18n.t('voice.reduceNoise'),
        i18n.t('voice.speakCloser')
      ];
      canRetry = true;
      break;
      
    case 7: // ERROR_RECOGNIZER_BUSY
      suggestions = [
        i18n.t('voice.recognizerBusy'),
        i18n.t('voice.tryAgainLater'),
        i18n.t('voice.closeOtherApps')
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
