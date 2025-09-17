import { ApiResponse } from '../../types/api';
import { authService } from './authService';
import { tokenManager } from '../tokenManager';

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: any;
  };
  uploadedBy: string;
  uploadedAt: string;
  taskId?: string;
  channelId?: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * File Service for task attachments and general file operations
 */
class FileService {
  private readonly baseUrl: string;

  constructor() {
import { API_BASE_URL } from '../../config/api';

    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get the access token from centralized token manager
    const accessToken = await tokenManager.getCurrentToken();
    
    // Add authorization header if token exists
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        ...options.headers,
      },
    };

    console.log('📁 FileService request:', {
      endpoint,
      url,
      hasToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      headers: config.headers
    });
    
    return authService.withAuth(async () => {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    });
  }

  /**
   * Upload file to server
   */
  async uploadFile(
    file: File | { uri: string; name: string; type: string },
    options?: {
      taskId?: string;
      channelId?: string;
      description?: string;
      onProgress?: (progress: FileUploadProgress) => void;
    }
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    
    // Handle different file types (web File vs React Native)
    if ('uri' in file) {
      // React Native file
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    } else {
      // Web File
      formData.append('file', file);
    }
    
    // Add metadata
    if (options?.taskId) formData.append('taskId', options.taskId);
    if (options?.channelId) formData.append('channelId', options.channelId);
    if (options?.description) formData.append('description', options.description);

    return authService.withAuth(async () => {
      const xhr = new XMLHttpRequest();
      
      return new Promise<FileUploadResponse>((resolve, reject) => {
        // Progress tracking
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && options?.onProgress) {
            const progress: FileUploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            options.onProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error?.message || `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        // Get auth token and set headers
        const token = await tokenManager.getCurrentToken();
        xhr.open('POST', `${this.baseUrl}/files/upload`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(formData);
      });
    });
  }

  /**
   * Get task attachments
   */
  async getTaskAttachments(taskId: string): Promise<ApiResponse<TaskAttachment[]>> {
    return this.makeRequest<ApiResponse<TaskAttachment[]>>(`/tasks/${taskId}/attachments`);
  }

  /**
   * Add attachment to task
   */
  async addTaskAttachment(
    taskId: string,
    fileId: string,
    description?: string
  ): Promise<ApiResponse<TaskAttachment>> {
    return this.makeRequest<ApiResponse<TaskAttachment>>(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, description }),
    });
  }

  /**
   * Remove attachment from task
   */
  async removeTaskAttachment(
    taskId: string,
    attachmentId: string
  ): Promise<ApiResponse<string>> {
    return this.makeRequest<ApiResponse<string>>(
      `/tasks/${taskId}/attachments/${attachmentId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get file details
   */
  async getFileDetails(fileId: string): Promise<ApiResponse<FileUploadResponse>> {
    return this.makeRequest<ApiResponse<FileUploadResponse>>(`/files/${fileId}`);
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<ApiResponse<string>> {
    return this.makeRequest<ApiResponse<string>>(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get file download URL
   */
  async getDownloadUrl(fileId: string): Promise<string> {
    const response = await this.makeRequest<{ url: string }>(`/files/${fileId}/download`);
    return response.url;
  }

  /**
   * Generate file thumbnail
   */
  async generateThumbnail(
    fileId: string,
    options?: { width?: number; height?: number }
  ): Promise<ApiResponse<{ thumbnailUrl: string }>> {
    return this.makeRequest<ApiResponse<{ thumbnailUrl: string }>>(
      `/files/${fileId}/thumbnail`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      }
    );
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: (File | { uri: string; name: string; type: string })[],
    options?: {
      taskId?: string;
      channelId?: string;
      onProgress?: (fileIndex: number, progress: FileUploadProgress) => void;
      onFileComplete?: (fileIndex: number, response: FileUploadResponse) => void;
      onFileError?: (fileIndex: number, error: Error) => void;
    }
  ): Promise<FileUploadResponse[]> {
    const results: FileUploadResponse[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const response = await this.uploadFile(file, {
          taskId: options?.taskId,
          channelId: options?.channelId,
          onProgress: (progress) => options?.onProgress?.(i, progress),
        });
        
        results.push(response);
        options?.onFileComplete?.(i, response);
      } catch (error) {
        options?.onFileError?.(i, error as Error);
        throw error; // Stop on first error, or modify to continue
      }
    }
    
    return results;
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): { [category: string]: string[] } {
    return {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
      ],
      archives: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
      ],
      media: [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
      ],
    };
  }

  /**
   * Validate file type
   */
  isFileTypeSupported(mimeType: string): boolean {
    const supportedTypes = this.getSupportedFileTypes();
    return Object.values(supportedTypes).some(types => types.includes(mimeType));
  }

  /**
   * Validate file size
   */
  isFileSizeValid(size: number, maxSize: number = 100 * 1024 * 1024): boolean { // 100MB default
    return size <= maxSize;
  }

  /**
   * Get file category from mime type
   */
  getFileCategory(mimeType: string): string {
    const supportedTypes = this.getSupportedFileTypes();
    
    for (const [category, types] of Object.entries(supportedTypes)) {
      if (types.includes(mimeType)) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Get file icon based on mime type
   */
  getFileIcon(mimeType: string): string {
    const category = this.getFileCategory(mimeType);
    
    switch (category) {
      case 'images': return '🖼️';
      case 'documents': return '📄';
      case 'archives': return '📦';
      case 'media': return mimeType.startsWith('video/') ? '🎥' : '🎵';
      default: return '📎';
    }
  }
}

export const fileService = new FileService();