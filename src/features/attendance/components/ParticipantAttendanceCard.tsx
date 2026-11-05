import React from 'react';
import { Clock, MessageSquare, AlertTriangle, MoreVertical, CheckCircle2 } from 'lucide-react';
import { AttendanceRecord, AttendanceSessionParticipant, AttendanceStatus } from '../types';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { AttendanceMethodBadge } from './AttendanceMethodBadge';
import { AttendanceActionMenu } from './AttendanceActionMenu';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatAttendanceTime } from '../utils/attendanceUtils';

interface ParticipantAttendanceCardProps {
  participant: AttendanceSessionParticipant;
  record?: AttendanceRecord;
  onRecordStatus: (status: AttendanceStatus) => void;
  onOpenCorrection?: (record: AttendanceRecord) => void;
  allowCorrection?: boolean;
  isSessionOpen: boolean;
}

export const ParticipantAttendanceCard: React.FC<ParticipantAttendanceCardProps> = ({
  participant,
  record,
  onRecordStatus,
  onOpenCorrection,
  allowCorrection = true,
  isSessionOpen,
}) => {
  const isRecorded = Boolean(record);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        isRecorded
          ? 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
          : 'bg-zinc-900 border-zinc-800/90 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Student Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <PersonAvatar
            name={participant.student_name}
            size="md"
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
              {participant.student_name}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
              <span className="font-mono">{participant.student_number}</span>
              <span>•</span>
              <span className="font-semibold text-zinc-300">{participant.classroom_name || 'Santri'}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <AttendanceStatusBadge
            status={record ? record.status : 'unrecorded'}
            size="sm"
          />
        </div>
      </div>

      {/* Detail row: Time, Method, Notes or Action Menu */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap">
        {isRecorded && record ? (
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1 font-mono text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {formatAttendanceTime(record.check_in_at)}
            </span>
            <AttendanceMethodBadge method={record.method} size="sm" />
            {record.late_minutes > 0 && (
              <span className="text-[11px] font-bold text-amber-400">
                (+{record.late_minutes}m)
              </span>
            )}
            {record.notes && (
              <span className="text-[11px] text-zinc-400 italic line-clamp-1">
                "{record.notes}"
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
            <span>Menunggu Absensi</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="ml-auto">
          {isSessionOpen && (
            <AttendanceActionMenu
              onSelectStatus={onRecordStatus}
              isRecorded={isRecorded}
              currentStatus={record?.status}
              allowCorrection={allowCorrection}
              onOpenCorrection={() => record && onOpenCorrection && onOpenCorrection(record)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
