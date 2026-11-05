import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2, Clock, FileText, XCircle, MoreHorizontal } from 'lucide-react';
import { AttendanceStatus } from '../types';
import { ATTENDANCE_STATUS_MAP } from '../utils/attendanceUtils';

interface AttendanceActionMenuProps {
  onSelectStatus: (status: AttendanceStatus) => void;
  disabled?: boolean;
  isRecorded?: boolean;
  currentStatus?: AttendanceStatus;
  onOpenCorrection?: () => void;
  allowCorrection?: boolean;
}

export const AttendanceActionMenu: React.FC<AttendanceActionMenuProps> = ({
  onSelectStatus,
  disabled = false,
  isRecorded = false,
  currentStatus,
  onOpenCorrection,
  allowCorrection = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isRecorded) {
    if (allowCorrection && onOpenCorrection) {
      return (
        <button
          onClick={onOpenCorrection}
          disabled={disabled}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white border border-zinc-700/60 transition-all min-h-[40px] flex items-center gap-1.5"
          title="Koreksi Status Absensi"
        >
          <MoreHorizontal className="w-4 h-4 text-zinc-400" />
          <span>Koreksi</span>
        </button>
      );
    }
    return null;
  }

  const otherStatuses: AttendanceStatus[] = ['late', 'permission', 'sick', 'dispensation', 'absent'];

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={menuRef}>
      {/* Primary 1-Tap Hadir Action */}
      <button
        onClick={() => onSelectStatus('present')}
        disabled={disabled}
        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1F5C45] hover:bg-[#12372A] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 min-h-[40px] shadow-xs active:scale-95 cursor-pointer"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Hadir</span>
      </button>

      {/* Dropdown for other status options */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700/60 transition-all flex items-center justify-center min-h-[40px] min-w-[40px] active:scale-95"
          aria-label="Pilih Status Absensi Lainnya"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-1 sm:mb-0 sm:mt-1.5 z-30 w-44 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-1.5 space-y-1 backdrop-blur-md">
            {otherStatuses.map((st) => {
              const meta = ATTENDANCE_STATUS_MAP[st];
              return (
                <button
                  key={st}
                  onClick={() => {
                    onSelectStatus(st);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between hover:${meta.bg} hover:${meta.text} text-zinc-300`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                    <span>{meta.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500">{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
