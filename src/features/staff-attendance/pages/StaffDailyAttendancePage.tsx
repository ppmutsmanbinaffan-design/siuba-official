import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  QrCode, 
  Radio, 
  RefreshCw, 
  Edit3, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { User, Staff, StaffAttendanceRecord, StaffAttendanceStatus } from '../../../types';
import { StaffDailySummary, StaffDailyFilterState } from '../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { StaffDailySummaryKpi } from '../components/StaffDailySummaryKpi';
import { StaffDailyCard } from '../components/StaffDailyCard';
import { StaffAttendanceStatusBadge } from '../components/StaffAttendanceStatusBadge';
import { StaffManualAttendanceModal } from '../components/StaffManualAttendanceModal';
import { StaffAttendanceCorrectionModal } from '../components/StaffAttendanceCorrectionModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { FilterDrawer } from '../../../components/ui/FilterDrawer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatStaffType, formatTimeWib, formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface StaffDailyAttendancePageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialFilterStatus?: string;
}

export const StaffDailyAttendancePage: React.FC<StaffDailyAttendancePageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
  initialFilterStatus,
}) => {
  const today = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [records, setRecords] = useState<StaffAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<StaffDailySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<StaffDailyFilterState>({
    search: '',
    staffType: 'all',
    status: initialFilterStatus || 'all',
    checkInState: 'all',
    checkOutState: 'all',
  });
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<StaffAttendanceRecord | null>(null);

  const loadDailyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        StaffAttendanceApi.getDailyRecords(selectedDate),
        StaffAttendanceApi.getDailySummary(selectedDate),
      ]);
      if (recordsRes.data) setRecords(recordsRes.data);
      if (summaryRes.data) setSummary(summaryRes.data);
    } catch (err: any) {
      showToast('Gagal memuat data presensi harian: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadDailyData();
  }, [loadDailyData]);

  // Handle Quick Check-Out
  const handleCheckOut = async (record: StaffAttendanceRecord) => {
    try {
      const res = await StaffAttendanceApi.recordDailyManual({
        staffId: record.staff_id,
        action: 'check_out',
        operatorName: currentUser.name,
      });

      if (res.success) {
        showToast(res.message, 'success');
        loadDailyData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast('Gagal melakukan check-out: ' + err.message, 'error');
    }
  };

  // Filter and search logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = r.staff_name.toLowerCase().includes(q);
        const matchesNumber = (r.staff_number || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNumber) return false;
      }

      // Staff Type
      if (filters.staffType !== 'all' && r.staff_type !== filters.staffType) {
        return false;
      }

      // Status
      if (filters.status !== 'all') {
        if (filters.status === 'absence') {
          if (!['permission', 'sick', 'leave', 'official_duty'].includes(r.status)) return false;
        } else if (r.status !== filters.status) {
          return false;
        }
      }

      // Check-in state
      if (filters.checkInState === 'checked_in' && !r.check_in_at) return false;
      if (filters.checkInState === 'not_checked_in' && r.check_in_at) return false;

      // Check-out state
      if (filters.checkOutState === 'checked_out' && !r.check_out_at) return false;
      if (filters.checkOutState === 'not_checked_out' && r.check_out_at) return false;

      return true;
    });
  }, [records, filters]);

  // Desktop Table Columns
  const columns: Column<StaffAttendanceRecord>[] = [
    {
      key: 'staff',
      header: 'Identitas Staf',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <PersonAvatar name={r.staff_name} className="w-8 h-8 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-zinc-100 truncate">{r.staff_name}</div>
            <div className="text-[11px] text-zinc-400 font-mono">{r.staff_number}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'staff_type',
      header: 'Jenis SDM',
      render: (r) => (
        <span className="text-xs text-zinc-300 font-medium">
          {formatStaffType(r.staff_type)}
        </span>
      ),
    },
    {
      key: 'schedule',
      header: 'Jadwal',
      render: (r) => (
        <span className="font-mono text-xs text-zinc-400">
          {formatTimeWib(r.scheduled_start_at)} – {formatTimeWib(r.scheduled_end_at)}
        </span>
      ),
    },
    {
      key: 'check_in',
      header: 'Check-in',
      render: (r) => (
        <div className="font-mono text-xs">
          <div className="text-zinc-200 font-bold">{formatTimeWib(r.check_in_at)}</div>
          {r.check_in_method && (
            <span className="text-[10px] text-zinc-400 uppercase">{r.check_in_method}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StaffAttendanceStatusBadge status={r.status} />,
    },
    {
      key: 'late',
      header: 'Terlambat',
      render: (r) => (
        <span className={`text-xs font-mono font-medium ${r.late_minutes && r.late_minutes > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
          {r.late_minutes && r.late_minutes > 0 ? `${r.late_minutes}m` : '—'}
        </span>
      ),
    },
    {
      key: 'check_out',
      header: 'Check-out',
      render: (r) => (
        <div className="font-mono text-xs">
          <div className="text-zinc-200 font-medium">{formatTimeWib(r.check_out_at)}</div>
          {r.early_leave_minutes && r.early_leave_minutes > 0 ? (
            <span className="text-[10px] text-amber-400 font-sans">Pulang cepat {r.early_leave_minutes}m</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.check_in_at && !r.check_out_at && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCheckOut(r)}
              className="text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10 py-1 px-2.5 h-auto"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Check-out
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedRecordForCorrection(r)}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1 px-2 h-auto"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
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
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Kehadiran Harian SDM
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pantau check-in dan check-out guru, pelatih, musyrif, administrasi, dan pegawai.
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
            onClick={loadDailyData}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('staff-rfid-monitoring')}
            className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Radio className="w-4 h-4 mr-1.5" />
            Terminal RFID
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('staff-daily-qr')}
            className="border-[#1F5C45]/40 text-[#1F5C45] dark:text-[#2F7D5A] hover:bg-[#1F5C45]/10 font-bold"
          >
            <QrCode className="w-4 h-4 mr-1.5" />
            Scan QR
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsManualModalOpen(true)}
            className="bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Absensi Manual
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      {summary && (
        <StaffDailySummaryKpi
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
            placeholder="Cari nama staf atau nomor pegawai..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Direct Select Filters */}
          <div className="hidden lg:flex items-center gap-2">
            <Select
              value={filters.staffType}
              onChange={(e) => setFilters((prev) => ({ ...prev, staffType: e.target.value }))}
              className="text-xs w-44"
            >
              <option value="all">Semua Jenis SDM</option>
              <option value="teacher">Guru / Pengajar</option>
              <option value="coach">Pelatih Ekskul</option>
              <option value="musyrif">Musyrif Asrama</option>
              <option value="admin_staff">Administrasi / TU</option>
              <option value="service_staff">Sarpras / Layanan</option>
            </Select>

            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="text-xs w-36"
            >
              <option value="all">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="absence">Izin/Sakit/Cuti/Dinas</option>
              <option value="alpha">Alpha</option>
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
            {(filters.staffType !== 'all' || filters.status !== 'all' || filters.checkInState !== 'all' || filters.checkOutState !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-[#1F5C45] absolute top-1 right-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Content: Desktop Table & Mobile Cards */}
      {isLoading ? (
        <LoadingState text="Memuat daftar presensi harian staf..." />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="Tidak Ada Catatan Presensi"
          description={
            filters.search || filters.staffType !== 'all' || filters.status !== 'all'
              ? 'Tidak ditemukan catatan presensi yang sesuai dengan kriteria filter pencarian Anda.'
              : 'Belum ada presensi harian yang tercatat untuk tanggal ini.'
          }
          actionLabel="Absensi Manual"
          onAction={() => setIsManualModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          <ResponsiveTable
            data={filteredRecords}
            columns={columns}
            keyExtractor={(r) => r.id}
            renderMobileCard={(r) => (
              <StaffDailyCard
                record={r}
                onCheckOut={handleCheckOut}
                onCorrect={(rec) => setSelectedRecordForCorrection(rec)}
              />
            )}
          />
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Kehadiran Harian"
        onReset={() =>
          setFilters({
            search: '',
            staffType: 'all',
            status: 'all',
            checkInState: 'all',
            checkOutState: 'all',
          })
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Jenis SDM / Pegawai</label>
            <Select
              value={filters.staffType}
              onChange={(e) => setFilters((prev) => ({ ...prev, staffType: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Jenis SDM</option>
              <option value="teacher">Guru / Pengajar</option>
              <option value="coach">Pelatih Ekskul</option>
              <option value="musyrif">Musyrif Asrama</option>
              <option value="admin_staff">Administrasi / TU</option>
              <option value="service_staff">Sarpras / Layanan</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Status Kehadiran</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua Status</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="absence">Izin / Sakit / Cuti / Dinas</option>
              <option value="alpha">Alpha / Tanpa Ket.</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Status Check-in</label>
            <Select
              value={filters.checkInState}
              onChange={(e) => setFilters((prev) => ({ ...prev, checkInState: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua</option>
              <option value="checked_in">Sudah Check-in</option>
              <option value="not_checked_in">Belum Check-in</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">Status Check-out</label>
            <Select
              value={filters.checkOutState}
              onChange={(e) => setFilters((prev) => ({ ...prev, checkOutState: e.target.value }))}
              className="w-full"
            >
              <option value="all">Semua</option>
              <option value="checked_out">Sudah Check-out</option>
              <option value="not_checked_out">Belum Check-out</option>
            </Select>
          </div>
        </div>
      </FilterDrawer>

      {/* Manual Attendance Modal */}
      <StaffManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        staffList={staffList}
        existingRecords={records}
        currentUser={currentUser}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          loadDailyData();
        }}
      />

      {/* Correction Modal */}
      {selectedRecordForCorrection && (
        <StaffAttendanceCorrectionModal
          isOpen={Boolean(selectedRecordForCorrection)}
          onClose={() => setSelectedRecordForCorrection(null)}
          record={selectedRecordForCorrection}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setSelectedRecordForCorrection(null);
            loadDailyData();
          }}
        />
      )}
    </div>
  );
};
