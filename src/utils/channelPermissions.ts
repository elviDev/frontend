import type { Channel } from '../services/api/channelService';
import type { User } from '../types/auth';

export interface ChannelPermissions {
  canView: boolean;
  canSendMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  canManageMembers: boolean;
  canManageChannel: boolean;
}

/**
 * Check if user can access a channel based on backend authorization logic
 */
export function canUserAccessChannel(channel: Channel, user: User): boolean {
  if (!channel || !user) return false;

  const userRole = user.role;
  const userId = user.id;

  // CEO can access everything
  if (userRole === 'ceo') return true;

  // Check if user is a member
  const isMember = channel.members?.includes(userId) || false;
  
  // Public channels are accessible to all authenticated users
  if (channel.privacy_level === 'public') return true;
  
  // Check if user is a member for private/restricted channels
  if (isMember) return true;
  
  // Restricted channels check auto-join roles
  if (channel.privacy_level === 'restricted') {
    return channel.auto_join_roles?.includes(userRole) || false;
  }
  
  // Private channels require explicit membership
  return false;
}

/**
 * Calculate user permissions for a specific channel using backend authorization logic
 */
export function getChannelPermissions(
  channel: Channel | null,
  user: User | null
): ChannelPermissions {
  // Default permissions (no access)
  const defaultPermissions: ChannelPermissions = {
    canView: false,
    canSendMessages: false,
    canEditMessages: false,
    canDeleteMessages: false,
    canManageMembers: false,
    canManageChannel: false,
  };

  if (!channel || !user) {
    return defaultPermissions;
  }

  const userId = user.id;
  const userRole = user.role;
  
  // Check if user is channel owner
  const isOwner = channel.owned_by === userId || channel.created_by === userId;
  
  // Check if user is channel moderator
  const isModerator = channel.moderators?.includes(userId) || false;
  
  // Check if user is channel member
  const isMember = channel.members?.includes(userId) || false;
  
  // Check user role permissions based on backend schema
  const isCEO = userRole === 'ceo';
  const isManager = userRole === 'manager';

  // Check channel access using backend logic from can_user_access_channel function
  const canAccess = () => {
    // CEO can access everything
    if (isCEO) return true;
    
    // Public channels are accessible to all
    if (channel.privacy_level === 'public') return true;
    
    // Check if user is a member
    if (isMember) return true;
    
    // Restricted channels check auto-join roles or membership
    if (channel.privacy_level === 'restricted') {
      return channel.auto_join_roles?.includes(userRole) || isMember;
    }
    
    // Private channels require membership
    if (channel.privacy_level === 'private') return isMember;
    
    return false;
  };

  if (!canAccess()) {
    return defaultPermissions;
  }

  // CEO has full access to all channels
  if (isCEO) {
    return {
      canView: true,
      canSendMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canManageMembers: true,
      canManageChannel: true,
    };
  }

  // Channel owner has full permissions for their channel
  if (isOwner) {
    return {
      canView: true,
      canSendMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canManageMembers: true,
      canManageChannel: true,
    };
  }

  // Channel moderator permissions
  if (isModerator) {
    return {
      canView: true,
      canSendMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canManageMembers: true,
      canManageChannel: false, // Cannot delete/archive channel
    };
  }

  // Manager role permissions - matches backend middleware authorization
  if (isManager) {
    return {
      canView: true,
      canSendMessages: true,
      canEditMessages: false,
      canDeleteMessages: false,
      canManageMembers: false,
      canManageChannel: false,
    };
  }

  // Regular member permissions
  if (isMember) {
    return {
      canView: true,
      canSendMessages: true,
      canEditMessages: false, // Can only edit own messages (handled separately)
      canDeleteMessages: false, // Can only delete own messages (handled separately)
      canManageMembers: false,
      canManageChannel: false,
    };
  }

  // Public channel viewing for non-members
  if (channel.privacy_level === 'public') {
    return {
      canView: true,
      canSendMessages: false, // Must be member to send messages
      canEditMessages: false,
      canDeleteMessages: false,
      canManageMembers: false,
      canManageChannel: false,
    };
  }

  // No access for private/restricted channels if not member
  return defaultPermissions;
}

/**
 * Check if user can send messages in a channel
 */
export function canSendMessage(channel: Channel | null, user: User | null): boolean {
  const permissions = getChannelPermissions(channel, user);
  return permissions.canSendMessages;
}

/**
 * Check if user can view a channel
 */
export function canViewChannel(channel: Channel | null, user: User | null): boolean {
  const permissions = getChannelPermissions(channel, user);
  return permissions.canView;
}

/**
 * Check if user can manage channel members
 */
export function canManageMembers(channel: Channel | null, user: User | null): boolean {
  const permissions = getChannelPermissions(channel, user);
  return permissions.canManageMembers;
}

/**
 * Get user-friendly reason why message cannot be sent
 */
export function getMessageSendDeniedReason(
  channel: Channel | null,
  user: User | null
): string {
  if (!channel || !user) {
    return 'Unable to verify channel permissions';
  }

  const permissions = getChannelPermissions(channel, user);
  
  if (permissions.canSendMessages) {
    return ''; // No error - user can send messages
  }

  const userRole = user.role;
  const isMember = channel.members?.includes(user.id) || false;

  if (channel.privacy_level === 'private' && !isMember) {
    return 'You must be a member of this private channel to send messages';
  }

  if (channel.privacy_level === 'restricted' && !isMember && userRole !== 'manager' && userRole !== 'ceo') {
    return 'This channel is restricted. Contact an administrator for access';
  }

  if (channel.privacy_level === 'public' && !isMember) {
    return 'You must be a member to send messages. Contact the CEO to be added to this channel';
  }

  return 'You do not have permission to send messages in this channel';
}