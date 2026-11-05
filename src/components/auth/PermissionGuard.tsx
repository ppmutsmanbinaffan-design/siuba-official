import React from 'react';
import { User, UserRole } from '../../types';
import { ROLE_PERMISSIONS, hasPermission, can, canAny, canAll, getFirstAccessibleRoute } from '../../config/navigationRegistry';

export { ROLE_PERMISSIONS, hasPermission, can, canAny, canAll, getFirstAccessibleRoute };

export interface PermissionGuardProps {
  permission?: string;
  permissionsAny?: string[];
  permissionsAll?: string[];
  userRole?: UserRole;
  userPermissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissionsAny,
  permissionsAll,
  userRole,
  userPermissions,
  fallback = null,
  children,
}) => {
  let allowed = true;

  if (permission) {
    allowed = hasPermission(userRole, permission, userPermissions);
  }

  if (allowed && permissionsAny && permissionsAny.length > 0) {
    allowed = permissionsAny.some((p) => hasPermission(userRole, p, userPermissions));
  }

  if (allowed && permissionsAll && permissionsAll.length > 0) {
    allowed = permissionsAll.every((p) => hasPermission(userRole, p, userPermissions));
  }

  if (!allowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

// Reusable Can component for permission-aware UI rendering
export const Can: React.FC<{
  do?: string;
  any?: string[];
  all?: string[];
  role?: UserRole;
  permissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ do: permission, any: permissionsAny, all: permissionsAll, role, permissions, children, fallback = null }) => {
  return (
    <PermissionGuard
      permission={permission}
      permissionsAny={permissionsAny}
      permissionsAll={permissionsAll}
      userRole={role}
      userPermissions={permissions}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
};

