import React from 'react';
import { SessionStatus } from '../types';
import { SESSION_STATUS_MAP } from '../utils/attendanceUtils';

interface SessionStatusBadgeProps {
  status: SessionStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({
  status = 'draft',
  size = 'md',
  className = '',
}) => {
  const meta = SESSION_STATUS_MAP[status] || SESSION_STATUS_MAP.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${meta.bg} ${meta.text} ${meta.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'open' ? 'bg-emerald-400 animate-pulse' : status === 'cancelled' ? 'bg-rose-400' : 'bg-zinc-400'}`} />
      <span>{meta.label}</span>
    </span>
  );
};
