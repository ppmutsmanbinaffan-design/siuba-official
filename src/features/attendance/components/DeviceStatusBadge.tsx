import React from 'react';
import { DEVICE_STATUS_MAP } from '../utils/attendanceUtils';

interface DeviceStatusBadgeProps {
  status: 'online' | 'offline' | 'disabled' | 'unknown';
  size?: 'sm' | 'md';
  className?: string;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  status = 'offline',
  size = 'md',
  className = '',
}) => {
  const meta = DEVICE_STATUS_MAP[status] || DEVICE_STATUS_MAP.offline;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border border-zinc-800 ${meta.bg} ${meta.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      <span>{meta.label}</span>
    </span>
  );
};
