import React, { useState } from 'react';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Input';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { ATTENDANCE_STATUS_MAP } from '../utils/attendanceUtils';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { AlertCircle, History } from 'lucide-react';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSubmit: (recordId: number, newStatus: AttendanceStatus, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  onSubmit,
  isLoading = false,
}) => {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(record?.status || 'present');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    if (record) {
      setNewStatus(record.status);
      setReason('');
      setError('');
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan koreksi status absensi wajib diisi sesuai SOP audit trail.');
      return;
    }

    if (newStatus === record.status) {
      setError('Status baru harus berbeda dengan status saat ini.');
      return;
    }

    setError('');
    await onSubmit(record.id, newStatus, reason.trim());
    onClose();
  };

  const statusOptions: { value: AttendanceStatus; label: string }[] = [
    { value: 'present', label: 'Hadir' },
    { value: 'late', label: 'Terlambat' },
    { value: 'permission', label: 'Izin' },
    { value: 'sick', label: 'Sakit' },
    { value: 'dispensation', label: 'Dispensasi' },
    { value: 'absent', label: 'Alpha' },
  ];

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Koreksi Status Absensi"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Santri Info Banner */}
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Santri:</span>
            <span className="text-xs font-mono text-zinc-400">{record.student_number}</span>
          </div>
          <p className="text-sm font-bold text-zinc-100">{record.student_name}</p>
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-400">Status Saat Ini:</span>
            <AttendanceStatusBadge status={record.status} size="sm" />
          </div>
        </div>

        {/* New Status Select */}
        <Select
          label="Pilih Status Baru"
          required
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
          options={statusOptions}
        />

        {/* Reason Textarea (Mandatory) */}
        <Textarea
          label="Alasan Koreksi (Wajib Audit Trail)"
          required
          rows={3}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          placeholder="Contoh: Santri terlambat karena jadwal piket dapur diperpanjang atas instruksi Musyrif."
          hint="Setiap perubahan status akan dicatat dalam log riwayat audit trail."
          error={error}
        />

        {/* Warning Note */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Koreksi absensi memerlukan otorisasi peran berizin dan bersifat tidak dapat dihapus (immutable log).</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            Simpan Koreksi
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
