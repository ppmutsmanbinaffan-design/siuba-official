import React from 'react';
import { AuthStatus } from '../../services/authService';
import { AuthLoadingScreen } from './AuthLoadingScreen';

export interface GuestRouteProps {
  status: AuthStatus;
  children: React.ReactNode;
  onRedirectToApp?: () => void;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({
  status,
  children,
  onRedirectToApp,
}) => {
  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    if (onRedirectToApp) {
      onRedirectToApp();
    }
    return null;
  }

  return <>{children}</>;
};
