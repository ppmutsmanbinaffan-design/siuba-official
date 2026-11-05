import React, { useState, useMemo, useEffect } from 'react';
import { 
  Briefcase, 
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
  UserX,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { 
  User, 
  Staff, 
  StaffType, 
  StaffAttendanceStatus, 
  StaffAttendanceMethod, 
  StaffDailyOperationalItem, 
  StaffMonthlyRecapItem,
  StaffAnalyticsFilters
} from '../../../types';
import { StaffReportQueryService } from '../../../services/staffReportQueryService';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportFilterDrawer } from '../components/ReportFilterDrawer';
import { ReportPagination } from '../components/ReportPagination';
import { ReportDetailModal } from '../components/ReportDetailModal';
import { ReportPrintView } from '../components/ReportPrintView';
import { ActiveFilterChip, PaginationState, StaffReportSubView } from '../types';

interface Props {
  currentUser: User;
  initialFilters?: Record<string, any>;
  onBackToHub: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const StaffDailyReportPage: React.FC<Props> = ({
  currentUser,
  initialFilters = {} as Record<string, any>,
  onBackToHub,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [subView, setSubView] = useState<StaffReportSubView>('daily_list');
  const [dateFrom, setDateFrom] = useState<string>(initialFilters.date_from || firstDayOfMonth);
  const [dateTo, setDateTo] = useState<string>(initialFilters.date_to || todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialFilters.staff_id || 'ALL');
  const [selectedStaffType, setSelectedStaffType] = useState<string>(initialFilters.staff_type || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.attendance_status || 'ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>(initialFilters.attendance_method || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || '');

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [detailModalData, setDetailModalData] = useState<{ title: string; subtitle?: string; data: Record<string, any> } | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const staffList = useMemo(() => StaffIdentityResolver.getStaffList().filter((s) => s.is_active), []);

  const queryFilters: StaffAnalyticsFilters = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    staff_id: selectedStaffId,
    staff_type: selectedStaffType as any,
    attendance_status: selectedStatus as any,
    attendance_method: selectedMethod as any,
  }), [dateFrom, dateTo, selectedStaffId, selectedStaffType, selectedStatus, selectedMethod]);

  // 1. Fetch Daily Operational List
  const dailyData = useMemo(() => {
    if (subView !== 'daily_list') return [];
    let items = StaffReportQueryService.getDailyAttendanceReport(queryFilters, currentUser);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d) => 
        d.staff_name.toLowerCase().includes(q) ||
        (d.staff_number || '').toLowerCase().includes(q) ||
        (d.schedule_name || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [subView, queryFilters, currentUser, searchQuery]);

  // 2. Fetch Monthly Recap
  const recapData = useMemo(() => {
    if (subView !== 'monthly_recap') return [];
    let items = StaffReportQueryService.getMonthlyStaffRecapReport(queryFilters, currentUser);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((d) => 
        d.staff_name.toLowerCase().includes(q) ||
        (d.staff_number || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [subView, queryFilters, currentUser, searchQuery]);

  const currentDataset = useMemo(() => {
    return subView === 'daily_list' ? dailyData : recapData;
  }, [subView, dailyData, recapData]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentDataset.slice(start, start + pageSize);
  }, [currentDataset, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(currentDataset.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [subView, dateFrom, dateTo, selectedStaffId, selectedStaffType, selectedStatus, selectedMethod, searchQuery]);

  // Active Filter Chips
  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (dateFrom && dateTo) {
      chips.push({ key: 'date', label: 'Periode', valueDisplay: `${dateFrom} s/d ${dateTo}` });
    }
    if (selectedStaffId !== 'ALL') {
      const st = staffList.find((s) => s.id === Number(selectedStaffId));
      chips.push({ key: 'staff', label: 'Staf', valueDisplay: st?.name || selectedStaffId });
    }
    if (selectedStaffType !== 'ALL') {
      chips.push({ key: 'type', label: 'Peran', valueDisplay: selectedStaffType.toUpperCase() });
    }
    if (selectedStatus !== 'ALL') {
      chips.push({ key: 'status', label: 'Status', valueDisplay: selectedStatus });
    }
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: 'Cari', valueDisplay: `"${searchQuery}"` });
    }
    return chips;
  }, [dateFrom, dateTo, selectedStaffId, selectedStaffType, selectedStatus, searchQuery, staffList]);

  const handleRemoveChip = (key: string) => {
    if (key === 'date') {
      setDateFrom(firstDayOfMonth);
      setDateTo(todayStr);
    } else if (key === 'staff') setSelectedStaffId('ALL');
    else if (key === 'type') setSelectedStaffType('ALL');
    else if (key === 'status') setSelectedStatus('ALL');
    else if (key === 'search') setSearchQuery('');
  };

  const handleResetFilters = () => {
    setDateFrom(firstDayOfMonth);
    setDateTo(todayStr);
    setSelectedStaffId('ALL');
    setSelectedStaffType('ALL');
    setSelectedStatus('ALL');
    setSelectedMethod('ALL');
    setSearchQuery('');
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        let headers: string[] = [];
        let rows: string[][] = [];

        if (subView === 'daily_list') {
          headers = ['Nama Pegawai', 'NIP / ID', 'Peran', 'Departemen', 'Jadwal Masuk', 'Waktu Masuk', 'Status Masuk', 'Menit Terlambat', 'Jadwal Pulang', 'Waktu Pulang', 'Metode'];
          rows = (currentDataset as StaffDailyOperationalItem[]).map((d) => [
            `"${d.staff_name.replace(/"/g, '""')}"`,
            `"${d.staff_number || '-'}"`,
            d.staff_type,
            `"${d.department || '-'}"`,
            d.expected_start,
            d.check_in_at || '-',
            d.status,
            String(d.late_minutes),
            d.expected_end,
            d.check_out_at || '-',
            d.method || '-',
          ]);
        } else {
          headers = ['Nama Pegawai', 'NIP', 'Peran', 'Departemen', 'Hari Kerja', 'Hadir', 'Terlambat', 'Total Terlambat (mnt)', 'Izin', 'Sakit', 'Cuti', 'Dinas', 'Alpha', 'Missing Out', 'Presence Rate (%)'];
          rows = (currentDataset as StaffMonthlyRecapItem[]).map((d) => [
            `"${d.staff_name.replace(/"/g, '""')}"`,
            `"${d.staff_number || '-'}"`,
            d.staff_type,
            `"${d.department || '-'}"`,
            String(d.working_days),
            String(d.present_count),
            String(d.late_count),
            String(d.total_late_minutes),
            String(d.permission_count),
            String(d.sick_count),
            String(d.leave_count),
            String(d.official_duty_count),
            String(d.absent_count),
            String(d.missing_checkout_count),
            d.presence_rate !== null ? `${d.presence_rate}%` : '-',
          ]);
        }

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_sdm_${subView}_${dateFrom}_${dateTo}.csv`;
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
        const title = subView === 'daily_list' ? 'Laporan Presensi Harian SDM' : 'Rekapitulasi Bulanan Presensi SDM';
        let thead = '';
        let tbody = '';

        if (subView === 'daily_list') {
          thead = `<tr><th>No</th><th>Nama Pegawai</th><th>NIP</th><th>Peran</th><th>Departemen</th><th>Jadwal Masuk</th><th>Waktu Masuk</th><th>Status</th><th>Telat (m)</th><th>Waktu Pulang</th><th>Metode</th></tr>`;
          tbody = (currentDataset as StaffDailyOperationalItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.staff_name}</td>
              <td>${d.staff_number || '-'}</td>
              <td>${d.staff_type}</td>
              <td>${d.department || '-'}</td>
              <td>${d.expected_start}</td>
              <td>${d.check_in_at || '-'}</td>
              <td>${d.status.toUpperCase()}</td>
              <td>${d.late_minutes}</td>
              <td>${d.check_out_at || '-'}</td>
              <td>${d.method || '-'}</td>
            </tr>
          `).join('');
        } else {
          thead = `<tr><th>No</th><th>Nama Pegawai</th><th>NIP</th><th>Peran</th><th>Hari Kerja</th><th>Hadir</th><th>Terlambat</th><th>Total Telat (m)</th><th>Izin/Sakit/Cuti</th><th>Alpha</th><th>Missing Out</th><th>Presence Rate (%)</th></tr>`;
          tbody = (currentDataset as StaffMonthlyRecapItem[]).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.staff_name}</td>
              <td>${d.staff_number || '-'}</td>
              <td>${d.staff_type}</td>
              <td>${d.working_days}</td>
              <td>${d.present_count}</td>
              <td>${d.late_count}</td>
              <td>${d.total_late_minutes}</td>
              <td>${d.permission_count + d.sick_count + d.leave_count + d.official_duty_count}</td>
              <td>${d.absent_count}</td>
              <td>${d.missing_checkout_count}</td>
              <td>${d.presence_rate !== null ? d.presence_rate + '%' : '-'}</td>
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
        link.download = `laporan_sdm_${subView}_${dateFrom}_${dateTo}.xls`;
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

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'present':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">Hadir Tepat Waktu</span>;
      case 'late':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200">Terlambat</span>;
      case 'permission':
      case 'sick':
      case 'leave':
      case 'official_duty':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200">{st.toUpperCase()}</span>;
      case 'absent':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200">Alpha</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">Belum Presensi</span>;
    }
  };

  const printColumns = useMemo(() => {
    if (subView === 'daily_list') {
      return [
        { header: 'Nama Pegawai', accessor: (r: StaffDailyOperationalItem) => r.staff_name },
        { header: 'Peran', accessor: (r: StaffDailyOperationalItem) => r.staff_type },
        { header: 'Jadwal', accessor: (r: StaffDailyOperationalItem) => `${r.expected_start} - ${r.expected_end}` },
        { header: 'Waktu Masuk', accessor: (r: StaffDailyOperationalItem) => r.check_in_at || '-' },
        { header: 'Status', accessor: (r: StaffDailyOperationalItem) => r.status.toUpperCase() },
        { header: 'Terlambat', accessor: (r: StaffDailyOperationalItem) => `${r.late_minutes} m` },
        { header: 'Waktu Pulang', accessor: (r: StaffDailyOperationalItem) => r.check_out_at || '-' },
        { header: 'Metode', accessor: (r: StaffDailyOperationalItem) => r.method || '-' },
      ];
    } else {
      return [
        { header: 'Nama Pegawai', accessor: (r: StaffMonthlyRecapItem) => r.staff_name },
        { header: 'NIP', accessor: (r: StaffMonthlyRecapItem) => r.staff_number || '-' },
        { header: 'Hari Kerja', accessor: (r: StaffMonthlyRecapItem) => r.working_days },
        { header: 'Hadir', accessor: (r: StaffMonthlyRecapItem) => r.present_count },
        { header: 'Terlambat', accessor: (r: StaffMonthlyRecapItem) => r.late_count },
        { header: 'Total Telat', accessor: (r: StaffMonthlyRecapItem) => `${r.total_late_minutes} m` },
        { header: 'Izin/Sakit', accessor: (r: StaffMonthlyRecapItem) => r.permission_count + r.sick_count + r.leave_count + r.official_duty_count },
        { header: 'Alpha', accessor: (r: StaffMonthlyRecapItem) => r.absent_count },
        { header: 'No Out', accessor: (r: StaffMonthlyRecapItem) => r.missing_checkout_count },
        { header: 'Presence Rate', accessor: (r: StaffMonthlyRecapItem) => r.presence_rate !== null ? `${r.presence_rate}%` : '-' },
      ];
    }
  }, [subView]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="staff-daily-report-page">
      <ReportHeader
        categoryName="B. Presensi Harian SDM"
        title="Laporan Presensi Staf & Pegawai"
        description="Monitoring log operasional harian, kepatuhan jam kerja, ketepatan check-in/out, dan rekapitulasi performa bulanan pegawai."
        badgeColor="emerald"
        subTabs={[
          { id: 'daily_list', label: 'Log Presensi Harian', count: dailyData.length },
          { id: 'monthly_recap', label: 'Rekap Bulanan Pegawai', count: recapData.length },
        ]}
        activeSubTab={subView}
        onSubTabChange={(t) => setSubView(t as StaffReportSubView)}
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
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
      >
        <select
          value={selectedStaffType}
          onChange={(e) => setSelectedStaffType(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Peran Pegawai</option>
          <option value="teacher">Guru / Pengajar (KBM)</option>
          <option value="trainer">Pelatih Ekskul</option>
          <option value="musyrif">Musyrif / Pembina Asrama</option>
          <option value="admin">Staf Administrasi & TU</option>
          <option value="security">Security & Keamanan</option>
          <option value="cleaning">Staf Kebersihan & Sarpras</option>
          <option value="kitchen">Staf Dapur</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Status Presensi</option>
          <option value="present">Hadir Tepat Waktu</option>
          <option value="late">Terlambat Masuk</option>
          <option value="permission">Izin</option>
          <option value="sick">Sakit</option>
          <option value="leave">Cuti</option>
          <option value="official_duty">Dinas Luar</option>
          <option value="absent">Alpha / Tanpa Keterangan</option>
          <option value="not_checked_in">Belum Presensi</option>
        </select>
      </ReportFilterBar>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden" id="staff-report-table-container">
        <div className="hidden md:block overflow-x-auto">
          {subView === 'daily_list' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Pegawai & Peran</th>
                  <th className="p-4">Jadwal Shift</th>
                  <th className="p-4">Jam Masuk</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Keterlambatan</th>
                  <th className="p-4">Jam Pulang</th>
                  <th className="p-4">Metode</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as StaffDailyOperationalItem[]).map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.staff_name}</div>
                      <div className="text-[11px] text-zinc-500">{item.staff_number || '-'} &bull; <span className="capitalize">{item.staff_type}</span></div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{item.schedule_name || 'Reguler'}</div>
                      <div className="text-[11px] text-zinc-500">{item.expected_start} - {item.expected_end}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {item.check_in_at || <span className="text-zinc-400 font-sans font-normal">-</span>}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="p-4 font-semibold">
                      {item.late_minutes > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">+{item.late_minutes} menit</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Tepat Waktu</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">
                      {item.check_out_at || <span className="text-zinc-400 font-sans font-normal">-</span>}
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
                          title: `Rincian Presensi SDM: ${item.staff_name}`,
                          subtitle: `${item.schedule_name || 'Shift'} &bull; ${item.expected_start} - ${item.expected_end}`,
                          data: {
                            nama_staf: item.staff_name,
                            nip: item.staff_number || '-',
                            peran: item.staff_type,
                            departemen: item.department || '-',
                            jadwal_kerja: item.schedule_name || 'Reguler',
                            jam_masuk_terjadwal: item.expected_start,
                            jam_masuk_aktual: item.check_in_at || '-',
                            status_masuk: item.status,
                            keterlambatan: `${item.late_minutes} menit`,
                            jam_pulang_terjadwal: item.expected_end,
                            jam_pulang_aktual: item.check_out_at || 'Belum Check-out',
                            metode_scan: item.method || '-',
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

          {subView === 'monthly_recap' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Pegawai & Peran</th>
                  <th className="p-4 text-center">Hari Kerja</th>
                  <th className="p-4 text-center">Hadir</th>
                  <th className="p-4 text-center">Terlambat</th>
                  <th className="p-4 text-center">Total Telat</th>
                  <th className="p-4 text-center">Izin/Sakit/Cuti</th>
                  <th className="p-4 text-center">Alpha</th>
                  <th className="p-4 text-center">Missing Out</th>
                  <th className="p-4 text-center">Presence Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paginatedItems as StaffMonthlyRecapItem[]).map((item, idx) => (
                  <tr key={item.staff_id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-zinc-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.staff_name}</div>
                      <div className="text-[11px] text-zinc-500">{item.staff_number || '-'} &bull; <span className="capitalize">{item.staff_type}</span></div>
                    </td>
                    <td className="p-4 text-center font-bold">{item.working_days} Hari</td>
                    <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.present_count}</td>
                    <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">{item.late_count}</td>
                    <td className="p-4 text-center font-semibold text-zinc-700 dark:text-zinc-300">{item.total_late_minutes} m</td>
                    <td className="p-4 text-center font-semibold text-blue-600">{item.permission_count + item.sick_count + item.leave_count + item.official_duty_count}</td>
                    <td className="p-4 text-center font-bold text-rose-600">{item.absent_count}</td>
                    <td className="p-4 text-center font-bold text-orange-600">{item.missing_checkout_count}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {item.presence_rate !== null ? `${item.presence_rate}%` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800 p-3 space-y-3">
          {subView === 'daily_list' && (paginatedItems as StaffDailyOperationalItem[]).map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.staff_name}</div>
                  <div className="text-xs text-zinc-500">{item.staff_type} &bull; {item.expected_start} - {item.expected_end}</div>
                </div>
                {getStatusBadge(item.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div>
                  <span className="text-zinc-500">In:</span> <strong>{item.check_in_at || '-'}</strong>
                  {item.late_minutes > 0 && <span className="text-amber-600 ml-1">(+{item.late_minutes}m)</span>}
                </div>
                <div>
                  <span className="text-zinc-500">Out:</span> <strong>{item.check_out_at || 'Belum Out'}</strong>
                </div>
              </div>
            </div>
          ))}

          {subView === 'monthly_recap' && (paginatedItems as StaffMonthlyRecapItem[]).map((item) => (
            <div key={item.staff_id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.staff_name}</div>
                  <div className="text-xs text-zinc-500">{item.staff_type} &bull; {item.working_days} Hari Kerja</div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                  {item.presence_rate !== null ? `${item.presence_rate}%` : '-'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="bg-emerald-50 dark:bg-emerald-950 p-1.5 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-600 font-bold">Hadir</div>
                  <div className="font-black text-emerald-700">{item.present_count}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 p-1.5 rounded-lg border border-amber-200">
                  <div className="text-[10px] text-amber-600 font-bold">Late</div>
                  <div className="font-black text-amber-700">{item.late_count}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950 p-1.5 rounded-lg border border-rose-200">
                  <div className="text-[10px] text-rose-600 font-bold">Alpha</div>
                  <div className="font-black text-rose-700">{item.absent_count}</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 p-1.5 rounded-lg border border-orange-200">
                  <div className="text-[10px] text-orange-600 font-bold">No Out</div>
                  <div className="font-black text-orange-700">{item.missing_checkout_count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {currentDataset.length === 0 && (
          <div className="text-center py-16 px-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Tidak ada data presensi ditemukan</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Coba sesuaikan tanggal atau pilihan filter di atas untuk menemukan data pegawai.
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

      <ReportFilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title="Filter Laporan Presensi Staf"
        activeChipsCount={activeChips.length}
        onReset={handleResetFilters}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1.5">Peran Pegawai</label>
            <select
              value={selectedStaffType}
              onChange={(e) => setSelectedStaffType(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="ALL">Semua Peran Pegawai</option>
              <option value="teacher">Guru / Pengajar (KBM)</option>
              <option value="trainer">Pelatih Ekskul</option>
              <option value="musyrif">Musyrif / Pembina Asrama</option>
              <option value="admin">Staf Administrasi & TU</option>
              <option value="security">Security & Keamanan</option>
              <option value="cleaning">Staf Kebersihan & Sarpras</option>
              <option value="kitchen">Staf Dapur</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1.5">Pegawai Spesifik</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="ALL">Semua Pegawai</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.staff_type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1.5">Status Presensi</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="leave">Cuti</option>
              <option value="official_duty">Dinas Luar</option>
              <option value="absent">Alpha</option>
              <option value="not_checked_in">Belum Presensi</option>
            </select>
          </div>
        </div>
      </ReportFilterDrawer>

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
        title={subView === 'daily_list' ? 'Laporan Presensi Harian SDM' : 'Rekapitulasi Bulanan Presensi SDM'}
        periodText={`${dateFrom} s/d ${dateTo}`}
        columns={printColumns}
        data={currentDataset}
      />
    </div>
  );
};
