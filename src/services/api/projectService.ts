import { Project, Channel, Task, ProjectMember } from '../../types/project';
import { User } from '../../types/auth';

export class ProjectService {
  private static mockUsers: User[] = [
    { id: '1', fullName: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: '2', fullName: 'Jane Smith', email: 'jane@example.com', role: 'designer' },
    { id: '3', fullName: 'Mike Johnson', email: 'mike@example.com', role: 'engineer' },
    { id: '4', fullName: 'Sarah Wilson', email: 'sarah@example.com', role: 'pm' },
  ];

  static async createChannel(channelData: {
    title: string;
    description: string;
    category: string;
    members: string[];
  }): Promise<Channel> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const channel: Channel = {
        id: Date.now().toString(),
        title: channelData.title,
        description: channelData.description,
        category: channelData.category,
        members: this.getMembersByRole(channelData.members),
        projectId: Date.now().toString(),
        createdAt: new Date(),
      };

      // Send notifications to members
      await this.sendChannelNotifications(channel);
      
      return channel;
    } catch (error) {
      throw new Error('Failed to create channel');
    }
  }

  static async createProject(projectData: {
    name: string;
    description: string;
    category: string;
    members: string[];
  }): Promise<Project> {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const project: Project = {
        id: Date.now().toString(),
        name: projectData.name,
        description: projectData.description,
        category: projectData.category,
        members: this.createProjectMembers(projectData.members),
        tasks: await this.generateProjectTasks(projectData.name),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'planning',
      };

      return project;
    } catch (error) {
      throw new Error('Failed to create project');
    }
  }

  static async assignTask(taskData: {
    title: string;
    description: string;
    assigneeId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: Date;
  }): Promise<Task> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const assignee = this.mockUsers.find(user => user.id === taskData.assigneeId);
      if (!assignee) {
        throw new Error('Assignee not found');
      }

      const task: Task = {
        id: Date.now().toString(),
        title: taskData.title,
        description: taskData.description,
        assignee,
        priority: taskData.priority,
        status: 'todo',
        dueDate: taskData.dueDate,
        createdAt: new Date(),
      };

      // Send notification to assignee
      await this.sendTaskNotification(task);

      return task;
    } catch (error) {
      throw new Error('Failed to assign task');
    }
  }

  private static getMembersByRole(roles: string[]): User[] {
    const roleMapping: Record<string, User> = {
      'Lead Designer': this.mockUsers[1],
      'Engineering Lead': this.mockUsers[2],
      'PM': this.mockUsers[3],
      'Myself': this.mockUsers[0],
    };

    return roles.map(role => roleMapping[role]).filter(Boolean);
  }

  private static createProjectMembers(roles: string[]): ProjectMember[] {
    const members = this.getMembersByRole(roles);
    
    return members.map((user, index) => ({
      id: `member_${user.id}`,
      user,
      role: index === 0 ? 'lead' : 'member',
      joinedAt: new Date(),
    }));
  }

  private static async generateProjectTasks(projectName: string): Promise<Task[]> {
    const taskTemplates = [
      'UI/UX Design Phase',
      'Frontend Development',
      'Backend API Development',
      'Database Setup',
      'Testing & QA',
      'Deployment Setup',
    ];

    return taskTemplates.map((title, index) => ({
      id: `task_${Date.now()}_${index}`,
      title,
      description: `${title} for ${projectName}`,
      assignee: this.mockUsers[index % this.mockUsers.length],
      priority: index < 2 ? 'high' : 'medium' as const,
      status: 'todo' as const,
      dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }));
  }

  private static async sendChannelNotifications(channel: Channel): Promise<void> {
    try {
      const notifications = channel.members.map(member => ({
        userId: member.id,
        title: 'New Channel Created',
        message: `You've been added to ${channel.title}`,
        type: 'channel_invitation',
        channelId: channel.id,
      }));

      // Simulate sending notifications
      await Promise.all(
        notifications.map(notification => 
          new Promise(resolve => setTimeout(resolve, 500))
        )
      );

      console.log('Channel notifications sent:', notifications);
    } catch (error) {
      console.error('Failed to send channel notifications:', error);
    }
  }

  private static async sendTaskNotification(task: Task): Promise<void> {
    try {
      const notification = {
        userId: task.assignee.id,
        title: 'New Task Assigned',
        message: `You've been assigned: ${task.title}`,
        type: 'task_assignment',
        taskId: task.id,
      };

      // Simulate sending notification
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Task notification sent:', notification);
    } catch (error) {
      console.error('Failed to send task notification:', error);
    }
  }

  static async scheduleMeeting(meetingData: {
    title: string;
    attendees: string[];
    startTime: Date;
    duration: number; // in minutes
    description?: string;
  }): Promise<any> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const meeting = {
        id: Date.now().toString(),
        title: meetingData.title,
        attendees: this.getMembersByRole(meetingData.attendees),
        startTime: meetingData.startTime,
        endTime: new Date(meetingData.startTime.getTime() + meetingData.duration * 60000),
        description: meetingData.description || '',
        createdAt: new Date(),
      };

      // Send calendar invites
      await this.sendMeetingInvites(meeting);

      return meeting;
    } catch (error) {
      throw new Error('Failed to schedule meeting');
    }
  }

  private static async sendMeetingInvites(meeting: any): Promise<void> {
    try {
      const invites = meeting.attendees.map((attendee: User) => ({
        userId: attendee.id,
        title: 'Meeting Invitation',
        message: `You're invited to: ${meeting.title}`,
        type: 'meeting_invitation',
        meetingId: meeting.id,
      }));

      await Promise.all(
        invites.map((invite: any) => 
          new Promise(resolve => setTimeout(resolve, 300))
        )
      );

      console.log('Meeting invites sent:', invites);
    } catch (error) {
      console.error('Failed to send meeting invites:', error);
    }
  }
}