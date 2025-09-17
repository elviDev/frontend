package com.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.os.Handler
import android.os.Looper
import java.util.*

class VoiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), RecognitionListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var recognizerIntent: Intent? = null
    private var isListening = false
    private var callback: Callback? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        const val NAME = "Voice"
    }

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun isSpeechAvailable(callback: Callback) {
        mainHandler.post {
            val available = SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)
            callback.invoke(available, null)
        }
    }

    @ReactMethod
    fun startSpeech(locale: String, options: ReadableMap?, callback: Callback) {
        mainHandler.post {
            try {
                // Validate preconditions
                if (isListening) {
                    callback.invoke("Already listening")
                    return@post
                }

                if (!hasAudioPermission()) {
                    callback.invoke("Audio permission not granted")
                    return@post
                }

                if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
                    callback.invoke("Speech recognition not available on this device")
                    return@post
                }

                this.callback = callback
                
                // Clean up existing recognizer if any
                if (speechRecognizer != null) {
                    try {
                        speechRecognizer?.destroy()
                    } catch (e: Exception) {
                        android.util.Log.w("VoiceModule", "Error destroying existing recognizer: ${e.message}")
                    }
                }

                // Create new recognizer
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
                
                if (speechRecognizer == null) {
                    callback.invoke("Failed to create speech recognizer")
                    return@post
                }

                speechRecognizer?.setRecognitionListener(this)

                // Create intent with comprehensive settings
                recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, reactApplicationContext.packageName)
                    
                    // Apply additional options if provided
                    options?.let { opts ->
                        if (opts.hasKey("EXTRA_LANGUAGE_MODEL")) {
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, opts.getString("EXTRA_LANGUAGE_MODEL"))
                        }
                        if (opts.hasKey("EXTRA_MAX_RESULTS")) {
                            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, opts.getInt("EXTRA_MAX_RESULTS"))
                        }
                        if (opts.hasKey("EXTRA_PARTIAL_RESULTS")) {
                            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, opts.getBoolean("EXTRA_PARTIAL_RESULTS"))
                        }
                    }
                }

                android.util.Log.d("VoiceModule", "Starting speech recognition with locale: $locale")
                speechRecognizer?.startListening(recognizerIntent)
                isListening = true
                callback.invoke(null as String?)
                
            } catch (e: Exception) {
                android.util.Log.e("VoiceModule", "Error in startSpeech: ${e.message}", e)
                callback.invoke("Failed to start speech recognition: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun stopSpeech(callback: Callback) {
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
                isListening = false
                callback.invoke(null as String?)
            } catch (e: Exception) {
                callback.invoke(e.message)
            }
        }
    }

    @ReactMethod
    fun cancelSpeech(callback: Callback) {
        mainHandler.post {
            try {
                speechRecognizer?.cancel()
                isListening = false
                callback.invoke(null as String?)
            } catch (e: Exception) {
                callback.invoke(e.message)
            }
        }
    }

    @ReactMethod
    fun destroySpeech(callback: Callback) {
        mainHandler.post {
            try {
                speechRecognizer?.destroy()
                speechRecognizer = null
                isListening = false
                callback.invoke(null as String?)
            } catch (e: Exception) {
                callback.invoke(e.message)
            }
        }
    }

    @ReactMethod
    fun isRecognizing(callback: Callback) {
        mainHandler.post {
            callback.invoke(isListening)
        }
    }

    @ReactMethod
    fun getSpeechRecognitionServices(promise: Promise) {
        mainHandler.post {
            try {
                val packageManager = reactApplicationContext.packageManager
                val services = mutableListOf<String>()
                
                // Check for Google Speech Recognition
                val googleIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                val activities = packageManager.queryIntentActivities(googleIntent, 0)
                
                for (info in activities) {
                    services.add(info.activityInfo.packageName)
                }
                
                android.util.Log.d("VoiceModule", "Available speech services: $services")
                promise.resolve(Arguments.fromList(services))
            } catch (e: Exception) {
                android.util.Log.e("VoiceModule", "Error getting speech services: ${e.message}")
                promise.reject("ERROR", e.message)
            }
        }
    }
    
    @ReactMethod
    fun checkSpeechRecognitionSetup(promise: Promise) {
        mainHandler.post {
            try {
                val result = Arguments.createMap()
                result.putBoolean("hasAudioPermission", hasAudioPermission())
                result.putBoolean("speechRecognitionAvailable", SpeechRecognizer.isRecognitionAvailable(reactApplicationContext))
                
                // Check if Google app is installed (common cause of ERROR_CLIENT)
                val packageManager = reactApplicationContext.packageManager
                var googleAppInstalled = false
                try {
                    packageManager.getPackageInfo("com.google.android.googlequicksearchbox", 0)
                    googleAppInstalled = true
                } catch (e: Exception) {
                    // Google app not installed
                }
                result.putBoolean("googleAppInstalled", googleAppInstalled)
                
                // Check speech services
                val speechIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                val activities = packageManager.queryIntentActivities(speechIntent, 0)
                result.putInt("speechServicesCount", activities.size)
                
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    private fun hasAudioPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        mainHandler.post {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    // RecognitionListener implementation
    override fun onReadyForSpeech(params: Bundle?) {
        mainHandler.post {
            val map = Arguments.createMap()
            sendEvent("onSpeechStart", map)
        }
    }

    override fun onBeginningOfSpeech() {
        mainHandler.post {
            val map = Arguments.createMap()
            sendEvent("onSpeechRecognized", map)
        }
    }

    override fun onRmsChanged(rmsdB: Float) {
        mainHandler.post {
            val map = Arguments.createMap()
            map.putDouble("value", rmsdB.toDouble())
            sendEvent("onSpeechVolumeChanged", map)
        }
    }

    override fun onBufferReceived(buffer: ByteArray?) {
        // Not used
    }

    override fun onEndOfSpeech() {
        mainHandler.post {
            val map = Arguments.createMap()
            sendEvent("onSpeechEnd", map)
            // Don't automatically set isListening = false here
            // Let the JavaScript side decide when to stop
        }
    }

    override fun onError(error: Int) {
        mainHandler.post {
            val map = Arguments.createMap()
            map.putInt("error", error)
            val errorMessage = when (error) {
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                SpeechRecognizer.ERROR_CLIENT -> "Client side error - Check permissions and speech service availability"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                SpeechRecognizer.ERROR_NETWORK -> "Network error"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                SpeechRecognizer.ERROR_NO_MATCH -> "No match"
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy"
                SpeechRecognizer.ERROR_SERVER -> "Error from server"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                else -> "Unknown error"
            }
            map.putString("message", errorMessage)
            
            // Enhanced logging for ERROR_CLIENT
            if (error == SpeechRecognizer.ERROR_CLIENT) {
                android.util.Log.e("VoiceModule", "CLIENT ERROR Details:")
                android.util.Log.e("VoiceModule", "- Has audio permission: ${hasAudioPermission()}")
                android.util.Log.e("VoiceModule", "- Speech recognition available: ${SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)}")
                android.util.Log.e("VoiceModule", "- SpeechRecognizer instance: ${speechRecognizer != null}")
                android.util.Log.e("VoiceModule", "- Intent: ${recognizerIntent != null}")
            }
            
            sendEvent("onSpeechError", map)
            isListening = false
        }
    }

    override fun onResults(results: Bundle?) {
        mainHandler.post {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val map = Arguments.createMap()
            val array = Arguments.createArray()
            matches?.forEach { array.pushString(it) }
            map.putArray("value", array)
            sendEvent("onSpeechResults", map)
            // Don't automatically stop - let user control when to stop
            // isListening = false
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        mainHandler.post {
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val map = Arguments.createMap()
            val array = Arguments.createArray()
            matches?.forEach { array.pushString(it) }
            map.putArray("value", array)
            sendEvent("onSpeechPartialResults", map)
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {
        // Not used
    }
}
