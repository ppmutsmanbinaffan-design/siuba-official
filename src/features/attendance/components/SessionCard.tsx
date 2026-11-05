import React from 'react';
import { Clock, MapPin, Users, CheckCircle2, AlertCircle, ArrowRight, QrCode, ClipboardCheck, Radio, Play, Check } from 'lucide-react';
import { AttendanceSession, Activity, AttendanceMethod } from '../types';
import { SessionStatusBadge } from './SessionStatusBadge';
import { AttendanceMethodBadge } from './AttendanceMethodBadge';
import { formatAttendanceTime, formatIndonesianDate } from '../utils/attendanceUtils';

interface SessionCardProps {
  session: AttendanceSession;
  activity?: Activity;
  totalEligible: number;
  recordedCount: number;
  unrecordedCount: number;
  onViewDetail: (sessionId: number) => void;
  onNavigateManual?: (sessionId: number) => void;
  onNavigateQr?: (sessionId: number) => void;
  onOpenSession?: (sessionId: number) => void;
  canManageSession?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  activity,
  totalEligible,
  recordedCount,
  unrecordedCount,
  onViewDetail,
  onNavigateManual,
  onNavigateQr,
  onOpenSession,
  canManageSession = true,
}) => {
  const completionRate = totalEligible > 0 ? Math.round((recordedCount / totalEligible) * 100) : 0;
  const isOpen = session.status === 'open';
  const isDraft = session.status === 'draft';
  const isClosed = session.status === 'closed';

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-md transition-all space-y-3.5 shadow-2xs">
      {/* Top row: Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 line-clamp-1">
              {session.activity_name}
            </h4>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {session.session_code}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatAttendanceTime(session.start_at)} – {formatAttendanceTime(session.end_at)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {session.location}
            </span>
          </div>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      {/* Progress & Metrics */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-600">
            Peserta: <strong className="text-slate-900">{totalEligible}</strong>
          </span>
          <span className="text-slate-600">
            Tercatat: <strong className="text-emerald-700">{recordedCount}</strong> | Belum: <strong className="text-amber-700">{unrecordedCount}</strong>
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
          <div
            style={{ width: `${completionRate}%` }}
            className={`h-full transition-all duration-300 ${
              completionRate === 100 ? 'bg-emerald-500' : completionRate > 50 ? 'bg-[#1F5C45]' : 'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Active Methods */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500 font-bold mr-1">Metode:</span>
        {activity?.allow_qr && <AttendanceMethodBadge method="qr" size="sm" />}
        {activity?.allow_rfid && <AttendanceMethodBadge method="rfid" size="sm" />}
        {activity?.allow_manual && <AttendanceMethodBadge method="manual" size="sm" />}
      </div>

      {/* Actions */}
      <div className="pt-2 flex items-center gap-2 justify-between border-t border-slate-100">
        <button
          onClick={() => onViewDetail(session.id)}
          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all flex items-center gap-1.5 min-h-[38px] cursor-pointer"
        >
          <span>Detail Sesi</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </button>

        <div className="flex items-center gap-1.5">
          {isDraft && onOpenSession && canManageSession && (
            <button
              onClick={() => onOpenSession(session.id)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#1F5C45] hover:bg-[#12372A] transition-all flex items-center gap-1.5 min-h-[38px] shadow-xs active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Buka Sesi</span>
            </button>
          )}

          {isOpen && onNavigateQr && activity?.allow_qr && (
            <button
              onClick={() => onNavigateQr(session.id)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all flex items-center gap-1.5 min-h-[40px]"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan QR</span>
            </button>
          )}

          {isOpen && onNavigateManual && (
            <button
              onClick={() => onNavigateManual(session.id)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#1F5C45] hover:bg-[#12372A] transition-all flex items-center gap-1.5 min-h-[40px] shadow-sm active:scale-95"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Absensi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
