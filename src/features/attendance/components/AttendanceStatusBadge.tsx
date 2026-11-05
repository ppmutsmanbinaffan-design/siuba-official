import React from 'react';
import { AttendanceStatus } from '../types';
import { ATTENDANCE_STATUS_MAP } from '../utils/attendanceUtils';

interface AttendanceStatusBadgeProps {
  status?: AttendanceStatus | 'unrecorded';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({
  status = 'unrecorded',
  size = 'md',
  showDot = true,
  className = '',
}) => {
  if (status === 'unrecorded') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        {showDot && <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />}
        <span>Belum Tercatat</span>
      </span>
    );
  }

  const meta = ATTENDANCE_STATUS_MAP[status] || ATTENDANCE_STATUS_MAP.present;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${meta.badgeBg} ${meta.badgeText} ${meta.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />}
      <span>{meta.label}</span>
    </span>
  );
};
