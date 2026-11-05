import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Play, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  Users, 
  QrCode, 
  ClipboardCheck, 
  ArrowRight, 
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ResponsiveTable } from '../../../components/ui/ResponsiveTable';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { Textarea } from '../../../components/ui/Input';
import { attendanceApi } from '../api/attendanceApi';
import { AttendanceSession, SessionFilterOptions, SessionStatus } from '../types';
import { SessionStatusBadge } from '../components/SessionStatusBadge';
import { AttendanceMethodBadge } from '../components/AttendanceMethodBadge';
import { SessionCard } from '../components/SessionCard';
import { INITIAL_ACTIVITIES, INITIAL_CATEGORIES } from '../../../data/initialData';
import { formatAttendanceTime, formatIndonesianDate } from '../utils/attendanceUtils';

interface SessionListPageProps {
  userRole?: string;
  onNavigateDetail?: (sessionId: number) => void;
  onNavigateToDetail?: (sessionId: number) => void;
  onNavigateManual?: (sessionId: number) => void;
  onNavigateToManual?: (sessionId: number) => void;
  onNavigateQr?: (sessionId: number) => void;
  onNavigateToQr?: (sessionId: number) => void;
  onBackToDashboard?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SessionListPage: React.FC<SessionListPageProps> = ({
  userRole,
  onNavigateDetail,
  onNavigateToDetail,
  onNavigateManual,
  onNavigateToManual,
  onNavigateQr,
  onNavigateToQr,
  onBackToDashboard,
  onShowToast,
}) => {
  const handleDetail = (id: number) => {
    if (onNavigateDetail) onNavigateDetail(id);
    else if (onNavigateToDetail) onNavigateToDetail(id);
  };

  const handleManual = (id: number) => {
    if (onNavigateManual) onNavigateManual(id);
    else if (onNavigateToManual) onNavigateToManual(id);
  };

  const handleQr = (id: number) => {
    if (onNavigateQr) onNavigateQr(id);
    else if (onNavigateToQr) onNavigateToQr(id);
  };
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-23');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialog States
  const [sessionToOpen, setSessionToOpen] = useState<AttendanceSession | null>(null);
  const [sessionToClose, setSessionToClose] = useState<AttendanceSession | null>(null);
  const [sessionToCancel, setSessionToCancel] = useState<AttendanceSession | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await attendanceApi.getSessions({
        date: selectedDate,
        status: statusFilter,
        categoryId: categoryFilter,
        search: searchQuery,
      });
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handlers for session lifecycle
  const handleOpenSession = async () => {
    if (!sessionToOpen) return;
    setIsProcessingAction(true);
    try {
      await attendanceApi.openSession(sessionToOpen.id);
      setSessionToOpen(null);
      await loadSessions();
    } catch (err: any) {
      alert(err.message || 'Gagal membuka sesi.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionToClose) return;
    setIsProcessingAction(true);
    try {
      await attendanceApi.closeSession(sessionToClose.id);
      setSessionToClose(null);
      await loadSessions();
    } catch (err: any) {
      alert(err.message || 'Gagal menutup sesi.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelSession = async () => {
    if (!sessionToCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Alasan pembatalan sesi wajib diisi.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await attendanceApi.cancelSession(sessionToCancel.id, cancelReason.trim());
      setSessionToCancel(null);
      setCancelReason('');
      setCancelError('');
      await loadSessions();
    } catch (err: any) {
      setCancelError(err.message || 'Gagal membatalkan sesi.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const statusOptions: { value: SessionStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'open', label: 'Dibuka' },
    { value: 'draft', label: 'Draf' },
    { value: 'closed', label: 'Ditutup' },
    { value: 'cancelled', label: 'Dibatalkan' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Brand Header Card */}
      <div className="bg-gradient-to-br from-[#12372A] via-[#1a4a39] to-[#12372A] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#1f5c45]/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none">
          <Calendar className="w-48 h-48" />
        </div>

        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A227] text-slate-950 border border-amber-300 shadow-2xs">
              SIUBA Session Lifecycle
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20">
              Total {sessions.length} Sesi Terjadwal
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Manajemen & Jadwal Sesi Presensi
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Kelola pembukaan sesi ibadah, KBM halaqah tahfidz, pantau progres kehadiran, dan eksekusi pencatatan presensi secara terpadu.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadSessions}
            isLoading={isLoading}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </Button>
          {onNavigateToQr && (
            <button
              onClick={() => sessions[0]?.id && onNavigateToQr(sessions[0]?.id)}
              disabled={sessions.length === 0}
              className={`inline-flex items-center gap-2 font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 text-xs ${
                sessions.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#C9A227] hover:bg-[#B28E1D] text-white cursor-pointer'
              }`}
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Terminal QR</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-5 bg-white border-slate-200 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Date Picker & Search */}
          <div className="flex items-center gap-3 flex-1 flex-wrap sm:flex-nowrap">
            <div className="relative min-w-[170px]">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Tanggal Sesi:
                </label>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="text-[10px] font-bold text-[#1F5C45] hover:underline cursor-pointer"
                    title="Tampilkan semua sesi tanpa filter tanggal"
                  >
                    Semua Tanggal
                  </button>
                )}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white text-xs font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none min-h-[40px] shadow-2xs cursor-pointer"
              />
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Pencarian Kegiatan:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama kegiatan, kode sesi, atau lokasi..."
                  className="w-full bg-white text-xs font-semibold text-slate-900 pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none min-h-[40px] shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="min-w-[180px]">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Kategori Kegiatan:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label="Filter Kategori Kegiatan"
              className="w-full bg-white text-xs font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none min-h-[40px] shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {INITIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-600 font-bold mr-1 text-xs">Status:</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all text-xs min-h-[34px] cursor-pointer ${
                statusFilter === opt.value
                  ? 'bg-[#1F5C45] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Results View */}
      {sessions.length === 0 && !isLoading ? (
        <Card className="p-10 text-center space-y-3 bg-white border-dashed border-slate-300 rounded-3xl shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h4 className="text-base font-extrabold text-slate-800">Tidak Ditemukan Sesi</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tidak ada sesi absensi yang cocok dengan filter tanggal atau pencarian yang Anda pilih.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedDate('2026-08-23');
              setStatusFilter('all');
              setCategoryFilter('all');
              setSearchQuery('');
            }}
          >
            Reset Semua Filter
          </Button>
        </Card>
      ) : (
        <>
          {/* Mobile View: Cards Grid */}
          <div className="grid grid-cols-1 md:hidden gap-3.5">
            {sessions.map((session) => {
              const act = INITIAL_ACTIVITIES.find((a) => a.id === session.activity_id);
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  activity={act}
                  totalEligible={session.total_participants || 40}
                  recordedCount={(session.total_present || 0) + (session.total_late || 0)}
                  unrecordedCount={Math.max(0, (session.total_participants || 40) - ((session.total_present || 0) + (session.total_late || 0)))}
                  onViewDetail={onNavigateToDetail}
                  onNavigateManual={onNavigateToManual}
                  onNavigateQr={onNavigateToQr}
                  onOpenSession={(sId) => setSessionToOpen(session)}
                />
              );
            })}
          </div>

          {/* Desktop / Tablet View: Responsive Table */}
          <div className="hidden md:block">
            <ResponsiveTable<AttendanceSession>
              data={sessions}
              keyExtractor={(s) => String(s.id)}
              columns={[
                {
                  key: 'activity',
                  header: 'Sesi & Kegiatan',
                  render: (s) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-extrabold text-slate-900">{s.activity_name}</strong>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {s.session_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.location}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'time',
                  header: 'Waktu & Toleransi',
                  render: (s) => (
                    <div className="text-xs space-y-0.5 font-medium">
                      <div className="font-mono font-bold text-slate-900">
                        {formatAttendanceTime(s.start_at)} – {formatAttendanceTime(s.end_at)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        Hadir s.d {formatAttendanceTime(s.present_until)}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status Sesi',
                  render: (s) => <SessionStatusBadge status={s.status} />,
                },
                {
                  key: 'progress',
                  header: 'Peserta & Progres',
                  render: (s) => {
                    const total = s.total_participants || 40;
                    const recorded = (s.total_present || 0) + (s.total_late || 0);
                    const rate = total > 0 ? Math.round((recorded / total) * 100) : 0;
                    return (
                      <div className="w-36 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600">{recorded}/{total}</span>
                          <strong className="text-emerald-700">{rate}%</strong>
                        </div>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            style={{ width: `${rate}%` }}
                            className={`h-full transition-all duration-500 ${
                              rate === 100 ? 'bg-emerald-500' : 'bg-[#1F5C45]'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Aksi',
                  render: (s) => (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDetail(s.id)}
                        className="text-xs"
                      >
                        Detail
                      </Button>

                      {s.status === 'draft' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSessionToOpen(s)}
                          className="text-xs flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Buka</span>
                        </Button>
                      )}

                      {s.status === 'open' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleManual(s.id)}
                            className="text-xs flex items-center gap-1"
                          >
                            <ClipboardCheck className="w-3 h-3" />
                            <span>Presensi</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionToClose(s)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            Tutup
                          </Button>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Open Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(sessionToOpen)}
        title="Buka Sesi Absensi?"
        message={`Apakah Anda yakin ingin membuka sesi "${sessionToOpen?.activity_name}" (${sessionToOpen?.session_code})? Snapshot peserta akan dikunci dan santri dapat mulai melakukan presensi.`}
        confirmLabel="Ya, Buka Sesi"
        cancelLabel="Batal"
        variant="primary"
        isLoading={isProcessingAction}
        onConfirm={handleOpenSession}
        onCancel={() => setSessionToOpen(null)}
      />

      {/* Close Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(sessionToClose)}
        title="Tutup Sesi Absensi?"
        message={`Apakah Anda yakin ingin menutup sesi "${sessionToClose?.activity_name}"? Setelah ditutup, presensi santri melalui QR/RFID/Manual akan ditutup.`}
        confirmLabel="Ya, Tutup Sesi"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isProcessingAction}
        onConfirm={handleCloseSession}
        onCancel={() => setSessionToClose(null)}
      />

      {/* Cancel Session Modal with Mandatory Reason */}
      <ResponsiveModal
        isOpen={Boolean(sessionToCancel)}
        onClose={() => setSessionToCancel(null)}
        title="Batalkan Sesi Absensi"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Sesi yang dibatalkan akan ditandai dengan status <strong className="text-rose-400">Dibatalkan</strong> dan tidak dapat dibuka kembali.
          </p>

          <Textarea
            label="Alasan Pembatalan (Wajib)"
            required
            rows={3}
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError('');
            }}
            placeholder="Contoh: Kegiatan shalat dialihkan ke masjid kampus 2 karena renovasi karpet."
            error={cancelError}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button
              variant="secondary"
              onClick={() => setSessionToCancel(null)}
              disabled={isProcessingAction}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelSession}
              isLoading={isProcessingAction}
            >
              Konfirmasi Pembatalan
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
};
