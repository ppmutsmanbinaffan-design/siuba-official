import React, { useState } from 'react';
import { TrainingSession, User } from '../../../types';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FileCheck, AlertCircle, Award, Clock, Users } from 'lucide-react';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';

interface TrainingRealizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrainingSession | null;
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const TrainingRealizationModal: React.FC<TrainingRealizationModalProps> = ({
  isOpen,
  onClose,
  session,
  currentUser,
  onSuccess,
}) => {
  const [topic, setTopic] = useState<string>(session?.topic || '');
  const [activityNotes, setActivityNotes] = useState<string>(session?.activity_notes || '');
  const [obstacles, setObstacles] = useState<string>(session?.obstacles || '');
  const [studentPresentCount, setStudentPresentCount] = useState<string>(
    session?.student_present_count !== undefined ? String(session.student_present_count) : ''
  );
  const [studentEligibleCount, setStudentEligibleCount] = useState<string>(
    session?.student_eligible_count !== undefined ? String(session.student_eligible_count) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMessage('Materi / topik latihan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await StaffAttendanceApi.submitTrainingRealization({
        sessionId: session.id,
        topic,
        activityNotes,
        obstacles,
        studentPresentCount: studentPresentCount ? Number(studentPresentCount) : undefined,
        studentEligibleCount: studentEligibleCount ? Number(studentEligibleCount) : undefined,
        operatorName: currentUser.name,
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan jurnal realisasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Jurnal Realisasi Kegiatan Ekstrakurikuler"
      description={`Pengisian berita acara & materi latihan untuk ${session.extracurricular_name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Session Details Box */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="font-bold text-sm text-purple-400">{session.extracurricular_name}</span>
            <span className="font-mono text-zinc-400">
              {session.session_date} ({session.scheduled_start_at} - {session.scheduled_end_at} WIB)
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Pelatih: {session.actual_coach_name || session.coach_name}</span>
            <span>Lokasi: {session.location}</span>
          </div>
        </div>

        {/* Topic / Materi */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Topik / Materi Latihan yang Disampaikan</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            placeholder="Contoh: Teknik dasar kuda-kuda & akurasi bidikan jarak 15m"
          />
        </div>

        {/* Santri Attendance Count */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Jumlah Santri Hadir</label>
            <Input
              type="number"
              min="0"
              value={studentPresentCount}
              onChange={(e) => setStudentPresentCount(e.target.value)}
              placeholder="Jumlah hadir"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Total Anggota Terdaftar</label>
            <Input
              type="number"
              min="0"
              value={studentEligibleCount}
              onChange={(e) => setStudentEligibleCount(e.target.value)}
              placeholder="Total kuota/anggota"
            />
          </div>
        </div>

        {/* Activity Notes */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Uraian Jalannya Latihan & Perkembangan</label>
          <textarea
            value={activityNotes}
            onChange={(e) => setActivityNotes(e.target.value)}
            rows={3}
            placeholder="Catatan pelaksanaan, capaian santri, atau instruksi khusus..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        {/* Obstacles / Kendala */}
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Kendala / Kebutuhan Sarpras (Opsional)</label>
          <Input
            value={obstacles}
            onChange={(e) => setObstacles(e.target.value)}
            placeholder="Contoh: 2 busur panah membutuhkan penggantian tali string"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="default"
            className="bg-purple-600 hover:bg-purple-500 text-white"
            disabled={isSubmitting || !topic.trim()}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal Realisasi'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};
