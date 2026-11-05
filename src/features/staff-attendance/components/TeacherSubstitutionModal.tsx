import React, { useState } from 'react';
import { TeachingSession, Staff, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Users, AlertCircle, BookOpen, ArrowRight } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';

interface TeacherSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TeachingSession[];
  staffList: Staff[];
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const TeacherSubstitutionModal: React.FC<TeacherSubstitutionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  staffList,
  currentUser,
  onSuccess,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [substituteTeacherId, setSubstituteTeacherId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedSession = sessions.find((s) => s.id === Number(selectedSessionId));
  const activeTeachers = staffList.filter((s) => s.is_active && s.staff_type === 'teacher');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) {
      setErrorMessage('Pilih sesi jadwal mengajar yang ingin digantikan.');
      return;
    }
    if (!substituteTeacherId) {
      setErrorMessage('Pilih guru pengganti.');
      return;
    }
    if (Number(substituteTeacherId) === selectedSession.teacher_staff_id) {
      setErrorMessage('Guru pengganti tidak boleh sama dengan guru utama.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Isi alasan penugasan guru pengganti.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.createTeacherSubstitution({
        academicScheduleId: selectedSession.academic_schedule_id,
        attendanceSessionId: selectedSession.attendance_session_id,
        date: selectedSession.session_date,
        originalTeacherStaffId: selectedSession.teacher_staff_id,
        substituteTeacherStaffId: Number(substituteTeacherId),
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
      setErrorMessage(err.message || 'Gagal menugaskan guru pengganti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Penugasan Resmi Guru Pengganti"
      description="Delegasikan sesi jam pelajaran ke guru pengganti resmi."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Teaching Session Selector */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Pilih Sesi Jadwal KBM</label>
          <Select
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Sesi Mengajar --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.start_time} - {s.subject_name} ({s.classroom_name}) • Guru: {s.teacher_name}
              </option>
            ))}
          </Select>
        </div>

        {/* Selected Session Info */}
        {selectedSession && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500">Guru Asli / Utama:</span>
              <span className="font-bold text-zinc-200">{selectedSession.teacher_name}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-zinc-500">Mata Pelajaran & Kelas:</span>
              <span>
                {selectedSession.subject_name} — {selectedSession.classroom_name}
              </span>
            </div>
          </div>
        )}

        {/* Substitute Teacher Selector */}
        <div>
          <label className="text-xs font-bold text-cyan-400 block mb-1.5">Pilih Guru Pengganti</label>
          <Select
            value={substituteTeacherId}
            onChange={(e) => {
              setSubstituteTeacherId(e.target.value);
              setErrorMessage('');
            }}
            required
            className="w-full"
          >
            <option value="">-- Pilih Guru Pengganti --</option>
            {activeTeachers
              .filter((t) => !selectedSession || t.id !== selectedSession.teacher_staff_id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.staff_number})
                </option>
              ))}
          </Select>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Alasan Delegasi / Penggantian</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Contoh: Guru utama sedang dinas luar kurikulum di LPMP"
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
            disabled={isSubmitting || !selectedSessionId || !substituteTeacherId || !reason.trim()}
          >
            {isSubmitting ? 'Menugaskan...' : 'Tugaskan Guru Pengganti'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
