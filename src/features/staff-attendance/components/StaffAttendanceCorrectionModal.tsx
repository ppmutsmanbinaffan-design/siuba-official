import React, { useState } from 'react';
import { StaffAttendanceRecord, StaffAttendanceStatus, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Edit3, AlertCircle, ShieldAlert } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';

interface StaffAttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: StaffAttendanceRecord | null;
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const StaffAttendanceCorrectionModal: React.FC<StaffAttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSuccess,
}) => {
  const [status, setStatus] = useState<StaffAttendanceStatus>(record?.status || 'present');
  const [lateMinutes, setLateMinutes] = useState<string>(String(record?.late_minutes || 0));
  const [earlyLeaveMinutes, setEarlyLeaveMinutes] = useState<string>(String(record?.early_leave_minutes || 0));
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Alasan koreksi data wajib diisi untuk kepatuhan audit trail.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.correctDailyAttendance({
        recordId: record.id,
        status,
        lateMinutes: Number(lateMinutes) || 0,
        earlyLeaveMinutes: Number(earlyLeaveMinutes) || 0,
        notes: reason,
        operatorName: currentUser.name,
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan koreksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Koreksi Presensi Harian SDM"
      description="Koreksi administratif catatan kehadiran dengan pencatatan audit trail."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
          <div className="font-bold text-zinc-200">{record.staff_name}</div>
          <div className="text-zinc-400 font-mono">
            {record.attendance_date} • {record.staff_number}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Status Kehadiran Baru</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StaffAttendanceStatus)}
            className="w-full"
          >
            <option value="present">Hadir Tepat Waktu</option>
            <option value="late">Terlambat</option>
            <option value="permission">Izin</option>
            <option value="sick">Sakit</option>
            <option value="leave">Cuti</option>
            <option value="official_duty">Dinas Luar</option>
            <option value="alpha">Alpha / Tanpa Keterangan</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Keterlambatan (Menit)</label>
            <Input
              type="number"
              min="0"
              value={lateMinutes}
              onChange={(e) => setLateMinutes(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Pulang Cepat (Menit)</label>
            <Input
              type="number"
              min="0"
              value={earlyLeaveMinutes}
              onChange={(e) => setEarlyLeaveMinutes(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Alasan Koreksi (Wajib Masuk Audit Log)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
            placeholder="Contoh: Koreksi mesin RFID mati lampu di gerbang barat pukul 07:00"
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Koreksi'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
