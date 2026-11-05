import React, { useState } from 'react';
import { 
  Cpu, 
  Radio, 
  QrCode, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Server, 
  Plus, 
  Key, 
  RefreshCw, 
  Power, 
  Activity as ActivityIcon, 
  Link2, 
  Unlink, 
  Copy, 
  Check, 
  ShieldAlert, 
  Terminal, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Search, 
  SlidersHorizontal,
  Code,
  FileCode,
  Sparkles,
  Award,
  X
} from 'lucide-react';
import { 
  Activity, 
  AttendanceDevice, 
  AttendanceDeviceLog, 
  AttendanceSession, 
  DeviceMode, 
  DeviceType, 
  User 
} from '../types';
import { RfidAttendanceService } from '../services/rfidAttendanceService';

interface Props {
  devices?: AttendanceDevice[];
  sessions?: AttendanceSession[];
  activities?: Activity[];
  deviceLogs?: AttendanceDeviceLog[];
  currentUser: User;
  onAddDevice: (device: AttendanceDevice, plainSecret: string) => void;
  onUpdateDevice: (device: AttendanceDevice) => void;
  onRotateSecret: (deviceId: number) => { newSecret: string; updatedDevice: AttendanceDevice };
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DevicesView: React.FC<Props> = ({
  devices = [],
  sessions = [],
  activities = [],
  deviceLogs = [],
  currentUser,
  onAddDevice,
  onUpdateDevice,
  onRotateSecret,
  onShowToast,
}) => {
  const safeDevices = devices || [];
  const safeSessions = sessions || [];
  const safeActivities = activities || [];
  const safeDeviceLogs = deviceLogs || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [secretRevealModal, setSecretRevealModal] = useState<{
    isOpen: boolean;
    deviceCode: string;
    deviceName: string;
    secret: string;
    isRotation?: boolean;
  } | null>(null);

  const [sessionAssignModal, setSessionAssignModal] = useState<{
    isOpen: boolean;
    device: AttendanceDevice | null;
  }>({ isOpen: false, device: null });

  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedConfigCode, setCopiedConfigCode] = useState(false);
  const [selectedDeviceForConfig, setSelectedDeviceForConfig] = useState<AttendanceDevice | null>(safeDevices[0] || null);

  // Form State for Add Device
  const [newDeviceCode, setNewDeviceCode] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('rfid_reader');
  const [newLocation, setNewLocation] = useState('Masjid Utama Kampus 1');
  const [newIpAddress, setNewIpAddress] = useState('192.168.1.110');
  const [newDefaultActivityId, setNewDefaultActivityId] = useState<number | ''>(1);

  // Open Sessions
  const openSessions = safeSessions.filter((s) => s && s.status === 'open');

  // Filtered Devices
  const filteredDevices = safeDevices.filter((d) => {
    if (!d) return false;
    const matchesSearch = 
      (d.device_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.device_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.ip_address || '').includes(searchTerm);

    const matchesType = filterType === 'all' || d.device_type === filterType;
    
    const isOnline = RfidAttendanceService.isDeviceOnline(d);
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'online' && isOnline) || 
      (filterStatus === 'offline' && !isOnline) ||
      (filterStatus === 'disabled' && !d.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Handle Add Device
  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceCode.trim() || !newDeviceName.trim()) {
      onShowToast('Kode dan Nama Perangkat wajib diisi.', 'error');
      return;
    }

    // Check duplicate code
    if (devices.some((d) => d.device_code.toUpperCase() === newDeviceCode.trim().toUpperCase())) {
      onShowToast(`Kode perangkat '${newDeviceCode}' sudah digunakan.`, 'error');
      return;
    }

    const plainSecret = RfidAttendanceService.generateDeviceSecret();
    const tokenHash = RfidAttendanceService.hashSecret(plainSecret);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const newDev: AttendanceDevice = {
      id: Date.now(),
      device_code: newDeviceCode.trim().toUpperCase(),
      device_name: newDeviceName.trim(),
      device_type: newDeviceType,
      location: newLocation.trim(),
      api_key_id: `key_${newDeviceCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_live`,
      api_token_hash: tokenHash,
      plain_secret_preview: plainSecret,
      ip_address: newIpAddress.trim(),
      last_seen_at: now,
      firmware_version: '1.2.0',
      is_active: true,
      default_activity_id: newDefaultActivityId ? Number(newDefaultActivityId) : null,
      current_session_id: null,
      mode: 'attendance',
      tap_count_today: 0,
      created_at: now,
      updated_at: now,
    };

    onAddDevice(newDev, plainSecret);
    setIsAddModalOpen(false);
    
    // Reset Form
    setNewDeviceCode('');
    setNewDeviceName('');

    // Open Secret Reveal Modal
    setSecretRevealModal({
      isOpen: true,
      deviceCode: newDev.device_code,
      deviceName: newDev.device_name,
      secret: plainSecret,
      isRotation: false,
    });

    onShowToast(`Perangkat '${newDev.device_name}' berhasil didaftarkan.`, 'success');
  };

  // Handle Rotate Secret
  const handleTriggerSecretRotation = (device: AttendanceDevice) => {
    const confirmRotate = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin me-regenerasi Secret Token untuk ${device.device_code}? Token lama di firmware akan langsung tidak berlaku!`
    );
    if (!confirmRotate) return;

    const { newSecret, updatedDevice } = onRotateSecret(device.id);

    setSecretRevealModal({
      isOpen: true,
      deviceCode: updatedDevice.device_code,
      deviceName: updatedDevice.device_name,
      secret: newSecret,
      isRotation: true,
    });

    onShowToast(`Secret Token untuk ${device.device_code} berhasil diperbarui.`, 'success');
  };

  // Handle Toggle Active
  const handleToggleActive = (device: AttendanceDevice) => {
    const updated: AttendanceDevice = {
      ...device,
      is_active: !device.is_active,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    onUpdateDevice(updated);
    onShowToast(
      `Perangkat ${device.device_code} sekarang berstatus ${updated.is_active ? 'AKTIF' : 'NON-AKTIF'}.`,
      'success'
    );
  };

  // Handle Mode Change
  const handleChangeMode = (device: AttendanceDevice, mode: DeviceMode) => {
    const updated: AttendanceDevice = {
      ...device,
      mode,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    onUpdateDevice(updated);
    onShowToast(`Mode perangkat ${device.device_code} diubah menjadi: ${mode.toUpperCase()}.`, 'success');
  };

  // Handle Assign Session
  const handleAssignSession = (sessionId: number | null) => {
    if (!sessionAssignModal.device) return;

    const device = sessionAssignModal.device;
    const updated: AttendanceDevice = {
      ...device,
      current_session_id: sessionId,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    onUpdateDevice(updated);
    setSessionAssignModal({ isOpen: false, device: null });

    const sessionObj = sessions.find((s) => s.id === sessionId);
    if (sessionId && sessionObj) {
      onShowToast(`Perangkat ${device.device_code} ditautkan ke sesi '${sessionObj.activity_name}'.`, 'success');
    } else {
      onShowToast(`Tautan sesi untuk perangkat ${device.device_code} telah dilepas.`, 'info');
    }
  };

  // Handle Heartbeat Ping Simulation
  const handleSimulateHeartbeat = (device: AttendanceDevice) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updated: AttendanceDevice = {
      ...device,
      last_seen_at: now,
      updated_at: now,
    };
    onUpdateDevice(updated);
    onShowToast(`Heartbeat sinyal diterima dari ${device.device_code} (${now.slice(11, 19)} WIB).`, 'success');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const getGenerateConfigSnippet = (device: AttendanceDevice | null) => {
    if (!device) return '// Pilih perangkat untuk melihat konfigurasi';
    const secret = device.plain_secret_preview || 'sec_live_YOUR_GENERATED_SECRET_HERE';
    return `// ================================================================
// SIUBA ATTENDANCE FIRMWARE CONFIGURATION (ESP32 + RC522)
// Device: ${device.device_name}
// Location: ${device.location}
// ================================================================
#ifndef SIUBA_CONFIG_H
#define SIUBA_CONFIG_H

// WiFi Access Point Settings
#define WIFI_SSID       "SIUBA-PESANTREN-LAN"
#define WIFI_PASSWORD   "PesantrenUtsman2026"

// Local Laravel Attendance Server Gateway
#define SERVER_BASE_URL "http://192.168.1.10:8000"
#define ATTENDANCE_PATH "/api/v1/device/rfid/attendance"
#define HEARTBEAT_PATH  "/api/v1/device/heartbeat"

// Device Authentication Credentials
#define DEVICE_CODE     "${device.device_code}"
#define DEVICE_SECRET   "${secret}"

// Hardware Pin Configuration (ESP32 DevKit v1)
#define SS_PIN          5   // RC522 SDA/SS
#define RST_PIN         22  // RC522 RST
#define BUZZER_PIN      15  // Piezo Buzzer
#define LED_GREEN_PIN   2   // Status Green LED
#define LED_RED_PIN     4   // Status Red LED
#define LED_BLUE_PIN    16  // Status Blue LED (WiFi)

// Telemetry & Rate Limiting
#define FIRMWARE_VERSION "1.2.0"
#define HEARTBEAT_INTERVAL_MS 60000 // 60s
#define CARD_DEBOUNCE_MS      2500  // 2.5s

#endif // SIUBA_CONFIG_H`;
  };

  return (
    <div id="devices-management-container" className="space-y-6 pb-12">
      {/* Header Bento */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
              Hardware Gateway & RFID Terminal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Manajemen Perangkat Terminal & RFID
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Konfigurasi gerbang RFID ESP32/RC522, kredensial token SHA-256, penugasan sesi aktif, telemetri detak jantung (heartbeat), dan audit log terminal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 self-start lg:self-auto">
          <button
            id="btn-add-device"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs rounded-2xl shadow-xs transition-all cursor-pointer min-h-[36px] active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#1F5C45]" />
            <span>Tambah Perangkat Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Perangkat Online</div>
            <div className="text-2xl font-black text-slate-900 font-mono flex items-center gap-2">
              {safeDevices.filter((d) => d && RfidAttendanceService.isDeviceOnline(d)).length}
              <span className="text-xs font-semibold text-emerald-700">/ {safeDevices.length} unit</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <ActivityIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Tap Hari Ini</div>
            <div className="text-2xl font-black text-sky-800 font-mono">
              {safeDevices.reduce((sum, d) => sum + (d?.tap_count_today || 0), 0)}
              <span className="text-xs font-semibold text-slate-400 ml-1">transaksi</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sesi Terhubung</div>
            <div className="text-2xl font-black text-indigo-800 font-mono">
              {safeDevices.filter((d) => d && d.current_session_id !== null && d.current_session_id !== undefined).length}
              <span className="text-xs font-semibold text-slate-400 ml-1">terminal</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LAN Auth Gateway</div>
            <div className="text-sm font-black text-amber-800 font-mono">
              PORT 8000 <span className="text-[10px] text-slate-500 font-bold">REST API</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kode perangkat, nama, lokasi, atau IP LAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Tipe Hardware</option>
            <option value="rfid_reader">RFID Reader (RC522 / ESP32)</option>
            <option value="qr_scanner">QR Scanner Terminal</option>
            <option value="kiosk">Kiosk Interaktif</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="online">Online (Heartbeat Aktif)</option>
            <option value="offline">Offline / Standby</option>
            <option value="disabled">Dinonaktifkan Admin</option>
          </select>
        </div>
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDevices.map((d) => {
          const isOnline = RfidAttendanceService.isDeviceOnline(d);
          const assignedSession = sessions.find((s) => s.id === d.current_session_id);
          const defaultActivity = activities.find((a) => a.id === d.default_activity_id);

          return (
            <div
              key={d.id}
              className={`bg-white p-6 rounded-3xl border transition-all ${
                !d.is_active 
                  ? 'border-rose-200 opacity-75' 
                  : isOnline 
                    ? 'border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400' 
                    : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
              } flex flex-col justify-between space-y-4`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                        {d.device_code}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {d.device_type === 'rfid_reader' ? 'ESP32 + RC522' : d.device_type.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-2">{d.device_name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {d.location}
                    </p>
                  </div>

                  {/* Online / Active Status Badge */}
                  <div className="flex flex-col items-end gap-1.5">
                    {!d.is_active ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        DISABLED
                      </span>
                    ) : isOnline ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ONLINE
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        OFFLINE
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      v{d.firmware_version || '1.2.0'}
                    </span>
                  </div>
                </div>

                {/* Session Link Badge */}
                <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5 text-[11px]">
                      <Link2 className="w-3.5 h-3.5 text-[#1F5C45]" />
                      Sesi Aktif Terkunci:
                    </span>
                    {assignedSession ? (
                      <span className="font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                        {assignedSession.activity_name} ({assignedSession.session_code.slice(-7)})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        {defaultActivity ? `Default: ${defaultActivity.name}` : 'Belum Ditautkan'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 font-sans block text-[10px] font-bold">IP Address LAN:</span>
                      <span className="text-slate-900 font-bold">{d.ip_address}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-sans block text-[10px] font-bold">Heartbeat Terakhir:</span>
                      <span className="text-slate-700">{d.last_seen_at ? d.last_seen_at.slice(11, 19) : '-'} WIB</span>
                    </div>
                  </div>
                </div>

                {/* Mode & Telemetry Chips */}
                <div className="flex items-center justify-between mt-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">Mode:</span>
                    <button
                      onClick={() => handleChangeMode(d, d.mode === 'enrollment' ? 'attendance' : 'enrollment')}
                      className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase border transition-all cursor-pointer ${
                        d.mode === 'enrollment'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Klik untuk ganti mode"
                    >
                      {d.mode || 'attendance'}
                    </button>
                  </div>

                  <div className="text-slate-500 font-mono text-[11px]">
                    Throughput: <span className="font-bold text-slate-900">{d.tap_count_today || 0}</span> tap
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSessionAssignModal({ isOpen: true, device: d })}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Tautkan ke Sesi Absensi"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#1F5C45]" />
                    <span>{d.current_session_id ? 'Ganti Sesi' : 'Tautkan Sesi'}</span>
                  </button>

                  <button
                    onClick={() => handleTriggerSecretRotation(d)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Regenerasi Secret Key Token"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-700" />
                    <span>Rotate Token</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDeviceForConfig(d);
                      const el = document.getElementById('esp32-config-snippet-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer transition"
                    title="Lihat Snippet config.h C++"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSimulateHeartbeat(d)}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 cursor-pointer transition"
                    title="Kirim Sinyal Ping Heartbeat"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(d)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      d.is_active 
                        ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200' 
                        : 'bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                    title={d.is_active ? 'Non-aktifkan Perangkat' : 'Aktifkan Perangkat'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ESP32 Firmware Snippet Generator Bento */}
      <div id="esp32-config-snippet-section" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Header Config Generator (<span className="font-mono text-[#1F5C45]">config.h</span>)
              </h3>
              <p className="text-xs text-slate-500">
                Generate kode konfigurasi C++ siap pakai untuk di-flash ke mikrokontroler ESP32 DevKit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDeviceForConfig?.id || ''}
              onChange={(e) => {
                const found = devices.find((d) => d.id === Number(e.target.value));
                if (found) setSelectedDeviceForConfig(found);
              }}
              className="bg-slate-50 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_code} - {d.device_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                navigator.clipboard.writeText(getGenerateConfigSnippet(selectedDeviceForConfig));
                setCopiedConfigCode(true);
                setTimeout(() => setCopiedConfigCode(false), 2000);
                onShowToast('Kode config.h berhasil disalin ke clipboard.', 'success');
              }}
              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              {copiedConfigCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedConfigCode ? 'Tersalin' : 'Copy Header'}</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64 leading-relaxed shadow-inner">
            {getGenerateConfigSnippet(selectedDeviceForConfig)}
          </pre>
        </div>
      </div>

      {/* Device Event & Audit Logs Bento */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#1F5C45]" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Log Kejadian & Audit Perangkat Hardware
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {deviceLogs.length} kejadian tercatat
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Waktu (WIB)</th>
                <th className="p-3.5">Perangkat</th>
                <th className="p-3.5">Tipe Event</th>
                <th className="p-3.5">Level</th>
                <th className="p-3.5">Pesan / Telemetri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {deviceLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">{log.created_at}</td>
                  <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{log.device_code}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {log.event_type}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.level === 'error'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : log.level === 'warning'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700 font-sans max-w-md truncate">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Tambah Perangkat Baru                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#1F5C45]" />
                Registrasi Perangkat Terminal Baru
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kode Perangkat *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MSJ-RFID-03"
                    value={newDeviceCode}
                    onChange={(e) => setNewDeviceCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 text-slate-900 font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipe Hardware</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value as DeviceType)}
                    className="w-full bg-slate-50 text-slate-900 font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="rfid_reader">RFID Reader (ESP32 / RC522)</option>
                    <option value="qr_scanner">QR Scanner Terminal</option>
                    <option value="kiosk">Kiosk Interaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Perangkat *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RFID Gerbang Masjid Pintu Selatan"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Lokasi Pemasangan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Masjid Utama Lt. 1"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Alokasi IP LAN *</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.110"
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Default Kegiatan Terkait</label>
                <select
                  value={newDefaultActivityId}
                  onChange={(e) => setNewDefaultActivityId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 text-slate-900 font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Kegiatan Default --</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Saat perangkat dibuat, sistem akan otomatis menghasilkan <strong>High-Entropy Secret Key</strong> yang hanya ditampilkan <strong>satu kali</strong>. Database hanya menyimpan hash SHA-256 demi keamanan.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  Buat & Generate Secret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: One-Time Secret Key Reveal                                         */}
      {/* ========================================================================= */}
      {secretRevealModal && secretRevealModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {secretRevealModal.isRotation ? 'Secret Key Di-Regenerasi' : 'Kredensial Perangkat Baru'}
                </h3>
                <p className="text-xs text-slate-500 font-mono font-bold">{secretRevealModal.deviceCode}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
              <div className="font-black flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                SIMPAN KUNCI RAHASIA INI SEKARANG
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                Kunci rahasia ini hanya ditampilkan <strong>satu kali saja</strong>. Salin dan masukkan ke dalam file <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">config.h</code> firmware ESP32.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Device Secret Key:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={secretRevealModal.secret}
                  className="w-full bg-slate-100 text-emerald-800 font-mono font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(secretRevealModal.secret)}
                  className="px-4 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSecret ? 'Tersalin' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSecretRevealModal(null)}
                className="px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl cursor-pointer active:scale-95 shadow-xs"
              >
                Saya Sudah Menyimpan Secret Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Assign Session to Device                                           */}
      {/* ========================================================================= */}
      {sessionAssignModal.isOpen && sessionAssignModal.device && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-[#1F5C45]" />
                  Tautkan Sesi Absensi
                </h3>
                <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                  {sessionAssignModal.device.device_code} - {sessionAssignModal.device.device_name}
                </p>
              </div>
              <button
                onClick={() => setSessionAssignModal({ isOpen: false, device: null })}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">
                Pilih sesi absensi yang sedang berstatus <strong className="text-emerald-700">OPEN</strong> untuk dikaitkan dengan terminal ini:
              </p>

              {openSessions.length === 0 ? (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="font-bold text-slate-700">Tidak ada sesi absensi yang sedang dibuka.</p>
                  <p className="text-[11px] text-slate-500">
                    Buka sesi terlebih dahulu di menu <strong>Sesi Absensi</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {openSessions.map((s) => {
                    const isSelected = sessionAssignModal.device?.current_session_id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleAssignSession(s.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="font-black text-slate-900 text-xs">{s.activity_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Kode: {s.session_code} &bull; Lokasi: {s.location}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {sessionAssignModal.device.current_session_id && (
                <button
                  type="button"
                  onClick={() => handleAssignSession(null)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Lepas Tautan Sesi Saat Ini</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

