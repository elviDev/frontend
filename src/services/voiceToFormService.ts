import { chatGPTService } from './chatGPTService';

export interface ChannelFormData {
  name: string;
  description: string;
  type: string;
  privacy: 'public' | 'private' | 'restricted';
  tags: string[];
  color: string;
  members: string[];
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate: string | null; // ISO date string
  tags: string[];
  channel: string;
}

export interface VoiceToFormResult {
  success: boolean;
  formData: Partial<ChannelFormData> | Partial<TaskFormData>;
  confidence: number;
  reasoning: string;
  suggestions: string[];
}

class VoiceToFormService {
  
  async processChannelCreation(voiceInput: string): Promise<VoiceToFormResult> {
    const systemPrompt = `You are an intelligent form-filling assistant. Your task is to extract channel creation information from voice input and return a structured JSON response.

CHANNEL FORM FIELDS:
- name: string (required) - The channel name
- description: string (optional) - Channel description/purpose
- type: string (one of: "project", "department", "announcement", "emergency", "temporary", "initiative") - defaults to "project"
- privacy: "public" | "private" | "restricted" (defaults to "public")
- tags: string[] (optional) - Relevant tags/topics
- color: string (optional) - suggested color name like "blue", "red", "green", etc.
- members: string[] (optional) - mentioned team members or roles

INSTRUCTIONS:
1. Extract ALL relevant information from the voice input
2. Infer missing information intelligently (e.g., if someone says "create a marketing channel", infer type="department", tags=["marketing"])
3. If description is not provided, generate a reasonable one based on the channel name and context
4. Suggest appropriate tags based on the channel name and purpose
5. Return confidence score (0-1) based on how clear the input was
6. Provide reasoning for your choices
7. Return ONLY valid JSON, no additional text

RESPONSE FORMAT:
{
  "success": true,
  "formData": {
    "name": "extracted or inferred name",
    "description": "generated or extracted description",
    "type": "inferred type",
    "privacy": "inferred or default privacy",
    "tags": ["inferred", "tags"],
    "color": "suggested color",
    "members": ["mentioned members"]
  },
  "confidence": 0.9,
  "reasoning": "Explanation of inferences made",
  "suggestions": ["Additional suggestions for the user"]
}`;

    try {
      const response = await chatGPTService.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: voiceInput }
      ], {
        temperature: 0.3, // Lower temperature for more consistent results
        maxTokens: 800
      });

      // Parse the JSON response
      const result = JSON.parse(response.content);
      
      // Validate required fields
      if (!result.formData?.name) {
        return {
          success: false,
          formData: {},
          confidence: 0,
          reasoning: "Could not extract channel name from voice input",
          suggestions: ["Please specify a channel name clearly"]
        };
      }

      return result;
      
    } catch (error) {
      console.error('Voice to form processing error:', error);
      return {
        success: false,
        formData: {},
        confidence: 0,
        reasoning: "Failed to process voice input",
        suggestions: ["Please try again with clearer speech"]
      };
    }
  }

  async processTaskCreation(voiceInput: string): Promise<VoiceToFormResult> {
    const systemPrompt = `You are an intelligent form-filling assistant. Your task is to extract task creation information from voice input and return a structured JSON response.

TASK FORM FIELDS:
- title: string (required) - The task title
- description: string (optional) - Task description/details
- priority: "low" | "medium" | "high" | "urgent" (defaults to "medium")
- assignees: string[] (optional) - mentioned people to assign
- dueDate: string | null (optional) - ISO date string if mentioned
- tags: string[] (optional) - Relevant tags/categories
- channel: string (optional) - mentioned channel/project

INSTRUCTIONS:
1. Extract ALL relevant information from the voice input
2. Infer missing information intelligently
3. If description is not provided, generate a reasonable one based on the task title
4. Parse dates naturally (e.g., "tomorrow", "next week", "Monday") into ISO format
5. Identify priority from urgency words (urgent, asap, important, etc.)
6. Suggest appropriate tags based on the task content
7. Return confidence score (0-1) based on how clear the input was
8. Return ONLY valid JSON, no additional text

RESPONSE FORMAT:
{
  "success": true,
  "formData": {
    "title": "extracted task title",
    "description": "generated or extracted description",
    "priority": "inferred priority",
    "assignees": ["mentioned people"],
    "dueDate": "2024-01-15T00:00:00.000Z",
    "tags": ["inferred", "tags"],
    "channel": "mentioned channel"
  },
  "confidence": 0.9,
  "reasoning": "Explanation of inferences made",
  "suggestions": ["Additional suggestions for the user"]
}`;

    try {
      const response = await chatGPTService.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: voiceInput }
      ], {
        temperature: 0.3,
        maxTokens: 800
      });

      const result = JSON.parse(response.content);
      
      if (!result.formData?.title) {
        return {
          success: false,
          formData: {},
          confidence: 0,
          reasoning: "Could not extract task title from voice input",
          suggestions: ["Please specify a task title clearly"]
        };
      }

      return result;
      
    } catch (error) {
      console.error('Voice to form processing error:', error);
      return {
        success: false,
        formData: {},
        confidence: 0,
        reasoning: "Failed to process voice input",
        suggestions: ["Please try again with clearer speech"]
      };
    }
  }

  // Determine if voice input is for channel or task creation
  async detectIntent(voiceInput: string): Promise<'channel' | 'task' | 'unknown'> {
    const lowerInput = voiceInput.toLowerCase();
    
    // Simple keyword detection first for speed
    const channelKeywords = ['channel', 'group', 'room', 'team space'];
    const taskKeywords = ['task', 'todo', 'assignment', 'job', 'work item'];
    
    const hasChannelKeywords = channelKeywords.some(keyword => lowerInput.includes(keyword));
    const hasTaskKeywords = taskKeywords.some(keyword => lowerInput.includes(keyword));
    
    if (hasChannelKeywords && !hasTaskKeywords) return 'channel';
    if (hasTaskKeywords && !hasChannelKeywords) return 'task';
    
    // If ambiguous or no clear keywords, use ChatGPT for intent detection
    try {
      const response = await chatGPTService.sendMessage([
        { 
          role: 'system', 
          content: `Determine if this voice input is for creating a CHANNEL or a TASK. 
          
          CHANNEL: Creating communication spaces, teams, groups, departments, projects
          TASK: Creating work items, assignments, todos, jobs
          
          Respond with only one word: "channel", "task", or "unknown"`
        },
        { role: 'user', content: voiceInput }
      ], {
        temperature: 0.1,
        maxTokens: 10
      });

      const intent = response.content.toLowerCase().trim();
      return intent === 'channel' || intent === 'task' ? intent : 'unknown';
      
    } catch (error) {
      console.error('Intent detection error:', error);
      return 'unknown';
    }
  }

  // Helper method to generate quick suggestions for common inputs
  getQuickSuggestions(type: 'channel' | 'task'): string[] {
    if (type === 'channel') {
      return [
        "Create a marketing channel for our campaign",
        "Make a private development team channel",
        "Set up an announcement channel for company updates",
        "Create a project channel called Client Onboarding"
      ];
    } else {
      return [
        "Create a high priority task to update the website",
        "Add a task to review the quarterly reports due tomorrow",
        "Make an urgent task to fix the login bug",
        "Create a task for John to prepare the presentation"
      ];
    }
  }
}

export const voiceToFormService = new VoiceToFormService();