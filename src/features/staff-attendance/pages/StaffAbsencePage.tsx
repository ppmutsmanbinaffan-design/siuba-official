import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CalendarDays, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { User, Staff, StaffAbsenceRequest, StaffAbsenceStatus } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { AbsenceRequestCard } from '../components/AbsenceRequestCard';
import { StaffAbsenceFormModal } from '../components/StaffAbsenceFormModal';
import { StaffAbsenceApprovalModal } from '../components/StaffAbsenceApprovalModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatAbsenceType, formatAbsenceStatus, formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface StaffAbsencePageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffAbsencePage: React.FC<StaffAbsencePageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [requests, setRequests] = useState<StaffAbsenceRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [approvalModalState, setApprovalModalState] = useState<{
    isOpen: boolean;
    request: StaffAbsenceRequest | null;
    mode: 'approve' | 'reject';
  }>({
    isOpen: false,
    request: null,
    mode: 'approve',
  });

  const canApprove = ['admin', 'headmaster', 'hrd'].includes(currentUser.role);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StaffAttendanceApi.getAbsenceRequests();
      if (res.data) setRequests(res.data);
    } catch (err: any) {
      showToast('Gagal memuat daftar permohonan izin SDM: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = req.staff_name.toLowerCase().includes(q);
        const matchesNumber = (req.staff_number || '').toLowerCase().includes(q);
        const matchesReason = req.reason.toLowerCase().includes(q);
        if (!matchesName && !matchesNumber && !matchesReason) return false;
      }

      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'all' && req.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, typeFilter]);

  // KPI calculations
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const columns: Column<StaffAbsenceRequest>[] = [
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
      key: 'type',
      header: 'Jenis Pengajuan',
      render: (r) => {
        const info = formatAbsenceType(r.type);
        return (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${info.badgeClass}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'period',
      header: 'Rentang Tanggal',
      render: (r) => (
        <div className="text-xs text-zinc-300">
          <div>{formatDateIndonesian(r.start_at.substring(0, 10))}</div>
          <div className="text-zinc-500 text-[11px]">s/d {formatDateIndonesian(r.end_at.substring(0, 10))}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Alasan / Keterangan',
      render: (r) => (
        <p className="text-xs text-zinc-300 max-w-xs truncate" title={r.reason}>
          {r.reason}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status Persetujuan',
      render: (r) => {
        const info = formatAbsenceStatus(r.status);
        return (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${info.badgeClass}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (r) => {
        if (r.status === 'pending' && canApprove) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setApprovalModalState({
                    isOpen: true,
                    request: r,
                    mode: 'reject',
                  })
                }
                className="text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10 py-1 px-2.5 h-auto"
              >
                Tolak
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  setApprovalModalState({
                    isOpen: true,
                    request: r,
                    mode: 'approve',
                  })
                }
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white py-1 px-2.5 h-auto"
              >
                Setujui
              </Button>
            </div>
          );
        }

        return (
          <span className="text-xs text-zinc-500 font-mono">
            {r.approved_by ? `Oleh: ${r.approved_by}` : '—'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Pengajuan Izin, Cuti & Dinas SDM
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kelola dispensasi ketidakhadiran, cuti tahunan, surat sakit, dan penugasan dinas luar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadRequests}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Pengajuan Izin / Cuti
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-500/15 border-amber-500/50'
              : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Menunggu Verifikasi</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-500/15 border-emerald-500/50'
              : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Disetujui</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-500/15 border-rose-500/50'
              : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Ditolak</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama staf atau alasan pengajuan..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs w-44"
          >
            <option value="all">Semua Jenis Izin</option>
            <option value="permission">Izin Pribadi</option>
            <option value="sick">Sakit</option>
            <option value="leave">Cuti</option>
            <option value="official_duty">Dinas Luar</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs w-40"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="Memuat daftar permohonan izin staf..." />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="Belum Ada Pengajuan Izin / Cuti"
          description={
            searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Tidak ditemukan data pengajuan yang sesuai dengan filter pencarian.'
              : 'Belum ada staf yang mengajukan permohonan izin atau cuti.'
          }
          actionLabel="Buat Pengajuan Baru"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <ResponsiveTable
          data={filteredRequests}
          columns={columns}
          keyExtractor={(r) => r.id}
          renderMobileCard={(r) => (
            <AbsenceRequestCard
              request={r}
              canApprove={canApprove}
              onApprove={(req) =>
                setApprovalModalState({
                  isOpen: true,
                  request: req,
                  mode: 'approve',
                })
              }
              onReject={(req) =>
                setApprovalModalState({
                  isOpen: true,
                  request: req,
                  mode: 'reject',
                })
              }
            />
          )}
        />
      )}

      {/* Form Modal */}
      <StaffAbsenceFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        staffList={staffList}
        currentUser={currentUser}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          loadRequests();
        }}
      />

      {/* Approval Modal */}
      {approvalModalState.request && (
        <StaffAbsenceApprovalModal
          isOpen={approvalModalState.isOpen}
          onClose={() =>
            setApprovalModalState({
              isOpen: false,
              request: null,
              mode: 'approve',
            })
          }
          request={approvalModalState.request}
          mode={approvalModalState.mode}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setApprovalModalState({
              isOpen: false,
              request: null,
              mode: 'approve',
            })
            loadRequests();
          }}
        />
      )}
    </div>
  );
};
