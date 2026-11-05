import React from 'react';
import { Clock, Users, ArrowRight, QrCode, ClipboardCheck, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { OpenSessionMonitoringData } from '../types';
import { AttendanceMethodBadge } from './AttendanceMethodBadge';
import { formatAttendanceTime } from '../utils/attendanceUtils';

interface OpenSessionMonitoringCardProps {
  data: OpenSessionMonitoringData;
  onNavigateDetail: (sessionId: number) => void;
  onNavigateManual: (sessionId: number) => void;
  onNavigateQr: (sessionId: number) => void;
}

export const OpenSessionMonitoringCard: React.FC<OpenSessionMonitoringCardProps> = ({
  data,
  onNavigateDetail,
  onNavigateManual,
  onNavigateQr,
}) => {
  const { session, activity, totalEligible, recordedCount, unrecordedCount, presentCount, lateCount, completionRate, lastScanAt, lastStudentName } = data;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-md transition-all space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{session.activity_name}</h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {session.session_code}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatAttendanceTime(session.start_at)} – {formatAttendanceTime(session.end_at)}
            </span>
            <span>•</span>
            <span>{session.location}</span>
          </div>
        </div>

        {/* Big percentage pill */}
        <div className="text-right">
          <span className="text-2xl font-black text-emerald-700">{completionRate}%</span>
          <span className="block text-[10px] text-slate-500 font-bold">Tercatat</span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 flex shadow-inner">
          <div
            style={{ width: `${completionRate}%` }}
            className={`h-full transition-all duration-500 ${
              completionRate === 100 ? 'bg-emerald-500' : 'bg-[#1F5C45]'
            }`}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
          <span>Peserta: <strong className="text-slate-900">{totalEligible}</strong></span>
          <span>
            Hadir: <strong className="text-emerald-700">{presentCount}</strong> | Terlambat: <strong className="text-amber-700">{lateCount}</strong> | Sisa: <strong className="text-rose-700">{unrecordedCount}</strong>
          </span>
        </div>
      </div>

      {/* Last Scan Live Feed snippet */}
      {lastStudentName && (
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-500 font-medium">Scan Terakhir:</span>
            <strong className="text-slate-900 font-bold truncate">{lastStudentName}</strong>
          </div>
          {lastScanAt && (
            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              {formatAttendanceTime(lastScanAt)}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => onNavigateDetail(session.id)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all flex items-center gap-1.5 min-h-[38px] cursor-pointer"
        >
          <span>Detail Sesi</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </button>

        <div className="flex items-center gap-2">
          {activity?.allow_qr && (
            <button
              onClick={() => onNavigateQr(session.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Live QR</span>
            </button>
          )}

          <button
            onClick={() => onNavigateManual(session.id)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1F5C45] hover:bg-[#12372A] transition-all flex items-center gap-1.5 min-h-[40px] shadow-xs cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Absensi Manual</span>
          </button>
        </div>
      </div>
    </div>
  );
};
