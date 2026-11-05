import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  FileSpreadsheet,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Classroom, 
  Student, 
  User, 
  Activity, 
  ActivityCategory,
  AttendanceStatus,
  AttendanceMethod
} from '../../../types';
import { StudentReportQueryService, StudentDailyReportItem, StudentRecapItem, ClassRecapItem } from '../../../services/studentReportQueryService';
import { ReportExportService } from '../../../services/reportExportService';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportFilterDrawer } from '../components/ReportFilterDrawer';
import { ReportPagination } from '../components/ReportPagination';
import { ReportDetailModal } from '../components/ReportDetailModal';
import { ReportPrintView } from '../components/ReportPrintView';
import { ActiveFilterChip, PaginationState, StudentReportSubView } from '../types';

interface Props {
  currentUser: User;
  sessions: AttendanceSession[];
  participants: AttendanceSessionParticipant[];
  records: AttendanceRecord[];
  students: Student[];
  classrooms?: Classroom[];
  categories?: ActivityCategory[];
  activities?: Activity[];
  initialFilters?: Record<string, any>;
  onBackToHub: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentReportPage: React.FC<Props> = ({
  currentUser,
  sessions = [],
  participants = [],
  records = [],
  students = [],
  classrooms = [],
  categories = [],
  activities = [],
  initialFilters = {} as Record<string, any>,
  onBackToHub,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);

  const [subView, setSubView] = useState<StudentReportSubView>('daily');
  const [dateFrom, setDateFrom] = useState<string>(initialFilters.date_from || todayStr);
  const [dateTo, setDateTo] = useState<string>(initialFilters.date_to || todayStr);
  const [selectedClass, setSelectedClass] = useState<string>(initialFilters.classroom_name || 'all');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>(initialFilters.category_id || 'all');
  const [selectedActivity, setSelectedActivity] = useState<number | 'all'>(initialFilters.activity_id || 'all');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'unrecorded' | 'all'>(initialFilters.status || 'all');
  const [selectedMethod, setSelectedMethod] = useState<AttendanceMethod | 'all'>(initialFilters.method || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || '');

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [detailModalData, setDetailModalData] = useState<{ title: string; subtitle?: string; data: Record<string, any> } | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 1. Fetch Daily Log Items & Authoritative Summary
  const { items: dailyItems, summary } = useMemo(() => {
    return StudentReportQueryService.getDailyAttendanceReport(
      sessions,
      participants,
      records,
      students,
      {
        date_from: dateFrom,
        date_to: dateTo,
        classroom_name: selectedClass,
        category_id: selectedCategory,
        activity_id: selectedActivity,
        status: selectedStatus,
        method: selectedMethod,
        search: searchQuery,
      }
    );
  }, [sessions, participants, records, students, dateFrom, dateTo, selectedClass, selectedCategory, selectedActivity, selectedStatus, selectedMethod, searchQuery]);

  // 2. Fetch Student Recap
  const studentRecapItems = useMemo(() => {
    if (subView !== 'student_recap') return [];
    return StudentReportQueryService.getStudentRecapReport(
      sessions,
      participants,
      records,
      students,
      {
        date_from: dateFrom,
        date_to: dateTo,
        classroom_name: selectedClass,
        category_id: selectedCategory,
        activity_id: selectedActivity,
        status: selectedStatus,
        method: selectedMethod,
        search: searchQuery,
      }
    );
  }, [subView, sessions, participants, records, students, dateFrom, dateTo, selectedClass, selectedCategory, selectedActivity, selectedStatus, selectedMethod, searchQuery]);

  // 3. Fetch Class Recap
  const classRecapItems = useMemo(() => {
    if (subView !== 'class_recap') return [];
    return StudentReportQueryService.getClassRecapReport(
      sessions,
      participants,
      records,
      students,
      {
        date_from: dateFrom,
        date_to: dateTo,
        classroom_name: selectedClass,
        category_id: selectedCategory,
        activity_id: selectedActivity,
        status: selectedStatus,
        method: selectedMethod,
        search: searchQuery,
      }
    );
  }, [subView, sessions, participants, records, students, dateFrom, dateTo, selectedClass, selectedCategory, selectedActivity, selectedStatus, selectedMethod, searchQuery]);

  // Active data list depending on subView
  const currentDataset = useMemo(() => {
    if (subView === 'student_recap') return studentRecapItems;
    if (subView === 'class_recap') return classRecapItems;
    return dailyItems;
  }, [subView, dailyItems, studentRecapItems, classRecapItems]);

  // Paginated slice
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentDataset.slice(start, start + pageSize);
  }, [currentDataset, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(currentDataset.length / pageSize));

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [subView, dateFrom, dateTo, selectedClass, selectedCategory, selectedActivity, selectedStatus, selectedMethod, searchQuery]);

  // Active Filter Chips
  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (dateFrom && dateTo && (dateFrom !== todayStr || dateTo !== todayStr)) {
      chips.push({ key: 'date', label: 'Periode', valueDisplay: `${dateFrom} s/d ${dateTo}` });
    }
    if (selectedClass !== 'all') {
      chips.push({ key: 'class', label: 'Kelas', valueDisplay: selectedClass });
    }
    if (selectedCategory !== 'all') {
      const catObj = categories.find((c) => c.id === Number(selectedCategory));
      chips.push({ key: 'category', label: 'Kategori', valueDisplay: catObj?.name || String(selectedCategory) });
    }
    if (selectedStatus !== 'all') {
      const statusLabels: Record<string, string> = {
        present: 'Hadir',
        late: 'Terlambat',
        permission: 'Izin',
        sick: 'Sakit',
        dispensation: 'Dispensasi',
        absent: 'Alpha',
        unrecorded: 'Belum Tercatat',
      };
      chips.push({ key: 'status', label: 'Status', valueDisplay: statusLabels[selectedStatus] || selectedStatus });
    }
    if (selectedMethod !== 'all') {
      chips.push({ key: 'method', label: 'Metode', valueDisplay: selectedMethod.toUpperCase() });
    }
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: 'Cari', valueDisplay: `"${searchQuery}"` });
    }
    return chips;
  }, [dateFrom, dateTo, selectedClass, selectedCategory, selectedStatus, selectedMethod, searchQuery, categories, todayStr]);

  const handleRemoveChip = (key: string) => {
    if (key === 'date') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (key === 'class') setSelectedClass('all');
    else if (key === 'category') setSelectedCategory('all');
    else if (key === 'status') setSelectedStatus('all');
    else if (key === 'method') setSelectedMethod('all');
    else if (key === 'search') setSearchQuery('');
  };

  const handleResetFilters = () => {
    setDateFrom(todayStr);
    setDateTo(todayStr);
    setSelectedClass('all');
    setSelectedCategory('all');
    setSelectedActivity('all');
    setSelectedStatus('all');
    setSelectedMethod('all');
    setSearchQuery('');
  };

  // Export to CSV
  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        let headers: string[] = [];
        let rows: string[][] = [];

        if (subView === 'daily') {
          headers = ['Tanggal', 'Sesi / Kegiatan', 'Kategori', 'Nama Santri', 'NIS', 'Kelas', 'Kamar / Asrama', 'Status', 'Waktu Masuk', 'Metode', 'Catatan'];
          rows = (currentDataset as StudentDailyReportItem[]).map((d) => [
            d.date,
            `"${d.activity_name.replace(/"/g, '""')}"`,
            `"${d.category_name}"`,
            `"${d.student_name.replace(/"/g, '""')}"`,
            `"${d.student_nis}"`,
            `"${d.classroom_name}"`,
            `"${d.dormitory_name}"`,
            d.status,
            d.timestamp || '-',
            d.method || '-',
            `"${(d.notes || '').replace(/"/g, '""')}"`,
          ]);
        } else if (subView === 'student_recap') {
          headers = ['Nama Santri', 'NIS', 'Kelas', 'Total Sesi Target', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Dispensasi', 'Alpha', 'Belum Tercatat', 'Tingkat Kehadiran (%)'];
          rows = (currentDataset as StudentRecapItem[]).map((d) => [
            `"${d.student_name.replace(/"/g, '""')}"`,
            `"${d.student_nis}"`,
            `"${d.classroom_name}"`,
            String(d.total_sessions),
            String(d.present),
            String(d.late),
            String(d.permission),
            String(d.sick),
            String(d.dispensation),
            String(d.absent),
            String(d.unrecorded),
            `${d.attendance_rate}%`,
          ]);
        } else {
          headers = ['Kelas / Rombel', 'Jumlah Santri', 'Target Sesi Presensi', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Dispensasi', 'Alpha', 'Belum Tercatat', 'Tingkat Kehadiran (%)'];
          rows = (currentDataset as ClassRecapItem[]).map((d) => [
            `"${d.classroom_name}"`,
            String(d.total_students),
            String(d.eligible_sessions),
            String(d.present),
            String(d.late),
            String(d.permission),
            String(d.sick),
            String(d.dispensation),
            String(d.absent),
            String(d.unrecorded),
            `${d.attendance_rate}%`,
          ]);
        }

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_santri_${subView}_${dateFrom}_${dateTo}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        onShowToast?.('Export CSV berhasil diunduh.', 'success');
      } catch (err) {
        onShowToast?.('Gagal mengunduh CSV.', 'error');
      } finally {
        setIsExporting(false);
      }
    }, 200);
  };

  // Export to Excel (HTML table format)
  const handleExportXlsx = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        let title = 'Laporan Presensi Harian Santri';
        if (subView === 'student_recap') title = 'Rekap Kehadiran per Santri';
        if (subView === 'class_recap') title = 'Rekap Kehadiran per Rombel / Kelas';

        let thead = '';
        let tbody = '';

        if (subView === 'daily') {
          thead = `<tr><th>No</th><th>Tanggal</th><th>Kegiatan</th><th>Kategori</th><th>Nama Santri</th><th>NIS</th><th>Kelas</th><th>Status</th><th>Waktu</th><th>Metode</th></tr>`;
          tbody = (currentDataset as StudentDailyReportItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.date}</td>
              <td>${d.activity_name}</td>
              <td>${d.category_name}</td>
              <td>${d.student_name}</td>
              <td>${d.student_nis}</td>
              <td>${d.classroom_name}</td>
              <td>${d.status.toUpperCase()}</td>
              <td>${d.timestamp || '-'}</td>
              <td>${d.method || '-'}</td>
            </tr>
          `).join('');
        } else if (subView === 'student_recap') {
          thead = `<tr><th>No</th><th>Nama Santri</th><th>NIS</th><th>Kelas</th><th>Target</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Dispensasi</th><th>Alpha</th><th>Belum</th><th>Rate (%)</th></tr>`;
          tbody = (currentDataset as StudentRecapItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.student_name}</td>
              <td>${d.student_nis}</td>
              <td>${d.classroom_name}</td>
              <td>${d.total_sessions}</td>
              <td>${d.present}</td>
              <td>${d.late}</td>
              <td>${d.permission}</td>
              <td>${d.sick}</td>
              <td>${d.dispensation}</td>
              <td>${d.absent}</td>
              <td>${d.unrecorded}</td>
              <td>${d.attendance_rate}%</td>
            </tr>
          `).join('');
        } else {
          thead = `<tr><th>No</th><th>Kelas</th><th>Santri</th><th>Target</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Dispensasi</th><th>Alpha</th><th>Belum</th><th>Rate (%)</th></tr>`;
          tbody = (currentDataset as ClassRecapItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.classroom_name}</td>
              <td>${d.total_students}</td>
              <td>${d.eligible_sessions}</td>
              <td>${d.present}</td>
              <td>${d.late}</td>
              <td>${d.permission}</td>
              <td>${d.sick}</td>
              <td>${d.dispensation}</td>
              <td>${d.absent}</td>
              <td>${d.unrecorded}</td>
              <td>${d.attendance_rate}%</td>
            </tr>
          `).join('');
        }

        const html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head><meta charset="utf-8"/><title>${title}</title></head>
          <body>
            <h2>Pondok Pesantren Utsman Bin Affan</h2>
            <h3>${title}</h3>
            <p>Periode: ${dateFrom} s/d ${dateTo}</p>
            <table border="1">${thead}<tbody>${tbody}</tbody></table>
          </body>
          </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_santri_${subView}_${dateFrom}_${dateTo}.xls`;
        link.click();
        URL.revokeObjectURL(url);
        onShowToast?.('Export Excel berhasil diunduh.', 'success');
      } catch (err) {
        onShowToast?.('Gagal mengunduh Excel.', 'error');
      } finally {
        setIsExporting(false);
      }
    }, 200);
  };

  const getStatusBadge = (st: AttendanceStatus | 'unrecorded') => {
    switch (st) {
      case 'present':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Hadir</span>;
      case 'late':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Terlambat</span>;
      case 'permission':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Izin</span>;
      case 'sick':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Sakit</span>;
      case 'dispensation':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Dispensasi</span>;
      case 'absent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Alpha</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">Belum Tercatat</span>;
    }
  };

  // Columns for Print View
  const printColumns = useMemo(() => {
    if (subView === 'daily') {
      return [
        { header: 'Tanggal', accessor: (r: StudentDailyReportItem) => r.date },
        { header: 'Kegiatan', accessor: (r: StudentDailyReportItem) => r.activity_name },
        { header: 'Nama Santri', accessor: (r: StudentDailyReportItem) => `${r.student_name} (${r.student_nis})` },
        { header: 'Kelas', accessor: (r: StudentDailyReportItem) => r.classroom_name },
        { header: 'Status', accessor: (r: StudentDailyReportItem) => r.status.toUpperCase() },
        { header: 'Waktu', accessor: (r: StudentDailyReportItem) => r.timestamp || '-' },
        { header: 'Metode', accessor: (r: StudentDailyReportItem) => r.method || '-' },
      ];
    } else if (subView === 'student_recap') {
      return [
        { header: 'Nama Santri', accessor: (r: StudentRecapItem) => r.student_name },
        { header: 'NIS', accessor: (r: StudentRecapItem) => r.student_nis },
        { header: 'Kelas', accessor: (r: StudentRecapItem) => r.classroom_name },
        { header: 'Target Sesi', accessor: (r: StudentRecapItem) => r.total_sessions },
        { header: 'Hadir', accessor: (r: StudentRecapItem) => r.present },
        { header: 'Terlambat', accessor: (r: StudentRecapItem) => r.late },
        { header: 'Izin/Sakit/Disp', accessor: (r: StudentRecapItem) => r.permission + r.sick + r.dispensation },
        { header: 'Alpha', accessor: (r: StudentRecapItem) => r.absent },
        { header: 'Tingkat Kehadiran', accessor: (r: StudentRecapItem) => `${r.attendance_rate}%` },
      ];
    } else {
      return [
        { header: 'Kelas / Rombel', accessor: (r: ClassRecapItem) => r.classroom_name },
        { header: 'Jumlah Santri', accessor: (r: ClassRecapItem) => r.total_students },
        { header: 'Target Sesi', accessor: (r: ClassRecapItem) => r.eligible_sessions },
        { header: 'Hadir', accessor: (r: ClassRecapItem) => r.present },
        { header: 'Terlambat', accessor: (r: ClassRecapItem) => r.late },
        { header: 'Izin/Sakit', accessor: (r: ClassRecapItem) => r.permission + r.sick + r.dispensation },
        { header: 'Alpha', accessor: (r: ClassRecapItem) => r.absent },
        { header: 'Tingkat Kehadiran', accessor: (r: ClassRecapItem) => `${r.attendance_rate}%` },
      ];
    }
  }, [subView]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="student-report-page">
      {/* Header */}
      <ReportHeader
        categoryName="A. Absensi Santri"
        title="Laporan Absensi Santri Terpadu"
        description="Monitoring log presensi, rekap kehadiran santri per rombel & individu berbasis denominator eligible session."
        badgeColor="emerald"
        subTabs={[
          { id: 'daily', label: 'Log Presensi Harian', count: dailyItems.length },
          { id: 'student_recap', label: 'Rekap per Santri', count: studentRecapItems.length },
          { id: 'class_recap', label: 'Rekap per Kelas', count: classRecapItems.length },
        ]}
        activeSubTab={subView}
        onSubTabChange={(t) => setSubView(t as StudentReportSubView)}
        onBackToHub={onBackToHub}
        onExportCsv={handleExportCsv}
        onExportXlsx={handleExportXlsx}
        onPrint={() => setIsPrintOpen(true)}
        isExporting={isExporting}
      />

      {/* Summary KPI Ribbon for Active Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
          <div className="text-[10px] font-bold text-zinc-500 uppercase">Target Eligible</div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{summary.totalEligible}</div>
        </div>
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 text-center">
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Hadir</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">{summary.present}</div>
        </div>
        <div className="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/40 text-center">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Terlambat</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300">{summary.late}</div>
        </div>
        <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-2xl border border-blue-200 dark:border-blue-800/40 text-center">
          <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Izin</div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-300">{summary.permission}</div>
        </div>
        <div className="bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-2xl border border-purple-200 dark:border-purple-800/40 text-center">
          <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Sakit</div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-300">{summary.sick}</div>
        </div>
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 text-center">
          <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Dispensasi</div>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">{summary.dispensation}</div>
        </div>
        <div className="bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-2xl border border-rose-200 dark:border-rose-800/40 text-center">
          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Alpha</div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-300">{summary.absent}</div>
        </div>
        <div className="bg-[#1F5C45] text-white p-2.5 rounded-2xl text-center shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider">Tingkat Hadir</div>
          <div className="text-xl font-black">
            {summary.totalEligible > 0 ? `${summary.attendanceRate}%` : '-'}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(f, t) => {
          setDateFrom(f);
          setDateTo(t);
        }}
        activeChips={activeChips}
        onRemoveChip={handleRemoveChip}
        onResetFilters={handleResetFilters}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
      >
        {/* Desktop Inline Filters */}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="all">Semua Kelas / Rombel</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="all">Semua Kategori Kegiatan</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {subView === 'daily' && (
          <>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="dispensation">Dispensasi</option>
              <option value="absent">Alpha</option>
              <option value="unrecorded">Belum Tercatat</option>
            </select>

            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">Semua Metode Presensi</option>
              <option value="manual">Manual Form</option>
              <option value="qr">Scan QR Code</option>
              <option value="rfid">Tap Kartu RFID</option>
            </select>
          </>
        )}
      </ReportFilterBar>

      {/* Main Table / Mobile Cards */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden" id="student-report-table-container">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          {subView === 'daily' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Tanggal & Kegiatan</th>
                  <th className="p-4">Nama Santri & NIS</th>
                  <th className="p-4">Kelas & Kamar</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Waktu</th>
                  <th className="p-4">Metode</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as StudentDailyReportItem[]).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.activity_name}</div>
                      <div className="text-[11px] text-zinc-500">{item.date} &bull; {item.category_name}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.student_name}</div>
                      <div className="text-[11px] text-zinc-500">NIS: {item.student_nis}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{item.classroom_name}</div>
                      <div className="text-[11px] text-zinc-500">{item.dormitory_name}</div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="p-4 font-mono text-zinc-700 dark:text-zinc-300">
                      {item.timestamp || '-'}
                    </td>
                    <td className="p-4">
                      {item.method ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {item.method.toUpperCase()}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDetailModalData({
                          title: `Rincian Presensi: ${item.student_name}`,
                          subtitle: `${item.activity_name} (${item.date})`,
                          data: {
                            nama_santri: item.student_name,
                            nis: item.student_nis,
                            kelas: item.classroom_name,
                            asrama: item.dormitory_name,
                            kegiatan: item.activity_name,
                            kategori: item.category_name,
                            tanggal: item.date,
                            status: item.status,
                            waktu_masuk: item.timestamp || '-',
                            metode_scan: item.method || '-',
                            operator: item.operator_name || 'Sistem Mandiri',
                            catatan: item.notes || 'Tidak ada catatan tambahan',
                          }
                        })}
                        className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subView === 'student_recap' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Santri & NIS</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4 text-center">Target Sesi</th>
                  <th className="p-4 text-center">Hadir</th>
                  <th className="p-4 text-center">Terlambat</th>
                  <th className="p-4 text-center">Izin/Skt/Disp</th>
                  <th className="p-4 text-center">Alpha</th>
                  <th className="p-4 text-center">Tingkat Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as StudentRecapItem[]).map((item, idx) => (
                  <tr key={item.student_id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.student_name}</div>
                      <div className="text-[11px] text-zinc-500">NIS: {item.student_nis}</div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{item.classroom_name}</td>
                    <td className="p-4 text-center font-bold">{item.total_sessions}</td>
                    <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.present}</td>
                    <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">{item.late}</td>
                    <td className="p-4 text-center font-semibold text-blue-600">{item.permission + item.sick + item.dispensation}</td>
                    <td className="p-4 text-center font-bold text-rose-600">{item.absent}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.attendance_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subView === 'class_recap' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Kelas / Rombel</th>
                  <th className="p-4 text-center">Total Santri</th>
                  <th className="p-4 text-center">Target Sesi</th>
                  <th className="p-4 text-center">Hadir</th>
                  <th className="p-4 text-center">Terlambat</th>
                  <th className="p-4 text-center">Izin/Sakit/Disp</th>
                  <th className="p-4 text-center">Alpha</th>
                  <th className="p-4 text-center">Tingkat Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as ClassRecapItem[]).map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      {item.classroom_name}
                    </td>
                    <td className="p-4 text-center font-bold text-zinc-700 dark:text-zinc-300">{item.total_students} Santri</td>
                    <td className="p-4 text-center font-bold">{item.eligible_sessions}</td>
                    <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.present}</td>
                    <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">{item.late}</td>
                    <td className="p-4 text-center font-semibold text-blue-600">{item.permission + item.sick + item.dispensation}</td>
                    <td className="p-4 text-center font-bold text-rose-600">{item.absent}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.attendance_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800 p-3 space-y-3">
          {subView === 'daily' && (paginatedItems as StudentDailyReportItem[]).map((item) => (
            <div key={item.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.student_name}</div>
                  <div className="text-xs text-zinc-500">NIS: {item.student_nis} &bull; {item.classroom_name}</div>
                </div>
                {getStatusBadge(item.status)}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-2 flex items-center justify-between">
                <span>{item.activity_name} ({item.date})</span>
                <span className="font-mono font-bold">{item.timestamp || '-'}</span>
              </div>
            </div>
          ))}

          {subView === 'student_recap' && (paginatedItems as StudentRecapItem[]).map((item) => (
            <div key={item.student_id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.student_name}</div>
                  <div className="text-xs text-zinc-500">{item.classroom_name} &bull; NIS: {item.student_nis}</div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  {item.attendance_rate}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="bg-white dark:bg-zinc-800 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="text-[10px] text-zinc-400 font-bold">Target</div>
                  <div className="font-black">{item.total_sessions}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950 p-1.5 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-600 font-bold">Hadir</div>
                  <div className="font-black text-emerald-700">{item.present}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 p-1.5 rounded-lg border border-amber-200">
                  <div className="text-[10px] text-amber-600 font-bold">Late</div>
                  <div className="font-black text-amber-700">{item.late}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950 p-1.5 rounded-lg border border-rose-200">
                  <div className="text-[10px] text-rose-600 font-bold">Alpha</div>
                  <div className="font-black text-rose-700">{item.absent}</div>
                </div>
              </div>
            </div>
          ))}

          {subView === 'class_recap' && (paginatedItems as ClassRecapItem[]).map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.classroom_name}</div>
                  <div className="text-xs text-zinc-500">{item.total_students} Santri Terdaftar</div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  {item.attendance_rate}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="bg-white dark:bg-zinc-800 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="text-[10px] text-zinc-400 font-bold">Target</div>
                  <div className="font-black">{item.eligible_sessions}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950 p-1.5 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-600 font-bold">Hadir</div>
                  <div className="font-black text-emerald-700">{item.present}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 p-1.5 rounded-lg border border-amber-200">
                  <div className="text-[10px] text-amber-600 font-bold">Late</div>
                  <div className="font-black text-amber-700">{item.late}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950 p-1.5 rounded-lg border border-rose-200">
                  <div className="text-[10px] text-rose-600 font-bold">Alpha</div>
                  <div className="font-black text-rose-700">{item.absent}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {currentDataset.length === 0 && (
          <div className="text-center py-16 px-4 space-y-2" id="student-report-empty">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Tidak ada data ditemukan</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Coba sesuaikan tanggal, filter kelas, atau kata kunci pencarian Anda.
            </p>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <ReportPagination
            pagination={{
              page,
              pageSize,
              totalItems: currentDataset.length,
              totalPages,
            }}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <ReportFilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        onApply={() => setIsMobileDrawerOpen(false)}
        onReset={handleResetFilters}
        title="Filter Laporan Santri"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Kelas / Rombel</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">Semua Kelas</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Kategori Kegiatan</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Status Presensi</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="dispensation">Dispensasi</option>
              <option value="absent">Alpha</option>
              <option value="unrecorded">Belum Tercatat</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Metode Scan</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">Semua Metode</option>
              <option value="manual">Manual Form</option>
              <option value="qr">QR Scanner</option>
              <option value="rfid">Tap Kartu RFID</option>
            </select>
          </div>
        </div>
      </ReportFilterDrawer>

      {/* Detail Modal */}
      {detailModalData && (
        <ReportDetailModal
          isOpen={true}
          onClose={() => setDetailModalData(null)}
          title={detailModalData.title}
          subtitle={detailModalData.subtitle}
          data={detailModalData.data}
        />
      )}

      {/* Print View Modal */}
      <ReportPrintView
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={subView === 'daily' ? 'Laporan Presensi Harian Santri' : subView === 'student_recap' ? 'Rekap Kehadiran per Santri' : 'Rekap Kehadiran per Rombel / Kelas'}
        subtitle={`Filter Aktif: ${selectedClass !== 'all' ? `Kelas ${selectedClass}` : 'Semua Kelas'}`}
        periodText={`${dateFrom} s/d ${dateTo}`}
        columns={printColumns}
        data={currentDataset}
      />
    </div>
  );
};
