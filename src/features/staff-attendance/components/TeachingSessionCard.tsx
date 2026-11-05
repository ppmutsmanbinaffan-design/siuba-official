import React from 'react';
import { BookOpen, Clock, Users, QrCode, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { TeachingSession } from '../../../types';
import { StaffAttendanceStatusBadge } from './StaffAttendanceStatusBadge';
import { formatTeachingSessionStatus } from '../utils/staffAttendanceUtils';
import { Button } from '../../../components/ui/Button';

interface TeachingSessionCardProps {
  session: TeachingSession;
  onRecordManual?: (session: TeachingSession) => void;
  onOpenQr?: (session: TeachingSession) => void;
  onViewDetail?: (session: TeachingSession) => void;
}

export const TeachingSessionCard: React.FC<TeachingSessionCardProps> = ({
  session,
  onRecordManual,
  onOpenQr,
  onViewDetail,
}) => {
  const isRecorded = Boolean(session.teacher_attendance_status && session.teacher_attendance_status !== 'unrecorded');
  const isSubstituted = Boolean(session.is_substituted || session.substitute_teacher_id);
  const sessionStatus = formatTeachingSessionStatus(session.status);

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3">
      {/* Top Header: Time + Subject + Session Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 text-[#1F5C45] dark:text-[#2F7D5A] border border-zinc-800">
              {session.start_time} – {session.end_time}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sessionStatus.badgeClass}`}>
              {sessionStatus.label}
            </span>
          </div>
          <h4 className="text-sm font-bold text-zinc-100 mt-1 truncate">
            {session.subject_name} — {session.classroom_name}
          </h4>
        </div>

        {session.teacher_attendance_status && (
          <StaffAttendanceStatusBadge status={session.teacher_attendance_status} size="sm" />
        )}
      </div>

      {/* Teacher Assignment Breakdown */}
      <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-1.5">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] text-zinc-500">Guru Terjadwal:</span>
          <span className="font-semibold text-zinc-300 truncate max-w-[180px]">{session.teacher_name}</span>
        </div>

        {isSubstituted && (
          <div className="flex items-center justify-between text-cyan-300 pt-1 border-t border-zinc-800/40">
            <span className="text-[11px] font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" /> Guru Pengganti:
            </span>
            <span className="font-bold truncate max-w-[180px]">
              {session.actual_teacher_name || `Staf #${session.substitute_teacher_id}`}
            </span>
          </div>
        )}

        {/* Check-in info */}
        {session.teacher_check_in_at && (
          <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/40">
            <span className="text-[11px] text-zinc-500">Masuk Kelas:</span>
            <span className="font-mono text-zinc-300">
              {session.teacher_check_in_at.substring(11, 16)} WIB
              {session.late_minutes && session.late_minutes > 0 ? (
                <span className="text-amber-400 ml-1">({session.late_minutes}m terlambat)</span>
              ) : null}
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {onViewDetail && (
          <button
            onClick={() => onViewDetail(session)}
            className="text-xs text-zinc-400 hover:text-zinc-200 font-semibold underline underline-offset-2"
          >
            Lihat Detail
          </button>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {onOpenQr && session.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenQr(session)}
              className="text-xs border-[#1F5C45]/40 text-[#1F5C45] dark:text-[#2F7D5A] hover:bg-[#1F5C45]/10 min-h-[36px]"
            >
              <QrCode className="w-3.5 h-3.5 mr-1" />
              Scan QR
            </Button>
          )}

          {onRecordManual && session.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onRecordManual(session)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 min-h-[36px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {isRecorded ? 'Ubah' : 'Presensi'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
