import { chatGPTService } from './chatGPTService';
import { taskService } from './api/taskService';
import { channelService } from './api/channelService';
import { announcementService, CreateAnnouncementData } from './api/announcementService';

export interface AIBotResponse {
  success: boolean;
  response: string;
  action?: {
    type: 'create_announcement' | 'navigate' | 'show_data' | 'none';
    data?: any;
  };
  confidence: number;
}

export interface UserRole {
  role: 'ceo' | 'admin' | 'user' | 'developer' | 'designer' | 'manager';
  userId: string;
  name: string;
}

class HomeAIBotService {
  async processUserQuery(query: string, userRole: UserRole): Promise<AIBotResponse> {
    try {
      console.log('🤖 HomeAIBot: Processing query from', userRole.role, ':', query);
      
      // Get relevant data based on user role
      const contextData = await this.gatherContextData(userRole);
      console.log('🤖 HomeAIBot: Context data gathered:', Object.keys(contextData));
      
      const prompt = this.buildPrompt(query, userRole, contextData);
      console.log('🤖 HomeAIBot: Sending prompt to ChatGPT...');
      
      const response = await chatGPTService.chat(prompt, {
        temperature: 0.7,
        maxTokens: 1500
      });
      
      console.log('🤖 HomeAIBot: Received response:', response.substring(0, 200) + '...');
      
      // Parse the JSON response
      let result: AIBotResponse;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        console.error('🤖 HomeAIBot: Failed to parse JSON response:', parseError);
        console.error('🤖 Raw response:', response);
        
        // Fallback: create a response from the raw text
        result = {
          success: true,
          response: response,
          confidence: 0.8,
          action: { type: 'none', data: {} }
        };
      }
      
      // Validate response structure
      if (!result.response) {
        result.response = 'I processed your request but couldn\'t generate a proper response. Please try rephrasing your question.';
      }
      
      // Ensure action object exists
      if (!result.action) {
        result.action = { type: 'none', data: {} };
      }
      
      // Handle special actions
      if (result.action?.type === 'create_announcement' && userRole.role === 'ceo') {
        try {
          console.log('🤖 HomeAIBot: Creating announcement...', result.action.data);
          const announcementData = result.action.data as CreateAnnouncementData;
          const announcement = await announcementService.createAnnouncement(announcementData);
          result.response += `\n\n✅ Announcement "${announcement.data?.title || announcement.title}" has been created successfully!`;
          console.log('🤖 HomeAIBot: Announcement created successfully');
        } catch (error) {
          console.error('🤖 HomeAIBot: Failed to create announcement:', error);
          result.response += `\n\n❌ Failed to create announcement: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
      
      console.log('🤖 HomeAIBot: Final response prepared');
      return result;
    } catch (error) {
      console.error('🤖 HomeAIBot: Processing error:', error);
      
      if (error instanceof Error && error.message.includes('API key')) {
        return {
          success: false,
          response: 'I\'m having trouble connecting to my AI services. Please check that the OpenAI API key is properly configured.',
          confidence: 0,
        };
      }
      
      return {
        success: false,
        response: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the problem persists.',
        confidence: 0,
      };
    }
  }

  private async gatherContextData(userRole: UserRole) {
    const data: any = {
      user: userRole,
      timestamp: new Date().toISOString(),
      currentTime: new Date().toLocaleString(),
    };

    try {
      console.log('🤖 HomeAIBot: Gathering context data for role:', userRole.role);

      // Regular user data
      if (userRole.role !== 'ceo') {
        console.log('📝 Gathering user-specific task data...');
        // Get user's tasks
        const userTasks = await taskService.getTasks({ 
          assigned_to: userRole.userId, // Backend expects single UUID string, not array
          limit: 200 
        });
        
        console.log('📝 User tasks retrieved:', userTasks.data?.length || 0);
        
        if (userTasks.success && userTasks.data) {
          data.userTasks = {
            total: userTasks.data.length,
            pending: userTasks.data.filter(task => task.status === 'pending').length,
            in_progress: userTasks.data.filter(task => task.status === 'in_progress').length,
            completed: userTasks.data.filter(task => task.status === 'completed').length,
            urgent: userTasks.data.filter(task => task.priority === 'urgent').length,
            high_priority: userTasks.data.filter(task => task.priority === 'high').length,
            due_today: userTasks.data.filter(task => {
              if (!task.due_date) return false;
              const dueDate = new Date(task.due_date);
              const today = new Date();
              return dueDate.toDateString() === today.toDateString();
            }).length,
            overdue: userTasks.data.filter(task => {
              if (!task.due_date) return false;
              const dueDate = new Date(task.due_date);
              return dueDate < new Date() && task.status !== 'completed';
            }).length,
            recent_tasks: userTasks.data.slice(0, 5).map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
              description: task.description?.substring(0, 100)
            }))
          };
        } else {
          data.userTasks = { total: 0, pending: 0, in_progress: 0, completed: 0, urgent: 0, high_priority: 0, due_today: 0, overdue: 0, recent_tasks: [] };
        }

        // Get user's channels
        try {
          const userChannels = await channelService.getChannelsWithStats();
          // getChannelsWithStats returns an array directly, not a response object
          if (userChannels && userChannels.length >= 0) {
            data.userChannels = {
              total: userChannels.length,
              active: userChannels.filter(channel => channel.status === 'active').length,
              channels: userChannels.slice(0, 5).map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.channel_type,
                member_count: channel.member_count || 0,
                message_count: channel.messageCount || 0
              }))
            };
          } else {
            data.userChannels = { total: 0, active: 0, channels: [] };
          }
        } catch (error) {
          console.error('Error fetching user channels:', error);
          data.userChannels = { total: 0, active: 0, channels: [] };
        }
      }

      // CEO/Admin data - comprehensive overview
      if (userRole.role === 'ceo' || userRole.role === 'admin') {
        console.log('👑 Gathering CEO/Admin organization-wide data...');
        
        // Get all tasks stats
        const allTasks = await taskService.getTasks({ limit: 1000 });
        console.log('👑 Organization tasks retrieved:', allTasks.data?.length || 0);
        
        if (allTasks.success && allTasks.data) {
          data.organizationTasks = {
            total: allTasks.data.length,
            pending: allTasks.data.filter(task => task.status === 'pending').length,
            in_progress: allTasks.data.filter(task => task.status === 'in_progress').length,
            completed: allTasks.data.filter(task => task.status === 'completed').length,
            urgent: allTasks.data.filter(task => task.priority === 'urgent').length,
            high_priority: allTasks.data.filter(task => task.priority === 'high').length,
            overdue: allTasks.data.filter(task => {
              if (!task.due_date) return false;
              const dueDate = new Date(task.due_date);
              return dueDate < new Date() && task.status !== 'completed';
            }).length,
            recent_tasks: allTasks.data.slice(0, 10).map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
              assigned_to: task.assigned_to,
              created_by: task.created_by,
              created_at: task.created_at
            }))
          };

          // Task completion by user (for CEO queries about team performance)
          const userPerformance: Record<string, any> = {};
          const userTaskCounts: Record<string, { name?: string; total: number; completed: number; pending: number; in_progress: number; overdue: number; urgent: number; high_priority: number; completion_rate: number }> = {};
          
          allTasks.data.forEach(task => {
            task.assigned_to.forEach(userId => {
              if (!userTaskCounts[userId]) {
                userTaskCounts[userId] = {
                  total: 0,
                  completed: 0,
                  pending: 0,
                  in_progress: 0,
                  overdue: 0,
                  urgent: 0,
                  high_priority: 0,
                  completion_rate: 0
                };
              }
              
              userTaskCounts[userId].total++;
              if (task.status === 'completed') userTaskCounts[userId].completed++;
              if (task.status === 'pending') userTaskCounts[userId].pending++;
              if (task.status === 'in_progress') userTaskCounts[userId].in_progress++;
              if (task.priority === 'urgent') userTaskCounts[userId].urgent++;
              if (task.priority === 'high') userTaskCounts[userId].high_priority++;
              if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed') {
                userTaskCounts[userId].overdue++;
              }
            });
          });

          // Calculate completion rates
          Object.keys(userTaskCounts).forEach(userId => {
            const user = userTaskCounts[userId];
            user.completion_rate = user.total > 0 ? Math.round((user.completed / user.total) * 100) : 0;
          });

          data.teamPerformance = userTaskCounts;
        } else {
          data.organizationTasks = { total: 0, pending: 0, in_progress: 0, completed: 0, urgent: 0, high_priority: 0, overdue: 0, recent_tasks: [] };
          data.teamPerformance = {};
        }

        // Get all channels stats
        try {
          const allChannels = await channelService.getChannelsWithStats();
          console.log('👑 Organization channels retrieved:', allChannels?.length || 0);
          
          // getChannelsWithStats returns an array directly, not a response object
          if (allChannels && allChannels.length >= 0) {
            data.organizationChannels = {
              total: allChannels.length,
              active: allChannels.filter(channel => channel.status === 'active').length,
              public: allChannels.filter(channel => channel.privacy_level === 'public').length,
              private: allChannels.filter(channel => channel.privacy_level === 'private').length,
              channels: allChannels.slice(0, 10).map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.channel_type,
                privacy: channel.privacy_level,
                member_count: channel.member_count || 0,
                message_count: channel.messageCount || 0,
                created_at: channel.created_at
              }))
            };
          } else {
            data.organizationChannels = { total: 0, active: 0, public: 0, private: 0, channels: [] };
          }
        } catch (error) {
          console.error('Error fetching organization channels:', error);
          data.organizationChannels = { total: 0, active: 0, public: 0, private: 0, channels: [] };
        }
      }

      // Get announcements for CEO
      if (userRole.role === 'ceo') {
        try {
          console.log('📢 Gathering announcement data...');
          const announcementStats = await announcementService.getStats();
          if (announcementStats.success) {
            data.announcements = announcementStats.data;
          } else {
            data.announcements = { total: 0, published: 0, active: 0, scheduled: 0, expired: 0, recent: [] };
          }
        } catch (error) {
          console.error('Error fetching announcement data:', error);
          data.announcements = { total: 0, published: 0, active: 0, scheduled: 0, expired: 0, recent: [] };
        }
      }

    } catch (error) {
      console.error('Error gathering context data:', error);
      // Continue with partial data
    }

    return data;
  }

  private buildPrompt(query: string, userRole: UserRole, contextData: any): string {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `
You are TT, an intelligent AI assistant for a project management platform. You are helpful, professional, and provide actionable insights.
Respond to the user's query based on their role and the available real-time data.

CONTEXT:
- Current Date/Time: ${currentDate} ${currentTime}
- User Query: "${query}"
- User Role: ${userRole.role}
- User Name: ${userRole.name}
- User ID: ${userRole.userId}

AVAILABLE REAL-TIME DATA:
${JSON.stringify(contextData, null, 2)}

CRITICAL: Always use the actual data provided above. Do not make up numbers or information. If data is missing or zero, acknowledge it honestly.

RESPONSE FORMAT - You MUST respond in valid JSON format:
{
  "success": true,
  "response": "Your helpful, natural language response here",
  "action": {
    "type": "create_announcement|navigate|show_data|none",
    "data": {}
  },
  "confidence": 0.95
}

CAPABILITIES BY ROLE:

REGULAR USER CAPABILITIES:
- Answer questions about their own tasks (pending, completed, urgent, due dates)
- Provide task summaries and priorities from userTasks data
- Answer questions about their channels from userChannels data
- Give productivity tips based on their current workload
- Help with task management and prioritization
- Provide insights about their recent tasks

CEO CAPABILITIES (all above plus):
- Answer questions about ALL tasks using organizationTasks data
- Analyze team performance using teamPerformance data with completion rates
- Identify who has completed/not completed tasks with specific user IDs
- Provide organization-wide insights using organizationChannels data
- CREATE ANNOUNCEMENTS when explicitly requested
- Answer questions about announcement statistics
- Provide detailed team productivity analysis with specific metrics
- Access to recent_tasks and channels for detailed insights

ADMIN CAPABILITIES:
- Similar to CEO but cannot create announcements
- Can view organization-wide data (organizationTasks, organizationChannels, teamPerformance)
- Can provide team insights and performance analysis

ANNOUNCEMENT CREATION (CEO ONLY):
When the user explicitly asks to create an announcement, respond with:
- action.type: "create_announcement"
- action.data: {
    title: "Clear, descriptive title",
    content: "Detailed announcement content", 
    type: "info|warning|success|error|feature|maintenance",
    priority: "low|medium|high|critical",
    target_audience: "all|admins|developers|designers|managers",
    published: true
  }

EXAMPLE QUERY RESPONSES:

User: "How many pending tasks do I have?"
CEO Response: "You currently have [userTasks.pending] pending tasks. [userTasks.urgent] of them are urgent priority and [userTasks.due_today] are due today."

CEO: "Who has the most pending tasks?"
Response: Analyze teamPerformance data to find users with highest pending counts and provide specific user IDs.

CEO: "Create announcement about system maintenance"
Response: Set action.type to "create_announcement" with appropriate maintenance announcement data.

CEO: "Which team members have completion rates below 50%?"
Response: Analyze teamPerformance data for completion_rate values and list specific users with low rates.

User: "What urgent tasks do I have?"
Response: Use userTasks.recent_tasks to list urgent priority tasks with titles and due dates.

CEO: "Give me an overview of all tasks"
Response: Use organizationTasks data to provide comprehensive statistics.

RESPONSE GUIDELINES:
- ALWAYS use actual data from contextData - never make up numbers
- Be specific with user IDs and task counts from the data
- Reference exact field names (userTasks.pending, teamPerformance, etc.)
- For CEO, prioritize organizationTasks and teamPerformance insights
- For regular users, focus on userTasks and userChannels data
- If asked about users/team members, reference the actual user IDs in teamPerformance
- Include actionable insights and next steps when appropriate
- Be conversational but data-driven
`;
  }
}

export const homeAIBotService = new HomeAIBotService();