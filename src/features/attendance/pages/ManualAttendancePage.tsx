import React, { useEffect, useState, useCallback } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Sparkles, 
  RefreshCw, 
  CheckCheck, 
  XCircle, 
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ResponsiveTable } from '../../../components/ui/ResponsiveTable';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { attendanceApi } from '../api/attendanceApi';
import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  User 
} from '../types';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { AttendanceMethodBadge } from '../components/AttendanceMethodBadge';
import { SessionStatusBadge } from '../components/SessionStatusBadge';
import { AttendanceActionMenu } from '../components/AttendanceActionMenu';
import { ParticipantAttendanceCard } from '../components/ParticipantAttendanceCard';
import { AttendanceCorrectionModal } from '../components/AttendanceCorrectionModal';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { INITIAL_CLASSROOMS, INITIAL_USERS } from '../../../data/initialData';
import { AudioFeedbackService } from '../../../services/audioFeedbackService';
import { formatAttendanceTime } from '../utils/attendanceUtils';

interface ManualAttendancePageProps {
  initialSessionId?: number;
  currentUser?: User;
  onBack?: () => void;
  onNavigateToDetail?: (sessionId: number) => void;
}

export const ManualAttendancePage: React.FC<ManualAttendancePageProps> = ({
  initialSessionId,
  currentUser,
  onBack,
  onNavigateToDetail,
}) => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId || null);
  const [participants, setParticipants] = useState<AttendanceSessionParticipant[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassroom, setSelectedClassroom] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'unrecorded' | 'all'>('all');

  // Bulk Action Dialog
  const [bulkAction, setBulkAction] = useState<AttendanceStatus | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);

  // Correction Modal
  const [recordToCorrect, setRecordToCorrect] = useState<AttendanceRecord | null>(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState<boolean>(false);
  const [isProcessingCorrection, setIsProcessingCorrection] = useState<boolean>(false);

  // Load Sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await attendanceApi.getSessions();
      setSessions(data);
      if (!selectedSessionId && data.length > 0) {
        // Default to first open session or first session
        const open = data.find((s) => s.status === 'open');
        setSelectedSessionId(open ? open.id : data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions for manual attendance:', err);
    }
  }, [selectedSessionId]);

  // Load session participants and records
  const loadSessionData = useCallback(async () => {
    if (!selectedSessionId) return;
    setIsLoading(true);
    try {
      const [participantsData, recordsData] = await Promise.all([
        attendanceApi.getSessionParticipants(selectedSessionId),
        attendanceApi.getSessionRecords(selectedSessionId),
      ]);
      setParticipants(participantsData);
      setRecords(recordsData);
    } catch (err) {
      console.error('Failed to load session participants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionData();
    }
  }, [selectedSessionId, loadSessionData]);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const isSessionOpen = currentSession?.status === 'open';

  // Single Record Action
  const handleRecordStatus = async (studentId: number, status: AttendanceStatus) => {
    if (!selectedSessionId || !isSessionOpen) return;
    try {
      const res = await attendanceApi.recordManual({
        sessionId: selectedSessionId,
        studentId,
        status,
        operator: currentUser,
      });

      if (res.success) {
        if (status === 'present') {
          AudioFeedbackService.playSuccess();
        } else if (status === 'late') {
          AudioFeedbackService.playLate();
        }
        await loadSessionData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat absensi.');
    }
  };

  // Bulk Record Action for remaining unrecorded participants
  const handleBulkSubmit = async () => {
    if (!selectedSessionId || !bulkAction || !isSessionOpen) return;
    setIsProcessingBulk(true);

    const recordMap = new Map<number, AttendanceRecord>();
    records.forEach((r) => recordMap.set(r.student_id, r));

    const unrecordedStudentIds = participants
      .filter((p) => !recordMap.has(p.student_id))
      .map((p) => p.student_id);

    if (unrecordedStudentIds.length === 0) {
      alert('Semua santri pada sesi ini sudah memiliki absensi.');
      setIsProcessingBulk(false);
      setBulkAction(null);
      return;
    }

    try {
      const res = await attendanceApi.recordBulkManual({
        sessionId: selectedSessionId,
        studentIds: unrecordedStudentIds,
        status: bulkAction,
        operator: currentUser,
        notes: `Pencatatan massal ${bulkAction.toUpperCase()} oleh ${currentUser.name}`,
      });

      AudioFeedbackService.playSuccess();
      setBulkAction(null);
      await loadSessionData();
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan absensi massal.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Correction Submit
  const handleCorrectionSubmit = async (recordId: number, newStatus: AttendanceStatus, reason: string) => {
    setIsProcessingCorrection(true);
    try {
      const res = await attendanceApi.correctRecord({
        recordId,
        newStatus,
        reason,
        operator: currentUser,
      });
      if (res.success) {
        await loadSessionData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengoreksi absensi.');
    } finally {
      setIsProcessingCorrection(false);
    }
  };

  // Filtered List
  const recordMap = new Map<number, AttendanceRecord>();
  records.forEach((r) => recordMap.set(r.student_id, r));

  const filteredParticipants = participants.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.student_name?.toLowerCase().includes(q);
      const matchNis = p.student_number?.toLowerCase().includes(q);
      if (!matchName && !matchNis) return false;
    }
    if (selectedClassroom !== 'all') {
      if (p.classroom_id !== selectedClassroom) return false;
    }
    const rec = recordMap.get(p.student_id);
    if (statusFilter === 'unrecorded') {
      if (rec) return false;
    } else if (statusFilter !== 'all') {
      if (!rec || rec.status !== statusFilter) return false;
    }
    return true;
  });

  const totalEligible = participants.length;
  const recordedCount = records.length;
  const unrecordedCount = Math.max(0, totalEligible - recordedCount);
  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const permissionCount = records.filter((r) => r.status === 'permission' || r.status === 'sick' || r.status === 'dispensation').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Brand Header Card */}
      <div className="bg-gradient-to-br from-[#12372A] via-[#1a4a39] to-[#12372A] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#1f5c45]/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none">
          <ClipboardCheck className="w-48 h-48" />
        </div>

        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A227] text-slate-950 border border-amber-300 shadow-2xs">
              SIUBA Fast Checklist
            </span>
            {currentSession && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20">
                Sesi: {currentSession.activity_name} ({currentSession.session_code})
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Lembar Absensi Manual Santri
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Pencatatan checklist kehadiran langsung per sesi, kelas halaqah, input dispensasi izin/sakit, dan koreksi data presensi santri.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2.5 rounded-xl border border-white/20 text-xs transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={loadSessionData}
            isLoading={isLoading}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </Button>
        </div>
      </div>

      {/* Session Selection & Summary Banner */}
      <Card className="p-5 sm:p-6 bg-white border-slate-200 rounded-3xl shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Session Selector */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilih Sesi Kegiatan:
            </label>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              aria-label="Pilih Sesi Kegiatan"
              className="w-full bg-white text-sm font-extrabold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none min-h-[44px] shadow-2xs cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.status.toUpperCase()}] {s.activity_name} ({s.session_code}) — {formatAttendanceTime(s.start_at)} WIB
                </option>
              ))}
            </select>
          </div>

          {/* Session Status & Quick Actions */}
          {currentSession && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <SessionStatusBadge status={currentSession.status} size="lg" />
              {isSessionOpen && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkAction('present')}
                    disabled={unrecordedCount === 0}
                    className="text-xs flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 min-h-[40px] font-bold"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>Hadirkan Sisa ({unrecordedCount})</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkAction('absent')}
                    disabled={unrecordedCount === 0}
                    className="text-xs flex items-center gap-1.5 text-rose-800 bg-rose-50 border-rose-300 hover:bg-rose-100 min-h-[40px] font-bold"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Alpha Sisa ({unrecordedCount})</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center shadow-2xs">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Total Peserta</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{totalEligible}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center shadow-2xs">
            <span className="text-[11px] uppercase font-bold text-emerald-800 block">Hadir</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">{presentCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center shadow-2xs">
            <span className="text-[11px] uppercase font-bold text-amber-800 block">Terlambat</span>
            <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">{lateCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-center shadow-2xs">
            <span className="text-[11px] uppercase font-bold text-sky-800 block">Izin / Sakit</span>
            <span className="text-xl sm:text-2xl font-black text-sky-700 mt-1 block">{permissionCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center shadow-2xs">
            <span className="text-[11px] uppercase font-bold text-rose-800 block">Alpha</span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">{absentCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-center shadow-2xs">
            <span className="text-[11px] uppercase font-bold text-purple-800 block">Belum Absen</span>
            <span className="text-xl sm:text-2xl font-black text-purple-700 mt-1 block">{unrecordedCount}</span>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri / NIS..."
              className="w-full bg-white text-xs font-semibold text-slate-900 pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none min-h-[40px] shadow-2xs"
            />
          </div>

          {/* Classroom Dropdown */}
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            aria-label="Pilih Kelas Santri"
            className="bg-white text-xs font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none min-h-[40px] shadow-2xs cursor-pointer"
          >
            <option value="all">Semua Kelas</option>
            {INITIAL_CLASSROOMS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-600 font-bold text-xs mr-1">Status:</span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'unrecorded', label: 'Belum Tercatat' },
            { id: 'present', label: 'Hadir' },
            { id: 'late', label: 'Terlambat' },
            { id: 'permission', label: 'Izin' },
            { id: 'sick', label: 'Sakit' },
            { id: 'dispensation', label: 'Dispensasi' },
            { id: 'absent', label: 'Alpha' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap text-xs transition-all min-h-[32px] cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-[#1F5C45] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Participant List (Table & Cards) */}
      {!isSessionOpen && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Sesi ini berstatus <strong>{currentSession?.status.toUpperCase()}</strong>. Pencatatan absensi baru dinonaktifkan. Anda hanya dapat melihat data atau mengoreksi status jika berwenang.</span>
        </div>
      )}

      {filteredParticipants.length === 0 && !isLoading ? (
        <Card className="p-10 text-center space-y-2 bg-white border-dashed border-slate-300 rounded-3xl shadow-xs">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-extrabold text-slate-800">Tidak Ada Data Santri</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Tidak ditemukan santri yang sesuai dengan filter kelas atau pencarian nama.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 md:hidden gap-3">
            {filteredParticipants.map((p) => {
              const rec = recordMap.get(p.student_id);
              return (
                <ParticipantAttendanceCard
                  key={p.id}
                  participant={p}
                  record={rec}
                  isSessionOpen={Boolean(isSessionOpen)}
                  onRecordStatus={(status) => handleRecordStatus(p.student_id, status)}
                  onOpenCorrection={(r) => {
                    setRecordToCorrect(r);
                    setIsCorrectionOpen(true);
                  }}
                />
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <ResponsiveTable<AttendanceSessionParticipant>
              data={filteredParticipants}
              keyExtractor={(p) => String(p.id)}
              columns={[
                {
                  key: 'student',
                  header: 'Santri & Identitas',
                  render: (p) => (
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={p.student_name} size="sm" />
                      <div>
                        <strong className="text-sm font-black text-slate-900 block">{p.student_name}</strong>
                        <span className="text-xs font-mono font-bold text-slate-500">{p.student_number}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'classroom',
                  header: 'Kelas',
                  render: (p) => (
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {p.classroom_name || 'Santri'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status Presensi',
                  render: (p) => {
                    const rec = recordMap.get(p.student_id);
                    return <AttendanceStatusBadge status={rec ? rec.status : 'unrecorded'} size="sm" />;
                  },
                },
                {
                  key: 'check_in',
                  header: 'Waktu & Metode',
                  render: (p) => {
                    const rec = recordMap.get(p.student_id);
                    if (!rec) return <span className="text-xs text-slate-400 font-semibold">—</span>;
                    return (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-800">{formatAttendanceTime(rec.check_in_at)}</span>
                        <AttendanceMethodBadge method={rec.method} size="sm" />
                        {rec.late_minutes > 0 && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">+{rec.late_minutes}m</span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'notes',
                  header: 'Catatan',
                  render: (p) => {
                    const rec = recordMap.get(p.student_id);
                    return <span className="text-xs text-slate-600 italic font-medium">{rec?.notes || '—'}</span>;
                  },
                },
                {
                  key: 'actions',
                  header: 'Aksi Presensi',
                  render: (p) => {
                    const rec = recordMap.get(p.student_id);
                    return (
                      <AttendanceActionMenu
                        isRecorded={Boolean(rec)}
                        currentStatus={rec?.status}
                        disabled={!isSessionOpen}
                        onSelectStatus={(status) => handleRecordStatus(p.student_id, status)}
                        allowCorrection={true}
                        onOpenCorrection={() => {
                          if (rec) {
                            setRecordToCorrect(rec);
                            setIsCorrectionOpen(true);
                          }
                        }}
                      />
                    );
                  },
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(bulkAction)}
        title={bulkAction === 'present' ? 'Tandai Semua Sisa Hadir?' : 'Tandai Semua Sisa Alpha?'}
        message={`Aksi ini akan menandai seluruh ${unrecordedCount} santri yang belum melakukan absensi sebagai "${bulkAction?.toUpperCase()}". Apakah Anda ingin melanjutkan?`}
        confirmLabel={bulkAction === 'present' ? 'Ya, Hadirkan Semua' : 'Ya, Tandai Alpha'}
        variant={bulkAction === 'present' ? 'primary' : 'danger'}
        isLoading={isProcessingBulk}
        onConfirm={handleBulkSubmit}
        onCancel={() => setBulkAction(null)}
      />

      {/* Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionOpen}
        onClose={() => {
          setIsCorrectionOpen(false);
          setRecordToCorrect(null);
        }}
        record={recordToCorrect}
        onSubmit={handleCorrectionSubmit}
        isLoading={isProcessingCorrection}
      />
    </div>
  );
};
