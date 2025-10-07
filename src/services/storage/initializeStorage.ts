import { ImageStorageService } from './imageStorageService';

export class StorageInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔧 Initializing storage services...');
      
      // Initialize image storage
      await ImageStorageService.initialize();
      
      // Clean up old images on startup (keep only last 30 days)
      await ImageStorageService.cleanupOldImages();
      
      this.initialized = true;
      console.log('✅ Storage services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize storage services:', error);
      // Don't throw - app should still work without local storage
    }
  }

  static async getStorageInfo() {
    try {
      return await ImageStorageService.getStorageInfo();
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return { totalImages: 0, totalSize: 0, userImages: {} };
    }
  }
}