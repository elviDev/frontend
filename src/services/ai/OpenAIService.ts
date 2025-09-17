import { OPENAI_API_KEY } from '@env';
import { getAPIKey } from '../../config/apiKeys';

// Debug environment loading
console.log('🔍 Environment loading debug:');
console.log('🔍 typeof OPENAI_API_KEY:', typeof OPENAI_API_KEY);
console.log('🔍 OPENAI_API_KEY value:', OPENAI_API_KEY);

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

console.log(OPENAI_API_KEY);

class OpenAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor() {
    // Try multiple approaches to get the API key
    const envKey = OPENAI_API_KEY;
    const fallbackKey = getAPIKey();

    this.apiKey = envKey || fallbackKey;

    console.log('🔑 OpenAI Service initialized');
    console.log('🔑 Environment key present:', !!envKey);
    console.log('🔑 Fallback key present:', !!fallbackKey);
    console.log('🔑 Final API Key present:', !!this.apiKey);
    console.log('🔑 API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log(
      '🔑 API Key preview:',
      this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NOT FOUND',
    );

    if (!this.apiKey) {
      console.error('❌ No OpenAI API key found in any configuration method');
      console.warn(
        '⚠️ Make sure .env file exists with OPENAI_API_KEY=your_key',
      );
      console.warn(
        '⚠️ Make sure to restart Metro bundler after adding .env file',
      );
      console.warn(
        '⚠️ Alternatively, update src/config/apiKeys.ts with your key',
      );
    }
  }

  private async makeRequest(
    endpoint: string,
    data: any,
  ): Promise<OpenAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI Service Error:', error);
      throw error;
    }
  }

  async enhanceText(text: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!text.trim()) {
      return text;
    }

    // Count words
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 100) {
      throw new Error('Text exceeds 100 words limit for enhancement');
    }

    const prompt = `Please enhance and improve the following text while maintaining its original meaning and intent. Make it more professional, clear, and well-formatted. Keep it concise and natural. Only return the enhanced text without any additional explanations or quotes:

${text}`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional text editor. Your job is to enhance user text to make it clearer, more professional, and better formatted while preserving the original meaning and intent. Always respond with only the enhanced text, no explanations or quotes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const enhancedText = response.choices[0]?.message?.content?.trim();
      if (!enhancedText) {
        throw new Error('No enhanced text received from OpenAI');
      }

      console.log('✅ Text enhanced successfully');
      console.log('Original:', text);
      console.log('Enhanced:', enhancedText);

      return enhancedText;
    } catch (error) {
      console.error('❌ Text enhancement failed:', error);
      throw error;
    }
  }

  async correctTranscription(transcript: string): Promise<string> {
    if (!this.apiKey) {
      console.warn(
        '⚠️ OpenAI API key not configured, returning original transcript',
      );
      return transcript;
    }

    if (!transcript.trim()) {
      return transcript;
    }

    const prompt = `Please correct and improve the following speech-to-text transcription. Fix any grammar errors, add proper punctuation, capitalize appropriately, and ensure it reads naturally. Only return the corrected text without any additional explanations or quotes:

${transcript}`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a transcription editor. Your job is to correct speech-to-text transcriptions by fixing grammar, punctuation, capitalization, and ensuring natural readability. Always respond with only the corrected text, no explanations or quotes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      const correctedText = response.choices[0]?.message?.content?.trim();
      if (!correctedText) {
        console.warn(
          '⚠️ No corrected text received from OpenAI, returning original',
        );
        return transcript;
      }

      console.log('✅ Transcription corrected successfully');
      console.log('Original:', transcript);
      console.log('Corrected:', correctedText);

      return correctedText;
    } catch (error) {
      console.error('❌ Transcription correction failed:', error);
      // Return original transcript if correction fails
      return transcript;
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.makeRequest('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
export default OpenAIService;
