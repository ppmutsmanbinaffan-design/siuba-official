import React, { useEffect, useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Users, 
  Calendar, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  ClipboardCheck, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ResponsiveTable } from '../../../components/ui/ResponsiveTable';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Textarea } from '../../../components/ui/Input';
import { attendanceApi } from '../api/attendanceApi';
import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  Classroom, 
  User 
} from '../types';
import { SessionStatusBadge } from '../components/SessionStatusBadge';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { AttendanceMethodBadge } from '../components/AttendanceMethodBadge';
import { SessionSummaryKpi } from '../components/SessionSummaryKpi';
import { ParticipantAttendanceCard } from '../components/ParticipantAttendanceCard';
import { AttendanceActionMenu } from '../components/AttendanceActionMenu';
import { AttendanceCorrectionModal } from '../components/AttendanceCorrectionModal';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { INITIAL_CLASSROOMS, INITIAL_USERS } from '../../../data/initialData';
import { formatAttendanceTime, formatIndonesianDate } from '../utils/attendanceUtils';

interface SessionDetailPageProps {
  sessionId: number;
  currentUser?: User;
  onBack: () => void;
  onNavigateToManual: (sessionId: number) => void;
  onNavigateToQr: (sessionId: number) => void;
}

export const SessionDetailPage: React.FC<SessionDetailPageProps> = ({
  sessionId,
  currentUser,
  onBack,
  onNavigateToManual,
  onNavigateToQr,
}) => {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [participants, setParticipants] = useState<AttendanceSessionParticipant[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Participant Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassroom, setSelectedClassroom] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'unrecorded' | 'all'>('all');

  // Correction Modal State
  const [recordToCorrect, setRecordToCorrect] = useState<AttendanceRecord | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [isProcessingCorrection, setIsProcessingCorrection] = useState<boolean>(false);

  // Lifecycle Dialogs
  const [isOpenConfirmOpen, setIsOpenConfirmOpen] = useState<boolean>(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionData, participantsData, recordsData] = await Promise.all([
        attendanceApi.getSessionById(sessionId),
        attendanceApi.getSessionParticipants(sessionId),
        attendanceApi.getSessionRecords(sessionId),
      ]);
      setSession(sessionData);
      setParticipants(participantsData);
      setRecords(recordsData);
    } catch (err) {
      console.error('Failed to load session detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick Single Record Action
  const handleRecordStatus = async (studentId: number, status: AttendanceStatus) => {
    if (!session || session.status !== 'open') return;
    try {
      await attendanceApi.recordManual({
        sessionId: session.id,
        studentId,
        status,
        operator: currentUser,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat absensi.');
    }
  };

  // Correction submit
  const handleCorrectionSubmit = async (recordId: number, newStatus: AttendanceStatus, reason: string) => {
    setIsProcessingCorrection(true);
    try {
      const res = await attendanceApi.correctRecord({
        recordId,
        newStatus,
        reason,
        operator: currentUser,
      });
      if (!res.success) {
        alert(res.message);
      } else {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengoreksi absensi.');
    } finally {
      setIsProcessingCorrection(false);
    }
  };

  // Open session
  const handleOpenSession = async () => {
    if (!session) return;
    setIsProcessingAction(true);
    try {
      await attendanceApi.openSession(session.id, currentUser.name);
      setIsOpenConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuka sesi.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Close session
  const handleCloseSession = async () => {
    if (!session) return;
    setIsProcessingAction(true);
    try {
      await attendanceApi.closeSession(session.id, currentUser.name);
      setIsCloseConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menutup sesi.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Cancel session
  const handleCancelSession = async () => {
    if (!session) return;
    if (!cancelReason.trim()) {
      alert('Alasan pembatalan sesi wajib diisi.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await attendanceApi.cancelSession(session.id, cancelReason.trim(), currentUser.name);
      setIsCancelModalOpen(false);
      setCancelReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan sesi.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Filtered participant list
  const recordMap = new Map<number, AttendanceRecord>();
  records.forEach((r) => recordMap.set(r.student_id, r));

  const filteredParticipants = participants.filter((p) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.student_name?.toLowerCase().includes(q);
      const matchNis = p.student_number?.toLowerCase().includes(q);
      if (!matchName && !matchNis) return false;
    }

    // Classroom filter
    if (selectedClassroom !== 'all') {
      if (p.classroom_id !== selectedClassroom) return false;
    }

    // Status filter
    const rec = recordMap.get(p.student_id);
    if (selectedStatus === 'unrecorded') {
      if (rec) return false;
    } else if (selectedStatus !== 'all') {
      if (!rec || rec.status !== selectedStatus) return false;
    }

    return true;
  });

  if (isLoading && !session) {
    return (
      <div className="p-12 text-center text-zinc-400 space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <p className="text-sm font-semibold">Memuat data sesi absensi...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-zinc-200">Sesi tidak ditemukan</h3>
        <Button variant="secondary" onClick={onBack}>
          Kembali ke Daftar Sesi
        </Button>
      </div>
    );
  }

  const totalParticipants = participants.length;
  const recordedCount = records.length;
  const unrecordedCount = Math.max(0, totalParticipants - recordedCount);
  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const permissionCount = records.filter((r) => r.status === 'permission').length;
  const sickCount = records.filter((r) => r.status === 'sick').length;
  const dispensationCount = records.filter((r) => r.status === 'dispensation').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;

  const isOpen = session.status === 'open';
  const isDraft = session.status === 'draft';
  const isClosed = session.status === 'closed';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-zinc-100">{session.activity_name}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {session.session_code}
              </span>
              <SessionStatusBadge status={session.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {formatIndonesianDate(session.session_date)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {formatAttendanceTime(session.start_at)} – {formatAttendanceTime(session.end_at)} WIB
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                {session.location}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOpenConfirmOpen(true)}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Buka Sesi Ini</span>
            </Button>
          )}

          {isOpen && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToQr(session.id)}
                className="flex items-center gap-1.5 text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Buka QR Scanner</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigateToManual(session.id)}
                className="flex items-center gap-1.5 shadow-sm"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Absensi Manual</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCloseConfirmOpen(true)}
              >
                Tutup Sesi
              </Button>
            </>
          )}

          {!isClosed && session.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            >
              Batalkan
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Card */}
      <Card className="p-4 sm:p-5 bg-zinc-900/60 border-zinc-800">
        <SessionSummaryKpi
          title="Statistik Rekapitulasi Presensi Sesi Ini"
          totalEligible={totalParticipants}
          recordedCount={recordedCount}
          unrecordedCount={unrecordedCount}
          presentCount={presentCount}
          lateCount={lateCount}
          permissionCount={permissionCount}
          sickCount={sickCount}
          dispensationCount={dispensationCount}
          absentCount={absentCount}
        />
      </Card>

      {/* Participant List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-100 uppercase tracking-wide">
              Snapshot Peserta Sesi ({filteredParticipants.length} dari {totalParticipants})
            </h3>
            <p className="text-xs text-zinc-400">
              Daftar seluruh santri yang berhak dan wajib mengikuti kegiatan ini.
            </p>
          </div>

          {/* Quick Search & Class Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative min-w-[180px] flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / NIS..."
                className="w-full bg-zinc-900 text-xs text-zinc-200 pl-8 pr-3 py-2 rounded-xl border border-zinc-800 focus:border-[#1F5C45] focus:outline-none min-h-[38px]"
              />
            </div>

            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label="Filter Kelas Santri"
              className="bg-zinc-900 text-xs font-semibold text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800 focus:border-[#1F5C45] focus:outline-none min-h-[38px]"
            >
              <option value="all">Semua Kelas</option>
              {INITIAL_CLASSROOMS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-zinc-500 font-semibold mr-1 text-[11px]">Filter Status:</span>
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
              onClick={() => setSelectedStatus(st.id as any)}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap text-xs transition-all min-h-[32px] cursor-pointer ${
                selectedStatus === st.id
                  ? 'bg-[#1F5C45] text-white shadow-xs'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 md:hidden gap-3">
          {filteredParticipants.map((p) => {
            const rec = recordMap.get(p.student_id);
            return (
              <ParticipantAttendanceCard
                key={p.id}
                participant={p}
                record={rec}
                isSessionOpen={isOpen}
                onRecordStatus={(status) => handleRecordStatus(p.student_id, status)}
                onOpenCorrection={(r) => {
                  setRecordToCorrect(r);
                  setIsCorrectionModalOpen(true);
                }}
              />
            );
          })}
        </div>

        {/* Desktop View: Table */}
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
                      <strong className="text-sm font-bold text-zinc-100 block">{p.student_name}</strong>
                      <span className="text-xs font-mono text-zinc-400">{p.student_number}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'classroom',
                header: 'Kelas / Halaqah',
                render: (p) => (
                  <span className="text-xs font-medium text-zinc-300">
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
                  if (!rec) return <span className="text-xs text-zinc-500">—</span>;
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-zinc-200">{formatAttendanceTime(rec.check_in_at)}</span>
                      <AttendanceMethodBadge method={rec.method} size="sm" />
                      {rec.late_minutes > 0 && (
                        <span className="text-[11px] font-bold text-amber-400">+{rec.late_minutes}m</span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'notes',
                header: 'Catatan / Alasan',
                render: (p) => {
                  const rec = recordMap.get(p.student_id);
                  return (
                    <span className="text-xs text-zinc-400 italic line-clamp-1 max-w-xs">
                      {rec?.notes || '—'}
                    </span>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Aksi',
                render: (p) => {
                  const rec = recordMap.get(p.student_id);
                  return (
                    <div className="flex items-center gap-1.5">
                      {isOpen ? (
                        <AttendanceActionMenu
                          isRecorded={Boolean(rec)}
                          currentStatus={rec?.status}
                          onSelectStatus={(status) => handleRecordStatus(p.student_id, status)}
                          allowCorrection={true}
                          onOpenCorrection={() => {
                            if (rec) {
                              setRecordToCorrect(rec);
                              setIsCorrectionModalOpen(true);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">Sesi ditutup</span>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      </div>

      {/* Attendance Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setRecordToCorrect(null);
        }}
        record={recordToCorrect}
        onSubmit={handleCorrectionSubmit}
        isLoading={isProcessingCorrection}
      />

      {/* Open Confirmation */}
      <ConfirmDialog
        isOpen={isOpenConfirmOpen}
        title="Buka Sesi Absensi?"
        message={`Membuka sesi "${session.activity_name}". Snapshot peserta akan dikunci dan santri dapat mulai presensi.`}
        confirmLabel="Buka Sesi"
        variant="primary"
        isLoading={isProcessingAction}
        onConfirm={handleOpenSession}
        onCancel={() => setIsOpenConfirmOpen(false)}
      />

      {/* Close Confirmation */}
      <ConfirmDialog
        isOpen={isCloseConfirmOpen}
        title="Tutup Sesi Absensi?"
        message={`Menutup sesi "${session.activity_name}". Presensi baru tidak akan diizinkan lagi setelah sesi ditutup.`}
        confirmLabel="Tutup Sesi"
        variant="danger"
        isLoading={isProcessingAction}
        onConfirm={handleCloseSession}
        onCancel={() => setIsCloseConfirmOpen(false)}
      />

      {/* Cancel Modal with Reason */}
      <ResponsiveModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Batalkan Sesi Absensi"
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Alasan Pembatalan (Wajib)"
            required
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Tuliskan alasan pembatalan sesi..."
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleCancelSession} isLoading={isProcessingAction}>
              Konfirmasi Batalkan Sesi
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
};
