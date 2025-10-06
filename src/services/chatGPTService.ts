import { OPENAI_API_KEY } from '@env';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatGPTResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class ChatGPTService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = OPENAI_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenAI API key not found in environment variables');
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<ChatGPTResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 500,
      stream = false,
    } = options;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || 'No response generated.',
        usage: data.usage,
      };
    } catch (error) {
      console.error('ChatGPT API Error:', error);
      throw error;
    }
  }

  // Create context-aware system prompt for channel assistant
  createChannelSystemPrompt(
    channelName: string,
    channelDescription?: string,
    messages: any[] = []
  ): string {
    const messageContext = messages
      .slice(-20) // Last 20 messages for context
      .map(msg => `${msg.user_details?.name || 'User'}: ${msg.content}`)
      .join('\n');

    return `You are an AI assistant for the "${channelName}" channel. ${
      channelDescription ? `Channel description: ${channelDescription}` : ''
    }

You have access to the recent channel messages and can help users with:
- Summarizing conversations and key points
- Clarifying discussions and answering questions
- Translating messages between languages
- Identifying action items and next steps
- Providing insights about the conversation flow

Recent channel messages:
${messageContext}

Please provide helpful, concise, and contextually relevant responses. If asked to summarize or analyze, focus on the most important and recent information. Be conversational but professional.`;
  }

  // Specialized method for channel assistance
  async askChannelAssistant(
    userQuestion: string,
    channelName: string,
    channelDescription?: string,
    messages: any[] = []
  ): Promise<ChatGPTResponse> {
    const systemPrompt = this.createChannelSystemPrompt(
      channelName,
      channelDescription,
      messages
    );

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion },
    ];

    return this.sendMessage(chatMessages, {
      temperature: 0.7,
      maxTokens: 600,
    });
  }

  // Quick action helpers
  async summarizeChannel(
    channelName: string,
    channelDescription?: string,
    messages: any[] = []
  ): Promise<ChatGPTResponse> {
    return this.askChannelAssistant(
      'Please provide a concise summary of the recent conversations in this channel, highlighting key topics, decisions, and action items.',
      channelName,
      channelDescription,
      messages
    );
  }

  async clarifyDiscussion(
    channelName: string,
    channelDescription?: string,
    messages: any[] = []
  ): Promise<ChatGPTResponse> {
    return this.askChannelAssistant(
      'Can you clarify the main topics and points of discussion in this channel? What are the key themes and any areas that might need more discussion?',
      channelName,
      channelDescription,
      messages
    );
  }

  async extractActionItems(
    channelName: string,
    channelDescription?: string,
    messages: any[] = []
  ): Promise<ChatGPTResponse> {
    return this.askChannelAssistant(
      'Please identify any action items, tasks, decisions, or next steps mentioned in the recent channel discussions.',
      channelName,
      channelDescription,
      messages
    );
  }

  async translateMessages(
    targetLanguage: string,
    channelName: string,
    channelDescription?: string,
    messages: any[] = []
  ): Promise<ChatGPTResponse> {
    return this.askChannelAssistant(
      `Please translate any non-English messages in this channel to ${targetLanguage}. If all messages are already in ${targetLanguage}, let me know.`,
      channelName,
      channelDescription,
      messages
    );
  }

  // Simple chat method for direct prompt processing
  async chat(prompt: string, options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}): Promise<string> {
    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 1000,
    } = options;

    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await this.sendMessage(messages, {
      model,
      temperature,
      maxTokens,
    });

    return response.content;
  }
}

export const chatGPTService = new ChatGPTService();