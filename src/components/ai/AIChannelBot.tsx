import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useToast } from '../../contexts/ToastContext';
import { chatGPTService } from '../../services/chatGPTService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIChannelBotProps {
  visible: boolean;
  onClose: () => void;
  channelName: string;
  channelDescription?: string;
  messages: any[]; // Channel messages
}

export const AIChannelBot: React.FC<AIChannelBotProps> = ({
  visible,
  onClose,
  channelName,
  channelDescription,
  messages,
}) => {
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI assistant for #${channelName}. I have access to all the messages in this channel and can help you:\n\n• Summarize conversations\n• Clarify discussions\n• Translate messages\n• Answer questions about the channel\n\nWhat would you like me to help you with?`,
      timestamp: new Date(),
    },
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Draggable functionality
  const pan = useRef(new Animated.ValueXY({ x: 20, y: 100 })).current;
  const [isDragging, setIsDragging] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
    },
    onPanResponderGrant: () => {
      setIsDragging(true);
      pan.setOffset({
        x: (pan.x as any)._value,
        y: (pan.y as any)._value,
      });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (evt, gestureState) => {
      setIsDragging(false);
      pan.flattenOffset();
      
      // Snap to edges if needed
      const finalX = Math.max(10, Math.min(screenWidth - 340, (pan.x as any)._value));
      const finalY = Math.max(insets.top + 10, Math.min(screenHeight - 480, (pan.y as any)._value));
      
      Animated.spring(pan, {
        toValue: { x: finalX, y: finalY },
        useNativeDriver: false,
      }).start();
    },
  });

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await callChatGPT(message);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setChatMessages(prev => [...prev, botMessage]);
      
      // Simulate streaming by adding characters progressively
      await streamResponse(response, botMessage.id);
      
    } catch (error) {
      console.error('AI Error:', error);
      showError('Failed to get AI response. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const callChatGPT = async (userMessage: string): Promise<string> => {
    try {
      const response = await chatGPTService.askChannelAssistant(
        userMessage,
        channelName,
        channelDescription,
        messages
      );
      return response.content;
    } catch (error) {
      console.error('ChatGPT Error:', error);
      throw error;
    }
  };

  const handleQuickAction = async (action: () => Promise<string>) => {
    if (isLoading) return;

    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await action();
      
      const botMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setChatMessages(prev => [...prev, botMessage]);
      
      // Stream the response
      await streamResponse(response, botMessage.id);
      
    } catch (error) {
      console.error('Quick Action Error:', error);
      showError('Failed to get AI response. Please try again.');
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const streamResponse = async (fullResponse: string, messageId: string) => {
    const words = fullResponse.split(' ');
    let currentContent = '';
    
    for (let i = 0; i < words.length; i++) {
      currentContent += (i > 0 ? ' ' : '') + words[i];
      
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: currentContent }
            : msg
        )
      );
      
      // Random delay between 50-150ms to simulate typing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    }
    
    // Mark streaming as complete
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false }
          : msg
      )
    );
  };

  const quickActions = [
    { 
      title: 'Summarize', 
      action: async () => {
        const response = await chatGPTService.summarizeChannel(channelName, channelDescription, messages);
        return response.content;
      },
      icon: 'summarize'
    },
    { 
      title: 'Clarify', 
      action: async () => {
        const response = await chatGPTService.clarifyDiscussion(channelName, channelDescription, messages);
        return response.content;
      },
      icon: 'help-outline'
    },
    { 
      title: 'Translate', 
      action: async () => {
        const response = await chatGPTService.translateMessages('English', channelName, channelDescription, messages);
        return response.content;
      },
      icon: 'translate'
    },
    { 
      title: 'Key Points', 
      action: async () => {
        const response = await chatGPTService.extractActionItems(channelName, channelDescription, messages);
        return response.content;
      },
      icon: 'list'
    },
  ];

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 330,
          height: 460,
          backgroundColor: 'white',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 16,
          zIndex: 1000,
        },
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MaterialIcon name="smart-toy" size={24} color="white" />
          <Text className="text-white font-semibold text-lg ml-2">
            AI Assistant
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={onClose}
          style={{
            padding: 4,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <MaterialIcon name="close" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Channel Info */}
      <View className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <Text className="text-gray-600 text-sm">
          Channel: #{channelName} • {messages.length} messages
        </Text>
      </View>

      {/* Quick Actions */}
      <View className="px-4 py-3 border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleQuickAction(action.action)}
                className="bg-blue-50 px-3 py-2 rounded-full flex-row items-center"
                disabled={isLoading}
              >
                <MaterialIcon name={action.icon} size={16} color="#3B82F6" />
                <Text className="text-blue-600 text-sm font-medium ml-1">
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.map((message) => (
          <View
            key={message.id}
            className={`my-2 ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <View
              className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-500'
                  : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-sm ${
                  message.role === 'user' ? 'text-white' : 'text-gray-800'
                }`}
              >
                {message.content}
              </Text>
              {message.isStreaming && (
                <View className="flex-row items-center mt-1">
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="text-gray-500 text-xs ml-1">Typing...</Text>
                </View>
              )}
            </View>
          </View>
        ))}
        
        {isTyping && (
          <View className="my-2 items-start">
            <View className="bg-gray-100 px-3 py-2 rounded-2xl">
              <View className="flex-row items-center">
                <View className="flex-row space-x-1">
                  <View className="w-2 h-2 bg-gray-400 rounded-full" />
                  <View className="w-2 h-2 bg-gray-400 rounded-full" />
                  <View className="w-2 h-2 bg-gray-400 rounded-full" />
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className="px-4 py-3 border-t border-gray-200">
        <View className="flex-row items-center space-x-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about this channel..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm"
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-full ${
              inputText.trim() && !isLoading
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcon 
                name="send" 
                size={20} 
                color="white" 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};