import React, { useState } from 'react';
import { 
  AcademicSessionContext, 
  AcademicSubstitution, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  LessonPeriod, 
  Student, 
  Teacher, 
  User 
} from '../types';
import { TeacherAuthorizationService } from '../services/teacherAuthorizationService';
import { AcademicAttendanceService } from '../services/academicAttendanceService';
import { 
  AlertCircle, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Copy, 
  DoorOpen, 
  Lock, 
  Play, 
  QrCode, 
  Radio, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  Users 
} from 'lucide-react';

interface Props {
  currentUser: User;
  sessions?: AttendanceSession[];
  contexts?: AcademicSessionContext[];
  records?: AttendanceRecord[];
  participants?: AttendanceSessionParticipant[];
  teachers?: Teacher[];
  substitutions?: AcademicSubstitution[];
  classrooms?: any[];
  lessonPeriods?: LessonPeriod[];
  onOpenSession: (sessionId: number) => void;
  onCloseSession: (sessionId: number) => void;
  onNavigateToManual: (sessionId: number) => void;
  onNavigateToQr: (sessionId: number) => void;
  onNavigateToRfid: (sessionId: number) => void;
  onRecordCopied: (newRecords: AttendanceRecord[], msg: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TeacherDashboardView: React.FC<Props> = ({
  currentUser,
  sessions = [],
  contexts = [],
  records = [],
  participants = [],
  teachers = [],
  substitutions = [],
  classrooms = [],
  lessonPeriods = [],
  onOpenSession,
  onCloseSession,
  onNavigateToManual,
  onNavigateToQr,
  onNavigateToRfid,
  onRecordCopied,
  onShowToast,
}) => {
  const safeSessions = sessions || [];
  const safeContexts = contexts || [];
  const safeRecords = records || [];
  const safeParticipants = participants || [];
  const safeTeachers = teachers || [];
  const safeSubstitutions = substitutions || [];
  const safeClassrooms = classrooms || [];
  const safeLessonPeriods = lessonPeriods || [];

  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(
    safeTeachers.find((t) => t && (t.user_id === currentUser.id || (t.name || '').includes('Hasan')))?.id || safeTeachers[0]?.id || 1
  );

  const [selectedDate, setSelectedDate] = useState<string>('2026-08-24'); // Monday date

  // Filter KBM sessions for this date
  const dateSessions = safeSessions.filter(
    (s) => s && s.session_date === selectedDate && s.academic_context !== undefined
  );

  // Authorize sessions for selected teacher
  const teacherSessions = dateSessions.filter((s) => {
    if (!s) return false;
    const ctx = safeContexts.find((c) => c && c.attendance_session_id === s.id);
    const access = TeacherAuthorizationService.verifySessionAccess({
      user: { ...currentUser, id: safeTeachers.find((t) => t && t.id === selectedTeacherId)?.user_id || currentUser.id },
      session: s,
      context: ctx,
      teachers: safeTeachers,
      substitutions: safeSubstitutions,
      classrooms: safeClassrooms,
    });
    return access.isAuthorized;
  });

  const handleCopyPrevious = (targetSession: AttendanceSession) => {
    const ctx = targetSession.academic_context;
    if (!ctx) return;

    // Find previous period session for same classroom and subject
    const prevSession = dateSessions.find(
      (s) =>
        s &&
        s.id !== targetSession.id &&
        s.classroom_id === targetSession.classroom_id &&
        s.subject_id === targetSession.subject_id &&
        s.academic_context &&
        s.academic_context.lesson_period_id < ctx.lesson_period_id
    );

    if (!prevSession) {
      onShowToast('Tidak ditemukan sesi KBM JP sebelumnya untuk mata pelajaran dan kelas ini.', 'error');
      return;
    }

    const res = AcademicAttendanceService.copyPreviousPeriodAttendance({
      sourceSession: prevSession,
      targetSession,
      sourceRecords: safeRecords,
      targetRecords: safeRecords,
      participants: safeParticipants,
      currentUser,
    });

    if (res.copiedCount > 0) {
      onRecordCopied(res.newRecords, res.message);
      onShowToast(res.message, 'success');
    } else {
      onShowToast(res.message, 'info');
    }
  };

  return (
    <div id="teacher-dashboard-container" className="space-y-6">
      {/* Header Bento */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-100 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1 backdrop-blur-xs">
              <BookOpen className="w-3 h-3 text-[#C9A227]" />
              Dashboard Guru Mengajar
            </span>
            <span className="text-[10px] font-bold text-emerald-100/90 bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
              Absensi Per Sesi KBM
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Jadwal Mengajar & Akses Absensi KBM Hari Ini</h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            Buka sesi KBM, catat kehadiran via Manual/QR/RFID, salin data antar-JP, dan tutup sesi untuk finalisasi otomatis.
          </p>
        </div>

        {/* Teacher Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-black/25 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-xs">
            <Users className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-xs text-emerald-100/80 font-bold">Guru:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-50 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-black/25 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-xs">
            <span className="text-xs text-emerald-100/80 font-bold">Tgl:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {teacherSessions.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 text-zinc-500 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Tidak Ada Sesi Mengajar Hari Ini</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ustadz/Ustadzah tidak memiliki jadwal KBM yang harus diampu pada tanggal ini, atau sesi belum digenerate oleh Administrator.
          </p>
        </div>
      ) : (
        /* Teacher Session Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teacherSessions.map((session) => {
            const ctx = session.academic_context;
            const period = safeLessonPeriods.find((lp) => lp && lp.id === ctx?.lesson_period_id);
            const sub = safeSubstitutions.find(
              (s) => s && s.date === session.session_date && (s.attendance_session_id === session.id || s.academic_schedule_id === ctx?.academic_schedule_id)
            );

            const sessionRecords = safeRecords.filter((r) => r && r.attendance_session_id === session.id);
            const recordedCount = sessionRecords.length;
            const totalCount = session.participant_count || 0;

            const isOpen = session.status === 'open';
            const isClosed = session.status === 'closed';

            return (
              <div
                key={session.id}
                className={`p-6 rounded-3xl border transition-all space-y-4 shadow-xl relative overflow-hidden ${
                  isOpen
                    ? 'bg-white border-emerald-500/50 ring-1 ring-emerald-500/20'
                    : isClosed
                    ? 'bg-white/60 border-slate-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[#2F7D5A]">
                      {period?.name || 'JP'} ({ctx?.scheduled_start_time}–{ctx?.scheduled_end_time})
                    </span>
                    {sub && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        Guru Pengganti
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                      isOpen
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                        : isClosed
                        ? 'bg-zinc-800 text-slate-500 border-slate-300'
                        : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                    }`}
                  >
                    ● {session.status === 'open' ? 'SEDANG BERLANGSUNG' : session.status === 'closed' ? 'SELESAI' : 'DRAFT / SIAP'}
                  </span>
                </div>

                {/* Session Title */}
                <div>
                  <h3 className="text-lg font-bold text-white">{session.activity_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lokasi: <strong className="text-slate-800">{session.location}</strong>
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Progres Kehadiran Santri:</span>
                    <span className="text-emerald-400 font-mono">
                      {recordedCount} / {totalCount} Santri ({totalCount > 0 ? Math.round((recordedCount / totalCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1F5C45] transition-all duration-500"
                      style={{ width: `${totalCount > 0 ? (recordedCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                  {!isOpen && !isClosed && (
                    <button
                      onClick={() => onOpenSession(session.id)}
                      className="col-span-2 py-3 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <Play className="w-4 h-4" />
                      <span>BUKA SESI KBM SEKARANG</span>
                    </button>
                  )}

                  {isOpen && (
                    <>
                      <button
                        onClick={() => onNavigateToManual(session.id)}
                        className="py-2.5 bg-slate-50 hover:bg-slate-100 text-white font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#2F7D5A]" />
                        <span>Absen Manual</span>
                      </button>

                      <button
                        onClick={() => onNavigateToQr(session.id)}
                        className="py-2.5 bg-slate-50 hover:bg-slate-100 text-white font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Scan QR</span>
                      </button>

                      <button
                        onClick={() => onNavigateToRfid(session.id)}
                        className="py-2.5 bg-slate-50 hover:bg-slate-100 text-white font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <Radio className="w-3.5 h-3.5 text-amber-400" />
                        <span>Terminal RFID</span>
                      </button>

                      <button
                        onClick={() => handleCopyPrevious(session)}
                        className="py-2.5 bg-slate-50 hover:bg-slate-100 text-white font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                        title="Salin data presensi dari JP sebelumnya jika mata pelajaran sama"
                      >
                        <Copy className="w-3.5 h-3.5 text-purple-400" />
                        <span>Salin JP Lalu</span>
                      </button>

                      <button
                        onClick={() => onCloseSession(session.id)}
                        className="col-span-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-2xl border border-red-500/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>TUTUP SESI (FINALISASI AUTO-ALPHA)</span>
                      </button>
                    </>
                  )}

                  {isClosed && (
                    <div className="col-span-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-bold">
                      ✓ Sesi KBM Selesai & Ter-Finalisasi
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
