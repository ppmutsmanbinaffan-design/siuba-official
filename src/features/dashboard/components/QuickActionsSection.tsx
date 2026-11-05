import React from 'react';
import { 
  ClipboardCheck, 
  QrCode, 
  Briefcase, 
  BookOpen, 
  Award, 
  Users, 
  FileText, 
  Zap, 
  ChevronRight
} from 'lucide-react';
import { User } from '../../../types';

interface Props {
  currentUser: User;
  onNavigate: (tab: string, params?: any) => void;
}

export const QuickActionsSection: React.FC<Props> = ({ currentUser, onNavigate }) => {
  const actions = [
    {
      id: 'qa-manual-santri',
      title: 'Absensi Manual Santri',
      subtitle: 'Input lembar presensi santri',
      icon: ClipboardCheck,
      tab: 'manual-attendance',
      roles: ['superadmin', 'admin', 'musyrif', 'teacher', 'dorm_head'],
    },
    {
      id: 'qa-qr-santri',
      title: 'Scan QR Santri',
      subtitle: 'Scanner kamera presensi',
      icon: QrCode,
      tab: 'qr-scanner',
      roles: ['superadmin', 'admin', 'musyrif', 'security'],
    },
    {
      id: 'qa-sdm-daily',
      title: 'Kehadiran SDM',
      subtitle: 'Presensi gerbang & harian staf',
      icon: Briefcase,
      tab: 'staff-attendance',
      roles: ['superadmin', 'admin', 'management', 'security'],
    },
    {
      id: 'qa-teaching',
      title: 'Kehadiran Mengajar',
      subtitle: 'Presensi KBM & guru inval',
      icon: BookOpen,
      tab: 'staff-attendance',
      params: { defaultSubTab: 'teaching' },
      roles: ['superadmin', 'admin', 'teacher', 'principal'],
    },
    {
      id: 'qa-training',
      title: 'Kehadiran Pelatih',
      subtitle: 'Presensi pelatih & jurnal ekskul',
      icon: Award,
      tab: 'trainer-attendance',
      roles: ['superadmin', 'admin', 'trainer'],
    },
    {
      id: 'qa-students',
      title: 'Data Santri',
      subtitle: 'Kelola identitas santri & RFID',
      icon: Users,
      tab: 'students',
      roles: ['superadmin', 'admin', 'musyrif', 'dorm_head'],
    },
    {
      id: 'qa-staff-master',
      title: 'Data SDM',
      subtitle: 'Master staf, guru & pelatih',
      icon: Users,
      tab: 'staff-master',
      roles: ['superadmin', 'admin', 'management'],
    },
    {
      id: 'qa-reports',
      title: 'Pusat Laporan',
      subtitle: 'Rekap & export multi-domain',
      icon: FileText,
      tab: 'report-center',
      roles: ['superadmin', 'admin', 'management', 'principal', 'dorm_head', 'teacher', 'trainer'],
    },
  ];

  // Filter actions by user role
  const allowedActions = actions.filter((act) => {
    if (!act.roles || act.roles.length === 0) return true;
    if (currentUser.role === 'superadmin' || currentUser.role === 'admin') return true;
    return act.roles.includes(currentUser.role);
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-4" id="dashboard-section-quick-actions">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1F5C45]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Aksi Cepat Operasional
            </h2>
            <p className="text-xs text-zinc-500">
              Pintasan menu berdasarkan hak akses akun ({currentUser.name} &bull; {currentUser.role}).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {allowedActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.tab, action.params)}
              type="button"
              className="group text-left p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200 hover:border-[#1F5C45]/60 hover:bg-white transition-all cursor-pointer shadow-2xs"
              id={action.id}
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 group-hover:bg-[#1F5C45] group-hover:text-white group-hover:border-[#1F5C45] transition-all">
                <Icon className="w-4 h-4" />
              </div>
              <div className="mt-2.5 font-bold text-xs text-zinc-900 group-hover:text-[#1F5C45] line-clamp-1 transition-colors">
                {action.title}
              </div>
              <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                {action.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
