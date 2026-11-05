import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'standard' | 'narrow' | 'wide' | 'full';
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'wide',
  className = '',
}) => {
  const maxWidthClass = {
    narrow: 'max-w-4xl',
    standard: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={`w-full ${maxWidthClass[maxWidth]} mx-auto px-3.5 sm:px-5 lg:px-8 py-4 sm:py-6 space-y-6 min-w-0 ${className}`}>
      {children}
    </div>
  );
};
