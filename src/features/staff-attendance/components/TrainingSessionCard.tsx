import React from 'react';
import { Award, Clock, MapPin, Users, QrCode, CheckCircle2, FileCheck, AlertTriangle } from 'lucide-react';
import { TrainingSession } from '../../../types';
import { StaffAttendanceStatusBadge } from './StaffAttendanceStatusBadge';
import { formatRealizationStatus } from '../utils/staffAttendanceUtils';
import { Button } from '../../../components/ui/Button';

interface TrainingSessionCardProps {
  session: TrainingSession;
  onRecordManual?: (session: TrainingSession) => void;
  onOpenQr?: (session: TrainingSession) => void;
  onOpenRealization?: (session: TrainingSession) => void;
  onViewDetail?: (session: TrainingSession) => void;
}

export const TrainingSessionCard: React.FC<TrainingSessionCardProps> = ({
  session,
  onRecordManual,
  onOpenQr,
  onOpenRealization,
  onViewDetail,
}) => {
  const isRecorded = Boolean(session.trainer_attendance_status && session.trainer_attendance_status !== 'unrecorded');
  const isSubstituted = Boolean(session.is_substituted || session.substitute_coach_staff_id);
  const realizationStatus = formatRealizationStatus(session.realization_status);

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3">
      {/* Top Header: Time + Extracurricular Name + Realization Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 text-cyan-400 border border-zinc-800">
              {session.scheduled_start_at} – {session.scheduled_end_at}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${realizationStatus.badgeClass}`}>
              {realizationStatus.label}
            </span>
          </div>
          <h4 className="text-sm font-bold text-zinc-100 mt-1 truncate">{session.extracurricular_name}</h4>
          <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
            <MapPin className="w-3 h-3 text-zinc-500" />
            <span>{session.location}</span>
          </div>
        </div>

        {session.trainer_attendance_status && (
          <StaffAttendanceStatusBadge status={session.trainer_attendance_status} size="sm" />
        )}
      </div>

      {/* Coach Info & Student Attendance Counter */}
      <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-1.5">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] text-zinc-500">Pelatih Terjadwal:</span>
          <span className="font-semibold text-zinc-300 truncate max-w-[180px]">{session.coach_name}</span>
        </div>

        {isSubstituted && (
          <div className="flex items-center justify-between text-cyan-300 pt-1 border-t border-zinc-800/40">
            <span className="text-[11px] font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" /> Pelatih Pengganti:
            </span>
            <span className="font-bold truncate max-w-[180px]">
              {session.actual_coach_name || `Staf #${session.substitute_coach_staff_id}`}
            </span>
          </div>
        )}

        {/* Student attendance summary clearly separated */}
        <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/40">
          <span className="text-[11px] text-zinc-500">Presensi Santri:</span>
          <span className="font-medium text-zinc-300">
            {session.student_present_count !== undefined
              ? `${session.student_present_count} / ${session.student_eligible_count || '—'} Hadir`
              : 'Belum diabsen'}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        {onViewDetail && (
          <button
            onClick={() => onViewDetail(session)}
            className="text-xs text-zinc-400 hover:text-zinc-200 font-semibold underline underline-offset-2"
          >
            Detail
          </button>
        )}

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {onOpenRealization && session.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenRealization(session)}
              className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10 min-h-[36px]"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1" />
              Jurnal
            </Button>
          )}

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
