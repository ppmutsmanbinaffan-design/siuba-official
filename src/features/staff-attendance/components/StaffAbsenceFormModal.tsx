import React, { useState } from 'react';
import { Staff, StaffAbsenceType, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { FileText, AlertCircle, Calendar } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { formatStaffType } from '../utils/staffAttendanceUtils';

interface StaffAbsenceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const StaffAbsenceFormModal: React.FC<StaffAbsenceFormModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUser,
  onSuccess,
}) => {
  // Check if current user is staff
  const selfStaff = staffList.find((s) => s.user_id === currentUser.id || s.email === currentUser.email);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(selfStaff ? String(selfStaff.id) : '');
  const [type, setType] = useState<StaffAbsenceType>('permission');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const activeStaff = staffList.filter((s) => s.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMessage('Pilih staf terlebih dahulu.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Isi alasan pengajuan ketidakhadiran.');
      return;
    }
    if (startDate > endDate) {
      setErrorMessage('Tanggal mulai tidak boleh melebihi tanggal selesai.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.createAbsenceRequest({
        staffId: Number(selectedStaffId),
        type,
        startAt: `${startDate}T07:00:00+07:00`,
        endAt: `${endDate}T17:00:00+07:00`,
        reason,
        operatorName: currentUser.name,
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengajukan permohonan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengajuan Izin, Sakit, Cuti & Dinas SDM"
      description="Formulir resmi permohonan dispensasi dan ketidakhadiran staf pesantren."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Nama Staf</label>
          <Select
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Staf --</option>
            {activeStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.staff_number} - {formatStaffType(s.staff_type)})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Jenis Ketidakhadiran</label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as StaffAbsenceType)}
            className="w-full"
          >
            <option value="permission">Izin Kepentingan Pribadi</option>
            <option value="sick">Sakit (Dengan / Tanpa Surat Dokter)</option>
            <option value="leave">Cuti Tahunan / Melahirkan / Ibadah</option>
            <option value="official_duty">Dinas Luar Pesantren (Tugas Khusus)</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Tanggal Mulai</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Tanggal Selesai</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Alasan / Uraian Pengajuan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Jelaskan keperluan izin atau detail dinas luar..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || !selectedStaffId || !reason.trim()}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
