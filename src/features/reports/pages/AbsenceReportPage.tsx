import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarDays, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  User, 
  StaffAbsenceReportItem,
  StaffAnalyticsFilters
} from '../../../types';
import { StaffReportQueryService } from '../../../services/staffReportQueryService';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportPagination } from '../components/ReportPagination';
import { ReportDetailModal } from '../components/ReportDetailModal';
import { ReportPrintView } from '../components/ReportPrintView';
import { ActiveFilterChip, PaginationState } from '../types';

interface Props {
  currentUser: User;
  initialFilters?: Record<string, any>;
  onBackToHub: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AbsenceReportPage: React.FC<Props> = ({
  currentUser,
  initialFilters = {} as Record<string, any>,
  onBackToHub,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [dateFrom, setDateFrom] = useState<string>(initialFilters.date_from || firstDayOfMonth);
  const [dateTo, setDateTo] = useState<string>(initialFilters.date_to || todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialFilters.staff_id || 'ALL');
  const [selectedType, setSelectedType] = useState<string>(initialFilters.type || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.status || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || '');

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
  }), [dateFrom, dateTo, selectedStaffId]);

  const items = useMemo(() => {
    let list = StaffReportQueryService.getStaffAbsenceReport(queryFilters, currentUser);

    if (selectedType !== 'ALL') {
      list = list.filter((item) => item.type === selectedType);
    }
    if (selectedStatus !== 'ALL') {
      list = list.filter((item) => item.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => 
        item.staff_name.toLowerCase().includes(q) ||
        (item.reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [queryFilters, currentUser, selectedType, selectedStatus, searchQuery]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, selectedStaffId, selectedType, selectedStatus, searchQuery]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (dateFrom && dateTo) {
      chips.push({ key: 'date', label: 'Periode', valueDisplay: `${dateFrom} s/d ${dateTo}` });
    }
    if (selectedStaffId !== 'ALL') {
      const st = staffList.find((s) => s.id === Number(selectedStaffId));
      chips.push({ key: 'staff', label: 'Pemohon', valueDisplay: st?.name || selectedStaffId });
    }
    if (selectedType !== 'ALL') {
      chips.push({ key: 'type', label: 'Jenis', valueDisplay: selectedType.toUpperCase() });
    }
    if (selectedStatus !== 'ALL') {
      chips.push({ key: 'status', label: 'Approval', valueDisplay: selectedStatus.toUpperCase() });
    }
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: 'Cari', valueDisplay: `"${searchQuery}"` });
    }
    return chips;
  }, [dateFrom, dateTo, selectedStaffId, selectedType, selectedStatus, searchQuery, staffList]);

  const handleRemoveChip = (key: string) => {
    if (key === 'date') {
      setDateFrom(firstDayOfMonth);
      setDateTo(todayStr);
    } else if (key === 'staff') setSelectedStaffId('ALL');
    else if (key === 'type') setSelectedType('ALL');
    else if (key === 'status') setSelectedStatus('ALL');
    else if (key === 'search') setSearchQuery('');
  };

  const handleResetFilters = () => {
    setDateFrom(firstDayOfMonth);
    setDateTo(todayStr);
    setSelectedStaffId('ALL');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const headers = ['ID Pengajuan', 'Nama Pegawai', 'Peran', 'Jenis Pengajuan', 'Tanggal Mulai', 'Tanggal Selesai', 'Total Hari', 'Alasan', 'Status Approval', 'Ditinjau Oleh', 'Waktu Pengajuan'];
        const rows = items.map((d) => [
          String(d.id),
          `"${d.staff_name.replace(/"/g, '""')}"`,
          d.staff_type,
          d.type,
          d.start_at,
          d.end_at,
          String(d.duration_days),
          `"${(d.reason || '').replace(/"/g, '""')}"`,
          d.status,
          `"${(d.approved_by || '-').replace(/"/g, '""')}"`,
          d.requested_at || '-',
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_izin_cuti_${dateFrom}_${dateTo}.csv`;
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
        const thead = `<tr><th>No</th><th>Nama Pegawai</th><th>Peran</th><th>Jenis</th><th>Mulai</th><th>Selesai</th><th>Hari</th><th>Alasan</th><th>Status</th><th>Reviewer</th></tr>`;
        const tbody = items.map((d, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${d.staff_name}</td>
            <td>${d.staff_type}</td>
            <td>${d.type.toUpperCase()}</td>
            <td>${d.start_at}</td>
            <td>${d.end_at}</td>
            <td>${d.duration_days}</td>
            <td>${d.reason || '-'}</td>
            <td>${d.status.toUpperCase()}</td>
            <td>${d.approved_by || '-'}</td>
          </tr>
        `).join('');

        const html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head><meta charset="utf-8"/><title>Laporan Pengajuan Izin dan Cuti</title></head>
          <body>
            <h2>Pondok Pesantren Utsman Bin Affan</h2>
            <h3>Laporan Pengajuan Izin, Sakit, Cuti & Dinas Luar</h3>
            <p>Periode: ${dateFrom} s/d ${dateTo}</p>
            <table border="1">${thead}<tbody>${tbody}</tbody></table>
          </body>
          </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_izin_cuti_${dateFrom}_${dateTo}.xls`;
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
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">Disetujui</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200">Ditolak</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200">Menunggu Approval</span>;
    }
  };

  const getTypeBadge = (tp: string) => {
    switch (tp) {
      case 'sick':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">Sakit</span>;
      case 'leave':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800">Cuti</span>;
      case 'official_duty':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800">Dinas Luar</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">Izin</span>;
    }
  };

  const printColumns = [
    { header: 'Nama Pemohon', accessor: (r: StaffAbsenceReportItem) => `${r.staff_name} (${r.staff_type})` },
    { header: 'Jenis', accessor: (r: StaffAbsenceReportItem) => r.type.toUpperCase() },
    { header: 'Tanggal', accessor: (r: StaffAbsenceReportItem) => `${r.start_at} s/d ${r.end_at} (${r.duration_days} Hari)` },
    { header: 'Alasan', accessor: (r: StaffAbsenceReportItem) => r.reason || '-' },
    { header: 'Status', accessor: (r: StaffAbsenceReportItem) => r.status.toUpperCase() },
    { header: 'Reviewer', accessor: (r: StaffAbsenceReportItem) => r.approved_by || '-' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="absence-report-page">
      <ReportHeader
        categoryName="E. Izin & Cuti"
        title="Laporan Izin, Sakit, Cuti & Dinas Luar"
        description="Monitoring pengajuan dispensasi, surat keterangan sakit, cuti tahunan, serta status approval berkas resmi."
        badgeColor="purple"
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
          <option value="ALL">Semua Pemohon</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Jenis Pengajuan</option>
          <option value="permission">Izin</option>
          <option value="sick">Sakit (SKD)</option>
          <option value="leave">Cuti</option>
          <option value="official_duty">Dinas Luar</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="ALL">Semua Status Approval</option>
          <option value="approved">Disetujui (Approved)</option>
          <option value="pending">Menunggu (Pending)</option>
          <option value="rejected">Ditolak (Rejected)</option>
        </select>
      </ReportFilterBar>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden" id="absence-report-table-container">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nama Pemohon & Peran</th>
                <th className="p-4">Jenis</th>
                <th className="p-4">Periode Tanggal</th>
                <th className="p-4">Durasi</th>
                <th className="p-4">Alasan</th>
                <th className="p-4">Status Approval</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4 text-center font-bold text-zinc-400">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.staff_name}</div>
                    <div className="text-[11px] text-zinc-500"><span className="capitalize">{item.staff_type}</span></div>
                  </td>
                  <td className="p-4">
                    {getTypeBadge(item.type)}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">{item.start_at}</div>
                    <div className="text-[11px] text-zinc-500">s/d {item.end_at}</div>
                  </td>
                  <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                    {item.duration_days} Hari
                  </td>
                  <td className="p-4 max-w-[200px] truncate text-zinc-600 dark:text-zinc-400">
                    {item.reason || '-'}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setDetailModalData({
                        title: `Rincian Pengajuan: ${item.staff_name}`,
                        subtitle: `${item.type.toUpperCase()} &bull; ${item.start_at} s/d ${item.end_at}`,
                        data: {
                          nama_pemohon: item.staff_name,
                          peran: item.staff_type,
                          jenis_pengajuan: item.type,
                          tanggal_mulai: item.start_at,
                          tanggal_selesai: item.end_at,
                          total_durasi: `${item.duration_days} Hari Kerja`,
                          alasan_keperluan: item.reason || 'Tidak ada catatan',
                          status_approval: item.status,
                          disetujui_oleh: item.approved_by || 'Menunggu verifikasi',
                          tanggal_pengajuan: item.requested_at || '-',
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
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800 p-3 space-y-3">
          {paginatedItems.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.staff_name}</div>
                  <div className="text-xs text-zinc-500">{item.start_at} s/d ${item.end_at} ({item.duration_days} Hari)</div>
                </div>
                {getStatusBadge(item.status)}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div>Jenis: {getTypeBadge(item.type)}</div>
                <div className="text-zinc-500 truncate max-w-[160px]">{item.reason || '-'}</div>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16 px-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Tidak ada pengajuan ditemukan</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Coba sesuaikan tanggal atau pilihan filter pengajuan izin/cuti.
            </p>
          </div>
        )}

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <ReportPagination
            pagination={{
              page,
              pageSize,
              totalItems: items.length,
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
        title="Laporan Pengajuan Izin, Sakit, Cuti & Dinas Luar"
        periodText={`${dateFrom} s/d ${dateTo}`}
        columns={printColumns}
        data={items}
      />
    </div>
  );
};
