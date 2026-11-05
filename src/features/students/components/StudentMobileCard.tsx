import React from 'react';
import { Student, UserRole } from '../../../types';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu';
import { Eye, Edit3, Power, GraduationCap, Home, BookOpen } from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';
import { authService } from '../../../services/authService';

export interface StudentMobileCardProps {
  student: Student;
  userRole?: UserRole;
  userPermissions?: string[];
  onViewDetail: (student: Student) => void;
  onEdit: (student: Student) => void;
  onToggleStatus: (student: Student) => void;
}

export const StudentMobileCard: React.FC<StudentMobileCardProps> = ({
  student,
  userRole,
  userPermissions,
  onViewDetail,
  onEdit,
  onToggleStatus,
}) => {
  const currentUser = authService.getState().user;
  const effectivePermissions = userPermissions || currentUser?.permissions;
  const effectiveRole = userRole || currentUser?.role;
  const canEdit = hasPermission(effectiveRole, 'students.update', effectivePermissions) || hasPermission(effectiveRole, 'students.edit', effectivePermissions);
  const canDeactivate = hasPermission(effectiveRole, 'students.deactivate', effectivePermissions);

  const menuItems: ActionMenuItem[] = [
    {
      label: 'Lihat Detail',
      icon: <Eye className="w-4 h-4 text-emerald-600" />,
      onClick: () => onViewDetail(student),
    },
  ];

  if (canEdit) {
    menuItems.push({
      label: 'Edit Santri',
      icon: <Edit3 className="w-4 h-4 text-blue-600" />,
      onClick: () => onEdit(student),
    });
  }

  if (canDeactivate) {
    menuItems.push({
      label: student.status === 'active' ? 'Nonaktifkan' : 'Aktifkan',
      icon: <Power className="w-4 h-4 text-amber-600" />,
      variant: student.status === 'active' ? 'danger' : 'default',
      onClick: () => onToggleStatus(student),
    });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() => onViewDetail(student)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          <PersonAvatar
            name={student.name}
            photoUrl={student.photo}
            gender={student.gender}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
              {student.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              <span className="font-mono">{student.student_number}</span>
              <span>•</span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {student.classroom_name || 'Tanpa Kelas'}
              </span>
            </div>
          </div>
        </div>

        <ActionMenu items={menuItems} />
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 truncate">
          <Home className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
          <span className="truncate">{student.dormitory_room_name || 'Non-Asrama'}</span>
        </div>
        <div className="flex justify-end">
          <StatusBadge status={student.status} type="student" size="sm" />
        </div>
      </div>
    </div>
  );
};
