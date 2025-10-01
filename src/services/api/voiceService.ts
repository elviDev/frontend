export interface VoiceParseResult {
  success: boolean;
  intent: {
    type: 'create_channel' | 'create_task' | 'unknown';
    confidence: number;
    parameters: Record<string, any>;
  };
  formData?: Record<string, any>;
  suggestions?: string[];
  actions: string[];
}

export interface ChannelFormData {
  name: string;
  description: string;
  type: string;
  privacy: 'public' | 'private' | 'restricted';
  members: string[];
  tags: string[];
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate: Date | null;
  tags: string[];
  channel: string;
}

export class VoiceService {
  static async processVoiceCommand(transcript: string): Promise<VoiceParseResult> {
    try {
      // Parse the command and extract intent
      const intent = this.parseIntent(transcript);
      const formData = this.extractFormData(transcript, intent.type);
      
      return {
        success: true,
        intent,
        formData,
        suggestions: this.generateSuggestions(intent, formData),
        actions: this.generateActions(intent),
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        success: false,
        intent: { type: 'unknown', confidence: 0, parameters: {} },
        actions: [],
        suggestions: ['Please try speaking more clearly or check your microphone']
      };
    }
  }

  private static parseIntent(transcript: string) {
    const lowerTranscript = transcript.toLowerCase();
    
    // Channel creation patterns
    const channelPatterns = [
      /create\s+(a\s+)?channel/i,
      /new\s+channel/i,
      /make\s+(a\s+)?channel/i,
      /set\s+up\s+(a\s+)?channel/i
    ];
    
    // Task creation patterns  
    const taskPatterns = [
      /create\s+(a\s+)?task/i,
      /new\s+task/i,
      /make\s+(a\s+)?task/i,
      /add\s+(a\s+)?task/i,
      /assign\s+(a\s+)?task/i
    ];
    
    let confidence = 0;
    let type: 'create_channel' | 'create_task' | 'unknown' = 'unknown';
    
    // Check for channel creation
    for (const pattern of channelPatterns) {
      if (pattern.test(transcript)) {
        type = 'create_channel';
        confidence = 0.8;
        break;
      }
    }
    
    // Check for task creation (higher priority if both match)
    for (const pattern of taskPatterns) {
      if (pattern.test(transcript)) {
        type = 'create_task';
        confidence = 0.9;
        break;
      }
    }
    
    // Boost confidence based on additional context
    if (type !== 'unknown') {
      if (lowerTranscript.includes('urgent') || lowerTranscript.includes('priority')) {
        confidence += 0.1;
      }
      if (lowerTranscript.includes('team') || lowerTranscript.includes('members')) {
        confidence += 0.05;
      }
    }
    
    return {
      type,
      confidence: Math.min(confidence, 1.0),
      parameters: type === 'create_channel' ? 
        this.extractChannelParameters(transcript) : 
        type === 'create_task' ? 
        this.extractTaskParameters(transcript) : 
        {}
    };
  }

  private static extractChannelParameters(transcript: string): Partial<ChannelFormData> {
    const lowerTranscript = transcript.toLowerCase();
    
    // Extract channel name
    let channelName = '';
    const namePatterns = [
      /(?:channel|create)\s+(?:called|named)\s+(.+?)(?:\s+(?:with|for|add)|$)/i,
      /(?:create|make|new)\s+(?:a\s+)?channel\s+(?:for\s+)?(.+?)(?:\s+(?:with|add|team)|$)/i,
      /channel\s+(.+?)(?:\s+(?:with|add|team)|$)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = transcript.match(pattern);
      if (match) {
        channelName = match[1].trim();
        break;
      }
    }
    
    // Clean up channel name
    channelName = channelName
      .replace(/\b(with|add|team|members?|people)\b.*$/i, '')
      .trim();
    
    // Extract channel type
    let channelType = 'project'; // default
    if (lowerTranscript.includes('department')) channelType = 'department';
    if (lowerTranscript.includes('announcement')) channelType = 'announcement';
    if (lowerTranscript.includes('emergency')) channelType = 'emergency';
    if (lowerTranscript.includes('temporary')) channelType = 'temporary';
    if (lowerTranscript.includes('initiative')) channelType = 'initiative';
    
    // Extract privacy level
    let privacy: 'public' | 'private' | 'restricted' = 'public';
    if (lowerTranscript.includes('private')) privacy = 'private';
    if (lowerTranscript.includes('restricted')) privacy = 'restricted';
    
    // Extract members
    const members = this.extractMemberNames(transcript);
    
    // Extract description from context
    let description = '';
    if (channelName) {
      description = `Channel for ${channelName} collaboration and coordination`;
    }
    
    // Extract tags
    const tags = this.extractTags(transcript);
    
    return {
      name: channelName || 'New Channel',
      description,
      type: channelType,
      privacy,
      members,
      tags
    };
  }

  private static extractTaskParameters(transcript: string): Partial<TaskFormData> {
    const lowerTranscript = transcript.toLowerCase();
    
    // Extract task title
    let title = '';
    const titlePatterns = [
      /(?:task|create|add)\s+(?:called|named|to)\s+(.+?)(?:\s+(?:assign|for|with|due)|$)/i,
      /(?:create|make|new|add)\s+(?:a\s+)?task\s+(.+?)(?:\s+(?:assign|for|with|due)|$)/i,
      /task\s+(.+?)(?:\s+(?:assign|for|with|due)|$)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = transcript.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }
    
    // Clean up title
    title = title
      .replace(/\b(assign|for|with|due|priority|urgent|team)\b.*$/i, '')
      .trim();
    
    // Extract priority
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (lowerTranscript.includes('urgent') || lowerTranscript.includes('asap')) {
      priority = 'urgent';
    } else if (lowerTranscript.includes('high priority') || lowerTranscript.includes('important')) {
      priority = 'high';
    } else if (lowerTranscript.includes('low priority')) {
      priority = 'low';
    }
    
    // Extract assignees
    const assignees = this.extractMemberNames(transcript);
    
    // Extract due date
    const dueDate = this.extractDueDate(transcript);
    
    // Extract channel context
    let channel = '';
    const channelPatterns = [
      /(?:in|for|to)\s+(?:the\s+)?(.+?)\s+(?:channel|team)/i,
      /(?:channel|team)\s+(.+?)(?:\s|$)/i
    ];
    
    for (const pattern of channelPatterns) {
      const match = transcript.match(pattern);
      if (match) {
        channel = match[1].trim();
        break;
      }
    }
    
    // Generate description
    let description = '';
    if (title) {
      description = `Task: ${title}`;
      if (assignees.length > 0) {
        description += ` - Assigned to: ${assignees.join(', ')}`;
      }
    }
    
    // Extract tags
    const tags = this.extractTags(transcript);
    
    return {
      title: title || 'New Task',
      description,
      priority,
      assignees,
      dueDate,
      tags,
      channel
    };
  }

  // Helper method to extract member names with fuzzy matching
  private static extractMemberNames(transcript: string): string[] {
    const lowerTranscript = transcript.toLowerCase();
    const members: string[] = [];
    
    // Common role patterns
    const rolePatterns = [
      { pattern: /(?:with|add|assign(?:\s+to)?)\s+(.+?)(?:\s+(?:and|,|\bto\b|\bfor\b|$))/gi, type: 'generic' },
      { pattern: /(?:lead designer|design lead)/gi, type: 'role', name: 'Lead Designer' },
      { pattern: /(?:engineering lead|tech lead|lead engineer)/gi, type: 'role', name: 'Engineering Lead' },
      { pattern: /(?:product manager|pm)/gi, type: 'role', name: 'Product Manager' },
      { pattern: /(?:ceo|chief executive)/gi, type: 'role', name: 'CEO' },
      { pattern: /(?:cto|chief technology)/gi, type: 'role', name: 'CTO' },
      { pattern: /(?:myself|me)/gi, type: 'self', name: 'Current User' }
    ];
    
    // Extract role-based members
    rolePatterns.forEach(({ pattern, type, name }) => {
      if (type === 'role' || type === 'self') {
        if (pattern.test(transcript)) {
          members.push(name!);
        }
      }
    });
    
    // Extract named individuals (basic pattern for common names)
    const namePattern = /(?:with|add|assign(?:\s+to)?)\s+(john|jane|mike|sarah|alex|chris|sam|emma|david|lisa)(?:\s|$|,)/gi;
    let nameMatch;
    while ((nameMatch = namePattern.exec(transcript)) !== null) {
      const name = nameMatch[1];
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      if (!members.includes(capitalizedName)) {
        members.push(capitalizedName);
      }
    }
    
    return members;
  }
  
  // Helper method to extract due dates
  private static extractDueDate(transcript: string): Date | null {
    const lowerTranscript = transcript.toLowerCase();
    const today = new Date();
    
    // Relative date patterns
    if (lowerTranscript.includes('today')) {
      return today;
    }
    
    if (lowerTranscript.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }
    
    // Day of week patterns
    const dayMatch = lowerTranscript.match(/(?:due|by|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (dayMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayMatch[1]);
      const currentDay = today.getDay();
      
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next week if day has passed
      
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + daysUntil);
      return dueDate;
    }
    
    // Week patterns
    if (lowerTranscript.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek;
    }
    
    if (lowerTranscript.includes('end of week')) {
      const endOfWeek = new Date(today);
      const daysUntilFriday = 5 - today.getDay();
      endOfWeek.setDate(today.getDate() + (daysUntilFriday > 0 ? daysUntilFriday : 7));
      return endOfWeek;
    }
    
    return null;
  }
  
  // Helper method to extract tags
  private static extractTags(transcript: string): string[] {
    const lowerTranscript = transcript.toLowerCase();
    const tags: string[] = [];
    
    // Priority-based tags
    if (lowerTranscript.includes('urgent')) tags.push('urgent');
    if (lowerTranscript.includes('important')) tags.push('important');
    
    // Department/team tags
    if (lowerTranscript.includes('marketing')) tags.push('marketing');
    if (lowerTranscript.includes('development') || lowerTranscript.includes('dev')) tags.push('development');
    if (lowerTranscript.includes('design')) tags.push('design');
    if (lowerTranscript.includes('sales')) tags.push('sales');
    if (lowerTranscript.includes('finance')) tags.push('finance');
    
    // Project type tags
    if (lowerTranscript.includes('bug') || lowerTranscript.includes('fix')) tags.push('bug-fix');
    if (lowerTranscript.includes('feature')) tags.push('feature');
    if (lowerTranscript.includes('meeting')) tags.push('meeting');
    if (lowerTranscript.includes('review')) tags.push('review');
    
    return tags;
  }
  
  // Helper method to extract form data based on intent type
  private static extractFormData(transcript: string, intentType: string): Record<string, any> {
    switch (intentType) {
      case 'create_channel':
        return this.extractChannelParameters(transcript);
      case 'create_task':
        return this.extractTaskParameters(transcript);
      default:
        return {};
    }
  }
  
  // Helper method to generate suggestions based on extracted data
  private static generateSuggestions(intent: any, formData: any): string[] {
    const suggestions: string[] = [];
    
    if (intent.type === 'create_channel') {
      if (!formData.name || formData.name === 'New Channel') {
        suggestions.push('Consider specifying a more descriptive channel name');
      }
      if (!formData.members || formData.members.length === 0) {
        suggestions.push('Add team members to the channel');
      }
      if (formData.members && formData.members.length > 0) {
        suggestions.push(`Detected members: ${formData.members.join(', ')}`);
      }
    }
    
    if (intent.type === 'create_task') {
      if (!formData.title || formData.title === 'New Task') {
        suggestions.push('Consider providing a more specific task title');
      }
      if (!formData.assignees || formData.assignees.length === 0) {
        suggestions.push('Assign the task to team members');
      }
      if (!formData.dueDate) {
        suggestions.push('Consider setting a due date');
      }
      if (formData.priority === 'urgent') {
        suggestions.push('⚡ High priority task detected');
      }
    }
    
    return suggestions;
  }

  private static generateActions(intent: any) {
    switch (intent.type) {
      case 'create_channel':
        return [
          'Create channel with specified parameters',
          'Add members to channel',
          'Set up project breakdown',
          'Send notifications to members',
        ];
      case 'assign_task':
        return [
          'Create task',
          'Assign to team member',
          'Set priority and due date',
          'Send notification',
        ];
      case 'schedule_meeting':
        return [
          'Create meeting event',
          'Add attendees',
          'Send calendar invites',
          'Set reminders',
        ];
      default:
        return ['Process general command'];
    }
  }
}