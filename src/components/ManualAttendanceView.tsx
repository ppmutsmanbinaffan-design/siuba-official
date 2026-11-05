import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ChevronDown, 
  UserCheck,
  Building,
  Home,
  MessageSquare,
  Sparkles,
  Zap,
  RotateCcw,
  ShieldAlert,
  History,
  Lock,
  Unlock,
  Users,
  Check,
  X,
  Smartphone,
  LayoutGrid,
  List,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  Activity, 
  AttendanceRecord, 
  AttendanceRecordHistory, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  BulkRecordResult, 
  Classroom, 
  DormitoryRoom, 
  Student, 
  StudentExcusal, 
  User 
} from '../types';
import { AttendanceSummaryService } from '../services/attendanceSummaryService';
import { ExcuseService } from '../services/excuseService';
import { AttendanceEngine } from '../services/attendanceEngine';

interface ManualAttendanceViewProps {
  sessions: AttendanceSession[];
  selectedSessionId: number | null;
  setSelectedSessionId: (id: number) => void;
  students: Student[];
  classrooms: Classroom[];
  dormitoryRooms: DormitoryRoom[];
  records: AttendanceRecord[];
  sessionParticipants: AttendanceSessionParticipant[];
  excusals: StudentExcusal[];
  recordHistories: AttendanceRecordHistory[];
  activities: Activity[];
  currentUser: User;
  onRecordStatus: (params: {
    sessionId: number;
    student: Student;
    status: AttendanceStatus;
    notes?: string;
  }) => void;
  onBulkMarkPresent: (sessionId: number) => void;
  onBulkApplyStatus: (sessionId: number, studentIds: number[], status: AttendanceStatus, notes?: string) => void;
  onCorrectStatus: (record: AttendanceRecord, newStatus: AttendanceStatus, reason: string) => void;
  onOpenSession: (sessionId: number) => void;
  onCloseSession: (sessionId: number) => void;
}

export const ManualAttendanceView: React.FC<ManualAttendanceViewProps> = ({
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  students,
  classrooms,
  dormitoryRooms,
  records,
  sessionParticipants,
  excusals,
  recordHistories,
  activities,
  currentUser,
  onRecordStatus,
  onBulkMarkPresent,
  onBulkApplyStatus,
  onCorrectStatus,
  onOpenSession,
  onCloseSession,
}) => {
  // View Modes: 'quick' | 'detailed' | 'mobile'
  const [viewMode, setViewMode] = useState<'quick' | 'detailed' | 'mobile'>('quick');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all' | 'unrecorded' | AttendanceStatus
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [sortUnrecordedFirst, setSortUnrecordedFirst] = useState<boolean>(true);

  // Selection for Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Modals & Drawers
  const [isMarkAllModalOpen, setIsMarkAllModalOpen] = useState<boolean>(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState<boolean>(false);
  const [correctionTarget, setCorrectionTarget] = useState<{ record: AttendanceRecord; newStatus: AttendanceStatus } | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [historyDrawerRecord, setHistoryDrawerRecord] = useState<AttendanceRecord | null>(null);
  const [activeNotesStudentId, setActiveNotesStudentId] = useState<number | null>(null);
  const [customNote, setCustomNote] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find currently active session (prioritize OPEN sessions, fallback to selected or first)
  const activeSession = useMemo(() => {
    if (selectedSessionId) {
      const found = sessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    const openSess = sessions.find((s) => s.status === 'open');
    if (openSess) return openSess;
    return sessions[0];
  }, [sessions, selectedSessionId]);

  const activeActivity = useMemo(() => {
    return activities.find((a) => a.id === activeSession?.activity_id);
  }, [activities, activeSession]);

  // Session summary calculation
  const summary = useMemo(() => {
    if (!activeSession) {
      return {
        total_participants: 0,
        recorded: 0,
        unrecorded: 0,
        present: 0,
        late: 0,
        permission: 0,
        sick: 0,
        dispensation: 0,
        absent: 0,
        attendance_rate: 0,
        completion_rate: 0,
        excused_rate: 0,
      };
    }
    return AttendanceSummaryService.calculateSessionSummary(activeSession, sessionParticipants, records);
  }, [activeSession, sessionParticipants, records]);

  // Map of student records in this session
  const sessionRecords = useMemo(() => {
    return records.filter((r) => r.attendance_session_id === activeSession?.id);
  }, [records, activeSession]);

  const recordMap = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();
    sessionRecords.forEach((r) => map.set(r.student_id, r));
    return map;
  }, [sessionRecords]);

  // Filter session participants
  const participantsForActiveSession = useMemo(() => {
    if (!activeSession) return [];
    return sessionParticipants.filter(
      (p) => p.attendance_session_id === activeSession.id && p.eligibility_status !== 'ineligible'
    );
  }, [activeSession, sessionParticipants]);

  // Merge participant info with student master data
  const eligibleStudents = useMemo(() => {
    if (participantsForActiveSession.length > 0) {
      return participantsForActiveSession.map((p) => {
        const fullStudent = students.find((s) => s.id === p.student_id);
        if (fullStudent) return fullStudent;
        return {
          id: p.student_id,
          student_number: p.student_number,
          nisn: '-',
          name: p.student_name,
          gender: 'male',
          classroom_name: p.classroom_name,
          dormitory_room_name: p.dormitory_room_name,
          generation_year: 2026,
          qr_token: `STU-${p.student_id}`,
          status: 'active',
          is_active: true,
        } as Student;
      });
    }
    return students.filter((s) => s.is_active);
  }, [participantsForActiveSession, students]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return eligibleStudents
      .filter((s) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchNis = s.student_number.toLowerCase().includes(q);
          const matchClass = s.classroom_name?.toLowerCase().includes(q) || false;
          if (!matchName && !matchNis && !matchClass) return false;
        }

        // Class filter
        if (selectedClassId !== 'all' && s.classroom_id !== Number(selectedClassId)) {
          return false;
        }

        // Room filter
        if (selectedRoomId !== 'all' && s.dormitory_room_id !== Number(selectedRoomId)) {
          return false;
        }

        // Status filter
        const rec = recordMap.get(s.id);
        if (statusFilter === 'unrecorded') {
          if (rec) return false;
        } else if (statusFilter !== 'all') {
          if (!rec || rec.status !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortUnrecordedFirst) {
          const aRecorded = recordMap.has(a.id);
          const bRecorded = recordMap.has(b.id);
          if (!aRecorded && bRecorded) return -1;
          if (aRecorded && !bRecorded) return 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [eligibleStudents, searchTerm, selectedClassId, selectedRoomId, statusFilter, sortUnrecordedFirst, recordMap]);

  // Unrecorded student count
  const unrecordedCount = summary.unrecorded;

  // Handle single student click
  const handleStudentAction = (student: Student, targetStatus: AttendanceStatus) => {
    if (!activeSession) return;

    if (activeSession.status !== 'open') {
      showToast(`⚠️ Sesi tidak dalam status OPEN (${activeSession.status.toUpperCase()}).`);
      return;
    }

    const existingRec = recordMap.get(student.id);

    if (existingRec) {
      // Prompt for correction with mandatory reason
      setCorrectionTarget({ record: existingRec, newStatus: targetStatus });
      setCorrectionReason('');
      return;
    }

    // Direct record
    onRecordStatus({
      sessionId: activeSession.id,
      student,
      status: targetStatus,
    });
    showToast(`✓ Absensi ${student.name} dicatat sebagai ${targetStatus.toUpperCase()}.`);
  };

  // Handle submit correction
  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !correctionReason.trim()) return;

    onCorrectStatus(correctionTarget.record, correctionTarget.newStatus, correctionReason.trim());
    showToast(`✓ Koreksi status ${correctionTarget.record.student_name} berhasil disimpan.`);
    setCorrectionTarget(null);
    setCorrectionReason('');
  };

  // Handle bulk action
  const handleBulkApply = (status: AttendanceStatus) => {
    if (!activeSession || activeSession.status !== 'open' || selectedStudentIds.length === 0) return;
    onBulkApplyStatus(activeSession.id, selectedStudentIds, status);
    showToast(`✓ Menandai ${selectedStudentIds.length} santri sebagai ${status.toUpperCase()}.`);
    setSelectedStudentIds([]);
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleSelectStudent = (studentId: number) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  return (
    <div id="manual-attendance-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-zinc-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Session Selector */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 relative overflow-hidden shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/15 text-emerald-100 border border-white/20 flex items-center gap-1.5 backdrop-blur-xs">
                <Zap className="w-3.5 h-3.5 text-[#C9A227]" />
                Operasional Manual Presensi
              </span>
              <span className="font-mono text-xs font-bold text-white bg-black/25 px-2.5 py-1 rounded-xl border border-white/15 backdrop-blur-xs">
                {activeSession?.session_code || 'ATT-20260823-001'}
              </span>
              {activeSession?.status === 'open' ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/30 text-white border border-emerald-400/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                  SESI BERLANGSUNG (OPEN)
                </span>
              ) : activeSession?.status === 'draft' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  DRAF (BELUM DIBUKA)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/25 text-emerald-100/70 border border-white/15">
                  SESI DITUTUP (CLOSED)
                </span>
              )}
            </div>

            {/* Session Title & Info */}
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {activeSession?.activity_name || 'Belum Ada Sesi Presensi'}
            </h1>
            {activeSession ? (
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100/90">
                <span>Lokasi: <strong className="text-white">{activeSession.location || '-'}</strong></span>
                <span>&bull;</span>
                <span>Waktu Sesi: <strong className="font-mono text-white">{activeSession.start_at ? activeSession.start_at.slice(11, 16) : '--:--'} - {activeSession.end_at ? activeSession.end_at.slice(11, 16) : '--:--'}</strong></span>
                <span>&bull;</span>
                <span>Batas Hadir Tepat Waktu: <strong className="font-mono text-[#C9A227] font-bold">{activeSession.present_until ? activeSession.present_until.slice(11, 16) : '--:--'}</strong></span>
              </div>
            ) : (
              <p className="text-xs text-emerald-100/90">Pilih atau buat sesi presensi baru untuk mulai mencatat kehadiran.</p>
            )}
          </div>

          {/* Session Switcher & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Session Dropdown */}
            <div className="relative">
              <select
                value={activeSession?.id || ''}
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                className="w-full bg-black/25 border border-white/20 hover:border-white/40 text-white text-xs font-semibold rounded-2xl px-4 py-3 appearance-none pr-10 focus:outline-none cursor-pointer backdrop-blur-xs shadow-inner"
              >
                {sessions.length === 0 ? (
                  <option value="">Belum Ada Sesi Tersedia</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.status === 'open' ? '🟢 [OPEN] ' : s.status === 'draft' ? '🟡 [DRAFT] ' : '⚪ [CLOSED] '}
                      {s.activity_name} ({s.session_date})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            {/* Open / Close Session Control Buttons */}
            {activeSession?.status === 'draft' && (
              <button
                onClick={() => onOpenSession(activeSession.id)}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                id="btn-open-session-manual"
              >
                <Unlock className="w-4 h-4" />
                <span>Buka Sesi Sekarang</span>
              </button>
            )}

            {activeSession?.status === 'open' && (
              <button
                onClick={() => setIsCloseSessionModalOpen(true)}
                className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                id="btn-close-session-manual"
              >
                <Lock className="w-4 h-4" />
                <span>Tutup Sesi (Auto Alpha)</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Summary Cards & Progress */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {/* Metric 1: Total Participants */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-zinc-500">Peserta</div>
              <div className="text-xl font-black text-white mt-0.5">{summary.total_participants}</div>
              <div className="text-[10px] text-zinc-400">Snapshot Santri</div>
            </div>

            {/* Metric 2: Recorded Progress */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-zinc-500">Tercatat</div>
              <div className="text-xl font-black text-blue-400 mt-0.5">{summary.recorded}</div>
              <div className="text-[10px] font-bold text-blue-300/80">{summary.completion_rate}% Selesai</div>
            </div>

            {/* Metric 3: Hadir */}
            <div className="bg-zinc-950/70 border border-lime-500/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-lime-400">Hadir</div>
              <div className="text-xl font-black text-lime-400 mt-0.5">{summary.present}</div>
              <div className="text-[10px] text-lime-300/70">Tepat Waktu</div>
            </div>

            {/* Metric 4: Terlambat */}
            <div className="bg-zinc-950/70 border border-amber-500/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-400">Terlambat</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">{summary.late}</div>
              <div className="text-[10px] text-amber-300/70">Auto / Manual</div>
            </div>

            {/* Metric 5: Izin */}
            <div className="bg-zinc-950/70 border border-sky-500/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-sky-400">Izin</div>
              <div className="text-xl font-black text-sky-400 mt-0.5">{summary.permission}</div>
              <div className="text-[10px] text-sky-300/70">Keluarga</div>
            </div>

            {/* Metric 6: Sakit */}
            <div className="bg-zinc-950/70 border border-purple-500/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-purple-400">Sakit</div>
              <div className="text-xl font-black text-purple-400 mt-0.5">{summary.sick}</div>
              <div className="text-[10px] text-purple-300/70">UKS / Rawat</div>
            </div>

            {/* Metric 7: Dispensasi */}
            <div className="bg-zinc-950/70 border border-teal-500/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-teal-400">Dispensasi</div>
              <div className="text-xl font-black text-teal-400 mt-0.5">{summary.dispensation}</div>
              <div className="text-[10px] text-teal-300/70">Lomba / Tugas</div>
            </div>

            {/* Metric 8: Belum Absen */}
            <div className={`bg-zinc-950/70 border ${unrecordedCount > 0 ? 'border-rose-500/30' : 'border-zinc-800'} rounded-2xl p-3 text-center`}>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Belum Absen</div>
              <div className={`text-xl font-black ${unrecordedCount > 0 ? 'text-rose-400' : 'text-zinc-500'} mt-0.5`}>
                {unrecordedCount}
              </div>
              <div className="text-[10px] text-zinc-500">{summary.absent > 0 ? `${summary.absent} Alpha` : 'Belum Ditandai'}</div>
            </div>
          </div>

          {/* Dual Progress Bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-400 inline-block"></span>
                Tingkat Kehadiran Efektif: <strong className="text-lime-400">{summary.attendance_rate}%</strong>
              </span>
              <span>
                Progress Tercatat: <strong className="text-blue-400">{summary.recorded} / {summary.total_participants} ({summary.completion_rate}%)</strong>
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
              <div style={{ width: `${(summary.present / Math.max(1, summary.total_participants)) * 100}%` }} className="bg-lime-400 h-full" title={`Hadir: ${summary.present}`} />
              <div style={{ width: `${(summary.late / Math.max(1, summary.total_participants)) * 100}%` }} className="bg-amber-400 h-full" title={`Terlambat: ${summary.late}`} />
              <div style={{ width: `${(summary.permission / Math.max(1, summary.total_participants)) * 100}%` }} className="bg-sky-400 h-full" title={`Izin: ${summary.permission}`} />
              <div style={{ width: `${(summary.sick / Math.max(1, summary.total_participants)) * 100}%` }} className="bg-purple-400 h-full" title={`Sakit: ${summary.sick}`} />
              <div style={{ width: `${(summary.dispensation / Math.max(1, summary.total_participants)) * 100}%` }} className="bg-teal-400 h-full" title={`Dispensasi: ${summary.dispensation}`} />
              <div style={{ width: `${(summary.absent / Math.max(1, summary.total_participants)) * 100}%` }} className="bg-rose-500 h-full" title={`Alpha: ${summary.absent}`} />
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ATTENDANCE ACTION BAR (Sprint 3 Core Feature) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Quick Mark All Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMarkAllModalOpen(true)}
              disabled={activeSession?.status !== 'open' || unrecordedCount === 0}
              className={`px-5 py-3.5 rounded-2xl font-black text-xs flex items-center gap-2.5 transition shadow-lg cursor-pointer ${
                activeSession?.status === 'open' && unrecordedCount > 0
                  ? 'bg-lime-400 hover:bg-lime-300 text-zinc-950 shadow-lime-400/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
              id="btn-mark-all-present"
            >
              <Zap className="w-4 h-4" />
              <span>HADIRKAN SEMUA BELUM ABSEN ({unrecordedCount})</span>
            </button>

            <span className="text-xs text-zinc-400 hidden sm:inline">
              Otomatis menghitung Hadir/Terlambat sesuai jam server tanpa menimpa yang sudah berstatus Izin/Sakit.
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setViewMode('quick')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'quick'
                  ? 'bg-zinc-800 text-lime-400 border border-lime-400/20 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mode Cepat</span>
            </button>

            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-zinc-800 text-lime-400 border border-lime-400/20 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel Detail & Massal</span>
            </button>

            <button
              onClick={() => setViewMode('mobile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-zinc-800 text-lime-400 border border-lime-400/20 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mode Mobile</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Bulk Toolbar (when items selected) */}
        {selectedStudentIds.length > 0 && (
          <div className="p-3 bg-zinc-950 border border-lime-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in zoom-in-98 duration-150">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-lime-400/20 text-lime-300 font-bold text-xs rounded-lg border border-lime-400/30">
                {selectedStudentIds.length} santri dipilih
              </span>
              <span className="text-xs text-zinc-400">Tandai status massal:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBulkApply('present')}
                className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                ✓ Hadir
              </button>
              <button
                onClick={() => handleBulkApply('permission')}
                className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Izin
              </button>
              <button
                onClick={() => handleBulkApply('sick')}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Sakit
              </button>
              <button
                onClick={() => handleBulkApply('dispensation')}
                className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Dispensasi
              </button>
              <button
                onClick={() => handleBulkApply('absent')}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Alpha
              </button>
              <button
                onClick={() => setSelectedStudentIds([])}
                className="px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold ml-2 cursor-pointer"
              >
                Batal Pilih
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
          {/* Status Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semua ({eligibleStudents.length})
            </button>

            <button
              onClick={() => setStatusFilter('unrecorded')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'unrecorded'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Belum Absen</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500/20 text-rose-300 rounded-full font-mono">
                {unrecordedCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('present')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'present'
                  ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Hadir ({summary.present})
            </button>

            <button
              onClick={() => setStatusFilter('late')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'late'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Terlambat ({summary.late})
            </button>

            <button
              onClick={() => setStatusFilter('sick')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'sick'
                  ? 'bg-purple-400/20 text-purple-300 border border-purple-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sakit ({summary.sick})
            </button>

            <button
              onClick={() => setStatusFilter('permission')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'permission'
                  ? 'bg-sky-400/20 text-sky-300 border border-sky-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Izin ({summary.permission})
            </button>
          </div>

          {/* Search and Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Toggle */}
            <button
              onClick={() => setSortUnrecordedFirst(!sortUnrecordedFirst)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                sortUnrecordedFirst
                  ? 'bg-zinc-800 text-lime-400 border-lime-500/30'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
              title="Urutkan santri yang belum absen di paling atas"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Belum Absen Teratas</span>
            </button>

            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-lime-400"
            >
              <option value="all">Semua Kelas</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>Kelas {c.name}</option>
              ))}
            </select>

            {/* Room Filter */}
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-lime-400"
            >
              <option value="all">Semua Kamar</option>
              {dormitoryRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.code || r.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama, NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-lime-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO viewMode */}

      {/* 1. MODE QUICK ATTENDANCE (Cards Grid for Fast Visual Scanning) */}
      {viewMode === 'quick' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center">
              <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300">Tidak Ada Santri Ditemukan</h3>
              <p className="text-xs text-zinc-500 mt-1">Sesuaikan filter atau pencarian Anda di atas.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const record = recordMap.get(student.id);
              const activeExcuse = activeSession ? ExcuseService.findActiveApprovedExcuse(student.id, activeSession, excusals) : undefined;
              const hasHistory = recordHistories.some((h) => h.student_id === student.id);

              return (
                <div
                  key={student.id}
                  className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between transition-all duration-150 ${
                    record?.status === 'present'
                      ? 'border-lime-500/40 bg-gradient-to-b from-lime-950/20 to-zinc-900'
                      : record?.status === 'late'
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-zinc-900'
                      : record?.status === 'sick'
                      ? 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 to-zinc-900'
                      : record?.status === 'permission'
                      ? 'border-sky-500/40 bg-gradient-to-b from-sky-950/20 to-zinc-900'
                      : record?.status === 'dispensation'
                      ? 'border-teal-500/40 bg-gradient-to-b from-teal-950/20 to-zinc-900'
                      : record?.status === 'absent'
                      ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-zinc-900'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    {/* Top Status & Excuse Badges */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      {record ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                              record.status === 'present'
                                ? 'bg-lime-400 text-zinc-950'
                                : record.status === 'late'
                                ? 'bg-amber-400 text-zinc-950'
                                : record.status === 'sick'
                                ? 'bg-purple-400 text-zinc-950'
                                : record.status === 'permission'
                                ? 'bg-sky-400 text-zinc-950'
                                : record.status === 'dispensation'
                                ? 'bg-teal-400 text-zinc-950'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            {record.status === 'present' && '✓ HADIR'}
                            {record.status === 'late' && `! TELAT (${record.late_minutes}M)`}
                            {record.status === 'sick' && 'S SAKIT'}
                            {record.status === 'permission' && 'I IZIN'}
                            {record.status === 'dispensation' && 'D DISPENSASI'}
                            {record.status === 'absent' && 'A ALPHA'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {record.check_in_at.slice(11, 16)}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          - BELUM ABSEN
                        </span>
                      )}

                      {/* History & Notes Indicator */}
                      <div className="flex items-center gap-1">
                        {hasHistory && (
                          <button
                            onClick={() => setHistoryDrawerRecord(record || null)}
                            className="p-1 text-zinc-400 hover:text-amber-400 transition"
                            title="Lihat riwayat koreksi"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {record?.notes && (
                          <span title={record.notes} className="text-zinc-400 cursor-help">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Excuse Alert Pill */}
                    {activeExcuse && !record && (
                      <div className="mb-2 p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-1 text-[11px] text-amber-300">
                        <span className="truncate">
                          ⚠️ {activeExcuse.type.toUpperCase()}: {activeExcuse.reason}
                        </span>
                        <button
                          onClick={() => handleStudentAction(student, activeExcuse.type)}
                          className="px-2 py-0.5 bg-amber-500 text-zinc-950 font-bold rounded-lg shrink-0 text-[10px] hover:bg-amber-400"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}

                    {/* Student Name & NIS */}
                    <div className="mb-3">
                      <h4 className="text-sm font-bold text-white line-clamp-1 leading-snug">{student.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-300">{student.student_number}</span>
                        <span>&bull;</span>
                        <span className="text-zinc-400">{student.classroom_name || 'VII A'}</span>
                        <span>&bull;</span>
                        <span className="text-zinc-500">{student.dormitory_room_name || 'Kamar'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Touch Action Buttons for Quick Attendance */}
                  <div className="pt-2 border-t border-zinc-800/80">
                    <div className="grid grid-cols-6 gap-1">
                      {/* [H] Hadir */}
                      <button
                        onClick={() => handleStudentAction(student, 'present')}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          record?.status === 'present'
                            ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/30'
                            : 'bg-zinc-800 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300'
                        }`}
                        title="Tandai Hadir"
                      >
                        H
                      </button>

                      {/* [T] Terlambat */}
                      <button
                        onClick={() => handleStudentAction(student, 'late')}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          record?.status === 'late'
                            ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/30'
                            : 'bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300'
                        }`}
                        title="Tandai Terlambat"
                      >
                        T
                      </button>

                      {/* [I] Izin */}
                      <button
                        onClick={() => handleStudentAction(student, 'permission')}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          record?.status === 'permission'
                            ? 'bg-sky-400 text-zinc-950 shadow-md shadow-sky-400/30'
                            : 'bg-zinc-800 hover:bg-sky-400 hover:text-zinc-950 text-zinc-300'
                        }`}
                        title="Tandai Izin"
                      >
                        I
                      </button>

                      {/* [S] Sakit */}
                      <button
                        onClick={() => handleStudentAction(student, 'sick')}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          record?.status === 'sick'
                            ? 'bg-purple-400 text-zinc-950 shadow-md shadow-purple-400/30'
                            : 'bg-zinc-800 hover:bg-purple-400 hover:text-zinc-950 text-zinc-300'
                        }`}
                        title="Tandai Sakit"
                      >
                        S
                      </button>

                      {/* [D] Dispensasi */}
                      <button
                        onClick={() => handleStudentAction(student, 'dispensation')}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          record?.status === 'dispensation'
                            ? 'bg-teal-400 text-zinc-950 shadow-md shadow-teal-400/30'
                            : 'bg-zinc-800 hover:bg-teal-400 hover:text-zinc-950 text-zinc-300'
                        }`}
                        title="Tandai Dispensasi"
                      >
                        D
                      </button>

                      {/* [A] Alpha */}
                      <button
                        onClick={() => handleStudentAction(student, 'absent')}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          record?.status === 'absent'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                            : 'bg-zinc-800 hover:bg-rose-500 hover:text-white text-zinc-300'
                        }`}
                        title="Tandai Alpha"
                      >
                        A
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. MODE DETAILED ATTENDANCE (Table with Checkboxes & Bulk Operations) */}
      {viewMode === 'detailed' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[11px] font-bold border-b border-zinc-800">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-lime-400 focus:ring-lime-400"
                    />
                  </th>
                  <th className="p-4">Santri</th>
                  <th className="p-4">NIS / NISN</th>
                  <th className="p-4">Kelas & Kamar</th>
                  <th className="p-4">Status Presensi</th>
                  <th className="p-4">Waktu Check-In</th>
                  <th className="p-4">Metode / Petugas</th>
                  <th className="p-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      Tidak ada santri sesuai kriteria pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const record = recordMap.get(student.id);
                    const activeExcuse = activeSession ? ExcuseService.findActiveApprovedExcuse(student.id, activeSession, excusals) : undefined;
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-zinc-800/40 transition ${
                          isSelected ? 'bg-lime-400/5' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-lime-400 focus:ring-lime-400"
                          />
                        </td>

                        <td className="p-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>{student.name}</span>
                            {activeExcuse && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Izin Aktif: {activeExcuse.type}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 font-mono text-zinc-300">
                          {student.student_number}
                        </td>

                        <td className="p-4 text-zinc-400">
                          <div>{student.classroom_name || '-'}</div>
                          <div className="text-[11px] text-zinc-500">{student.dormitory_room_name || '-'}</div>
                        </td>

                        <td className="p-4">
                          {record ? (
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                record.status === 'present'
                                  ? 'bg-lime-400 text-zinc-950'
                                  : record.status === 'late'
                                  ? 'bg-amber-400 text-zinc-950'
                                  : record.status === 'sick'
                                  ? 'bg-purple-400 text-zinc-950'
                                  : record.status === 'permission'
                                  ? 'bg-sky-400 text-zinc-950'
                                  : record.status === 'dispensation'
                                  ? 'bg-teal-400 text-zinc-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {record.status === 'present' && '✓ Hadir'}
                              {record.status === 'late' && `! Terlambat (${record.late_minutes}m)`}
                              {record.status === 'sick' && 'Sakit'}
                              {record.status === 'permission' && 'Izin'}
                              {record.status === 'dispensation' && 'Dispensasi'}
                              {record.status === 'absent' && 'Alpha'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              - Belum Absen
                            </span>
                          )}
                        </td>

                        <td className="p-4 font-mono text-zinc-300">
                          {record ? record.check_in_at.slice(11, 16) : '-'}
                        </td>

                        <td className="p-4 text-zinc-400">
                          {record ? (
                            <div>
                              <span className="uppercase text-[10px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                                {record.method}
                              </span>
                              <span className="text-[11px] text-zinc-500 ml-1.5">
                                oleh {record.recorded_by || 'Sistem'}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStudentAction(student, 'present')}
                              className="px-2 py-1 bg-lime-400/20 hover:bg-lime-400 text-lime-300 hover:text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer"
                              title="Tandai Hadir"
                            >
                              H
                            </button>
                            <button
                              onClick={() => handleStudentAction(student, 'permission')}
                              className="px-2 py-1 bg-sky-500/20 hover:bg-sky-400 text-sky-300 hover:text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer"
                              title="Tandai Izin"
                            >
                              I
                            </button>
                            <button
                              onClick={() => handleStudentAction(student, 'sick')}
                              className="px-2 py-1 bg-purple-500/20 hover:bg-purple-400 text-purple-300 hover:text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer"
                              title="Tandai Sakit"
                            >
                              S
                            </button>
                            <button
                              onClick={() => handleStudentAction(student, 'absent')}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded-lg text-xs transition cursor-pointer"
                              title="Tandai Alpha"
                            >
                              A
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MODE MOBILE OPERATIONAL (Touch-optimized list for phones & tablets) */}
      {viewMode === 'mobile' && (
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
              Tidak ada data santri ditemukan.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const record = recordMap.get(student.id);
              const activeExcuse = activeSession ? ExcuseService.findActiveApprovedExcuse(student.id, activeSession, excusals) : undefined;

              return (
                <div
                  key={student.id}
                  className={`bg-zinc-900 border rounded-2xl p-4 space-y-3 ${
                    record ? 'border-zinc-700 bg-zinc-900/90' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-black text-white">{student.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-300">{student.student_number}</span>
                        <span>&bull;</span>
                        <span>{student.classroom_name || 'VII A'}</span>
                        <span>&bull;</span>
                        <span>{student.dormitory_room_name || 'Kamar'}</span>
                      </div>
                    </div>

                    <div>
                      {record ? (
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                            record.status === 'present'
                              ? 'bg-lime-400 text-zinc-950'
                              : record.status === 'late'
                              ? 'bg-amber-400 text-zinc-950'
                              : record.status === 'sick'
                              ? 'bg-purple-400 text-zinc-950'
                              : record.status === 'permission'
                              ? 'bg-sky-400 text-zinc-950'
                              : record.status === 'dispensation'
                              ? 'bg-teal-400 text-zinc-950'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {record.status}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-400">
                          BELUM
                        </span>
                      )}
                    </div>
                  </div>

                  {activeExcuse && !record && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                      <span>⚠️ Ada Izin Aktif ({activeExcuse.type})</span>
                      <button
                        onClick={() => handleStudentAction(student, activeExcuse.type)}
                        className="px-2.5 py-1 bg-amber-500 text-zinc-950 font-bold rounded-lg text-xs"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}

                  {/* Big Touch Buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <button
                      onClick={() => handleStudentAction(student, 'present')}
                      className="py-3 bg-lime-400 hover:bg-lime-300 active:scale-95 text-zinc-950 font-black rounded-xl text-xs transition cursor-pointer flex flex-col items-center justify-center shadow"
                    >
                      <span>HADIR</span>
                      <span className="text-[10px] font-normal opacity-80">Tepat Waktu</span>
                    </button>

                    <button
                      onClick={() => handleStudentAction(student, 'late')}
                      className="py-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-black rounded-xl text-xs transition cursor-pointer flex flex-col items-center justify-center shadow"
                    >
                      <span>TERLAMBAT</span>
                      <span className="text-[10px] font-normal opacity-80">Telat</span>
                    </button>

                    <button
                      onClick={() => handleStudentAction(student, 'permission')}
                      className="py-3 bg-sky-500/20 hover:bg-sky-400 hover:text-zinc-950 text-sky-300 border border-sky-500/40 active:scale-95 font-bold rounded-xl text-xs transition cursor-pointer flex flex-col items-center justify-center"
                    >
                      <span>IZIN</span>
                      <span className="text-[10px] font-normal opacity-80">Keluarga</span>
                    </button>

                    <button
                      onClick={() => handleStudentAction(student, 'sick')}
                      className="py-3 bg-purple-500/20 hover:bg-purple-400 hover:text-zinc-950 text-purple-300 border border-purple-500/40 active:scale-95 font-bold rounded-xl text-xs transition cursor-pointer flex flex-col items-center justify-center"
                    >
                      <span>SAKIT</span>
                      <span className="text-[10px] font-normal opacity-80">UKS</span>
                    </button>

                    <button
                      onClick={() => handleStudentAction(student, 'dispensation')}
                      className="py-3 bg-teal-500/20 hover:bg-teal-400 hover:text-zinc-950 text-teal-300 border border-teal-500/40 active:scale-95 font-bold rounded-xl text-xs transition cursor-pointer flex flex-col items-center justify-center"
                    >
                      <span>DISPENSASI</span>
                      <span className="text-[10px] font-normal opacity-80">Lomba</span>
                    </button>

                    <button
                      onClick={() => handleStudentAction(student, 'absent')}
                      className="py-3 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-500/40 active:scale-95 font-bold rounded-xl text-xs transition cursor-pointer flex flex-col items-center justify-center"
                    >
                      <span>ALPHA</span>
                      <span className="text-[10px] font-normal opacity-80">Tanpa Ket</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: Mark All Present Confirmation */}
      {isMarkAllModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-lime-400/20 text-lime-400 border border-lime-400/30">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Konfirmasi Hadir Semua</h3>
                <p className="text-xs text-zinc-400">Pencatatan massal santri yang belum absen</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs space-y-2 text-zinc-300">
              <p>
                Sistem akan menandai <strong className="text-lime-400">{unrecordedCount} santri</strong> yang belum absen sebagai <strong>Hadir/Terlambat</strong> sesuai waktu server sekarang.
              </p>
              <p className="text-zinc-400">
                Santri yang sudah tercatat (Sakit, Izin, Dispensasi, Alpha) <strong>tidak akan ditimpa</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMarkAllModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onBulkMarkPresent(activeSession.id);
                  setIsMarkAllModalOpen(false);
                  showToast(`✓ Berhasil memproses Hadir Semua untuk ${unrecordedCount} santri.`);
                }}
                className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-black rounded-xl shadow-lg shadow-lime-400/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Ya, Hadirkan Semua ({unrecordedCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Close Session Confirmation with Auto Alpha */}
      {isCloseSessionModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Tutup Sesi & Auto Alpha</h3>
                <p className="text-xs text-zinc-400">Finalisasi absensi sesi kegiatan</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs space-y-2 text-zinc-300">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Total Peserta Sesi:</span>
                <span className="font-bold text-white">{summary.total_participants}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Sudah Tercatat:</span>
                <span className="font-bold text-emerald-400">{summary.recorded}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-zinc-400">Belum Tercatat:</span>
                <span className="font-bold text-rose-400">{summary.unrecorded} santri</span>
              </div>

              <div className="pt-2 text-amber-300/90 text-[11px] leading-relaxed">
                ⚠️ <strong>Perhatian:</strong> {summary.unrecorded} santri yang belum tercatat akan otomatis diperiksa izin aktifnya. Jika ada dispensasi/izin disetujui, akan diterapkan otomatis; sisanya akan ditandai sebagai <strong>Alpha</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCloseSessionModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseSession(activeSession.id);
                  setIsCloseSessionModalOpen(false);
                  showToast(`✓ Sesi '${activeSession.session_code}' berhasil ditutup dengan Auto Alpha.`);
                }}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Tutup Sesi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Attendance Correction (Mandatory Reason) */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Koreksi Status Presensi</h3>
                <p className="text-xs text-zinc-400">Audit trail wajib mencatat alasan perubahan</p>
              </div>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Santri:</span>
                  <span className="font-bold text-white">{correctionTarget.record.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status Sebelumnya:</span>
                  <span className="font-bold uppercase text-zinc-300">{correctionTarget.record.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status Baru:</span>
                  <span className="font-bold uppercase text-lime-400">{correctionTarget.newStatus}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Alasan Koreksi <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Kesalahan klik petugas / Surat izin dokter UKS diterima setelah sesi..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!correctionReason.trim()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL 4: Record History Audit Trail */}
      {historyDrawerRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Riwayat Audit Perubahan</h3>
                  <p className="text-xs text-zinc-400">{historyDrawerRecord.student_name} ({historyDrawerRecord.student_number})</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryDrawerRecord(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {recordHistories.filter(h => h.student_id === historyDrawerRecord.student_id).length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950 rounded-2xl">
                  Belum ada catatan koreksi untuk santri ini.
                </div>
              ) : (
                recordHistories
                  .filter(h => h.student_id === historyDrawerRecord.student_id)
                  .map((hist) => (
                    <div key={hist.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                            {hist.old_status}
                          </span>
                          <ArrowRight className="w-3 h-3 text-zinc-600" />
                          <span className="px-2 py-0.5 rounded bg-lime-400/20 text-lime-300 font-bold uppercase text-[10px]">
                            {hist.new_status}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">{hist.changed_at}</span>
                      </div>

                      <p className="text-zinc-300 pt-1">
                        <strong className="text-zinc-400">Alasan:</strong> {hist.reason}
                      </p>

                      <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                        Diubah oleh: <span className="text-zinc-400">{hist.changed_by}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryDrawerRecord(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
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
