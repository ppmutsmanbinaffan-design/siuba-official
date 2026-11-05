import React, { useState } from 'react';
import { TrainingSession, Staff, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Award, AlertCircle, Users, ArrowRight } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';

interface TrainerSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TrainingSession[];
  staffList: Staff[];
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const TrainerSubstitutionModal: React.FC<TrainerSubstitutionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  staffList,
  currentUser,
  onSuccess,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [substituteStaffId, setSubstituteStaffId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedSession = sessions.find((s) => s.id === Number(selectedSessionId));
  const activeStaff = staffList.filter((s) => s.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) {
      setErrorMessage('Pilih sesi ekstrakurikuler terlebih dahulu.');
      return;
    }
    if (!substituteStaffId) {
      setErrorMessage('Pilih pelatih pengganti.');
      return;
    }
    if (Number(substituteStaffId) === selectedSession.coach_staff_id) {
      setErrorMessage('Pelatih pengganti tidak boleh sama dengan pelatih asli.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Isi alasan penugasan pelatih pengganti.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.createTrainerSubstitution({
        extracurricularId: selectedSession.extracurricular_id,
        extracurricularName: selectedSession.extracurricular_name,
        originalStaffId: selectedSession.coach_staff_id,
        substituteStaffId: Number(substituteStaffId),
        date: selectedSession.session_date,
        reason,
        assignedBy: currentUser.name,
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menugaskan pelatih pengganti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Penugasan Resmi Pelatih Pengganti"
      description="Delegasikan sesi latihan ekstrakurikuler ke pelatih pengganti resmi."
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
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Pilih Sesi Kegiatan Ekskul</label>
          <Select
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Sesi Ekskul --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.scheduled_start_at} - {s.extracurricular_name} ({s.location}) • Pelatih: {s.coach_name}
              </option>
            ))}
          </Select>
        </div>

        {selectedSession && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500">Pelatih Asli / Utama:</span>
              <span className="font-bold text-zinc-200">{selectedSession.coach_name}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-zinc-500">Ekstrakurikuler:</span>
              <span>
                {selectedSession.extracurricular_name} ({selectedSession.location})
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-cyan-400 block mb-1.5">Pilih Pelatih Pengganti</label>
          <Select
            value={substituteStaffId}
            onChange={(e) => {
              setSubstituteStaffId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Pelatih Pengganti --</option>
            {activeStaff
              .filter((s) => !selectedSession || s.id !== selectedSession.coach_staff_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.staff_number})
                </option>
              ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Alasan Delegasi / Penggantian</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Contoh: Pelatih utama sakit dan menyerahkan modul latihan"
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="default"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
            disabled={isSubmitting || !selectedSessionId || !substituteStaffId || !reason.trim()}
          >
            {isSubmitting ? 'Menugaskan...' : 'Tugaskan Pelatih Pengganti'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
