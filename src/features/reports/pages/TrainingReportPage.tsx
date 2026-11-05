import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, 
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
  DailyTrainingReportItem, 
  TrainerMonthlyRecapItem,
  StaffAnalyticsFilters
} from '../../../types';
import { StaffReportQueryService } from '../../../services/staffReportQueryService';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';
import { TrainingSessionService } from '../../../services/trainingSessionService';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportPagination } from '../components/ReportPagination';
import { ReportDetailModal } from '../components/ReportDetailModal';
import { ReportPrintView } from '../components/ReportPrintView';
import { ActiveFilterChip, PaginationState, TrainingReportSubView } from '../types';

interface Props {
  currentUser: User;
  initialFilters?: Record<string, any>;
  onBackToHub: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TrainingReportPage: React.FC<Props> = ({
  currentUser,
  initialFilters = {} as Record<string, any>,
  onBackToHub,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [subView, setSubView] = useState<TrainingReportSubView>('session_list');
  const [dateFrom, setDateFrom] = useState<string>(initialFilters.date_from || firstDayOfMonth);
  const [dateTo, setDateTo] = useState<string>(initialFilters.date_to || todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialFilters.staff_id || 'ALL');
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>(initialFilters.extracurricular_id || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.status || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || '');

  const [detailModalData, setDetailModalData] = useState<{ title: string; subtitle?: string; data: Record<string, any> } | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const trainers = useMemo(() => {
    return StaffIdentityResolver.getStaffList().filter((s) => s.is_active && s.staff_type === 'trainer');
  }, []);

  const ekskuls = useMemo(() => {
    return TrainingSessionService.getExtracurriculars();
  }, []);

  const queryFilters: StaffAnalyticsFilters = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    staff_id: selectedStaffId,
    extracurricular_id: selectedEkskulId === 'ALL' ? undefined : Number(selectedEkskulId),
  }), [dateFrom, dateTo, selectedStaffId, selectedEkskulId]);

  const dailyData = useMemo(() => {
    if (subView !== 'session_list') return [];
    let items = StaffReportQueryService.getDailyTrainingReport(queryFilters, currentUser);
    if (selectedStatus !== 'ALL') {
      items = items.filter((d) => d.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d) => 
        d.scheduled_trainer_name.toLowerCase().includes(q) ||
        d.extracurricular_name.toLowerCase().includes(q) ||
        d.actual_trainer_name.toLowerCase().includes(q)
      );
    }
    return items;
  }, [subView, queryFilters, currentUser, selectedStatus, searchQuery]);

  const summaryData = useMemo(() => {
    if (subView !== 'trainer_summary') return [];
    let items = StaffReportQueryService.getTrainerMonthlyRecapReport(queryFilters, currentUser);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d) => 
        d.trainer_name.toLowerCase().includes(q) ||
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
  }, [subView, dateFrom, dateTo, selectedStaffId, selectedEkskulId, selectedStatus, searchQuery]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (dateFrom && dateTo) {
      chips.push({ key: 'date', label: 'Periode', valueDisplay: `${dateFrom} s/d ${dateTo}` });
    }
    if (selectedStaffId !== 'ALL') {
      const st = trainers.find((t) => t.id === Number(selectedStaffId));
      chips.push({ key: 'trainer', label: 'Pelatih', valueDisplay: st?.name || selectedStaffId });
    }
    if (selectedEkskulId !== 'ALL') {
      const eks = ekskuls.find((e) => e.id === Number(selectedEkskulId));
      chips.push({ key: 'ekskul', label: 'Ekskul', valueDisplay: eks?.name || selectedEkskulId });
    }
    if (selectedStatus !== 'ALL') {
      chips.push({ key: 'status', label: 'Status', valueDisplay: selectedStatus });
    }
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: 'Cari', valueDisplay: `"${searchQuery}"` });
    }
    return chips;
  }, [dateFrom, dateTo, selectedStaffId, selectedEkskulId, selectedStatus, searchQuery, trainers, ekskuls]);

  const handleRemoveChip = (key: string) => {
    if (key === 'date') {
      setDateFrom(firstDayOfMonth);
      setDateTo(todayStr);
    } else if (key === 'trainer') setSelectedStaffId('ALL');
    else if (key === 'ekskul') setSelectedEkskulId('ALL');
    else if (key === 'status') setSelectedStatus('ALL');
    else if (key === 'search') setSearchQuery('');
  };

  const handleResetFilters = () => {
    setDateFrom(firstDayOfMonth);
    setDateTo(todayStr);
    setSelectedStaffId('ALL');
    setSelectedEkskulId('ALL');
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
          headers = ['Tanggal', 'Ekstrakurikuler', 'Waktu', 'Pelatih Terjadwal', 'Pelatih Aktual', 'Inval', 'Presensi', 'Realisasi', 'Topik / Materi'];
          rows = (currentDataset as DailyTrainingReportItem[]).map((d) => [
            d.session_date,
            `"${d.extracurricular_name.replace(/"/g, '""')}"`,
            `"${d.scheduled_time}"`,
            `"${d.scheduled_trainer_name.replace(/"/g, '""')}"`,
            `"${d.actual_trainer_name.replace(/"/g, '""')}"`,
            d.is_substituted ? 'INVAL' : 'ASLI',
            d.status,
            d.realization_status,
            `"${(d.topic || '').replace(/"/g, '""')}"`,
          ]);
        } else {
          headers = ['Nama Pelatih', 'NIP', 'Ekskul Utama', 'Target Sesi', 'Sesi Hadir', 'Tepat Waktu', 'Sesi Terlambat', 'Inval Mengajar', 'Sesi Realisasi', 'Rate Kehadiran (%)', 'Rate Realisasi (%)'];
          rows = (currentDataset as TrainerMonthlyRecapItem[]).map((d) => [
            `"${d.trainer_name.replace(/"/g, '""')}"`,
            `"${d.staff_number || '-'}"`,
            `"${d.primary_extracurricular || '-'}"`,
            String(d.eligible_sessions),
            String(d.attended_sessions),
            String(d.on_time_sessions),
            String(d.late_sessions),
            String(d.substitute_taught_sessions),
            String(d.realized_sessions),
            d.training_rate !== null ? `${d.training_rate}%` : '-',
            d.realization_rate !== null ? `${d.realization_rate}%` : '-',
          ]);
        }

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_ekskul_${subView}_${dateFrom}_${dateTo}.csv`;
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
        const title = subView === 'session_list' ? 'Log Realisasi Sesi Latihan Ekskul' : 'Rekap Bulanan Kehadiran Pelatih';
        let thead = '';
        let tbody = '';

        if (subView === 'session_list') {
          thead = `<tr><th>No</th><th>Tanggal</th><th>Ekskul</th><th>Waktu</th><th>Pelatih Terjadwal</th><th>Pelatih Aktual</th><th>Presensi</th><th>Realisasi</th><th>Topik</th></tr>`;
          tbody = (currentDataset as DailyTrainingReportItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.session_date}</td>
              <td>${d.extracurricular_name}</td>
              <td>${d.scheduled_time}</td>
              <td>${d.scheduled_trainer_name}</td>
              <td>${d.actual_trainer_name}</td>
              <td>${d.status.toUpperCase()}</td>
              <td>${d.realization_status.toUpperCase()}</td>
              <td>${d.topic || '-'}</td>
            </tr>
          `).join('');
        } else {
          thead = `<tr><th>No</th><th>Nama Pelatih</th><th>NIP</th><th>Ekskul Utama</th><th>Target Sesi</th><th>Hadir</th><th>Realisasi Sesi</th><th>Inval Masuk</th><th>Rate Kehadiran (%)</th></tr>`;
          tbody = (currentDataset as TrainerMonthlyRecapItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.trainer_name}</td>
              <td>${d.staff_number || '-'}</td>
              <td>${d.primary_extracurricular || '-'}</td>
              <td>${d.eligible_sessions}</td>
              <td>${d.attended_sessions}</td>
              <td>${d.realized_sessions}</td>
              <td>${d.substitute_taught_sessions}</td>
              <td>${d.training_rate !== null ? d.training_rate + '%' : '-'}</td>
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
        link.download = `laporan_ekskul_${subView}_${dateFrom}_${dateTo}.xls`;
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
        { header: 'Tanggal', accessor: (r: DailyTrainingReportItem) => r.session_date },
        { header: 'Ekstrakurikuler', accessor: (r: DailyTrainingReportItem) => r.extracurricular_name },
        { header: 'Waktu', accessor: (r: DailyTrainingReportItem) => r.scheduled_time },
        { header: 'Pelatih Terjadwal', accessor: (r: DailyTrainingReportItem) => r.scheduled_trainer_name },
        { header: 'Pelatih Aktual', accessor: (r: DailyTrainingReportItem) => r.actual_trainer_name },
        { header: 'Presensi', accessor: (r: DailyTrainingReportItem) => r.status.toUpperCase() },
        { header: 'Realisasi', accessor: (r: DailyTrainingReportItem) => r.realization_status.toUpperCase() },
      ];
    } else {
      return [
        { header: 'Nama Pelatih', accessor: (r: TrainerMonthlyRecapItem) => r.trainer_name },
        { header: 'NIP', accessor: (r: TrainerMonthlyRecapItem) => r.staff_number || '-' },
        { header: 'Ekskul Utama', accessor: (r: TrainerMonthlyRecapItem) => r.primary_extracurricular || '-' },
        { header: 'Target Sesi', accessor: (r: TrainerMonthlyRecapItem) => r.eligible_sessions },
        { header: 'Hadir', accessor: (r: TrainerMonthlyRecapItem) => r.attended_sessions },
        { header: 'Realisasi', accessor: (r: TrainerMonthlyRecapItem) => r.realized_sessions },
        { header: 'Inval Masuk', accessor: (r: TrainerMonthlyRecapItem) => r.substitute_taught_sessions },
        { header: 'Rate Kehadiran', accessor: (r: TrainerMonthlyRecapItem) => r.training_rate !== null ? `${r.training_rate}%` : '-' },
      ];
    }
  }, [subView]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="training-report-page">
      <ReportHeader
        categoryName="D. Pelatih Ekskul"
        title="Laporan Pelatih & Ekstrakurikuler"
        description="Monitoring realisasi sesi latihan ekstrakurikuler, kehadiran pelatih & pembina, serta verifikasi jurnal materi."
        badgeColor="teal"
        subTabs={[
          { id: 'session_list', label: 'Log Sesi Latihan Harian', count: dailyData.length },
          { id: 'trainer_summary', label: 'Rekap Pelatih Bulanan', count: summaryData.length },
        ]}
        activeSubTab={subView}
        onSubTabChange={(t) => setSubView(t as TrainingReportSubView)}
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
          <option value="ALL">Semua Pelatih / Pembina</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={selectedEkskulId}
          onChange={(e) => setSelectedEkskulId(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Program Ekskul</option>
          {ekskuls.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </ReportFilterBar>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden" id="training-report-table-container">
        <div className="hidden md:block overflow-x-auto">
          {subView === 'session_list' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Tanggal & Waktu</th>
                  <th className="p-4">Ekstrakurikuler</th>
                  <th className="p-4">Pelatih Terjadwal</th>
                  <th className="p-4">Pelatih Aktual</th>
                  <th className="p-4">Presensi</th>
                  <th className="p-4">Realisasi</th>
                  <th className="p-4">Topik & Santri</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as DailyTrainingReportItem[]).map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.session_date}</div>
                      <div className="text-[11px] text-zinc-500">{item.scheduled_time}</div>
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {item.extracurricular_name}
                    </td>
                    <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.scheduled_trainer_name}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {item.actual_trainer_name}
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
                        item.realization_status === 'realized'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.realization_status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.realization_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 max-w-[200px] truncate text-zinc-600 dark:text-zinc-400">
                      <div className="font-medium">{item.topic || <span className="text-zinc-400 italic">Belum mengisi topik</span>}</div>
                      <div className="text-[11px] text-zinc-500">{item.student_present_count} santri hadir</div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDetailModalData({
                          title: `Rincian Sesi Ekskul: ${item.extracurricular_name}`,
                          subtitle: `${item.session_date} &bull; ${item.scheduled_time}`,
                          data: {
                            program_ekskul: item.extracurricular_name,
                            tanggal: item.session_date,
                            waktu: item.scheduled_time,
                            pelatih_terjadwal: item.scheduled_trainer_name,
                            pelatih_aktual: item.actual_trainer_name,
                            status_inval: item.is_substituted ? 'Ya (Inval)' : 'Tidak',
                            status_presensi: item.status,
                            status_realisasi: item.realization_status,
                            santri_hadir: `${item.student_present_count} Santri`,
                            topik_latihan: item.topic || 'Tidak ada catatan topik',
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

          {subView === 'trainer_summary' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Pelatih / Pembina</th>
                  <th className="p-4">Ekskul Utama</th>
                  <th className="p-4 text-center">Target Sesi</th>
                  <th className="p-4 text-center">Sesi Hadir</th>
                  <th className="p-4 text-center">Tepat Waktu</th>
                  <th className="p-4 text-center">Realisasi Sesi</th>
                  <th className="p-4 text-center">Inval Mengajar</th>
                  <th className="p-4 text-center">Rate Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as TrainerMonthlyRecapItem[]).map((item, idx) => (
                  <tr key={item.staff_id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.trainer_name}</div>
                      <div className="text-[11px] text-zinc-500">{item.staff_number || '-'}</div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">
                      {item.primary_extracurricular || '-'}
                    </td>
                    <td className="p-4 text-center font-bold">{item.eligible_sessions} Sesi</td>
                    <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.attended_sessions} Sesi</td>
                    <td className="p-4 text-center font-semibold text-zinc-700 dark:text-zinc-300">{item.on_time_sessions}</td>
                    <td className="p-4 text-center font-bold text-teal-600 dark:text-teal-400">{item.realized_sessions} Sesi</td>
                    <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">{item.substitute_taught_sessions}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {item.training_rate !== null ? `${item.training_rate}%` : '-'}
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
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Tidak ada sesi latihan ditemukan</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Coba sesuaikan tanggal atau pilihan filter program ekskul.
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
        title={subView === 'session_list' ? 'Log Realisasi Sesi Latihan Ekskul' : 'Rekap Bulanan Kehadiran Pelatih'}
        periodText={`${dateFrom} s/d ${dateTo}`}
        columns={printColumns}
        data={currentDataset}
      />
    </div>
  );
};
