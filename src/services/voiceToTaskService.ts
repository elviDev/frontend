import { chatGPTService } from './chatGPTService';

export interface VoiceToTaskResult {
  success: boolean;
  confidence: number;
  reasoning: string;
  formData?: {
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: 'general' | 'development' | 'design' | 'marketing' | 'sales' | 'finance' | 'hr' | 'operations';
    estimatedHours?: string;
    tags?: string[];
    features?: string[];
    deliverables?: Array<{
      title: string;
      description: string;
    }>;
    successCriteria?: Array<{
      criteria: string;
    }>;
    assigneeNames?: string[];
    startDate?: Date;
    endDate?: Date;
    documentLinks?: string[];
  };
}

class VoiceToTaskService {
  async processTaskCreation(voiceTranscript: string): Promise<VoiceToTaskResult> {
    try {
      const prompt = `
You are an AI assistant that converts voice commands into structured task creation data. 
Analyze the following voice transcript and INTELLIGENTLY break down what the user wants into actionable deliverables and measurable success criteria.

Voice transcript: "${voiceTranscript}"

IMPORTANT: You must INTELLIGENTLY INFER deliverables and success criteria from what the user describes, even if they don't explicitly mention them. Think about what concrete outputs and measurable outcomes would be needed to complete this task successfully.

Extract the following information and respond in JSON format:
{
  "success": boolean,
  "confidence": number (0-1),
  "reasoning": "explain what you understood, how you broke down the task, and your decision process",
  "formData": {
    "title": "short, clear task title",
    "description": "detailed description of what needs to be done and why",
    "priority": "low|medium|high|urgent",
    "category": "general|development|design|marketing|sales|finance|hr|operations",
    "estimatedHours": "realistic estimated hours as string or empty",
    "tags": ["relevant", "tags", "based", "on", "context"],
    "features": ["specific features/components mentioned or implied"],
    "deliverables": [{"title": "specific deliverable name", "description": "exactly what needs to be created/completed"}],
    "successCriteria": [{"criteria": "specific, measurable way to know this task is done successfully"}],
    "assigneeNames": ["person names mentioned"],
    "startDate": "ISO date or null",
    "endDate": "ISO date or null", 
    "documentLinks": ["any URLs or document references mentioned"]
  }
}

DELIVERABLES EXAMPLES - Break down what the user says into concrete outputs:
- "redesign login page" → deliverable: "Updated login page design" + "Design mockups" + "CSS implementation"
- "build authentication" → deliverable: "User registration system" + "Login/logout functionality" + "Password reset feature"
- "review budget" → deliverable: "Budget analysis report" + "Updated budget spreadsheet" + "Recommendations document"
- "setup CI/CD" → deliverable: "Build pipeline configuration" + "Deployment scripts" + "Testing automation"

SUCCESS CRITERIA EXAMPLES - Define how to measure completion:
- "redesign login page" → criteria: "Page loads in under 2 seconds" + "Mobile responsive design" + "Passes accessibility tests"
- "build authentication" → criteria: "Users can register and login" + "Password reset emails work" + "Session management secure"
- "review budget" → criteria: "All expenses categorized" + "Variance analysis complete" + "Management approval obtained"
- "setup CI/CD" → criteria: "Automated tests pass" + "Deployment successful" + "Rollback mechanism works"

Guidelines:
- ALWAYS create 2-4 specific deliverables based on what the user describes
- ALWAYS create 2-4 measurable success criteria that define "done"
- Be intelligent about inferring missing information
- Extract names of people mentioned for assignment
- Identify task type from context (development, design, etc.)
- Convert relative dates (tomorrow, next week, Friday) to actual dates
- Infer priority from urgency words (urgent, asap, important, etc.)
- Add relevant tags based on context and task type
- Estimate hours based on task complexity (simple: 2-8h, medium: 8-24h, complex: 24-80h)
- Provide confidence score based on clarity of the request
- If the voice input doesn't clearly describe a task, set success to false

Current date: ${new Date().toISOString()}

Enhanced Examples:
"Create task to redesign the login page assign to Sarah high priority due Friday"
→ deliverables: [{"title": "Login page wireframes", "description": "Create low and high fidelity wireframes for new login design"}, {"title": "Visual design mockups", "description": "Design polished mockups with branding and styling"}, {"title": "Responsive implementation", "description": "Code the new login page with mobile responsiveness"}]
→ successCriteria: [{"criteria": "Page loads in under 2 seconds on mobile and desktop"}, {"criteria": "Design passes accessibility audit (WCAG 2.1)"}, {"criteria": "User testing shows 90%+ task completion rate"}]

"Build user authentication feature with login logout and password reset for the mobile app"
→ deliverables: [{"title": "User registration system", "description": "API endpoints and UI for new user signup"}, {"title": "Login/logout functionality", "description": "Secure authentication flow with session management"}, {"title": "Password reset feature", "description": "Email-based password reset with security tokens"}]
→ successCriteria: [{"criteria": "New users can successfully create accounts"}, {"criteria": "Users can login and logout securely"}, {"criteria": "Password reset emails are delivered and functional"}, {"criteria": "All authentication endpoints pass security testing"}]

"I need someone to review the budget report and update it by tomorrow urgent"
→ deliverables: [{"title": "Budget analysis review", "description": "Comprehensive review of current budget allocations and spending"}, {"title": "Updated budget spreadsheet", "description": "Revised budget with corrected figures and new projections"}, {"title": "Summary report", "description": "Executive summary of changes and recommendations"}]
→ successCriteria: [{"criteria": "All budget line items verified for accuracy"}, {"criteria": "Variance analysis completed for each department"}, {"criteria": "Updated projections approved by finance manager"}]
`;

      const response = await chatGPTService.chat(prompt);
      
      // Parse the JSON response
      const result = JSON.parse(response);
      
      // Convert date strings to Date objects if they exist
      if (result.formData?.startDate) {
        result.formData.startDate = new Date(result.formData.startDate);
      }
      if (result.formData?.endDate) {
        result.formData.endDate = new Date(result.formData.endDate);
      }
      
      return result;
    } catch (error) {
      console.error('Voice to task processing failed:', error);
      return {
        success: false,
        confidence: 0,
        reasoning: 'Failed to process voice input. Please try speaking more clearly or check your connection.',
      };
    }
  }

  // Helper method to process relative dates mentioned in voice
  private processRelativeDate(dateString: string): Date | null {
    const today = new Date();
    const lowerDate = dateString.toLowerCase();
    
    if (lowerDate.includes('today')) {
      return today;
    }
    
    if (lowerDate.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }
    
    // Handle day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const day of days) {
      if (lowerDate.includes(day)) {
        const targetDay = days.indexOf(day);
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next week if day has passed
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntil);
        return targetDate;
      }
    }
    
    if (lowerDate.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek;
    }
    
    if (lowerDate.includes('end of week')) {
      const endOfWeek = new Date(today);
      const daysUntilFriday = 5 - today.getDay();
      endOfWeek.setDate(today.getDate() + (daysUntilFriday > 0 ? daysUntilFriday : 7));
      return endOfWeek;
    }
    
    return null;
  }
}

export const voiceToTaskService = new VoiceToTaskService();