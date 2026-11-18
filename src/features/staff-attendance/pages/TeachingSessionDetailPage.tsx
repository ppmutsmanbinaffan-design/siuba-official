import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  ArrowLeft, 
  Clock, 
  Users, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck} from 'lucide-react';
import { User, Staff, TeachingSession } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { StaffAttendanceStatusBadge } from '../components/StaffAttendanceStatusBadge';
import { TeachingManualAttendanceModal } from '../components/TeachingManualAttendanceModal';
import { TeacherSubstitutionModal } from '../components/TeacherSubstitutionModal';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatTeachingSessionStatus, formatDateIndonesian, formatTimeWib } from '../utils/staffAttendanceUtils';

interface TeachingSessionDetailPageProps {
  sessionId: number;
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeachingSessionDetailPage: React.FC<TeachingSessionDetailPageProps> = ({
  sessionId,
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [session, setSession] = useState<TeachingSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState<boolean>(false);
  const [journalTopic, setJournalTopic] = useState<string>('');
  const [journalNotes, setJournalNotes] = useState<string>('');
  const [journalCount, setJournalCount] = useState<string>('');
  const [isSavingJournal, setIsSavingJournal] = useState<boolean>(false);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StaffAttendanceApi.getTeachingSessionDetail(sessionId);
      if (res.data) {
        setSession(res.data);
        setJournalTopic(res.data.topic || '');
        setJournalNotes(res.data.journal_notes || '');
        setJournalCount(res.data.student_present_count != null ? String(res.data.student_present_count) : '');
      } else {
        showToast('Sesi mengajar tidak ditemukan.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal memuat detail sesi mengajar: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!journalTopic.trim()) {
      showToast('Materi / pokok bahasan wajib diisi.', 'error');
      return;
    }
    setIsSavingJournal(true);
    const res = await StaffAttendanceApi.submitTeachingJournal({
      sessionId: session.id,
      topic: journalTopic.trim(),
      notes: journalNotes.trim(),
      studentPresentCount: journalCount === '' ? null : Number(journalCount),
    });
    setIsSavingJournal(false);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) loadSession();
  };

  if (isLoading) {
    return <LoadingState message="Memuat detail sesi mengajar..." />;
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-slate-600 space-y-4">
        <p>Sesi mengajar tidak ditemukan.</p>
        <Button variant="secondary" onClick={() => onNavigate('teaching-attendance')}>
          Kembali ke Daftar Mengajar
        </Button>
      </div>
    );
  }

  const sessionStatus = formatTeachingSessionStatus(session.status);
  const isSubstituted = Boolean(session.is_substituted || session.substitute_teacher_id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xl">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('teaching-attendance')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-9 w-9 p-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sessionStatus.badgeClass}`}>
                {sessionStatus.label}
              </span>
              <span className="text-xs text-slate-600 font-mono">
                {formatDateIndonesian(session.session_date)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {session.subject_name} — {session.classroom_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {session.status !== 'cancelled' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSubstitutionModalOpen(true)}
                className="text-xs border-cyan-500/40 text-cyan-700 hover:bg-cyan-500/10"
              >
                <Users className="w-3.5 h-3.5 mr-1" />
                Guru Pengganti
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate('teaching-qr-scanner', { sessionId: session.id })}
                className="text-xs border-[#1F5C45]/40 text-[#1F5C45] dark:text-[#2F7D5A] hover:bg-[#1F5C45]/10 font-bold"
              >
                <QrCode className="w-3.5 h-3.5 mr-1" />
                Scan QR Sesi Ini
              </Button>

              <Button
                size="sm"
                variant="default"
                onClick={() => setIsManualModalOpen(true)}
                className="text-xs bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Presensi Manual
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-lg space-y-1.5">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" /> Jam Tatap Muka
          </span>
          <div className="text-lg font-bold font-mono text-slate-900">
            {session.start_time} – {session.end_time} WIB
          </div>
          <p className="text-[11px] text-slate-500">
            Alokasi jam pelajaran kurikulum pesantren
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-lg space-y-1.5">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" /> Kelas & Ruangan
          </span>
          <div className="text-lg font-bold text-slate-900">
            {session.classroom_name}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            ID Jadwal: #{session.academic_schedule_id}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-lg space-y-1.5">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Status Presensi Guru
          </span>
          <div className="pt-0.5">
            <StaffAttendanceStatusBadge status={session.teacher_attendance_status} />
          </div>
          {session.late_minutes && session.late_minutes > 0 ? (
            <p className="text-[11px] text-amber-700">
              Terlambat masuk kelas {session.late_minutes} menit
            </p>
          ) : null}
        </div>
      </div>

      {/* Teachers Assignment Comparison */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-700" />
          Penugasan & Pelaksanaan Guru
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Teacher Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Guru Terjadwal (Original)
            </span>

            <div className="flex items-center gap-3">
              <PersonAvatar name={session.scheduled_teacher_name || session.teacher_name} className="w-10 h-10 rounded-xl" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{session.scheduled_teacher_name || session.teacher_name}</h4>
                <p className="text-xs text-slate-600 font-mono">ID Staf: #{session.scheduled_teacher_staff_id || session.teacher_staff_id}</p>
              </div>
            </div>

            {isSubstituted && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-700 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sesi Didelegasikan Resmi
                </span>
                <p className="text-[11px] text-cyan-700/90">
                  Guru utama sedang digantikan secara resmi untuk jadwal jam mengajar ini.
                </p>
              </div>
            )}
          </div>

          {/* Actual / Substitute Teacher Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider block">
              Guru yang Mengajar / Pengganti
            </span>

            <div className="flex items-center gap-3">
              <PersonAvatar
                name={session.actual_teacher_name || session.teacher_name}
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {session.actual_teacher_name || session.teacher_name}
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  {isSubstituted ? `Guru Pengganti${session.substitution_reason ? ` — ${session.substitution_reason}` : ''}` : 'Guru Utama'}
                </p>
              </div>
            </div>

            {session.teacher_check_in_at ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Waktu Masuk Kelas:</span>
                  <span className="font-mono">{new Date(session.teacher_check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                </div>
                {session.teacher_check_in_method && (
                  <div className="text-[11px] text-emerald-700/80">
                    Metode Presensi: <span className="uppercase font-mono">{session.teacher_check_in_method}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                Belum ada catatan presensi masuk kelas untuk sesi ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jurnal Mengajar */}
      <form
        id="teaching-journal-form"
        onSubmit={handleSaveJournal}
        className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            Jurnal Mengajar
          </h3>
          {session.realization_status === 'submitted' ? (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              Terisi{session.journal_submitted_by ? ` oleh ${session.journal_submitted_by}` : ''}
              {session.journal_submitted_at ? ` · ${new Date(session.journal_submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30">
              Belum diisi
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Materi / Pokok Bahasan *</label>
            <input
              value={journalTopic}
              onChange={(e) => setJournalTopic(e.target.value)}
              maxLength={255}
              placeholder="Contoh: Bab Thaharah — tata cara wudhu"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Jumlah Santri Hadir</label>
            <input
              type="number"
              min={0}
              value={journalCount}
              onChange={(e) => setJournalCount(e.target.value)}
              placeholder="mis. 28"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">Catatan Pembelajaran (opsional)</label>
          <textarea
            value={journalNotes}
            onChange={(e) => setJournalNotes(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="Kegiatan, tugas yang diberikan, kendala, santri yang perlu perhatian…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="default" disabled={isSavingJournal}>
            {isSavingJournal ? 'Menyimpan…' : 'Simpan Jurnal'}
          </Button>
        </div>
      </form>

      {/* Manual Modal */}
      {isManualModalOpen && (
        <TeachingManualAttendanceModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          session={session}
          staffList={staffList}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setIsManualModalOpen(false);
            loadSession();
          }}
        />
      )}

      {/* Substitution Modal */}
      {isSubstitutionModalOpen && (
        <TeacherSubstitutionModal
          isOpen={isSubstitutionModalOpen}
          onClose={() => setIsSubstitutionModalOpen(false)}
          sessions={[session]}
          staffList={staffList}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setIsSubstitutionModalOpen(false);
            loadSession();
          }}
        />
      )}
    </div>
  );
};
