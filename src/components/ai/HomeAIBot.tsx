import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { DirectVoiceInput } from '../voice/DirectVoiceInput';
import { homeAIBotService, UserRole, AIBotResponse } from '../../services/homeAIBotService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

interface HomeAIBotProps {
  visible: boolean;
  onClose: () => void;
}

export const HomeAIBot: React.FC<HomeAIBotProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    isTyping?: boolean;
  }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTypingText, setCurrentTypingText] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(visible ? 1 : 0);
  
  // Dragging state
  const isDragging = useRef(false);
  
  useEffect(() => {
    scale.value = withSpring(visible ? 1 : 0);
    if (visible && messages.length === 0) {
      // Add welcome message
      const welcomeText = user?.role === 'ceo' 
        ? `Hello ${user.name}! I'm TT, your AI assistant. I can help you with organization insights, team performance, task analytics, and creating announcements. What would you like to know?`
        : `Hello ${user?.name}! I'm TT, your AI assistant. I can help you check your tasks, deadlines, channel updates, and productivity insights. What can I help you with?`;

      setTimeout(() => {
        addMessage(welcomeText, false, true);
      }, 150);
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: interpolate(scale.value, [0, 1], [0, 1]),
    };
  });

  const addMessage = (text: string, isUser: boolean, shouldType: boolean = false) => {
    const messageId = Date.now().toString();
    
    if (shouldType && !isUser) {
      // Add typing message first
      setMessages(prev => [...prev, {
        id: messageId,
        text: '',
        isUser,
        timestamp: new Date(),
        isTyping: true,
      }]);
      
      // Type out the message
      typeMessage(messageId, text);
    } else {
      setMessages(prev => [...prev, {
        id: messageId,
        text,
        isUser,
        timestamp: new Date(),
      }]);
    }
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const typeMessage = (messageId: string, fullText: string) => {
    let currentIndex = 0;
    const typingSpeed = 8; // milliseconds per character
    
    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        const currentText = fullText.substring(0, currentIndex + 1);
        setCurrentTypingText(currentText);
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: currentText, isTyping: true }
            : msg
        ));
        
        currentIndex++;
        setTimeout(typeNextChar, typingSpeed);
      } else {
        // Typing complete
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isTyping: false }
            : msg
        ));
        setCurrentTypingText('');
      }
    };
    
    typeNextChar();
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!user) {
      showError('Please log in to use the AI assistant');
      return;
    }

    if (!transcript.trim()) {
      showError('Please provide a valid question or command');
      return;
    }

    addMessage(transcript, true);
    setIsProcessing(true);

    try {
      const userRole: UserRole = {
        role: user.role as any,
        userId: user.id,
        name: user.name || 'User',
      };

      console.log('🎤 Processing voice input:', transcript);
      console.log('🎤 User role:', userRole);

      const response: AIBotResponse = await homeAIBotService.processUserQuery(transcript, userRole);
      
      console.log('🎤 AI response received:', response);
      
      if (response.success) {
        addMessage(response.response, false, true);
        
        // Handle special actions
        if (response.action?.type === 'create_announcement') {
          showSuccess('Announcement created successfully!');
        }
      } else {
        addMessage(response.response || 'I apologize, but I encountered an issue processing your request. Please try again.', false, true);
        
        // Show specific error if it's an API key issue
        if (response.response?.includes('API key')) {
          showError('AI service configuration issue - please check with your administrator');
        }
      }
    } catch (error) {
      console.error('🎤 Voice processing error:', error);
      
      let errorMessage = 'I\'m having trouble right now. Please check your connection and try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'AI services are not properly configured. Please contact your administrator.';
          showError('AI configuration error');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'I\'m having trouble connecting to my services. Please check your internet connection and try again.';
          showError('Connection error');
        } else {
          errorMessage = 'I encountered an unexpected error. Please try again in a moment.';
          showError('Processing error');
        }
      }
      
      addMessage(errorMessage, false, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePanGesture = (event: any) => {
    const { translationX, translationY, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      isDragging.current = true;
      translateX.value = translationX;
      translateY.value = translationY;
    } else if (state === State.END) {
      isDragging.current = false;
      // Snap back to bounds
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  };

  const quickActions = user?.role === 'ceo' ? [
    { text: 'Team Performance', query: 'How is the team performing? Who has pending tasks?' },
    { text: 'Task Overview', query: 'Give me an overview of all tasks in the organization' },
    { text: 'Create Announcement', query: 'Create an announcement about our weekly team meeting on Friday' },
    { text: 'Urgent Tasks', query: 'What urgent tasks need attention across the organization?' },
  ] : [
    { text: 'My Tasks', query: 'How many pending tasks do I have?' },
    { text: 'Urgent Items', query: 'What urgent tasks do I have?' },
    { text: 'Today\'s Work', query: 'What tasks are due today?' },
    { text: 'Progress Update', query: 'How am I doing with my tasks this week?' },
  ];

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        {
          position: 'absolute',
          top: 100,
          left: 20,
          right: 20,
          bottom: 200,
          zIndex: 1000,
        },
        containerStyle
      ]}
    >
      <View className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Draggable Header */}
        <PanGestureHandler onGestureEvent={handlePanGesture}>
          <Animated.View>
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-white rounded-full items-center justify-center mr-3">
                    <MaterialIcon name="smart-toy" size={18} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg">TT AI</Text>
                    <Text className="text-purple-100 text-xs">
                      {user?.role === 'ceo' ? 'Executive Assistant' : 'Personal Assistant'}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity onPress={onClose} className="p-2">
                  <MaterialIcon name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Drag indicator */}
              <View className="items-center mt-1">
                <View className="w-8 h-1 bg-white opacity-50 rounded-full" />
              </View>
            </LinearGradient>
          </Animated.View>
        </PanGestureHandler>

        {/* Messages */}
        <ScrollView 
            ref={scrollViewRef}
            className="flex-1 px-4 py-3"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`mb-3 ${message.isUser ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-xs rounded-lg px-3 py-2 ${
                    message.isUser
                      ? 'bg-blue-500'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      message.isUser ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {message.text}
                    {message.isTyping && (
                      <Text className="text-gray-500">|</Text>
                    )}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            ))}
            
            {isProcessing && (
              <View className="items-start mb-3">
                <View className="bg-gray-100 rounded-lg px-3 py-2 flex-row items-center">
                  <ActivityIndicator size="small" color="#6B7280" />
                  <Text className="text-gray-600 text-sm ml-2">Thinking...</Text>
                </View>
              </View>
            )}
        </ScrollView>

        {/* Quick Actions */}
        <View className="px-4 py-2 border-t border-gray-200">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mb-2"
            >
              <View className="flex-row space-x-2">
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleVoiceInput(action.query)}
                    className="bg-purple-50 rounded-full px-3 py-2"
                    disabled={isProcessing}
                  >
                    <Text className="text-purple-700 text-xs font-medium">
                      {action.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Voice Input */}
          <View className="px-4 pb-4 border-t border-gray-200">
            <View className="flex-row items-center justify-center pt-3">
              <DirectVoiceInput
                onVoiceResult={handleVoiceInput}
                isProcessing={isProcessing}
                size="medium"
                buttonText="Ask TT"
              />
            </View>
            <Text className="text-center text-xs text-gray-500 mt-2">
              {user?.role === 'ceo' 
                ? 'Ask about team performance, create announcements, or get insights'
                : 'Ask about your tasks, deadlines, or productivity'
              }
            </Text>
          </View>
        </View>
      
    </Animated.View>
    
  )
};