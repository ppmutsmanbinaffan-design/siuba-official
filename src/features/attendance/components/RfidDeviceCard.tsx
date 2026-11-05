import React from 'react';
import { Radio, MapPin, Clock, AlertTriangle, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { AttendanceDevice, AttendanceDeviceLog } from '../types';
import { DeviceStatusBadge } from './DeviceStatusBadge';
import { getDeviceStatus, maskRfidUid, formatAttendanceTime } from '../utils/attendanceUtils';

interface RfidDeviceCardProps {
  device: AttendanceDevice;
  latestLog?: AttendanceDeviceLog;
  assignedSessionName?: string;
  onViewLogs?: (deviceId: number) => void;
}

export const RfidDeviceCard: React.FC<RfidDeviceCardProps> = ({
  device,
  latestLog,
  assignedSessionName,
  onViewLogs,
}) => {
  const status = getDeviceStatus(device);

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:shadow-md transition-all space-y-3.5 shadow-2xs">
      {/* Top Header: Device Name & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            status === 'online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
              {device.device_name}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">{device.device_code}</span>
              <span>•</span>
              <span className="text-slate-400">{device.ip_address || '192.168.1.xxx'}</span>
            </div>
          </div>
        </div>
        <DeviceStatusBadge status={status} />
      </div>

      {/* Location & Context */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Lokasi:</span>
          </span>
          <strong className="text-slate-900 font-bold">{device.location || 'Kampus Utama'}</strong>
        </div>

        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Sesi Ditugaskan:</span>
          </span>
          <span className="text-emerald-800 font-bold truncate max-w-[160px]">
            {assignedSessionName || 'Otomatis Sesuai Jadwal'}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Terakhir Terlihat:</span>
          </span>
          <span className="font-mono text-slate-700 font-semibold">
            {formatAttendanceTime(device.last_seen_at)} WIB
          </span>
        </div>
      </div>

      {/* Latest Event / Scan Log */}
      {latestLog && (
        <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70 text-xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Aktivitas Terakhir</span>
            <p className="text-slate-900 font-bold truncate text-[11px] mt-0.5">{latestLog.message}</p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            {formatAttendanceTime(latestLog.created_at)}
          </span>
        </div>
      )}

      {/* Disabled Warning */}
      {!device.is_active && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Perangkat ini dinonaktifkan oleh administrator.</span>
        </div>
      )}

      {/* Footer Details */}
      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
        <span>Firmware: {device.firmware_version || 'v2.1-esp32'}</span>
        <span className="text-emerald-700 font-semibold">ESP32 REST Ready</span>
      </div>
    </div>
  );
};
