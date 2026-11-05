import React from 'react';
import { StaffAttendanceStatus } from '../../../types';
import { formatAttendanceStatus } from '../utils/staffAttendanceUtils';

interface StaffAttendanceStatusBadgeProps {
  status?: StaffAttendanceStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StaffAttendanceStatusBadge: React.FC<StaffAttendanceStatusBadgeProps> = ({
  status,
  className = '',
  size = 'sm'
}) => {
  const { label, badgeClass } = formatAttendanceStatus(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border whitespace-nowrap ${sizeClasses} ${badgeClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};
