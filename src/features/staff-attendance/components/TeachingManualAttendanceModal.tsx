import React, { useState } from 'react';
import { TeachingSession, Staff, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { BookOpen, AlertCircle, Clock, CheckCircle2, Users } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';

interface TeachingManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TeachingSession | null;
  staffList: Staff[];
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const TeachingManualAttendanceModal: React.FC<TeachingManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  session,
  staffList,
  currentUser,
  onSuccess,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    session ? String(session.actual_teacher_staff_id || session.teacher_staff_id) : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!session) return null;

  const teachers = staffList.filter((s) => s.is_active && (s.staff_type === 'teacher' || s.id === session.teacher_staff_id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMessage('Pilih guru terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.recordTeachingAttendanceManual({
        sessionId: session.id,
        staffId: Number(selectedStaffId),
        substituteStaffId: session.substitute_teacher_id,
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
      setErrorMessage(err.message || 'Gagal mencatat kehadiran mengajar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Presensi Mengajar Guru (KBM)"
      description="Catat kehadiran guru di dalam kelas untuk jam pelajaran ini."
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
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 text-[#1F5C45] dark:text-[#2F7D5A] border border-zinc-800">
              {session.start_time} – {session.end_time} WIB
            </span>
            <span className="text-zinc-400 font-medium">{session.classroom_name}</span>
          </div>

          <h4 className="text-sm font-bold text-zinc-100">{session.subject_name}</h4>

          <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
            <span className="text-zinc-500">Guru Terjadwal:</span>
            <span className="font-semibold text-zinc-200">{session.teacher_name}</span>
          </div>

          {session.is_substituted && (
            <div className="flex items-center justify-between text-cyan-300 pt-1 border-t border-zinc-800/60">
              <span className="font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Guru Pengganti:
              </span>
              <span className="font-bold">{session.actual_teacher_name}</span>
            </div>
          )}
        </div>

        {/* Teacher Selector */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Guru yang Mengajar Sesi Ini</label>
          <Select
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Guru --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.staff_number})
              </option>
            ))}
          </Select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Catatan KBM (Opsional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Menggantikan tugas KBM bab 4"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || !selectedStaffId}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi Mengajar'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
