import React, { useState } from 'react';
import { StaffAbsenceRequest, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { formatAbsenceType, formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface StaffAbsenceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: StaffAbsenceRequest | null;
  mode: 'approve' | 'reject';
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const StaffAbsenceApprovalModal: React.FC<StaffAbsenceApprovalModalProps> = ({
  isOpen,
  onClose,
  request,
  mode,
  currentUser,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!request) return null;

  const typeInfo = formatAbsenceType(request.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (mode === 'approve') {
        const res = await StaffAttendanceApi.approveAbsenceRequest({
          id: request.id,
          approverName: currentUser.name,
        });
        if (res.success) {
          onSuccess(res.message);
          onClose();
        } else {
          setErrorMessage(res.message);
        }
      } else {
        if (!rejectionReason.trim()) {
          setErrorMessage('Alasan penolakan wajib diisi.');
          setIsSubmitting(false);
          return;
        }

        const res = await StaffAttendanceApi.rejectAbsenceRequest({
          id: request.id,
          approverName: currentUser.name,
          rejectionReason,
        });
        if (res.success) {
          onSuccess(res.message);
          onClose();
        } else {
          setErrorMessage(res.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses permohonan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'approve' ? 'Konfirmasi Persetujuan Izin / Cuti' : 'Konfirmasi Penolakan Pengajuan'}
      description={`Permohonan ketidakhadiran atas nama ${request.staff_name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200 text-sm">{request.staff_name}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${typeInfo.badgeClass}`}>
              {typeInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              {formatDateIndonesian(request.start_at.substring(0, 10))} s/d {formatDateIndonesian(request.end_at.substring(0, 10))}
            </span>
          </div>

          <p className="text-zinc-300 pt-1 border-t border-zinc-800/60 leading-relaxed">
            <span className="text-zinc-500">Alasan: </span>
            {request.reason}
          </p>
        </div>

        {mode === 'reject' && (
          <div>
            <label className="text-xs font-bold text-rose-400 block mb-1.5">Alasan Penolakan (Wajib)</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              required
              placeholder="Jelaskan alasan permohonan ini ditolak..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-rose-500/40 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          {mode === 'approve' ? (
            <Button type="submit" variant="default" className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Menyetujui...' : 'Setujui Pengajuan'}
            </Button>
          ) : (
            <Button type="submit" variant="destructive" disabled={isSubmitting || !rejectionReason.trim()}>
              {isSubmitting ? 'Menolak...' : 'Tolak Pengajuan'}
            </Button>
          )}
        </div>
      </form>
    </ResponsiveModal>
  );
};
