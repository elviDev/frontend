/**
 * Debug utility for testing AI Bot functionality
 * Use this to test the AI bot without the UI
 */

import { homeAIBotService, UserRole } from './homeAIBotService';

export class AIBotDebugger {
  
  // Test regular user queries
  static async testUserQueries() {
    const userRole: UserRole = {
      role: 'user',
      userId: 'test-user-123',
      name: 'Test User'
    };

    const queries = [
      'How many pending tasks do I have?',
      'What urgent tasks do I have?',
      'Show me my tasks due today',
      'How am I doing with my tasks this week?'
    ];

    console.log('🧪 Testing USER queries...');
    
    for (const query of queries) {
      try {
        console.log(`\n🔍 Query: "${query}"`);
        const response = await homeAIBotService.processUserQuery(query, userRole);
        console.log('✅ Response:', response.response);
        console.log('📊 Success:', response.success);
        console.log('🎯 Confidence:', response.confidence);
      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
  }

  // Test CEO queries
  static async testCEOQueries() {
    const ceoRole: UserRole = {
      role: 'ceo',
      userId: 'ceo-123',
      name: 'CEO Test'
    };

    const queries = [
      'Give me an overview of all tasks in the organization',
      'Who has the most pending tasks?',
      'Which team members have completion rates below 50%?',
      'What urgent tasks need attention across the organization?',
      'How is the team performing overall?',
      'Create an announcement about the weekly team meeting on Friday'
    ];

    console.log('🧪 Testing CEO queries...');
    
    for (const query of queries) {
      try {
        console.log(`\n🔍 Query: "${query}"`);
        const response = await homeAIBotService.processUserQuery(query, ceoRole);
        console.log('✅ Response:', response.response);
        console.log('📊 Success:', response.success);
        console.log('🎯 Confidence:', response.confidence);
        if (response.action?.type) {
          console.log('🎬 Action:', response.action.type);
        }
      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
  }

  // Test data gathering
  static async testDataGathering() {
    const userRole: UserRole = {
      role: 'ceo',
      userId: 'test-ceo',
      name: 'Test CEO'
    };

    console.log('🧪 Testing data gathering...');
    
    try {
      // Use reflection to access private method
      const service = homeAIBotService as any;
      const contextData = await service.gatherContextData(userRole);
      
      console.log('📊 Context data keys:', Object.keys(contextData));
      console.log('👤 User data:', contextData.user);
      
      if (contextData.organizationTasks) {
        console.log('📋 Organization tasks:', {
          total: contextData.organizationTasks.total,
          pending: contextData.organizationTasks.pending,
          completed: contextData.organizationTasks.completed
        });
      }
      
      if (contextData.teamPerformance) {
        console.log('👥 Team performance users:', Object.keys(contextData.teamPerformance).length);
      }
      
      if (contextData.organizationChannels) {
        console.log('💬 Organization channels:', {
          total: contextData.organizationChannels.total,
          active: contextData.organizationChannels.active
        });
      }
      
    } catch (error) {
      console.error('❌ Data gathering error:', error);
    }
  }

  // Run all tests
  static async runAllTests() {
    console.log('🚀 Starting AI Bot Debug Tests...\n');
    
    await this.testDataGathering();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await this.testUserQueries();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await this.testCEOQueries();
    console.log('\n✅ All tests completed!');
  }
}

// Make it available globally for console testing
(global as any).AIBotDebugger = AIBotDebugger;

console.log('🧪 AI Bot Debugger loaded! Use AIBotDebugger.runAllTests() to test the bot.');