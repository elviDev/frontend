import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { RootState } from '../store/store';
import { ImageStorageService } from '../services/storage/imageStorageService';

export interface UseUserAvatarResult {
  avatarUrl: string | null;
  isCurrentUser: boolean;
  isLoading: boolean;
}

/**
 * Hook to get user avatar with live updates from Redux store and local storage
 * - For current user: Returns live data from Redux + local storage fallback
 * - For other users: Returns provided avatar_url (cached from message/API data)
 */
export const useUserAvatar = (
  userId: string | null, 
  providedAvatarUrl?: string | null
): UseUserAvatarResult => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentUser = currentUser?.id === userId;

  useEffect(() => {
    // Only fetch local avatar for current user
    if (isCurrentUser && userId) {
      setIsLoading(true);
      ImageStorageService.getLocalImageUri(userId)
        .then(localUri => {
          setLocalAvatarUrl(localUri);
        })
        .catch(error => {
          console.warn('Failed to load local avatar:', error);
          setLocalAvatarUrl(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isCurrentUser, userId, currentUser?.avatar_url]); // Re-run when currentUser.avatar_url changes

  // Determine the avatar URL to use
  const getAvatarUrl = (): string | null => {
    if (isCurrentUser) {
      // For current user: prioritize local storage, then Redux state, then provided URL
      return localAvatarUrl || currentUser?.avatar_url || providedAvatarUrl || null;
    } else {
      // For other users: use provided avatar URL from cached data
      return providedAvatarUrl || null;
    }
  };

  return {
    avatarUrl: getAvatarUrl(),
    isCurrentUser,
    isLoading,
  };
};