import React from 'react';
import { 
  Users, 
  Briefcase, 
  BookOpen, 
  Award, 
  CalendarDays, 
  Radio, 
  FileText, 
  ChevronRight, 
  Sparkles,
  Download,
  Printer,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { User } from '../../../types';
import { hasPermission } from '../../../config/navigationRegistry';

interface Props {
  currentUser: User;
  onSelectCategory: (cat: string) => void;
}

export const ReportHubPage: React.FC<Props> = ({ currentUser, onSelectCategory }) => {
  const allReportGroups = [
    {
      id: 'student',
      title: 'A. Absensi Santri',
      badge: 'Santri Domain',
      badgeColor: 'emerald',
      icon: Users,
      permissionCheck: () =>
        hasPermission(currentUser.role, 'reports.view', currentUser.permissions) ||
        hasPermission(currentUser.role, 'attendance.view', currentUser.permissions) ||
        hasPermission(currentUser.role, 'students.view', currentUser.permissions),
      description: 'Laporan harian sasaran presensi santri, rekap per santri, dan rekap per kelas berdasarkan sesi terjadwal.',
      reports: [
        'Log Presensi Harian Santri',
        'Rekap Kehadiran per Santri',
        'Rekap Kehadiran per Rombel / Kelas',
      ],
    },
    {
      id: 'sdm_daily',
      title: 'B. Kehadiran SDM Harian',
      badge: 'SDM Harian',
      badgeColor: 'blue',
      icon: Briefcase,
      permissionCheck: () =>
        hasPermission(currentUser.role, 'staff.view', currentUser.permissions) ||
        hasPermission(currentUser.role, 'staff_attendance.view', currentUser.permissions) ||
        currentUser.role === 'super_admin' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'hr' ||
        currentUser.role === 'pimpinan',
      description: 'Presensi gerbang guru, musyrif, staf administrasi, manajemen, log keterlambatan, dan pulang awal.',
      reports: [
        'Log Presensi Harian SDM',
        'Rekap Bulanan Kehadiran Pegawai',
        'Monitoring Keterlambatan & Pulang Cepat',
      ],
    },
    {
      id: 'teaching',
      title: 'C. Mengajar Guru (KBM)',
      badge: 'KBM Guru',
      badgeColor: 'amber',
      icon: BookOpen,
      permissionCheck: () =>
        hasPermission(currentUser.role, 'academic.view', currentUser.permissions) ||
        currentUser.role === 'teacher' ||
        currentUser.role === 'super_admin' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'pimpinan',
      description: 'Realisasi pelaksanaan jam mengajar kelas, presensi guru aktual, substitusi guru inval, dan status jam pelajaran.',
      reports: [
        'Log Jam Mengajar KBM Harian',
        'Rekap Bulanan Jam Guru',
        'Laporan Guru Pengganti (Inval)',
      ],
    },
    {
      id: 'training',
      title: 'D. Pelatih / Pembina Ekskul',
      badge: 'Ekskul Pelatih',
      badgeColor: 'teal',
      icon: Award,
      permissionCheck: () =>
        hasPermission(currentUser.role, 'extracurricular.view', currentUser.permissions) ||
        currentUser.role === 'trainer' ||
        currentUser.role === 'super_admin' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'pimpinan',
      description: 'Realisasi latihan ekstrakurikuler, presensi pelatih & pembina, substitusi pelatih, serta verifikasi jurnal materi.',
      reports: [
        'Log Realisasi Sesi Latihan Ekskul',
        'Rekap Bulanan Kehadiran Pelatih',
        'Laporan Jurnal Materi & Evaluasi',
      ],
    },
    {
      id: 'absence',
      title: 'E. Izin / Sakit / Cuti / Dinas',
      badge: 'Manajemen Izin',
      badgeColor: 'purple',
      icon: CalendarDays,
      permissionCheck: () =>
        hasPermission(currentUser.role, 'excusals.view', currentUser.permissions) ||
        hasPermission(currentUser.role, 'reports.view', currentUser.permissions),
      description: 'Pengajuan dispensasi, surat keterangan sakit, cuti tahunan, dan penugasan dinas luar staf & santri.',
      reports: [
        'Daftar Pengajuan Izin & Sakit',
        'Rekap Cuti & Surat Tugas Dinas',
        'Status Verifikasi & Approval',
      ],
    },
    {
      id: 'device',
      title: 'F. Perangkat & Operasional',
      badge: 'Infrastruktur',
      badgeColor: 'rose',
      icon: Radio,
      permissionCheck: () =>
        hasPermission(currentUser.role, 'devices.view', currentUser.permissions) ||
        currentUser.role === 'super_admin' ||
        currentUser.role === 'admin',
      description: 'Log pemindaian RFID/QR, status perangkat presensi gerbang/kelas, dan anomali jaringan mesin tap.',
      reports: [
        'Status Mesin Tap & Scanner QR',
        'Log Transaksi Tap RFID Raw',
        'Deteksi Anomali & Duplikasi Tap',
      ],
    },
  ];

  const reportGroups = allReportGroups.filter((g) => g.permissionCheck());

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="report-hub-page">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#164735] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none">
          <FileText className="w-48 h-48" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 backdrop-blur-xs">
              Pusat Laporan SIUBA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Laporan Terpadu Pesantren
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            Akses komprehensif ke seluruh data presensi santri, kehadiran harian SDM, jam mengajar KBM, latihan ekstrakurikuler, dan perizinan dengan pemisahan metrik yang akurat serta ekspor resmi.
          </p>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div
              key={group.id}
              onClick={() => onSelectCategory(group.id)}
              className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:border-[#1F5C45]/60 dark:hover:border-[#2F7D5A]/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              id={`report-group-card-${group.id}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:bg-[#1F5C45] group-hover:text-white group-hover:border-[#1F5C45] transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-[#1F5C45] dark:group-hover:text-[#2F7D5A] flex items-center gap-1 transition-colors">
                    Buka Laporan <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#1F5C45] dark:group-hover:text-[#2F7D5A] transition-colors">
                    {group.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {group.description}
                  </p>
                </div>

                {/* Sub-report bullets */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  {group.reports.map((rep, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1F5C45] dark:bg-[#2F7D5A] flex-shrink-0" />
                      <span className="truncate">{rep}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {group.badge}
                </span>
                <span className="text-xs font-black text-[#1F5C45] dark:text-[#2F7D5A] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Akses Data &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
