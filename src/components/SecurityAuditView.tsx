import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Server, 
  Database, 
  Clock, 
  HardDrive, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Lock, 
  Key, 
  UserCheck, 
  FileText, 
  Smartphone, 
  Radio, 
  Activity, 
  Cpu, 
  Zap, 
  AlertOctagon, 
  Trash2, 
  Check, 
  ChevronRight, 
  BookOpen, 
  Sliders, 
  History, 
  ExternalLink,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  AuditLog, 
  AuditLogEvent, 
  DataIntegritySummary, 
  DataIntegrityIssue, 
  SystemHealthReport, 
  DisasterRecoveryPlan, 
  SecuritySettingConfig, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceRecord, 
  Student, 
  AttendanceDevice, 
  User,
  DatabaseBackupMeta
} from '../types';
import { AuditService } from '../services/auditService';
import { apiClient } from '../services/apiClient';
import { SystemStatusService, EMPTY_INTEGRITY, ServerHealthReport, ServerIntegritySummary, ServerIntegrityIssue, DrDrillRecord } from '../services/systemStatusService';
import { SystemHealthService } from '../services/systemHealthService';
import { SecurityConfigService } from '../services/securityConfigService';
import { todayLocalDate } from '../utils/today';

interface SecurityAuditViewProps {
  sessions: AttendanceSession[];
  sessionParticipants: AttendanceSessionParticipant[];
  records: AttendanceRecord[];
  students: Student[];
  devices?: AttendanceDevice[];
  users?: User[];
  currentUser: User;
  onUpdateRecords?: (records: AttendanceRecord[]) => void;
  onUpdateParticipants?: (participants: AttendanceSessionParticipant[]) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onUpdateDevices?: (devices: AttendanceDevice[]) => void;
  onRestoreDatabase?: (dump: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const HEALTH_LABEL: Record<string, string> = { healthy: 'SEHAT', warning: 'PERHATIAN', critical: 'BERMASALAH' };
const HEALTH_BADGE: Record<string, string> = {
  healthy: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  critical: 'bg-rose-50 text-rose-800 border-rose-200',
};
const CONTROL_LABEL: Record<string, string> = { pass: 'AKTIF', info: 'INFO', warn: 'PERLU DIUBAH' };
const CONTROL_BADGE: Record<string, string> = {
  pass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
};

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtAgo(seconds?: number | null): string {
  if (seconds == null) return '-';
  if (seconds < 90) return `${seconds} detik lalu`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} menit lalu`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} jam lalu`;
  return `${Math.round(seconds / 86400)} hari lalu`;
}

function isDeviceOnline(dev: AttendanceDevice): boolean {
  if (!dev.is_active || !dev.last_seen_at) return false;
  const t = new Date(dev.last_seen_at).getTime();
  return !isNaN(t) && Date.now() - t <= 10 * 60 * 1000;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  sessions = [],
  sessionParticipants = [],
  records = [],
  students = [],
  devices = [],
  users = [],
  currentUser,
  onUpdateRecords,
  onUpdateParticipants,
  onUpdateStudents,
  onUpdateDevices,
  onRestoreDatabase,
  onShowToast
}) => {
  const safeSessions = sessions || [];
  const safeSessionParticipants = sessionParticipants || [];
  const safeRecords = records || [];
  const safeStudents = students || [];
  const safeDevices = devices || [];
  const safeUsers = users || [];

  const [activeSubTab, setActiveSubTab] = useState<'health' | 'audit' | 'integrity' | 'dr' | 'policies'>('health');
  
  // Kesehatan sistem — dari server (GET /system/health-report); cache terakhir dipakai saat offline
  const [healthReport, setHealthReport] = useState<ServerHealthReport | null>(() => SystemStatusService.cachedHealth());
  const [healthError, setHealthError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => AuditService.getLogs());
  const [auditEventFilter, setAuditEventFilter] = useState<string>('ALL');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Integritas data — dipindai di server (POST /system/integrity)
  const [integritySummary, setIntegritySummary] = useState<ServerIntegritySummary>(() => SystemStatusService.cachedIntegrity() || EMPTY_INTEGRITY);
  const [repairingIssueId, setRepairingIssueId] = useState<string | null>(null);
  const [isScanningIntegrity, setIsScanningIntegrity] = useState<boolean>(false);
  const [integrityFilterSeverity, setIntegrityFilterSeverity] = useState<'ALL' | 'critical' | 'warning' | 'info'>('ALL');

  // Security Config State
  const [securityConfig, setSecurityConfig] = useState<SecuritySettingConfig>(() => SecurityConfigService.getConfig());
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Disaster Recovery State
  const [drPlans, setDrPlans] = useState<DisasterRecoveryPlan[]>(() => SystemHealthService.getDisasterRecoveryPlans());
  const [selectedDrPlan, setSelectedDrPlan] = useState<DisasterRecoveryPlan | null>(null);
  const [drDrills, setDrDrills] = useState<Record<string, DrDrillRecord>>(() => SystemStatusService.cachedDrills());
  const [drillNotes, setDrillNotes] = useState<string>('');
  const [isSavingDrill, setIsSavingDrill] = useState<boolean>(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>('');
  const [isExecutingRestore, setIsExecutingRestore] = useState<boolean>(false);

  const refreshHealth = async () => {
    try {
      setHealthReport(await SystemStatusService.fetchHealth());
      setHealthError(null);
    } catch (err: any) {
      setHealthError(
        err?.status === 403
          ? 'Anda tidak memiliki izin melihat status server (Audit Keamanan / Maintenance).'
          : 'Server tidak terjangkau — menampilkan status terakhir yang tersimpan di perangkat ini.'
      );
    }
  };

  // Status server dimuat saat halaman dibuka lalu diperbarui tiap 60 detik; hasil uji pemulihan dari server
  useEffect(() => {
    refreshHealth();
    SystemStatusService.fetchDrills().then(setDrDrills).catch(() => {});
    const timer = setInterval(refreshHealth, 60000);
    return () => clearInterval(timer);
  }, []);

  // Muat log audit server saat halaman dibuka (lalu gabung dengan log lokal)
  useEffect(() => {
    let cancelled = false;
    AuditService.syncFromServer().then((ok) => {
      if (!cancelled && ok) setAuditLogs(AuditService.getLogs());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle Refresh Audit Logs
  const handleRefreshAuditLogs = async () => {
    await AuditService.syncFromServer();
    setAuditLogs(AuditService.getLogs({
      event: auditEventFilter as any,
      auditable_type: auditEntityFilter,
      search: auditSearchQuery
    }));
  };

  useEffect(() => {
    handleRefreshAuditLogs();
  }, [auditEventFilter, auditEntityFilter, auditSearchQuery]);

  // Pemindaian integritas di server (seluruh database, bukan cache browser)
  const handleRunIntegrityAudit = async () => {
    setIsScanningIntegrity(true);
    try {
      const result = await SystemStatusService.runIntegrity();
      setIntegritySummary(result);
      if (result.critical_count === 0 && result.warning_count === 0) {
        onShowToast('✓ Audit integritas selesai: tidak ada masalah kritis maupun peringatan.', 'success');
      } else {
        onShowToast(`Audit integritas selesai: ${result.critical_count} isu kritis & ${result.warning_count} peringatan.`, 'info');
      }
    } catch (err: any) {
      onShowToast(
        err?.status === 403
          ? 'Anda tidak memiliki izin menjalankan audit integritas.'
          : `Audit integritas gagal: ${err?.message || 'server tidak terjangkau'}`,
        'error'
      );
    } finally {
      setIsScanningIntegrity(false);
    }
  };

  // Perbaikan otomatis yang aman dijalankan di server, lalu pindai ulang
  const handleRepairIssue = async (issue: ServerIntegrityIssue) => {
    setRepairingIssueId(issue.id);
    try {
      const res = await SystemStatusService.repair(issue);
      onShowToast(`✓ ${res.message}`, 'success');
      await AuditService.syncFromServer();
      setAuditLogs(AuditService.getLogs());
      await handleRunIntegrityAudit();
    } catch (err: any) {
      onShowToast(err?.message || 'Perbaikan gagal diterapkan.', 'error');
    } finally {
      setRepairingIssueId(null);
    }
  };

  const handleRecordDrill = async (planId: string, status: 'PASS' | 'FAIL') => {
    setIsSavingDrill(true);
    try {
      setDrDrills(await SystemStatusService.recordDrill(planId, status, drillNotes.trim()));
      setDrillNotes('');
      onShowToast(status === 'PASS' ? '✓ Uji pemulihan dicatat BERHASIL.' : 'Uji pemulihan dicatat GAGAL — tindak lanjuti langkah yang bermasalah.', status === 'PASS' ? 'success' : 'info');
    } catch (err: any) {
      onShowToast(err?.message || 'Gagal menyimpan hasil uji pemulihan.', 'error');
    } finally {
      setIsSavingDrill(false);
    }
  };

  // Handle Create Verified Backup
  const handleCreateVerifiedBackup = async () => {
    // Backup sungguhan di server (dulu hanya mencatat log "backup berhasil" tanpa membuat file apa pun)
    setIsCreatingBackup(true);
    try {
      const res: any = await apiClient.post('/maintenance/backups', { notes: 'Backup dari Audit Keamanan' });
      await AuditService.syncFromServer();
      setAuditLogs(AuditService.getLogs());
      onShowToast(res?.message || `Backup ${res?.data?.backup_id || ''} berhasil dibuat di server.`, 'success');
    } catch (err: any) {
      onShowToast(
        err?.status === 403
          ? 'Anda tidak memiliki izin membuat backup (system.backup).'
          : `Backup gagal: ${err?.message || 'server tidak terjangkau'}`,
        'error'
      );
    } finally {
      setIsCreatingBackup(false);
      refreshHealth();
    }
  };

  // Handle Execute Disaster Recovery Drill / Restore
  const handleExecuteRestoreDrill = () => {
    // Pemulihan database sungguhan hanya dilakukan di Maintenance Hub → Pusat Backup (khusus Super Admin,
    // dengan backup pengaman otomatis). Halaman ini tidak lagi menampilkan hasil "drill" rekaan.
    setShowRestoreModal(false);
    setRestoreConfirmText('');
    onShowToast('Pemulihan database dilakukan di menu Maintenance Hub → Pusat Backup (khusus Super Admin).', 'success');
  };

  // Handle Save Security Config
  const handleSaveSecurityConfig = async () => {
    setIsSavingConfig(true);
    const res = await SecurityConfigService.saveToServer(securityConfig);
    setIsSavingConfig(false);
    if (res.success && res.config) {
      setSecurityConfig(res.config);
      await AuditService.syncFromServer();
      setAuditLogs(AuditService.getLogs());
    }
    onShowToast(res.message, res.success ? 'success' : 'error');
  };

  // Tab integritas dibuka dan belum ada hasil → pindai sekali di server
  useEffect(() => {
    if (activeSubTab === 'integrity' && !integritySummary.last_audit_at && !isScanningIntegrity) {
      handleRunIntegrityAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  // Kebijakan keamanan dari server saat halaman dibuka
  useEffect(() => {
    let cancelled = false;
    SecurityConfigService.syncFromServer().then((cfg) => {
      if (!cancelled && cfg) setSecurityConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered Integrity Issues
  const filteredIssues = (integritySummary?.issues || []).filter(issue => {
    if (!issue) return false;
    if (integrityFilterSeverity === 'ALL') return true;
    return issue.severity === integrityFilterSeverity;
  });

  const healthCards: { icon: React.ElementType; title: string; status: 'healthy' | 'warning' | 'critical'; sub: string; rows: [string, string][]; hint?: string }[] = healthReport
    ? [
        {
          icon: Server, title: 'Aplikasi', status: healthReport.application_status,
          sub: `Versi ${healthReport.application_version}`,
          rows: [['Lingkungan', String(healthReport.application_env || '-').toUpperCase()], ['Mode debug', healthReport.debug_mode ? 'AKTIF' : 'Nonaktif']],
        },
        {
          icon: Database, title: 'Database', status: healthReport.database_status,
          sub: healthReport.database_engine,
          rows: [['Latensi', healthReport.database_latency_ms != null ? `${healthReport.database_latency_ms} ms` : '-']],
        },
        {
          icon: Clock, title: 'Penjadwal Otomatis', status: healthReport.scheduler_status,
          sub: healthReport.scheduler_last_heartbeat ? `Terakhir berjalan ${fmtAgo(healthReport.scheduler_heartbeat_diff_seconds)}` : 'Belum pernah berjalan',
          rows: [['Tugas', 'Auto-close sesi, backup 01:30, bersih log 02:15']],
          hint: healthReport.scheduler_status !== 'healthy' ? 'Di Windows jalankan pasang-penjadwal-windows.bat sekali.' : undefined,
        },
        {
          icon: HardDrive, title: 'Kapasitas Disk', status: healthReport.disk_status,
          sub: healthReport.disk_free_gb != null ? `${healthReport.disk_free_gb} GB bebas (${healthReport.disk_free_percentage}%)` : 'Tidak terbaca',
          rows: [['Total', healthReport.disk_total_gb != null ? `${healthReport.disk_total_gb} GB` : '-'], ['Folder storage', healthReport.storage_writable ? 'Bisa ditulis' : 'TIDAK bisa ditulis']],
        },
        {
          icon: Database, title: 'Backup Database', status: healthReport.backup_freshness_status,
          sub: healthReport.backup_last_successful_at ? `Terakhir ${fmtDateTime(healthReport.backup_last_successful_at)}` : 'Belum ada backup terverifikasi',
          rows: [['Backup tersimpan', String(healthReport.backup_count_stored)]],
          hint: healthReport.backup_freshness_status !== 'healthy' ? 'Buat backup sekarang dan salin ke flashdisk/NAS.' : undefined,
        },
        {
          icon: Lock, title: 'Akses & Login', status: healthReport.failed_logins_today >= 20 ? 'warning' : 'healthy',
          sub: `${healthReport.failed_logins_today} login gagal hari ini`,
          rows: [['Akun nonaktif', String(healthReport.inactive_users_count)], ['Alat IoT online', `${healthReport.active_devices_online} / ${healthReport.active_devices_total}`]],
        },
      ]
    : [];

  const securityControls: { label: string; desc: string; status: 'pass' | 'info' | 'warn' }[] = [
    {
      label: 'Penguncian akun setelah login gagal',
      desc: `Dikunci ${securityConfig.lockout_duration_minutes} menit setelah ${securityConfig.max_login_attempts_before_lockout} kali gagal`,
      status: 'pass',
    },
    {
      label: 'Batas waktu sesi tidak aktif',
      desc: Number(securityConfig.session_timeout_minutes) > 0 ? `Logout otomatis setelah ${securityConfig.session_timeout_minutes} menit tidak aktif` : 'Nonaktif (cocok untuk perangkat scanner gerbang)',
      status: Number(securityConfig.session_timeout_minutes) > 0 ? 'pass' : 'info',
    },
    {
      label: 'Aturan kata sandi',
      desc: `Minimal ${securityConfig.min_password_length} karakter${securityConfig.require_numbers ? ', wajib angka' : ''}${securityConfig.require_special_char ? ', wajib simbol' : ''}`,
      status: Number(securityConfig.min_password_length) >= 8 ? 'pass' : 'warn',
    },
    {
      label: 'Login di beberapa perangkat sekaligus',
      desc: securityConfig.allow_concurrent_sessions ? 'Diizinkan' : 'Login baru mengakhiri sesi di perangkat lain',
      status: securityConfig.allow_concurrent_sessions ? 'info' : 'pass',
    },
    {
      label: 'Mode debug aplikasi',
      desc: healthReport?.debug_mode ? 'AKTIF — pesan galat rinci bisa terlihat pengguna. Ubah APP_DEBUG=false di .env.' : 'Nonaktif',
      status: healthReport?.debug_mode ? 'warn' : 'pass',
    },
    {
      label: 'Kunci perangkat IoT (NEXABSEN_GLOBAL_KEY)',
      desc: healthReport?.iot_key_configured ? 'Sudah diisi — alat RFID wajib mengirim kunci ini' : 'BELUM diisi di .env — alat RFID tidak bisa mengirim tap',
      status: healthReport?.iot_key_configured ? 'pass' : 'warn',
    },
  ];

  const auditStats = AuditService.getAuditStats();

  return (
    <div id="security-audit-view" className="space-y-6 pb-12">
      {/* Top Banner: SIUBA Emerald Gradient */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48 text-amber-300" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-white/15 border border-white/20 rounded-2xl text-amber-300 backdrop-blur-xs shadow-2xs">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 bg-black/30 px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  Keamanan & Audit Trail
                </span>
                {healthReport && (
                  <span className="text-[10px] font-bold text-white bg-white/10 px-3 py-1 rounded-full border border-white/15">
                    Status server: {HEALTH_LABEL[healthReport.overall_status]}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                Pusat Keamanan, Audit Trail & Integritas Sistem
              </h1>
              <p className="text-xs text-emerald-100/90 mt-1 max-w-3xl leading-relaxed">
                Hak akses diperiksa di server untuk setiap permintaan &bull; backup diverifikasi checksum SHA-256 &bull;
                log audit disimpan di server sesuai masa simpan di Kebijakan Keamanan &bull; SOP pemulihan dengan catatan uji.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            <button
              id="btn-quick-integrity-audit"
              onClick={handleRunIntegrityAudit}
              disabled={isScanningIntegrity}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 backdrop-blur-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[42px] shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isScanningIntegrity ? 'animate-spin text-amber-300' : 'text-amber-300'}`} />
              <span>{isScanningIntegrity ? 'Memindai...' : 'Scan Integritas'}</span>
            </button>

            <button
              id="btn-quick-create-backup"
              onClick={handleCreateVerifiedBackup}
              disabled={isCreatingBackup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-[#12372A] text-xs font-black shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[42px]"
            >
              <Database className={`w-4 h-4 ${isCreatingBackup ? 'animate-spin text-[#1F5C45]' : 'text-[#1F5C45]'}`} />
              <span>{isCreatingBackup ? 'Membuat...' : 'Backup Terverifikasi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Navigation Pill Bar */}
      <div className="bg-slate-100/90 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        {[
          { id: 'health', label: 'Status & Kesehatan Server', icon: Activity },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: History, badge: `${auditStats.corrections} Koreksi` },
          { id: 'integrity', label: `Integritas Data (${integritySummary.total_issues})`, icon: ShieldAlert, alert: integritySummary.critical_count > 0 },
          { id: 'dr', label: 'Disaster Recovery & Backup', icon: HardDrive },
          { id: 'policies', label: 'Kebijakan Keamanan', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`subtab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#1F5C45] text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`} />
              <span>{tab.label}</span>
              {tab.alert && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
              {tab.badge && !isActive && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-zinc-800 text-[10px] text-amber-800 dark:text-amber-300 font-mono font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYSTEM HEALTH & SERVER STATUS                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'health' && (
        <div className="space-y-6">
          {healthError && (
            <div id="health-error-notice" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{healthError}</span>
            </div>
          )}
          {!healthReport ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center text-xs text-slate-500">
              Memuat status server…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500">
                <span>
                  Status keseluruhan:{' '}
                  <span id="health-overall" className={`px-2.5 py-0.5 rounded-full font-black border ${HEALTH_BADGE[healthReport.overall_status]}`}>
                    {HEALTH_LABEL[healthReport.overall_status]}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  Diperiksa server: {fmtDateTime(healthReport.checked_at)}
                  <button onClick={refreshHealth} className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Perbarui
                  </button>
                </span>
              </div>

              <div id="health-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900">{card.title}</h4>
                            <p className="text-[11px] text-slate-500 font-mono truncate" title={card.sub}>{card.sub}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${HEALTH_BADGE[card.status]}`}>
                          {HEALTH_LABEL[card.status]}
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                        {card.rows.map(([k, v]) => (
                          <div key={k} className="text-[11px] text-slate-500 flex justify-between gap-3">
                            <span>{k}</span>
                            <span className="font-bold text-slate-800 text-right">{v}</span>
                          </div>
                        ))}
                        {card.hint && <p className="text-[11px] text-amber-700 font-semibold pt-1">{card.hint}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    Kontrol Keamanan yang Berlaku
                  </h3>
                  <div className="space-y-3">
                    {securityControls.map((item) => (
                      <div key={item.label} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900">{item.label}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border shrink-0 ${CONTROL_BADGE[item.status]}`}>
                          {CONTROL_LABEL[item.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600" />
                      Alat Absensi (RFID / QR)
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      {healthReport.active_devices_online} / {healthReport.active_devices_total} online (10 menit terakhir)
                    </span>
                  </div>
                  <div className="space-y-3">
                    {safeDevices.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">Belum ada perangkat yang terdaftar.</p>
                    ) : (
                      safeDevices.map((dev) => {
                        const online = isDeviceOnline(dev);
                        return (
                          <div key={dev.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{dev.device_name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-200">{dev.device_code}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Lokasi: {dev.location || '-'} &bull; Terakhir terlihat: {dev.last_seen_at ? fmtDateTime(dev.last_seen_at) : 'belum pernah'}
                              </p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${
                              !dev.is_active ? 'bg-slate-100 text-slate-600 border-slate-200' : online ? HEALTH_BADGE.healthy : HEALTH_BADGE.warning
                            }`}>
                              {!dev.is_active ? 'NONAKTIF' : online ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT TRAIL (WHO, WHAT, BEFORE/AFTER, WHY, WHERE)                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Metrics Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Total Log</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">{auditStats.total}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">Koreksi Absensi</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono mt-1 block">{auditStats.corrections}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider block">Perubahan Role</span>
              <span className="text-xl font-black text-sky-700 dark:text-sky-400 font-mono mt-1 block">{auditStats.roleChanges}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">Terminal & IoT</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1 block">{auditStats.deviceEvents}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider block">Regen QR & RFID</span>
              <span className="text-xl font-black text-purple-700 dark:text-purple-400 font-mono mt-1 block">{auditStats.qrRfidChanges}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">Backup & Restore</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1 block">{auditStats.backups}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-audit-search"
                  type="text"
                  placeholder="Cari nama, alasan, IP..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Event Filter */}
              <select
                id="select-audit-event"
                value={auditEventFilter}
                onChange={(e) => setAuditEventFilter(e.target.value)}
                className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs min-h-[38px]"
              >
                <option value="ALL">Semua Jenis Event</option>
                <option value="attendance_corrected">Koreksi Absensi</option>
                <option value="role_changed">Perubahan Role</option>
                <option value="permission_changed">Perubahan Permission</option>
                <option value="device_secret_rotated">Rotasi Kunci Terminal</option>
                <option value="qr_regenerated">Regenerasi QR Santri</option>
                <option value="backup_created">Backup Database</option>
                <option value="restore_completed">Restore / Pemulihan</option>
                <option value="offline_conflict_resolved">Resolusi Konflik Offline</option>
                <option value="data_integrity_repair">Perbaikan Integritas</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                id="btn-export-audit-json"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `siuba_audit_trail_${todayLocalDate()}.json`;
                  a.click();
                  onShowToast('✓ File Audit Trail (JSON) berhasil diunduh.', 'success');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 shadow-2xs min-h-[38px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Audit JSON</span>
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/80 text-slate-600 dark:text-zinc-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Waktu (WIB)</th>
                    <th className="py-3.5 px-4">Pelaku (Who)</th>
                    <th className="py-3.5 px-4">Event & Entitas</th>
                    <th className="py-3.5 px-4">Objek / Deskripsi</th>
                    <th className="py-3.5 px-4">Alasan (Why)</th>
                    <th className="py-3.5 px-4">IP / Sumber</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 italic">
                        Tidak ada log audit yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const eventColorMap: Record<string, string> = {
                        attendance_corrected: 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
                        role_changed: 'bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
                        device_secret_rotated: 'bg-emerald-50 dark:bg-[#1F5C45]/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-[#1F5C45]/40',
                        qr_regenerated: 'bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
                        backup_created: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
                        restore_completed: 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
                        data_integrity_repair: 'bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
                        offline_conflict_resolved: 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
                      };
                      const badgeClass = eventColorMap[log.event] || 'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 font-mono whitespace-nowrap text-[11px]">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 dark:text-zinc-200 block">{log.user_name || 'Daemon/System'}</span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase">{log.role || 'System'}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}`}>
                              {log.event.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5 font-mono">
                              {log.auditable_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-900 dark:text-zinc-200 font-bold line-clamp-1">
                              {log.auditable_name || `#${log.auditable_id}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 max-w-xs truncate text-[11px]">
                            {log.reason || <span className="text-slate-400 italic">Tidak ada catatan</span>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                            <span>{log.ip_address || '127.0.0.1'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              id={`btn-view-audit-${log.id}`}
                              onClick={() => setSelectedAuditLog(log)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-slate-600 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
                              title="Lihat Rincian Perubahan Before/After"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Detail Modal (Before / After Comparison) */}
          {selectedAuditLog && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Rincian Audit Perubahan Data</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">Log ID #{selectedAuditLog.id} &bull; {selectedAuditLog.auditable_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAuditLog(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Audit Context Details */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pelaku (Operator)</span>
                    <span className="font-bold text-slate-900 dark:text-zinc-200">{selectedAuditLog.user_name} ({selectedAuditLog.role})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Waktu Eksekusi</span>
                    <span className="font-mono text-slate-900 dark:text-zinc-200 font-bold">{new Date(selectedAuditLog.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Alamat IP & Jaringan</span>
                    <span className="font-mono text-slate-900 dark:text-zinc-200 font-bold">{selectedAuditLog.ip_address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">User Agent</span>
                    <span className="font-mono text-slate-600 dark:text-zinc-400 truncate block">{selectedAuditLog.user_agent_summary}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Alasan Perubahan (Why / Justifikasi)</span>
                    <span className="text-slate-900 dark:text-zinc-200 font-semibold">{selectedAuditLog.reason || 'Tidak ada alasan tertulis'}</span>
                  </div>
                </div>

                {/* Before / After Comparison Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old Values */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Nilai Sebelumnya (Before)
                      </span>
                    </div>
                    <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-[11px] font-mono text-rose-900 dark:text-rose-200 overflow-x-auto min-h-[120px]">
                      {selectedAuditLog.old_values ? (
                        <pre>{JSON.stringify(selectedAuditLog.old_values, null, 2)}</pre>
                      ) : (
                        <span className="text-slate-400 italic">null (Entitas Baru / Tidak ada nilai lama)</span>
                      )}
                    </div>
                  </div>

                  {/* New Values */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Nilai Baru (After)
                      </span>
                    </div>
                    <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-[11px] font-mono text-emerald-900 dark:text-emerald-200 overflow-x-auto min-h-[120px]">
                      {selectedAuditLog.new_values ? (
                        <pre>{JSON.stringify(selectedAuditLog.new_values, null, 2)}</pre>
                      ) : (
                        <span className="text-slate-400 italic">null (Entitas Dihapus)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" /> Kunci & rahasia kredensial otomatis di-redact ([REDACTED_SECRET])
                  </span>
                  <button
                    onClick={() => setSelectedAuditLog(null)}
                    className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold cursor-pointer active:scale-95 shadow-xs"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATA INTEGRITY SCANNER                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'integrity' && (
        <div className="space-y-6">
          {/* Integrity Overview Banner */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  integritySummary.status === 'HEALTHY' 
                    ? 'bg-emerald-500' 
                    : integritySummary.status === 'WARNING' 
                      ? 'bg-amber-500' 
                      : 'bg-rose-500 animate-pulse'
                }`}></span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Status Integritas Database: <span className="text-emerald-700 dark:text-emerald-400">{integritySummary.status}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Pemeriksaan di server atas seluruh database: presensi ganda, peserta ganda, kartu QR/RFID ganda, presensi di luar daftar peserta, sesi ditutup yang belum lengkap, dan alat yang masih terikat ke sesi selesai.
              </p>
              <p id="integrity-last-scan" className="text-[11px] text-slate-500 mt-1 font-semibold">
                {integritySummary.last_audit_at ? `Pemindaian terakhir: ${fmtDateTime(integritySummary.last_audit_at)}` : 'Belum pernah dipindai dari perangkat ini — tekan Pindai Ulang Database.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-run-full-integrity"
                onClick={handleRunIntegrityAudit}
                disabled={isScanningIntegrity}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[40px]"
              >
                <RefreshCw className={`w-4 h-4 ${isScanningIntegrity ? 'animate-spin' : ''}`} />
                <span>{isScanningIntegrity ? 'Sedang Memindai...' : 'Pindai Ulang Database'}</span>
              </button>
            </div>
          </div>

          {/* Metrics Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Record Absensi</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">{integritySummary.metrics.total_records_checked}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Total Sesi</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">{integritySummary.metrics.total_sessions_checked}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Master Santri</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">{integritySummary.metrics.total_students_checked}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider block">Duplikasi Absensi</span>
              <span className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono mt-1 block">{integritySummary.metrics.duplicate_attendance_count}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">Sesi Tertunda</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono mt-1 block">{integritySummary.metrics.incomplete_closed_sessions_count}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider block">Duplikat QR/RFID</span>
              <span className="text-xl font-black text-sky-700 dark:text-sky-400 font-mono mt-1 block">{integritySummary.metrics.duplicate_qr_count + integritySummary.metrics.duplicate_rfid_count}</span>
            </div>
          </div>

          {/* Issues List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h4 className="text-xs font-black text-slate-900 dark:text-zinc-200 uppercase tracking-wider">
                Daftar Masalah Integritas Terdeteksi ({integritySummary.total_issues})
              </h4>
              <div className="flex items-center gap-1.5">
                {(['ALL', 'critical', 'warning', 'info'] as const).map((sev) => (
                  <button
                    key={sev}
                    id={`filter-integrity-${sev}`}
                    onClick={() => setIntegrityFilterSeverity(sev)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                      integrityFilterSeverity === sev
                        ? 'bg-[#1F5C45] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                    }`}
                  >
                    {sev.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="p-10 text-center rounded-3xl bg-emerald-50/50 dark:bg-zinc-950/40 border border-emerald-100 dark:border-zinc-800/60 space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h5 className="text-sm font-black text-emerald-900 dark:text-zinc-200">{integritySummary.last_audit_at ? 'Tidak Ada Masalah Ditemukan' : 'Belum Ada Hasil Pemindaian'}</h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {integritySummary.last_audit_at
                    ? (integrityFilterSeverity === 'ALL' ? 'Pemeriksaan server tidak menemukan data ganda atau tidak lengkap.' : 'Tidak ada temuan dengan tingkat ini.')
                    : 'Jalankan pemindaian untuk memeriksa seluruh data di server.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => {
                  const severityBadge = {
                    critical: 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
                    warning: 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
                    info: 'bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30'
                  }[issue.severity];

                  return (
                    <div
                      key={issue.id}
                      className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs border-l-4 ${
                        issue.severity === 'critical' 
                          ? 'bg-rose-50/30 dark:bg-zinc-950/80 border-rose-200 dark:border-zinc-800 border-l-rose-500'
                          : issue.severity === 'warning'
                          ? 'bg-amber-50/30 dark:bg-zinc-950/80 border-amber-200 dark:border-zinc-800 border-l-amber-500'
                          : 'bg-slate-50 dark:bg-zinc-950/80 border-slate-200 dark:border-zinc-800 border-l-sky-500'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${severityBadge}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {issue.category}
                          </span>
                          <h5 className="text-xs font-black text-slate-900 dark:text-zinc-200">{issue.title}</h5>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{issue.description}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="font-bold text-slate-800 dark:text-zinc-300">Solusi:</span> {issue.suggested_fix}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        {issue.can_auto_repair ? (
                          <button
                            id={`btn-repair-${issue.id}`}
                            onClick={() => handleRepairIssue(issue)}
                            disabled={repairingIssueId !== null}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer min-h-[38px]"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{repairingIssueId === issue.id ? 'Memperbaiki…' : issue.repair_action_label || 'Perbaiki Otomatis'}</span>
                          </button>
                        ) : (
                          <span className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-xs font-bold border border-slate-200 dark:border-zinc-700">
                            Perlu Tinjauan Manual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DISASTER RECOVERY & BACKUP DRILL                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'dr' && (
        <div className="space-y-6">
          {/* Backup & RPO/RTO Status Header */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-600" />
                  Strategi Backup 3-2-1 & Kesiapan Disaster Recovery
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Backup otomatis harian 01:30 (butuh penjadwal) &bull; simpan salinan backup di luar PC server (flashdisk/NAS) &bull; uji pemulihan minimal tiap semester dan catat hasilnya di setiap SOP.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  id="btn-create-verified-backup-dr"
                  onClick={handleCreateVerifiedBackup}
                  disabled={isCreatingBackup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[40px]"
                >
                  <Database className="w-4 h-4" />
                  <span>{isCreatingBackup ? 'Membuat backup...' : 'Buat Backup Server Sekarang'}</span>
                </button>

                <button
                  id="btn-open-restore-drill"
                  onClick={handleExecuteRestoreDrill}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer min-h-[40px]"
                >
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Pemulihan Database</span>
                </button>
              </div>
            </div>

            {/* Runbooks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {drPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200/90 dark:border-zinc-800 flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-md transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        plan.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {plan.severity}
                      </span>
                      {drDrills[plan.id] ? (
                        <span className={`text-[10px] font-bold font-mono ${drDrills[plan.id].status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          Uji terakhir: {drDrills[plan.id].status === 'PASS' ? 'BERHASIL' : 'GAGAL'} ({fmtDateTime(drDrills[plan.id].at)})
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold">Belum pernah diuji</span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-zinc-100">{plan.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">{plan.scenario}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-zinc-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-zinc-300">{plan.rpo_target}</span> &bull; <span className="font-bold text-slate-800 dark:text-zinc-300">{plan.rto_target}</span>
                    </div>
                    <button
                      onClick={() => setSelectedDrPlan(plan)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      Buka SOP Runbook <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DR Runbook Detail Modal */}
          {selectedDrPlan && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">SOP Penanganan Gangguan</h3>
                  </div>
                  <button onClick={() => setSelectedDrPlan(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100">{selectedDrPlan.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">{selectedDrPlan.scenario}</p>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] flex gap-4 text-slate-700 dark:text-zinc-300 font-mono font-bold">
                    <span>Target RPO: {selectedDrPlan.rpo_target}</span>
                    <span>Target RTO: {selectedDrPlan.rto_target}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-black text-slate-900 dark:text-zinc-300 uppercase tracking-wider">Langkah Penanganan:</h5>
                  <div className="space-y-2">
                    {selectedDrPlan.steps.map((step, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80 text-xs text-slate-800 dark:text-zinc-300 flex items-start gap-2.5">
                        <span className="text-emerald-700 dark:text-emerald-400 font-black font-mono">{idx + 1}.</span>
                        <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div id="dr-drill-record" className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="text-xs font-black text-slate-900">Catat Hasil Uji Pemulihan (Latihan)</h5>
                  <p className="text-[11px] text-slate-500">
                    {drDrills[selectedDrPlan.id]
                      ? `Terakhir: ${drDrills[selectedDrPlan.id].status === 'PASS' ? 'BERHASIL' : 'GAGAL'} pada ${fmtDateTime(drDrills[selectedDrPlan.id].at)}${drDrills[selectedDrPlan.id].by ? ` oleh ${drDrills[selectedDrPlan.id].by}` : ''}${drDrills[selectedDrPlan.id].notes ? ` — ${drDrills[selectedDrPlan.id].notes}` : ''}`
                      : 'Belum pernah diuji. Lakukan latihan sesuai langkah di atas (sebaiknya di PC cadangan), lalu catat hasilnya.'}
                  </p>
                  <textarea
                    value={drillNotes}
                    onChange={(e) => setDrillNotes(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Catatan (opsional): durasi pemulihan, kendala, dll."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={isSavingDrill}
                      onClick={() => handleRecordDrill(selectedDrPlan.id, 'FAIL')}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Catat Gagal
                    </button>
                    <button
                      disabled={isSavingDrill}
                      onClick={() => handleRecordDrill(selectedDrPlan.id, 'PASS')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Catat Berhasil
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={() => setSelectedDrPlan(null)}
                    className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold cursor-pointer active:scale-95"
                  >
                    Tutup Runbook
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Restore Drill Modal (Danger Zone Confirmation) */}
          {showRestoreModal && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-600/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40">
                    <AlertOctagon className="w-8 h-8 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Zona Berbahaya: Simulasi Restore Drill</h3>
                    <p className="text-xs text-slate-500">Uji Validasi Pemulihan Database dari Snapshot</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2 text-xs text-rose-900 dark:text-rose-200">
                  <p className="font-bold">Perhatian Keamanan:</p>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Proses ini akan menguji integritas dump data, memvalidasi schema relasional, dan mensimulasikan pemulihan darurat. Seluruh riwayat akan dicatat di Audit Trail.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-300 block">
                    Ketik kata <span className="font-mono text-rose-600 font-black">RESTORE</span> untuk mengonfirmasi tindakan:
                  </label>
                  <input
                    id="input-confirm-restore"
                    type="text"
                    placeholder="Ketik RESTORE disini"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowRestoreModal(false);
                      setRestoreConfirmText('');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-confirm-execute-restore"
                    onClick={handleExecuteRestoreDrill}
                    disabled={isExecutingRestore || restoreConfirmText.trim().toUpperCase() !== 'RESTORE'}
                    className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isExecutingRestore ? 'Memulihkan...' : 'Eksekusi Simulasi Restore'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SECURITY POLICIES & HARDENING                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'policies' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  Konfigurasi Kebijakan & Hardening Keamanan
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Disimpan di server dan langsung ditegakkan untuk semua perangkat: batas sesi, penguncian login, aturan kata sandi akun baru/ganti sandi, dan masa simpan log audit.
                </p>
              </div>

              <button
                id="btn-save-security-policies"
                onClick={handleSaveSecurityConfig}
                disabled={isSavingConfig}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-black shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[40px]"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingConfig ? 'Menyimpan...' : 'Simpan Kebijakan'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Session Security */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800 space-y-3.5 shadow-2xs">
                <h4 className="text-xs font-black text-slate-900 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Session & Login Policy
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1 font-bold">Batas Waktu Sesi Tidak Aktif (Session Timeout)</label>
                    <select
                      value={securityConfig.session_timeout_minutes}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, session_timeout_minutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    >
                      <option value={0}>Nonaktif (sesi tidak berakhir otomatis — cocok untuk perangkat scanner)</option>
                      <option value={15}>15 Menit (Super Ketat)</option>
                      <option value={30}>30 Menit</option>
                      <option value={60}>60 Menit (Standar Operasional)</option>
                      <option value={120}>120 Menit</option>
                      <option value={480}>8 Jam (Shift Harian)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1 font-bold">Maksimal Percobaan Login Gagal Sebelum Lockout</label>
                    <select
                      value={securityConfig.max_login_attempts_before_lockout}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, max_login_attempts_before_lockout: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    >
                      <option value={3}>3 Kali Percobaan</option>
                      <option value={5}>5 Kali Percobaan (Rekomendasi)</option>
                      <option value={10}>10 Kali Percobaan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1 font-bold">Lama Akun Dikunci Setelah Melewati Batas</label>
                    <select
                      value={securityConfig.lockout_duration_minutes}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, lockout_duration_minutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    >
                      <option value={5}>5 Menit</option>
                      <option value={15}>15 Menit (Rekomendasi)</option>
                      <option value={30}>30 Menit</option>
                      <option value={60}>60 Menit</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-800 dark:text-zinc-300 font-bold">Izinkan Login Multi-Sesi Bersamaan</span>
                    <input
                      type="checkbox"
                      checked={securityConfig.allow_concurrent_sessions}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, allow_concurrent_sessions: e.target.checked })}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Credential Policy */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800 space-y-3.5 shadow-2xs">
                <h4 className="text-xs font-black text-slate-900 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" /> Password & Kredensial
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1 font-bold">Panjang Minimum Password</label>
                    <input
                      type="number"
                      min={6}
                      max={32}
                      value={securityConfig.min_password_length}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, min_password_length: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 dark:text-zinc-300 font-bold">Wajib Mengandung Angka & Simbol</span>
                    <input
                      type="checkbox"
                      checked={securityConfig.require_numbers && securityConfig.require_special_char}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, require_numbers: e.target.checked, require_special_char: e.target.checked })}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1 font-bold">Retensi Arsip Audit Trail (Hari)</label>
                    <select
                      value={securityConfig.audit_retention_days}
                      onChange={(e) => setSecurityConfig({ ...securityConfig, audit_retention_days: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    >
                      <option value={90}>90 Hari (3 Bulan)</option>
                      <option value={180}>180 Hari (6 Bulan)</option>
                      <option value={365}>365 Hari (1 Tahun - Rekomendasi)</option>
                      <option value={1095}>1095 Hari (3 Tahun)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

