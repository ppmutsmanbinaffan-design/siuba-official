import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Staff, UserRole } from '../../../types';
import { staffApi, StaffListParams } from '../api/staffApi';
import { StaffTable } from '../components/StaffTable';
import { StaffMobileCard } from '../components/StaffMobileCard';
import { StaffFilters, StaffFilterValues } from '../components/StaffFilters';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FilterDrawer } from '../../../components/ui/FilterDrawer';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { Plus, Search, Filter as FilterIcon, RotateCcw, AlertTriangle, Briefcase, Users, Sparkles, Upload } from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';
import { DataImportModal } from '../../../components/common/DataImportModal';

export interface StaffListPageProps {
  userRole?: UserRole;
  onNavigateCreate: () => void;
  onNavigateDetail: (staffId: number) => void;
  onNavigateEdit: (staffId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StaffListPage: React.FC<StaffListPageProps> = ({
  userRole,
  onNavigateCreate,
  onNavigateDetail,
  onNavigateEdit,
  onShowToast,
}) => {
  const canCreate = hasPermission(userRole, 'staff.create');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [filters, setFilters] = useState<StaffFilterValues>({
    staff_type: 'all',
    employment_status: 'all',
    is_active: 'all',
  });

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [staffToToggle, setStaffToToggle] = useState<Staff | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await staffApi.getStaffList({
        page: currentPage,
        per_page: perPage,
        search: debouncedSearch,
        staff_type: filters.staff_type,
        employment_status: filters.employment_status,
        is_active: filters.is_active,
        sort: 'name_asc',
      });
      setStaffList(res.data);
      setTotalRecords(res.meta.total);
      setTotalPages(res.meta.last_page);
    } catch (err: any) {
      setError(err.message || 'Data SDM gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch, filters]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.staff_type !== 'all') count++;
    if (filters.employment_status !== 'all') count++;
    if (filters.is_active !== 'all') count++;
    return count;
  }, [filters]);

  const handleFilterChange = (key: keyof StaffFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      staff_type: 'all',
      employment_status: 'all',
      is_active: 'all',
    });
    setSearchTerm('');
    setCurrentPage(1);
    setIsFilterDrawerOpen(false);
  };

  const handleConfirmToggleStatus = async () => {
    if (!staffToToggle) return;
    setIsToggling(true);
    try {
      const updated = await staffApi.toggleActive(staffToToggle.id);
      onShowToast(
        `Status SDM ${staffToToggle.name} berhasil diubah menjadi ${updated.is_active ? 'Aktif' : 'Nonaktif'}.`,
        'success'
      );
      setStaffToToggle(null);
      fetchStaff();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mengubah status SDM.', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Header Card */}
      <div className="bg-gradient-to-br from-[#12372A] via-[#1a4a39] to-[#12372A] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#1f5c45]/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none">
          <Users className="w-48 h-48" />
        </div>

        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A227] text-slate-950 border border-amber-300 shadow-2xs">
              Direktori SDM Pesantren
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20">
              Total {totalRecords} Pegawai Terdaftar
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Master SDM & Pengajar
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Kelola data ustadz, guru pengajar, musyrif asrama, pelatih ekskul, dan staf operasional pesantren secara terintegrasi.
          </p>
        </div>

        {canCreate && (
          <div className="relative z-10 shrink-0 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-700/60 hover:bg-emerald-600/80 text-white font-bold px-4 py-3 rounded-2xl border border-emerald-400/30 shadow-md transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
              title="Import data guru, pelatih, musyrif, dan SDM dari file CSV/Excel"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span>Import Guru & SDM</span>
            </button>

            <button
              onClick={onNavigateCreate}
              className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#12372A] font-extrabold px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#1F5C45]" />
              <span>Tambah SDM Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIP, nomor HP, posisi, atau divisi..."
              icon={<Search className="w-4 h-4 text-zinc-400" />}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeFilterCount > 0 ? 'primary' : 'outline'}
              icon={<FilterIcon className="w-4 h-4" />}
              onClick={() => setIsFilterDrawerOpen(true)}
              badge={activeFilterCount > 0 ? activeFilterCount : undefined}
            >
              Filter
            </Button>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Data SDM gagal dimuat</h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{error}</p>
          </div>
          <Button variant="primary" onClick={fetchStaff}>
            Coba Lagi
          </Button>
        </div>
      ) : isLoading && staffList.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
          <LoadingState message="Memuat daftar SDM..." />
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
          {debouncedSearch || activeFilterCount > 0 ? (
            <EmptyState
              title="Tidak ada SDM yang cocok dengan pencarian."
              description="Coba ubah kata kunci atau bersihkan filter yang aktif."
              actionLabel="Reset Pencarian & Filter"
              onAction={handleResetFilters}
            />
          ) : (
            <EmptyState
              icon={<Briefcase className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
              title="Belum ada data SDM."
              description="Daftarkan ustadz, guru, musyrif, atau staff baru ke sistem."
              actionLabel={canCreate ? 'Tambah SDM' : undefined}
              onAction={canCreate ? onNavigateCreate : undefined}
            />
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table: Hidden on mobile, visible on md+ */}
          <div className="hidden md:block">
            <StaffTable
              staffList={staffList}
              isLoading={isLoading}
              userRole={userRole}
              onViewDetail={(s) => onNavigateDetail(s.id)}
              onEdit={(s) => onNavigateEdit(s.id)}
              onToggleStatus={(s) => setStaffToToggle(s)}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              perPage={perPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Mobile Record Cards: Visible on mobile, hidden on md+ */}
          <div className="md:hidden space-y-3">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-1">
              Menampilkan {staffList.length} dari {totalRecords} SDM
            </div>
            {staffList.map((staff) => (
              <StaffMobileCard
                key={staff.id}
                staff={staff}
                userRole={userRole}
                onViewDetail={(s) => onNavigateDetail(s.id)}
                onEdit={(s) => onNavigateEdit(s.id)}
                onToggleStatus={(s) => setStaffToToggle(s)}
              />
            ))}

            {/* Mobile Pagination */}
            <div className="flex items-center justify-between pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹ Sebelumnya
              </Button>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya ›
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Data SDM"
        onReset={handleResetFilters}
        onApply={() => setIsFilterDrawerOpen(false)}
        activeCount={activeFilterCount}
      >
        <StaffFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />
      </FilterDrawer>

      {/* Confirm Toggle Status */}
      {staffToToggle && (
        <ConfirmDialog
          isOpen={Boolean(staffToToggle)}
          onClose={() => setStaffToToggle(null)}
          onConfirm={handleConfirmToggleStatus}
          isLoading={isToggling}
          title={staffToToggle.is_active ? `Nonaktifkan ${staffToToggle.name}?` : `Aktifkan ${staffToToggle.name}?`}
          message={
            staffToToggle.is_active
              ? 'SDM yang dinonaktifkan tidak akan muncul pada jadwal KBM aktif atau presensi kerja harian. Data historis tetap terjaga.'
              : 'SDM akan kembali aktif dan dapat ditugaskan mengajar atau bertugas di asrama.'
          }
          confirmLabel={staffToToggle.is_active ? 'Nonaktifkan SDM' : 'Aktifkan SDM'}
          variant={staffToToggle.is_active ? 'danger' : 'primary'}
        />
      )}

      {/* Bulk Staff Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        type="staff"
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchStaff();
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
