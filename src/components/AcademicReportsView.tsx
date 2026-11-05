import React, { useState, useMemo } from 'react';
import { 
  AcademicSessionContext, 
  AttendanceRecord, 
  AttendanceSession, 
  Classroom, 
  LessonPeriod, 
  Student, 
  Subject 
} from '../types';
import { AcademicAttendanceService } from '../services/academicAttendanceService';
import { 
  Award,
  BarChart3, 
  BookOpen, 
  Calendar,
  CheckCircle2, 
  Clock,
  Download, 
  FileSpreadsheet, 
  Filter, 
  Grid, 
  Layers, 
  Printer, 
  Search, 
  Users,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  UserCheck,
  UserX,
  HeartPulse,
  Clock3
} from 'lucide-react';

interface Props {
  sessions: AttendanceSession[];
  contexts: AcademicSessionContext[];
  records: AttendanceRecord[];
  students: Student[];
  classrooms: Classroom[];
  subjects?: Subject[];
  lessonPeriods: LessonPeriod[];
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AcademicReportsView: React.FC<Props> = ({
  sessions = [],
  contexts = [],
  records = [],
  students = [],
  classrooms = [],
  subjects = [],
  lessonPeriods = [],
  onShowToast,
}) => {
  const safeClassrooms = classrooms || [];
  const safeStudents = students || [];
  const safeSessions = sessions || [];
  const safeRecords = records || [];
  const safeLessonPeriods = lessonPeriods || [];

  const [selectedDate, setSelectedDate] = useState<string>('2026-08-24');
  const [selectedClassroom, setSelectedClassroom] = useState<number>(safeClassrooms[0]?.id || 1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'perfect' | 'excused' | 'absent'>('all');

  const activeClassroom = safeClassrooms.find((c) => c.id === selectedClassroom);

  // Compute Daily Academic Matrix
  const matrix = useMemo(() => {
    return AcademicAttendanceService.getDailyAcademicMatrix({
      date: selectedDate,
      classroomId: selectedClassroom,
      sessions: safeSessions,
      records: safeRecords,
      students: safeStudents,
      lessonPeriods: safeLessonPeriods,
    });
  }, [selectedDate, selectedClassroom, safeSessions, safeRecords, safeStudents, safeLessonPeriods]);

  // Aggregate KPI Calculations
  const totalStudents = matrix.rows.length;
  const totalPresentSlots = matrix.rows.reduce((sum, r) => sum + r.summary.present, 0);
  const totalLateSlots = matrix.rows.reduce((sum, r) => sum + r.summary.late, 0);
  const totalPermissionSlots = matrix.rows.reduce((sum, r) => sum + r.summary.permission, 0);
  const totalSickSlots = matrix.rows.reduce((sum, r) => sum + r.summary.sick, 0);
  const totalDispensationSlots = matrix.rows.reduce((sum, r) => sum + r.summary.dispensation, 0);
  const totalAbsentSlots = matrix.rows.reduce((sum, r) => sum + r.summary.absent, 0);

  const totalEvaluatedSlots = totalPresentSlots + totalLateSlots + totalPermissionSlots + totalSickSlots + totalDispensationSlots + totalAbsentSlots;
  const overallAttendanceRate = totalEvaluatedSlots > 0 
    ? Math.round(((totalPresentSlots + totalLateSlots) / totalEvaluatedSlots) * 100) 
    : 100;

  // Filtered rows for search and status tabs
  const filteredRows = useMemo(() => {
    return matrix.rows.filter((row) => {
      const matchSearch = row.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.student.student_number.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filterStatus === 'perfect') {
        return row.summary.absent === 0 && row.summary.permission === 0 && row.summary.sick === 0;
      }
      if (filterStatus === 'excused') {
        return row.summary.permission > 0 || row.summary.sick > 0 || row.summary.dispensation > 0;
      }
      if (filterStatus === 'absent') {
        return row.summary.absent > 0;
      }
      return true;
    });
  }, [matrix.rows, searchTerm, filterStatus]);

  const handleExportCsv = () => {
    if (matrix.rows.length === 0) {
      onShowToast('Tidak ada data matriks KBM untuk diexport.', 'error');
      return;
    }

    const headers = [
      'No', 
      'NIS', 
      'Nama Santri', 
      'Kelas', 
      ...matrix.periods.map((p) => p.name), 
      'Hadir (H)', 
      'Terlambat (T)', 
      'Izin (I)', 
      'Sakit (S)', 
      'Dispensasi (D)', 
      'Alpha (A)',
      'Persentase Kehadiran'
    ];

    const rows = matrix.rows.map((r, idx) => {
      const periodCols = matrix.periods.map((p) => {
        const st = r.periodStatuses[p.id]?.status;
        if (st === 'present') return 'H';
        if (st === 'late') return 'T';
        if (st === 'permission') return 'I';
        if (st === 'sick') return 'S';
        if (st === 'dispensation') return 'D';
        if (st === 'absent') return 'A';
        return '-';
      });

      const totalStudentSlots = r.summary.present + r.summary.late + r.summary.permission + r.summary.sick + r.summary.dispensation + r.summary.absent;
      const rate = totalStudentSlots > 0 
        ? `${Math.round(((r.summary.present + r.summary.late) / totalStudentSlots) * 100)}%` 
        : '100%';

      return [
        idx + 1,
        r.student.student_number,
        `"${r.student.name}"`,
        activeClassroom?.name || '',
        ...periodCols,
        r.summary.present,
        r.summary.late,
        r.summary.permission,
        r.summary.sick,
        r.summary.dispensation,
        r.summary.absent,
        rate,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Matriks_KBM_${activeClassroom?.name || 'Kelas'}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Laporan Matriks KBM berhasil diunduh sebagai CSV.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="academic-reports-container" className="space-y-6 pb-12">
      {/* Top SIUBA Emerald Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden print:hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
              Laporan & Matriks Kehadiran KBM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Matriks Kehadiran Santri Per Jam Pelajaran (JP)
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Rekapitulasi visual kehadiran santri di setiap slot jam pelajaran harian dengan rincian status Hadir, Terlambat, Izin, Sakit, Dispensasi, dan Alpha.
          </p>
        </div>

        {/* Action Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 self-start lg:self-auto">
          {/* Classroom Selector */}
          <div className="flex items-center gap-2 bg-black/30 px-3.5 py-2 rounded-2xl border border-white/20 backdrop-blur-xs shadow-inner">
            <Filter className="w-4 h-4 text-[#C9A227]" />
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-100/80 font-bold uppercase">Pilih Rombel:</span>
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              >
                {safeClassrooms.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    Kelas {c.name} (Tingkat {c.grade_level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-black/30 px-3.5 py-2 rounded-2xl border border-white/20 backdrop-blur-xs shadow-inner">
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-100/80 font-bold uppercase">Tanggal KBM:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Export & Print Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-black/30 hover:bg-black/40 text-white font-bold text-xs rounded-2xl border border-white/20 shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Cetak Lembar Laporan"
            >
              <Printer className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-[#1F5C45]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print-Only Header Title */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Pondok Pesantren SIUBA</h2>
        <h3 className="text-sm font-bold text-slate-700">Laporan Matriks Presensi KBM Santri Per Jam Pelajaran</h3>
        <p className="text-xs text-slate-600 mt-1">Kelas: <strong>{activeClassroom?.name}</strong> | Tanggal: <strong>{selectedDate}</strong></p>
      </div>

      {/* 5 Bento KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tingkat Kehadiran</div>
            <div className="text-2xl font-black text-emerald-800 font-mono">{overallAttendanceRate}%</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Hadir (H)</div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalPresentSlots} <span className="text-xs text-slate-400 font-normal">JP</span></div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs shrink-0">
            <Clock3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Terlambat (T)</div>
            <div className="text-2xl font-black text-amber-700 font-mono">{totalLateSlots} <span className="text-xs text-slate-400 font-normal">JP</span></div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Izin & Sakit (I/S/D)</div>
            <div className="text-2xl font-black text-sky-800 font-mono">{totalPermissionSlots + totalSickSlots + totalDispensationSlots} <span className="text-xs text-slate-400 font-normal">JP</span></div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700 shadow-xs shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Alpha (A)</div>
            <div className="text-2xl font-black text-rose-700 font-mono">{totalAbsentSlots} <span className="text-xs text-slate-400 font-normal">JP</span></div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Interactive Legend Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama santri atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto text-xs font-bold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === 'all' ? 'bg-[#1F5C45] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({matrix.rows.length})
            </button>
            <button
              onClick={() => setFilterStatus('perfect')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === 'perfect' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hadir Penuh 100%
            </button>
            <button
              onClick={() => setFilterStatus('excused')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === 'excused' ? 'bg-sky-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ada Izin / Sakit
            </button>
            <button
              onClick={() => setFilterStatus('absent')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === 'absent' ? 'bg-rose-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ada Alpha
            </button>
          </div>
        </div>

        {/* Color Legend */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Keterangan Status:</span>
          <div className="flex items-center gap-3 flex-wrap text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center font-mono">H</span>
              <span className="text-slate-700">Hadir Tepat Waktu</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-mono">T</span>
              <span className="text-slate-700">Terlambat</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-900 border border-sky-300 flex items-center justify-center font-mono">I</span>
              <span className="text-slate-700">Izin</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 flex items-center justify-center font-mono">S</span>
              <span className="text-slate-700">Sakit</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center justify-center font-mono">D</span>
              <span className="text-slate-700">Dispensasi</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 flex items-center justify-center font-mono">A</span>
              <span className="text-slate-700">Alpha</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-mono">-</span>
              <span className="text-slate-500">Kosong / Libur</span>
            </span>
          </div>
        </div>
      </div>

      {/* Daily Matrix Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              Matriks Kehadiran Harian: Kelas {activeClassroom?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tanggal KBM: <strong>{selectedDate}</strong> &bull; Total <strong>{filteredRows.length}</strong> santri ditampilkan
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
            {activeClassroom?.name || 'Kelas'} &bull; {matrix.periods.length} JP
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-center text-xs text-slate-700 border-collapse min-w-[850px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3 text-left w-10">No</th>
                <th className="p-3 text-left w-24">NIS</th>
                <th className="p-3 text-left min-w-[160px]">Nama Santri</th>

                {matrix.periods.map((p) => (
                  <th key={p.id} className="p-3 font-mono text-[#1F5C45] border-l border-slate-200">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[9px] text-slate-400 font-normal">{p.start_time}</div>
                  </th>
                ))}

                <th className="p-3 font-mono text-emerald-700 border-l border-slate-200 bg-emerald-50/60 font-black">H</th>
                <th className="p-3 font-mono text-amber-700 bg-amber-50/60 font-black">T</th>
                <th className="p-3 font-mono text-sky-700 bg-sky-50/60 font-black">I</th>
                <th className="p-3 font-mono text-purple-700 bg-purple-50/60 font-black">S</th>
                <th className="p-3 font-mono text-rose-700 bg-rose-50/60 font-black">A</th>
                <th className="p-3 font-mono text-slate-900 border-l border-slate-200 bg-slate-100/70 font-black">% Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRows.map((row, idx) => {
                const totalSlots = row.summary.present + row.summary.late + row.summary.permission + row.summary.sick + row.summary.dispensation + row.summary.absent;
                const studentRate = totalSlots > 0 
                  ? Math.round(((row.summary.present + row.summary.late) / totalSlots) * 100)
                  : 100;

                return (
                  <tr key={row.student.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3 text-left font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 text-left font-mono text-[#1F5C45] font-bold">{row.student.student_number}</td>
                    <td className="p-3 text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {row.student.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{row.student.name}</span>
                      </div>
                    </td>

                    {matrix.periods.map((p) => {
                      const st = row.periodStatuses[p.id]?.status;
                      let badge = '-';
                      let badgeClass = 'text-slate-300 bg-slate-50 border-slate-100';

                      if (st === 'present') {
                        badge = 'H';
                        badgeClass = 'bg-emerald-100 text-emerald-900 font-black border-emerald-300 shadow-2xs';
                      } else if (st === 'late') {
                        badge = 'T';
                        badgeClass = 'bg-amber-100 text-amber-900 font-black border-amber-300 shadow-2xs';
                      } else if (st === 'permission') {
                        badge = 'I';
                        badgeClass = 'bg-sky-100 text-sky-900 font-black border-sky-300 shadow-2xs';
                      } else if (st === 'sick') {
                        badge = 'S';
                        badgeClass = 'bg-purple-100 text-purple-900 font-black border-purple-300 shadow-2xs';
                      } else if (st === 'dispensation') {
                        badge = 'D';
                        badgeClass = 'bg-cyan-100 text-cyan-900 font-black border-cyan-300 shadow-2xs';
                      } else if (st === 'absent') {
                        badge = 'A';
                        badgeClass = 'bg-rose-100 text-rose-900 font-black border-rose-300 shadow-2xs';
                      }

                      return (
                        <td key={p.id} className="p-2 border-l border-slate-100 font-mono">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] border ${badgeClass}`}>
                            {badge}
                          </span>
                        </td>
                      );
                    })}

                    <td className="p-3 border-l border-slate-200 font-mono font-bold text-emerald-700 bg-emerald-50/30">{row.summary.present}</td>
                    <td className="p-3 font-mono font-bold text-amber-700 bg-amber-50/30">{row.summary.late}</td>
                    <td className="p-3 font-mono font-bold text-sky-700 bg-sky-50/30">{row.summary.permission}</td>
                    <td className="p-3 font-mono font-bold text-purple-700 bg-purple-50/30">{row.summary.sick}</td>
                    <td className="p-3 font-mono font-bold text-rose-700 bg-rose-50/30">{row.summary.absent}</td>
                    <td className="p-3 border-l border-slate-200 font-mono font-bold text-slate-900 bg-slate-50/70">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        studentRate >= 80 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : studentRate >= 60 
                          ? 'bg-amber-100 text-amber-800 border-amber-200' 
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                        {studentRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6 + matrix.periods.length} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data santri yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

