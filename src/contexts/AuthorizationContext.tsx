import React, { createContext, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export type UserRole = 'ceo' | 'manager' | 'staff';

export interface Permission {
  resource: string;
  action: string;
}

interface AuthorizationContextType {
  userRole: UserRole | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  canAccessResource: (resource: string, action: string) => boolean;
  canManageUsers: () => boolean;
  canCreateChannels: () => boolean;
  canCreateTasks: () => boolean;
  canManageTasks: () => boolean;
  canUseVoiceCommands: () => boolean;
  canAccessAnalytics: () => boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType | null>(null);

// Role-based permissions mapping (must match backend authorization middleware)
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ceo: ['*'], // Wildcard - CEO has access to everything
  manager: [
    'channels:create', 'channels:read', 'channels:update', 'channels:manage_members',
    'channels:delete', // Managers can delete channels per backend requireManagerOrCEO
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign', 'tasks:manage_dependencies',
    'users:read', 'users:update_profile', 'users:manage',
    'voice:commands',
    'analytics:read'
  ],
  staff: [
    'channels:read', 'channels:participate',
    'tasks:read', 'tasks:update_own', 'tasks:comment',
    'users:read_own', 'users:update_own_profile'
    // Note: staff cannot create channels - only CEO and managers can
  ]
};

export const AuthorizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const authContext = useMemo((): AuthorizationContextType => {
    const userRole = user?.role as UserRole | null;
    const permissions = userRole ? ROLE_PERMISSIONS[userRole] : [];

    const hasPermission = (permission: string): boolean => {
      if (!userRole || !permissions) return false;
      
      // CEO has wildcard access
      if (permissions.includes('*')) return true;
      
      // Check for exact permission match
      return permissions.includes(permission);
    };

    const canAccessResource = (resource: string, action: string): boolean => {
      return hasPermission(`${resource}:${action}`);
    };

    return {
      userRole,
      permissions,
      hasPermission,
      canAccessResource,
      canManageUsers: () => hasPermission('users:manage') || hasPermission('*'),
      canCreateChannels: () => hasPermission('channels:create') || hasPermission('*'),
      canCreateTasks: () => hasPermission('tasks:create') || hasPermission('*'),
      canManageTasks: () => hasPermission('tasks:manage') || hasPermission('*'),
      canUseVoiceCommands: () => hasPermission('voice:commands') || hasPermission('*'),
      canAccessAnalytics: () => hasPermission('analytics:read') || hasPermission('*'),
    };
  }, [user?.role, user?.id]);

  return (
    <AuthorizationContext.Provider value={authContext}>
      {children}
    </AuthorizationContext.Provider>
  );
};

export const useAuthorization = (): AuthorizationContextType => {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within AuthorizationProvider');
  }
  return context;
};

// High-order component for protected routes
export const withAuthorization = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { hasPermission } = useAuthorization();
    
    if (!hasPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-gray-500">You don't have permission to access this resource.</p>
          </div>
        </div>
      );
    }
    
    return <Component {...(props as P)} ref={ref} />;
  });
};