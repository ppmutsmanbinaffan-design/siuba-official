import React from 'react';
import { Student, UserRole } from '../../../types';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { PersonIdentity } from '../../../components/common/PersonIdentity';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu';
import { Eye, Edit3, Power, UserCheck, CheckCircle2 } from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';
import { authService } from '../../../services/authService';

export interface StudentTableProps {
  students: Student[];
  isLoading?: boolean;
  userRole?: UserRole;
  userPermissions?: string[];
  onViewDetail: (student: Student) => void;
  onEdit: (student: Student) => void;
  onToggleStatus: (student: Student) => void;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isLoading = false,
  userRole,
  userPermissions,
  onViewDetail,
  onEdit,
  onToggleStatus,
  currentPage,
  totalPages,
  totalRecords,
  perPage,
  onPageChange,
}) => {
  const currentUser = authService.getState().user;
  const effectivePermissions = userPermissions || currentUser?.permissions;
  const effectiveRole = userRole || currentUser?.role;
  const canEdit = hasPermission(effectiveRole, 'students.update', effectivePermissions) || hasPermission(effectiveRole, 'students.edit', effectivePermissions);
  const canDeactivate = hasPermission(effectiveRole, 'students.deactivate', effectivePermissions);

  const columns: Column<Student>[] = [
    {
      key: 'identity',
      header: 'Santri',
      render: (s) => (
        <PersonIdentity
          name={s.name}
          code={s.student_number}
          subtext={s.nickname ? `"${s.nickname}"` : undefined}
          photoUrl={s.photo}
          gender={s.gender}
          onClick={() => onViewDetail(s)}
        />
      ),
    },
    {
      key: 'gender',
      header: 'L/P',
      render: (s) => (
        <span
          className={`inline-flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-lg ${
            s.gender === 'male' || s.gender === 'L'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
          }`}
        >
          {s.gender === 'male' || s.gender === 'L' ? 'L' : 'P'}
        </span>
      ),
    },
    {
      key: 'classroom',
      header: 'Kelas',
      render: (s) => (
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {s.classroom_name || '-'}
        </span>
      ),
    },
    {
      key: 'dormitory',
      header: 'Asrama / Kamar',
      render: (s) => (
        <span className="text-xs text-zinc-700 dark:text-zinc-300">
          {s.dormitory_room_name || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.status} type="student" size="sm" />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (s) => {
        const menuItems: ActionMenuItem[] = [
          {
            label: 'Lihat Profil & Detail',
            icon: <Eye className="w-4 h-4 text-emerald-600" />,
            onClick: () => onViewDetail(s),
          },
        ];

        if (canEdit) {
          menuItems.push({
            label: 'Edit Data Santri',
            icon: <Edit3 className="w-4 h-4 text-blue-600" />,
            onClick: () => onEdit(s),
          });
        }

        if (canDeactivate) {
          menuItems.push({
            label: s.status === 'active' ? 'Nonaktifkan Santri' : 'Aktifkan Santri',
            icon: <Power className="w-4 h-4 text-amber-600" />,
            variant: s.status === 'active' ? 'danger' : 'default',
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
      data={students}
      keyExtractor={(s) => s.id}
      isLoading={isLoading}
      emptyTitle="Belum ada data santri."
      emptyDescription="Tambahkan data santri baru atau sesuaikan filter pencarian Anda."
      currentPage={currentPage}
      totalPages={totalPages}
      totalRecords={totalRecords}
      onPageChange={onPageChange}
    />
  );
};
