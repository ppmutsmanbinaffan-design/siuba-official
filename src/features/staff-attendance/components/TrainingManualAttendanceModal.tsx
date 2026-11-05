import React, { useState } from 'react';
import { TrainingSession, Staff, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Award, AlertCircle, Clock, CheckCircle2, Users, MapPin } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';

interface TrainingManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrainingSession | null;
  staffList: Staff[];
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const TrainingManualAttendanceModal: React.FC<TrainingManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  session,
  staffList,
  currentUser,
  onSuccess,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    session ? String(session.actual_coach_staff_id || session.coach_staff_id) : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!session) return null;

  const coaches = staffList.filter(
    (s) => s.is_active && (s.staff_type === 'coach' || s.staff_type === 'teacher' || s.id === session.coach_staff_id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMessage('Pilih pelatih terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.recordTrainingAttendanceManual({
        sessionId: session.id,
        staffId: Number(selectedStaffId),
        substituteStaffId: session.substitute_coach_staff_id,
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
      setErrorMessage(err.message || 'Gagal mencatat kehadiran pelatih.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Presensi Pelatih Ekstrakurikuler"
      description="Catat kehadiran pelatih/pembina pada sesi kegiatan ekstrakurikuler."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Session Context Banner */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 text-cyan-400 border border-zinc-800">
              {session.scheduled_start_at} – {session.scheduled_end_at} WIB
            </span>
            <span className="text-zinc-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-zinc-500" />
              {session.location}
            </span>
          </div>

          <h4 className="text-sm font-bold text-zinc-100">{session.extracurricular_name}</h4>

          <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
            <span className="text-zinc-500">Pelatih Terjadwal:</span>
            <span className="font-semibold text-zinc-200">{session.coach_name}</span>
          </div>

          {session.is_substituted && (
            <div className="flex items-center justify-between text-cyan-300 pt-1 border-t border-zinc-800/60">
              <span className="font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Pelatih Pengganti:
              </span>
              <span className="font-bold">{session.actual_coach_name}</span>
            </div>
          )}
        </div>

        {/* Coach Selector */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Pelatih yang Bertugas</label>
          <Select
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Pelatih --</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.staff_number})
              </option>
            ))}
          </Select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Catatan (Opsional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Latihan intensif persiapan turnamen"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || !selectedStaffId}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi Pelatih'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
