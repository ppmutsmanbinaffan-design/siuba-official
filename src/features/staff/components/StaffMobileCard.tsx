import React from 'react';
import { Staff, UserRole } from '../../../types';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu';
import { Eye, Edit3, Power, Phone, Briefcase } from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';

export interface StaffMobileCardProps {
  staff: Staff;
  userRole?: UserRole;
  onViewDetail: (staff: Staff) => void;
  onEdit: (staff: Staff) => void;
  onToggleStatus: (staff: Staff) => void;
}

const staffTypeLabelMap: Record<string, string> = {
  teacher: 'Guru',
  musyrif: 'Musyrif',
  trainer: 'Pelatih',
  general_staff: 'Staff',
  security: 'Security',
  cleaning: 'Kebersihan',
};

export const StaffMobileCard: React.FC<StaffMobileCardProps> = ({
  staff,
  userRole,
  onViewDetail,
  onEdit,
  onToggleStatus,
}) => {
  const canEdit = hasPermission(userRole, 'staff.edit');
  const canDeactivate = hasPermission(userRole, 'staff.deactivate');

  const menuItems: ActionMenuItem[] = [
    {
      label: 'Lihat Detail',
      icon: <Eye className="w-4 h-4 text-emerald-600" />,
      onClick: () => onViewDetail(staff),
    },
  ];

  if (canEdit) {
    menuItems.push({
      label: 'Edit SDM',
      icon: <Edit3 className="w-4 h-4 text-blue-600" />,
      onClick: () => onEdit(staff),
    });
  }

  if (canDeactivate) {
    menuItems.push({
      label: staff.is_active ? 'Nonaktifkan' : 'Aktifkan',
      icon: <Power className="w-4 h-4 text-amber-600" />,
      variant: staff.is_active ? 'danger' : 'default',
      onClick: () => onToggleStatus(staff),
    });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() => onViewDetail(staff)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          <PersonAvatar
            name={staff.name}
            photoUrl={staff.photo}
            gender={staff.gender}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
              {staff.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              <span className="font-mono">{staff.staff_number}</span>
              <span>•</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {staffTypeLabelMap[staff.staff_type] || staff.staff_type}
              </span>
            </div>
          </div>
        </div>

        <ActionMenu items={menuItems} />
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 truncate">
          <Phone className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
          <span className="font-mono">{staff.phone}</span>
        </div>
        <StatusBadge status={Boolean(staff.is_active)} type="staff" size="sm" />
      </div>
    </div>
  );
};
