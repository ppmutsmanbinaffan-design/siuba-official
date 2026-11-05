import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck,
  FileSpreadsheet,
  Layers,
  ChevronRight
} from 'lucide-react';
import { 
  User, 
  DailyTeachingReportItem, 
  TeacherMonthlyRecapItem,
  StaffAnalyticsFilters
} from '../../../types';
import { StaffReportQueryService } from '../../../services/staffReportQueryService';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';
import { TeachingSessionService } from '../../../services/teachingSessionService';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportPagination } from '../components/ReportPagination';
import { ReportDetailModal } from '../components/ReportDetailModal';
import { ReportPrintView } from '../components/ReportPrintView';
import { ActiveFilterChip, PaginationState, TeachingReportSubView } from '../types';

interface Props {
  currentUser: User;
  initialFilters?: Record<string, any>;
  onBackToHub: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TeachingReportPage: React.FC<Props> = ({
  currentUser,
  initialFilters = {} as Record<string, any>,
  onBackToHub,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [subView, setSubView] = useState<TeachingReportSubView>('session_list');
  const [dateFrom, setDateFrom] = useState<string>(initialFilters.date_from || firstDayOfMonth);
  const [dateTo, setDateTo] = useState<string>(initialFilters.date_to || todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialFilters.staff_id || 'ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialFilters.classroom_id || 'ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialFilters.subject_id || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.status || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || '');

  const [detailModalData, setDetailModalData] = useState<{ title: string; subtitle?: string; data: Record<string, any> } | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const teachers = useMemo(() => {
    return StaffIdentityResolver.getStaffList().filter((s) => s.is_active && s.staff_type === 'teacher');
  }, []);

  const queryFilters: StaffAnalyticsFilters = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    staff_id: selectedStaffId,
    classroom_id: selectedClassId === 'ALL' ? undefined : Number(selectedClassId),
    subject_id: selectedSubjectId === 'ALL' ? undefined : Number(selectedSubjectId),
  }), [dateFrom, dateTo, selectedStaffId, selectedClassId, selectedSubjectId]);

  const dailyData = useMemo(() => {
    if (subView !== 'session_list') return [];
    let items = StaffReportQueryService.getDailyTeachingReport(queryFilters, currentUser);
    if (selectedStatus !== 'ALL') {
      items = items.filter((d) => d.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d) => 
        d.scheduled_teacher_name.toLowerCase().includes(q) ||
        d.subject_name.toLowerCase().includes(q) ||
        d.class_name.toLowerCase().includes(q) ||
        d.actual_teacher_name.toLowerCase().includes(q)
      );
    }
    return items;
  }, [subView, queryFilters, currentUser, selectedStatus, searchQuery]);

  const summaryData = useMemo(() => {
    if (subView !== 'teacher_summary') return [];
    let items = StaffReportQueryService.getTeacherMonthlyRecapReport(queryFilters, currentUser);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d) => 
        d.teacher_name.toLowerCase().includes(q) ||
        (d.staff_number || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [subView, queryFilters, currentUser, searchQuery]);

  const currentDataset = useMemo(() => {
    return subView === 'session_list' ? dailyData : summaryData;
  }, [subView, dailyData, summaryData]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentDataset.slice(start, start + pageSize);
  }, [currentDataset, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(currentDataset.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [subView, dateFrom, dateTo, selectedStaffId, selectedClassId, selectedSubjectId, selectedStatus, searchQuery]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (dateFrom && dateTo) {
      chips.push({ key: 'date', label: 'Periode', valueDisplay: `${dateFrom} s/d ${dateTo}` });
    }
    if (selectedStaffId !== 'ALL') {
      const st = teachers.find((t) => t.id === Number(selectedStaffId));
      chips.push({ key: 'teacher', label: 'Guru', valueDisplay: st?.name || selectedStaffId });
    }
    if (selectedStatus !== 'ALL') {
      chips.push({ key: 'status', label: 'Status', valueDisplay: selectedStatus });
    }
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: 'Cari', valueDisplay: `"${searchQuery}"` });
    }
    return chips;
  }, [dateFrom, dateTo, selectedStaffId, selectedStatus, searchQuery, teachers]);

  const handleRemoveChip = (key: string) => {
    if (key === 'date') {
      setDateFrom(firstDayOfMonth);
      setDateTo(todayStr);
    } else if (key === 'teacher') setSelectedStaffId('ALL');
    else if (key === 'status') setSelectedStatus('ALL');
    else if (key === 'search') setSearchQuery('');
  };

  const handleResetFilters = () => {
    setDateFrom(firstDayOfMonth);
    setDateTo(todayStr);
    setSelectedStaffId('ALL');
    setSelectedClassId('ALL');
    setSelectedSubjectId('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        let headers: string[] = [];
        let rows: string[][] = [];

        if (subView === 'session_list') {
          headers = ['Tanggal', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Guru Terjadwal', 'Guru Aktual', 'Inval', 'Presensi', 'Status Sesi'];
          rows = (currentDataset as DailyTeachingReportItem[]).map((d) => [
            d.session_date,
            String(d.period_order),
            `"${d.time_slot}"`,
            `"${d.class_name}"`,
            `"${d.subject_name.replace(/"/g, '""')}"`,
            `"${d.scheduled_teacher_name.replace(/"/g, '""')}"`,
            `"${d.actual_teacher_name.replace(/"/g, '""')}"`,
            d.is_substituted ? 'INVAL' : 'ASLI',
            d.status,
            d.session_status,
          ]);
        } else {
          headers = ['Nama Guru', 'NIP', 'Target Sesi', 'Sesi Hadir', 'Tepat Waktu', 'Terlambat', 'Inval Mengajar', 'Digantikan', 'Batal', 'Rate Mengajar (%)', 'Rate Ketepatan (%)'];
          rows = (currentDataset as TeacherMonthlyRecapItem[]).map((d) => [
            `"${d.teacher_name.replace(/"/g, '""')}"`,
            `"${d.staff_number || '-'}"`,
            String(d.eligible_sessions),
            String(d.attended_sessions),
            String(d.on_time_sessions),
            String(d.late_sessions),
            String(d.substitute_taught_sessions),
            String(d.substituted_away_sessions),
            String(d.cancelled_sessions),
            d.teaching_rate !== null ? `${d.teaching_rate}%` : '-',
            d.on_time_rate !== null ? `${d.on_time_rate}%` : '-',
          ]);
        }

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_kbm_${subView}_${dateFrom}_${dateTo}.csv`;
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

  const handleExportXlsx = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const title = subView === 'session_list' ? 'Log Sesi Mengajar KBM Harian' : 'Rekap Bulanan Kehadiran Guru KBM';
        let thead = '';
        let tbody = '';

        if (subView === 'session_list') {
          thead = `<tr><th>No</th><th>Tanggal</th><th>Jam</th><th>Kelas</th><th>Mata Pelajaran</th><th>Guru Terjadwal</th><th>Guru Aktual</th><th>Presensi</th><th>Status</th></tr>`;
          tbody = (currentDataset as DailyTeachingReportItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.session_date}</td>
              <td>${d.time_slot}</td>
              <td>${d.class_name}</td>
              <td>${d.subject_name}</td>
              <td>${d.scheduled_teacher_name}</td>
              <td>${d.actual_teacher_name}</td>
              <td>${d.status.toUpperCase()}</td>
              <td>${d.session_status.toUpperCase()}</td>
            </tr>
          `).join('');
        } else {
          thead = `<tr><th>No</th><th>Nama Guru</th><th>NIP</th><th>Target Sesi</th><th>Hadir</th><th>Tepat Waktu</th><th>Terlambat</th><th>Inval Masuk</th><th>Rate (%)</th></tr>`;
          tbody = (currentDataset as TeacherMonthlyRecapItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.teacher_name}</td>
              <td>${d.staff_number || '-'}</td>
              <td>${d.eligible_sessions}</td>
              <td>${d.attended_sessions}</td>
              <td>${d.on_time_sessions}</td>
              <td>${d.late_sessions}</td>
              <td>${d.substitute_taught_sessions}</td>
              <td>${d.teaching_rate !== null ? d.teaching_rate + '%' : '-'}</td>
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
        link.download = `laporan_kbm_${subView}_${dateFrom}_${dateTo}.xls`;
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

  const printColumns = useMemo(() => {
    if (subView === 'session_list') {
      return [
        { header: 'Tanggal', accessor: (r: DailyTeachingReportItem) => r.session_date },
        { header: 'Waktu & Kelas', accessor: (r: DailyTeachingReportItem) => `${r.time_slot} (${r.class_name})` },
        { header: 'Mata Pelajaran', accessor: (r: DailyTeachingReportItem) => r.subject_name },
        { header: 'Guru Terjadwal', accessor: (r: DailyTeachingReportItem) => r.scheduled_teacher_name },
        { header: 'Guru Aktual', accessor: (r: DailyTeachingReportItem) => r.actual_teacher_name },
        { header: 'Presensi', accessor: (r: DailyTeachingReportItem) => r.status.toUpperCase() },
        { header: 'Status Sesi', accessor: (r: DailyTeachingReportItem) => r.session_status.toUpperCase() },
      ];
    } else {
      return [
        { header: 'Nama Guru', accessor: (r: TeacherMonthlyRecapItem) => r.teacher_name },
        { header: 'NIP', accessor: (r: TeacherMonthlyRecapItem) => r.staff_number || '-' },
        { header: 'Target Sesi', accessor: (r: TeacherMonthlyRecapItem) => r.eligible_sessions },
        { header: 'Sesi Hadir', accessor: (r: TeacherMonthlyRecapItem) => r.attended_sessions },
        { header: 'Tepat Waktu', accessor: (r: TeacherMonthlyRecapItem) => r.on_time_sessions },
        { header: 'Terlambat', accessor: (r: TeacherMonthlyRecapItem) => r.late_sessions },
        { header: 'Inval Mengajar', accessor: (r: TeacherMonthlyRecapItem) => r.substitute_taught_sessions },
        { header: 'Tingkat Mengajar', accessor: (r: TeacherMonthlyRecapItem) => r.teaching_rate !== null ? `${r.teaching_rate}%` : '-' },
      ];
    }
  }, [subView]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="teaching-report-page">
      <ReportHeader
        categoryName="C. KBM & Pengajar"
        title="Laporan Pembelajaran & Guru KBM"
        description="Monitoring log sesi mengajar harian, kehadiran guru & guru pengganti (inval), serta rekapitulasi jam pelajaran bulanan."
        badgeColor="indigo"
        subTabs={[
          { id: 'session_list', label: 'Log Sesi Mengajar Harian', count: dailyData.length },
          { id: 'teacher_summary', label: 'Rekap Bulanan Guru', count: summaryData.length },
        ]}
        activeSubTab={subView}
        onSubTabChange={(t) => setSubView(t as TeachingReportSubView)}
        onBackToHub={onBackToHub}
        onExportCsv={handleExportCsv}
        onExportXlsx={handleExportXlsx}
        onPrint={() => setIsPrintOpen(true)}
        isExporting={isExporting}
      />

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
      >
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Guru Pengajar</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Status Presensi</option>
          <option value="present">Hadir (Tepat Waktu)</option>
          <option value="late">Terlambat</option>
          <option value="unrecorded">Belum Presensi</option>
        </select>
      </ReportFilterBar>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden" id="teaching-report-table-container">
        <div className="hidden md:block overflow-x-auto">
          {subView === 'session_list' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Tanggal & Jam Ke</th>
                  <th className="p-4">Mata Pelajaran & Kelas</th>
                  <th className="p-4">Guru Terjadwal</th>
                  <th className="p-4">Guru Aktual</th>
                  <th className="p-4">Presensi</th>
                  <th className="p-4">Status Sesi</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as DailyTeachingReportItem[]).map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.session_date}</div>
                      <div className="text-[11px] text-zinc-500">Jam ke-{item.period_order} &bull; {item.time_slot}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.subject_name}</div>
                      <div className="text-[11px] text-zinc-500">Kelas: {item.class_name}</div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.scheduled_teacher_name}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {item.actual_teacher_name}
                        {item.is_substituted && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800">
                            INVAL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'present' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : item.status === 'late'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.session_status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.session_status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.session_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDetailModalData({
                          title: `Rincian Sesi KBM: ${item.subject_name}`,
                          subtitle: `${item.session_date} &bull; Jam ke-${item.period_order} (${item.class_name})`,
                          data: {
                            mata_pelajaran: item.subject_name,
                            kelas: item.class_name,
                            tanggal: item.session_date,
                            waktu: item.time_slot,
                            guru_terjadwal: item.scheduled_teacher_name,
                            guru_aktual: item.actual_teacher_name,
                            status_inval: item.is_substituted ? 'Ya (Inval)' : 'Tidak',
                            alasan_inval: item.substitution_reason || '-',
                            status_presensi: item.status,
                            status_sesi: item.session_status,
                            jam_masuk: item.check_in_at || '-',
                            jam_keluar: item.check_out_at || '-',
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

          {subView === 'teacher_summary' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Guru</th>
                  <th className="p-4 text-center">Target Sesi</th>
                  <th className="p-4 text-center">Sesi Hadir</th>
                  <th className="p-4 text-center">Tepat Waktu</th>
                  <th className="p-4 text-center">Terlambat</th>
                  <th className="p-4 text-center">Inval Mengajar</th>
                  <th className="p-4 text-center">Tingkat Mengajar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as TeacherMonthlyRecapItem[]).map((item, idx) => (
                  <tr key={item.staff_id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.teacher_name}</div>
                      <div className="text-[11px] text-zinc-500">{item.staff_number || '-'}</div>
                    </td>
                    <td className="p-4 text-center font-bold">{item.eligible_sessions} Sesi</td>
                    <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.attended_sessions} Sesi</td>
                    <td className="p-4 text-center font-semibold text-zinc-700 dark:text-zinc-300">{item.on_time_sessions}</td>
                    <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">{item.late_sessions}</td>
                    <td className="p-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{item.substitute_taught_sessions}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {item.teaching_rate !== null ? `${item.teaching_rate}%` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {currentDataset.length === 0 && (
          <div className="text-center py-16 px-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Tidak ada sesi KBM ditemukan</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Coba sesuaikan tanggal atau pilihan filter pengajar/kelas.
            </p>
          </div>
        )}

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

      <ReportDetailModal
        isOpen={!!detailModalData}
        onClose={() => setDetailModalData(null)}
        title={detailModalData?.title || ''}
        subtitle={detailModalData?.subtitle}
        data={detailModalData?.data || {}}
      />

      <ReportPrintView
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={subView === 'session_list' ? 'Log Sesi Mengajar KBM Harian' : 'Rekap Bulanan Kehadiran Guru KBM'}
        periodText={`${dateFrom} s/d ${dateTo}`}
        columns={printColumns}
        data={currentDataset}
      />
    </div>
  );
};
