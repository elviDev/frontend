import { store } from '../store/store';

export interface AppError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
  timestamp: Date;
  component?: string;
  action?: string;
  userId?: string;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  additionalData?: any;
}

export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 100;

  /**
   * Handle API errors consistently
   */
  static handleApiError(error: any, context: ErrorContext): AppError {
    const appError: AppError = {
      code: error.code || 'API_ERROR',
      message: error.message || 'An API error occurred',
      statusCode: error.statusCode || error.status,
      details: error.details || error.response?.data,
      timestamp: new Date(),
      component: context.component,
      action: context.action,
      userId: context.userId,
    };

    this.logError(appError);
    this.notifyUser(appError);
    
    return appError;
  }

  /**
   * Handle WebSocket errors
   */
  static handleWebSocketError(error: any, context: ErrorContext): AppError {
    const appError: AppError = {
      code: error.code || 'WEBSOCKET_ERROR',
      message: error.message || 'WebSocket connection error',
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date(),
      component: context.component,
      action: context.action,
      userId: context.userId,
    };

    this.logError(appError);
    
    // Don't show WebSocket errors to users unless critical
    if (this.isCriticalError(appError)) {
      this.notifyUser(appError);
    }
    
    return appError;
  }

  /**
   * Handle component errors
   */
  static handleComponentError(error: any, context: ErrorContext): AppError {
    const appError: AppError = {
      code: 'COMPONENT_ERROR',
      message: error.message || 'A component error occurred',
      details: {
        stack: error.stack,
        name: error.name,
        ...context.additionalData
      },
      timestamp: new Date(),
      component: context.component,
      action: context.action,
      userId: context.userId,
    };

    this.logError(appError);
    this.notifyUser(appError);
    
    return appError;
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any, context: ErrorContext): AppError {
    const appError: AppError = {
      code: error.code || 'AUTH_ERROR',
      message: error.message || 'Authentication error',
      statusCode: error.statusCode || 401,
      details: error.details,
      timestamp: new Date(),
      component: context.component,
      action: context.action,
      userId: context.userId,
    };

    this.logError(appError);
    
    // Handle different auth error types
    if (appError.statusCode === 401) {
      this.handleUnauthorized();
    } else if (appError.statusCode === 403) {
      this.handleForbidden();
    } else {
      this.notifyUser(appError);
    }
    
    return appError;
  }

  /**
   * Handle data transformation errors
   */
  static handleTransformError(error: any, context: ErrorContext): AppError {
    const appError: AppError = {
      code: 'TRANSFORM_ERROR',
      message: 'Data transformation failed',
      details: {
        originalError: error.message,
        data: context.additionalData
      },
      timestamp: new Date(),
      component: context.component,
      action: context.action,
      userId: context.userId,
    };

    this.logError(appError);
    
    // Transform errors are usually not user-facing
    console.error('Data transformation error:', appError);
    
    return appError;
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: any, context: ErrorContext): AppError {
    const appError: AppError = {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      details: {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.code === 'ECONNABORTED',
      },
      timestamp: new Date(),
      component: context.component,
      action: context.action,
      userId: context.userId,
    };

    this.logError(appError);
    this.notifyUser(appError);
    
    return appError;
  }

  /**
   * Log error for debugging and analytics
   */
  private static logError(error: AppError): void {
    // Add to in-memory log
    this.errorLog.unshift(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging for development
    console.error(`[${error.component}:${error.action}] ${error.code}: ${error.message}`, {
      error,
      timestamp: error.timestamp.toISOString(),
    });

    // Send to analytics/monitoring service
    this.sendToMonitoring(error);
  }

  /**
   * Notify user of error
   */
  private static notifyUser(error: AppError): void {
    const userMessage = this.getUserFriendlyMessage(error);
    
    // Dispatch to error notification system
    store.dispatch({
      type: 'ui/showError',
      payload: {
        message: userMessage,
        code: error.code,
        timestamp: error.timestamp,
        action: error.action,
      }
    });
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      
      case 'AUTH_ERROR':
        return 'Authentication failed. Please sign in again.';
      
      case 'WEBSOCKET_ERROR':
        return 'Connection lost. Attempting to reconnect...';
      
      case 'API_ERROR':
        if (error.statusCode === 404) {
          return 'The requested resource was not found.';
        } else if (error.statusCode === 500) {
          return 'Server error. Please try again later.';
        } else if (error.statusCode === 429) {
          return 'Too many requests. Please wait a moment and try again.';
        }
        return error.message || 'An unexpected error occurred.';
      
      case 'COMPONENT_ERROR':
        return 'Something went wrong. Please refresh the page and try again.';
      
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Handle unauthorized errors (401)
   */
  private static handleUnauthorized(): void {
    // Clear authentication state
    store.dispatch({ type: 'auth/logout' });
    
    // Redirect to login (this should be handled by the auth system)
    console.warn('User unauthorized - redirecting to login');
  }

  /**
   * Handle forbidden errors (403)
   */
  private static handleForbidden(): void {
    store.dispatch({
      type: 'ui/showError',
      payload: {
        message: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
        timestamp: new Date(),
      }
    });
  }

  /**
   * Check if error is critical and should be shown to user
   */
  private static isCriticalError(error: AppError): boolean {
    const criticalCodes = [
      'AUTH_ERROR',
      'NETWORK_ERROR',
      'API_ERROR'
    ];
    
    return criticalCodes.includes(error.code) || 
           (error.statusCode && error.statusCode >= 500);
  }

  /**
   * Send error to monitoring service
   */
  private static sendToMonitoring(error: AppError): void {
    // In production, send to error monitoring service (e.g., Sentry, Bugsnag)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
      console.log('Would send to monitoring service:', error);
    }
  }

  /**
   * Get error log for debugging
   */
  static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    this.errorLog.forEach(error => {
      stats[error.code] = (stats[error.code] || 0) + 1;
    });
    
    return stats;
  }
}

/**
 * Error boundary hook for React components
 */
export function useErrorHandler(component: string) {
  return {
    handleError: (error: any, action: string, additionalData?: any) => {
      const state = store.getState();
      const userId = state.auth.user?.id;
      
      return ErrorHandler.handleComponentError(error, {
        component,
        action,
        userId,
        additionalData
      });
    },
    
    handleApiError: (error: any, action: string) => {
      const state = store.getState();
      const userId = state.auth.user?.id;
      
      return ErrorHandler.handleApiError(error, {
        component,
        action,
        userId
      });
    }
  };
}