import React, { useState } from 'react';
import { 
  AcademicSessionContext, 
  AttendanceRecord, 
  AttendanceSession, 
  Classroom, 
  LessonPeriod, 
  Student, 
  Subject, 
  Teacher 
} from '../types';
import { 
  Activity, 
  AlertCircle, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Filter, 
  GraduationCap, 
  Search, 
  Sparkles, 
  Users,
  Award,
  Calendar,
  Eye,
  X,
  UserCheck,
  Check,
  Flame,
  Layers,
  ChevronRight
} from 'lucide-react';

interface Props {
  sessions?: AttendanceSession[];
  contexts?: AcademicSessionContext[];
  records?: AttendanceRecord[];
  students?: Student[];
  classrooms?: Classroom[];
  subjects?: Subject[];
  teachers?: Teacher[];
  lessonPeriods?: LessonPeriod[];
}

export const KbmMonitoringView: React.FC<Props> = ({
  sessions = [],
  contexts = [],
  records = [],
  students = [],
  classrooms = [],
  subjects = [],
  teachers = [],
  lessonPeriods = [],
}) => {
  const safeSessions = sessions || [];
  const safeContexts = contexts || [];
  const safeRecords = records || [];
  const safeStudents = students || [];
  const safeClassrooms = classrooms || [];
  const safeSubjects = subjects || [];
  const safeTeachers = teachers || [];
  const safeLessonPeriods = lessonPeriods || [];

  const [selectedDate, setSelectedDate] = useState<string>('2026-08-24');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterClassroom, setFilterClassroom] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Selected Session for Roster Modal Inspection
  const [inspectedSession, setInspectedSession] = useState<AttendanceSession | null>(null);
  const [modalStudentSearch, setModalStudentSearch] = useState<string>('');

  // Filter KBM sessions
  const kbmSessions = safeSessions.filter(
    (s) => s && s.session_date === selectedDate && s.academic_context !== undefined
  );

  const filtered = kbmSessions.filter((s) => {
    if (!s) return false;
    if (filterClassroom !== 'all' && s.classroom_id !== filterClassroom) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const sub = safeSubjects.find((sub) => sub.id === s.subject_id);
      const tch = safeTeachers.find((t) => t.id === s.teacher_id);
      const cls = safeClassrooms.find((c) => c.id === s.classroom_id);
      const matchesSub = (sub?.name || '').toLowerCase().includes(q) || (sub?.code || '').toLowerCase().includes(q);
      const matchesTch = (tch?.name || '').toLowerCase().includes(q);
      const matchesCls = (cls?.name || '').toLowerCase().includes(q);
      if (!matchesSub && !matchesTch && !matchesCls) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalKbm = kbmSessions.length;
  const started = kbmSessions.filter((s) => s && s.status === 'open').length;
  const unstarted = kbmSessions.filter((s) => s && s.status === 'draft').length;
  const closed = kbmSessions.filter((s) => s && s.status === 'closed').length;

  const totalParticipants = kbmSessions.reduce((acc, s) => acc + (s?.participant_count || 0), 0);
  const totalRecorded = kbmSessions.reduce((acc, s) => {
    return acc + safeRecords.filter((r) => r && r.attendance_session_id === s?.id).length;
  }, 0);

  const overallAttendanceRate = totalParticipants > 0 ? Math.round((totalRecorded / totalParticipants) * 100) : 0;

  return (
    <div id="kbm-monitoring-container" className="space-y-6 pb-12">
      {/* SIUBA Emerald Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Award className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Pengawasan KBM Akademik & Presensi
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Monitoring Pelaksanaan KBM Hari Ini
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Pantau status pembukaan sesi belajar oleh dewan guru, ketepatan waktu pembelajaran, serta rekapitulasi kehadiran santri per kelas.
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2.5 bg-black/30 px-4 py-2.5 rounded-2xl border border-white/20 backdrop-blur-xs shrink-0 self-start md:self-auto shadow-inner">
            <Calendar className="w-4 h-4 text-[#C9A227]" />
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-100/80 font-bold uppercase tracking-wider">Tanggal KBM:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5 Bento Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Sesi */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total KBM</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalKbm} <span className="text-xs font-semibold text-slate-400">Sesi</span></div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Terjadwal hari ini</span>
        </div>

        {/* Sedang Berlangsung */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Berlangsung</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 relative">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{started} <span className="text-xs font-semibold text-emerald-600">Kelas</span></div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Sesi KBM sedang aktif</span>
        </div>

        {/* Belum Dimulai */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Belum Dimulai</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{unstarted} <span className="text-xs font-semibold text-amber-600">Sesi</span></div>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">Menunggu guru masuk</span>
        </div>

        {/* Sudah Selesai */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">Sudah Selesai</span>
            <div className="w-7 h-7 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-700 font-mono">{closed} <span className="text-xs font-semibold text-sky-600">Sesi</span></div>
          <span className="text-[10px] text-sky-600 font-medium block mt-1">Presensi ditutup</span>
        </div>

        {/* Kehadiran Santri */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Kehadiran Santri</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono">{overallAttendanceRate}%</div>
          <span className="text-[10px] text-indigo-600 font-medium block mt-1">{totalRecorded}/{totalParticipants} Santri hadir</span>
        </div>
      </div>

      {/* Filters & Table Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              Jadwal & Status KBM Real-Time
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar seluruh rombel kelas, jam pelajaran (JP), nama guru pengampu, dan rasio kehadiran.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari mapel, guru, kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Classroom Filter */}
            <select
              value={filterClassroom}
              onChange={(e) => setFilterClassroom(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Rombel Kelas</option>
              {safeClassrooms.map((c) => (
                <option key={c.id} value={c.id}>Kelas {c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="open">Sedang Berlangsung</option>
              <option value="draft">Belum Dimulai</option>
              <option value="closed">Sudah Selesai</option>
            </select>
          </div>
        </div>

        {/* Monitoring Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Jam / JP</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Mata Pelajaran</th>
                <th className="p-3.5">Guru Pengampu</th>
                <th className="p-3.5">Status Sesi</th>
                <th className="p-3.5">Kehadiran Santri</th>
                <th className="p-3.5">Waktu Sesi</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((s) => {
                const ctx = s.academic_context;
                const period = safeLessonPeriods.find((lp) => lp.id === ctx?.lesson_period_id);
                const sub = safeSubjects.find((sub) => sub.id === s.subject_id);
                const tch = safeTeachers.find((t) => t.id === s.teacher_id);
                const cls = safeClassrooms.find((c) => c.id === s.classroom_id);

                const sessionRecords = safeRecords.filter((r) => r && r.attendance_session_id === s.id);
                const recordedCount = sessionRecords.length;
                const totalCount = s.participant_count || 30;
                const rate = totalCount > 0 ? Math.round((recordedCount / totalCount) * 100) : 0;

                return (
                  <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3.5 font-mono text-[#1F5C45] font-black whitespace-nowrap">
                      <span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                        {period?.name || `JP ${s.id}`}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        {ctx?.scheduled_start_time || '07:30'}–{ctx?.scheduled_end_time || '08:15'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-black text-slate-900 text-sm">Kelas {cls?.name || s.classroom_name || '-'}</span>
                      <span className="text-[10px] text-slate-400 block">Tingkat {cls?.grade_level || '7'}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-black text-slate-900">{sub?.name || s.activity_name}</div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {sub?.code || 'MAPEL'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0">
                          {(tch?.name || s.opened_by || 'U').charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{tch?.name || s.opened_by || 'Ustadz Pengampu'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          s.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-xs'
                            : s.status === 'closed'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {s.status === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />}
                        {s.status === 'open' ? 'BERLANGSUNG' : s.status === 'closed' ? 'SELESAI' : 'BELUM DIBUKA'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 font-mono">{recordedCount} / {totalCount} Santri</span>
                          <span className="text-[10px] font-black text-emerald-700 font-mono">{rate}%</span>
                        </div>
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              rate >= 90 ? 'bg-[#1F5C45]' : rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                      {s.opened_at ? (
                        <div>
                          <span className="text-emerald-700 font-bold block">Buka: {s.opened_at.slice(11, 16)}</span>
                          {s.closed_at && <span className="text-slate-400 block">Tutup: {s.closed_at.slice(11, 16)}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum dibuka</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setInspectedSession(s);
                          setModalStudentSearch('');
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer border border-slate-200"
                        title="Lihat Detail Santri Hadir"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Roster</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada sesi KBM yang sesuai dengan filter atau tanggal yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: INSPEKSI ROSTER SANTRI SESI KBM                                    */}
      {/* ========================================================================= */}
      {inspectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase">
                    Roster KBM Kelas
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    {safeSubjects.find((sub) => sub.id === inspectedSession.subject_id)?.name || inspectedSession.activity_name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Kelas {safeClassrooms.find((c) => c.id === inspectedSession.classroom_id)?.name || inspectedSession.classroom_name} &bull; Guru: {safeTeachers.find((t) => t.id === inspectedSession.teacher_id)?.name || inspectedSession.opened_by || 'Ustadz Pengampu'}
                </p>
              </div>
              <button
                onClick={() => setInspectedSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search within session students */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari santri di kelas ini..."
                value={modalStudentSearch}
                onChange={(e) => setModalStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Students list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const classStudents = safeStudents.filter((st) => 
                  st && (!inspectedSession.classroom_id || st.classroom_id === inspectedSession.classroom_id)
                );
                const sessionRecords = safeRecords.filter((r) => r && r.attendance_session_id === inspectedSession.id);

                const filteredRoster = classStudents.filter((st) =>
                  st.name.toLowerCase().includes(modalStudentSearch.toLowerCase()) ||
                  (st.student_number || '').toLowerCase().includes(modalStudentSearch.toLowerCase())
                );

                if (filteredRoster.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada santri yang sesuai dengan pencarian di kelas ini.
                    </div>
                  );
                }

                return filteredRoster.map((st, idx) => {
                  const record = sessionRecords.find((r) => r.student_id === st.id);
                  const isPresent = Boolean(record);
                  const status = record?.status || (inspectedSession.status === 'draft' ? 'pending' : 'absent');

                  return (
                    <div
                      key={st.id}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-400 w-5">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-900">{st.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIS: {st.student_number} &bull; Kamar: {st.dormitory_room_name || 'Non-Asrama'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {status === 'present' || isPresent ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Hadir {record?.recorded_at ? `(${record.recorded_at.slice(11, 16)})` : ''}
                          </span>
                        ) : status === 'sick' ? (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md border border-amber-200">
                            Sakit
                          </span>
                        ) : status === 'excused' ? (
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md border border-blue-200">
                            Izin
                          </span>
                        ) : status === 'pending' ? (
                          <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md">
                            Belum Presensi
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-md border border-rose-200">
                            Belum Hadir
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectedSession(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

