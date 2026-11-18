import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  RefreshCw, 
  QrCode, 
  CheckCircle2, 
  Users, 
  Eye} from 'lucide-react';
import { User, Staff, TeachingSession } from '../../../types';
import { TeachingAttendanceSummary, TeachingFilterState } from '../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { TeachingSummaryKpi } from '../components/TeachingSummaryKpi';
import { TeachingSessionCard } from '../components/TeachingSessionCard';
import { StaffAttendanceStatusBadge } from '../components/StaffAttendanceStatusBadge';
import { TeachingManualAttendanceModal } from '../components/TeachingManualAttendanceModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { FilterDrawer } from '../../../components/ui/FilterDrawer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { formatTeachingSessionStatus, formatTimeWib } from '../utils/staffAttendanceUtils';
import { todayLocalDate } from '../../../utils/today';

interface TeachingAttendancePageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialFilterStatus?: string;
}

export const TeachingAttendancePage: React.FC<TeachingAttendancePageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
  initialFilterStatus,
}) => {
  const today = todayLocalDate();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [summary, setSummary] = useState<TeachingAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<TeachingFilterState>({
    search: '',
    classroomId: 'all',
    status: initialFilterStatus || 'all',
    substitutionOnly: false,
    sessionState: 'all',
  });
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Modal
  const [manualSessionModal, setManualSessionModal] = useState<TeachingSession | null>(null);
  const [loadError, setLoadError] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  const loadTeachingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionsRes, summaryRes] = await Promise.all([
        StaffAttendanceApi.getTeachingSessions(selectedDate),
        StaffAttendanceApi.getTeachingSummary(selectedDate),
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (summaryRes.data) setSummary(summaryRes.data);
      setLoadError(sessionsRes.error || '');
    } catch (err: any) {
      showToast('Gagal memuat data kehadiran mengajar: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadTeachingData();
  }, [loadTeachingData]);

  const handleFinalize = async () => {
    if (!window.confirm(`Finalisasi presensi mengajar tanggal ${selectedDate}? Sesi KBM yang gurunya belum presensi akan ditandai ALPA.`)) return;
    setIsFinalizing(true);
    const res = await StaffAttendanceApi.finalizeTeachingDay(selectedDate);
    setIsFinalizing(false);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) loadTeachingData();
  };

  // Extract unique classrooms for filter
  const classrooms = useMemo(() => {
    const map = new Map<number, string>();
    sessions.forEach((s) => {
      if (s.classroom_id && s.classroom_name) {
        map.set(s.classroom_id, s.classroom_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesSubject = s.subject_name.toLowerCase().includes(q);
        const matchesTeacher = s.teacher_name.toLowerCase().includes(q);
        const matchesClass = s.classroom_name.toLowerCase().includes(q);
        const matchesActualTeacher = (s.actual_teacher_name || '').toLowerCase().includes(q);
        if (!matchesSubject && !matchesTeacher && !matchesClass && !matchesActualTeacher) return false;
      }

      // Classroom
      if (filters.classroomId !== 'all' && s.classroom_id !== Number(filters.classroomId)) {
        return false;
      }

      // Substitution
      if (filters.substitutionOnly && !s.is_substituted && !s.substitute_teacher_id) {
        return false;
      }

      // Status
      if (filters.status !== 'all') {
        if (filters.status === 'unrecorded') {
          if (s.teacher_attendance_status && s.teacher_attendance_status !== 'unrecorded') return false;
        } else if (filters.status === 'substituted') {
          if (!s.is_substituted) return false;
        } else if (s.teacher_attendance_status !== filters.status) {
          return false;
        }
      }

      // Session State
      if (filters.sessionState !== 'all' && s.status !== filters.sessionState) {
        return false;
      }

      return true;
    });
  }, [sessions, filters]);

  const columns: Column<TeachingSession>[] = [
    {
      key: 'schedule',
      header: 'Jam & Kelas',
      render: (s) => (
        <div>
          <div className="font-mono text-xs font-bold text-[#1F5C45] dark:text-[#2F7D5A]">
            {s.start_time} – {s.end_time}
          </div>
          <div className="text-xs text-slate-700 font-semibold">{s.classroom_name}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Mata Pelajaran',
      render: (s) => (
        <div className="font-bold text-slate-900 text-xs">
          {s.subject_name}
        </div>
      ),
    },
    {
      key: 'teacher',
      header: 'Guru Terjadwal vs Aktual',
      render: (s) => (
        <div className="space-y-0.5">
          <div className="text-xs text-slate-700 font-medium">
            {s.teacher_name}
          </div>
          {(s.is_substituted || s.substitute_teacher_id) && (
            <div className="text-[11px] text-cyan-700 font-bold flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Pengganti: {s.actual_teacher_name || `Staf #${s.substitute_teacher_id}`}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'check_in',
      header: 'Waktu Masuk',
      render: (s) => (
        <div className="font-mono text-xs">
          <div className="text-slate-800">{s.teacher_check_in_at ? s.teacher_check_in_at.substring(11, 16) + ' WIB' : '—'}</div>
          {s.late_minutes && s.late_minutes > 0 ? (
            <span className="text-[10px] text-amber-700 font-sans">Terlambat {s.late_minutes}m</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Presensi',
      render: (s) => <StaffAttendanceStatusBadge status={s.teacher_attendance_status} />,
    },
    {
      key: 'session_status',
      header: 'Status Sesi',
      render: (s) => {
        const info = formatTeachingSessionStatus(s.status);
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
            onClick={() => onNavigate('teaching-session-detail', { sessionId: s.id })}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 py-1 px-2.5 h-auto"
          >
            <Eye className="w-3 h-3 mr-1" />
            Detail
          </Button>

          {s.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('teaching-qr-scanner', { sessionId: s.id })}
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
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 py-1 px-2 h-auto"
              title="Presensi Manual"
            >
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Presensi Guru Mengajar (KBM)
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Pantau kehadiran guru pada setiap jam pelajaran, kelas, dan penugasan guru pengganti.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
          />

          <Button
            size="sm"
            variant="secondary"
            onClick={loadTeachingData}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('teacher-substitution')}
            className="border-cyan-500/40 text-cyan-700 hover:bg-cyan-500/10 font-bold"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Guru Pengganti
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleFinalize}
            disabled={isFinalizing || sessions.length === 0}
            className="border-rose-500/40 text-rose-700 hover:bg-rose-500/10 font-bold"
          >
            {isFinalizing ? 'Memproses…' : 'Finalisasi Hari Ini'}
          </Button>
        </div>
      </div>

      {loadError && (
        <div id="teaching-load-error" className="px-4 py-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-700 text-xs font-semibold">
          {loadError}
        </div>
      )}

      {/* Summary KPI */}
      {summary && (
        <TeachingSummaryKpi
          summary={summary}
          onFilterClick={(status) => setFilters((prev) => ({ ...prev, status }))}
        />
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Cari mapel, guru pengajar, atau kelas..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <Select
              value={filters.classroomId}
              onChange={(e) => setFilters((prev) => ({ ...prev, classroomId: e.target.value }))}
              className="text-xs w-40"
            >
              <option value="all">Semua Kelas</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="text-xs w-40"
            >
              <option value="all">Semua Status Guru</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="absent">Alpa</option>
              <option value="substituted">Digantikan</option>
              <option value="unrecorded">Belum Tercatat</option>
            </Select>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 relative text-xs"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
            {(filters.classroomId !== 'all' || filters.status !== 'all' || filters.substitutionOnly) && (
              <span className="w-2 h-2 rounded-full bg-[#1F5C45] absolute top-1 right-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Memuat jadwal sesi mengajar KBM..." />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Tidak Ada Jadwal Mengajar"
          description={
            filters.search || filters.classroomId !== 'all' || filters.status !== 'all'
              ? 'Tidak ditemukan sesi mengajar yang sesuai kriteria filter Anda.'
              : 'Belum ada sesi KBM untuk tanggal ini. Buat sesinya di menu Jadwal Pelajaran → tombol Generate Sesi, lalu tekan Refresh.'
          }
        />
      ) : (
        <ResponsiveTable
          data={filteredSessions}
          columns={columns}
          keyExtractor={(s) => s.id}
          renderMobileCard={(s) => (
            <TeachingSessionCard
              session={s}
              onViewDetail={(sess) => onNavigate('teaching-session-detail', { sessionId: sess.id })}
              onOpenQr={(sess) => onNavigate('teaching-qr-scanner', { sessionId: sess.id })}
              onRecordManual={(sess) => setManualSessionModal(sess)}
            />
          )}
        />
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Presensi KBM"
        onReset={() =>
          setFilters({
            search: '',
            classroomId: 'all',
            status: 'all',
            substitutionOnly: false,
            sessionState: 'all',
          })
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Kelas</label>
            <Select
              value={filters.classroomId}
              onChange={(e) => setFilters((prev) => ({ ...prev, classroomId: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Kelas</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Status Presensi Guru</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Status</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="absent">Alpa</option>
              <option value="substituted">Digantikan</option>
              <option value="unrecorded">Belum Tercatat</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Status Pelaksanaan Sesi</label>
            <Select
              value={filters.sessionState}
              onChange={(e) => setFilters((prev) => ({ ...prev, sessionState: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Status Sesi</option>
              <option value="scheduled">Terjadwal</option>
              <option value="ongoing">Sedang Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </Select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.substitutionOnly}
                onChange={(e) => setFilters((prev) => ({ ...prev, substitutionOnly: e.target.checked }))}
                className="rounded bg-white border-slate-300 text-[#1F5C45] focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-700">
                Hanya tampilkan sesi dengan Guru Pengganti
              </span>
            </label>
          </div>
        </div>
      </FilterDrawer>

      {/* Manual Teaching Attendance Modal */}
      {manualSessionModal && (
        <TeachingManualAttendanceModal
          isOpen={Boolean(manualSessionModal)}
          onClose={() => setManualSessionModal(null)}
          session={manualSessionModal}
          staffList={staffList}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setManualSessionModal(null);
            loadTeachingData();
          }}
        />
      )}
    </div>
  );
};
