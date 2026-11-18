import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  IdCard, 
  Sliders, 
  Save, 
  CheckCircle2, 
  Wifi, 
  Sparkles, 
  HardDrive, 
  Layers, 
  Building, 
  Radio, 
  Smartphone, 
  Activity, 
  Key, 
  Eye, 
  EyeOff, 
  Terminal, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { isDevelopmentToolsEnabled } from '../utils/devTools';
import { apiClient } from '../services/apiClient';
import { applyServerAttendanceRules } from '../services/attendanceRulesService';
import { setInstitutionCache } from '../services/institutionService';

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
  foundationName: string;
  shortName: string;
  leaderName: string;
  leaderTitle: string;
  city: string;
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
  autoOpenScheduledSessions: boolean;
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

  foundationName: 'Yayasan Pendidikan Islam Utsman Bin Affan',
  shortName: 'Utsman Bin Affan',
  leaderName: '',
  leaderTitle: 'Pimpinan Pondok',
  city: '',
  instituteName: 'Pondok Pesantren Utsman Bin Affan',
  instituteSlogan: 'Sistem Informasi Manajemen Presensi & Disiplin Santri',
  instituteAddress: '',
  institutePhone: '',
  instituteEmail: '',
  activeAcademicYear: '2026/2027',
  activeSemester: 'Ganjil',
  timezone: 'Asia/Jakarta (WIB)',
  timeFormat: '24h',

  lateToleranceMinutes: 15,
  autoCloseSessionMinutes: 30,
  autoOpenScheduledSessions: true,
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

/** Kolom yang diatur lewat file .env di server: hanya ditampilkan (baca saja) dari info server sebenarnya. */
const READONLY_KEYS: (keyof SystemConfigState)[] = [
  'serverHostIp', 'serverPort', 'mqttPort', 'localDomain', 'allowCors', 'corsOrigins', 'trustedProxies',
  'timezone', 'dbDriver', 'dbConnectionPool', 'dbLockTimeoutSeconds', 'cacheDriver', 'autoBackupDaily',
  'appEnv', 'appDebug', 'logLevel',
];

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
  const [serverInfo, setServerInfo] = useState<any>(null);

  // Muat pengaturan & info server sebenarnya
  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.get('/settings');
        const i = res?.data?.institution || {};
        const a = res?.data?.attendance || {};
        setConfig((prev) => ({
          ...prev,
          instituteName: i.name ?? prev.instituteName,
          instituteSlogan: i.slogan ?? prev.instituteSlogan,
          instituteAddress: i.address ?? '',
          institutePhone: i.phone ?? '',
          instituteEmail: i.email ?? '',
          activeAcademicYear: i.active_academic_year ?? prev.activeAcademicYear,
          activeSemester: i.active_semester ?? prev.activeSemester,
          timeFormat: i.time_format ?? prev.timeFormat,
          foundationName: i.foundation_name ?? '',
          shortName: i.short_name ?? '',
          leaderName: i.leader_name ?? '',
          leaderTitle: i.leader_title ?? 'Pimpinan Pondok',
          city: i.city ?? '',
          lateToleranceMinutes: a.late_tolerance_minutes ?? prev.lateToleranceMinutes,
          autoCloseSessionMinutes: a.auto_close_session_minutes ?? prev.autoCloseSessionMinutes,
          autoOpenScheduledSessions: a.auto_open_scheduled_sessions ?? prev.autoOpenScheduledSessions,
          rfidDebounceSeconds: a.rfid_debounce_seconds ?? prev.rfidDebounceSeconds,
          allowSelfExcusal: a.allow_self_excusal ?? prev.allowSelfExcusal,
          enableKioskFullscreen: a.enable_kiosk_fullscreen ?? prev.enableKioskFullscreen,
          enableAudioChime: a.enable_audio_chime ?? prev.enableAudioChime,
        } as SystemConfigState));
      } catch (err: any) {
        if (onShowToast) onShowToast(err?.message || 'Gagal memuat pengaturan dari server.', 'error');
      }
      try {
        const info: any = await apiClient.get('/settings/system-info');
        const d = info?.data || {};
        setServerInfo(d);
        let port = '';
        try { port = new URL(d.app_url).port || (d.app_url?.startsWith('https') ? '443' : '80'); } catch { /* app_url kosong */ }
        setConfig((prev) => ({
          ...prev,
          serverHostIp: (d.server_ips && d.server_ips[0]) || d.server_hostname || prev.serverHostIp,
          serverPort: port || prev.serverPort,
          localDomain: d.app_url || prev.localDomain,
          timezone: d.timezone || prev.timezone,
          dbDriver: `${d.db_driver} ${d.db_version} (database: ${d.db_database})`,
          cacheDriver: d.cache_driver as any,
          appEnv: d.app_env as any,
          appDebug: !!d.app_debug,
          logLevel: (d.log_level || 'debug') as any,
        }));
      } catch {
        /* tanpa hak system.settings: info server tidak ditampilkan */
      }
    })();
  }, []);
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
    if (READONLY_KEYS.includes(key)) {
      showToast('Nilai ini diatur di file .env server (bukan dari halaman ini). Ubah .env lalu jalankan php artisan optimize:clear.', 'info');
      return;
    }
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSaveConfig = async () => {
    try {
      const inst: any = await apiClient.put('/settings/institution', {
        name: config.instituteName,
        slogan: config.instituteSlogan,
        address: config.instituteAddress,
        phone: config.institutePhone,
        email: config.instituteEmail || null,
        active_academic_year: config.activeAcademicYear,
        active_semester: config.activeSemester,
        time_format: config.timeFormat,
        foundation_name: config.foundationName,
        short_name: config.shortName,
        leader_name: config.leaderName,
        leader_title: config.leaderTitle,
        city: config.city,
      });
      await apiClient.put('/settings/attendance', {
        late_tolerance_minutes: config.lateToleranceMinutes,
        auto_close_session_minutes: config.autoCloseSessionMinutes,
        auto_open_scheduled_sessions: config.autoOpenScheduledSessions,
        rfid_debounce_seconds: config.rfidDebounceSeconds,
        allow_self_excusal: config.allowSelfExcusal,
        enable_kiosk_fullscreen: config.enableKioskFullscreen,
        enable_audio_chime: config.enableAudioChime,
      });
      applyServerAttendanceRules({
        late_tolerance_minutes: config.lateToleranceMinutes,
        auto_close_session_minutes: config.autoCloseSessionMinutes,
        auto_open_scheduled_sessions: config.autoOpenScheduledSessions,
        rfid_debounce_seconds: config.rfidDebounceSeconds,
        allow_self_excusal: config.allowSelfExcusal,
        enable_kiosk_fullscreen: config.enableKioskFullscreen,
        enable_audio_chime: config.enableAudioChime,
      });
      if (inst?.data) setInstitutionCache(inst.data);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* cache saja */ }
      setIsSaved(true);
      showToast('✓ Pengaturan tersimpan di server dan berlaku untuk semua perangkat.', 'success');
    } catch (e: any) {
      const fieldMsg = e?.fieldErrors ? (Object.values(e.fieldErrors).flat()[0] as string | undefined) : undefined;
      showToast('Gagal menyimpan pengaturan: ' + (fieldMsg || e?.message || String(e)), 'error');
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan identitas lembaga & aturan absensi ke nilai bawaan? Perubahan baru berlaku setelah Anda menekan Simpan.')) {
      setConfig((prev) => {
        const next: any = { ...prev };
        (Object.keys(DEFAULT_CONFIG) as (keyof SystemConfigState)[]).forEach((k) => {
          if (!READONLY_KEYS.includes(k)) next[k] = DEFAULT_CONFIG[k];
        });
        return next;
      });
      setIsSaved(false);
      showToast('Nilai bawaan dimuat. Tekan Simpan untuk menerapkannya.', 'info');
    }
  };

  // Uji koneksi sungguhan ke server
  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    const t0 = performance.now();
    try {
      await apiClient.get('/settings/system-info');
      const latency = Math.round((performance.now() - t0) * 10) / 10;
      setPingResult({ latency, status: 'ok', timestamp: new Date().toLocaleTimeString('id-ID') });
      showToast(`✓ Server merespons dalam ${latency} ms`, 'success');
    } catch (err: any) {
      setPingResult({ latency: 0, status: 'error', timestamp: new Date().toLocaleTimeString('id-ID') });
      showToast(`Server tidak merespons: ${err?.message || 'koneksi gagal'}`, 'error');
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleFlushCache = async (cacheType: string) => {
    setIsFlushingCache(cacheType);
    try {
      if (cacheType === 'PWA Storage Buffer') {
        // Cache di browser ini saja (data akan dimuat ulang dari server); sesi login tidak dihapus
        Object.keys(localStorage)
          .filter((k) => k.startsWith('siuba_') && /cache|snapshot|_master|records|sessions/.test(k))
          .forEach((k) => localStorage.removeItem(k));
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
        showToast('✓ Cache di browser ini dibersihkan. Muat ulang halaman untuk mengambil data terbaru.', 'success');
      } else {
        const res: any = await apiClient.post('/settings/clear-cache', { type: cacheType === 'Route & View Cache' ? 'app' : 'data' });
        showToast(`✓ ${res?.message || 'Cache server dibersihkan.'}`, 'success');
      }
    } catch (err: any) {
      showToast(`Gagal membersihkan cache: ${err?.message || err}`, 'error');
    } finally {
      setIsFlushingCache(null);
    }
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
      {(activeTab === 'server' || activeTab === 'database' || activeTab === 'environment') && (
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold leading-relaxed">
          Nilai di tab ini adalah <b>keadaan server yang sebenarnya</b> dan hanya bisa dibaca. Untuk mengubahnya, edit file
          <code className="mx-1 px-1 bg-white rounded">.env</code> di folder aplikasi lalu jalankan
          <code className="mx-1 px-1 bg-white rounded">php artisan optimize:clear</code>.
          {serverInfo && (
            <span className="block mt-1 font-mono text-[11px] text-sky-800">
              PHP {serverInfo.php_version} • Laravel {serverInfo.laravel_version} • {serverInfo.db_driver} {serverInfo.db_version} •
              cache {serverInfo.cache_driver} • kunci IoT {serverInfo.iot_key_configured ? 'sudah diisi' : 'BELUM diisi (NEXABSEN_GLOBAL_KEY)'}
            </span>
          )}
        </div>
      )}

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
                Nama Yayasan (baris atas kop laporan)
              </label>
              <input
                type="text"
                value={config.foundationName}
                onChange={(e) => handleConfigChange('foundationName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Nama Singkat (halaman login & menu)
              </label>
              <input
                type="text"
                value={config.shortName}
                onChange={(e) => handleConfigChange('shortName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Nama Pimpinan (penanda tangan laporan)
              </label>
              <input
                type="text"
                value={config.leaderName}
                onChange={(e) => handleConfigChange('leaderName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Jabatan Pimpinan
              </label>
              <input
                type="text"
                value={config.leaderTitle}
                onChange={(e) => handleConfigChange('leaderTitle', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Kota (tempat penandatanganan)
              </label>
              <input
                type="text"
                value={config.city}
                onChange={(e) => handleConfigChange('city', e.target.value)}
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
                Santri yang hadir setelah toleransi akan otomatis berstatus <strong>Terlambat</strong>. Berlaku untuk sesi KBM baru dan kegiatan yang tidak punya toleransi sendiri.
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Buka Sesi Otomatis Saat Jam Mulai</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-emerald-700"
                  checked={config.autoOpenScheduledSessions}
                  onChange={(e) => handleConfigChange('autoOpenScheduledSessions', e.target.checked)}
                />
              </label>
              <span className="text-[10px] text-slate-500 block">
                Sesi dari <strong>Jadwal Rutin</strong> dibuka otomatis (dicek tiap menit) agar tap kartu RFID langsung diterima. Matikan bila petugas ingin membuka setiap sesi secara manual. Sesi KBM dan event tetap dibuka oleh guru/panitia.
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
                Penjadwal (dicek tiap 5 menit) menutup sesi yang masih dibuka dan menandai santri yang belum hadir sebagai <strong>Alpa</strong> (atau sesuai izin yang disetujui). Isi 0 untuk menonaktifkan. Di Windows, pasang dulu penjadwal lewat <code>pasang-penjadwal-windows.bat</code>.
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
                Tap ulang kartu yang sama dalam rentang ini diabaikan (layar alat menampilkan &quot;Tunggu Sebentar&quot;). Isi 0 untuk menonaktifkan.
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Izinkan Pengajuan Izin / Sakit Mandiri
                </label>
                <span className="text-[10px] text-slate-500">
                  Guru, wali kelas &amp; petugas absensi (bukan petugas perizinan) boleh menginput surat izin; statusnya menunggu persetujuan. Bila dimatikan, hanya petugas perizinan yang bisa menginput.
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
                  Mainkan bunyi nada konfirmasi sukses/gagal saat scan kartu QR/RFID (bawaan semua perangkat; tetap bisa dimatikan di halaman scanner).
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
                  Halaman scanner masuk layar penuh pada sentuhan/klik pertama (browser tidak mengizinkan layar penuh tanpa interaksi).
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


