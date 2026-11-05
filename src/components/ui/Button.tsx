import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode | number | string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  icon,
  badge,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const effectiveLeftIcon = leftIcon || icon;

  // Base styles: Standardized height, accessible touch target, smooth states
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 cursor-pointer';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 rounded-lg min-h-[36px] gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 rounded-xl min-h-[42px] sm:min-h-[44px] gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 rounded-xl min-h-[48px] gap-2.5',
    icon: 'p-2.5 rounded-xl min-h-[42px] min-w-[42px] sm:min-h-[44px] sm:min-w-[44px] justify-center items-center',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[#1F5C45] hover:bg-[#12372A] text-white shadow-xs focus:ring-[#1F5C45]',
    secondary: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 focus:ring-zinc-400',
    outline: 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 focus:ring-[#1F5C45]',
    ghost: 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:ring-zinc-400',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500',
    gold: 'bg-[#C9A227] hover:bg-[#B28E1D] text-white shadow-xs focus:ring-amber-500',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {effectiveLeftIcon && <span className="shrink-0 flex items-center">{effectiveLeftIcon}</span>}
          {children}
          {badge !== undefined && badge !== null && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-current leading-none">
              {badge}
            </span>
          )}
          {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
  isLoading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'outline',
  size = 'md',
  ariaLabel,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg',
    md: 'w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] rounded-xl',
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl',
  };

  return (
    <Button
      variant={variant}
      size="icon"
      aria-label={ariaLabel}
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
};

