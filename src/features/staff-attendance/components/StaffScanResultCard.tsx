import React, { useEffect } from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, LogOut, Sparkles, BookOpen, Award } from 'lucide-react';
import { StaffScanFeedbackItem } from '../types';
import { StaffAttendanceStatusBadge } from './StaffAttendanceStatusBadge';
import { AudioFeedbackService } from '../../../services/audioFeedbackService';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatTimeWib, formatStaffType, maskQrToken } from '../utils/staffAttendanceUtils';

interface StaffScanResultCardProps {
  lastResult: StaffScanFeedbackItem | null;
  onClear?: () => void;
}

export const StaffScanResultCard: React.FC<StaffScanResultCardProps> = ({
  lastResult,
  onClear,
}) => {
  useEffect(() => {
    if (lastResult) {
      if (lastResult.success) {
        if (lastResult.status === 'late' || (lastResult.lateMinutes && lastResult.lateMinutes > 0)) {
          AudioFeedbackService.playLate();
        } else {
          AudioFeedbackService.playSuccess();
        }
      } else if (lastResult.resultCode === 'ALREADY_CHECKED_IN' || lastResult.resultCode === 'ALREADY_CHECKED_OUT') {
        AudioFeedbackService.playDuplicate();
      } else {
        AudioFeedbackService.playError();
      }
      AudioFeedbackService.triggerHaptic(lastResult.success ? 100 : 250);
    }
  }, [lastResult]);

  if (!lastResult) {
    return (
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 text-center space-y-2">
        <div className="w-10 h-10 rounded-2xl bg-slate-100/80 text-slate-500 mx-auto flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-slate-700">Siap Memindai QR Presensi SDM</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Arahkan kamera ke QR kartu staf, barcode pegawai, atau masukkan token untuk memproses presensi.
        </p>
      </div>
    );
  }

  const isSuccess = lastResult.success;
  const isDuplicate = lastResult.resultCode === 'ALREADY_CHECKED_IN' || lastResult.resultCode === 'ALREADY_CHECKED_OUT';
  const isLate = isSuccess && (lastResult.status === 'late' || (lastResult.lateMinutes && lastResult.lateMinutes > 0));
  const isCheckOut = lastResult.mode === 'CHECK_OUT';

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
        isLate
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
          : isCheckOut
          ? 'bg-teal-500/10 border-teal-500/40 text-teal-100'
          : isSuccess
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
          : isDuplicate
          ? 'bg-white border-amber-500/30 text-slate-800'
          : 'bg-rose-500/10 border-rose-500/40 text-rose-100'
      }`}
    >
      {/* Header Status Line */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
          {isLate ? (
            <>
              <Clock className="w-5 h-5 text-amber-700" />
              <span className="text-amber-700">TERLAMBAT ({lastResult.lateMinutes} Menit)</span>
            </>
          ) : isCheckOut ? (
            <>
              <LogOut className="w-5 h-5 text-teal-700" />
              <span className="text-teal-700">✓ CHECK-OUT BERHASIL</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span className="text-emerald-700">✓ CHECK-IN BERHASIL</span>
            </>
          ) : isDuplicate ? (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              <span className="text-amber-700">SUDAH TERCATAT</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-rose-700" />
              <span className="text-rose-700">PRESENSI DITOLAK</span>
            </>
          )}
        </div>

        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg bg-black/40 text-slate-700">
          {formatTimeWib(lastResult.timestamp)}
        </span>
      </div>

      {/* Context Badge if applicable */}
      {lastResult.contextName && (
        <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          {lastResult.attendanceType === 'teaching' ? (
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
          ) : lastResult.attendanceType === 'training' ? (
            <Award className="w-3.5 h-3.5 text-purple-700" />
          ) : null}
          <span>{lastResult.contextName}</span>
        </div>
      )}

      {/* Body: Staff Profile or Error Message */}
      <div className="py-3.5 flex items-start gap-3.5">
        <PersonAvatar
          name={lastResult.staffName || lastResult.staff?.name || 'Staf'}
          photoUrl={lastResult.staff?.photo}
          className="w-12 h-12 rounded-2xl shrink-0 ring-2 ring-slate-300/50"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-slate-900 truncate">
              {lastResult.staffName || lastResult.staff?.name || 'Identitas Staf'}
            </h4>
            {lastResult.status && <StaffAttendanceStatusBadge status={lastResult.status} />}
          </div>

          <p className="text-xs text-slate-600 font-mono mt-0.5">
            {lastResult.staffNumber || lastResult.staff?.staff_number || '—'} • {formatStaffType(lastResult.staffType || lastResult.staff?.staff_type)}
          </p>

          <p className={`text-xs mt-2 leading-relaxed font-medium ${isSuccess ? 'text-slate-700' : 'text-rose-700'}`}>
            {lastResult.message}
          </p>

          {/* Early leave note */}
          {lastResult.earlyLeaveMinutes && lastResult.earlyLeaveMinutes > 0 ? (
            <div className="mt-2 text-xs font-medium text-amber-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Pulang lebih awal: {lastResult.earlyLeaveMinutes} menit sebelum jam selesai.</span>
            </div>
          ) : null}
        </div>
      </div>

      {onClear && (
        <div className="pt-2 border-t border-slate-200/60 flex justify-end">
          <button
            onClick={onClear}
            className="text-xs text-slate-600 hover:text-slate-800 font-semibold px-2 py-1 rounded hover:bg-slate-100/60"
          >
            Tutup Notifikasi
          </button>
        </div>
      )}
    </div>
  );
};
