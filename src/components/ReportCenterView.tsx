import React, { useState } from 'react';
import { 
  Activity, 
  ActivityCategory, 
  AttendanceDevice, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  EventRegistration, 
  Extracurricular, 
  ExtracurricularMember, 
  SpecialEvent, 
  Student, 
  StudentExcusal, 
  User 
} from '../types';
import { AttendanceMetricService, FilterCriteria } from '../services/attendanceMetricService';
import { ReportExportService } from '../services/reportExportService';
import { 
  Activity as ActivityIcon, 
  AlertTriangle, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  GraduationCap, 
  Home, 
  Layers, 
  Printer, 
  Search, 
  ShieldAlert, 
  Users, 
  Zap 
} from 'lucide-react';

interface Props {
  sessions: AttendanceSession[];
  participants: AttendanceSessionParticipant[];
  records: AttendanceRecord[];
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  categories: ActivityCategory[];
  activities: Activity[];
  excusals: StudentExcusal[];
  devices: AttendanceDevice[];
  currentUser: User;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ReportCenterView: React.FC<Props> = ({
  sessions = [],
  participants = [],
  records = [],
  students = [],
  classrooms = [],
  dormitories = [],
  dormitoryRooms = [],
  categories = [],
  activities = [],
  excusals = [],
  devices = [],
  currentUser,
  onShowToast,
}) => {
  const safeSessions = sessions || [];
  const safeParticipants = participants || [];
  const safeRecords = records || [];
  const safeStudents = students || [];
  const safeClassrooms = classrooms || [];
  const safeDormitories = dormitories || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeCategories = categories || [];
  const safeActivities = activities || [];
  const safeExcusals = excusals || [];
  const safeDevices = devices || [];

  const [activeReportTab, setActiveReportTab] = useState<string>('daily');
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-16');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-08-23');

  const [selectedClassFilter, setSelectedClassFilter] = useState<number | 'all'>('all');
  const [selectedDormFilter, setSelectedDormFilter] = useState<string | number | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'all'>('all');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<number | 'all'>('all');

  // Compute active date range
  const todayStr = '2026-08-23';
  let startDate = todayStr;
  let endDate = todayStr;

  if (selectedDatePreset === 'yesterday') {
    startDate = '2026-08-22';
    endDate = '2026-08-22';
  } else if (selectedDatePreset === '7days') {
    startDate = '2026-08-16';
    endDate = todayStr;
  } else if (selectedDatePreset === '30days') {
    startDate = '2026-07-24';
    endDate = todayStr;
  } else if (selectedDatePreset === 'this_month') {
    startDate = '2026-08-01';
    endDate = '2026-08-31';
  } else if (selectedDatePreset === 'custom') {
    startDate = customStartDate || todayStr;
    endDate = customEndDate || todayStr;
  }

  // Active dormitory / room filtering logic
  let dormFilterCriteria: string | string[] | 'all' = 'all';
  let dormFilterLabel = 'Semua Asrama & Kamar';

  if (selectedDormFilter !== 'all') {
    if (typeof selectedDormFilter === 'string' && selectedDormFilter.startsWith('dorm_')) {
      const dormId = Number(selectedDormFilter.replace('dorm_', ''));
      const dorm = safeDormitories.find((d) => d.id === dormId);
      const roomNames = safeDormitoryRooms
        .filter((r) => r.dormitory_id === dormId)
        .map((r) => r.name);
      dormFilterCriteria = roomNames.length > 0 ? roomNames : (dorm?.name || 'all');
      dormFilterLabel = dorm ? `Asrama ${dorm.name}` : 'Asrama';
    } else if (typeof selectedDormFilter === 'string' && selectedDormFilter.startsWith('room_')) {
      const roomId = Number(selectedDormFilter.replace('room_', ''));
      const room = safeDormitoryRooms.find((r) => r.id === roomId);
      dormFilterCriteria = room ? room.name : 'all';
      dormFilterLabel = room ? `Kamar ${room.name}` : 'Kamar';
    } else {
      dormFilterCriteria = String(selectedDormFilter);
    }
  }

  // Active classroom filtering logic
  const selectedClassroomObj = safeClassrooms.find((c) => c.id === Number(selectedClassFilter));
  const classFilterCriteria = selectedClassroomObj ? selectedClassroomObj.name : 'all';
  const classFilterLabel = selectedClassroomObj ? selectedClassroomObj.name : 'Semua Kelas';

  // Active category filtering logic
  const selectedCategoryObj = safeCategories.find((cat) => cat.id === Number(selectedCategoryFilter));
  const categoryFilterLabel = selectedCategoryObj ? selectedCategoryObj.name : 'Semua Kategori';

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedDatePreset('today');
    setCustomStartDate('2026-08-16');
    setCustomEndDate('2026-08-23');
    setSelectedClassFilter('all');
    setSelectedDormFilter('all');
    setSelectedCategoryFilter('all');
    setSelectedStudentFilter('all');
    onShowToast('Filter kriteria telah direset ke default.', 'info');
  };

  // Count active non-default filters
  const activeFilterCount = [
    selectedDatePreset !== 'today',
    selectedClassFilter !== 'all',
    selectedCategoryFilter !== 'all',
    selectedDormFilter !== 'all',
    selectedStudentFilter !== 'all',
  ].filter(Boolean).length;

  // Active Filters
  const filters: FilterCriteria = {
    startDate,
    endDate,
    classroomId: classFilterCriteria,
    dormitoryRoomId: dormFilterCriteria,
    activityCategoryId: selectedCategoryFilter,
    studentId: selectedStudentFilter,
    sessionStatus: 'all',
  };

  // Compute Metrics for current active filters
  const currentMetrics = AttendanceMetricService.calculateMetrics(safeSessions, safeParticipants, safeRecords, filters);

  // Compute Data Quality Audit Issues
  const dqIssues = AttendanceMetricService.runDataQualityAudit(safeSessions, safeParticipants, safeRecords);

  // Filtered Sessions
  const scopedSessions = safeSessions.filter((s) => {
    if (!s) return false;
    const sDate = s.session_date || (s.start_at ? s.start_at.slice(0, 10) : '');
    if (sDate < startDate || sDate > endDate) return false;
    if (selectedCategoryFilter !== 'all' && s.activity_category_id !== Number(selectedCategoryFilter)) return false;
    return true;
  });

  // Filtered Students for Tab 2
  const filteredStudents = safeStudents.filter((st) => {
    if (selectedClassFilter !== 'all' && st.classroom_id !== Number(selectedClassFilter)) {
      return false;
    }
    if (selectedDormFilter !== 'all') {
      if (typeof selectedDormFilter === 'string' && selectedDormFilter.startsWith('room_')) {
        const roomId = Number(selectedDormFilter.replace('room_', ''));
        if (st.dormitory_room_id !== roomId) return false;
      } else if (typeof selectedDormFilter === 'string' && selectedDormFilter.startsWith('dorm_')) {
        const dormId = Number(selectedDormFilter.replace('dorm_', ''));
        const dormRoomIds = safeDormitoryRooms.filter((r) => r.dormitory_id === dormId).map((r) => r.id);
        if (!st.dormitory_room_id || !dormRoomIds.includes(st.dormitory_room_id)) return false;
      }
    }
    return true;
  });

  // Filtered Classrooms for Tab 3
  const filteredClassrooms = safeClassrooms.filter((c) => {
    if (selectedClassFilter !== 'all' && c.id !== Number(selectedClassFilter)) {
      return false;
    }
    return true;
  });

  // Prepare Export Data
  const getExportData = () => {
    let title = 'Laporan Presensi Santri';
    let headers: string[] = [];
    let rows: Array<Array<string | number | undefined>> = [];

    if (activeReportTab === 'daily') {
      title = 'Laporan Presensi Harian Sesi';
      headers = ['No', 'Tanggal', 'Sesi Kegiatan', 'Kategori', 'Status Sesi', 'Eligible', 'Hadir', 'Late', 'Izin', 'Alpha', 'Rate (%)'];
      rows = scopedSessions.map((s, idx) => {
        const sMetrics = AttendanceMetricService.calculateMetrics([s], safeParticipants, safeRecords, filters);
        return [
          idx + 1,
          s.session_date || s.start_at.slice(0, 10),
          s.activity_name,
          s.category_name,
          s.status.toUpperCase(),
          sMetrics.totalEligible,
          sMetrics.present,
          sMetrics.late,
          sMetrics.permission + sMetrics.sick + sMetrics.dispensation,
          sMetrics.absent,
          sMetrics.attendanceRate + '%',
        ];
      });
    } else if (activeReportTab === 'student') {
      title = 'Rekapitulasi Presensi Santri Individual';
      headers = ['No', 'NIS', 'Nama Santri', 'Kelas', 'Total Sesi', 'Hadir', 'Late', 'Izin/Sakit/Disp', 'Alpha', 'Attendance Rate (%)'];
      rows = filteredStudents.map((st, idx) => {
        const stMetrics = AttendanceMetricService.calculateMetrics(scopedSessions, safeParticipants, safeRecords, { ...filters, studentId: st.id });
        return [
          idx + 1,
          st.student_number,
          st.name,
          st.classroom_name || '-',
          stMetrics.totalEligible,
          stMetrics.present,
          stMetrics.late,
          stMetrics.permission + stMetrics.sick + stMetrics.dispensation,
          stMetrics.absent,
          stMetrics.attendanceRate + '%',
        ];
      });
    } else if (activeReportTab === 'classroom') {
      title = 'Rekapitulasi Presensi Per Kelas';
      headers = ['No', 'Nama Kelas', 'Tingkat', 'Santri Terdaftar', 'Total Opportunity', 'Hadir', 'Late', 'Izin', 'Alpha', 'Rate (%)'];
      rows = filteredClassrooms.map((c, idx) => {
        const cMetrics = AttendanceMetricService.calculateMetrics(scopedSessions, safeParticipants, safeRecords, { ...filters, classroomId: c.name });
        const cStudents = safeStudents.filter((st) => st.classroom_id === c.id);
        return [
          idx + 1,
          c.name,
          c.grade_level,
          cStudents.length,
          cMetrics.totalEligible,
          cMetrics.present,
          cMetrics.late,
          cMetrics.permission + cMetrics.sick + cMetrics.dispensation,
          cMetrics.absent,
          cMetrics.attendanceRate + '%',
        ];
      });
    } else {
      // Default / Other tabs
      title = 'Laporan Audit Presensi';
      headers = ['No', 'Sesi', 'Kategori', 'Tanggal', 'Status', 'Rate (%)'];
      rows = scopedSessions.map((s, idx) => {
        const sMetrics = AttendanceMetricService.calculateMetrics([s], safeParticipants, safeRecords, filters);
        return [idx + 1, s.activity_name, s.category_name, s.session_date, s.status, sMetrics.attendanceRate + '%'];
      });
    }

    return { title, headers, rows };
  };

  const handleExportCsv = () => {
    const { title, headers, rows } = getExportData();
    ReportExportService.exportToCsv('rekap_absensi_siuba', headers, rows, {
      title,
      periodeStr: `${startDate} s/d ${endDate}`,
      filterSummaryStr: `Kelas: ${classFilterLabel}, Kategori: ${categoryFilterLabel}, Asrama/Kamar: ${dormFilterLabel}`,
      authorName: currentUser.name,
    });
    onShowToast('Laporan berhasil diexport dalam format CSV (UTF-8).', 'success');
  };

  const handleExportXlsx = () => {
    const { title, headers, rows } = getExportData();
    ReportExportService.exportToXlsxHtml('rekap_absensi_siuba', headers, rows, currentMetrics, {
      title,
      periodeStr: `${startDate} s/d ${endDate}`,
      filterSummaryStr: `Kelas: ${classFilterLabel}, Kategori: ${categoryFilterLabel}, Asrama/Kamar: ${dormFilterLabel}`,
      authorName: currentUser.name,
    });
    onShowToast('Laporan berhasil diexport sebagai Spreadsheet Excel.', 'success');
  };

  const handlePrintPdf = () => {
    const { title, headers, rows } = getExportData();
    ReportExportService.printReportView(title, headers, rows, {
      title,
      periodeStr: `${startDate} s/d ${endDate}`,
      filterSummaryStr: `Kelas: ${classFilterLabel}, Kategori: ${categoryFilterLabel}, Asrama/Kamar: ${dormFilterLabel}`,
      authorName: currentUser.name,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 rounded-3xl border border-[#164735] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1.5 backdrop-blur-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#C9A227]" />
              SIUBA Reporting & Export Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Pusat Laporan & Rekapitulasi Presensi</h1>
          <p className="text-emerald-100/90 text-xs mt-1">
            Generasi laporan presensi multi-format (CSV, XLSX, PDF/Printable View) dengan verifikasi denominator eligible yang sahih.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-black/25 hover:bg-black/35 text-white text-xs font-bold rounded-2xl border border-white/15 backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>CSV (BOM)</span>
          </button>

          <button
            onClick={handleExportXlsx}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#1F5C45]" />
            <span>Excel (XLSX)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2.5 bg-black/25 hover:bg-black/35 text-white text-xs font-bold rounded-2xl border border-white/15 backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Print / PDF View</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-[#1F5C45] flex items-center justify-center">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Filter Kriteria Laporan Presensi
              </h2>
              <p className="text-[11px] text-zinc-500">
                Pilih periode tanggal, filter kelas, kategori kegiatan, atau asrama/kamar santri.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeFilterCount} Filter Aktif
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-zinc-600 hover:text-rose-600 bg-zinc-50 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* 1. Preset Date Range */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1F5C45]" />
              <span>Periode Tanggal:</span>
            </label>
            <select
              value={selectedDatePreset}
              onChange={(e) => setSelectedDatePreset(e.target.value)}
              className="w-full bg-white text-zinc-900 font-semibold border border-zinc-300 rounded-xl px-3 py-2.5 text-xs shadow-xs focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] outline-none cursor-pointer hover:border-zinc-400 transition-colors"
            >
              <option value="today" className="text-zinc-900 bg-white font-medium">Hari Ini ({todayStr})</option>
              <option value="yesterday" className="text-zinc-900 bg-white font-medium">Kemarin (2026-08-22)</option>
              <option value="7days" className="text-zinc-900 bg-white font-medium">7 Hari Terakhir</option>
              <option value="30days" className="text-zinc-900 bg-white font-medium">30 Hari Terakhir</option>
              <option value="this_month" className="text-zinc-900 bg-white font-medium">Bulan Ini (Agustus 2026)</option>
              <option value="custom" className="text-zinc-900 bg-white font-medium">📅 Kustom Rentang Tanggal...</option>
            </select>
          </div>

          {/* 2. Class Filter */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#1F5C45]" />
              <span>Filter Kelas:</span>
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-white text-zinc-900 font-semibold border border-zinc-300 rounded-xl px-3 py-2.5 text-xs shadow-xs focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] outline-none cursor-pointer hover:border-zinc-400 transition-colors"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Kelas ({classrooms.length} Kelas)</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id} className="text-zinc-900 bg-white font-medium">
                  {c.name} (Tingkat {c.grade_level})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Category Filter */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#1F5C45]" />
              <span>Kategori Kegiatan:</span>
            </label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-white text-zinc-900 font-semibold border border-zinc-300 rounded-xl px-3 py-2.5 text-xs shadow-xs focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] outline-none cursor-pointer hover:border-zinc-400 transition-colors"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Kategori ({categories.length} Kategori)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="text-zinc-900 bg-white font-medium">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Dormitory & Room Filter */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-[#1F5C45]" />
              <span>Asrama / Kamar:</span>
            </label>
            <select
              value={selectedDormFilter}
              onChange={(e) => setSelectedDormFilter(e.target.value === 'all' ? 'all' : e.target.value)}
              className="w-full bg-white text-zinc-900 font-semibold border border-zinc-300 rounded-xl px-3 py-2.5 text-xs shadow-xs focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] outline-none cursor-pointer hover:border-zinc-400 transition-colors"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Asrama & Kamar</option>
              {dormitories.map((d) => {
                const rooms = dormitoryRooms.filter((r) => r.dormitory_id === d.id);
                return (
                  <optgroup key={d.id} label={`🏢 Asrama: ${d.name}`} className="font-bold text-zinc-900 bg-zinc-100">
                    <option value={`dorm_${d.id}`} className="text-zinc-900 bg-white font-semibold">
                      Semua Kamar di {d.name}
                    </option>
                    {rooms.map((r) => (
                      <option key={r.id} value={`room_${r.id}`} className="text-zinc-800 bg-white font-medium">
                        ↳ {r.name} {r.supervisor ? `(Musyrif: ${r.supervisor})` : ''}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker Sub-Row (visible when 'custom' is selected) */}
        {selectedDatePreset === 'custom' && (
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#12372A] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#1F5C45]" />
                Kustom Rentang:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-zinc-700 font-semibold">Dari:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white text-zinc-900 font-semibold border border-zinc-300 rounded-xl px-3 py-1.5 text-xs shadow-xs focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-zinc-700 font-semibold">Sampai:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white text-zinc-900 font-semibold border border-zinc-300 rounded-xl px-3 py-1.5 text-xs shadow-xs focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] outline-none"
              />
            </div>

            <span className="text-[11px] font-medium text-emerald-900 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
              Rentang Aktif: <strong>{startDate}</strong> s/d <strong>{endDate}</strong>
            </span>
          </div>
        )}

        {/* Active Filter Chips Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-zinc-500 font-medium mr-1">Filter Terpilih:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 font-semibold">
            <Calendar className="w-3 h-3 text-[#1F5C45]" />
            Periode: {startDate === endDate ? startDate : `${startDate} s/d ${endDate}`}
          </span>

          {selectedClassFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
              <GraduationCap className="w-3 h-3 text-emerald-700" />
              Kelas: {classFilterLabel}
              <button
                onClick={() => setSelectedClassFilter('all')}
                className="ml-1 hover:text-rose-600 font-bold"
                title="Hapus filter kelas"
              >
                ×
              </button>
            </span>
          )}

          {selectedCategoryFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
              <Layers className="w-3 h-3 text-amber-700" />
              Kategori: {categoryFilterLabel}
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className="ml-1 hover:text-rose-600 font-bold"
                title="Hapus filter kategori"
              >
                ×
              </button>
            </span>
          )}

          {selectedDormFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold">
              <Home className="w-3 h-3 text-indigo-700" />
              {dormFilterLabel}
              <button
                onClick={() => setSelectedDormFilter('all')}
                className="ml-1 hover:text-rose-600 font-bold"
                title="Hapus filter asrama/kamar"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Live Filter Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-zinc-100 text-center">
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Eligible (Peserta)</div>
            <div className="text-base font-black text-zinc-900 font-mono mt-0.5">{currentMetrics.totalEligible}</div>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Hadir Tepat</div>
            <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{currentMetrics.present}</div>
          </div>
          <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Terlambat</div>
            <div className="text-base font-black text-amber-700 font-mono mt-0.5">{currentMetrics.late}</div>
          </div>
          <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-200/80">
            <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Izin / Sakit</div>
            <div className="text-base font-black text-sky-700 font-mono mt-0.5">{currentMetrics.permission + currentMetrics.sick + currentMetrics.dispensation}</div>
          </div>
          <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200/80">
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Alpha (Tanpa Ket.)</div>
            <div className="text-base font-black text-rose-700 font-mono mt-0.5">{currentMetrics.absent}</div>
          </div>
          <div className="p-2.5 bg-[#12372A]/5 rounded-xl border border-[#1F5C45]/20">
            <div className="text-[10px] font-bold text-[#1F5C45] uppercase tracking-wider">Rate Presensi</div>
            <div className="text-base font-black text-[#12372A] font-mono mt-0.5">{currentMetrics.attendanceRate}%</div>
          </div>
        </div>
      </div>

      {/* Report Type Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-bold gap-1">
        <button
          onClick={() => setActiveReportTab('daily')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'daily'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Laporan Harian Sesi</span>
        </button>

        <button
          onClick={() => setActiveReportTab('student')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'student'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Rekap Per Santri</span>
        </button>

        <button
          onClick={() => setActiveReportTab('classroom')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'classroom'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>3. Rekap Per Kelas</span>
        </button>

        <button
          onClick={() => setActiveReportTab('data_quality')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'data_quality'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>4. Audit Kualitas Data</span>
        </button>
      </div>

      {/* Tab 1: Daily Sessions Report */}
      {activeReportTab === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Laporan Presensi Sesi Harian ({startDate} s/d {endDate})
            </h3>
            <span className="text-xs font-mono text-slate-500 font-bold">
              {scopedSessions.length} Sesi Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Sesi Kegiatan</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3 text-center">Status Sesi</th>
                  <th className="p-3 text-center">Eligible</th>
                  <th className="p-3 text-center text-emerald-600">Hadir</th>
                  <th className="p-3 text-center text-amber-600">Late</th>
                  <th className="p-3 text-center text-indigo-600">Izin</th>
                  <th className="p-3 text-center text-rose-600">Alpha</th>
                  <th className="p-3 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedSessions.map((s, idx) => {
                  const sMetrics = AttendanceMetricService.calculateMetrics([s], participants, records);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-medium text-slate-700">{s.session_date || s.start_at.slice(0, 10)}</td>
                      <td className="p-3 font-bold text-slate-900">{s.activity_name}</td>
                      <td className="p-3 text-slate-600">{s.category_name}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">{sMetrics.totalEligible}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">{sMetrics.present}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600">{sMetrics.late}</td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-600">{sMetrics.permission + sMetrics.sick + sMetrics.dispensation}</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-600">{sMetrics.absent}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{sMetrics.attendanceRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Student Individual Recap */}
      {activeReportTab === 'student' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Rekapitulasi Presensi Akumulatif Per Santri
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan data presensi santri yang cocok dengan filter ({classFilterLabel}, {dormFilterLabel}).
              </p>
            </div>
            <span className="text-xs font-mono text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {filteredStudents.length} Santri Ditampilkan
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">NIS</th>
                  <th className="p-3">Nama Santri</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3 text-center">Eligible Sessions</th>
                  <th className="p-3 text-center text-emerald-600">Hadir</th>
                  <th className="p-3 text-center text-amber-600">Late</th>
                  <th className="p-3 text-center text-indigo-600">Izin/Sakit</th>
                  <th className="p-3 text-center text-rose-600">Alpha</th>
                  <th className="p-3 text-right">Rate (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      Tidak ada santri yang cocok dengan kriteria filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const stMetrics = AttendanceMetricService.calculateMetrics(scopedSessions, safeParticipants, safeRecords, { ...filters, studentId: st.id });
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{st.student_number}</td>
                        <td className="p-3 font-bold text-slate-900">{st.name}</td>
                        <td className="p-3 text-slate-600">{st.classroom_name || '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{stMetrics.totalEligible}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{stMetrics.present}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">{stMetrics.late}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600">{stMetrics.permission + stMetrics.sick + stMetrics.dispensation}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600">{stMetrics.absent}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">{stMetrics.attendanceRate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Classroom Recap */}
      {activeReportTab === 'classroom' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Rekapitulasi Presensi Per Kelas & Tingkat
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan data agregat kehadiran per rombongan belajar.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {filteredClassrooms.length} Kelas Ditampilkan
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Nama Kelas</th>
                  <th className="p-3">Tingkat</th>
                  <th className="p-3 text-center">Santri Terdaftar</th>
                  <th className="p-3 text-center">Total Kesempatan</th>
                  <th className="p-3 text-center text-emerald-600">Hadir</th>
                  <th className="p-3 text-center text-amber-600">Late</th>
                  <th className="p-3 text-center text-indigo-600">Izin/Sakit</th>
                  <th className="p-3 text-center text-rose-600">Alpha</th>
                  <th className="p-3 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClassrooms.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      Tidak ada kelas yang cocok dengan kriteria filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredClassrooms.map((c, idx) => {
                    const cMetrics = AttendanceMetricService.calculateMetrics(scopedSessions, safeParticipants, safeRecords, { ...filters, classroomId: c.name });
                    const cStudents = safeStudents.filter((st) => st.classroom_id === c.id);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{c.name}</td>
                        <td className="p-3 text-slate-600">Tingkat {c.grade_level}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{cStudents.length} Santri</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{cMetrics.totalEligible}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{cMetrics.present}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">{cMetrics.late}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600">{cMetrics.permission + cMetrics.sick + cMetrics.dispensation}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600">{cMetrics.absent}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">{cMetrics.attendanceRate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Data Quality Audit */}
      {activeReportTab === 'data_quality' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Audit Kualitas & Integritas Data Presensi
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              {dqIssues.length} Isu Terdeteksi
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Pemeriksaan otomatis mendeteksi ketidaksesuaian antara sesi yang ditutup dengan jumlah catatan presensi, atau sesi tanpa peserta terdaftar.
          </p>

          <div className="space-y-2">
            {dqIssues.map((issue) => (
              <div key={issue.id} className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-950">{issue.title}</div>
                  <div className="text-rose-800 text-[11px] mt-0.5">{issue.description}</div>
                </div>
              </div>
            ))}

            {dqIssues.length === 0 && (
              <div className="p-6 text-center text-slate-500 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                ✅ Semua data presensi dalam kondisi sempurna. Tidak ada isu kualitas data terdeteksi.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
