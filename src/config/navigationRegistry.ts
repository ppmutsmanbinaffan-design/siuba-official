import { ComponentType } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Home, 
  CalendarDays, 
  ClipboardCheck, 
  Clock, 
  History, 
  Cpu, 
  CheckCircle2, 
  QrCode, 
  Radio, 
  Settings, 
  ShieldCheck,
  Award,
  FileText,
  IdCard,
  BookOpen,
  MoonStar,
  BookmarkCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Smartphone,
  Rocket,
  Briefcase,
  Server,
  Activity as ActivityIcon
} from 'lucide-react';
import { User, UserRole } from '../types';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
  permission?: string;
  permissionsAny?: string[];
  route: string;
  badge?: string;
}

/**
 * DEV & Reference Matrix (for local documentation & seeding synchronization)
 * Authoritative security in runtime uses user.permissions returned by Laravel Sanctum /me.
 */
export const ROLE_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  super_admin: ['*'],
  'super-admin': ['*'],
  admin: [
    'dashboard.view',
    'dashboard.executive',
    'reports.view',
    'reports.export',
    'staff.view',
    'staff.create',
    'staff.edit',
    'staff.deactivate',
    'staff.attendance',
    'staff.reports',
    'trainer.attendance',
    'routine.view',
    'prayer.view',
    'dormitory.view',
    'dormitory.monitoring',
    'dormitory.manage',
    'halaqah.view',
    'duty_roster.view',
    'routine_schedule.view',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.monitoring',
    'attendance.rfid',
    'attendance.excuses',
    'students.cards',
    'attendance.history',
    'students.view',
    'students.create',
    'students.edit',
    'students.deactivate',
    'events.view',
    'events.manage',
    'extracurriculars.view',
    'classrooms.view',
    'dormitories.view',
    'activities.view',
    'kbm.teacher_dashboard',
    'kbm.monitoring',
    'kbm.timetable',
    'kbm.master',
    'kbm.reports',
    'devices.view',
    'devices.manage',
    'psb.view',
    'psb.manage',
    'psb.verify',
    'psb.export',
    'ppdb.view',
    'ppdb.manage',
    'ppdb.verify',
    'ppdb.export',
    'users.view',
    'users.manage',
    'system.sync_center',
    'system.settings',
  ],
  pimpinan: [
    'dashboard.view',
    'dashboard.executive',
    'reports.view',
    'reports.export',
    'staff.reports',
    'kbm.reports',
    'students.view',
    'attendance.view',
    'kbm.monitoring',
    'dormitory.view',
    'system.settings',
  ],
  'kepala-sekolah': [
    'dashboard.view',
    'dashboard.executive',
    'students.view',
    'students.create',
    'students.edit',
    'staff.view',
    'staff.attendance',
    'staff.reports',
    'kbm.teacher_dashboard',
    'kbm.monitoring',
    'kbm.timetable',
    'kbm.master',
    'kbm.reports',
    'attendance.view',
    'reports.view',
    'reports.export',
    'system.settings',
  ],
  'kepala-asrama': [
    'dashboard.view',
    'students.view',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.monitoring',
    'dormitory.view',
    'dormitory.monitoring',
    'dormitory.manage',
    'prayer.monitoring',
    'halaqah.view',
    'duty_roster.view',
    'attendance.excuses',
    'reports.view',
    'system.settings',
  ],
  guru: [
    'dashboard.view',
    'kbm.teacher_dashboard',
    'kbm.monitoring',
    'kbm.timetable',
    'kbm.reports',
    'students.view',
    'attendance.view',
    'staff.attendance',
    'system.settings',
  ],
  teacher: [
    'dashboard.view',
    'kbm.teacher_dashboard',
    'kbm.monitoring',
    'kbm.timetable',
    'kbm.reports',
    'students.view',
    'attendance.view',
    'staff.attendance',
    'system.settings',
  ],
  musyrif: [
    'dashboard.view',
    'students.view',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.monitoring',
    'dormitory.view',
    'dormitory.monitoring',
    'prayer.monitoring',
    'halaqah.view',
    'duty_roster.view',
    'attendance.excuses',
    'system.settings',
  ],
  pelatih: [
    'dashboard.view',
    'trainer.attendance',
    'students.view',
    'extracurriculars.view',
    'system.settings',
  ],
  'petugas-absensi': [
    'dashboard.view',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.monitoring',
    'attendance.rfid',
    'prayer.monitoring',
    'students.view',
    'system.settings',
  ],
  'petugas-masjid': [
    'dashboard.view',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.monitoring',
    'prayer.monitoring',
    'students.view',
    'system.settings',
  ],
  operator: [
    'dashboard.view',
    'students.view',
    'students.create',
    'students.edit',
    'students.cards',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.monitoring',
    'attendance.rfid',
    'qr-print.view',
    'devices.view',
    'system.settings',
  ],
  kesantrian: [
    'dashboard.view',
    'students.view',
    'students.create',
    'students.edit',
    'students.deactivate',
    'students.cards',
    'staff.view',
    'attendance.view',
    'attendance.scan',
    'attendance.manual',
    'attendance.reports',
    'dormitory.view',
    'dormitory.manage',
    'attendance.excuses',
    'reports.view',
    'reports.export',
    'system.settings',
  ],
  academic: [
    'dashboard.view',
    'students.view',
    'students.create',
    'students.edit',
    'staff.view',
    'kbm.teacher_dashboard',
    'kbm.monitoring',
    'kbm.timetable',
    'kbm.master',
    'kbm.reports',
    'reports.view',
    'system.settings',
  ],
  'panitia-psb': [
    'dashboard.view',
    'students.view',
    'psb.view',
    'psb.manage',
    'psb.verify',
    'psb.export',
    'ppdb.view',
    'ppdb.manage',
    'ppdb.verify',
    'ppdb.export',
    'system.settings',
  ],
  panitia_psb: [
    'dashboard.view',
    'students.view',
    'psb.view',
    'psb.manage',
    'psb.verify',
    'psb.export',
    'ppdb.view',
    'ppdb.manage',
    'ppdb.verify',
    'ppdb.export',
    'system.settings',
  ],
  'panitia-ppdb': [
    'dashboard.view',
    'students.view',
    'psb.view',
    'psb.manage',
    'psb.verify',
    'psb.export',
    'ppdb.view',
    'ppdb.manage',
    'ppdb.verify',
    'ppdb.export',
    'system.settings',
  ],
  panitia_ppdb: [
    'dashboard.view',
    'students.view',
    'psb.view',
    'psb.manage',
    'psb.verify',
    'psb.export',
    'ppdb.view',
    'ppdb.manage',
    'ppdb.verify',
    'ppdb.export',
    'system.settings',
  ],
};

export const NAVIGATION_REGISTRY: NavItemConfig[] = [
  // UTAMA
  {
    id: 'dashboard',
    label: 'Dashboard Operasional',
    icon: LayoutDashboard,
    category: 'UTAMA',
    route: '/dashboard',
    permission: 'dashboard.view',
  },
  {
    id: 'profile-360',
    label: 'Profil 360°',
    icon: UserCheck,
    category: 'UTAMA',
    route: '/profil-360',
  },

  // LAPORAN & ANALYTICS
  {
    id: 'executive-dashboard',
    label: 'Dashboard Eksekutif',
    icon: LayoutDashboard,
    category: 'LAPORAN',
    route: '/eksekutif',
    permission: 'dashboard.executive',
  },
  {
    id: 'report-center',
    label: 'Pusat Laporan',
    icon: FileText,
    category: 'LAPORAN',
    route: '/laporan',
    permission: 'reports.view',
  },

  // SDM & KEPEGAWAIAN
  {
    id: 'staff-integrated-dashboard',
    label: 'Dashboard SDM',
    icon: LayoutDashboard,
    category: 'SDM',
    route: '/sdm/dashboard',
    permission: 'staff.reports',
  },
  {
    id: 'staff-master',
    label: 'Master SDM',
    icon: Users,
    category: 'SDM',
    route: '/sdm',
    permission: 'staff.view',
  },
  {
    id: 'staff-attendance',
    label: 'Presensi SDM & Guru',
    icon: Briefcase,
    category: 'SDM',
    route: '/sdm/presensi',
    permission: 'staff.attendance',
  },
  {
    id: 'trainer-attendance',
    label: 'Presensi Pelatih',
    icon: Award,
    category: 'SDM',
    route: '/sdm/pelatih',
    permission: 'trainer.attendance',
  },
  {
    id: 'staff-report-center',
    label: 'Laporan SDM',
    icon: FileText,
    category: 'SDM',
    route: '/sdm/laporan',
    permission: 'staff.reports',
  },

  // RUTIN & IBADAH
  {
    id: 'today-timeline',
    label: 'Timeline Rutin',
    icon: Sparkles,
    category: 'RUTIN & IBADAH',
    route: '/rutin/timeline',
    permission: 'attendance.view',
  },
  {
    id: 'prayer-monitoring',
    label: 'Shalat 5 Waktu',
    icon: MoonStar,
    category: 'RUTIN & IBADAH',
    route: '/rutin/shalat',
    permission: 'prayer.monitoring',
  },
  {
    id: 'dormitory-monitoring',
    label: 'Monitoring Asrama',
    icon: Home,
    category: 'RUTIN & IBADAH',
    route: '/rutin/asrama',
    permission: 'dormitory.monitoring',
  },
  {
    id: 'halaqah-manager',
    label: 'Halaqah Tahfidz',
    icon: BookmarkCheck,
    category: 'RUTIN & IBADAH',
    route: '/rutin/halaqah',
    permission: 'halaqah.view',
  },
  {
    id: 'duty-roster-manager',
    label: 'Duty Roster & Piket',
    icon: UserCheck,
    category: 'RUTIN & IBADAH',
    route: '/rutin/piket',
    permission: 'duty_roster.view',
  },
  {
    id: 'routine-schedule-manager',
    label: 'Jadwal Rutin',
    icon: SlidersHorizontal,
    category: 'RUTIN & IBADAH',
    route: '/rutin/jadwal',
    permission: 'routine_schedule.view',
  },

  // ABSENSI SANTRI
  {
    id: 'attendance-dashboard',
    label: 'Pusat Absensi Santri',
    icon: ActivityIcon,
    category: 'ABSENSI',
    route: '/absensi',
    permission: 'attendance.view',
  },
  {
    id: 'qr-scanner',
    label: 'Live QR Scanner',
    icon: QrCode,
    category: 'ABSENSI',
    route: '/absensi/scanner',
    permission: 'attendance.scan',
  },
  {
    id: 'sessions',
    label: 'Sesi Absensi',
    icon: Clock,
    category: 'ABSENSI',
    route: '/absensi/sesi',
    permission: 'attendance.view',
  },
  {
    id: 'manual-attendance',
    label: 'Absensi Manual',
    icon: ClipboardCheck,
    category: 'ABSENSI',
    route: '/absensi/manual',
    permission: 'attendance.manual',
  },
  {
    id: 'attendance-monitoring',
    label: 'Monitoring Sesi',
    icon: Sparkles,
    category: 'ABSENSI',
    route: '/absensi/monitoring',
    permission: 'attendance.monitoring',
  },
  {
    id: 'excuses',
    label: 'Izin & Dispensasi',
    icon: FileText,
    category: 'ABSENSI',
    route: '/izin',
    permission: 'attendance.excuses',
  },
  {
    id: 'qr-bulk-print',
    label: 'Cetak Kartu QR',
    icon: IdCard,
    category: 'ABSENSI',
    route: '/qr-print',
    permission: 'students.cards',
  },
  {
    id: 'history',
    label: 'Riwayat & Audit',
    icon: History,
    category: 'ABSENSI',
    route: '/riwayat',
    permission: 'attendance.history',
  },
  {
    id: 'scanner-simulator',
    label: 'Simulator QR Scanner',
    icon: Radio,
    category: 'ABSENSI',
    route: '/simulator',
    permission: 'devices.view',
  },

  // MASTER DATA SANTRI
  {
    id: 'students',
    label: 'Santri & Identitas',
    icon: Users,
    category: 'MASTER DATA',
    route: '/santri',
    permission: 'students.view',
  },
  {
    id: 'student-card-designer',
    label: 'Desain Kartu Santri',
    icon: IdCard,
    category: 'MASTER DATA',
    route: '/kartu-santri',
    permission: 'students.cards',
  },
  {
    id: 'events-manager',
    label: 'Event & Kegiatan Khusus',
    icon: Award,
    category: 'MASTER DATA',
    route: '/events',
    permission: 'events.view',
  },
  {
    id: 'extracurriculars-groups',
    label: 'Ekskul & Kelompok',
    icon: Users,
    category: 'MASTER DATA',
    route: '/ekskul',
    permission: 'extracurriculars.view',
  },
  {
    id: 'classrooms',
    label: 'Kelas & Tingkat',
    icon: GraduationCap,
    category: 'MASTER DATA',
    route: '/kelas',
    permission: 'classrooms.view',
  },
  {
    id: 'dormitories',
    label: 'Asrama & Kamar',
    icon: Home,
    category: 'MASTER DATA',
    route: '/asrama',
    permission: 'dormitories.view',
  },
  {
    id: 'activities',
    label: 'Master Kegiatan',
    icon: CalendarDays,
    category: 'MASTER DATA',
    route: '/kegiatan',
    permission: 'activities.view',
  },

  // PENERIMAAN SANTRI BARU (PSB)
  {
    id: 'psb-management',
    label: 'Pusat Manajemen PSB',
    icon: GraduationCap,
    category: 'PENERIMAAN SANTRI (PSB)',
    route: '/manajemen-psb',
    permission: 'psb.view',
  },

  // AKADEMIK / KBM
  {
    id: 'teacher-dashboard',
    label: 'Dashboard Guru KBM',
    icon: BookOpen,
    category: 'AKADEMIK',
    route: '/kbm/guru',
    permission: 'kbm.teacher_dashboard',
  },
  {
    id: 'kbm-monitoring',
    label: 'Monitoring KBM',
    icon: Clock,
    category: 'AKADEMIK',
    route: '/kbm/monitoring',
    permission: 'kbm.monitoring',
  },
  {
    id: 'timetable',
    label: 'Jadwal Pelajaran',
    icon: CalendarDays,
    category: 'AKADEMIK',
    route: '/kbm/jadwal',
    permission: 'kbm.timetable',
  },
  {
    id: 'academic-master',
    label: 'Master Akademik',
    icon: GraduationCap,
    category: 'AKADEMIK',
    route: '/kbm/master',
    permission: 'kbm.master',
  },
  {
    id: 'academic-reports',
    label: 'Laporan KBM',
    icon: FileText,
    category: 'AKADEMIK',
    route: '/kbm/laporan',
    permission: 'kbm.reports',
  },

  // PERANGKAT & HARDWARE
  {
    id: 'devices',
    label: 'Device Management',
    icon: Cpu,
    category: 'PERANGKAT',
    route: '/devices',
    permission: 'devices.view',
  },

  // ARSITEKTUR & QA
  {
    id: 'acceptance-tests',
    label: 'Acceptance Tests',
    icon: CheckCircle2,
    category: 'ARSITEKTUR & TEST',
    route: '/acceptance-tests',
    permission: 'acceptance_tests.view',
  },

  // PENGGUNA & AKSES
  {
    id: 'access',
    label: 'Role & Permission',
    icon: ShieldCheck,
    category: 'PENGGUNA & AKSES',
    route: '/access',
    permission: 'users.view',
  },

  // SISTEM & PENGATURAN
  {
    id: 'maintenance',
    label: 'Maintenance Hub',
    icon: Server,
    category: 'SISTEM',
    route: '/maintenance',
    permission: 'system.maintenance',
  },
  {
    id: 'go-live-qa',
    label: 'Go-Live & QA Master',
    icon: Rocket,
    category: 'SISTEM',
    route: '/sistem/go-live',
    permission: 'system.maintenance',
  },
  {
    id: 'security-audit',
    label: 'Keamanan & Audit',
    icon: ShieldCheck,
    category: 'SISTEM',
    route: '/security-audit',
    permission: 'system.security_audit',
  },
  {
    id: 'sync-center',
    label: 'Pusat Sinkronisasi PWA',
    icon: Smartphone,
    category: 'SISTEM',
    route: '/sync',
    permission: 'system.sync_center',
  },
  {
    id: 'settings',
    label: 'Pengaturan Lokal',
    icon: Settings,
    category: 'SISTEM',
    route: '/settings',
    permission: 'system.settings',
  },
];

/**
 * Checks if a user has a specific permission
 */
/**
 * Authoritative permission check in runtime.
 * Evaluates strictly against authoritative permissions provided by the backend.
 * If userPermissions is undefined/empty: DENY (false).
 */
export function hasPermission(
  _userRole: UserRole | undefined,
  requiredPermission: string,
  userPermissions?: string[]
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }

  // 1. Wildcard super-admin access
  if (userPermissions.includes('*')) return true;

  // 2. Exact permission match
  if (userPermissions.includes(requiredPermission)) return true;

  // 3. Domain-level wildcard match (e.g. 'students.*' allows 'students.view')
  const [domain] = requiredPermission.split('.');
  if (domain && userPermissions.includes(`${domain}.*`)) return true;

  return false;
}

/**
 * Convenience helper to check if a user possesses a specific role (checks primary role and multi-roles array).
 */
export function hasRole(user?: User | null, roleName?: string): boolean {
  if (!user || !roleName) return false;
  const target = roleName.toLowerCase().replace(/_/g, '-');
  const userPrimary = (user.role || '').toLowerCase().replace(/_/g, '-');
  if (userPrimary === target) return true;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r) => (r || '').toLowerCase().replace(/_/g, '-') === target);
  }
  return false;
}

/**
 * Checks if user is Super Admin (via role, multi-roles, id, or wildcard permissions).
 */
export function isSuperAdmin(user?: User | null): boolean {
  if (!user) return false;
  if (user.id === 1 || user.username === 'superadmin') return true;
  if (hasRole(user, 'super-admin') || hasRole(user, 'super_admin')) return true;
  if (Array.isArray(user.permissions) && user.permissions.includes('*')) return true;
  return false;
}

/**
 * Convenience helper for user permission check
 */
export function can(permission: string, user?: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, permission, user.permissions);
}

/**
 * Check if user has ANY of the specified permissions
 */
export function canAny(permissions: string[], user?: User | null): boolean {
  if (!user) return false;
  return permissions.some((p) => hasPermission(user.role, p, user.permissions));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function canAll(permissions: string[], user?: User | null): boolean {
  if (!user) return false;
  return permissions.every((p) => hasPermission(user.role, p, user.permissions));
}

/**
 * Resolves the first accessible route for a user based on their granted permissions.
 * Priority: /dashboard if granted dashboard.view, else first authorized route.
 * Returns null if user has no usable permissions.
 */
export function getFirstAccessibleRoute(user: User | null): string | null {
  if (!user) return null;

  if (can('dashboard.view', user)) {
    return 'dashboard';
  }

  const visibleGroups = getVisibleNavigation(user);
  for (const group of visibleGroups) {
    if (group.items.length > 0) {
      return group.items[0].id;
    }
  }

  return null;
}

/**
 * Gets the required permission for a tab ID (for route guarding)
 */
export function getTabRequiredPermission(tabId: string): string | undefined {
  const item = NAVIGATION_REGISTRY.find((n) => n.id === tabId);
  return item?.permission;
}

/**
 * Filters navigation items according to user permissions and groups by category
 */
export function getVisibleNavigation(
  user: User | null,
  dynamicBadges?: Record<string, string | undefined>
): { category: string; items: NavItemConfig[] }[] {
  if (!user) return [];

  // Filter allowed items
  const allowedItems = NAVIGATION_REGISTRY.filter((item) => {
    if (!item.permission && !item.permissionsAny) return true;
    if (item.permission && hasPermission(user.role, item.permission, user.permissions)) return true;
    if (item.permissionsAny && item.permissionsAny.some((p) => hasPermission(user.role, p, user.permissions))) return true;
    return false;
  }).map((item) => ({
    ...item,
    badge: dynamicBadges?.[item.id] || item.badge,
  }));

  // Group by category, retaining only categories that have >= 1 item
  const categoryMap = new Map<string, NavItemConfig[]>();
  for (const item of allowedItems) {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category)!.push(item);
  }

  const result: { category: string; items: NavItemConfig[] }[] = [];
  for (const [category, items] of categoryMap.entries()) {
    if (items.length > 0) {
      result.push({ category, items });
    }
  }

  return result;
}
