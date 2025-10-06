# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Socket.IO
-keep class io.socket.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Voice Recognition - Critical for AI features
-keep class com.wenkesj.voice.** { *; }
-keep class com.facebook.react.modules.permissions.** { *; }

# Image Picker
-keep class com.imagepicker.** { *; }
-keep class com.reactnative.ivpusic.imagepicker.** { *; }

# Document Picker
-keep class io.github.elyx0.reactnativedocumentpicker.** { *; }

# File System
-keep class com.rnfs.** { *; }

# Device Info
-keep class com.learnium.RNDeviceInfo.** { *; }

# Linear Gradient
-keep class com.BV.LinearGradient.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Push Notifications
-keep class com.dieam.reactnativepushnotification.** { *; }

# SVG
-keep class com.horcrux.svg.** { *; }

# Remove debug logs in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Optimize
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose
