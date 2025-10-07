import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface StoredImage {
  id: string;
  userId: string;
  localPath: string;
  remotePath?: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  isUploaded: boolean;
}

export class ImageStorageService {
  private static readonly STORAGE_KEY = 'profile_images';
  private static readonly IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/profile_images`;

  static async initialize(): Promise<void> {
    try {
      // Create the profile images directory if it doesn't exist
      const dirExists = await RNFS.exists(this.IMAGE_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.IMAGE_DIR);
        console.log('📁 Profile images directory created');
      }
    } catch (error) {
      console.error('❌ Failed to initialize image storage:', error);
    }
  }

  static async storeProfileImage(
    userId: string,
    imageUri: string,
    originalName: string,
    mimeType: string
  ): Promise<StoredImage> {
    try {
      await this.initialize();

      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getFileExtension(originalName) || this.getExtensionFromMimeType(mimeType);
      const fileName = `profile_${userId}_${timestamp}.${extension}`;
      const localPath = `${this.IMAGE_DIR}/${fileName}`;

      // Copy image from temp location to our permanent storage
      await RNFS.copyFile(imageUri, localPath);

      // Get file size
      const stats = await RNFS.stat(localPath);
      const size = stats.size;

      // Create stored image record
      const storedImage: StoredImage = {
        id: `img_${timestamp}`,
        userId,
        localPath,
        originalName,
        mimeType,
        size,
        uploadedAt: new Date().toISOString(),
        isUploaded: false,
      };

      // Save to AsyncStorage
      await this.saveImageRecord(storedImage);

      console.log('✅ Profile image stored locally:', localPath);
      return storedImage;
    } catch (error) {
      console.error('❌ Failed to store profile image:', error);
      throw new Error(`Failed to store image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getStoredProfileImage(userId: string): Promise<StoredImage | null> {
    try {
      const images = await this.getAllStoredImages();
      // Return the most recent image for the user
      const userImages = images
        .filter(img => img.userId === userId)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      return userImages.length > 0 ? userImages[0] : null;
    } catch (error) {
      console.error('❌ Failed to get stored profile image:', error);
      return null;
    }
  }

  static async getAllStoredImages(): Promise<StoredImage[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get stored images:', error);
      return [];
    }
  }

  static async updateImageUploadStatus(
    imageId: string,
    remotePath: string,
    isUploaded: boolean = true
  ): Promise<void> {
    try {
      const images = await this.getAllStoredImages();
      const updatedImages = images.map(img =>
        img.id === imageId
          ? { ...img, remotePath, isUploaded }
          : img
      );
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedImages));
      console.log('✅ Image upload status updated:', { imageId, remotePath, isUploaded });
    } catch (error) {
      console.error('❌ Failed to update image upload status:', error);
    }
  }

  static async deleteStoredImage(userId: string): Promise<boolean> {
    try {
      const images = await this.getAllStoredImages();
      const userImages = images.filter(img => img.userId === userId);

      // Delete physical files
      for (const image of userImages) {
        try {
          const exists = await RNFS.exists(image.localPath);
          if (exists) {
            await RNFS.unlink(image.localPath);
            console.log('🗑️ Deleted local image file:', image.localPath);
          }
        } catch (fileError) {
          console.warn('⚠️ Failed to delete local file:', image.localPath, fileError);
        }
      }

      // Remove from storage
      const remainingImages = images.filter(img => img.userId !== userId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(remainingImages));

      console.log('✅ Profile images deleted for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete stored images:', error);
      return false;
    }
  }

  static async getLocalImageUri(userId: string): Promise<string | null> {
    try {
      const storedImage = await this.getStoredProfileImage(userId);
      if (!storedImage) {
        return null;
      }

      // Check if file still exists
      const exists = await RNFS.exists(storedImage.localPath);
      if (!exists) {
        console.warn('⚠️ Local image file missing, cleaning up record');
        await this.deleteStoredImage(userId);
        return null;
      }

      // Return file:// URI for React Native Image component
      const uri = Platform.OS === 'android' 
        ? `file://${storedImage.localPath}`
        : storedImage.localPath;
      
      return uri;
    } catch (error) {
      console.error('❌ Failed to get local image URI:', error);
      return null;
    }
  }

  static async cleanupOldImages(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const images = await this.getAllStoredImages();
      const now = Date.now();
      const imagesToKeep: StoredImage[] = [];
      const imagesToDelete: StoredImage[] = [];

      for (const image of images) {
        const imageAge = now - new Date(image.uploadedAt).getTime();
        if (imageAge > maxAge && image.isUploaded) {
          imagesToDelete.push(image);
        } else {
          imagesToKeep.push(image);
        }
      }

      // Delete old files
      for (const image of imagesToDelete) {
        try {
          const exists = await RNFS.exists(image.localPath);
          if (exists) {
            await RNFS.unlink(image.localPath);
          }
        } catch (fileError) {
          console.warn('⚠️ Failed to delete old image file:', image.localPath);
        }
      }

      // Update storage
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(imagesToKeep));
      
      if (imagesToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${imagesToDelete.length} old profile images`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old images:', error);
    }
  }

  static async getStorageInfo(): Promise<{
    totalImages: number;
    totalSize: number;
    userImages: Record<string, number>;
  }> {
    try {
      const images = await this.getAllStoredImages();
      let totalSize = 0;
      const userImages: Record<string, number> = {};

      for (const image of images) {
        totalSize += image.size;
        userImages[image.userId] = (userImages[image.userId] || 0) + 1;
      }

      return {
        totalImages: images.length,
        totalSize,
        userImages,
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return { totalImages: 0, totalSize: 0, userImages: {} };
    }
  }

  private static async saveImageRecord(image: StoredImage): Promise<void> {
    const images = await this.getAllStoredImages();
    
    // Remove any existing images for this user (keep only the latest)
    const filteredImages = images.filter(img => img.userId !== image.userId);
    filteredImages.push(image);
    
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredImages));
  }

  private static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return mimeMap[mimeType] || 'jpg';
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}