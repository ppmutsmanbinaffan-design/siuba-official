import React from 'react';
import { Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data dari server...',
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-[#1F5C45] dark:text-[#2F7D5A]" />
      <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
};

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Belum ada data',
  description = 'Data tidak ditemukan atau belum pernah diinputkan.',
  icon = <Inbox className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs ${className}`}>
      <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
        {icon}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Terjadi kesalahan sistem',
  message = 'Gagal memuat data dari server. Silakan coba kembali beberapa saat lagi.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 ${className}`}>
      <div className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-md">
        <h4 className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200">{title}</h4>
        <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={onRetry}
          className="mt-2"
        >
          Coba Lagi
        </Button>
      )}
    </div>
  );
};

