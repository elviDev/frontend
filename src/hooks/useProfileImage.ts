import { useState, useEffect, useCallback } from 'react';
import { ImageStorageService } from '../services/storage/imageStorageService';
import { userService } from '../services/api/userService';

export interface UseProfileImageResult {
  imageUri: string | null;
  isLoading: boolean;
  error: string | null;
  refreshImage: () => Promise<void>;
  clearLocalImage: () => void;
}

export const useProfileImage = (userId: string | null): UseProfileImageResult => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback(async () => {
    if (!userId) {
      setImageUri(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try to get local image
      const localUri = await ImageStorageService.getLocalImageUri(userId);
      if (localUri) {
        setImageUri(localUri);
        console.log('🖼️ Using local profile image for user:', userId);
        return;
      }

      // If no local image, try to get from userService
      const profileUrl = await userService.getProfilePictureUrl(userId);
      setImageUri(profileUrl);
      
      if (profileUrl) {
        console.log('☁️ Using remote profile image for user:', userId);
      } else {
        console.log('❌ No profile image found for user:', userId);
      }
    } catch (err) {
      console.error('❌ Failed to load profile image:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      setImageUri(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshImage = useCallback(async () => {
    await loadImage();
  }, [loadImage]);

  const clearLocalImage = useCallback(() => {
    setImageUri(null);
  }, []);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  return {
    imageUri,
    isLoading,
    error,
    refreshImage,
    clearLocalImage,
  };
};