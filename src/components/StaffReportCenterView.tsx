import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  Users, 
  Search, 
  BookOpen, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  CalendarDays, 
  UserCheck,
  Building2,
  Briefcase,
  X,
  Sparkles
} from 'lucide-react';
import { 
  StaffAnalyticsFilters, 
  StaffType, 
  StaffAttendanceStatus, 
  StaffAttendanceMethod, 
  User, 
  Staff,
  Staff360ProfileData
} from '../types';
import { StaffIdentityResolver } from '../services/staffIdentityResolver';
import { StaffReportQueryService } from '../services/staffReportQueryService';
import { TeachingSessionService } from '../services/teachingSessionService';
import { TrainingSessionService } from '../services/trainingSessionService';

interface StaffReportCenterViewProps {
  currentUser: User;
  onNavigateTab?: (tabId: string, params?: any) => void;
}

type MainCategory = 'daily' | 'teaching' | 'training' | 'absence' | 'profile360';

export const StaffReportCenterView: React.FC<StaffReportCenterViewProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  // Current date & month defaults
  const todayStr = new Date().toISOString().substring(0, 10);
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [activeCategory, setActiveCategory] = useState<MainCategory>('daily');
  const [subReport, setSubReport] = useState<string>('daily_list');

  // Filter state
  const [filters, setFilters] = useState<StaffAnalyticsFilters>({
    date_from: firstDayOfMonth,
    date_to: todayStr,
    staff_id: 'ALL',
    staff_type: 'ALL',
    employment_status: 'ALL',
    attendance_status: 'ALL',
    attendance_method: 'ALL',
    classroom_id: 'ALL',
    subject_id: 'ALL',
    extracurricular_id: 'ALL',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff360Id, setSelectedStaff360Id] = useState<number | null>(null);

  // Master lists for filter dropdowns
  const staffList = useMemo(() => StaffIdentityResolver.getStaffList().filter(s => s.is_active), []);
  const classrooms = useMemo(() => {
    try {
      const stored = localStorage.getItem('siuba_academic_classes');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }, []);
  const subjects = useMemo(() => {
    try {
      const stored = localStorage.getItem('siuba_academic_subjects');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }, []);
  const extracurriculars = useMemo(() => {
    try {
      const stored = localStorage.getItem('siuba_extracurriculars');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }, []);

  // Set date preset helpers
  const handleDatePreset = (preset: 'today' | 'this_month' | 'last_month' | 'last_7_days') => {
    const now = new Date();
    if (preset === 'today') {
      const d = now.toISOString().substring(0, 10);
      setFilters(prev => ({ ...prev, date_from: d, date_to: d }));
    } else if (preset === 'this_month') {
      const first = now.toISOString().substring(0, 7) + '-01';
      const d = now.toISOString().substring(0, 10);
      setFilters(prev => ({ ...prev, date_from: first, date_to: d }));
    } else if (preset === 'last_7_days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setFilters(prev => ({
        ...prev,
        date_from: past.toISOString().substring(0, 10),
        date_to: now.toISOString().substring(0, 10)
      }));
    } else if (preset === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      setFilters(prev => ({
        ...prev,
        date_from: prevMonth.toISOString().substring(0, 10),
        date_to: lastDayPrev.toISOString().substring(0, 10)
      }));
    }
  };

  // ----------------------------------------------------
  // DATA QUERY EXECUTION BASED ON ACTIVE SUB-REPORT
  // ----------------------------------------------------
  const reportData = useMemo(() => {
    switch (subReport) {
      // 1. Kehadiran Harian
      case 'daily_list':
        return StaffReportQueryService.getDailyAttendanceReport(filters, currentUser);
      case 'monthly_recap':
        return StaffReportQueryService.getMonthlyStaffRecapReport(filters, currentUser);
      case 'late_analysis':
        return StaffReportQueryService.getLateAnalysisReport(filters, currentUser);
      case 'missing_checkout':
        return StaffReportQueryService.getMissingCheckoutReport(filters, currentUser);

      // 2. Mengajar Guru (KBM)
      case 'teaching_daily':
        return StaffReportQueryService.getDailyTeachingReport(filters, currentUser);
      case 'teacher_monthly':
        return StaffReportQueryService.getTeacherMonthlyRecapReport(filters, currentUser);

      // 3. Pelatih Ekskul
      case 'training_daily':
        return StaffReportQueryService.getDailyTrainingReport(filters, currentUser);
      case 'trainer_monthly':
        return StaffReportQueryService.getTrainerMonthlyRecapReport(filters, currentUser);
      case 'ekskul_monthly':
        return StaffReportQueryService.getExtracurricularMonthlyReport(filters);

      // 4. Izin & Cuti
      case 'absence_list':
        return StaffReportQueryService.getStaffAbsenceReport(filters, currentUser);

      // 5. Matriks 360
      case 'cross_domain':
        return StaffReportQueryService.getStaffCrossDomainSummary(filters, currentUser);

      default:
        return [];
    }
  }, [subReport, filters, currentUser]);

  // Selected 360 profile
  const staff360Data = useMemo<Staff360ProfileData | null>(() => {
    if (!selectedStaff360Id) return null;
    return StaffReportQueryService.getStaff360Profile(selectedStaff360Id, filters.date_from.substring(0, 7));
  }, [selectedStaff360Id, filters.date_from]);

  // ----------------------------------------------------
  // CSV EXPORT HANDLER
  // ----------------------------------------------------
  const handleExportCsv = () => {
    const filename = `SIUBA_Laporan_${subReport}_${filters.date_from}_sd_${filters.date_to}`;

    if (subReport === 'daily_list') {
      const headers = ['NIP', 'Nama Pegawai', 'Peran', 'Departemen', 'Jadwal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Terlambat (Mnt)', 'Metode'];
      const rows = (reportData as any[]).map(r => [
        r.staff_number || '-',
        r.staff_name,
        r.staff_type,
        r.department || '-',
        r.schedule_name || '-',
        r.check_in_at || '-',
        r.check_out_at || '-',
        r.status,
        r.late_minutes,
        r.method || '-'
      ]);
      StaffReportQueryService.exportToCsv(filename, headers, rows);
    } else if (subReport === 'monthly_recap') {
      const headers = ['NIP', 'Nama Pegawai', 'Peran', 'Hari Kerja', 'Hadir (Tepat)', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Dinas', 'Alpha', 'Lupa Tap Out', 'Total Telat (Mnt)', 'Tingkat Kehadiran (%)', 'Ketepatan Waktu (%)'];
      const rows = (reportData as any[]).map(r => [
        r.staff_number || '-',
        r.staff_name,
        r.staff_type,
        r.working_days,
        r.present_count,
        r.late_count,
        r.permission_count,
        r.sick_count,
        r.leave_count,
        r.official_duty_count,
        r.absent_count,
        r.missing_checkout_count,
        r.total_late_minutes,
        r.presence_rate ?? '-',
        r.on_time_rate ?? '-'
      ]);
      StaffReportQueryService.exportToCsv(filename, headers, rows);
    } else if (subReport === 'teacher_monthly') {
      const headers = ['NIP', 'Nama Guru', 'Sesi Terjadwal (Eligible)', 'Hadir', 'Tepat', 'Terlambat', 'Di-invalkan', 'Meng-inval', 'Batal', 'Belum Tercatat', 'Tingkat Mengajar (%)', 'Ketepatan (%)', 'Total Telat (Mnt)'];
      const rows = (reportData as any[]).map(r => [
        r.staff_number || '-',
        r.teacher_name,
        r.eligible_sessions,
        r.attended_sessions,
        r.on_time_sessions,
        r.late_sessions,
        r.substituted_away_sessions,
        r.substitute_taught_sessions,
        r.cancelled_sessions,
        r.unrecorded_sessions,
        r.teaching_rate ?? '-',
        r.on_time_rate ?? '-',
        r.total_late_minutes
      ]);
      StaffReportQueryService.exportToCsv(filename, headers, rows);
    } else if (subReport === 'trainer_monthly') {
      const headers = ['NIP', 'Nama Pelatih', 'Ekstrakurikuler', 'Sesi Terjadwal', 'Hadir', 'Tepat', 'Terlambat', 'Realisasi Jurnal', 'Batal', 'Tingkat Kehadiran (%)', 'Tingkat Realisasi (%)'];
      const rows = (reportData as any[]).map(r => [
        r.staff_number || '-',
        r.trainer_name,
        r.primary_extracurricular,
        r.eligible_sessions,
        r.attended_sessions,
        r.on_time_sessions,
        r.late_sessions,
        r.realized_sessions,
        r.cancelled_sessions,
        r.training_rate ?? '-',
        r.realization_rate ?? '-'
      ]);
      StaffReportQueryService.exportToCsv(filename, headers, rows);
    } else if (subReport === 'absence_list') {
      const headers = ['Nama Pegawai', 'Peran', 'Jenis Izin', 'Mulai', 'Selesai', 'Durasi (Hari)', 'Status', 'Alasan', 'Disetujui Oleh'];
      const rows = (reportData as any[]).map(r => [
        r.staff_name,
        r.staff_type,
        r.type,
        r.start_at,
        r.end_at,
        r.duration_days,
        r.status,
        r.reason,
        r.approved_by || '-'
      ]);
      StaffReportQueryService.exportToCsv(filename, headers, rows);
    } else if (subReport === 'cross_domain') {
      const headers = ['NIP', 'Nama Pegawai', 'Peran', 'Status Hari Ini', 'Jam Masuk', 'KBM Hari Ini', 'Ekskul Hari Ini', 'Kehadiran Harian Bln Ini (%)', 'Mengajar Bln Ini (%)', 'Melatih Bln Ini (%)'];
      const rows = (reportData as any[]).map(r => [
        r.staff_number || '-',
        r.staff_name,
        r.staff_type,
        r.daily_status_today,
        r.daily_check_in || '-',
        r.teaching_today,
        r.training_today,
        r.current_month_daily_rate ?? '-',
        r.current_month_teaching_rate ?? '-',
        r.current_month_training_rate ?? '-'
      ]);
      StaffReportQueryService.exportToCsv(filename, headers, rows);
    }
  };

  // ----------------------------------------------------
  // PRINT DOCUMENT HANDLER
  // ----------------------------------------------------
  const handlePrint = () => {
    let reportTitle = 'Laporan Presensi SDM';
    let tableHeaders = '';
    let tableBody = '';

    if (subReport === 'daily_list') {
      reportTitle = `Laporan Kehadiran Harian Pegawai (${filters.date_from})`;
      tableHeaders = `
        <tr>
          <th>No</th><th>NIP</th><th>Nama Pegawai</th><th>Peran</th><th>Jadwal</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Telat</th>
        </tr>
      `;
      tableBody = (reportData as any[]).map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${r.staff_number || '-'}</td>
          <td><strong>${r.staff_name}</strong></td>
          <td>${r.staff_type}</td>
          <td>${r.schedule_name || '-'}</td>
          <td class="text-center">${r.check_in_at || '-'}</td>
          <td class="text-center">${r.check_out_at || '-'}</td>
          <td class="text-center">${r.status.toUpperCase()}</td>
          <td class="text-center">${r.late_minutes > 0 ? `+${r.late_minutes}m` : '-'}</td>
        </tr>
      `).join('');
    } else if (subReport === 'monthly_recap') {
      reportTitle = `Rekap Bulanan Kehadiran Pegawai (${filters.date_from} s/d ${filters.date_to})`;
      tableHeaders = `
        <tr>
          <th>No</th><th>Nama Pegawai</th><th>Peran</th><th>Hari Kerja</th><th>Hadir</th><th>Telat</th><th>Izin/Sakit</th><th>Alpha</th><th>Hadir %</th>
        </tr>
      `;
      tableBody = (reportData as any[]).map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td><strong>${r.staff_name}</strong></td>
          <td>${r.staff_type}</td>
          <td class="text-center">${r.working_days}</td>
          <td class="text-center">${r.present_count}</td>
          <td class="text-center">${r.late_count}</td>
          <td class="text-center">${r.permission_count + r.sick_count + r.leave_count}</td>
          <td class="text-center">${r.absent_count}</td>
          <td class="text-center"><strong>${r.presence_rate !== null ? `${r.presence_rate}%` : '-'}</strong></td>
        </tr>
      `).join('');
    } else if (subReport === 'teacher_monthly') {
      reportTitle = `Rekapitulasi Mengajar Guru KBM (${filters.date_from} s/d ${filters.date_to})`;
      tableHeaders = `
        <tr>
          <th>No</th><th>Nama Guru</th><th>Eligible Sesi</th><th>Hadir</th><th>Tepat</th><th>Telat</th><th>Inval</th><th>Realisasi %</th>
        </tr>
      `;
      tableBody = (reportData as any[]).map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td><strong>${r.teacher_name}</strong></td>
          <td class="text-center">${r.eligible_sessions}</td>
          <td class="text-center">${r.attended_sessions}</td>
          <td class="text-center">${r.on_time_sessions}</td>
          <td class="text-center">${r.late_sessions}</td>
          <td class="text-center">${r.substituted_away_sessions}</td>
          <td class="text-center"><strong>${r.teaching_rate !== null ? `${r.teaching_rate}%` : '-'}</strong></td>
        </tr>
      `).join('');
    } else {
      reportTitle = `Laporan Presensi Terpadu (${filters.date_from} s/d ${filters.date_to})`;
      tableHeaders = `
        <tr>
          <th>No</th><th>Nama Pegawai</th><th>Peran</th><th>Status Hari Ini</th><th>Presensi Harian %</th>
        </tr>
      `;
      tableBody = (reportData as any[]).map((r, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td><strong>${r.staff_name}</strong></td>
          <td>${r.staff_type}</td>
          <td>${r.daily_status_today || r.status || '-'}</td>
          <td class="text-center"><strong>${r.presence_rate ?? r.current_month_daily_rate ?? '-'}%</strong></td>
        </tr>
      `).join('');
    }

    const contentHtml = `
      <div class="report-title">
        <h1>${reportTitle}</h1>
        <p>Periode: ${filters.date_from} s/d ${filters.date_to} | Total Data: ${reportData.length} Baris</p>
      </div>
      <table>
        <thead>${tableHeaders}</thead>
        <tbody>${tableBody}</tbody>
      </table>
    `;

    StaffReportQueryService.printDocument(reportTitle, contentHtml);
  };

  return (
    <div id="staff-report-center" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 rounded-3xl border border-[#164735] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-[#C9A227] backdrop-blur-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Pusat Laporan & Rekap SDM Terpadu
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 font-semibold border border-white/20 backdrop-blur-xs">
                v1.1.4
              </span>
            </h1>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Laporan resmi presensi harian, mengajar guru, pelatih ekskul, dispensasi, serta matriks 360.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-black/25 hover:bg-black/35 text-white border border-white/15 backdrop-blur-xs rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#1F5C45]" />
            Cetak Resmi (KOP Surat)
          </button>
        </div>
      </div>

      {/* Main Category Navigation Tabs */}
      <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200/80 gap-1 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => { setActiveCategory('daily'); setSubReport('daily_list'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeCategory === 'daily'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-blue-600" />
          <span>1. Kehadiran Harian Pegawai</span>
        </button>

        <button
          onClick={() => { setActiveCategory('teaching'); setSubReport('teaching_daily'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeCategory === 'teaching'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>2. Mengajar Guru (KBM)</span>
        </button>

        <button
          onClick={() => { setActiveCategory('training'); setSubReport('training_daily'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeCategory === 'training'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-600" />
          <span>3. Pelatih Ekstrakurikuler</span>
        </button>

        <button
          onClick={() => { setActiveCategory('absence'); setSubReport('absence_list'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeCategory === 'absence'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-purple-600" />
          <span>4. Izin & Cuti SDM</span>
        </button>

        <button
          onClick={() => { setActiveCategory('profile360'); setSubReport('cross_domain'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeCategory === 'profile360'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>5. Matriks 360 & Profil Pegawai</span>
        </button>
      </div>

      {/* Sub-Report Switcher Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider pl-1">Pilih Jenis:</span>
        {activeCategory === 'daily' && (
          <>
            <button
              onClick={() => setSubReport('daily_list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'daily_list' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Laporan Harian Detail
            </button>
            <button
              onClick={() => setSubReport('monthly_recap')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'monthly_recap' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Rekapitulasi Bulanan Pegawai
            </button>
            <button
              onClick={() => setSubReport('late_analysis')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'late_analysis' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Analisis Keterlambatan
            </button>
            <button
              onClick={() => setSubReport('missing_checkout')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'missing_checkout' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Lupa Check-Out (Missing Tap Out)
            </button>
          </>
        )}

        {activeCategory === 'teaching' && (
          <>
            <button
              onClick={() => setSubReport('teaching_daily')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'teaching_daily' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Laporan Sesi Mengajar Harian
            </button>
            <button
              onClick={() => setSubReport('teacher_monthly')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'teacher_monthly' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Rekap Bulanan Mengajar Guru
            </button>
          </>
        )}

        {activeCategory === 'training' && (
          <>
            <button
              onClick={() => setSubReport('training_daily')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'training_daily' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Laporan Sesi Latihan Ekskul
            </button>
            <button
              onClick={() => setSubReport('trainer_monthly')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'trainer_monthly' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Rekap Bulanan Pelatih Ekskul
            </button>
            <button
              onClick={() => setSubReport('ekskul_monthly')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                subReport === 'ekskul_monthly' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              Realisasi Program Ekskul
            </button>
          </>
        )}

        {activeCategory === 'absence' && (
          <button
            onClick={() => setSubReport('absence_list')}
            className="px-3 py-1.5 rounded-lg font-semibold bg-zinc-900 text-white"
          >
            Laporan Permohonan Izin / Sakit / Cuti / Dinas
          </button>
        )}

        {activeCategory === 'profile360' && (
          <button
            onClick={() => setSubReport('cross_domain')}
            className="px-3 py-1.5 rounded-lg font-semibold bg-zinc-900 text-white"
          >
            Matriks Operasional Lintas Domain
          </button>
        )}
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-lime-600" />
            Parameter & Filter Laporan
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDatePreset('today')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-all"
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleDatePreset('last_7_days')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-all"
            >
              7 Hari
            </button>
            <button
              onClick={() => handleDatePreset('this_month')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-all"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleDatePreset('last_month')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-all"
            >
              Bulan Lalu
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            />
          </div>

          {/* Staff Type */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Peran / Jabatan</label>
            <select
              value={filters.staff_type}
              onChange={(e) => setFilters(prev => ({ ...prev, staff_type: e.target.value as any }))}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            >
              <option value="ALL">Semua Peran</option>
              <option value="teacher">Guru Pengajar (KBM)</option>
              <option value="trainer">Pelatih Ekskul</option>
              <option value="musyrif">Musyrif Asrama</option>
              <option value="administration">Administrasi / TU</option>
              <option value="employee">Karyawan Umum</option>
            </select>
          </div>

          {/* Individual Staff Selector */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Pilih Pegawai Tertentu</label>
            <select
              value={filters.staff_id}
              onChange={(e) => setFilters(prev => ({ ...prev, staff_id: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) }))}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            >
              <option value="ALL">Semua Pegawai ({staffList.length})</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.staff_type})</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Cari Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Nama / NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* REPORT CONTENT TABLE */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
              {subReport === 'daily_list' && 'Laporan Detail Kehadiran Harian Pegawai'}
              {subReport === 'monthly_recap' && 'Rekapitulasi Bulanan Kehadiran Pegawai'}
              {subReport === 'late_analysis' && 'Analisis Keterlambatan Pegawai'}
              {subReport === 'missing_checkout' && 'Daftar Pegawai Belum / Lupa Check-Out'}
              {subReport === 'teaching_daily' && 'Laporan Sesi Mengajar KBM'}
              {subReport === 'teacher_monthly' && 'Rekapitulasi Mengajar Guru'}
              {subReport === 'training_daily' && 'Laporan Sesi Latihan Ekstrakurikuler'}
              {subReport === 'trainer_monthly' && 'Rekapitulasi Bulanan Pelatih Ekskul'}
              {subReport === 'ekskul_monthly' && 'Realisasi Program Bulanan Ekstrakurikuler'}
              {subReport === 'absence_list' && 'Laporan Permohonan Izin / Sakit / Cuti'}
              {subReport === 'cross_domain' && 'Matriks Operasional SDM Lintas Domain'}
            </h3>
            <p className="text-[11px] text-zinc-500">
              Total {reportData.length} baris data ditemukan sesuai filter periode {filters.date_from} s/d {filters.date_to}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {reportData.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Tidak ada data yang sesuai dengan kriteria filter yang dipilih.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              {/* TABLE HEADER BY SUB-REPORT */}
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/80">
                  {subReport === 'daily_list' && (
                    <>
                      <th className="py-3 px-3">Pegawai / Guru</th>
                      <th className="py-3 px-3">Peran</th>
                      <th className="py-3 px-3">Jadwal Shift</th>
                      <th className="py-3 px-3 text-center">Waktu Masuk</th>
                      <th className="py-3 px-3 text-center">Waktu Pulang</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Terlambat</th>
                      <th className="py-3 px-3 text-center">Metode</th>
                      <th className="py-3 px-3 text-right">360 View</th>
                    </>
                  )}

                  {subReport === 'monthly_recap' && (
                    <>
                      <th className="py-3 px-3">Pegawai</th>
                      <th className="py-3 px-3">Peran</th>
                      <th className="py-3 px-3 text-center">Hari Kerja</th>
                      <th className="py-3 px-3 text-center">Hadir (Tepat)</th>
                      <th className="py-3 px-3 text-center">Terlambat</th>
                      <th className="py-3 px-3 text-center">Izin/Cuti</th>
                      <th className="py-3 px-3 text-center">Alpha</th>
                      <th className="py-3 px-3 text-center">Lupa Pulang</th>
                      <th className="py-3 px-3 text-center">Kehadiran (%)</th>
                      <th className="py-3 px-3 text-center">Ketepatan (%)</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </>
                  )}

                  {subReport === 'late_analysis' && (
                    <>
                      <th className="py-3 px-3">Pegawai</th>
                      <th className="py-3 px-3">Peran / Unit</th>
                      <th className="py-3 px-3 text-center">Jumlah Hari Telat</th>
                      <th className="py-3 px-3 text-center">Total Menit</th>
                      <th className="py-3 px-3 text-center">Rata-Rata (Mnt)</th>
                      <th className="py-3 px-3 text-center">Telat Terparah</th>
                      <th className="py-3 px-3 text-center">Terakhir Telat</th>
                    </>
                  )}

                  {subReport === 'missing_checkout' && (
                    <>
                      <th className="py-3 px-3">Tanggal</th>
                      <th className="py-3 px-3">Pegawai</th>
                      <th className="py-3 px-3">Peran</th>
                      <th className="py-3 px-3 text-center">Jam Masuk</th>
                      <th className="py-3 px-3 text-center">Jadwal Pulang</th>
                      <th className="py-3 px-3 text-center">Metode Masuk</th>
                    </>
                  )}

                  {subReport === 'teaching_daily' && (
                    <>
                      <th className="py-3 px-3">Tanggal & Sesi</th>
                      <th className="py-3 px-3">Kelas & Mapel</th>
                      <th className="py-3 px-3">Guru Terjadwal</th>
                      <th className="py-3 px-3">Guru Pengajar (Riil)</th>
                      <th className="py-3 px-3 text-center">Presensi Guru</th>
                      <th className="py-3 px-3 text-center">Status Sesi</th>
                    </>
                  )}

                  {subReport === 'teacher_monthly' && (
                    <>
                      <th className="py-3 px-3">Nama Guru</th>
                      <th className="py-3 px-3 text-center">Sesi Terjadwal</th>
                      <th className="py-3 px-3 text-center">Hadir</th>
                      <th className="py-3 px-3 text-center">Tepat</th>
                      <th className="py-3 px-3 text-center">Telat</th>
                      <th className="py-3 px-3 text-center">Di-invalkan</th>
                      <th className="py-3 px-3 text-center">Meng-inval</th>
                      <th className="py-3 px-3 text-center">Batal</th>
                      <th className="py-3 px-3 text-center">Tingkat Mengajar (%)</th>
                      <th className="py-3 px-3 text-right">360 View</th>
                    </>
                  )}

                  {subReport === 'training_daily' && (
                    <>
                      <th className="py-3 px-3">Tanggal & Waktu</th>
                      <th className="py-3 px-3">Ekstrakurikuler</th>
                      <th className="py-3 px-3">Pelatih Terjadwal</th>
                      <th className="py-3 px-3">Pelatih Riil</th>
                      <th className="py-3 px-3 text-center">Presensi Pelatih</th>
                      <th className="py-3 px-3 text-center">Realisasi Jurnal</th>
                    </>
                  )}

                  {subReport === 'trainer_monthly' && (
                    <>
                      <th className="py-3 px-3">Nama Pelatih</th>
                      <th className="py-3 px-3">Ekstrakurikuler</th>
                      <th className="py-3 px-3 text-center">Sesi Terjadwal</th>
                      <th className="py-3 px-3 text-center">Pelatih Hadir</th>
                      <th className="py-3 px-3 text-center">Tepat</th>
                      <th className="py-3 px-3 text-center">Telat</th>
                      <th className="py-3 px-3 text-center">Jurnal Realisasi</th>
                      <th className="py-3 px-3 text-center">Kehadiran (%)</th>
                      <th className="py-3 px-3 text-center">Realisasi (%)</th>
                      <th className="py-3 px-3 text-right">360 View</th>
                    </>
                  )}

                  {subReport === 'ekskul_monthly' && (
                    <>
                      <th className="py-3 px-3">Ekstrakurikuler</th>
                      <th className="py-3 px-3 text-center">Total Sesi</th>
                      <th className="py-3 px-3 text-center">Terealisasi</th>
                      <th className="py-3 px-3 text-center">Batal</th>
                      <th className="py-3 px-3 text-center">Pelatih Hadir</th>
                      <th className="py-3 px-3 text-center">Kehadiran Pelatih %</th>
                      <th className="py-3 px-3 text-center">Realisasi Program %</th>
                      <th className="py-3 px-3 text-center">Rata-Rata Santri</th>
                    </>
                  )}

                  {subReport === 'absence_list' && (
                    <>
                      <th className="py-3 px-3">Pegawai</th>
                      <th className="py-3 px-3">Jenis Izin</th>
                      <th className="py-3 px-3">Periode</th>
                      <th className="py-3 px-3 text-center">Durasi</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Alasan / Catatan</th>
                      <th className="py-3 px-3">Disetujui Oleh</th>
                    </>
                  )}

                  {subReport === 'cross_domain' && (
                    <>
                      <th className="py-3 px-3">Pegawai</th>
                      <th className="py-3 px-3">Peran</th>
                      <th className="py-3 px-3">Status Hari Ini</th>
                      <th className="py-3 px-3 text-center">KBM Hari Ini</th>
                      <th className="py-3 px-3 text-center">Ekskul Hari Ini</th>
                      <th className="py-3 px-3 text-center">Harian Bln Ini</th>
                      <th className="py-3 px-3 text-center">Mengajar Bln Ini</th>
                      <th className="py-3 px-3 text-center">Melatih Bln Ini</th>
                      <th className="py-3 px-3 text-right">Profil 360</th>
                    </>
                  )}
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-zinc-100">
                {subReport === 'daily_list' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">
                      {r.staff_name}
                      <span className="block text-[10px] text-zinc-400 font-normal">NIP: {r.staff_number || '-'}</span>
                    </td>
                    <td className="py-3 px-3 capitalize text-zinc-600">{r.staff_type}</td>
                    <td className="py-3 px-3 text-zinc-600">{r.schedule_name || '-'}</td>
                    <td className="py-3 px-3 font-mono text-center text-emerald-700 font-medium">{r.check_in_at || '-'}</td>
                    <td className="py-3 px-3 font-mono text-center text-zinc-600">{r.check_out_at || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'late' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'not_checked_in' ? 'bg-rose-100 text-rose-800' :
                        ['permission', 'sick', 'leave', 'official_duty'].includes(r.status) ? 'bg-purple-100 text-purple-800' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700">
                      {r.late_minutes > 0 ? `+${r.late_minutes}m` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center uppercase font-mono text-[10px] text-zinc-500">
                      {r.method || '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStaff360Id(r.staff_id)}
                        className="p-1.5 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-all"
                        title="Lihat Profil 360"
                      >
                        <Eye className="w-4 h-4 text-lime-700" />
                      </button>
                    </td>
                  </tr>
                ))}

                {subReport === 'monthly_recap' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">
                      {r.staff_name}
                      <span className="block text-[10px] text-zinc-400 font-normal">NIP: {r.staff_number || '-'}</span>
                    </td>
                    <td className="py-3 px-3 capitalize text-zinc-600">{r.staff_type}</td>
                    <td className="py-3 px-3 text-center font-medium text-zinc-900">{r.working_days}</td>
                    <td className="py-3 px-3 text-center text-emerald-700 font-medium">{r.present_count}</td>
                    <td className="py-3 px-3 text-center text-amber-700 font-medium">{r.late_count}</td>
                    <td className="py-3 px-3 text-center text-purple-700">
                      {r.permission_count + r.sick_count + r.leave_count + r.official_duty_count}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-700">{r.absent_count}</td>
                    <td className="py-3 px-3 text-center text-zinc-500">{r.missing_checkout_count}</td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">
                      {r.presence_rate !== null ? `${r.presence_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {r.on_time_rate !== null ? `${r.on_time_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStaff360Id(r.staff_id)}
                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-semibold transition-all"
                      >
                        Detail 360
                      </button>
                    </td>
                  </tr>
                ))}

                {subReport === 'late_analysis' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">{r.staff_name}</td>
                    <td className="py-3 px-3 text-zinc-600 capitalize">{r.staff_type} ({r.department || 'Umum'})</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-700">{r.late_days_count} Hari</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-700 font-mono">{r.total_late_minutes} Mnt</td>
                    <td className="py-3 px-3 text-center font-mono text-zinc-700">{r.average_late_minutes} Mnt</td>
                    <td className="py-3 px-3 text-center font-mono text-rose-700">+{r.max_late_minutes} Mnt</td>
                    <td className="py-3 px-3 text-center text-zinc-500 font-mono">{r.last_late_date}</td>
                  </tr>
                ))}

                {subReport === 'missing_checkout' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-zinc-600">{r.date}</td>
                    <td className="py-3 px-3 font-semibold text-zinc-900">{r.staff_name}</td>
                    <td className="py-3 px-3 capitalize text-zinc-600">{r.staff_type}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700">{r.check_in_at}</td>
                    <td className="py-3 px-3 text-center font-mono text-zinc-600">{r.expected_end}</td>
                    <td className="py-3 px-3 text-center uppercase font-mono text-[10px] text-zinc-500">{r.method || '-'}</td>
                  </tr>
                ))}

                {subReport === 'teaching_daily' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono text-zinc-900 font-semibold">{r.session_date}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{r.time_slot} (Jam ke-{r.period_order})</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-zinc-900">{r.class_name}</div>
                      <div className="text-[11px] text-zinc-600">{r.subject_name}</div>
                    </td>
                    <td className="py-3 px-3 text-zinc-700">{r.scheduled_teacher_name}</td>
                    <td className="py-3 px-3 text-zinc-900 font-medium">
                      {r.actual_teacher_name}
                      {r.is_substituted && (
                        <span className="block text-[10px] text-amber-700 font-bold">Inval Pengganti</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'late' ? 'bg-amber-100 text-amber-800' :
                        'bg-zinc-100 text-zinc-600'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        r.session_status === 'completed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        r.session_status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {r.session_status}
                      </span>
                    </td>
                  </tr>
                ))}

                {subReport === 'teacher_monthly' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">
                      {r.teacher_name}
                      <span className="block text-[10px] text-zinc-400 font-normal">NIP: {r.staff_number || '-'}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">{r.eligible_sessions}</td>
                    <td className="py-3 px-3 text-center text-emerald-700 font-bold">{r.attended_sessions}</td>
                    <td className="py-3 px-3 text-center text-emerald-600">{r.on_time_sessions}</td>
                    <td className="py-3 px-3 text-center text-amber-700">{r.late_sessions}</td>
                    <td className="py-3 px-3 text-center text-purple-700">{r.substituted_away_sessions}</td>
                    <td className="py-3 px-3 text-center text-indigo-700">{r.substitute_taught_sessions}</td>
                    <td className="py-3 px-3 text-center text-rose-600">{r.cancelled_sessions}</td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-700">
                      {r.teaching_rate !== null ? `${r.teaching_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStaff360Id(r.staff_id)}
                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-semibold transition-all"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}

                {subReport === 'training_daily' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono text-zinc-900 font-semibold">{r.session_date}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{r.scheduled_time}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-zinc-900">{r.extracurricular_name}</td>
                    <td className="py-3 px-3 text-zinc-700">{r.scheduled_trainer_name}</td>
                    <td className="py-3 px-3 text-zinc-900 font-medium">
                      {r.actual_trainer_name}
                      {r.is_substituted && <span className="block text-[10px] text-amber-700">Inval Pelatih</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'late' ? 'bg-amber-100 text-amber-800' :
                        'bg-zinc-100 text-zinc-600'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        r.realization_status === 'realized' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.realization_status}
                      </span>
                    </td>
                  </tr>
                ))}

                {subReport === 'trainer_monthly' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">{r.trainer_name}</td>
                    <td className="py-3 px-3 text-zinc-600">{r.primary_extracurricular}</td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">{r.eligible_sessions}</td>
                    <td className="py-3 px-3 text-center text-emerald-700 font-bold">{r.attended_sessions}</td>
                    <td className="py-3 px-3 text-center text-emerald-600">{r.on_time_sessions}</td>
                    <td className="py-3 px-3 text-center text-amber-700">{r.late_sessions}</td>
                    <td className="py-3 px-3 text-center text-blue-700 font-medium">{r.realized_sessions}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {r.training_rate !== null ? `${r.training_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-700">
                      {r.realization_rate !== null ? `${r.realization_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStaff360Id(r.staff_id)}
                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-semibold transition-all"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}

                {subReport === 'ekskul_monthly' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-zinc-900">{r.extracurricular_name}</td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">{r.total_sessions}</td>
                    <td className="py-3 px-3 text-center text-emerald-700 font-bold">{r.realized_sessions}</td>
                    <td className="py-3 px-3 text-center text-rose-600">{r.cancelled_sessions}</td>
                    <td className="py-3 px-3 text-center text-blue-700">{r.trainer_attended_count}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {r.trainer_attendance_rate !== null ? `${r.trainer_attendance_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-700">
                      {r.realization_rate !== null ? `${r.realization_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-700">{r.avg_student_attendance} Santri</td>
                  </tr>
                ))}

                {subReport === 'absence_list' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">{r.staff_name}</td>
                    <td className="py-3 px-3 uppercase font-bold text-purple-700 text-[10px]">{r.type}</td>
                    <td className="py-3 px-3 font-mono text-zinc-600">{r.start_at} s/d {r.end_at}</td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">{r.duration_days} Hari</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 italic">{r.reason}</td>
                    <td className="py-3 px-3 text-zinc-700">{r.approved_by || '-'}</td>
                  </tr>
                ))}

                {subReport === 'cross_domain' && (reportData as any[]).map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-900">
                      {r.staff_name}
                      <span className="block text-[10px] text-zinc-400 font-normal">NIP: {r.staff_number || '-'}</span>
                    </td>
                    <td className="py-3 px-3 capitalize text-zinc-600">{r.staff_type}</td>
                    <td className="py-3 px-3 font-medium text-zinc-800">{r.daily_status_today}</td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-700 font-semibold">{r.teaching_today}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-semibold">{r.training_today}</td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">
                      {r.current_month_daily_rate !== null ? `${r.current_month_daily_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-700">
                      {r.current_month_teaching_rate !== null ? `${r.current_month_teaching_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {r.current_month_training_rate !== null ? `${r.current_month_training_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStaff360Id(r.staff_id)}
                        className="px-2.5 py-1 bg-lime-100 hover:bg-lime-200 text-lime-900 rounded-lg text-[11px] font-bold transition-all"
                      >
                        Buka 360
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* STAFF 360 INDIVIDUAL MODAL DOSSIER */}
      {staff360Data && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-zinc-900 text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-lime-400 text-zinc-950 font-black text-xl flex items-center justify-center shadow-lg shadow-lime-400/20">
                  {staff360Data.staff.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{staff360Data.staff.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span>NIP: {staff360Data.staff.staff_number || '-'}</span>
                    <span>•</span>
                    <span className="capitalize text-lime-400 font-semibold">{staff360Data.staff.staff_type}</span>
                    <span>•</span>
                    <span>{staff360Data.staff.department || 'Umum'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStaff360Id(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* 3 Distinct Domain Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Daily Summary */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                  <div className="font-bold text-blue-900 flex items-center justify-between">
                    <span>Kehadiran Harian</span>
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-900">
                    {staff360Data.daily_summary.presence_rate !== null ? `${staff360Data.daily_summary.presence_rate}%` : '-'}
                  </div>
                  <div className="text-[11px] text-blue-700 space-y-0.5">
                    <div>Hadir: {staff360Data.daily_summary.present} | Telat: {staff360Data.daily_summary.late}</div>
                    <div>Izin/Cuti: {staff360Data.daily_summary.permission + staff360Data.daily_summary.leave} | Alpha: {staff360Data.daily_summary.absent}</div>
                  </div>
                </div>

                {/* 2. Teaching Summary */}
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="font-bold text-indigo-900 flex items-center justify-between">
                    <span>Mengajar Guru (KBM)</span>
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-900">
                    {staff360Data.teaching_summary?.teaching_rate !== null && staff360Data.teaching_summary?.teaching_rate !== undefined
                      ? `${staff360Data.teaching_summary.teaching_rate}%`
                      : 'Bukan Guru'}
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    {staff360Data.teaching_summary ? (
                      <div>Sesi: {staff360Data.teaching_summary.attended}/{staff360Data.teaching_summary.eligible} Sesi Terealisasi</div>
                    ) : (
                      <div>Tidak memiliki jadwal mengajar</div>
                    )}
                  </div>
                </div>

                {/* 3. Training Summary */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center justify-between">
                    <span>Pelatih Ekskul</span>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">
                    {staff360Data.training_summary?.training_rate !== null && staff360Data.training_summary?.training_rate !== undefined
                      ? `${staff360Data.training_summary.training_rate}%`
                      : 'Bukan Pelatih'}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {staff360Data.training_summary ? (
                      <div>Sesi: {staff360Data.training_summary.attended}/{staff360Data.training_summary.eligible} Sesi Hadir</div>
                    ) : (
                      <div>Tidak memiliki jadwal melatih</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <h4 className="font-bold text-zinc-900 mb-2">Jadwal Kerja & Standar Shift</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-600">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Nama Shift</span>
                    <span className="font-semibold text-zinc-800">{staff360Data.work_schedule_info.schedule_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Jam Masuk Standar</span>
                    <span className="font-semibold text-zinc-800">{staff360Data.work_schedule_info.standard_in} WIB</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Jam Pulang Standar</span>
                    <span className="font-semibold text-zinc-800">{staff360Data.work_schedule_info.standard_out} WIB</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Hari Efektif</span>
                    <span className="font-semibold text-zinc-800">Senin - Sabtu</span>
                  </div>
                </div>
              </div>

              {/* Recent Records Log */}
              <div>
                <h4 className="font-bold text-zinc-900 mb-2">Log Presensi Terbaru</h4>
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 uppercase text-[10px] border-b border-zinc-200">
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Jenis</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Masuk</th>
                        <th className="py-2 px-3">Pulang</th>
                        <th className="py-2 px-3">Metode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {staff360Data.recent_records.length === 0 ? (
                        <tr><td colSpan={6} className="py-4 text-center text-zinc-400">Belum ada riwayat log.</td></tr>
                      ) : (
                        staff360Data.recent_records.map(rec => (
                          <tr key={rec.id} className="hover:bg-zinc-50">
                            <td className="py-2 px-3 font-mono">{rec.attendance_date}</td>
                            <td className="py-2 px-3 capitalize">{rec.attendance_type}</td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[10px] ${
                                rec.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                rec.status === 'late' ? 'bg-amber-100 text-amber-800' :
                                'bg-zinc-100 text-zinc-700'
                              }`}>
                                {rec.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-700">{rec.check_in_at ? rec.check_in_at.substring(11, 16) : '-'}</td>
                            <td className="py-2 px-3 font-mono text-zinc-700">{rec.check_out_at ? rec.check_out_at.substring(11, 16) : '-'}</td>
                            <td className="py-2 px-3 uppercase font-mono text-[10px] text-zinc-500">{rec.method || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => setSelectedStaff360Id(null)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-all"
              >
                Tutup Dossier 360
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
