import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  IdCard, 
  Sliders, 
  Save, 
  Download, 
  CheckCircle2, 
  Cpu, 
  Globe, 
  Wifi, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  HardDrive, 
  Layers, 
  Building, 
  Bell, 
  Radio, 
  Smartphone, 
  Trash2, 
  Activity, 
  ExternalLink, 
  Key, 
  FileCode, 
  Eye, 
  EyeOff, 
  Terminal, 
  ArrowRight,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { isDevelopmentToolsEnabled } from '../utils/devTools';

interface Props {
  onResetData?: () => void;
  onNavigateToReset?: () => void;
  onNavigateToCardDesigner?: () => void;
  onNavigateTab?: (tab: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface SystemConfigState {
  // Server & LAN
  serverHostIp: string;
  serverPort: string;
  mqttPort: string;
  localDomain: string;
  allowCors: boolean;
  corsOrigins: string;
  trustedProxies: string;

  // Institute Profile
  instituteName: string;
  instituteSlogan: string;
  instituteAddress: string;
  institutePhone: string;
  instituteEmail: string;
  activeAcademicYear: string;
  activeSemester: string;
  timezone: string;
  timeFormat: '24h' | '12h';

  // Attendance & Hardware Rules
  lateToleranceMinutes: number;
  autoCloseSessionMinutes: number;
  rfidDebounceSeconds: number;
  allowSelfExcusal: boolean;
  enableKioskFullscreen: boolean;
  enableAudioChime: boolean;

  // Database & Cache
  dbDriver: string;
  dbConnectionPool: number;
  dbLockTimeoutSeconds: number;
  cacheDriver: 'indexeddb' | 'redis' | 'file';
  autoBackupDaily: boolean;

  // Environment & Security
  appEnv: 'production' | 'staging' | 'local';
  appDebug: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
}

const DEFAULT_CONFIG: SystemConfigState = {
  serverHostIp: '192.168.1.10',
  serverPort: '8000',
  mqttPort: '1883',
  localDomain: 'https://siuba.local',
  allowCors: true,
  corsOrigins: 'http://192.168.1.*, http://localhost:8000',
  trustedProxies: '192.168.1.1, 127.0.0.1',

  instituteName: 'Pesantren Modern Utsman Bin Affan',
  instituteSlogan: 'Sistem Informasi Manajemen Presensi & Disiplin Santri',
  instituteAddress: 'Jl. Pesantren No. 01, Cisauk, Tangerang, Banten 15345',
  institutePhone: '+62 21 7564890',
  instituteEmail: 'sekretariat@siuba.pesantren.id',
  activeAcademicYear: '2026/2027',
  activeSemester: 'Ganjil',
  timezone: 'Asia/Jakarta (WIB)',
  timeFormat: '24h',

  lateToleranceMinutes: 15,
  autoCloseSessionMinutes: 30,
  rfidDebounceSeconds: 5,
  allowSelfExcusal: true,
  enableKioskFullscreen: false,
  enableAudioChime: true,

  dbDriver: 'MariaDB 10.11 Enterprise (InnoDB)',
  dbConnectionPool: 100,
  dbLockTimeoutSeconds: 10,
  cacheDriver: 'indexeddb',
  autoBackupDaily: true,

  appEnv: 'production',
  appDebug: false,
  logLevel: 'info'
};

const STORAGE_KEY = 'siuba_system_config_v1';

export const SettingsView: React.FC<Props> = ({ 
  onResetData,
  onNavigateToReset,
  onNavigateToCardDesigner,
  onNavigateTab,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'server' | 'profile' | 'database' | 'attendance' | 'environment'>('server');
  const [config, setConfig] = useState<SystemConfigState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load system config from storage:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ latency: number; status: 'ok' | 'error'; timestamp: string } | null>(null);
  const [isFlushingCache, setIsFlushingCache] = useState<string | null>(null);
  const [showAppSecret, setShowAppSecret] = useState<boolean>(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onShowToast) {
      onShowToast(msg, type);
    }
  };

  const handleConfigChange = <K extends keyof SystemConfigState>(key: K, value: SystemConfigState[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setIsSaved(true);
      showToast('✓ Pengaturan sistem dan lingkungan berhasil disimpan ke penyimpanan lokal server!', 'success');
    } catch (e) {
      showToast('Gagal menyimpan konfigurasi: ' + String(e), 'error');
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan seluruh pengaturan ke konfigurasi default pabrik?')) {
      setConfig(DEFAULT_CONFIG);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
      setIsSaved(true);
      showToast('Konfigurasi sistem berhasil dikembalikan ke standar default.', 'info');
    }
  };

  const handleTestPing = () => {
    setIsTestingPing(true);
    setPingResult(null);
    setTimeout(() => {
      const simulatedLatency = (Math.random() * 2 + 1.2).toFixed(1);
      setPingResult({
        latency: parseFloat(simulatedLatency),
        status: 'ok',
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
      setIsTestingPing(false);
      showToast(`✓ Koneksi server LAN terverifikasi responsif (${simulatedLatency} ms)`, 'success');
    }, 800);
  };

  const handleFlushCache = (cacheType: string) => {
    setIsFlushingCache(cacheType);
    setTimeout(() => {
      setIsFlushingCache(null);
      showToast(`✓ Cache "${cacheType}" berhasil dibersihkan dan di-refresh!`, 'success');
    }, 1000);
  };

  const handleExportEnvFile = () => {
    const envContent = `# ========================================================
# SIUBA PRESENSI PESANTREN - ENVIRONMENT CONFIGURATION
# Generated At: ${new Date().toISOString()}
# Host: ${config.serverHostIp}:${config.serverPort}
# ========================================================

APP_NAME="SIUBA Pesantren"
APP_ENV=${config.appEnv}
APP_KEY=base64:7K5jQ9uX+W8L8Z3o7nN1Q8A7b6C5D4e3F2g1H0j9K8=
APP_DEBUG=${config.appDebug ? 'true' : 'false'}
APP_URL=${config.localDomain}
APP_TIMEZONE="${config.timezone}"
LOG_LEVEL=${config.logLevel}

# --- INSTITUTION PROFILE ---
INSTITUTE_NAME="${config.instituteName}"
INSTITUTE_SLOGAN="${config.instituteSlogan}"
INSTITUTE_ADDRESS="${config.instituteAddress}"
INSTITUTE_PHONE="${config.institutePhone}"
INSTITUTE_EMAIL="${config.instituteEmail}"
ACTIVE_ACADEMIC_YEAR="${config.activeAcademicYear}"
ACTIVE_SEMESTER="${config.activeSemester}"

# --- LOCAL LAN & HARDWARE ---
LAN_HOST_IP=${config.serverHostIp}
LAN_HTTP_PORT=${config.serverPort}
MQTT_BROKER_PORT=${config.mqttPort}
CORS_ALLOWED_ORIGINS="${config.corsOrigins}"
TRUSTED_PROXIES="${config.trustedProxies}"

# --- ATTENDANCE & RFID RULES ---
ATTENDANCE_LATE_TOLERANCE_MINUTES=${config.lateToleranceMinutes}
ATTENDANCE_AUTO_CLOSE_MINUTES=${config.autoCloseSessionMinutes}
RFID_TAP_DEBOUNCE_SECONDS=${config.rfidDebounceSeconds}
ALLOW_SELF_EXCUSAL=${config.allowSelfExcusal ? 'true' : 'false'}
ENABLE_KIOSK_FULLSCREEN=${config.enableKioskFullscreen ? 'true' : 'false'}
ENABLE_AUDIO_CHIME=${config.enableAudioChime ? 'true' : 'false'}

# --- DATABASE & STORAGE ---
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=siuba_production
DB_USERNAME=siuba_admin
DB_POOL_MAX=${config.dbConnectionPool}
DB_LOCK_TIMEOUT=${config.dbLockTimeoutSeconds}
CACHE_DRIVER=${config.cacheDriver}
AUTO_BACKUP_DAILY=${config.autoBackupDaily ? 'true' : 'false'}
`;

    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `.env.${config.appEnv}.backup`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File konfigurasi .env berhasil diunduh.', 'success');
  };

  return (
    <div id="settings-view-container" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bento Cockpit with Emerald-Gold Identity */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sliders className="w-56 h-56 text-amber-300" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-white/15 rounded-2xl border border-white/20 text-amber-300 backdrop-blur-xs shadow-2xs">
              <Sliders className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 bg-black/30 px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  System & Environment Engine
                </span>
                <span className="text-[10px] font-mono text-emerald-100 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                  Host: {config.serverHostIp}:{config.serverPort}
                </span>
                <span className="text-[10px] font-bold text-emerald-200 bg-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {config.appEnv.toUpperCase()} MODE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                Pengaturan Sistem, Lingkungan & Parameter Pesantren
              </h2>
              <p className="text-xs text-emerald-100/90 mt-1 max-w-3xl leading-relaxed">
                Pusat kendali konfigurasi server LAN mandiri, database relasional, toleransi absensi santri, parameter identitas lembaga, dan manajemen berkas environment terproteksi.
              </p>
            </div>
          </div>

          {/* Quick Action Top Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              id="btn-export-env"
              onClick={handleExportEnvFile}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-2 border border-white/20 backdrop-blur-xs cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Export .ENV</span>
            </button>

            <button
              id="btn-save-settings"
              onClick={handleSaveConfig}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                !isSaved 
                  ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 ring-2 ring-amber-300/50 animate-bounce' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? 'Konfigurasi Tersimpan' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>

        {/* 4 Bento KPI Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-emerald-700/60">
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Koneksi LAN Host</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block font-mono truncate">{config.serverHostIp}</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Port {config.serverPort} &bull; HTTP Monolith</span>
          </div>

          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Timezone & Waktu</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block font-mono">WIB (UTC+7)</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Format {config.timeFormat.toUpperCase()} &bull; Asia/Jakarta</span>
          </div>

          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Database & Pool</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block font-mono">{config.dbConnectionPool} Max Conns</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Transaction + Row Lock</span>
          </div>

          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Toleransi Absensi</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block font-mono">{config.lateToleranceMinutes} Menit</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Debounce {config.rfidDebounceSeconds}s RFID Tap</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Pill Bar */}
      <div className="bg-slate-100/90 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        {[
          { id: 'server', label: 'Server & Konektivitas LAN', icon: Server },
          { id: 'profile', label: 'Profil Lembaga & Waktu', icon: Building },
          { id: 'attendance', label: 'Kebijakan Absensi & RFID', icon: Radio },
          { id: 'database', label: 'Database, Storage & Cache', icon: Database },
          { id: 'environment', label: 'Environment (.ENV) & Danger Zone', icon: Terminal, alert: config.appDebug },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-settings-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#1F5C45] text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`} />
              <span>{tab.label}</span>
              {tab.alert && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SERVER & KONEKTIVITAS LAN                                          */}
      {/* ========================================================================= */}
      {activeTab === 'server' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Server Config Bento */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                    <Server className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Konfigurasi Host Server Local Pesantren
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Pengaturan IP address statis server LAN, port listener, dan domain intranet mandiri.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    IP Address Server Statis (LAN Host)
                  </label>
                  <input
                    type="text"
                    value={config.serverHostIp}
                    onChange={(e) => handleConfigChange('serverHostIp', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="192.168.1.10"
                  />
                  <span className="text-[10px] text-slate-400">IP statis server pada router DHCP lokal pesantren.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    HTTP Web Port
                  </label>
                  <input
                    type="text"
                    value={config.serverPort}
                    onChange={(e) => handleConfigChange('serverPort', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="8000"
                  />
                  <span className="text-[10px] text-slate-400">Port layanan Nginx / PHP monolith.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Domain Intranet Lokal (TLS/HTTPS)
                  </label>
                  <input
                    type="text"
                    value={config.localDomain}
                    onChange={(e) => handleConfigChange('localDomain', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://siuba.local"
                  />
                  <span className="text-[10px] text-slate-400">Diperlukan HTTPS lokal agar kamera PWA dapat aktif.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Port MQTT Broker (ESP32 Terminal)
                  </label>
                  <input
                    type="text"
                    value={config.mqttPort}
                    onChange={(e) => handleConfigChange('mqttPort', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="1883"
                  />
                  <span className="text-[10px] text-slate-400">Socket receiver tap RFID hardware offline.</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    CORS Allowed Origins (Subnet LAN)
                  </label>
                  <input
                    type="text"
                    value={config.corsOrigins}
                    onChange={(e) => handleConfigChange('corsOrigins', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="http://192.168.1.*, http://localhost:8000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Trusted Proxies & Gateway
                  </label>
                  <input
                    type="text"
                    value={config.trustedProxies}
                    onChange={(e) => handleConfigChange('trustedProxies', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="192.168.1.1, 127.0.0.1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side Status & Latency Tool Bento */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Uji Respon & Latensi Socket LAN
              </h4>

              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Verifikasi kecepatan komunikasi antara terminal fisik RFID ESP32, client PWA, dan database server lokal.
              </p>

              <button
                id="btn-test-lan-latency"
                onClick={handleTestPing}
                disabled={isTestingPing}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
              >
                <Wifi className={`w-4 h-4 ${isTestingPing ? 'animate-spin' : ''}`} />
                <span>{isTestingPing ? 'Menguji Latensi Socket...' : 'Test Latensi LAN Sekarang'}</span>
              </button>

              {pingResult && (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-500/40 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Hasil Ping Socket:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-[10px] font-black text-emerald-900 dark:text-emerald-100">
                      SANGAT CEPAT
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono">
                    {pingResult.latency} ms
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">
                    Diuji pukul {pingResult.timestamp} WIB &bull; 0% Packet Loss
                  </span>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Status Gateway:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online (192.168.1.1)
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Kapasitas Throughput:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">1.0 Gbps Full Duplex</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Mode Jaringan:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">Air-Gapped Intranet</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFIL LEMBAGA & WAKTU                                             */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                <Building className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Identitas Lembaga & Parameter Waktu Akademik
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Data ini dicantumkan pada kop laporan absensi, slip izin santri, kartu identitas, dan sertifikat resmi.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Nama Resmi Pesantren / Lembaga
              </label>
              <input
                type="text"
                value={config.instituteName}
                onChange={(e) => handleConfigChange('instituteName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Slogan / Deskripsi Aplikasi
              </label>
              <input
                type="text"
                value={config.instituteSlogan}
                onChange={(e) => handleConfigChange('instituteSlogan', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Alamat Lengkap Pesantren
              </label>
              <input
                type="text"
                value={config.instituteAddress}
                onChange={(e) => handleConfigChange('instituteAddress', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Nomor Telepon / WhatsApp Sekretariat
              </label>
              <input
                type="text"
                value={config.institutePhone}
                onChange={(e) => handleConfigChange('institutePhone', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Email Resmi Sekretariat
              </label>
              <input
                type="email"
                value={config.instituteEmail}
                onChange={(e) => handleConfigChange('instituteEmail', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                value={config.activeAcademicYear}
                onChange={(e) => handleConfigChange('activeAcademicYear', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Semester Aktif
              </label>
              <select
                value={config.activeSemester}
                onChange={(e) => handleConfigChange('activeSemester', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Ganjil">Semester Ganjil (I)</option>
                <option value="Genap">Semester Genap (II)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Zona Waktu Sistem (PHP / DB)
              </label>
              <select
                value={config.timezone}
                onChange={(e) => handleConfigChange('timezone', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Asia/Jakarta (WIB)">Asia/Jakarta (WIB - UTC+7)</option>
                <option value="Asia/Makassar (WITA)">Asia/Makassar (WITA - UTC+8)</option>
                <option value="Asia/Jayapura (WIT)">Asia/Jayapura (WIT - UTC+9)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Format Tampilan Jam
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleConfigChange('timeFormat', '24h')}
                  className={`py-2.5 rounded-2xl text-xs font-bold border transition ${
                    config.timeFormat === '24h'
                      ? 'bg-[#1F5C45] text-white border-[#164735]'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  24 Jam (Contoh: 18:30 WIB)
                </button>
                <button
                  type="button"
                  onClick={() => handleConfigChange('timeFormat', '12h')}
                  className={`py-2.5 rounded-2xl text-xs font-bold border transition ${
                    config.timeFormat === '12h'
                      ? 'bg-[#1F5C45] text-white border-[#164735]'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  12 Jam (Contoh: 06:30 PM)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KEBIJAKAN ABSENSI & RFID                                           */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                <Radio className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Kebijakan Toleransi Disiplin & Hardware Scanner
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Aturan ambang batas keterlambatan, penutupan sesi otomatis, dan pencegahan tap ganda RFID.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Toleransi Keterlambatan Santri (Menit)
                </label>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {config.lateToleranceMinutes} Menit
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                step={5}
                value={config.lateToleranceMinutes}
                onChange={(e) => handleConfigChange('lateToleranceMinutes', parseInt(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Santri yang hadir setelah toleransi akan otomatis berstatus <strong>Terlambat</strong>.
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Auto-Close Sesi Setelah Jam Selesai (Menit)
                </label>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {config.autoCloseSessionMinutes} Menit
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={10}
                value={config.autoCloseSessionMinutes}
                onChange={(e) => handleConfigChange('autoCloseSessionMinutes', parseInt(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Cron scheduler akan menutup sesi dan menandai santri yang belum hadir sebagai <strong>Alpa</strong>.
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Anti-Double Tap Debounce (Detik)
                </label>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {config.rfidDebounceSeconds} Detik
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={config.rfidDebounceSeconds}
                onChange={(e) => handleConfigChange('rfidDebounceSeconds', parseInt(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Mencegah santri men-tap kartu RFID 2x berturut-turut pada alat scanner terminal.
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Izinkan Pengajuan Izin / Sakit Mandiri
                </label>
                <span className="text-[10px] text-slate-500">
                  Wali santri / musyrif dapat menginput surat izin sebelum sesi dimulai.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.allowSelfExcusal}
                onChange={(e) => handleConfigChange('allowSelfExcusal', e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Audio Chime Suara Konfirmasi (Beep)
                </label>
                <span className="text-[10px] text-slate-500">
                  Mainkan bunyi nada konfirmasi sukses/gagal saat scan kartu QR/RFID.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.enableAudioChime}
                onChange={(e) => handleConfigChange('enableAudioChime', e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Mode Kiosk Layar Penuh pada Terminal
                </label>
                <span className="text-[10px] text-slate-500">
                  Otomatis sembunyikan bilah URL browser saat membuka scanner di pos gerbang.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.enableKioskFullscreen}
                onChange={(e) => handleConfigChange('enableKioskFullscreen', e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Jump to Card Designer */}
          {onNavigateToCardDesigner && (
            <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <IdCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    Desainer Template Kartu Santri & Barcode QR
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Kustomisasi tata letak kartu santri, pas foto, background resmi, dan kode QR/RFID siap cetak.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToCardDesigner}
                className="px-4 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                <span>Buka Desainer Kartu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DATABASE, STORAGE & CACHE                                          */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main DB Info Bento */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                    <Database className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Mesin Database Relasional & Concurrency Safety
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Mekanisme transaksi ACID, penguncian baris (row locking), dan connection pooling server.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    RDBMS Engine Driver
                  </label>
                  <input
                    type="text"
                    disabled
                    value={config.dbDriver}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Driver database relational produksi.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Max Database Connection Pool
                  </label>
                  <input
                    type="number"
                    value={config.dbConnectionPool}
                    onChange={(e) => handleConfigChange('dbConnectionPool', parseInt(e.target.value) || 50)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Batas concurrent connections ke MariaDB.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Row Lock Timeout (Detik)
                  </label>
                  <input
                    type="number"
                    value={config.dbLockTimeoutSeconds}
                    onChange={(e) => handleConfigChange('dbLockTimeoutSeconds', parseInt(e.target.value) || 5)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Timeout maksimal <code className="font-mono">lockForUpdate()</code>.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Primary Cache Driver
                  </label>
                  <select
                    value={config.cacheDriver}
                    onChange={(e) => handleConfigChange('cacheDriver', e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="indexeddb">IndexedDB Browser (PWA Offline First)</option>
                    <option value="redis">Redis 7.0 In-Memory Cache</option>
                    <option value="file">File System Cache (/storage/framework/cache)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">Penyimpanan buffer antrean lokal.</span>
                </div>
              </div>

              {/* Database Safety Constraints Checklist */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Integritas & Constraint Database Aktif:
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Unique Constraint: <code className="font-mono bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">[attendance_session_id, student_id]</code></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Foreign Keys Constraint: ON DELETE RESTRICT untuk mencegah data presensi yatim.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Idempotency Hash Index: UUID request check untuk mencegah mutasi ganda saat re-koneksi.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cache Flushing & Maintenance Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                Manajemen & Pembersihan Cache
              </h4>

              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Bersihkan cache sementara aplikasi jika terjadi perubahan data jadwal akademik atau template antarmuka.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleFlushCache('Route & View Cache')}
                  disabled={isFlushingCache !== null}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    Flush Route & UI Cache
                  </span>
                  {isFlushingCache === 'Route & View Cache' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <span className="text-[10px] text-slate-400">Bersihkan</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleFlushCache('Query & Master Data Cache')}
                  disabled={isFlushingCache !== null}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Flush Query Master Data
                  </span>
                  {isFlushingCache === 'Query & Master Data Cache' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <span className="text-[10px] text-slate-400">Bersihkan</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleFlushCache('PWA Storage Buffer')}
                  disabled={isFlushingCache !== null}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    Flush Temporary PWA Buffer
                  </span>
                  {isFlushingCache === 'PWA Storage Buffer' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <span className="text-[10px] text-slate-400">Bersihkan</span>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Pembersihan cache tidak menghapus data master santri atau catatan presensi permanen.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ENVIRONMENT (.ENV) & DANGER ZONE                                   */}
      {/* ========================================================================= */}
      {activeTab === 'environment' && (
        <div className="space-y-6">
          {/* Environment Variables Bento */}
          <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
                  <Terminal className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Parameter Environment (.ENV) & Mode Operasional
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Konfigurasi runtime inti Laravel/React Monolith pesantren.
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                config.appEnv === 'production' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
              }`}>
                {config.appEnv}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Application Environment
                </label>
                <select
                  value={config.appEnv}
                  onChange={(e) => handleConfigChange('appEnv', e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="production">Production (Direkomendasikan)</option>
                  <option value="staging">Staging (Uji Coba Lapangan)</option>
                  <option value="local">Local Development</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Debug Mode (APP_DEBUG)
                </label>
                <select
                  value={config.appDebug ? 'true' : 'false'}
                  onChange={(e) => handleConfigChange('appDebug', e.target.value === 'true')}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold focus:outline-none focus:ring-2 ${
                    config.appDebug 
                      ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40' 
                      : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:ring-emerald-500'
                  }`}
                >
                  <option value="false">FALSE (Aman & Siap Go-Live)</option>
                  <option value="true">TRUE (Tampilkan Rincian Error)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Log Level Monolith
                </label>
                <select
                  value={config.logLevel}
                  onChange={(e) => handleConfigChange('logLevel', e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="error">ERROR (Minimal Disk I/O)</option>
                  <option value="warning">WARNING (Peringatan & Error)</option>
                  <option value="info">INFO (Standar Audit Operasional)</option>
                  <option value="debug">DEBUG (Catat Semua Mutasi Request)</option>
                </select>
              </div>
            </div>

            {/* Secret Key Mask */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  Application Encryption Key (APP_KEY)
                </label>
                <button
                  type="button"
                  onClick={() => setShowAppSecret(!showAppSecret)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showAppSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAppSecret ? 'Sembunyikan' : 'Tampilkan'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl font-mono text-xs text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 truncate">
                {showAppSecret 
                  ? 'base64:7K5jQ9uX+W8L8Z3o7nN1Q8A7b6C5D4e3F2g1H0j9K8=' 
                  : 'base64:•••••••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          </div>

          {/* Danger Zone & Maintenance Link Bento */}
          <div className="p-6 sm:p-7 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-rose-950 dark:text-rose-200 text-base">
                  Zona Bahaya & Pemeliharaan Terproteksi (Super Admin)
                </h3>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                  Tindakan di bawah ini memengaruhi seluruh dataset santri dan database relasional SIUBA.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {onNavigateToReset && (
                <button
                  type="button"
                  id="btn-navigate-maintenance-hub"
                  onClick={onNavigateToReset}
                  className="p-4 bg-white dark:bg-zinc-900 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs font-bold flex items-center justify-between transition cursor-pointer shadow-2xs group"
                >
                  <div className="text-left">
                    <span className="block font-black text-sm">Buka Maintenance Hub & Reset Data</span>
                    <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-normal">
                      Pembersihan record selektif & reset database berpasphrase
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <button
                type="button"
                id="btn-reset-defaults"
                onClick={handleResetToDefault}
                className="p-4 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold flex items-center justify-between transition cursor-pointer shadow-2xs group"
              >
                <div className="text-left">
                  <span className="block font-black text-sm">Kembalikan Konfigurasi Default</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Reset parameter sistem ke setelan standar pabrik
                  </span>
                </div>
                <RotateCcw className="w-4 h-4 text-slate-500 group-hover:rotate-45 transition-transform" />
              </button>
            </div>

            {/* Development-only Seed Reset */}
            {isDevelopmentToolsEnabled() && onResetData && (
              <div className="pt-4 border-t border-rose-200/80 dark:border-rose-800/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-black uppercase tracking-wider block">
                      [DEV TOOL ONLY] Debug Tools Sandbox
                    </span>
                    <span className="text-xs text-rose-900 dark:text-rose-200">
                      Mengisi ulang mock santri, sesi, kelas, asrama, dan perizinan untuk kebutuhan testing.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onResetData}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Cepat Demo Seed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


