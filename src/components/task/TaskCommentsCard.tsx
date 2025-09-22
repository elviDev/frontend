import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Animated, { 
  FadeInUp, 
  useAnimatedStyle, 
  useSharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskComment, TaskAssignee } from '../../types/task.types';
import { Avatar } from '../common/Avatar';
import { PromptInput } from '../voice/PromptInput';
import { ActionSheet } from '../common/ActionSheet';

interface TaskCommentsCardProps {
  comments: TaskComment[];
  newComment: string;
  onNewCommentChange: (text: string) => void;
  onAddComment: (content?: string) => void;
  onEditComment: (commentId: string, newContent: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReactToComment: (commentId: string, reaction: 'thumbs_up' | 'thumbs_down') => Promise<void>;
  formatTimeAgo: (date: Date) => string;
  commentInputScale?: any;
  onAuthorPress?: (authorId: string) => void;
  currentUserId: string;
  currentUserRole?: string;
  canComment: boolean;
  taskAssignees: TaskAssignee[]; // For mention functionality
  isAddingComment?: boolean;
  reactionLoadingStates?: {
    [commentId: string]: {
      thumbs_up?: boolean;
      thumbs_down?: boolean;
    };
  };
  commentLoadingStates?: {
    [commentId: string]: {
      editing?: boolean;
      deleting?: boolean;
    };
  };
}

export const TaskCommentsCard: React.FC<TaskCommentsCardProps> = ({
  comments,
  newComment,
  onNewCommentChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactToComment,
  formatTimeAgo,
  commentInputScale,
  onAuthorPress,
  currentUserId,
  currentUserRole,
  canComment,
  taskAssignees,
  isAddingComment = false,
  reactionLoadingStates = {},
  commentLoadingStates = {},
}) => {
  console.log('🔧 TaskCommentsCard props received:', {
    commentsCount: comments?.length || 0,
    commentsExist: !!comments,
    firstCommentPreview: comments?.[0] ? {
      id: comments[0].id,
      content: comments[0].content?.substring(0, 20),
      hasAuthor: !!comments[0].author
    } : null,
    currentUserId,
    canComment
  });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showCommentActionSheet, setShowCommentActionSheet] = useState(false);
  const [selectedComment, setSelectedComment] = useState<TaskComment | null>(null);

  const animatedCommentInputStyle = useAnimatedStyle(() => ({
    transform: commentInputScale ? [{ scale: commentInputScale.value }] : [],
  }));

  const canEditOrDelete = (comment: TaskComment) => {
    console.log('🔧 Full comment edit permission debug:', {
      commentId: comment.id,
      commentAuthor: comment.author,
      commentAuthorId: comment.author?.id,
      commentAuthorIdType: typeof comment.author?.id,
      currentUserId,
      currentUserIdType: typeof currentUserId,
      currentUserRole,
      areIdsEqual: comment.author?.id === currentUserId,
      strictEqual: comment.author?.id === currentUserId,
      looseEqual: comment.author?.id == currentUserId
    });
    
    // CEO can edit/delete any comment
    if (currentUserRole?.toLowerCase() === 'ceo') {
      console.log('🔧 User is CEO, can edit/delete all comments');
      return true;
    }
    
    // Users can edit/delete their own comments
    const canEdit = comment.author?.id === currentUserId;
    console.log('🔧 Final edit permission result:', canEdit);
    
    return canEdit;
  };

  const handleEditStart = (comment: TaskComment) => {
    console.log('🔧 Starting to edit comment:', {
      commentId: comment.id,
      content: comment.content.substring(0, 50) + '...'
    });
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const handleEditSave = (commentId: string, content?: string) => {
    const finalContent = content || editingText;
    if (finalContent.trim()) {
      onEditComment(commentId, finalContent.trim());
      setEditingCommentId(null);
      setEditingText('');
    }
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleDelete = (commentId: string) => {
    console.log('🔧 Attempting to delete comment:', commentId);
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('🔧 User confirmed delete for comment:', commentId);
            onDeleteComment(commentId);
          }
        }
      ]
    );
  };

  const handleCommentOptions = (comment: TaskComment) => {
    console.log('🔧 Opening comment options for:', comment.id);
    setSelectedComment(comment);
    setShowCommentActionSheet(true);
  };

  const getCommentActionSheetOptions = () => {
    if (!selectedComment) return [];

    const options: Array<{
      text: string;
      icon: string;
      iconLibrary: 'material' | 'ionicon';
      style?: 'default' | 'destructive' | 'cancel';
      onPress: () => void;
    }> = [];

    // Add edit option
    options.push({
      text: commentLoadingStates[selectedComment.id]?.editing ? 'Editing...' : 'Edit Comment',
      icon: 'edit',
      iconLibrary: 'material',
      style: 'default',
      onPress: () => {
        if (!commentLoadingStates[selectedComment.id]?.editing) {
          setShowCommentActionSheet(false);
          handleEditStart(selectedComment);
        }
      },
    });

    // Add delete option
    options.push({
      text: commentLoadingStates[selectedComment.id]?.deleting ? 'Deleting...' : 'Delete Comment',
      icon: 'delete',
      iconLibrary: 'material',
      style: 'destructive',
      onPress: () => {
        if (!commentLoadingStates[selectedComment.id]?.deleting) {
          setShowCommentActionSheet(false);
          handleDelete(selectedComment.id);
        }
      },
    });

    // Add cancel option
    options.push({
      text: 'Cancel',
      icon: 'close',
      iconLibrary: 'material',
      style: 'cancel',
      onPress: () => {},
    });

    return options;
  };

  const renderCommentContent = (content: string) => {
    if (!content) return null;
    
    // Enhanced regex to match user mentions
    const mentionRegex = /(@\w+)/g;
    const parts = content.split(mentionRegex);
    
    return (
      <Text className="text-gray-700 leading-relaxed">
        {parts
          .filter(part => part && part.trim())
          .map((part, index) => {
            if (part.startsWith('@')) {
              // Find the mentioned user in task assignees
              const username = part.slice(1);
              const mentionedUser = (taskAssignees || []).find(assignee => 
                assignee && assignee.name &&
                (assignee.name.toLowerCase().replace(/\s+/g, '') === username.toLowerCase() ||
                assignee.name.toLowerCase().includes(username.toLowerCase()))
              );
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => mentionedUser && onAuthorPress?.(mentionedUser.id)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={{ 
                    color: '#3B82F6', 
                    fontStyle: 'italic',
                    textDecorationLine: 'underline',
                    fontWeight: '500'
                  }}>
                    {part}
                  </Text>
                </TouchableOpacity>
              );
            }
            return <Text key={index}>{part}</Text>;
          })
        }
      </Text>
    );
  };

  const getReactionCount = (comment: TaskComment, reaction: 'thumbs_up' | 'thumbs_down') => {
    // First try the API response fields
    if (reaction === 'thumbs_up' && comment.up_count !== undefined) {
      return parseInt(comment.up_count) || 0;
    }
    if (reaction === 'thumbs_down' && comment.down_count !== undefined) {
      return parseInt(comment.down_count) || 0;
    }
    
    // Fallback to legacy reactions object
    const count = comment.reactions?.[reaction] || 0;
    console.log('🔧 Getting reaction count:', {
      commentId: comment.id,
      reaction,
      count,
      apiCount: reaction === 'thumbs_up' ? comment.up_count : comment.down_count,
      allReactions: comment.reactions
    });
    return count;
  };

  const hasUserReacted = (comment: TaskComment, reaction: 'thumbs_up' | 'thumbs_down') => {
    // First check the API response field - convert backend format to frontend format
    if (comment.user_reaction !== undefined) {
      // Convert backend format ('up'/'down') to frontend format ('thumbs_up'/'thumbs_down')
      const backendReaction = comment.user_reaction;
      let userReacted = false;
      
      if (backendReaction === 'up' && reaction === 'thumbs_up') {
        userReacted = true;
      } else if (backendReaction === 'down' && reaction === 'thumbs_down') {
        userReacted = true;
      } else if (backendReaction === reaction) {
        // Direct match (for backward compatibility)
        userReacted = true;
      }
      
      console.log('🔧 Checking if user reacted (API):', {
        commentId: comment.id,
        reaction,
        currentUserId,
        userReacted,
        apiUserReaction: comment.user_reaction,
        backendReaction
      });
      return userReacted;
    }
    
    // Fallback to legacy userReactions object
    const userReacted = comment.userReactions?.[currentUserId]?.includes(reaction) || false;
    console.log('🔧 Checking if user reacted (legacy):', {
      commentId: comment.id,
      reaction,
      currentUserId,
      userReacted,
      userReactions: comment.userReactions,
      currentUserReactions: comment.userReactions?.[currentUserId]
    });
    return userReacted;
  };

  // Convert task assignees to mention format (excluding current user)
  const mentionableMembers = React.useMemo(() => {
    if (!Array.isArray(taskAssignees)) {
      console.warn('TaskCommentsCard: taskAssignees is not an array:', taskAssignees);
      return [];
    }
    
    return taskAssignees
      .filter(assignee => {
        if (!assignee || typeof assignee !== 'object') {
          console.warn('TaskCommentsCard: Invalid assignee object:', assignee);
          return false;
        }
        if (!assignee.id || !assignee.name) {
          console.warn('TaskCommentsCard: Assignee missing id or name:', assignee);
          return false;
        }
        return assignee.id !== currentUserId;
      })
      .map(assignee => ({
        id: assignee.id,
        name: assignee.name,
        username: assignee.name.toLowerCase().replace(/\s+/g, ''), // Simple username conversion
      }));
  }, [taskAssignees, currentUserId]);

  // Get valid comments for accurate count
  const validComments = React.useMemo(() => {
    console.log('🗨️ TaskCommentsCard filtering comments:', {
      total: comments.length,
      commentsData: comments.map(c => ({
        id: c?.id,
        hasContent: !!c?.content,
        hasAuthor: !!c?.author,
        content: c?.content?.substring(0, 50) + (c?.content?.length > 50 ? '...' : ''),
        authorName: c?.author?.name,
        authorData: c?.author,
        fullComment: c
      }))
    });
    
    const filtered = comments.filter(comment => {
      const isValid = comment && comment.id && comment.content && comment.author;
      if (!isValid) {
        console.log('🗨️ Filtering out invalid comment:', {
          hasComment: !!comment,
          hasId: !!comment?.id,
          hasContent: !!comment?.content,
          hasAuthor: !!comment?.author,
          comment
        });
      }
      return isValid;
    });
    
    console.log('🗨️ TaskCommentsCard valid comments:', {
      original: comments.length,
      valid: filtered.length,
      validIds: filtered.map(c => c.id)
    });
    
    return filtered;
  }, [comments]);

  // Debug the current user and comments on render
  React.useEffect(() => {
    console.log('🔧 TaskCommentsCard render debug:', {
      currentUserId,
      currentUserRole,
      totalComments: comments.length,
      validComments: validComments.length,
      hasOnReactToComment: typeof onReactToComment === 'function',
      rawComments: comments.map(c => ({ id: c.id, content: c.content?.substring(0, 20) })),
      commentsWithAuthors: validComments.map(c => ({
        id: c.id,
        authorId: c.author?.id,
        authorName: c.author?.name,
        content: c.content.substring(0, 30) + '...',
        hasReactions: !!c.reactions,
        hasUserReactions: !!c.userReactions
      }))
    });
  }, [currentUserId, currentUserRole, comments, validComments, onReactToComment]);

  return (
    <Animated.View
      entering={FadeInUp.delay(600).duration(600)}
      className="bg-white mx-6 mt-4 rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <Text className="text-lg font-bold text-gray-900 mb-6">
        Comments ({validComments.length})
      </Text>

      <View className="mb-6">
        {validComments.map((comment, index) => (
          <Animated.View
            key={comment.id}
            entering={FadeInUp.delay(index * 150).duration(400)}
            style={{
              backgroundColor: '#FAFBFC',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderLeftWidth: 3,
              borderLeftColor:
                comment.author?.id === currentUserId ? '#8B5CF6' : '#E5E7EB',
            }}
          >
            <View className="flex-row">
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <View className='flex-row items-center'>
                    <TouchableOpacity
                      onPress={() =>
                        comment.author?.id && onAuthorPress?.(comment.author.id)
                      }
                      activeOpacity={0.7}
                      style={{ marginRight: 12 }}
                    >
                      <Avatar
                        user={
                          comment.author || {
                            id: '',
                            name: 'Unknown',
                            avatar: '',
                            role: '',
                            email: '',
                          }
                        }
                        size="sm"
                      />
                    </TouchableOpacity>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() =>
                          comment.author?.id &&
                          onAuthorPress?.(comment.author.id)
                        }
                        activeOpacity={0.7}
                      >
                        <Text className="font-semibold text-gray-900 mr-2">
                          {comment.author?.name || 'Unknown User'}
                          {currentUserRole?.toLowerCase() === 'ceo' &&
                            comment.author?.id === currentUserId && (
                              <Text className="text-xs text-blue-600 font-medium">
                                {' '}
                                (CEO)
                              </Text>
                            )}
                        </Text>
                      </TouchableOpacity>
                      <Text className="text-xs text-gray-500">
                        {comment.timestamp
                          ? formatTimeAgo(comment.timestamp)
                          : 'Unknown time'}
                      </Text>
                    </View>
                  </View>

                  {/* Three dots menu for comment actions */}
                  {canEditOrDelete(comment) && (
                    <TouchableOpacity
                      onPress={() => handleCommentOptions(comment)}
                      disabled={commentLoadingStates[comment.id]?.editing || commentLoadingStates[comment.id]?.deleting}
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                      }}
                      activeOpacity={0.7}
                    >
                      {commentLoadingStates[comment.id]?.editing || commentLoadingStates[comment.id]?.deleting ? (
                        <ActivityIndicator size="small" color="#6B7280" />
                      ) : (
                        <MaterialIcon
                          name="more-vert"
                          size={18}
                          color="#6B7280"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Comment content - either text or edit input */}
                {editingCommentId === comment.id ? (
                  <View className="mt-3">
                    <PromptInput
                      onEditMessage={(_, content) => {
                        if (content.trim()) {
                          handleEditSave(comment.id, content);
                        }
                      }}
                      onCancelEdit={handleEditCancel}
                      placeholder="Edit your comment..."
                      channelMembers={mentionableMembers}
                      editingMessage={{
                        id: comment.id,
                        content: editingText,
                      }}
                      isLoading={commentLoadingStates[comment.id]?.editing}
                    />
                  </View>
                ) : (
                  <View>
                    <View>{renderCommentContent(comment.content)}</View>

                    {/* Reaction buttons */}
                    <View
                      className="flex-row items-center mt-3"
                      style={{ gap: 8 }}
                    >
                      <TouchableOpacity
                        disabled={reactionLoadingStates[comment.id]?.thumbs_up}
                        onPress={() => {
                          console.log('🔧 Thumbs up clicked:', {
                            commentId: comment.id,
                            currentUserId,
                            hasReacted: hasUserReacted(comment, 'thumbs_up'),
                            currentCount: getReactionCount(comment, 'thumbs_up'),
                            isLoading: reactionLoadingStates[comment.id]?.thumbs_up,
                          });

                          if (typeof onReactToComment === 'function') {
                            onReactToComment(comment.id, 'thumbs_up')
                              .then(() => {
                                console.log('🔧 Thumbs up reaction completed successfully');
                              })
                              .catch((error) => {
                                console.error('🔧 Thumbs up reaction failed:', error);
                              });
                          }
                        }}
                        className={`flex-row items-center px-2 py-1 rounded-full ${
                          hasUserReacted(comment, 'thumbs_up')
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <MaterialIcon
                          name="thumb-up"
                          size={14}
                          color={
                            hasUserReacted(comment, 'thumbs_up')
                              ? '#10B981'
                              : '#6B7280'
                          }
                        />
                        {reactionLoadingStates[comment.id]?.thumbs_up ? (
                          <ActivityIndicator size="small" color="#16a34a" className="ml-1" />
                        ) : (
                          <Text
                            className={`ml-1 text-xs ${
                              hasUserReacted(comment, 'thumbs_up')
                                ? 'text-green-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {getReactionCount(comment, 'thumbs_up')}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={reactionLoadingStates[comment.id]?.thumbs_down}
                        onPress={() => {
                          console.log('🔧 Thumbs down clicked:', {
                            commentId: comment.id,
                            currentUserId,
                            hasReacted: hasUserReacted(comment, 'thumbs_down'),
                            currentCount: getReactionCount(comment, 'thumbs_down'),
                            isLoading: reactionLoadingStates[comment.id]?.thumbs_down,
                          });

                          if (typeof onReactToComment === 'function') {
                            onReactToComment(comment.id, 'thumbs_down')
                              .then(() => {
                                console.log('🔧 Thumbs down reaction completed successfully');
                              })
                              .catch((error) => {
                                console.error('🔧 Thumbs down reaction failed:', error);
                              });
                          }
                        }}
                        className={`flex-row items-center px-2 py-1 rounded-full ${
                          hasUserReacted(comment, 'thumbs_down')
                            ? 'bg-red-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <MaterialIcon
                          name="thumb-down"
                          size={14}
                          color={
                            hasUserReacted(comment, 'thumbs_down')
                              ? '#EF4444'
                              : '#6B7280'
                          }
                        />
                        {reactionLoadingStates[comment.id]?.thumbs_down ? (
                          <ActivityIndicator size="small" color="#ef4444" className="ml-1" />
                        ) : (
                          <Text
                            className={`ml-1 text-xs ${
                              hasUserReacted(comment, 'thumbs_down')
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {getReactionCount(comment, 'thumbs_down')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Add Comment Input - Only show if user can comment */}
      {canComment && (
        <Animated.View style={animatedCommentInputStyle}>
          <PromptInput
            onSendMessage={content => {
              if (content.trim()) {
                onAddComment(content);
              }
            }}
            placeholder="Add a comment... (use @ to mention assignees)"
            channelMembers={mentionableMembers}
            isLoading={isAddingComment}
          />
        </Animated.View>
      )}

      {/* Message when user cannot comment */}
      {!canComment && (
        <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <View className="flex-row items-center justify-center">
            <MaterialIcon name="lock" size={16} color="#9CA3AF" />
            <Text className="text-gray-500 text-sm ml-2">
              Only assigned team members can comment on this task
            </Text>
          </View>
        </View>
      )}

      {/* ActionSheet for comment options */}
      <ActionSheet
        visible={showCommentActionSheet}
        title="Comment Options"
        message={selectedComment ? `Options for comment` : ''}
        options={getCommentActionSheetOptions()}
        onClose={() => {
          setShowCommentActionSheet(false);
          setSelectedComment(null);
        }}
      />
    </Animated.View>
  );
};