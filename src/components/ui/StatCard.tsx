import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'default';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  variant = 'default',
  onClick,
  className = '',
}) => {
  const iconVariants = {
    primary: 'bg-[#1F5C45]/10 dark:bg-[#1F5C45]/20 text-[#1F5C45] dark:text-[#2F7D5A] border-[#1F5C45]/20',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    gold: 'bg-[#FDF7E7] dark:bg-amber-950/30 text-[#927318] dark:text-[#EADAA2] border-[#EADAA2] dark:border-amber-800',
    default: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className={`p-2.5 sm:p-3 rounded-xl border shrink-0 flex items-center justify-center ${iconVariants[variant]}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}
    </div>
  );
};

