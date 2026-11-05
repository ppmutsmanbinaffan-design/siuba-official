import React, { useMemo, useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Radio, 
  ClipboardCheck, 
  Building, 
  Sparkles,
  Play,
  Check,
  TrendingUp,
  Activity as ActivityIcon,
  ShieldAlert,
  FileText,
  Zap,
  Lock,
  Unlock,
  ChevronRight,
  QrCode,
  Search,
  Filter
} from 'lucide-react';
import { 
  Activity, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Student, 
  StudentExcusal 
} from '../types';
import { AttendanceSummaryService } from '../services/attendanceSummaryService';

interface DashboardViewProps {
  students: Student[];
  activities: Activity[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  sessionParticipants?: AttendanceSessionParticipant[];
  excusals?: StudentExcusal[];
  onNavigateTab: (tab: string, sessionId?: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students = [],
  activities = [],
  sessions = [],
  records = [],
  sessionParticipants = [],
  excusals = [],
  onNavigateTab,
}) => {
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<'all' | 'open' | 'draft' | 'closed'>('all');

  const safeStudents = students || [];
  const safeActivities = activities || [];
  const safeSessions = sessions || [];
  const safeRecords = records || [];
  const safeParticipants = sessionParticipants || [];
  const safeExcusals = excusals || [];

  const activeStudentsCount = safeStudents.filter((s) => s && s.is_active).length;
  const activeActivitiesCount = safeActivities.filter((a) => a && a.is_active).length;
  
  // Today's stats calculation
  const todaySummary = useMemo(() => {
    return AttendanceSummaryService.calculateTodaySummary(safeSessions, safeParticipants, safeRecords, '2026-08-23');
  }, [safeSessions, safeParticipants, safeRecords]);

  // "BUTUH PERHATIAN" items
  const attentionItems = useMemo(() => {
    return AttendanceSummaryService.getAttentionItems(safeSessions, safeExcusals, safeRecords, safeParticipants);
  }, [safeSessions, safeExcusals, safeRecords, safeParticipants]);

  // Sorted and filtered sessions
  const filteredSortedSessions = useMemo(() => {
    const priorityOrder = { open: 1, draft: 2, closed: 3, cancelled: 4 };
    let list = [...safeSessions];

    if (sessionFilter !== 'all') {
      list = list.filter((s) => s.status === sessionFilter);
    }

    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.activity_name && s.activity_name.toLowerCase().includes(q)) ||
          (s.session_code && s.session_code.toLowerCase().includes(q)) ||
          (s.location && s.location.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      const pA = priorityOrder[a.status] || 5;
      const pB = priorityOrder[b.status] || 5;
      if (pA !== pB) return pA - pB;
      return (a.start_at || '').localeCompare(b.start_at || '');
    });
  }, [safeSessions, sessionFilter, sessionSearch]);

  const openSessions = safeSessions.filter((s) => s && s.status === 'open');

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Welcome Hero Bento Banner */}
      <div id="welcome-banner" className="relative overflow-hidden bg-gradient-to-br from-[#12372A] via-[#1a4a39] to-[#12372A] text-white rounded-3xl p-6 lg:p-8 shadow-xl border border-[#1f5c45]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#C9A227] text-slate-950 text-xs font-black tracking-wide border border-amber-300 shadow-2xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              SISTEM OPERASIONAL SIUBA
            </span>
            <span className="text-emerald-100 bg-white/15 px-3 py-0.5 rounded-full text-xs font-mono border border-white/20">
              Minggu, 23 Agustus 2026
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
            Pondok Pesantren Modern Utsman Bin Affan
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
            Sistem Absensi Santri Pesantren Terintegrasi (SIUBA). Dirancang dengan arsitektur <em>Fast, Simple, Mobile-Friendly, Safe & Auditable</em> untuk pencatatan kehadiran santri secara akurat dan presisi.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            onClick={() => onNavigateTab('manual-attendance')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-extrabold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            id="btn-dash-manual"
          >
            <ClipboardCheck className="w-4 h-4 text-[#1F5C45]" />
            Buka Presensi
          </button>
          <button
            onClick={() => onNavigateTab('qr-scanner')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#1F5C45] hover:bg-[#154634] text-white font-extrabold text-xs rounded-2xl border border-emerald-400/40 shadow-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            id="btn-dash-scanner"
          >
            <QrCode className="w-4 h-4 text-[#EADAA2]" />
            Scan QR
          </button>
          <button
            onClick={() => onNavigateTab('excuses')}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl border border-white/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
            id="btn-dash-excuses"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-200" />
            Izin & Sakit
          </button>
        </div>
      </div>

      {/* BUTUH PERHATIAN (OPERATIONAL ATTENTION BANNER) */}
      {attentionItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Butuh Perhatian Operasional ({attentionItems.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.actionTab, item.sessionId)}
                className="p-3.5 bg-white hover:bg-amber-50/60 border border-amber-200/80 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 group shadow-2xs"
              >
                <div>
                  <div className="text-xs font-bold text-zinc-900 group-hover:text-amber-800 transition flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1 line-clamp-1">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bento Grid Metrics Row */}
      <div id="metric-cards-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Santri Aktif */}
        <div className="bg-white p-4.5 rounded-3xl border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-zinc-600">Santri Aktif</span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-[#1F5C45] flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">{activeStudentsCount}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">Master Santri Terdaftar</div>
          </div>
        </div>

        {/* Card 2: Sesi Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-zinc-600">Sesi Hari Ini</span>
            <div className="w-8 h-8 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {todaySummary.totalSessions} <span className="text-xs text-emerald-600 font-bold">({todaySummary.openSessions} Open)</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">Shalat, KBM, Tahfidz</div>
          </div>
        </div>

        {/* Card 3: Kehadiran Efektif */}
        <div className="bg-white p-4.5 rounded-3xl border border-emerald-200/90 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-[#1F5C45]">Kehadiran</span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-100/60 text-[#1F5C45] flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1F5C45]">{todaySummary.overallAttendanceRate}%</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">{todaySummary.present} Hadir &bull; {todaySummary.late} Telat</div>
          </div>
        </div>

        {/* Card 4: Izin / Sakit */}
        <div className="bg-white p-4.5 rounded-3xl border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-zinc-600">Izin & Sakit</span>
            <div className="w-8 h-8 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">{todaySummary.excused}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">Dispensasi & UKS</div>
          </div>
        </div>

        {/* Card 5: Alpha */}
        <div className="bg-white p-4.5 rounded-3xl border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-zinc-600">Alpha</span>
            <div className="w-8 h-8 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">{todaySummary.absent}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">Auto Alpha / Manual</div>
          </div>
        </div>

        {/* Card 6: Belum Tercatat */}
        <div className="bg-white p-4.5 rounded-3xl border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-zinc-600">Belum Absen</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{todaySummary.unrecorded}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">Sesi Hari Ini</div>
          </div>
        </div>
      </div>

      {/* TODAY'S SESSIONS OPERATIONAL SECTION */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1F5C45]" />
              <span>Daftar Sesi Kegiatan Hari Ini</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Urutan operasional otomatis: Sesi <strong>OPEN</strong> &rarr; <strong>UPCOMING (Draf)</strong> &rarr; <strong>CLOSED</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Cari nama sesi / lokasi..."
                className="w-full bg-slate-50 text-xs text-slate-900 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none min-h-[36px]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['all', 'open', 'draft', 'closed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSessionFilter(status)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    sessionFilter === status
                      ? 'bg-white text-[#12372A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status === 'all' && `Semua (${safeSessions.length})`}
                  {status === 'open' && `Buka (${openSessions.length})`}
                  {status === 'draft' && 'Upcoming'}
                  {status === 'closed' && 'Selesai'}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('sessions')}
              className="text-xs font-bold text-[#1F5C45] hover:text-[#12372A] flex items-center gap-1 cursor-pointer ml-auto sm:ml-0"
            >
              <span>Kelola Sesi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Empty State when no session matches search/filter */}
        {filteredSortedSessions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Tidak ada sesi yang cocok dengan filter</h4>
            <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau pilih tab filter status lainnya.</p>
          </div>
        ) : (
          /* Session Cards List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSortedSessions.map((session) => {
              const sessSummary = AttendanceSummaryService.calculateSessionSummary(session, sessionParticipants, records);
              const isOpen = session.status === 'open';

              return (
                <div
                  key={session.id}
                  className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                    isOpen
                      ? 'border-emerald-300 shadow-sm bg-gradient-to-b from-emerald-50/40 to-white ring-1 ring-emerald-200/80'
                      : session.status === 'draft'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Status Badge & Code */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {session.session_code}
                      </span>
                      {isOpen ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                          BERLANGSUNG
                        </span>
                      ) : session.status === 'draft' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          UPCOMING
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          SELESAI
                        </span>
                      )}
                    </div>

                    {/* Title & Timing */}
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 line-clamp-1">{session.activity_name}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 font-medium">
                        <span className="font-mono text-slate-800 font-bold">{session.start_at.slice(11, 16)} - {session.end_at.slice(11, 16)}</span>
                        <span>&bull;</span>
                        <span className="truncate">{session.location}</span>
                      </div>
                    </div>

                    {/* Progress & Breakdown */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Tercatat:</span>
                        <span className="text-slate-900 font-extrabold">
                          {sessSummary.recorded} / {sessSummary.total_participants} ({sessSummary.completion_rate}%)
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                          style={{ width: `${sessSummary.completion_rate}%` }} 
                          className={`h-full transition-all duration-500 ${
                            sessSummary.completion_rate === 100 ? 'bg-emerald-500' : 'bg-[#1F5C45]'
                          }`} 
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200 font-medium">
                        <span>Hadir: <strong className="text-emerald-700 font-bold">{sessSummary.present}</strong></span>
                        <span>Telat: <strong className="text-amber-700 font-bold">{sessSummary.late}</strong></span>
                        <span>Izin: <strong className="text-sky-700 font-bold">{sessSummary.permission + sessSummary.sick + sessSummary.dispensation}</strong></span>
                        <span>Alpha: <strong className="text-rose-700 font-bold">{sessSummary.absent}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="pt-4 mt-auto">
                    <button
                      onClick={() => onNavigateTab('manual-attendance', session.id)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 ${
                        isOpen
                          ? 'bg-[#1F5C45] hover:bg-[#12372A] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      }`}
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{isOpen ? 'Buka Lembar Absensi' : 'Lihat Rekap Absensi'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
