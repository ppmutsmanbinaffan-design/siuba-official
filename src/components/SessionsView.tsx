import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  User, 
  ClipboardCheck, 
  Lock,
  ArrowRight,
  Users,
  Eye,
  FileText,
  AlertCircle,
  Check,
  X,
  Zap
} from 'lucide-react';
import { 
  Activity, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  SessionStatus, 
  Student, 
  StudentExcusal, 
  User as UserType 
} from '../types';
import { AttendanceSummaryService } from '../services/attendanceSummaryService';

interface SessionsViewProps {
  sessions?: AttendanceSession[];
  activities?: Activity[];
  records?: AttendanceRecord[];
  sessionParticipants?: AttendanceSessionParticipant[];
  excusals?: StudentExcusal[];
  students?: Student[];
  currentUser: UserType;
  onCreateSession: (sessionData: Partial<AttendanceSession>) => void;
  onUpdateSessionStatus: (sessionId: number, newStatus: SessionStatus, cancelReason?: string) => void;
  onNavigateToManual: (sessionId: number) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions = [],
  activities = [],
  records = [],
  sessionParticipants = [],
  excusals = [],
  students = [],
  currentUser,
  onCreateSession,
  onUpdateSessionStatus,
  onNavigateToManual,
}) => {
  const safeSessions = sessions || [];
  const safeActivities = activities || [];
  const safeRecords = records || [];
  const safeSessionParticipants = sessionParticipants || [];
  const safeExcusals = excusals || [];
  const safeStudents = students || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number>(safeActivities[0]?.id || 1);
  const [sessionDate, setSessionDate] = useState<string>('2026-08-23');
  const [startTime, setStartTime] = useState<string>('04:15');
  const [presentUntil, setPresentUntil] = useState<string>('04:30');
  const [lateUntil, setLateUntil] = useState<string>('04:45');
  const [endTime, setEndTime] = useState<string>('05:00');
  const [location, setLocation] = useState<string>('Masjid Utama Kampus 1');
  const [notes, setNotes] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Interactive Action Modals
  const [closeTargetSession, setCloseTargetSession] = useState<AttendanceSession | null>(null);
  const [cancelTargetSession, setCancelTargetSession] = useState<AttendanceSession | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [viewSnapshotSession, setViewSnapshotSession] = useState<AttendanceSession | null>(null);

  const handleActivityChange = (actId: number) => {
    setSelectedActivityId(actId);
    const act = safeActivities.find((a) => a && a.id === actId);
    if (act) {
      setStartTime(act.default_start_time || '04:15');
      setPresentUntil(act.default_present_until || '04:30');
      setLateUntil(act.default_late_until || '04:45');
      setEndTime(act.default_end_time || '05:00');
      setLocation(act.location || 'Masjid Utama Kampus 1');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const act = safeActivities.find((a) => a && a.id === selectedActivityId);
    if (!act) return;

    const sessionCode = `ATT-${sessionDate.replace(/-/g, '')}-${act.code}-${String(safeSessions.length + 1).padStart(3, '0')}`;

    onCreateSession({
      activity_id: act.id,
      activity_name: act.name,
      activity_code: act.code,
      session_code: sessionCode,
      session_date: sessionDate,
      start_at: `${sessionDate} ${startTime}:00`,
      present_until: `${sessionDate} ${presentUntil}:00`,
      late_until: `${sessionDate} ${lateUntil}:00`,
      end_at: `${sessionDate} ${endTime}:00`,
      status: 'draft',
      location,
      notes,
    });

    setShowCreateModal(false);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetSession || !cancelReason.trim()) return;

    onUpdateSessionStatus(cancelTargetSession.id, 'cancelled', cancelReason.trim());
    setCancelTargetSession(null);
    setCancelReason('');
  };

  const handleConfirmClose = () => {
    if (!closeTargetSession) return;
    onUpdateSessionStatus(closeTargetSession.id, 'closed');
    setCloseTargetSession(null);
  };

  const filteredSessions = safeSessions.filter((s) => {
    if (!s) return false;
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  return (
    <div id="sessions-view-container" className="space-y-6">
      {/* Header & Create Button Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-full border border-lime-400/20">
              Siklus Hidup Sesi Terkontrol
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Manajemen Sesi Absensi</h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan status sesi presensi secara terstruktur: <strong>DRAFT</strong> &rarr; <strong>OPEN</strong> &rarr; <strong>CLOSED</strong> (dengan Auto Alpha & Dispensasi Otomatis) atau <strong>CANCELLED</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            id="session-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 text-slate-800 rounded-2xl px-3.5 py-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-lime-400 cursor-pointer"
          >
            <option value="all">Semua Status ({safeSessions.length})</option>
            <option value="draft">DRAFT ({safeSessions.filter((s) => s && s.status === 'draft').length})</option>
            <option value="open">OPEN ({safeSessions.filter((s) => s && s.status === 'open').length})</option>
            <option value="closed">CLOSED ({safeSessions.filter((s) => s && s.status === 'closed').length})</option>
            <option value="cancelled">CANCELLED ({safeSessions.filter((s) => s && s.status === 'cancelled').length})</option>
          </select>

          <button
            id="btn-create-session-modal"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-black rounded-2xl shadow-lg shadow-lime-400/20 flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            Buat Sesi Baru
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSessions.map((session) => {
          const sessSummary = AttendanceSummaryService.calculateSessionSummary(session, safeSessionParticipants, safeRecords);
          const participants = safeSessionParticipants.filter(p => p && p.attendance_session_id === session.id);

          const statusConfig: Record<SessionStatus, { badge: string; bg: string; text: string }> = {
            draft: { badge: 'DRAFT (UPCOMING)', bg: 'bg-amber-400/10 border-amber-400/30', text: 'text-amber-400' },
            open: { badge: 'OPEN (BERLANGSUNG)', bg: 'bg-lime-400/10 border-lime-400/30', text: 'text-lime-400' },
            closed: { badge: 'CLOSED (SELESAI)', bg: 'bg-zinc-800 border-slate-300', text: 'text-slate-500' },
            cancelled: { badge: 'CANCELLED (BATAL)', bg: 'bg-rose-400/10 border-rose-400/30', text: 'text-rose-400' },
          };

          const config = statusConfig[session.status];

          return (
            <div
              key={session.id}
              id={`session-card-${session.id}`}
              className={`bg-white rounded-3xl border shadow-xl transition-all p-6 flex flex-col justify-between ${
                session.status === 'open'
                  ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/20 to-[#18181b]'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                    {session.session_code}
                  </span>
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border ${config.bg} ${config.text}`}>
                    {config.badge}
                  </span>
                </div>

                <h3 className="text-base font-black text-white leading-snug">
                  {session.activity_name}
                </h3>

                {/* Details List */}
                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{session.session_date}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="font-mono text-slate-700">
                      {session.start_at.slice(11, 16)} - {session.end_at.slice(11, 16)} WIB
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="line-clamp-1 text-slate-700">{session.location}</span>
                  </div>
                </div>

                {/* Timing Thresholds */}
                <div className="mt-4 p-3 bg-slate-50 rounded-2xl text-[11px] space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tepat Waktu s/d:</span>
                    <span className="font-mono font-bold text-lime-400">{session.present_until.slice(11, 16)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Batas Terlambat s/d:</span>
                    <span className="font-mono font-bold text-amber-400">{session.late_until.slice(11, 16)}</span>
                  </div>
                </div>

                {/* Session Snapshot & Live Metrics */}
                <div className="mt-4 p-3 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-zinc-500" />
                      Snapshot Peserta:
                    </span>
                    <button
                      onClick={() => setViewSnapshotSession(session)}
                      className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{sessSummary.total_participants} Santri</span>
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span className="text-lime-400 font-bold">{sessSummary.present} Hadir</span>
                    <span className="text-amber-400 font-bold">{sessSummary.late} Telat</span>
                    <span className="text-sky-400 font-bold">{sessSummary.permission + sessSummary.sick + sessSummary.dispensation} Izin/Sakit</span>
                    <span className="text-rose-400 font-bold">{sessSummary.absent} Alpha</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons with Strict Lifecycle Controls */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
                {session.status === 'draft' && (
                  <>
                    <button
                      id={`btn-open-session-${session.id}`}
                      onClick={() => onUpdateSessionStatus(session.id, 'open')}
                      className="flex-1 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-lime-400/10 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-zinc-950" />
                      Buka Sesi (Open)
                    </button>
                    <button
                      id={`btn-cancel-session-${session.id}`}
                      onClick={() => setCancelTargetSession(session)}
                      className="py-2 px-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs border border-slate-200 transition cursor-pointer"
                      title="Batalkan Sesi"
                    >
                      Batalkan
                    </button>
                  </>
                )}

                {session.status === 'open' && (
                  <>
                    <button
                      id={`btn-goto-manual-${session.id}`}
                      onClick={() => onNavigateToManual(session.id)}
                      className="flex-1 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-lime-400/10 transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-zinc-950" />
                      Lembar Absensi
                    </button>
                    <button
                      id={`btn-close-session-${session.id}`}
                      onClick={() => setCloseTargetSession(session)}
                      className="py-2 px-3.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Tutup Sesi Absensi & Auto Alpha"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      Tutup
                    </button>
                  </>
                )}

                {session.status === 'closed' && (
                  <button
                    onClick={() => onNavigateToManual(session.id)}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-200 cursor-pointer"
                  >
                    Lihat Rekap Absensi
                  </button>
                )}

                {session.status === 'cancelled' && (
                  <div className="w-full py-2 text-center text-xs text-rose-400 font-bold bg-rose-500/10 rounded-xl border border-rose-500/20">
                    Sesi telah dibatalkan
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">
                Buat Sesi Absensi Baru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menghasilkan kode unik <code className="text-lime-400 font-mono">ATT-YYYYMMDD-ACTIVITY-XXX</code> dan menetapkan time window absensi.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Activity Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kegiatan Santri *</label>
                <select
                  id="modal-activity-select"
                  value={selectedActivityId}
                  onChange={(e) => handleActivityChange(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl font-medium focus:ring-1 focus:ring-lime-400 focus:outline-none cursor-pointer"
                >
                  {activities.map((act) => (
                    <option key={act.id} value={act.id} className="bg-slate-50 text-slate-900">
                      {act.name} ({act.category_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Sesi *</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-1 focus:ring-lime-400 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Sesi *</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-1 focus:ring-lime-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Timing Grid */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="font-black text-lime-400 text-[11px] uppercase tracking-wider">
                  Pengaturan Ambang Waktu Kehadiran
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Mulai (Start)</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 bg-zinc-800 border border-slate-300 text-slate-900 rounded-xl text-xs focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-lime-400 font-bold mb-1">Hadir s/d</label>
                    <input
                      type="time"
                      value={presentUntil}
                      onChange={(e) => setPresentUntil(e.target.value)}
                      className="w-full p-2 bg-zinc-800 border border-lime-400/40 text-lime-400 rounded-xl text-xs focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-400 font-bold mb-1">Terlambat s/d</label>
                    <input
                      type="time"
                      value={lateUntil}
                      onChange={(e) => setLateUntil(e.target.value)}
                      className="w-full p-2 bg-zinc-800 border border-amber-400/40 text-amber-400 rounded-xl text-xs focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Selesai (End)</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 bg-zinc-800 border border-slate-300 text-slate-900 rounded-xl text-xs focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Petunjuk Operator</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan sesi atau instruksi..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-1 focus:ring-lime-400 focus:outline-none placeholder:text-zinc-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-white hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-black rounded-xl shadow-lg shadow-lime-400/20 transition cursor-pointer"
                >
                  Simpan Sesi (Status: DRAFT)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Close Session Confirmation */}
      {closeTargetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Tutup Sesi Absensi</h3>
                <p className="text-xs text-slate-500">{closeTargetSession.activity_name} ({closeTargetSession.session_code})</p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-xs space-y-2 text-slate-700">
              <p>
                Menutup sesi akan mengunci presensi dan memicu <strong>Auto Alpha</strong> untuk santri yang belum tercatat (kecuali yang memiliki surat izin/dispensasi disetujui).
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCloseTargetSession(null)}
                className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Ya, Tutup Sesi & Auto Alpha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Cancel Session with Reason */}
      {cancelTargetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Batalkan Sesi Kegiatan</h3>
                <p className="text-xs text-slate-500">{cancelTargetSession.activity_name}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Pembatalan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Hujan lebat / Diliburkan / Diganti kegiatan lain..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancelTargetSession(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!cancelReason.trim()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Konfirmasi Pembatalan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Participant Snapshot Viewer */}
      {viewSnapshotSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl w-full max-w-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-lime-400/20 text-lime-400 border border-lime-400/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Snapshot Peserta Sesi Absensi</h3>
                  <p className="text-xs text-slate-500">{viewSnapshotSession.activity_name} ({viewSnapshotSession.session_code})</p>
                </div>
              </div>
              <button
                onClick={() => setViewSnapshotSession(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">Santri</th>
                    <th className="p-3">NIS</th>
                    <th className="p-3">Kelas & Kamar</th>
                    <th className="p-3">Status Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {sessionParticipants
                    .filter(p => p.attendance_session_id === viewSnapshotSession.id)
                    .map(p => (
                      <tr key={p.id} className="hover:bg-slate-100/40">
                        <td className="p-3 font-bold text-white">{p.student_name}</td>
                        <td className="p-3 font-mono text-slate-500">{p.student_number}</td>
                        <td className="p-3 text-slate-500">{p.classroom_name} / {p.dormitory_room_name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {p.eligibility_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewSnapshotSession(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-700 text-xs font-semibold rounded-xl"
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
