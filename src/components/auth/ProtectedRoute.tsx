import React from 'react';
import { AuthStatus } from '../../services/authService';
import { User } from '../../types';
import { hasPermission } from '../../config/navigationRegistry';
import { Forbidden403 } from './Forbidden403';
import { AuthLoadingScreen } from './AuthLoadingScreen';

export interface ProtectedRouteProps {
  status: AuthStatus;
  user: User | null;
  requiredPermission?: string;
  requiredPermissionsAny?: string[];
  children: React.ReactNode;
  onRedirectToLogin?: (currentPath?: string) => void;
  onBackToDashboard?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  status,
  user,
  requiredPermission,
  requiredPermissionsAny,
  children,
  onRedirectToLogin,
  onBackToDashboard,
}) => {
  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'unauthenticated' || !user) {
    if (onRedirectToLogin) {
      onRedirectToLogin(window.location.pathname);
    }
    return null;
  }

  // Single permission guard
  if (requiredPermission && !hasPermission(user.role, requiredPermission, user.permissions)) {
    return (
      <Forbidden403
        requiredPermission={requiredPermission}
        onBackToDashboard={onBackToDashboard}
      />
    );
  }

  // Any-of permissions guard
  if (requiredPermissionsAny && requiredPermissionsAny.length > 0) {
    const hasAny = requiredPermissionsAny.some((perm) =>
      hasPermission(user.role, perm, user.permissions)
    );
    if (!hasAny) {
      return (
        <Forbidden403
          requiredPermission={requiredPermissionsAny.join(' / ')}
          onBackToDashboard={onBackToDashboard}
        />
      );
    }
  }

  return <>{children}</>;
};
