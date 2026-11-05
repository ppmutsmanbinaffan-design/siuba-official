import React, { useEffect, useState, useCallback } from 'react';
import { 
  Radio, 
  RefreshCw, 
  Cpu, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Wifi, 
  WifiOff, 
  ArrowLeft,
  Filter,
  Sparkles
} from 'lucide-react';
import { ResponsiveTable } from '../../../components/ui/ResponsiveTable';
import { attendanceApi } from '../api/attendanceApi';
import { AttendanceDevice, AttendanceDeviceLog } from '../types';
import { RfidDeviceCard } from '../components/RfidDeviceCard';
import { DeviceStatusBadge } from '../components/DeviceStatusBadge';
import { getDeviceStatus, maskRfidUid, formatAttendanceTime } from '../utils/attendanceUtils';

interface RfidMonitoringPageProps {
  onBack?: () => void;
}

export const RfidMonitoringPage: React.FC<RfidMonitoringPageProps> = ({
  onBack,
}) => {
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [logs, setLogs] = useState<AttendanceDeviceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | 'all'>('all');

  const loadData = useCallback(async () => {
    try {
      const [devicesData, logsData] = await Promise.all([
        attendanceApi.getRfidDevices(),
        attendanceApi.getDeviceLogs(selectedDeviceId === 'all' ? undefined : selectedDeviceId),
      ]);
      setDevices(devicesData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load RFID monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const onlineCount = devices.filter((d) => getDeviceStatus(d) === 'online').length;
  const offlineCount = devices.filter((d) => getDeviceStatus(d) === 'offline').length;
  const disabledCount = devices.filter((d) => getDeviceStatus(d) === 'disabled').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* SIUBA Emerald Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 sm:p-7 shadow-md border border-[#164735]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/15 border border-white/20 text-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Hardware Gate & IoT Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Monitoring Terminal RFID ESP32
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
              Status konektivitas gate hardware, sinkronisasi terminal tap kartu santri, dan live audit log pembacaan RFID.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer active:scale-95 ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-black/30 text-slate-300 border-white/15 hover:bg-black/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? 'Auto-Refresh (5s)' : 'Paused'}</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition backdrop-blur-xs cursor-pointer active:scale-95 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black px-4 py-2 rounded-xl text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#1F5C45]" />
                <span>Kembali</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Total Terminal</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{devices.length}</div>
            <span className="text-[11px] text-slate-400 font-medium">Perangkat Terdaftar</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Terminal Online</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{onlineCount}</div>
            <span className="text-[11px] text-emerald-700 font-medium">Siap Melayani Tap</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Terminal Offline</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">{offlineCount}</div>
            <span className="text-[11px] text-amber-700 font-medium">Perlu Pengecekan</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <WifiOff className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Non-Aktif</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{disabledCount}</div>
            <span className="text-[11px] text-rose-600 font-medium">Dinonaktifkan Admin</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Terminal Cards Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
            Daftar Perangkat RFID Gate ({devices.length})
          </h3>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            Protokol: ESP32 REST / MQTT TLS
          </span>
        </div>

        {devices.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-300 shadow-2xs">
            <Radio className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">Belum Ada Terminal RFID Terdaftar</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Perangkat hardware ESP32 / RFID Gate yang terhubung ke jaringan akan muncul secara otomatis pada daftar ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const latest = logs.find((l) => l.attendance_device_id === device.id);
              return (
                <RfidDeviceCard
                  key={device.id}
                  device={device}
                  latestLog={latest}
                  assignedSessionName="Sesi Otomatis Sesuai Jadwal"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Live Event Stream / Audit Logs */}
      <div className="space-y-3.5 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" />
              <span>Live Tap Stream Log ({logs.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Audit log setiap pembacaan kartu RFID yang diterima server secara real-time.</p>
          </div>

          {/* Filter by Device */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label="Filter Perangkat Terminal"
              className="bg-white text-xs font-bold text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px] shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Perangkat Terminal</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_name} ({d.device_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ResponsiveTable<AttendanceDeviceLog>
            data={logs}
            keyExtractor={(l) => String(l.id)}
            columns={[
              {
                key: 'time',
                header: 'Waktu Tap',
                render: (l) => (
                  <div className="text-xs font-mono font-bold text-slate-700">
                    {formatAttendanceTime(l.created_at)} WIB
                  </div>
                ),
              },
              {
                key: 'device',
                header: 'Terminal & Lokasi',
                render: (l) => {
                  const dev = devices.find((d) => d.id === l.attendance_device_id);
                  return (
                    <div className="text-xs">
                      <strong className="text-slate-900 block font-bold">{dev?.device_name || 'Terminal Gate'}</strong>
                      <span className="text-slate-500">{dev?.location || 'Utama'}</span>
                    </div>
                  );
                },
              },
              {
                key: 'uid',
                header: 'UID Kartu (Masked)',
                render: (l) => (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {maskRfidUid((l as any).payload?.card_uid || (l as any).payload?.uid || l.metadata?.card_uid || l.metadata?.uid || '04A81234')}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Pesan / Status Respon',
                render: (l) => {
                  const isSuccess = l.status === 'success' || l.level === 'info';
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      {isSuccess ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span className={isSuccess ? 'text-slate-800 font-semibold' : 'text-amber-800 font-bold'}>
                        {l.message}
                      </span>
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
