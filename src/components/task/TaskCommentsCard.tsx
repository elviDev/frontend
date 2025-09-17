import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import Animated, { 
  FadeInUp, 
  useAnimatedStyle, 
  useSharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskComment } from '../../types/task.types';
import { Avatar } from '../common/Avatar';

interface TaskCommentsCardProps {
  comments: TaskComment[];
  newComment: string;
  onNewCommentChange: (text: string) => void;
  onAddComment: () => void;
  onEditComment: (commentId: string, newContent: string) => void;
  onDeleteComment: (commentId: string) => void;
  formatTimeAgo: (date: Date) => string;
  commentInputScale?: any;
  onAuthorPress?: (authorId: string) => void;
  currentUserId: string;
  currentUserRole?: string;
  canComment: boolean;
}

export const TaskCommentsCard: React.FC<TaskCommentsCardProps> = ({
  comments,
  newComment,
  onNewCommentChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
  formatTimeAgo,
  commentInputScale,
  onAuthorPress,
  currentUserId,
  currentUserRole,
  canComment,
}) => {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const animatedCommentInputStyle = useAnimatedStyle(() => ({
    transform: commentInputScale ? [{ scale: commentInputScale.value }] : [],
  }));

  const canEditOrDelete = (comment: TaskComment) => {
    // CEO can edit/delete any comment
    if (currentUserRole?.toLowerCase() === 'ceo') return true;
    // Users can edit/delete their own comments
    return comment.author.id === currentUserId;
  };

  const handleEditStart = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const handleEditSave = (commentId: string) => {
    if (editingText.trim()) {
      onEditComment(commentId, editingText.trim());
      setEditingCommentId(null);
      setEditingText('');
    }
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDeleteComment(commentId)
        }
      ]
    );
  };

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
        Comments ({comments.length})
      </Text>

      <View className="space-y-4 mb-6">
        {comments.map((comment, index) => (
          <Animated.View
            key={comment.id}
            entering={FadeInUp.delay(index * 150).duration(400)}
            className="flex-row"
          >
            <TouchableOpacity
              onPress={() => onAuthorPress?.(comment.author.id)}
              activeOpacity={0.7}
            >
              <Avatar user={comment.author} size="sm" />
            </TouchableOpacity>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => onAuthorPress?.(comment.author.id)}
                    activeOpacity={0.7}
                  >
                    <Text className="font-semibold text-gray-900 mr-2">
                      {comment.author.name}
                      {currentUserRole?.toLowerCase() === 'ceo' && comment.author.id === currentUserId && (
                        <Text className="text-xs text-blue-600 font-medium"> (CEO)</Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-xs text-gray-500">
                    {formatTimeAgo(comment.timestamp)}
                  </Text>
                </View>

                {/* Action buttons for edit/delete */}
                {canEditOrDelete(comment) && (
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleEditStart(comment)}
                      className="p-1"
                      activeOpacity={0.7}
                    >
                      <MaterialIcon name="edit" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(comment.id)}
                      className="p-1 ml-1"
                      activeOpacity={0.7}
                    >
                      <MaterialIcon name="delete" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Comment content - either text or edit input */}
              {editingCommentId === comment.id ? (
                <View className="mt-2">
                  <TextInput
                    value={editingText}
                    onChangeText={setEditingText}
                    className="bg-gray-50 rounded-lg p-3 text-gray-900 border border-gray-200"
                    multiline
                    style={{ minHeight: 60, maxHeight: 120 }}
                    placeholder="Edit your comment..."
                    placeholderTextColor="#9CA3AF"
                  />
                  <View className="flex-row justify-end mt-2">
                    <TouchableOpacity
                      onPress={handleEditCancel}
                      className="px-3 py-1 mr-2"
                    >
                      <Text className="text-gray-600 text-sm">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleEditSave(comment.id)}
                      className="bg-blue-500 px-3 py-1 rounded-lg"
                      disabled={!editingText.trim()}
                    >
                      <Text className="text-white text-sm font-medium">Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text className="text-gray-700 leading-relaxed">
                  {comment.content}
                </Text>
              )}
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Add Comment Input - Only show if user can comment */}
      {canComment && (
        <Animated.View
          style={animatedCommentInputStyle}
          className="flex-row items-center bg-gray-50 rounded-xl p-3 border border-gray-200"
        >
          <TextInput
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={onNewCommentChange}
            className="flex-1 text-gray-900 text-base"
            placeholderTextColor="#9CA3AF"
            multiline
            style={{ minHeight: 20, maxHeight: 100 }}
          />

          {newComment.trim() && (
            <TouchableOpacity
              onPress={onAddComment}
              className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center ml-2"
            >
              <MaterialIcon name="send" size={16} color="white" />
            </TouchableOpacity>
          )}
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
    </Animated.View>
  );
};