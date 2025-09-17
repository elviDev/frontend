import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { Voice } = NativeModules;

// NativeEventEmitter is only available on React Native platforms, so this conditional is used to avoid import conflicts in the browser/server
const voiceEmitter = Platform.OS !== 'web' && Voice ? new NativeEventEmitter(Voice) : null;

class RCTVoice {
  private _loaded: boolean;
  private _listeners: any[] | null;
  private _events: { [key: string]: (e: any) => void };

  // Event handlers
  onSpeechStart?: (e: any) => void;
  onSpeechRecognized?: (e: any) => void;
  onSpeechEnd?: (e: any) => void;
  onSpeechError?: (e: any) => void;
  onSpeechResults?: (e: any) => void;
  onSpeechPartialResults?: (e: any) => void;
  onSpeechVolumeChanged?: (e: any) => void;

  constructor() {
    this._loaded = false;
    this._listeners = null;
    this._events = {
      onSpeechStart: this._onSpeechStart.bind(this),
      onSpeechRecognized: this._onSpeechRecognized.bind(this),
      onSpeechEnd: this._onSpeechEnd.bind(this),
      onSpeechError: this._onSpeechError.bind(this),
      onSpeechResults: this._onSpeechResults.bind(this),
      onSpeechPartialResults: this._onSpeechPartialResults.bind(this),
      onSpeechVolumeChanged: this._onSpeechVolumeChanged.bind(this),
    };
  }

  removeAllListeners() {
    this.onSpeechStart = undefined;
    this.onSpeechRecognized = undefined;
    this.onSpeechEnd = undefined;
    this.onSpeechError = undefined;
    this.onSpeechResults = undefined;
    this.onSpeechPartialResults = undefined;
    this.onSpeechVolumeChanged = undefined;
  }

  isModuleAvailable() {
    return Voice != null;
  }

  destroy() {
    if (!this._loaded && !this._listeners) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      if (!Voice || !Voice.destroySpeech) {
        // If native module is not available, just clean up and resolve
        if (this._listeners) {
          this._listeners.map(listener => listener.remove());
          this._listeners = null;
        }
        resolve();
        return;
      }

      Voice.destroySpeech((error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          if (this._listeners) {
            this._listeners.map(listener => listener.remove());
            this._listeners = null;
          }
          resolve();
        }
      });
    });
  }

  start(locale: string, options: { [key: string]: any } = {}) {
    if (!this._loaded && !this._listeners && voiceEmitter !== null) {
      this._listeners = Object.keys(this._events).map(key =>
        voiceEmitter.addListener(key, this._events[key]),
      );
    }

    return new Promise<void>((resolve, reject) => {
      if (!Voice || !Voice.startSpeech) {
        reject(new Error('Voice module not available'));
        return;
      }

      const callback = (error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      };

      if (Platform.OS === 'android') {
        Voice.startSpeech(
          locale,
          Object.assign(
            {
              EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
              EXTRA_MAX_RESULTS: 5,
              EXTRA_PARTIAL_RESULTS: true,
              REQUEST_PERMISSIONS_AUTO: true,
            },
            options,
          ),
          callback,
        );
      } else {
        Voice.startSpeech(locale, callback);
      }
    });
  }

  stop() {
    if (!this._loaded && !this._listeners) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      if (!Voice || !Voice.stopSpeech) {
        resolve();
        return;
      }

      Voice.stopSpeech((error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      });
    });
  }

  cancel() {
    if (!this._loaded && !this._listeners) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      if (!Voice || !Voice.cancelSpeech) {
        resolve();
        return;
      }

      Voice.cancelSpeech((error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      });
    });
  }

  isAvailable() {
    return new Promise<boolean>((resolve, reject) => {
      if (!Voice || !Voice.isSpeechAvailable) {
        resolve(false);
        return;
      }

      Voice.isSpeechAvailable((isAvailable: boolean, error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve(isAvailable);
        }
      });
    });
  }

  /**
   * (Android) Get a list of the speech recognition engines available on the device
   */
  getSpeechRecognitionServices() {
    if (Platform.OS !== 'android') {
      throw new Error('Speech recognition services can be queried for only on Android');
    }

    if (!Voice || !Voice.getSpeechRecognitionServices) {
      return Promise.resolve([]);
    }

    return Voice.getSpeechRecognitionServices();
  }

  /**
   * Check speech recognition setup and diagnose common issues
   */
  checkSpeechRecognitionSetup() {
    return new Promise<any>((resolve, reject) => {
      if (!Voice || !Voice.checkSpeechRecognitionSetup) {
        resolve({
          hasAudioPermission: false,
          speechRecognitionAvailable: false,
          googleAppInstalled: false,
          speechServicesCount: 0,
          error: 'Voice module not available'
        });
        return;
      }

      Voice.checkSpeechRecognitionSetup()
        .then(resolve)
        .catch(reject);
    });
  }

  isRecognizing() {
    return new Promise<boolean>(resolve => {
      if (!Voice || !Voice.isRecognizing) {
        resolve(false);
        return;
      }

      Voice.isRecognizing((isRecognizing: boolean) => resolve(isRecognizing));
    });
  }

  private _onSpeechStart(e: any) {
    if (this.onSpeechStart) {
      this.onSpeechStart(e);
    }
  }

  private _onSpeechRecognized(e: any) {
    if (this.onSpeechRecognized) {
      this.onSpeechRecognized(e);
    }
  }

  private _onSpeechEnd(e: any) {
    if (this.onSpeechEnd) {
      this.onSpeechEnd(e);
    }
  }

  private _onSpeechError(e: any) {
    if (this.onSpeechError) {
      this.onSpeechError(e);
    }
  }

  private _onSpeechResults(e: any) {
    if (this.onSpeechResults) {
      this.onSpeechResults(e);
    }
  }

  private _onSpeechPartialResults(e: any) {
    if (this.onSpeechPartialResults) {
      this.onSpeechPartialResults(e);
    }
  }

  private _onSpeechVolumeChanged(e: any) {
    if (this.onSpeechVolumeChanged) {
      this.onSpeechVolumeChanged(e);
    }
  }
}

export default new RCTVoice();
