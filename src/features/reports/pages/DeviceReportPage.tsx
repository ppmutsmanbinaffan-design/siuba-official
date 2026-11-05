import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Search, 
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
  ShieldCheck,
  Cpu,
  Activity as ActivityIcon,
  Wifi,
  WifiOff,
  AlertTriangle,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  User, 
  AttendanceDevice,
  AttendanceDeviceLog
} from '../../../types';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportPagination } from '../components/ReportPagination';
import { ReportDetailModal } from '../components/ReportDetailModal';
import { ReportPrintView } from '../components/ReportPrintView';
import { ActiveFilterChip, PaginationState } from '../types';

interface Props {
  currentUser: User;
  devices?: AttendanceDevice[];
  deviceLogs?: AttendanceDeviceLog[];
  initialFilters?: Record<string, any>;
  onBackToHub: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DeviceReportPage: React.FC<Props> = ({
  currentUser,
  devices = [],
  deviceLogs = [],
  initialFilters = {} as Record<string, any>,
  onBackToHub,
  onShowToast,
}) => {
  const [subView, setSubView] = useState<'devices' | 'logs' | 'anomalies'>('devices');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || '');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.status || 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>(initialFilters.type || 'ALL');

  const [detailModalData, setDetailModalData] = useState<{ title: string; subtitle?: string; data: Record<string, any> } | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const allDevices = useMemo(() => {
    if (devices.length > 0) return devices;
    return [
      {
        id: 1,
        device_code: 'DEV-RFID-MASJID-01',
        device_name: 'ESP32 RFID Gerbang Masjid Utama',
        device_type: 'rfid_fixed' as const,
        device_mode: 'rfid' as const,
        location_label: 'Gerbang Masjid Utama',
        ip_address: '192.168.1.101',
        status: 'online' as const,
        is_active: true,
        last_ping_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        firmware_version: 'v2.4.1-rc3',
      },
      {
        id: 2,
        device_code: 'DEV-QR-KBM-01',
        device_name: 'Kiosk QR Scanner Gedung Kelas A',
        device_type: 'qr_kiosk' as const,
        device_mode: 'qr' as const,
        location_label: 'Lobi Kelas Abu Bakar',
        ip_address: '192.168.1.102',
        status: 'online' as const,
        is_active: true,
        last_ping_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        firmware_version: 'v1.8.0',
      },
      {
        id: 3,
        device_code: 'DEV-DUAL-ASRAMA-01',
        device_name: 'Dual Reader RFID/QR Asrama Umar',
        device_type: 'dual_kiosk' as const,
        device_mode: 'dual' as const,
        location_label: 'Pintu Masuk Asrama Umar',
        ip_address: '192.168.1.103',
        status: 'online' as const,
        is_active: true,
        last_ping_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        firmware_version: 'v3.0.1',
      },
      {
        id: 4,
        device_code: 'DEV-RFID-KANTIN-01',
        device_name: 'Tap RFID Kantin & Aula',
        device_type: 'rfid_fixed' as const,
        device_mode: 'rfid' as const,
        location_label: 'Aula Pertemuan',
        ip_address: '192.168.1.104',
        status: 'offline' as const,
        is_active: true,
        last_ping_at: '2026-08-28 17:30:00',
        firmware_version: 'v2.1.0',
      }
    ];
  }, [devices]);

  const allLogs = useMemo(() => {
    if (deviceLogs.length > 0) return deviceLogs;
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return [
      {
        id: 1,
        device_id: 1,
        event_type: 'TAP_SUCCESS',
        payload_preview: 'UID: 04:A2:3B:5C:7E (Ahmad Fauzi)',
        response_code: 200,
        status: 'SUCCESS',
        ip_address: '192.168.1.101',
        created_at: nowStr,
      },
      {
        id: 2,
        device_id: 2,
        event_type: 'QR_SCAN_SUCCESS',
        payload_preview: 'QR: SIUBA-STU-20260192',
        response_code: 200,
        status: 'SUCCESS',
        ip_address: '192.168.1.102',
        created_at: nowStr,
      },
      {
        id: 3,
        device_id: 1,
        event_type: 'DUPLICATE_TAP_BLOCKED',
        payload_preview: 'UID: 04:A2:3B:5C:7E (Cooldown Active)',
        response_code: 429,
        status: 'BLOCKED',
        ip_address: '192.168.1.101',
        created_at: nowStr,
      },
      {
        id: 4,
        device_id: 4,
        event_type: 'PING_TIMEOUT',
        payload_preview: 'Heartbeat ping failed after 3 retries',
        response_code: 504,
        status: 'ERROR',
        ip_address: '192.168.1.104',
        created_at: '2026-08-28 17:30:00',
      }
    ];
  }, [deviceLogs]);

  const filteredDevices = useMemo(() => {
    return allDevices.filter((d) => {
      const matchSearch = !searchQuery.trim() || 
        d.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.device_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.location_label && d.location_label.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchType = typeFilter === 'ALL' || d.device_mode === typeFilter || d.device_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [allDevices, searchQuery, statusFilter, typeFilter]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const matchSearch = !searchQuery.trim() || 
        log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.payload_preview && log.payload_preview.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.ip_address && log.ip_address.includes(searchQuery));
      
      const matchStatus = statusFilter === 'ALL' || log.status === statusFilter;

      if (subView === 'anomalies') {
        return matchSearch && (log.status === 'ERROR' || log.status === 'BLOCKED' || log.event_type.includes('BLOCKED') || log.event_type.includes('TIMEOUT'));
      }

      return matchSearch && matchStatus;
    });
  }, [allLogs, searchQuery, statusFilter, subView]);

  const metrics = useMemo(() => {
    const total = allDevices.length;
    const online = allDevices.filter((d) => d.status === 'online').length;
    const offline = allDevices.filter((d) => d.status === 'offline' || d.status === 'error').length;
    const anomalies = allLogs.filter((l) => l.status === 'ERROR' || l.status === 'BLOCKED').length;

    return { total, online, offline, anomalies };
  }, [allDevices, allLogs]);

  const currentItems = subView === 'devices' ? filteredDevices : filteredLogs;
  const pagination: PaginationState = useMemo(() => {
    const totalItems = currentItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    return { page, pageSize, totalItems, totalPages };
  }, [currentItems.length, page, pageSize]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentItems.slice(start, start + pageSize);
  }, [currentItems, page, pageSize]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: 'Pencarian', valueDisplay: `"${searchQuery}"` });
    }
    if (statusFilter !== 'ALL') {
      chips.push({ key: 'status', label: 'Status', valueDisplay: statusFilter.toUpperCase() });
    }
    if (typeFilter !== 'ALL') {
      chips.push({ key: 'type', label: 'Tipe Mesin', valueDisplay: typeFilter.toUpperCase() });
    }
    return chips;
  }, [searchQuery, statusFilter, typeFilter]);

  const handleClearFilter = (key: string) => {
    if (key === 'search') setSearchQuery('');
    if (key === 'status') setStatusFilter('ALL');
    if (key === 'type') setTypeFilter('ALL');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPage(1);
  };

  const handleExport = (format: 'csv' | 'print') => {
    if (format === 'print') {
      setIsPrintOpen(true);
      return;
    }

    setIsExporting(true);
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      if (subView === 'devices') {
        csvContent += 'ID,Kode Perangkat,Nama Perangkat,Tipe,Mode,Lokasi,IP Address,Status,Firmware,Last Ping\n';
        filteredDevices.forEach((d) => {
          csvContent += `"${d.id}","${d.device_code}","${d.device_name}","${d.device_type}","${d.device_mode}","${d.location_label || '-'}","${d.ip_address || '-'}","${d.status}","${d.firmware_version || '-'}","${d.last_ping_at || '-'}"\n`;
        });
      } else {
        csvContent += 'ID,Waktu,Event Type,Payload Preview,Status,Response Code,IP Address\n';
        filteredLogs.forEach((l: any) => {
          csvContent += `"${l.id}","${l.created_at || '-'}","${l.event_type}","${l.payload_preview || '-'}","${l.status}","${l.response_code || '-'}","${l.ip_address || '-'}"\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SIUBA_Laporan_Perangkat_${subView}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast?.('Laporan perangkat berhasil diekspor ke CSV.', 'success');
    } catch {
      onShowToast?.('Gagal mengekspor data laporan.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="device-report-page">
      <ReportHeader
        title="Laporan Perangkat & Operasional IoT"
        subtitle="Monitoring status mesin tap RFID ESP32, Kiosk Scanner QR, log transaksi pemindaian, dan deteksi anomali jaringan."
        categoryBadge="Infrastruktur & IoT"
        categoryColor="rose"
        icon={Radio}
        onBackToHub={onBackToHub}
        onExport={() => handleExport('csv')}
        onPrint={() => handleExport('print')}
        isExporting={isExporting}
      />

      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <button
          onClick={() => { setSubView('devices'); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subView === 'devices'
              ? 'bg-[#1F5C45] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Status Mesin & Scanner ({allDevices.length})</span>
        </button>

        <button
          onClick={() => { setSubView('logs'); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subView === 'logs'
              ? 'bg-[#1F5C45] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Log Transaksi Tap Raw ({allLogs.length})</span>
        </button>

        <button
          onClick={() => { setSubView('anomalies'); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subView === 'anomalies'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Deteksi Anomali & Duplikasi ({metrics.anomalies})</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Mesin Presensi</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">{metrics.total}</span>
            <Cpu className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mesin Online (Aktif)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{metrics.online}</span>
            <Wifi className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mesin Offline / Terputus</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{metrics.offline}</span>
            <WifiOff className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Log Anomali & Duplikasi</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{metrics.anomalies}</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      <ReportFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeChips={activeChips}
        onClearChip={handleClearFilter}
        onResetAll={handleResetFilters}
        totalResults={currentItems.length}
      >
        <div className="flex flex-wrap items-center gap-3">
          {subView === 'devices' && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Tipe / Mode Mesin</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs outline-none"
              >
                <option value="ALL">Semua Tipe Mesin</option>
                <option value="rfid">RFID Reader (ESP32)</option>
                <option value="qr">Kiosk QR Scanner</option>
                <option value="dual">Dual Engine (RFID + QR)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Status Operasional</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs outline-none"
            >
              <option value="ALL">Semua Status</option>
              {subView === 'devices' ? (
                <>
                  <option value="online">Online (Terhubung)</option>
                  <option value="offline">Offline (Terputus)</option>
                  <option value="error">Error / Anomali</option>
                </>
              ) : (
                <>
                  <option value="SUCCESS">Success (Berhasil)</option>
                  <option value="BLOCKED">Blocked (Duplikasi Ditahan)</option>
                  <option value="ERROR">Error (Timeout / Invalid)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </ReportFilterBar>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        {subView === 'devices' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800 dark:text-zinc-200">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Kode & Nama Mesin</th>
                  <th className="py-3.5 px-4">Tipe & Mode</th>
                  <th className="py-3.5 px-4">Lokasi Penempatan</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Heartbeat</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-zinc-500">
                      Tidak ada data perangkat yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as AttendanceDevice[]).map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{d.device_name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{d.device_code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-[11px]">
                          {d.device_mode ? d.device_mode.toUpperCase() : 'RFID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{d.location_label || '-'}</td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">{d.ip_address || '-'}</td>
                      <td className="py-3 px-4">
                        {d.status === 'online' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-[11px]">{d.last_ping_at || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setDetailModalData({
                            title: d.device_name,
                            subtitle: `Kode: ${d.device_code} | Lokasi: ${d.location_label || '-'}`,
                            data: {
                              'Kode Perangkat': d.device_code,
                              'Nama Mesin': d.device_name,
                              'Tipe / Kategori': d.device_type,
                              'Mode Pemindaian': d.device_mode,
                              'Lokasi Penempatan': d.location_label || '-',
                              'IP Address LAN': d.ip_address || '-',
                              'Status Jaringan': d.status.toUpperCase(),
                              'Firmware Version': d.firmware_version || 'v1.0.0',
                              'Terakhir Terhubung': d.last_ping_at || '-',
                            }
                          })}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-[#1F5C45] hover:text-white transition-colors cursor-pointer"
                          title="Lihat Detail Perangkat"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800 dark:text-zinc-200">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Waktu Pemindaian</th>
                  <th className="py-3.5 px-4">Tipe Event</th>
                  <th className="py-3.5 px-4">Payload Kartu / Token</th>
                  <th className="py-3.5 px-4">Status & Respon</th>
                  <th className="py-3.5 px-4">IP Mesin</th>
                  <th className="py-3.5 px-4 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-500">
                      Tidak ada catatan log transaksi yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as AttendanceDeviceLog[]).map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        {log.created_at || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{log.event_type}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {log.payload_preview || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {log.status === 'SUCCESS' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            SUCCESS ({log.response_code || 200})
                          </span>
                        ) : log.status === 'BLOCKED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            BLOCKED ({log.response_code || 429})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            ERROR ({log.response_code || 500})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{log.ip_address || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setDetailModalData({
                            title: `Log Pemindaian #${log.id}`,
                            subtitle: `${log.event_type} | ${log.created_at || '-'}`,
                            data: {
                              'ID Log': log.id,
                              'Waktu Event': log.created_at || '-',
                              'Jenis Event': log.event_type,
                              'Payload / UID': log.payload_preview || '-',
                              'Status Respon': log.status,
                              'HTTP Code': log.response_code || 200,
                              'IP Address Perangkat': log.ip_address || '-',
                            }
                          })}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-[#1F5C45] hover:text-white transition-colors cursor-pointer"
                          title="Lihat Detail Log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <ReportPagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
        />
      </div>

      {detailModalData && (
        <ReportDetailModal
          isOpen={Boolean(detailModalData)}
          onClose={() => setDetailModalData(null)}
          title={detailModalData.title}
          subtitle={detailModalData.subtitle}
          data={detailModalData.data}
        />
      )}

      {isPrintOpen && (
        <ReportPrintView
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          reportTitle="Laporan Infrastruktur & Status Perangkat Presensi"
          subtitle={`Pesantren Utsman Bin Affan • Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`}
          tableHeaders={
            subView === 'devices' 
              ? ['Kode', 'Nama Mesin', 'Tipe', 'Lokasi', 'IP Address', 'Status', 'Last Ping']
              : ['Waktu', 'Event Type', 'Payload Data', 'Status', 'HTTP Code', 'IP Mesin']
          }
          tableRows={
            subView === 'devices'
              ? filteredDevices.map((d) => [
                  d.device_code,
                  d.device_name,
                  d.device_mode.toUpperCase(),
                  d.location_label || '-',
                  d.ip_address || '-',
                  d.status.toUpperCase(),
                  d.last_ping_at || '-'
                ])
              : filteredLogs.map((l: any) => [
                  l.created_at || '-',
                  l.event_type,
                  l.payload_preview || '-',
                  l.status,
                  String(l.response_code || '-'),
                  l.ip_address || '-'
                ])
          }
        />
      )}
    </div>
  );
};
