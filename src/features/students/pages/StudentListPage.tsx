import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Classroom, DormitoryRoom, UserRole } from '../../../types';
import { studentApi, StudentListParams } from '../api/studentApi';
import { StudentTable } from '../components/StudentTable';
import { StudentMobileCard } from '../components/StudentMobileCard';
import { StudentFilters, StudentFilterValues } from '../components/StudentFilters';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FilterDrawer } from '../../../components/ui/FilterDrawer';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { Plus, Search, Filter as FilterIcon, RotateCcw, AlertTriangle, Users, Upload } from 'lucide-react';
import { hasPermission, can } from '../../../components/auth/PermissionGuard';
import { authService } from '../../../services/authService';
import { DataImportModal } from '../../../components/common/DataImportModal';

export interface StudentListPageProps {
  userRole?: UserRole;
  userPermissions?: string[];
  onNavigateCreate: () => void;
  onNavigateDetail: (studentId: number) => void;
  onNavigateEdit: (studentId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StudentListPage: React.FC<StudentListPageProps> = ({
  userRole,
  userPermissions,
  onNavigateCreate,
  onNavigateDetail,
  onNavigateEdit,
  onShowToast,
}) => {
  const currentUser = authService.getState().user;
  const effectivePermissions = userPermissions || currentUser?.permissions;
  const canCreate = hasPermission(userRole || currentUser?.role, 'students.create', effectivePermissions);
  const canEdit = hasPermission(userRole || currentUser?.role, 'students.update', effectivePermissions) || hasPermission(userRole || currentUser?.role, 'students.edit', effectivePermissions);
  const canDeactivate = hasPermission(userRole || currentUser?.role, 'students.deactivate', effectivePermissions);

  // Query & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [filters, setFilters] = useState<StudentFilterValues>({
    status: 'all',
    classroom_id: 'all',
    dormitory_room_id: 'all',
    gender: 'all',
  });

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [dormitoryRooms, setDormitoryRooms] = useState<DormitoryRoom[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI Drawer / Dialog states
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [studentToToggleStatus, setStudentToToggleStatus] = useState<Student | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load masters (classes and dormitory rooms)
  useEffect(() => {
    let isMounted = true;
    Promise.all([studentApi.getClassrooms(), studentApi.getDormitoryRooms()])
      .then(([classes, rooms]) => {
        if (isMounted) {
          setClassrooms(classes);
          setDormitoryRooms(rooms);
        }
      })
      .catch(() => {
        // non-blocking
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch students from API
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await studentApi.getStudents({
        page: currentPage,
        per_page: perPage,
        search: debouncedSearch,
        status: filters.status,
        classroom_id: filters.classroom_id,
        dormitory_room_id: filters.dormitory_room_id,
        gender: filters.gender,
        sort: 'name_asc',
      });
      setStudents(res.data);
      setTotalRecords(res.meta.total);
      setTotalPages(res.meta.last_page);
    } catch (err: any) {
      setError(err.message || 'Data santri gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch, filters]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.classroom_id !== 'all') count++;
    if (filters.dormitory_room_id !== 'all') count++;
    if (filters.gender !== 'all') count++;
    return count;
  }, [filters]);

  const handleFilterChange = (key: keyof StudentFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      classroom_id: 'all',
      dormitory_room_id: 'all',
      gender: 'all',
    });
    setSearchTerm('');
    setCurrentPage(1);
    setIsFilterDrawerOpen(false);
  };

  // Toggle student active/inactive status
  const handleConfirmToggleStatus = async () => {
    if (!studentToToggleStatus) return;
    setIsTogglingStatus(true);
    try {
      const nextStatus = studentToToggleStatus.status === 'active' ? 'inactive' : 'active';
      await studentApi.updateStatus(studentToToggleStatus.id, nextStatus);
      onShowToast(
        `Santri ${studentToToggleStatus.name} berhasil di${nextStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}.`,
        'success'
      );
      setStudentToToggleStatus(null);
      fetchStudents();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mengubah status santri.', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SIUBA Emerald Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Users className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Master Data Santri & Akademik
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Data Santri Pesantren
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola basis data santri aktif, kelas akademik, asrama, status kesiswaan, dan identitas digital presensi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            {canCreate && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2.5 bg-emerald-700/60 hover:bg-emerald-600/80 text-white font-bold text-xs sm:text-sm rounded-2xl border border-emerald-400/30 flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap shadow-sm"
                title="Import data santri dari file CSV/Excel"
              >
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>Import Santri</span>
              </button>
            )}

            {canCreate && (
              <button
                onClick={onNavigateCreate}
                className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-[#1F5C45]" />
                <span>Tambah Santri Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama santri, NIS, NISN, atau wali santri..."
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400 shadow-2xs"
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
                title="Reset semua filter"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {error ? (
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-3.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Data santri gagal dimuat</h3>
            <p className="text-xs text-slate-600 mt-1">{error}</p>
          </div>
          <Button variant="primary" onClick={fetchStudents}>
            Coba Lagi
          </Button>
        </div>
      ) : isLoading && students.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm">
          <LoadingState message="Memuat daftar santri..." />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm">
          {debouncedSearch || activeFilterCount > 0 ? (
            <EmptyState
              title="Tidak ada santri yang cocok dengan pencarian."
              description="Coba ubah kata kunci atau bersihkan filter yang aktif."
              actionLabel="Reset Pencarian & Filter"
              onAction={handleResetFilters}
            />
          ) : (
            <EmptyState
              icon={<Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
              title="Belum ada data santri."
              description="Mulai tambahkan data santri untuk mengelola absensi dan akademik."
              actionLabel={canCreate ? 'Tambah Santri' : undefined}
              onAction={canCreate ? onNavigateCreate : undefined}
            />
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table: Hidden on mobile (<md), visible on md+ */}
          <div className="hidden md:block">
            <StudentTable
              students={students}
              isLoading={isLoading}
              userRole={userRole}
              onViewDetail={(s) => onNavigateDetail(s.id)}
              onEdit={(s) => onNavigateEdit(s.id)}
              onToggleStatus={(s) => setStudentToToggleStatus(s)}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              perPage={perPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Mobile Record Cards: Visible on mobile (<md), hidden on md+ */}
          <div className="md:hidden space-y-3">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-1">
              Menampilkan {students.length} dari {totalRecords} santri
            </div>
            {students.map((student) => (
              <StudentMobileCard
                key={student.id}
                student={student}
                userRole={userRole}
                onViewDetail={(s) => onNavigateDetail(s.id)}
                onEdit={(s) => onNavigateEdit(s.id)}
                onToggleStatus={(s) => setStudentToToggleStatus(s)}
              />
            ))}

            {/* Mobile Simple Pagination */}
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
        title="Filter Data Santri"
        onReset={handleResetFilters}
        onApply={() => setIsFilterDrawerOpen(false)}
        activeCount={activeFilterCount}
      >
        <StudentFilters
          filters={filters}
          classrooms={classrooms}
          dormitoryRooms={dormitoryRooms}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />
      </FilterDrawer>

      {/* Confirmation Dialog for Status Toggle */}
      {studentToToggleStatus && (
        <ConfirmDialog
          isOpen={Boolean(studentToToggleStatus)}
          onClose={() => setStudentToToggleStatus(null)}
          onConfirm={handleConfirmToggleStatus}
          isLoading={isTogglingStatus}
          title={
            studentToToggleStatus.status === 'active'
              ? `Nonaktifkan ${studentToToggleStatus.name}?`
              : `Aktifkan ${studentToToggleStatus.name}?`
          }
          message={
            studentToToggleStatus.status === 'active'
              ? 'Santri nonaktif tidak akan masuk dalam presensi harian otomatis. Riwayat absensi dan data akademik tetap tersimpan aman.'
              : 'Santri akan kembali aktif dan dapat dicatat kehadirannya dalam seluruh sesi terjadwal.'
          }
          confirmLabel={
            studentToToggleStatus.status === 'active' ? 'Nonaktifkan Santri' : 'Aktifkan Santri'
          }
          variant={studentToToggleStatus.status === 'active' ? 'danger' : 'primary'}
        />
      )}

      {/* Bulk Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        type="students"
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchStudents();
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
