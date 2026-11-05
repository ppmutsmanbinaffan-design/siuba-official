import React, { useEffect } from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { QrScanHistoryItem } from '../types';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { AttendanceMethodBadge } from './AttendanceMethodBadge';
import { AudioFeedbackService } from '../../../services/audioFeedbackService';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatAttendanceTime } from '../utils/attendanceUtils';

interface ScanResultCardProps {
  lastResult: QrScanHistoryItem | null;
  onClear?: () => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  lastResult,
  onClear,
}) => {
  useEffect(() => {
    if (lastResult) {
      if (lastResult.resultCode === 'SUCCESS') {
        if (lastResult.status === 'late') {
          AudioFeedbackService.playLate();
        } else {
          AudioFeedbackService.playSuccess();
        }
      } else if (lastResult.resultCode === 'ALREADY_RECORDED') {
        AudioFeedbackService.playDuplicate();
      } else {
        AudioFeedbackService.playError();
      }
      AudioFeedbackService.triggerHaptic(lastResult.resultCode === 'SUCCESS' ? 100 : 250);
    }
  }, [lastResult]);

  if (!lastResult) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1F5C45] border border-emerald-100 mx-auto flex items-center justify-center shadow-2xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Siap Memindai QR Santri</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
            Arahkan kamera ke barcode/QR kartu santri atau masukkan kode token untuk mencatat presensi otomatis.
          </p>
        </div>
      </div>
    );
  }

  const isSuccess = lastResult.resultCode === 'SUCCESS';
  const isDuplicate = lastResult.resultCode === 'ALREADY_RECORDED';
  const isLate = isSuccess && lastResult.status === 'late';
  const isError = !isSuccess && !isDuplicate;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all shadow-md animate-in fade-in zoom-in-95 duration-200 ${
        isLate
          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
          : isSuccess
          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
          : isDuplicate
          ? 'bg-slate-50 border-amber-300 text-slate-900'
          : 'bg-rose-50/90 border-rose-300 text-rose-950'
      }`}
    >
      {/* Header Status Line */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
          {isLate ? (
            <>
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800">TERLAMBAT ({lastResult.lateMinutes} Menit)</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-800">✓ ABSENSI BERHASIL</span>
            </>
          ) : isDuplicate ? (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800">SUDAH TERCATAT</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-rose-600" />
              <span className="text-rose-800">ABSENSI DITOLAK</span>
            </>
          )}
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-700 shadow-2xs">
          {formatAttendanceTime(lastResult.checkInAt)} WIB
        </span>
      </div>

      {/* Body: Student Profile or Error Message */}
      <div className="py-4 flex items-start gap-3.5">
        <PersonAvatar
          name={lastResult.studentName || 'Santri'}
          photoUrl={lastResult.photoPath}
          size="lg"
          className="shrink-0 border-2 border-white shadow-md rounded-2xl"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
            {lastResult.studentName}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
            <span className="font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
              {lastResult.studentNumber}
            </span>
            <span>•</span>
            <span className="font-bold text-slate-700">{lastResult.classroomName || 'Santri'}</span>
          </div>

          <p className="text-xs font-medium text-slate-600 pt-1 leading-relaxed">
            {lastResult.message}
          </p>

          {isDuplicate && lastResult.originalMethod && (
            <div className="text-[11px] font-semibold text-amber-800 pt-1">
              Tercatat sebelumnya melalui metode <strong>{lastResult.originalMethod.toUpperCase()}</strong>
              {lastResult.originalTime && ` pukul ${formatAttendanceTime(lastResult.originalTime)} WIB`}.
            </div>
          )}
        </div>
      </div>

      {/* Footer / Meta */}
      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Metode Input:</span>
          <AttendanceMethodBadge method={lastResult.method} size="sm" />
        </div>
        <span className="text-[11px] font-bold text-slate-400">Siap scan santri berikutnya</span>
      </div>
    </div>
  );
};
