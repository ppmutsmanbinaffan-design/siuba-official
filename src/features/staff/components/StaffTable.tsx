import React from 'react';
import { Staff, UserRole } from '../../../types';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { PersonIdentity } from '../../../components/common/PersonIdentity';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu';
import { Eye, Edit3, Power, UserCheck, Shield, CheckCircle } from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';

export interface StaffTableProps {
  staffList: Staff[];
  isLoading?: boolean;
  userRole?: UserRole;
  onViewDetail: (staff: Staff) => void;
  onEdit: (staff: Staff) => void;
  onToggleStatus: (staff: Staff) => void;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

const staffTypeBadgeMap: Record<string, { label: string; bg: string; text: string }> = {
  teacher: { label: 'Guru / Ustadz', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
  musyrif: { label: 'Musyrif Asrama', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
  trainer: { label: 'Pelatih Ekskul', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
  general_staff: { label: 'Staff Umum', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300' },
  security: { label: 'Keamanan / Security', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  cleaning: { label: 'Kebersihan', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
};

const employmentStatusBadgeMap: Record<string, { label: string; bg: string; text?: string }> = {
  permanent: { label: 'Tetap', bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  contract: { label: 'Kontrak', bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  honorary: { label: 'Honorer', bg: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  internship: { label: 'Magang', bg: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
};

export const StaffTable: React.FC<StaffTableProps> = ({
  staffList,
  isLoading = false,
  userRole,
  onViewDetail,
  onEdit,
  onToggleStatus,
  currentPage,
  totalPages,
  totalRecords,
  perPage,
  onPageChange,
}) => {
  const canEdit = hasPermission(userRole, 'staff.edit');
  const canDeactivate = hasPermission(userRole, 'staff.deactivate');

  const columns: Column<Staff>[] = [
    {
      key: 'identity',
      header: 'Nama SDM & NIP',
      render: (s) => (
        <PersonIdentity
          name={s.name}
          code={s.staff_number}
          subtext={s.position || s.department}
          photoUrl={s.photo}
          gender={s.gender}
          onClick={() => onViewDetail(s)}
        />
      ),
    },
    {
      key: 'type',
      header: 'Tipe SDM',
      render: (s) => {
        const conf = staffTypeBadgeMap[s.staff_type] || {
          label: s.staff_type,
          bg: 'bg-zinc-100 dark:bg-zinc-800',
          text: 'text-zinc-700 dark:text-zinc-300',
        };
        return (
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${conf.bg} ${conf.text}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      key: 'employment',
      header: 'Kepegawaian',
      render: (s) => {
        const conf = employmentStatusBadgeMap[s.employment_status] || {
          label: s.employment_status,
          bg: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        };
        return (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${conf.bg}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      key: 'phone',
      header: 'No. HP / WhatsApp',
      render: (s) => (
        <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{s.phone}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={Boolean(s.is_active)} type="staff" size="sm" />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (s) => {
        const menuItems: ActionMenuItem[] = [
          {
            label: 'Lihat Detail SDM',
            icon: <Eye className="w-4 h-4 text-emerald-600" />,
            onClick: () => onViewDetail(s),
          },
        ];

        if (canEdit) {
          menuItems.push({
            label: 'Edit Data SDM',
            icon: <Edit3 className="w-4 h-4 text-blue-600" />,
            onClick: () => onEdit(s),
          });
        }

        if (canDeactivate) {
          menuItems.push({
            label: s.is_active ? 'Nonaktifkan SDM' : 'Aktifkan SDM',
            icon: <Power className="w-4 h-4 text-amber-600" />,
            variant: s.is_active ? 'danger' : 'default',
            onClick: () => onToggleStatus(s),
          });
        }

        return <ActionMenu items={menuItems} />;
      },
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={staffList}
      keyExtractor={(s) => s.id}
      isLoading={isLoading}
      emptyTitle="Belum ada data SDM."
      emptyDescription="Tambahkan data guru atau staff baru untuk mengelola absensi dan penugasan."
      currentPage={currentPage}
      totalPages={totalPages}
      totalRecords={totalRecords}
      onPageChange={onPageChange}
    />
  );
};
