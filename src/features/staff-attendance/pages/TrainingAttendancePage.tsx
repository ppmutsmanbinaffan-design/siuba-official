import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Award, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  QrCode, 
  CheckCircle2, 
  FileCheck, 
  Users, 
  MapPin, 
  Eye,
  Calendar
} from 'lucide-react';
import { User, Staff, TrainingSession } from '../../../types';
import { TrainingAttendanceSummary, TrainingFilterState } from '../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { TrainingSummaryKpi } from '../components/TrainingSummaryKpi';
import { TrainingSessionCard } from '../components/TrainingSessionCard';
import { StaffAttendanceStatusBadge } from '../components/StaffAttendanceStatusBadge';
import { TrainingManualAttendanceModal } from '../components/TrainingManualAttendanceModal';
import { TrainingRealizationModal } from '../components/TrainingRealizationModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { FilterDrawer } from '../../../components/ui/FilterDrawer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { formatRealizationStatus, formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TrainingAttendancePageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialFilterStatus?: string;
}

export const TrainingAttendancePage: React.FC<TrainingAttendancePageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
  initialFilterStatus,
}) => {
  const today = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [summary, setSummary] = useState<TrainingAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filters, setFilters] = useState<TrainingFilterState>({
    search: '',
    extracurricularId: 'all',
    status: initialFilterStatus || 'all',
    realizationStatus: 'all',
    substitutionOnly: false,
  });
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Modals
  const [manualSessionModal, setManualSessionModal] = useState<TrainingSession | null>(null);
  const [realizationSessionModal, setRealizationSessionModal] = useState<TrainingSession | null>(null);

  const loadTrainingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionsRes, summaryRes] = await Promise.all([
        StaffAttendanceApi.getTrainingSessions(selectedDate),
        StaffAttendanceApi.getTrainingSummary(selectedDate),
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (summaryRes.data) setSummary(summaryRes.data);
    } catch (err: any) {
      showToast('Gagal memuat data kehadiran pelatih: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadTrainingData();
  }, [loadTrainingData]);

  // Extract unique extracurriculars for filter
  const extracurriculars = useMemo(() => {
    const map = new Map<number, string>();
    sessions.forEach((s) => {
      if (s.extracurricular_id && s.extracurricular_name) {
        map.set(s.extracurricular_id, s.extracurricular_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = s.extracurricular_name.toLowerCase().includes(q);
        const matchesCoach = s.coach_name.toLowerCase().includes(q);
        const matchesLoc = s.location.toLowerCase().includes(q);
        const matchesActualCoach = (s.actual_coach_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCoach && !matchesLoc && !matchesActualCoach) return false;
      }

      if (filters.extracurricularId !== 'all' && s.extracurricular_id !== Number(filters.extracurricularId)) {
        return false;
      }

      if (filters.substitutionOnly && !s.is_substituted && !s.substitute_coach_staff_id) {
        return false;
      }

      if (filters.status !== 'all') {
        if (filters.status === 'unrecorded') {
          if (s.trainer_attendance_status && s.trainer_attendance_status !== 'unrecorded') return false;
        } else if (s.trainer_attendance_status !== filters.status) {
          return false;
        }
      }

      if (filters.realizationStatus !== 'all' && s.realization_status !== filters.realizationStatus) {
        return false;
      }

      return true;
    });
  }, [sessions, filters]);

  const columns: Column<TrainingSession>[] = [
    {
      key: 'schedule',
      header: 'Jam & Lokasi',
      render: (s) => (
        <div>
          <div className="font-mono text-xs font-bold text-cyan-400">
            {s.scheduled_start_at} – {s.scheduled_end_at}
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-zinc-500" />
            <span>{s.location}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'extracurricular',
      header: 'Ekstrakurikuler',
      render: (s) => (
        <div className="font-bold text-zinc-100 text-xs">
          {s.extracurricular_name}
        </div>
      ),
    },
    {
      key: 'coach',
      header: 'Pelatih Terjadwal vs Aktual',
      render: (s) => (
        <div className="space-y-0.5">
          <div className="text-xs text-zinc-300 font-medium">{s.coach_name}</div>
          {(s.is_substituted || s.substitute_coach_staff_id) && (
            <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Pengganti: {s.actual_coach_name || `Staf #${s.substitute_coach_staff_id}`}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'students',
      header: 'Presensi Santri',
      render: (s) => (
        <div className="text-xs font-mono">
          <span className="text-zinc-200 font-bold">{s.student_present_count ?? 0}</span>
          <span className="text-zinc-500"> / {s.student_eligible_count ?? '—'} Hadir</span>
        </div>
      ),
    },
    {
      key: 'trainer_status',
      header: 'Status Pelatih',
      render: (s) => <StaffAttendanceStatusBadge status={s.trainer_attendance_status} />,
    },
    {
      key: 'realization',
      header: 'Jurnal Realisasi',
      render: (s) => {
        const info = formatRealizationStatus(s.realization_status);
        return (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.badgeClass}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('training-session-detail', { sessionId: s.id })}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1 px-2.5 h-auto"
          >
            <Eye className="w-3 h-3 mr-1" />
            Detail
          </Button>

          {s.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('training-qr-scanner', { sessionId: s.id })}
              className="text-xs border-[#1F5C45]/40 text-[#1F5C45] dark:text-[#2F7D5A] hover:bg-[#1F5C45]/10 py-1 px-2 h-auto"
              title="Scan QR Sesi Ini"
            >
              <QrCode className="w-3 h-3" />
            </Button>
          )}

          {s.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setManualSessionModal(s)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1 px-2 h-auto"
              title="Presensi Manual Pelatih"
            >
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          )}

          {s.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRealizationSessionModal(s)}
              className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10 py-1 px-2 h-auto"
              title="Isi Jurnal Realisasi"
            >
              <FileCheck className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Presensi Pelatih Ekstrakurikuler
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pantau kehadiran pelatih/pembina di lapangan dan verifikasi pengisian jurnal materi latihan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
          />

          <Button
            size="sm"
            variant="secondary"
            onClick={loadTrainingData}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('trainer-substitution')}
            className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 font-bold"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Pelatih Pengganti
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('training-realization')}
            className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-bold"
          >
            <FileCheck className="w-4 h-4 mr-1.5" />
            Jurnal Realisasi
          </Button>
        </div>
      </div>

      {/* Summary KPI */}
      {summary && (
        <TrainingSummaryKpi
          summary={summary}
          onFilterClick={(status) => setFilters((prev) => ({ ...prev, status }))}
        />
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Cari nama ekskul, pelatih, atau lokasi..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <Select
              value={filters.extracurricularId}
              onChange={(e) => setFilters((prev) => ({ ...prev, extracurricularId: e.target.value }))}
              className="text-xs w-44"
            >
              <option value="all">Semua Ekstrakurikuler</option>
              {extracurriculars.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="text-xs w-40"
            >
              <option value="all">Semua Status Pelatih</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="substituted">Digantikan</option>
              <option value="unrecorded">Belum Tercatat</option>
            </Select>

            <Select
              value={filters.realizationStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, realizationStatus: e.target.value }))}
              className="text-xs w-40"
            >
              <option value="all">Semua Status Realisasi</option>
              <option value="submitted">Sudah Diisi</option>
              <option value="pending">Belum Diisi</option>
              <option value="not_applicable">Tidak Diperlukan</option>
            </Select>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 relative text-xs"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="Memuat jadwal sesi ekstrakurikuler..." />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Tidak Ada Jadwal Ekstrakurikuler"
          description={
            filters.search || filters.extracurricularId !== 'all' || filters.status !== 'all'
              ? 'Tidak ditemukan sesi ekskul yang sesuai dengan filter pencarian.'
              : 'Belum ada jadwal ekstrakurikuler pada tanggal ini.'
          }
        />
      ) : (
        <ResponsiveTable
          data={filteredSessions}
          columns={columns}
          keyExtractor={(s) => s.id}
          renderMobileCard={(s) => (
            <TrainingSessionCard
              session={s}
              onViewDetail={(sess) => onNavigate('training-session-detail', { sessionId: sess.id })}
              onOpenQr={(sess) => onNavigate('training-qr-scanner', { sessionId: sess.id })}
              onRecordManual={(sess) => setManualSessionModal(sess)}
              onOpenRealization={(sess) => setRealizationSessionModal(sess)}
            />
          )}
        />
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Presensi Ekskul"
        onReset={() =>
          setFilters({
            search: '',
            extracurricularId: 'all',
            status: 'all',
            realizationStatus: 'all',
            substitutionOnly: false,
          })
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Ekstrakurikuler</label>
            <Select
              value={filters.extracurricularId}
              onChange={(e) => setFilters((prev) => ({ ...prev, extracurricularId: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Ekstrakurikuler</option>
              {extracurriculars.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Status Pelatih</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Status Pelatih</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="substituted">Digantikan</option>
              <option value="unrecorded">Belum Tercatat</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Status Jurnal Realisasi</label>
            <Select
              value={filters.realizationStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, realizationStatus: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Status Realisasi</option>
              <option value="submitted">Sudah Diisi (Submitted)</option>
              <option value="pending">Belum Diisi (Pending)</option>
            </Select>
          </div>
        </div>
      </FilterDrawer>

      {/* Manual Attendance Modal */}
      {manualSessionModal && (
        <TrainingManualAttendanceModal
          isOpen={Boolean(manualSessionModal)}
          onClose={() => setManualSessionModal(null)}
          session={manualSessionModal}
          staffList={staffList}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setManualSessionModal(null);
            loadTrainingData();
          }}
        />
      )}

      {/* Realization Modal */}
      {realizationSessionModal && (
        <TrainingRealizationModal
          isOpen={Boolean(realizationSessionModal)}
          onClose={() => setRealizationSessionModal(null)}
          session={realizationSessionModal}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setRealizationSessionModal(null);
            loadTrainingData();
          }}
        />
      )}
    </div>
  );
};
