import React from 'react';
import { CheckCircle2, XCircle, GraduationCap, ArrowRightCircle, ShieldAlert } from 'lucide-react';

export type EntityStatus = 'active' | 'inactive' | 'graduated' | 'transferred' | 'resigned' | 'leave' | boolean | string;

export interface StatusBadgeProps {
  status: EntityStatus;
  type?: 'student' | 'staff' | 'general';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'general',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (typeof status === 'boolean') {
    return status ? (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${sizeClasses} ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Aktif</span>
      </span>
    ) : (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 ${sizeClasses} ${className}`}
      >
        <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
        <span>Nonaktif</span>
      </span>
    );
  }

  const s = String(status).toLowerCase();

  switch (s) {
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${sizeClasses} ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Aktif</span>
        </span>
      );

    case 'inactive':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 ${sizeClasses} ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
          <span>Nonaktif</span>
        </span>
      );

    case 'graduated':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 ${sizeClasses} ${className}`}
        >
          <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <span>Lulus</span>
        </span>
      );

    case 'transferred':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${sizeClasses} ${className}`}
        >
          <ArrowRightCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Pindah</span>
        </span>
      );

    case 'resigned':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${sizeClasses} ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span>Keluar</span>
        </span>
      );

    case 'leave':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800 ${sizeClasses} ${className}`}
        >
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
          <span>Cuti</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 ${sizeClasses} ${className}`}
        >
          <span>{status}</span>
        </span>
      );
  }
};
