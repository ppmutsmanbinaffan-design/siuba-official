import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface DetailFieldProps {
  label: string;
  value?: React.ReactNode;
  copyable?: boolean;
  copyValue?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  copyable = false,
  copyValue,
  badge,
  icon,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = copyValue || (typeof value === 'string' ? value : '');
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = value === null || value === undefined || value === '' ? '-' : value;

  return (
    <div className={`py-2.5 sm:py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          {icon && <span className="text-zinc-600 dark:text-zinc-400">{icon}</span>}
          {label}
        </span>
        {badge}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words">
          {displayValue}
        </div>
        {copyable && value && value !== '-' && (
          <button
            type="button"
            onClick={handleCopy}
            title="Salin ke clipboard"
            className="p-1 rounded text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

export interface DetailSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  description,
  icon,
  action,
  children,
  columns = 2,
  className = '',
}) => {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2 gap-x-6',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6',
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-4 pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          {icon && <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">{icon}</div>}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {description && <p className="text-xs text-zinc-700 dark:text-zinc-300">{description}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className={`grid ${colClass[columns]}`}>
        {children}
      </div>
    </div>
  );
};
