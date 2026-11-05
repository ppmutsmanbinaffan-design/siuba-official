import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outline' | 'gradient';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs',
    subtle: 'bg-zinc-50/70 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 shadow-none',
    outline: 'bg-transparent border-zinc-200 dark:border-zinc-800',
    gradient: 'bg-linear-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-zinc-200 dark:border-zinc-800 shadow-xs',
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 transition-all ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3 className={`text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p className={`text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

