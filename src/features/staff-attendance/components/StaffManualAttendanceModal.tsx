import React, { useState } from 'react';
import { Staff, StaffAttendanceRecord, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { LogIn, LogOut, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { formatStaffType } from '../utils/staffAttendanceUtils';

interface StaffManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  existingRecords: StaffAttendanceRecord[];
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const StaffManualAttendanceModal: React.FC<StaffManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  staffList,
  existingRecords,
  currentUser,
  onSuccess,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [action, setAction] = useState<'check_in' | 'check_out'>('check_in');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const activeStaff = staffList.filter((s) => s.is_active);
  const selectedStaff = activeStaff.find((s) => s.id === Number(selectedStaffId));
  const today = new Date().toISOString().substring(0, 10);
  const currentRecord = selectedStaff
    ? existingRecords.find((r) => r.staff_id === selectedStaff.id && r.attendance_date === today)
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMessage('Pilih staf terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.recordDailyManual({
        staffId: Number(selectedStaffId),
        action,
        notes,
        operatorName: currentUser.name,
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memproses presensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Presensi Manual SDM"
      description="Catat check-in atau check-out harian staf kantor/guru/pelatih secara manual."
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
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Pilih Staf Pegawai / Guru</label>
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

        {/* Selected Staff Info Box */}
        {selectedStaff && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500">Status Kehadiran Hari Ini:</span>
              <span className="font-semibold text-emerald-400">
                {currentRecord
                  ? currentRecord.check_out_at
                    ? 'Sudah Check-in & Check-out'
                    : 'Sudah Check-in (Belum Check-out)'
                  : 'Belum Ada Presensi Hari Ini'}
              </span>
            </div>

            {currentRecord?.check_in_at && (
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Waktu Check-in:</span>
                <span className="font-mono">{currentRecord.check_in_at.substring(11, 16)} WIB</span>
              </div>
            )}
          </div>
        )}

        {/* Action Type */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Jenis Aksi Presensi</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAction('check_in')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                action === 'check_in'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Check-in (Masuk)
            </button>

            <button
              type="button"
              onClick={() => setAction('check_out')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                action === 'check_out'
                  ? 'bg-teal-500/10 border-teal-500/50 text-teal-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Check-out (Pulang)
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Catatan / Alasan Manual (Opsional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Lupa scan kartu saat masuk lobi"
          />
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-[11px] text-zinc-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Waktu presensi dan status keterlambatan dihitung secara otoritatif oleh server backend.</span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || !selectedStaffId}>
            {isSubmitting ? 'Memproses...' : 'Simpan Presensi Manual'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
