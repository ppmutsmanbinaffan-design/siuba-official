import React from 'react';
import { AttendanceMethod } from '../types';
import { ATTENDANCE_METHOD_MAP } from '../utils/attendanceUtils';
import { QrCode, Radio, ClipboardCheck, Fingerprint, Smartphone, ScanFace } from 'lucide-react';

interface AttendanceMethodBadgeProps {
  method?: AttendanceMethod;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const AttendanceMethodBadge: React.FC<AttendanceMethodBadgeProps> = ({
  method = 'manual',
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const meta = ATTENDANCE_METHOD_MAP[method] || ATTENDANCE_METHOD_MAP.manual;

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
    switch (method) {
      case 'qr':
        return <QrCode className={iconSize} />;
      case 'rfid':
        return <Radio className={iconSize} />;
      case 'fingerprint':
        return <Fingerprint className={iconSize} />;
      case 'face':
        return <ScanFace className={iconSize} />;
      case 'mobile':
      case 'nfc':
        return <Smartphone className={iconSize} />;
      case 'manual':
      default:
        return <ClipboardCheck className={iconSize} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg ${meta.badgeBg} ${meta.badgeText} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      {renderIcon()}
      <span>{meta.label}</span>
    </span>
  );
};
