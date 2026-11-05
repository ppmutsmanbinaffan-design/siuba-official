import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Key, 
  Check, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Power, 
  LogIn, 
  Lock, 
  Unlock, 
  Settings2, 
  SlidersHorizontal, 
  CheckSquare, 
  Square, 
  X, 
  Award, 
  Layers, 
  ChevronRight, 
  Eye, 
  EyeOff,
  AlertTriangle,
  UserCheck,
  UserX,
  Sparkles,
  Shield,
  RefreshCw,
  Copy,
  Shuffle
} from 'lucide-react';
import { User, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../config/navigationRegistry';

// All SIUBA Permission Definitions grouped by functional module
export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  icon: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard_reports',
    name: '📊 Dashboard & Laporan Eksekutif',
    icon: 'LayoutDashboard',
    permissions: [
      { code: 'dashboard.view', name: 'Dashboard Operasional', description: 'Melihat statistik operasional harian pondok & grafik presensi' },
      { code: 'dashboard.executive', name: 'Dashboard Eksekutif', description: 'Melihat analitik KPI pimpinan, ringkasan KBM, dan SDM' },
      { code: 'reports.view', name: 'Pusat Laporan Presensi', description: 'Melihat rekapitulasi kehadiran santri, filter & pratinjau data' },
      { code: 'reports.export', name: 'Export Laporan (Excel/PDF)', description: 'Mengunduh laporan kehadiran ke format CSV, Excel, dan PDF' },
    ],
  },
  {
    id: 'sdm_staff',
    name: '👥 SDM & Kepegawaian',
    icon: 'Users',
    permissions: [
      { code: 'staff.reports', name: 'Dashboard SDM & Guru', description: 'Melihat metrik kehadiran staf, dewan asatidz, dan pelatih' },
      { code: 'staff.view', name: 'Master Data Pegawai', description: 'Melihat daftar dewan guru, musyrif, dan staf pondok' },
      { code: 'staff.create', name: 'Tambah Data Pegawai', description: 'Mendaftarkan pegawai/guru baru ke sistem' },
      { code: 'staff.edit', name: 'Ubah Data Pegawai', description: 'Mengubah profil, nomor induk, jabatan, dan kontak pegawai' },
      { code: 'staff.deactivate', name: 'Nonaktifkan Pegawai', description: 'Menonaktifkan status kepegawaian staf/guru' },
      { code: 'staff.attendance', name: 'Presensi SDM & Dewan Guru', description: 'Mencatat dan memverifikasi kehadiran kerja asatidz & staf' },
      { code: 'trainer.attendance', name: 'Presensi Pelatih Ekskul', description: 'Mencatat kehadiran pelatih ekstrakurikuler & kelompok minat' },
    ],
  },
  {
    id: 'students_kesantrian',
    name: '🎓 Santri & Kesiswaan',
    icon: 'GraduationCap',
    permissions: [
      { code: 'students.view', name: 'Data Induk Santri', description: 'Melihat data santri, NIS, kelas rombel, dan gedung asrama' },
      { code: 'students.create', name: 'Tambah Santri Baru', description: 'Mendaftarkan santri baru ke database SIUBA' },
      { code: 'students.edit', name: 'Ubah Data Santri', description: 'Mengedit identitas, data wali, kelas, kamar, dan RFID santri' },
      { code: 'students.deactivate', name: 'Nonaktifkan / Mutasi Santri', description: 'Mengubah status santri menjadi lulus, pindah, atau non-aktif' },
      { code: 'students.cards', name: 'Desain & Cetak Kartu Santri', description: 'Mencetak kartu pelajar santri dengan barcode/QR code' },
      { code: 'attendance.excuses', name: 'Manajemen Izin & Surat Sakit', description: 'Memproses pengajuan izin pulang, sakit, dan dispensasi' },
      { code: 'qr-print.view', name: 'Cetak Massal QR Code Santri', description: 'Mencetak lembar QR code per rombel kelas atau kamar' },
    ],
  },
  {
    id: 'attendance_terminal',
    name: '⚡ Presensi Santri & Terminal',
    icon: 'Radio',
    permissions: [
      { code: 'attendance.view', name: 'Dashboard & Sesi Presensi', description: 'Melihat sesi presensi aktif, riwayat sesi, dan rekap peserta' },
      { code: 'attendance.scan', name: 'Pemindai Scanner QR Code', description: 'Mengoperasikan kamera scanner QR code santri' },
      { code: 'attendance.manual', name: 'Presensi Manual / Walk-in', description: 'Mencatat presensi manual santri tanpa kartu/QR' },
      { code: 'attendance.monitoring', name: 'Live Monitoring Presensi', description: 'Melihat data kehadiran masuk secara real-time di layar monitor' },
      { code: 'attendance.rfid', name: 'Simulator Gateway RFID', description: 'Menguji dan mensimulasikan tap kartu RFID santri' },
      { code: 'attendance.history', name: 'Riwayat & Audit Log Presensi', description: 'Melihat log detail seluruh transaksi presensi santri' },
      { code: 'devices.view', name: 'Daftar Perangkat Terminal', description: 'Melihat terminal hardware RFID ESP32, kiosk, dan scanner LAN' },
      { code: 'devices.manage', name: 'Kelola & Rotate Token Terminal', description: 'Menambah perangkat baru dan merotasi API Token SHA-256' },
    ],
  },
  {
    id: 'pondok_activities',
    name: '🕌 Kegiatan & Jadwal Pondok',
    icon: 'MoonStar',
    permissions: [
      { code: 'routine.view', name: 'Agenda Hari Ini & Timeline', description: 'Melihat linimasa jadwal shalat, apel, makan, dan asrama hari ini' },
      { code: 'prayer.monitoring', name: 'Monitoring Shalat 5 Waktu', description: 'Memantau presensi shalat berjamaah santri di masjid' },
      { code: 'dormitory.monitoring', name: 'Monitoring Asrama & Kamar', description: 'Memantau apel malam dan keberadaan santri di asrama' },
      { code: 'halaqah.view', name: 'Manajemen Halaqah Al-Qur\'an', description: 'Melihat pembagian halaqah tahfidz dan ustadz pembina' },
      { code: 'duty_roster.view', name: 'Jadwal Piket & Kebersihan', description: 'Melihat jadwal piket ro\'an kebersihan santri' },
      { code: 'routine_schedule.view', name: 'Master Jadwal Rutin', description: 'Mengatur jadwal rutin mingguan kegiatan pondok' },
      { code: 'events.view', name: 'Kegiatan Khusus & Event', description: 'Melihat daftar kegiatan seminar, lomba, dan event pondok' },
      { code: 'events.manage', name: 'Kelola Event & Registrasi', description: 'Membuat event baru dan mengatur registrasi peserta' },
      { code: 'extracurriculars.view', name: 'Ekstrakurikuler & Kelompok', description: 'Melihat daftar ekskul minat bakat dan anggota santri' },
      { code: 'classrooms.view', name: 'Manajemen Kelas Rombel', description: 'Melihat dan mengelola master data rombel kelas santri' },
      { code: 'dormitories.view', name: 'Manajemen Asrama & Gedung', description: 'Melihat dan mengelola master data gedung asrama & kamar' },
      { code: 'activities.view', name: 'Master Kegiatan Pondok', description: 'Mengatur jenis kegiatan (Ibadah, KBM, Tahfidz, dll)' },
    ],
  },
  {
    id: 'academic_kbm',
    name: '📚 Akademik & KBM',
    icon: 'BookOpen',
    permissions: [
      { code: 'kbm.teacher_dashboard', name: 'Portal Presensi Guru KBM', description: 'Membuka dan mencatat presensi jam pelajaran (JP) kelas' },
      { code: 'kbm.monitoring', name: 'Monitoring KBM & Jurnal', description: 'Memantau jalannya pembelajaran di setiap kelas secara langsung' },
      { code: 'kbm.timetable', name: 'Jadwal Pelajaran KBM', description: 'Mengatur jadwal mapel, jam pelajaran (JP), dan hari aktif' },
      { code: 'kbm.master', name: 'Master Data Akademik', description: 'Mengelola Mata Pelajaran, Dewan Guru, dan Kalender Akademik' },
      { code: 'kbm.reports', name: 'Laporan Matriks KBM', description: 'Melihat matriks kehadiran santri per JP dan persentase kehadiran' },
    ],
  },
  {
    id: 'ppdb_admissions',
    name: '🎓 Penerimaan Santri Baru (PSB)',
    icon: 'GraduationCap',
    permissions: [
      { code: 'psb.view', name: 'Lihat Data & Statistik PSB', description: 'Melihat dashboard PSB, daftar calon santri pendaftar, dan filter berkas' },
      { code: 'psb.manage', name: 'Kelola Pengaturan & Gelombang PSB', description: 'Mengatur gelombang pendaftaran, rincian biaya masuk, dan beasiswa' },
      { code: 'psb.verify', name: 'Verifikasi Berkas & Nilai Tes', description: 'Memvalidasi berkas, mengisi nilai tes Al-Qur\'an & akademik, serta menentukan kelulusan' },
      { code: 'psb.export', name: 'Export Data Calon Santri', description: 'Mengunduh rekapitulasi data pendaftar PSB ke format CSV/Excel' },
    ],
  },
  {
    id: 'system_security',
    name: '⚙️ Sistem, Role & Keamanan',
    icon: 'ShieldCheck',
    permissions: [
      { code: 'users.view', name: 'Lihat Role & Pengguna', description: 'Melihat daftar akun dan konfigurasi role pengguna' },
      { code: 'users.manage', name: 'Kelola Pengguna & Hak Akses', description: 'Menambah, mengedit, menghapus user dan mengatur izin' },
      { code: 'system.sync_center', name: 'Pusat Sinkronisasi Offline', description: 'Memantau antrean data lokal dan sinkronisasi server' },
      { code: 'system.security_audit', name: 'Audit Keamanan & Integritas', description: 'Melihat log anomali, tampering, dan audit keamanan database' },
      { code: 'system.settings', name: 'Pengaturan Sistem & Database', description: 'Mengatur preferensi lokal, backup, dan maintenance hub' },
    ],
  },
];

export interface RoleConfig {
  name: string;
  label: string;
  desc: string;
  badgeColor: string;
  defaultPermissions: string[];
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    name: 'super-admin',
    label: 'Super Admin',
    desc: 'Akses penuh tanpa batas ke seluruh modul, master data, pengaturan sistem, dan otorisasi keamanan tingkat tertinggi.',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    defaultPermissions: ['*'],
  },
  {
    name: 'admin',
    label: 'Administrator Pondok',
    desc: 'Pengelola operasional pondok, master data santri, SDM, kegiatan, terminal RFID, dan laporan presensi komprehensif.',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
    defaultPermissions: [
      'dashboard.view', 'dashboard.executive', 'reports.view', 'reports.export',
      'staff.reports', 'staff.view', 'staff.create', 'staff.edit', 'staff.deactivate', 'staff.attendance', 'trainer.attendance',
      'students.view', 'students.create', 'students.edit', 'students.deactivate', 'students.cards', 'attendance.excuses', 'qr-print.view',
      'attendance.view', 'attendance.scan', 'attendance.manual', 'attendance.monitoring', 'attendance.rfid', 'attendance.history',
      'devices.view', 'devices.manage',
      'ppdb.view', 'ppdb.manage', 'ppdb.verify', 'ppdb.export',
      'routine.view', 'prayer.monitoring', 'dormitory.monitoring', 'halaqah.view', 'duty_roster.view', 'routine_schedule.view',
      'events.view', 'events.manage', 'extracurriculars.view', 'classrooms.view', 'dormitories.view', 'activities.view',
      'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.master', 'kbm.reports',
      'users.view', 'users.manage', 'system.sync_center', 'system.security_audit', 'system.settings'
    ],
  },
  {
    name: 'pimpinan',
    label: 'Pimpinan Pondok',
    desc: 'Melihat dashboard eksekutif, monitoring kehadiran santri & SDM, serta laporan rekapitulasi strategis.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    defaultPermissions: [
      'dashboard.view', 'dashboard.executive', 'reports.view', 'reports.export',
      'staff.reports', 'kbm.reports', 'students.view', 'attendance.view', 'kbm.monitoring', 'dormitory.monitoring', 'system.settings'
    ],
  },
  {
    name: 'kepala-sekolah',
    label: 'Kepala Sekolah / Madrasah',
    desc: 'Mengawasi kegiatan belajar mengajar (KBM), jadwal pelajaran, master akademik, dan kehadiran dewan guru.',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    defaultPermissions: [
      'dashboard.view', 'dashboard.executive', 'students.view', 'students.create', 'students.edit',
      'staff.view', 'staff.attendance', 'staff.reports',
      'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.master', 'kbm.reports',
      'attendance.view', 'reports.view', 'reports.export', 'system.settings'
    ],
  },
  {
    name: 'kepala-asrama',
    label: 'Kepala Asrama (Kestren)',
    desc: 'Mengawasi ketertiban asrama, shalat fardhu 5 waktu, halaqah Al-Qur\'an, jadwal piket, dan perizinan santri.',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    defaultPermissions: [
      'dashboard.view', 'students.view', 'attendance.view', 'attendance.scan', 'attendance.manual', 'attendance.monitoring',
      'dormitory.monitoring', 'prayer.monitoring', 'halaqah.view', 'duty_roster.view', 'attendance.excuses',
      'dormitories.view', 'reports.view', 'system.settings'
    ],
  },
  {
    name: 'musyrif',
    label: 'Ustadz Musyrif Asrama',
    desc: 'Mencatat absensi ibadah shalat fardhu, apel asrama, halaqah tahfidz, dan memverifikasi izin santri binaan.',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    defaultPermissions: [
      'dashboard.view', 'students.view', 'attendance.view', 'attendance.scan', 'attendance.manual', 'attendance.monitoring',
      'dormitory.monitoring', 'prayer.monitoring', 'halaqah.view', 'duty_roster.view', 'attendance.excuses', 'system.settings'
    ],
  },
  {
    name: 'guru',
    label: 'Ustadz Guru / Pengajar KBM',
    desc: 'Mencatat presensi santri pada jam pelajaran kelas formal, jurnal mengajar, dan melihat jadwal pelajaran.',
    badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
    defaultPermissions: [
      'dashboard.view', 'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.reports',
      'students.view', 'attendance.view', 'staff.attendance', 'system.settings'
    ],
  },
  {
    name: 'pelatih',
    label: 'Pelatih Ekstrakurikuler',
    desc: 'Mencatat kehadiran latihan ekstrakurikuler minat bakat santri dan memantau anggota ekskul.',
    badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
    defaultPermissions: [
      'dashboard.view', 'trainer.attendance', 'students.view', 'extracurriculars.view', 'system.settings'
    ],
  },
  {
    name: 'petugas-masjid',
    label: 'Petugas Absensi / Masjid',
    desc: 'Membuka dan mengawasi sesi shalat fardhu berjamaah di masjid menggunakan scanner QR atau simulator RFID.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    defaultPermissions: [
      'dashboard.view', 'attendance.view', 'attendance.scan', 'attendance.manual', 'attendance.monitoring', 'attendance.rfid',
      'prayer.monitoring', 'students.view', 'system.settings'
    ],
  },
  {
    name: 'operator',
    label: 'Operator Data Sistem',
    desc: 'Entri data santri, pencetakan kartu santri, cetak massal QR code, dan operasional presensi harian.',
    badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
    defaultPermissions: [
      'dashboard.view', 'students.view', 'students.create', 'students.edit', 'students.cards',
      'attendance.view', 'attendance.scan', 'attendance.manual', 'attendance.monitoring', 'attendance.rfid',
      'qr-print.view', 'devices.view', 'system.settings'
    ],
  },
  {
    name: 'panitia-psb',
    label: 'Panitia PSB',
    desc: 'Panitia Penerimaan Santri Baru (PSB): verifikasi berkas formulir pendaftaran, penilaian tes Al-Qur\'an, kelulusan, dan rekap calon santri.',
    badgeColor: 'bg-lime-100 text-lime-950 border-lime-300',
    defaultPermissions: [
      'dashboard.view', 'students.view',
      'psb.view', 'psb.manage', 'psb.verify', 'psb.export',
      'ppdb.view', 'ppdb.manage', 'ppdb.verify', 'ppdb.export',
      'system.settings'
    ],
  },
  {
    name: 'panitia-ppdb',
    label: 'Panitia PSB (PPDB)',
    desc: 'Panitia Penerimaan Santri Baru (PSB): verifikasi berkas formulir pendaftaran, penilaian tes Al-Qur\'an, kelulusan, dan rekap calon santri.',
    badgeColor: 'bg-lime-100 text-lime-950 border-lime-300',
    defaultPermissions: [
      'dashboard.view', 'students.view',
      'psb.view', 'psb.manage', 'psb.verify', 'psb.export',
      'ppdb.view', 'ppdb.manage', 'ppdb.verify', 'ppdb.export',
      'system.settings'
    ],
  },
];

interface Props {
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onAddUser?: (newUser: User, plainPassword?: string) => void;
  onUpdateUser?: (userId: number, updatedUser: Partial<User>) => void;
  onDeleteUser?: (userId: number) => void;
  onUpdateRolePermissions?: (roleName: string, permissions: string[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccessControlView: React.FC<Props> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUpdateRolePermissions,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles' | 'matrix'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Custom role permissions mapping in local state
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    ROLE_CONFIGS.forEach((rc) => {
      map[rc.name] = (ROLE_PERMISSIONS as any)[rc.name] ? [...(ROLE_PERMISSIONS as any)[rc.name]] : [...rc.defaultPermissions];
    });
    return map;
  });

  // Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userPermissionModal, setUserPermissionModal] = useState<{
    user: User;
    permissions: string[];
  } | null>(null);

  const [rolePermissionModal, setRolePermissionModal] = useState<{
    role: RoleConfig;
    permissions: string[];
  } | null>(null);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Password Management States
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [passwordNewInput, setPasswordNewInput] = useState<string>('');
  const [showPasswordInModal, setShowPasswordInModal] = useState<boolean>(false);
  const [showPasswordInForm, setShowPasswordInForm] = useState<boolean>(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form states for Add/Edit User
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<string>('guru');
  const [formRoles, setFormRoles] = useState<string[]>(['guru']);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formCustomPermissions, setFormCustomPermissions] = useState<string[]>([]);
  const [useCustomPermsInAdd, setUseCustomPermsInAdd] = useState(false);

  // Super Admin Check (only Super Admin has authority to assign & modify user roles)
  const isCurrentUserSuperAdmin =
    currentUser.id === 1 ||
    currentUser.username === 'superadmin' ||
    currentUser.role === 'super-admin' ||
    currentUser.role === 'super_admin' ||
    (Array.isArray(currentUser.roles) && (currentUser.roles.includes('super-admin') || currentUser.roles.includes('super_admin'))) ||
    (Array.isArray(currentUser.permissions) && currentUser.permissions.includes('*'));

  const togglePasswordVisibilityInTable = (userId: number) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Santri';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    return pass;
  };

  const handleOpenPasswordModal = (user: User) => {
    setPasswordModalUser(user);
    setPasswordNewInput(user.password || 'password');
    setShowPasswordInModal(false);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (!passwordNewInput.trim()) {
      onShowToast('Password tidak boleh kosong.', 'error');
      return;
    }
    if (passwordNewInput.trim().length < 6) {
      onShowToast('Password minimal 6 karakter.', 'error');
      return;
    }

    if (onUpdateUser) {
      onUpdateUser(passwordModalUser.id, { password: passwordNewInput.trim() });
    }
    onShowToast(`✓ Password untuk pengguna "${passwordModalUser.name}" (@${passwordModalUser.username}) berhasil diperbarui!`, 'success');
    setPasswordModalUser(null);
  };

  const handleCopyCredentials = (user: User, passToCopy?: string) => {
    const pass = passToCopy || user.password || 'password';
    const assignedRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles.join(', ') : user.role;
    const text = `*Kredensial Login SIUBA Pesantren*\nNama: ${user.name}\nUsername: ${user.username}\nPassword: ${pass}\nRole: ${assignedRoles}\nLink: http://192.168.1.10:8000`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
    onShowToast(`✓ Kredensial akun @${user.username} disalin ke clipboard!`, 'success');
  };

  // Filtered Users List
  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    const userRoleList = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
    const rolesString = userRoleList.join(' ').toLowerCase();

    const matchesQuery = 
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      rolesString.includes(q);

    const matchesRole = filterRole === 'all' || userRoleList.includes(filterRole) || u.role === filterRole;
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && u.is_active) ||
      (filterStatus === 'inactive' && !u.is_active);

    return matchesQuery && matchesRole && matchesStatus;
  });

  // Get active permissions for a user (either specific user.permissions or role defaults)
  const getUserActivePermissions = (user: User): string[] => {
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const aggregated: string[] = [];
    userRoles.forEach((r) => {
      const perms = rolePermissionsMap[r] || (ROLE_PERMISSIONS as any)[r] || [];
      perms.forEach((p: string) => {
        if (!aggregated.includes(p)) aggregated.push(p);
      });
    });
    return aggregated.length > 0 ? aggregated : rolePermissionsMap[user.role] || (ROLE_PERMISSIONS as any)[user.role] || [];
  };

  // Check if a permission is active in a list
  const isPermChecked = (permList: string[], code: string): boolean => {
    if (permList.includes('*')) return true;
    if (permList.includes(code)) return true;
    const [domain] = code.split('.');
    if (domain && permList.includes(`${domain}.*`)) return true;
    return false;
  };

  // Handle Add User Submit
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUsername.trim()) {
      onShowToast('Nama lengkap dan username wajib diisi.', 'error');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (allUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
      onShowToast(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`, 'error');
      return;
    }

    const selectedRoles = formRoles.length > 0 ? formRoles : [formRole || 'guru'];
    const primaryRole = selectedRoles[0] || 'guru';

    // Combine permissions from all selected roles if custom perms not overridden
    const combinedRolePerms: string[] = [];
    selectedRoles.forEach((r) => {
      const perms = rolePermissionsMap[r] || (ROLE_PERMISSIONS as any)[r] || [];
      perms.forEach((p: string) => {
        if (!combinedRolePerms.includes(p)) combinedRolePerms.push(p);
      });
    });

    const assignedPermissions = useCustomPermsInAdd && formCustomPermissions.length > 0 
      ? formCustomPermissions 
      : combinedRolePerms;

    const plainPass = formPassword.trim() || 'password';
    const newUser: User = {
      id: Date.now(),
      name: formName.trim(),
      username: cleanUsername,
      email: formEmail.trim() || `${cleanUsername}@utsman.sch.id`,
      password: plainPass,
      role: primaryRole as UserRole,
      roles: selectedRoles,
      permissions: assignedPermissions,
      is_active: formIsActive,
      last_login_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    if (onAddUser) {
      onAddUser(newUser, plainPass);
    }
    setIsAddUserModalOpen(false);
    resetForm();
    onShowToast(`Pengguna "${newUser.name}" (@${newUser.username}) berhasil ditambahkan dengan ${selectedRoles.length} role.`, 'success');
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formName.trim() || !formUsername.trim()) {
      onShowToast('Nama dan username tidak boleh kosong.', 'error');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (allUsers.some((u) => u.id !== editingUser.id && u.username.toLowerCase() === cleanUsername)) {
      onShowToast(`Username "${cleanUsername}" sudah digunakan oleh pengguna lain.`, 'error');
      return;
    }

    const selectedRoles = isCurrentUserSuperAdmin
      ? (formRoles.length > 0 ? formRoles : [formRole || 'guru'])
      : (Array.isArray(editingUser.roles) && editingUser.roles.length > 0 ? editingUser.roles : [editingUser.role]);

    const primaryRole = selectedRoles[0] || 'guru';

    const updatedData: Partial<User> = {
      name: formName.trim(),
      username: cleanUsername,
      email: formEmail.trim() || `${cleanUsername}@utsman.sch.id`,
      role: primaryRole as UserRole,
      roles: selectedRoles,
      is_active: formIsActive,
    };

    if (formPassword.trim()) {
      updatedData.password = formPassword.trim();
    }

    if (onUpdateUser) {
      onUpdateUser(editingUser.id, updatedData);
    }
    setEditingUser(null);
    resetForm();
    onShowToast(`Data dan penugasan role pengguna "${updatedData.name}" berhasil diperbarui.`, 'success');
  };

  // Open Edit User Modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPassword(user.password || 'password');
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || 'guru'];
    setFormRoles(userRoles);
    setFormRole(userRoles[0] || 'guru');
    setFormIsActive(user.is_active);
    setShowPasswordInForm(false);
  };
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPassword(user.password || 'password');
    setFormRole(user.role);
    setFormIsActive(user.is_active);
    setShowPasswordInForm(false);
  };

  // Toggle user active status
  const handleToggleUserActive = (user: User) => {
    if (user.id === currentUser.id) {
      onShowToast('Anda tidak dapat menonaktifkan akun yang sedang digunakan saat ini.', 'error');
      return;
    }
    if (user.id === 1 && user.is_active) {
      onShowToast('Akun Super Admin Utama (ID: 1) tidak dapat dinonaktifkan.', 'error');
      return;
    }

    const newStatus = !user.is_active;
    if (onUpdateUser) {
      onUpdateUser(user.id, { is_active: newStatus });
    }
    onShowToast(`Akun "${user.name}" sekarang berstatus ${newStatus ? 'AKTIF' : 'NON-AKTIF'}.`, 'success');
  };

  // Delete User Confirmation
  const handleExecuteDeleteUser = () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.id === currentUser.id) {
      onShowToast('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.', 'error');
      setDeleteConfirmUser(null);
      return;
    }
    if (deleteConfirmUser.id === 1 || deleteConfirmUser.username === 'superadmin') {
      onShowToast('Akun Super Admin Master tidak dapat dihapus demi keamanan sistem.', 'error');
      setDeleteConfirmUser(null);
      return;
    }

    if (onDeleteUser) {
      onDeleteUser(deleteConfirmUser.id);
    }
    onShowToast(`Pengguna "${deleteConfirmUser.name}" (@${deleteConfirmUser.username}) berhasil dihapus.`, 'success');
    setDeleteConfirmUser(null);
  };

  // Save User Specific Permissions Modal
  const handleSaveUserPermissions = () => {
    if (!userPermissionModal) return;
    const targetUser = userPermissionModal.user;
    const updatedPerms = userPermissionModal.permissions;

    if (onUpdateUser) {
      onUpdateUser(targetUser.id, { permissions: updatedPerms });
    }
    onShowToast(`Hak akses khusus untuk "${targetUser.name}" berhasil disimpan (${updatedPerms.length} izin aktif).`, 'success');
    setUserPermissionModal(null);
  };

  // Save Role Permissions Modal
  const handleSaveRolePermissions = () => {
    if (!rolePermissionModal) return;
    if (!isCurrentUserSuperAdmin) {
      onShowToast('Hanya Super Admin yang berhak mengubah konfigurasi hak akses role.', 'error');
      return;
    }
    const roleName = rolePermissionModal.role.name;
    const updatedPerms = rolePermissionModal.permissions;

    setRolePermissionsMap((prev) => ({
      ...prev,
      [roleName]: updatedPerms,
    }));

    if (onUpdateRolePermissions) {
      onUpdateRolePermissions(roleName, updatedPerms);
    }

    // Also update all users with this role if they don't have custom override
    allUsers.filter((u) => u.role === roleName && (!u.permissions || u.permissions.length === 0)).forEach((u) => {
      if (onUpdateUser) {
        onUpdateUser(u.id, { permissions: updatedPerms });
      }
    });

    onShowToast(`Hak akses standar untuk role "${rolePermissionModal.role.label}" berhasil diperbarui.`, 'success');
    setRolePermissionModal(null);
  };

  // Toggle single permission for matrix directly
  const handleToggleMatrixPermission = (roleName: string, permCode: string) => {
    if (!isCurrentUserSuperAdmin) {
      onShowToast('Hanya Super Admin yang berhak mengubah matriks hak akses.', 'error');
      return;
    }
    const currentList = rolePermissionsMap[roleName] || (ROLE_PERMISSIONS as any)[roleName] || [];
    let newList: string[];

    if (currentList.includes('*')) {
      // If was wildcard *, unpack to all except this one
      const allCodes = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code));
      newList = allCodes.filter((c) => c !== permCode);
    } else if (currentList.includes(permCode)) {
      newList = currentList.filter((c) => c !== permCode);
    } else {
      newList = [...currentList, permCode];
    }

    setRolePermissionsMap((prev) => ({
      ...prev,
      [roleName]: newList,
    }));

    if (onUpdateRolePermissions) {
      onUpdateRolePermissions(roleName, newList);
    }

    onShowToast(`Izin "${permCode}" untuk role "${roleName}" berhasil diperbarui.`, 'info');
  };

  const resetForm = () => {
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('guru');
    setFormRoles(['guru']);
    setFormIsActive(true);
    setFormCustomPermissions([]);
    setUseCustomPermsInAdd(false);
  };

  // Quick select/deselect helpers for permission modal
  const toggleModalPermission = (code: string, currentList: string[], setList: (val: string[]) => void) => {
    if (code === '*') {
      if (currentList.includes('*')) {
        setList([]);
      } else {
        setList(['*']);
      }
      return;
    }

    if (currentList.includes('*')) {
      // Unpack wildcard
      const allCodes = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code));
      setList(allCodes.filter((c) => c !== code));
      return;
    }

    if (currentList.includes(code)) {
      setList(currentList.filter((c) => c !== code));
    } else {
      setList([...currentList, code]);
    }
  };

  const selectAllInGroup = (group: PermissionGroup, currentList: string[], setList: (val: string[]) => void) => {
    const groupCodes = group.permissions.map((p) => p.code);
    const existingWithoutGroup = currentList.filter((c) => c !== '*' && !groupCodes.includes(c));
    setList([...existingWithoutGroup, ...groupCodes]);
  };

  const clearAllInGroup = (group: PermissionGroup, currentList: string[], setList: (val: string[]) => void) => {
    const groupCodes = group.permissions.map((p) => p.code);
    if (currentList.includes('*')) {
      const allCodes = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code));
      setList(allCodes.filter((c) => !groupCodes.includes(c)));
      return;
    }
    setList(currentList.filter((c) => !groupCodes.includes(c)));
  };

  return (
    <div id="access-control-view" className="space-y-6 pb-12">
      {/* Header Bento Card Emerald SIUBA */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
              Role-Based Access Control (RBAC)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Manajemen Pengguna, Role & Hak Akses
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Kontrol granular apa saja yang dapat dilihat & diakses pengguna, kelola akun login (tambah, ubah, hapus), dan konfigurasi matriks otorisasi Spatie Laravel-Permission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 self-start lg:self-auto">
          <button
            onClick={() => {
              resetForm();
              setIsAddUserModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs rounded-2xl shadow-xs transition-all cursor-pointer min-h-[36px] active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#1F5C45]" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Pill */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'users'
              ? 'bg-[#1F5C45] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pengguna & Akun ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'roles'
              ? 'bg-[#1F5C45] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role & Kontrol Akses ({ROLE_CONFIGS.length} Role)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'matrix'
              ? 'bg-[#1F5C45] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Matriks Hak Akses Granular</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR PENGGUNA & AKUN                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* 4 Bento KPI Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Pengguna</div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {allUsers.length} <span className="text-xs font-semibold text-slate-400">akun</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Akun Aktif</div>
                <div className="text-2xl font-black text-sky-800 font-mono">
                  {allUsers.filter((u) => u.is_active).length} <span className="text-xs font-semibold text-slate-400">user</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Role Otorisasi</div>
                <div className="text-2xl font-black text-indigo-800 font-mono">
                  {new Set(allUsers.map((u) => u.role)).size} <span className="text-xs font-semibold text-slate-400">jenis</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Akun Saat Ini</div>
                <div className="text-xs font-black text-slate-900 truncate max-w-[130px]">
                  {currentUser.name}
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200 uppercase">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari pengguna berdasarkan nama, username @..., email, atau role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-50 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Role</option>
                {ROLE_CONFIGS.map((rc) => (
                  <option key={rc.name} value={rc.name}>
                    {rc.label}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Non-Aktif</option>
              </select>
            </div>
          </div>

          {/* Users Table List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center w-12">No</th>
                    <th className="p-4">Pengguna & Akun</th>
                    <th className="p-4">Role & Otorisasi</th>
                    <th className="p-4">Password & Kredensial</th>
                    <th className="p-4">Hak Akses (Permissions)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4">Terakhir Login</th>
                    <th className="p-4 text-right">Aksi & Kontrol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada pengguna yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const isCurrent = currentUser.id === user.id;
                      const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
                      const roleConfig = ROLE_CONFIGS.find((rc) => rc.name === user.role) || {
                        name: user.role,
                        label: user.role,
                        badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
                      };
                      const userPerms = getUserActivePermissions(user);
                      const isFullAccess = userPerms.includes('*');
                      const isPasswordRevealed = !!revealedPasswords[user.id];
                      const userPassword = user.password || 'password';

                      return (
                        <tr key={user.id} className={`hover:bg-slate-50/80 transition ${isCurrent ? 'bg-emerald-50/40' : ''}`}>
                          <td className="p-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1F5C45] to-[#12382A] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-black text-slate-900 flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-black uppercase bg-[#1F5C45] text-white px-1.5 py-0.2 rounded-md shadow-2xs">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                  <span className="text-emerald-800 font-semibold">@{user.username}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {userRoles.map((rName) => {
                                const rc = ROLE_CONFIGS.find((c) => c.name === rName) || {
                                  name: rName,
                                  label: rName,
                                  badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
                                };
                                return (
                                  <span
                                    key={rName}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs ${rc.badgeColor}`}
                                  >
                                    {(rName === 'panitia-psb' || rName === 'panitia-ppdb') && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-lime-600 animate-pulse"></span>
                                    )}
                                    <span>{rc.label}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Password & Credentials Column */}
                          <td className="p-4">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-xl border border-slate-200 transition">
                              <div className="font-mono text-[11px] font-bold text-slate-800 px-1.5 flex items-center gap-1.5 select-all">
                                <Key className="w-3 h-3 text-[#1F5C45]" />
                                <span>{isPasswordRevealed ? userPassword : '••••••••'}</span>
                              </div>
                              
                              {/* Toggle Peek Password */}
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibilityInTable(user.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white cursor-pointer transition"
                                title={isPasswordRevealed ? 'Sembunyikan password' : 'Lihat password pengguna ini'}
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>

                              {/* Copy Credentials */}
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(user)}
                                className="p-1 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-white cursor-pointer transition"
                                title="Salin format login (Nama, Username, Password, URL)"
                              >
                                {copiedId === user.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {/* Quick Edit Password Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenPasswordModal(user)}
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg font-black text-[9px] uppercase cursor-pointer transition"
                                title="Ubah password pengguna ini"
                              >
                                Ubah
                              </button>
                            </div>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => setUserPermissionModal({ user, permissions: [...userPerms] })}
                              className="text-left group cursor-pointer"
                              title="Klik untuk mengatur hak akses akun ini"
                            >
                              {isFullAccess ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                                  <Sparkles className="w-3 h-3 text-[#C9A227]" />
                                  Akses Penuh (*)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-900 border border-slate-200 group-hover:border-emerald-300 text-[10px] font-bold transition">
                                  <Key className="w-3 h-3 text-[#1F5C45]" />
                                  {userPerms.length} Permissions Aktif
                                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleUserActive(user)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                user.is_active
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={user.is_active ? 'Klik untuk non-aktifkan akun' : 'Klik untuk aktifkan akun'}
                            >
                              {user.is_active ? '● Aktif' : '○ Non-Aktif'}
                            </button>
                          </td>

                          <td className="p-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {user.last_login_at || '-'}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Switch / Test Login */}
                              <button
                                onClick={() => {
                                  onSelectUser(user);
                                  onShowToast(`Beralih ke akun "${user.name}" (@${user.username}).`, 'success');
                                }}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-[#1F5C45] text-white shadow-2xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                                }`}
                                title="Login & Gunakan Akun Ini"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isCurrent ? 'Aktif' : 'Login'}</span>
                              </button>

                              {/* Edit Password Button */}
                              <button
                                onClick={() => handleOpenPasswordModal(user)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 cursor-pointer transition"
                                title="Lihat & Ubah Password Pengguna"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              {/* Customize Permissions */}
                              <button
                                onClick={() => setUserPermissionModal({ user, permissions: [...userPerms] })}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer transition"
                                title="Atur Hak Akses Pengguna"
                              >
                                <Settings2 className="w-4 h-4" />
                              </button>

                              {/* Edit User */}
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl border border-sky-200 cursor-pointer transition"
                                title="Edit Data Pengguna"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete User */}
                              <button
                                onClick={() => setDeleteConfirmUser(user)}
                                disabled={isCurrent || user.id === 1}
                                className={`p-1.5 rounded-xl border transition ${
                                  isCurrent || user.id === 1
                                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                                }`}
                                title={isCurrent ? 'Tidak bisa menghapus akun yang sedang aktif' : user.id === 1 ? 'Super Admin Master terlindungi' : 'Hapus Pengguna'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLE & KONTROL AKSES (ROLE CARDS)                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black">Kontrol Otorisasi Berbasis Peran (Role-Based Access Control)</strong>
              <span>
                Setiap role memiliki daftar hak akses standar. Anda dapat mengklik tombol <strong>"Kustomisasi Hak Akses Role"</strong> untuk mengatur menu dan fitur apa saja yang diizinkan untuk seluruh pengguna dengan role tersebut.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ROLE_CONFIGS.map((role) => {
              const assignedUsers = allUsers.filter((u) => u.role === role.name || (Array.isArray(u.roles) && u.roles.includes(role.name)));
              const activePerms = rolePermissionsMap[role.name] || role.defaultPermissions;
              const isFullAccess = activePerms.includes('*');

              return (
                <div
                  key={role.name}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-black border uppercase tracking-wider ${role.badgeColor}`}>
                            {role.label}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                            guard: web
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 mt-2">{role.label}</h3>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          {assignedUsers.length} Pengguna
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mt-2">{role.desc}</p>

                    {/* Permissions list preview */}
                    <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Hak Akses Diizinkan ({isFullAccess ? 'Semua (*)' : activePerms.length}):
                        </span>
                        <button
                          onClick={() => setRolePermissionModal({ role, permissions: [...activePerms] })}
                          className="text-[10px] font-black text-[#1F5C45] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Ubah Akses
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {isFullAccess ? (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] font-black">
                            * (Super Admin Full Access)
                          </span>
                        ) : activePerms.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Belum ada izin yang diaktifkan.</span>
                        ) : (
                          activePerms.slice(0, 12).map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold"
                            >
                              {p}
                            </span>
                          ))
                        )}
                        {!isFullAccess && activePerms.length > 12 && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                            +{activePerms.length - 12} lainnya
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setRolePermissionModal({ role, permissions: [...activePerms] })}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-[#1F5C45]" />
                      <span>Kustomisasi Hak Akses</span>
                    </button>

                    {assignedUsers.length > 0 && (
                      <button
                        onClick={() => {
                          const firstUser = assignedUsers[0];
                          onSelectUser(firstUser);
                          onShowToast(`Beralih login ke akun role ${role.label} (${firstUser.name}).`, 'success');
                        }}
                        className="px-3.5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Coba Role Ini</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MATRIKS HAK AKSES GRANULAR (INTERACTIVE MATRIX)                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#1F5C45]" />
                Matriks Hak Akses Granular Per Modul
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik langsung pada kotak centang untuk memberikan atau mencabut akses modul/fitur untuk setiap role.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                ⚡ Perubahan tersimpan otomatis
              </span>
            </div>
          </div>

          <div className="space-y-8">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span>{group.name}</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5 min-w-[260px]">Fitur & Hak Akses</th>
                        {ROLE_CONFIGS.map((rc) => (
                          <th key={rc.name} className="p-3.5 text-center min-w-[90px]">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${rc.badgeColor}`}>
                              {rc.label.split(' ')[0]}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.permissions.map((perm) => (
                        <tr key={perm.code} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{perm.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{perm.description}</div>
                            <code className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-1 inline-block">
                              {perm.code}
                            </code>
                          </td>

                          {ROLE_CONFIGS.map((rc) => {
                            const activePerms = rolePermissionsMap[rc.name] || rc.defaultPermissions;
                            const isChecked = isPermChecked(activePerms, perm.code);
                            const isSuper = rc.name === 'super-admin' || rc.name === 'super_admin';

                            return (
                              <td key={rc.name} className="p-3.5 text-center">
                                <button
                                  disabled={isSuper}
                                  onClick={() => handleToggleMatrixPermission(rc.name, perm.code)}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition cursor-pointer ${
                                    isSuper
                                      ? 'bg-emerald-600 text-white cursor-not-allowed opacity-90'
                                      : isChecked
                                      ? 'bg-[#1F5C45] text-white shadow-2xs hover:bg-[#12372A]'
                                      : 'bg-slate-100 text-slate-300 border border-slate-300 hover:bg-slate-200 hover:text-slate-500'
                                  }`}
                                  title={isSuper ? 'Super admin selalu memiliki akses penuh' : isChecked ? 'Klik untuk cabut akses' : 'Klik untuk izinkan akses'}
                                >
                                  {isChecked ? <Check className="w-4 h-4" /> : null}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Tambah Pengguna Baru                                               */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1F5C45]" />
                Tambah Pengguna Baru
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ustadz Muhammad Ziyad, Lc., M.H."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ustadz.ziyad"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                  className="w-full bg-slate-50 text-slate-900 font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Multi-Role Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Role &amp; Penugasan Pengguna * {formRoles.length > 1 && <span className="text-emerald-700 text-xs font-semibold">({formRoles.length} role dipilih)</span>}
                  </label>
                  {!isCurrentUserSuperAdmin ? (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                      🔒 Hanya Super Admin yang berhak mengatur role
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Multi-Role Didukung
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-52 overflow-y-auto">
                  {ROLE_CONFIGS.map((rc) => {
                    const isChecked = formRoles.includes(rc.name);
                    return (
                      <label
                        key={rc.name}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                        } ${!isCurrentUserSuperAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isCurrentUserSuperAdmin}
                          checked={isChecked}
                          onChange={(e) => {
                            if (!isCurrentUserSuperAdmin) return;
                            if (e.target.checked) {
                              const next = [...formRoles, rc.name];
                              setFormRoles(next);
                              setFormRole(next[0] || rc.name);
                            } else {
                              if (formRoles.length === 1) {
                                onShowToast('Pengguna harus memiliki minimal 1 role.', 'error');
                                return;
                              }
                              const next = formRoles.filter((r) => r !== rc.name);
                              setFormRoles(next);
                              setFormRole(next[0] || 'guru');
                            }
                          }}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{rc.label}</span>
                            {(rc.name === 'panitia-psb' || rc.name === 'panitia-ppdb') && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-lime-400/40 text-lime-900 font-extrabold border border-lime-500/30">PSB</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-normal">{rc.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 <em>1 pengguna dapat memegang beberapa role sekaligus (misal: Dewan Guru + Panitia PSB). Hak akses dari seluruh role yang dipilih akan otomatis digabungkan.</em>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Pondok</label>
                  <input
                    type="email"
                    placeholder="ziyad@utsman.sch.id"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">Password Default *</label>
                    <button
                      type="button"
                      onClick={() => setFormPassword(handleGenerateRandomPassword())}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3" />
                      Acak
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordInForm ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 font-mono font-bold pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={showPasswordInForm ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPasswordInForm ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-user-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="chk-user-active" className="text-slate-700 font-bold cursor-pointer">
                  Akun langsung aktif dan dapat digunakan login
                </label>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900">
                <span>
                  Hak akses pengguna baru akan otomatis mengikuti standar role <strong>{ROLE_CONFIGS.find((r) => r.name === formRole)?.label}</strong>. Anda dapat mengkustomisasi hak akses spesifik setelah akun dibuat.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  Simpan & Daftarkan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Edit Pengguna                                                      */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#1F5C45]" />
                Edit Data Pengguna
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                  className="w-full bg-slate-50 text-slate-900 font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Multi-Role Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Role &amp; Penugasan Pengguna * {formRoles.length > 1 && <span className="text-emerald-700 text-xs font-semibold">({formRoles.length} role aktif)</span>}
                  </label>
                  {!isCurrentUserSuperAdmin ? (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                      🔒 Hanya Super Admin yang berhak mengubah role
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Multi-Role Didukung
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-52 overflow-y-auto">
                  {ROLE_CONFIGS.map((rc) => {
                    const isChecked = formRoles.includes(rc.name);
                    return (
                      <label
                        key={rc.name}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                        } ${!isCurrentUserSuperAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isCurrentUserSuperAdmin}
                          checked={isChecked}
                          onChange={(e) => {
                            if (!isCurrentUserSuperAdmin) return;
                            if (e.target.checked) {
                              const next = [...formRoles, rc.name];
                              setFormRoles(next);
                              setFormRole(next[0] || rc.name);
                            } else {
                              if (formRoles.length === 1) {
                                onShowToast('Pengguna harus memiliki minimal 1 role.', 'error');
                                return;
                              }
                              const next = formRoles.filter((r) => r !== rc.name);
                              setFormRoles(next);
                              setFormRole(next[0] || 'guru');
                            }
                          }}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{rc.label}</span>
                            {(rc.name === 'panitia-psb' || rc.name === 'panitia-ppdb') && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-lime-400/40 text-lime-900 font-extrabold border border-lime-500/30">PSB</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-normal">{rc.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {!isCurrentUserSuperAdmin && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                    ⚠️ Anda tidak memiliki otoritas Super Admin untuk memodifikasi role. Penugasan role di atas bersifat hanya-lihat (read-only).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Pengguna</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">Password Login</label>
                    <button
                      type="button"
                      onClick={() => setFormPassword(handleGenerateRandomPassword())}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3" />
                      Acak
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordInForm ? 'text' : 'password'}
                      placeholder="Ubah password..."
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 font-mono font-bold pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={showPasswordInForm ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPasswordInForm ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-edit-user-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="chk-edit-user-active" className="text-slate-700 font-bold cursor-pointer">
                  Status Akun Aktif
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Kelola Password & Kredensial Pengguna                               */}
      {/* ========================================================================= */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#1F5C45]" />
                Kelola Password & Kredensial
              </h3>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1F5C45] to-[#12382A] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                {passwordModalUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-slate-900 text-sm truncate">{passwordModalUser.name}</h4>
                <div className="text-[11px] text-slate-600 font-mono flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-800 font-bold">@{passwordModalUser.username}</span>
                  <span className="text-slate-300">•</span>
                  <span className="uppercase text-[10px] font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                    {passwordModalUser.role}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Password Akun (Lihat / Ubah Baru) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordNewInput(handleGenerateRandomPassword())}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                    >
                      <Shuffle className="w-3 h-3 text-[#1F5C45]" />
                      Acak Password Aman
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showPasswordInModal ? 'text' : 'password'}
                    required
                    value={passwordNewInput}
                    onChange={(e) => setPasswordNewInput(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 font-mono font-bold pl-4 pr-11 py-3 text-sm rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Masukkan password baru..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    title={showPasswordInModal ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPasswordInModal ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Password minimal 6 karakter. Anda dapat mengintip dan menyalinnya langsung.
                </span>
              </div>

              {/* Quick Action Share Credentials */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Format Kredensial Resmi:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(passwordModalUser, passwordNewInput)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px] flex items-center gap-1.5 shadow-2xs"
                  >
                    {copiedId === passwordModalUser.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#1F5C45]" />
                        <span>Salin Format Kredensial</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
                  {`Nama: ${passwordModalUser.name}\nUsername: ${passwordModalUser.username}\nPassword: ${passwordNewInput || passwordModalUser.password || 'password'}\nRole: ${passwordModalUser.role}\nLink SIUBA: http://192.168.1.10:8000`}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  Simpan Password Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Kustomisasi Hak Akses Spesifik Pengguna                             */}
      {/* ========================================================================= */}
      {userPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#1F5C45]" />
                  Atur Hak Akses Pengguna
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengguna: <strong className="text-slate-900">{userPermissionModal.user.name}</strong> (@{userPermissionModal.user.username}) &bull; Role: <span className="font-bold uppercase text-emerald-800">{userPermissionModal.user.role}</span>
                </p>
              </div>
              <button
                onClick={() => setUserPermissionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">
                {userPermissionModal.permissions.includes('*') 
                  ? '⭐ Akses Penuh Super Admin (*)' 
                  : `${userPermissionModal.permissions.length} Izin Dipilih`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allCodes = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code));
                    setUserPermissionModal({ ...userPermissionModal, permissions: allCodes });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px]"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setUserPermissionModal({ ...userPermissionModal, permissions: [] })}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px]"
                >
                  Kosongkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const defaultPerms = rolePermissionsMap[userPermissionModal.user.role] || (ROLE_PERMISSIONS as any)[userPermissionModal.user.role] || [];
                    setUserPermissionModal({ ...userPermissionModal, permissions: [...defaultPerms] });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px]"
                >
                  Reset Default Role
                </button>
              </div>
            </div>

            {/* Permission list accordion / checklist */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const groupCodes = group.permissions.map((p) => p.code);
                const allSelected = groupCodes.every((c) => isPermChecked(userPermissionModal.permissions, c));

                return (
                  <div key={group.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-black text-xs text-slate-900">{group.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              clearAllInGroup(group, userPermissionModal.permissions, (p) =>
                                setUserPermissionModal({ ...userPermissionModal, permissions: p })
                              );
                            } else {
                              selectAllInGroup(group, userPermissionModal.permissions, (p) =>
                                setUserPermissionModal({ ...userPermissionModal, permissions: p })
                              );
                            }
                          }}
                          className="text-[10px] font-bold text-[#1F5C45] hover:underline cursor-pointer"
                        >
                          {allSelected ? 'Hapus Modul Ini' : 'Pilih Modul Ini'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.permissions.map((perm) => {
                        const checked = isPermChecked(userPermissionModal.permissions, perm.code);
                        return (
                          <label
                            key={perm.code}
                            className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                              checked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleModalPermission(perm.code, userPermissionModal.permissions, (p) =>
                                  setUserPermissionModal({ ...userPermissionModal, permissions: p })
                                )
                              }
                              className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer shrink-0"
                            />
                            <div className="text-[11px] leading-tight">
                              <div>{perm.name}</div>
                              <code className="text-[9px] font-mono text-slate-400 font-normal block mt-0.5">
                                {perm.code}
                              </code>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserPermissionModal(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUserPermissions}
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Simpan Hak Akses Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Kustomisasi Hak Akses Role                                         */}
      {/* ========================================================================= */}
      {rolePermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1F5C45]" />
                  Kustomisasi Hak Akses Role
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Role: <strong className="text-slate-900">{rolePermissionModal.role.label}</strong> ({rolePermissionModal.role.name})
                </p>
              </div>
              <button
                onClick={() => setRolePermissionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">
                {rolePermissionModal.permissions.includes('*') 
                  ? '⭐ Akses Penuh (*)' 
                  : `${rolePermissionModal.permissions.length} Izin Aktif`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allCodes = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code));
                    setRolePermissionModal({ ...rolePermissionModal, permissions: allCodes });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px]"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setRolePermissionModal({ ...rolePermissionModal, permissions: [] })}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px]"
                >
                  Kosongkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRolePermissionModal({ ...rolePermissionModal, permissions: [...rolePermissionModal.role.defaultPermissions] });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 cursor-pointer text-[11px]"
                >
                  Reset Default
                </button>
              </div>
            </div>

            {/* Permissions list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const groupCodes = group.permissions.map((p) => p.code);
                const allSelected = groupCodes.every((c) => isPermChecked(rolePermissionModal.permissions, c));

                return (
                  <div key={group.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-black text-xs text-slate-900">{group.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (allSelected) {
                            clearAllInGroup(group, rolePermissionModal.permissions, (p) =>
                              setRolePermissionModal({ ...rolePermissionModal, permissions: p })
                            );
                          } else {
                            selectAllInGroup(group, rolePermissionModal.permissions, (p) =>
                              setRolePermissionModal({ ...rolePermissionModal, permissions: p })
                            );
                          }
                        }}
                        className="text-[10px] font-bold text-[#1F5C45] hover:underline cursor-pointer"
                      >
                        {allSelected ? 'Hapus Modul Ini' : 'Pilih Modul Ini'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.permissions.map((perm) => {
                        const checked = isPermChecked(rolePermissionModal.permissions, perm.code);
                        return (
                          <label
                            key={perm.code}
                            className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                              checked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleModalPermission(perm.code, rolePermissionModal.permissions, (p) =>
                                  setRolePermissionModal({ ...rolePermissionModal, permissions: p })
                                )
                              }
                              className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer shrink-0"
                            />
                            <div className="text-[11px] leading-tight">
                              <div>{perm.name}</div>
                              <code className="text-[9px] font-mono text-slate-400 font-normal block mt-0.5">
                                {perm.code}
                              </code>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRolePermissionModal(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Terapkan Hak Akses Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Hapus Pengguna                                          */}
      {/* ========================================================================= */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Konfirmasi Hapus Pengguna</h3>
                <p className="text-xs text-slate-500 font-mono">@{deleteConfirmUser.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun pengguna <strong className="text-slate-900">{deleteConfirmUser.name}</strong>? Pengguna ini tidak akan bisa login lagi ke sistem SIUBA.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


