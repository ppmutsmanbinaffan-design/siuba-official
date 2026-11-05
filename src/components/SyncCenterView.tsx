import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Smartphone, 
  Database, 
  HardDrive, 
  Layers, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Trash2, 
  Server, 
  Check, 
  X,
  Radio,
  ArrowRight,
  Info,
  Search,
  Filter,
  PlusCircle,
  Eye,
  Zap,
  Cpu,
  Upload,
  Activity,
  CheckCheck,
  ChevronRight,
  Shield,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  PlayCircle
} from 'lucide-react';
import { 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceRecord, 
  AttendanceRecordHistory, 
  Student, 
  StudentExcusal, 
  AttendanceDevice, 
  User,
  PendingAttendanceItem,
  CachedPreparedSession,
  ClientInstallation,
  DatabaseBackupMeta,
  ServerConnectivityState,
  AttendanceStatus
} from '../types';
import { OfflineStorageService } from '../services/offlineStorageService';
import { ServerConnectivityService } from '../services/serverConnectivityService';
import { OfflineSyncService } from '../services/offlineSyncService';
import { LocalBackupService } from '../services/localBackupService';

interface SyncCenterViewProps {
  sessions?: AttendanceSession[];
  participants?: AttendanceSessionParticipant[];
  sessionParticipants?: AttendanceSessionParticipant[];
  records?: AttendanceRecord[];
  recordHistories?: AttendanceRecordHistory[];
  students?: Student[];
  activities?: any[];
  excusals?: StudentExcusal[];
  devices?: AttendanceDevice[];
  currentUser: User;
  onUpdateRecords?: (records: AttendanceRecord[]) => void;
  onUpdateRecordHistories?: (histories: AttendanceRecordHistory[]) => void;
  onUpdateParticipants?: (participants: AttendanceSessionParticipant[]) => void;
  onApplySyncedRecords?: (records: AttendanceRecord[]) => void;
  onRestoreDatabase?: (dump: any) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SyncCenterView: React.FC<SyncCenterViewProps> = ({
  sessions = [],
  participants = [],
  sessionParticipants = [],
  records = [],
  recordHistories = [],
  students = [],
  activities = [],
  excusals = [],
  devices = [],
  currentUser,
  onUpdateRecords = (_recs: AttendanceRecord[]) => {},
  onUpdateRecordHistories = (_histories: AttendanceRecordHistory[]) => {},
  onUpdateParticipants = (_parts: AttendanceSessionParticipant[]) => {},
  onApplySyncedRecords,
  onRestoreDatabase,
  onShowToast,
  onNavigateToTab
}) => {
  const safeSessions = sessions || [];
  const safeParticipants = participants?.length ? participants : (sessionParticipants || []);
  const safeRecords = records || [];
  const safeHistories = recordHistories || [];
  const safeStudents = students || [];
  const safeExcusals = excusals || [];
  const safeDevices = devices || [];

  const [activeTab, setActiveTab] = useState<'queue' | 'prepare' | 'conflicts' | 'backup' | 'deployment' | 'tutorial'>('queue');
  const [connectivityState, setConnectivityState] = useState<ServerConnectivityState>('SERVER_ONLINE');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingItems, setPendingItems] = useState<PendingAttendanceItem[]>([]);
  const [preparedSessions, setPreparedSessions] = useState<CachedPreparedSession[]>([]);
  const [installation, setInstallation] = useState<ClientInstallation>(OfflineStorageService.getInstallation());
  const [storageMetrics, setStorageMetrics] = useState(OfflineStorageService.getStorageMetrics());
  const [backupHistory, setBackupHistory] = useState<DatabaseBackupMeta[]>(LocalBackupService.getBackupHistory());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [deviceNameInput, setDeviceNameInput] = useState<string>(installation.device_name);
  const [isEditingDeviceName, setIsEditingDeviceName] = useState<boolean>(false);
  const [restoreTestResult, setRestoreTestResult] = useState<string | null>(null);

  // Filter and Search states for Queue
  const [queueSearchQuery, setQueueSearchQuery] = useState<string>('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('ALL');
  const [selectedQueueItem, setSelectedQueueItem] = useState<PendingAttendanceItem | null>(null);

  // Category filter for Prepare Sessions
  const [prepareCategoryFilter, setPrepareCategoryFilter] = useState<string>('ALL');

  // Tutorial Interactive State
  const [selectedTutorialStep, setSelectedTutorialStep] = useState<number>(1);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
    chk1: true,
    chk2: true,
    chk3: false,
    chk4: false,
    chk5: false
  });
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(1);

  const refreshLocalState = () => {
    setPendingItems(OfflineStorageService.getPendingRecords());
    setPreparedSessions(OfflineStorageService.getPreparedSessions());
    setStorageMetrics(OfflineStorageService.getStorageMetrics());
    setInstallation(OfflineStorageService.getInstallation());
    setBackupHistory(LocalBackupService.getBackupHistory());
  };

  useEffect(() => {
    refreshLocalState();
    const unsubscribe = ServerConnectivityService.subscribe((state, simulated) => {
      setConnectivityState(state);
      setIsSimulatedOffline(simulated);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleSimulatedOffline = () => {
    const next = !isSimulatedOffline;
    ServerConnectivityService.setSimulatedOffline(next);
    setIsSimulatedOffline(next);
    onShowToast(
      next 
        ? 'Mode Simulasi Server Offline AKTIF (Perangkat terputus dari LAN server)' 
        : 'Mode Simulasi Server Offline DINONAKTIFKAN (Server terhubung kembali)',
      next ? 'info' : 'success'
    );
  };

  const handleSaveDeviceName = () => {
    if (deviceNameInput.trim()) {
      OfflineStorageService.updateInstallationName(deviceNameInput.trim());
      setInstallation(OfflineStorageService.getInstallation());
      setIsEditingDeviceName(false);
      onShowToast('Nama terminal PWA berhasil diperbarui', 'success');
    }
  };

  const handlePrepareSession = (session: AttendanceSession) => {
    const cached = OfflineStorageService.prepareSessionForOffline(session, safeParticipants, safeStudents);
    refreshLocalState();
    onShowToast(
      `Sesi "${session.activity_name}" siap offline (${cached.participant_count} santri dicache)`,
      'success'
    );
  };

  const handlePrepareAllActiveSessions = () => {
    const active = safeSessions.filter(s => s && s.status !== 'cancelled');
    if (active.length === 0) {
      onShowToast('Tidak ada sesi aktif untuk disiapkan.', 'info');
      return;
    }

    let totalStudents = 0;
    active.forEach(session => {
      const cached = OfflineStorageService.prepareSessionForOffline(session, safeParticipants, safeStudents);
      totalStudents += cached.participant_count;
    });

    refreshLocalState();
    onShowToast(`✓ Berhasil menyiapkan ${active.length} sesi aktif (${totalStudents} santri) ke cache offline perangkat!`, 'success');
  };

  const handleRemovePreparedSession = (sessionId: number) => {
    OfflineStorageService.removePreparedSession(sessionId);
    refreshLocalState();
    onShowToast('Cache offline sesi berhasil dihapus', 'info');
  };

  const handleSyncAllPending = () => {
    if (connectivityState === 'SERVER_OFFLINE') {
      onShowToast('Tidak dapat sinkronisasi: Server sedang offline / terputus.', 'error');
      return;
    }

    const itemsToSync = (pendingItems || []).filter(p => p && (p.sync_status === 'pending' || p.sync_status === 'failed'));
    if (itemsToSync.length === 0) {
      onShowToast('Tidak ada antrean absensi pending untuk disinkronkan.', 'info');
      return;
    }

    setIsSyncing(true);

    setTimeout(() => {
      const { batchResponse, updatedRecords, updatedHistories, updatedParticipants } = OfflineSyncService.processSyncBatch(
        itemsToSync,
        safeSessions,
        safeParticipants,
        safeRecords,
        safeHistories,
        safeStudents,
        currentUser
      );

      if (onUpdateRecords) onUpdateRecords(updatedRecords);
      if (onApplySyncedRecords) onApplySyncedRecords(updatedRecords);
      if (onUpdateRecordHistories) onUpdateRecordHistories(updatedHistories);
      if (onUpdateParticipants) onUpdateParticipants(updatedParticipants);

      refreshLocalState();
      setIsSyncing(false);

      if (batchResponse.conflict_count > 0) {
        onShowToast(
          `Sinkronisasi selesai: ${batchResponse.success_count} berhasil, ${batchResponse.conflict_count} konflik perlu ditinjau.`,
          'info'
        );
      } else if (batchResponse.failed_count > 0) {
        onShowToast(
          `Sinkronisasi selesai: ${batchResponse.success_count} berhasil, ${batchResponse.failed_count} gagal validasi.`,
          'error'
        );
      } else {
        onShowToast(
          `Semua ${batchResponse.success_count} absensi offline berhasil disinkronkan ke server!`,
          'success'
        );
      }
    }, 600);
  };

  const handleResolveConflict = (item: PendingAttendanceItem, decision: 'ACCEPT_OFFLINE' | 'KEEP_SERVER') => {
    const result = OfflineSyncService.resolveConflict(
      item,
      decision,
      safeRecords,
      safeHistories,
      safeParticipants,
      currentUser
    );

    if (onUpdateRecords) onUpdateRecords(result.updatedRecords);
    if (onUpdateRecordHistories) onUpdateRecordHistories(result.updatedHistories);
    if (onUpdateParticipants) onUpdateParticipants(result.updatedParticipants);

    refreshLocalState();
    onShowToast(result.message, 'success');
  };

  const handleBatchResolveAllConflicts = (decision: 'ACCEPT_OFFLINE' | 'KEEP_SERVER') => {
    const conflicts = (pendingItems || []).filter(p => p && p.sync_status === 'conflict');
    if (conflicts.length === 0) {
      onShowToast('Tidak ada konflik yang perlu diselesaikan.', 'info');
      return;
    }

    let lastUpdatedRecords = safeRecords;
    let lastUpdatedHistories = safeHistories;
    let lastUpdatedParticipants = safeParticipants;

    conflicts.forEach(item => {
      const result = OfflineSyncService.resolveConflict(
        item,
        decision,
        lastUpdatedRecords,
        lastUpdatedHistories,
        lastUpdatedParticipants,
        currentUser
      );
      lastUpdatedRecords = result.updatedRecords;
      lastUpdatedHistories = result.updatedHistories;
      lastUpdatedParticipants = result.updatedParticipants;
    });

    if (onUpdateRecords) onUpdateRecords(lastUpdatedRecords);
    if (onUpdateRecordHistories) onUpdateRecordHistories(lastUpdatedHistories);
    if (onUpdateParticipants) onUpdateParticipants(lastUpdatedParticipants);

    refreshLocalState();
    onShowToast(`✓ Berhasil menyelesaikan ${conflicts.length} konflik (${decision === 'ACCEPT_OFFLINE' ? 'Terima Data Offline' : 'Pertahankan Data Server'}).`, 'success');
  };

  // Create simulated offline attendance item for demonstration/testing
  const handleAddSampleOfflineRecord = () => {
    if (safeStudents.length === 0 || safeSessions.length === 0) {
      onShowToast('Dibutuhkan minimal 1 data santri dan 1 sesi aktif untuk simulasi.', 'error');
      return;
    }

    const randomStudent = safeStudents[Math.floor(Math.random() * safeStudents.length)];
    const activeSession = safeSessions.find(s => s.status !== 'cancelled') || safeSessions[0];

    const newItem: PendingAttendanceItem = {
      local_id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      client_request_id: 'req_' + Math.random().toString(36).substring(2, 14) + Date.now(),
      session_id: activeSession.id,
      activity_name: activeSession.activity_name,
      student_id: randomStudent.id,
      student_name: randomStudent.name,
      student_number: randomStudent.student_number,
      classroom_name: randomStudent.classroom || 'Kelas Santri',
      requested_status: 'present',
      attendance_method: 'rfid_card',
      captured_at_client: new Date().toISOString(),
      client_installation_id: installation.installation_id,
      operator_id: currentUser.id,
      operator_name: currentUser.name,
      sync_status: 'pending',
      retry_count: 0
    };

    OfflineStorageService.addPendingRecord(newItem);
    refreshLocalState();
    onShowToast(`✓ Simulasi absensi offline santri "${randomStudent.name}" berhasil ditambahkan ke antrean!`, 'success');
  };

  const handleCreateBackup = () => {
    const { meta, jsonContent } = LocalBackupService.createDatabaseBackup({
      students: safeStudents,
      sessions: safeSessions,
      participants: safeParticipants,
      records: safeRecords,
      excusals: safeExcusals,
      devices: safeDevices,
      operatorName: currentUser.name
    });

    LocalBackupService.downloadBackupFile(meta.filename, jsonContent);
    refreshLocalState();
    onShowToast(`Backup database "${meta.filename}" berhasil dibuat dan diunduh.`, 'success');
  };

  const handleSimulateRestoreTest = () => {
    const samplePayload = JSON.stringify({
      meta: { app: 'SIUBA', version: 'v1.10.0', created_at: new Date().toISOString() },
      data: { students: safeStudents, sessions: safeSessions, records: safeRecords }
    });

    const res = LocalBackupService.validateRestorePayload(samplePayload);
    setRestoreTestResult(
      res.valid 
        ? `Integritas Valid: ${res.counts?.students} santri, ${res.counts?.sessions} sesi, ${res.counts?.records} catatan kehadiran siap dipulihkan.`
        : `Verifikasi Gagal: ${res.message}`
    );
  };

  const pendingCount = (pendingItems || []).filter(p => p && (p.sync_status === 'pending' || p.sync_status === 'syncing')).length;
  const conflictCount = (pendingItems || []).filter(p => p && p.sync_status === 'conflict').length;
  const syncedCount = (pendingItems || []).filter(p => p && p.sync_status === 'synced').length;

  // Filtered Queue
  const filteredQueueItems = useMemo(() => {
    return (pendingItems || []).filter(item => {
      if (!item) return false;
      if (queueStatusFilter !== 'ALL' && item.sync_status !== queueStatusFilter) return false;
      if (queueSearchQuery.trim()) {
        const q = queueSearchQuery.toLowerCase();
        const matchName = item.student_name?.toLowerCase().includes(q);
        const matchNis = item.student_number?.toLowerCase().includes(q);
        const matchActivity = item.activity_name?.toLowerCase().includes(q);
        const matchMethod = item.attendance_method?.toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchActivity && !matchMethod) return false;
      }
      return true;
    });
  }, [pendingItems, queueStatusFilter, queueSearchQuery]);

  return (
    <div id="sync-center-view" className="space-y-6 pb-12">
      {/* Top Banner & Status Cockpit: SIUBA Emerald Gradient */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl shadow-md border border-[#164735] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Smartphone className="w-48 h-48 text-amber-300" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-white/15 rounded-2xl border border-white/20 text-amber-300 backdrop-blur-xs shadow-2xs">
              <Smartphone className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 bg-black/30 px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  PWA & Offline-First Engine
                </span>
                <span className="text-[10px] font-mono text-emerald-100 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                  IndexedDB Resilient
                </span>
                <span className="text-[10px] font-bold text-white bg-emerald-700/60 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  LAN BUFFER ACTIVE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                Pusat Sinkronisasi & PWA Offline-First
              </h1>
              <p className="text-xs text-emerald-100/90 mt-1 max-w-3xl leading-relaxed">
                Ketahanan Jaringan LAN Pesantren &bull; Antrean Absensi Offline Idempotent &bull; Resolusi Konflik Mutasi &bull; Manajemen Snapshot Backup Lokal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Connectivity Pill */}
            <div className={`px-4 py-2.5 rounded-2xl flex items-center gap-2.5 font-bold text-xs shadow-inner backdrop-blur-xs transition-all ${
              connectivityState === 'SERVER_ONLINE'
                ? 'bg-emerald-800/90 text-emerald-100 border border-emerald-500/40'
                : 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
            }`}>
              {connectivityState === 'SERVER_ONLINE' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <Wifi className="w-4 h-4 text-emerald-300" />
                  <span>Server LAN: Terhubung</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                  <WifiOff className="w-4 h-4 text-amber-300" />
                  <span>Server LAN: Terputus (Offline Buffer)</span>
                </>
              )}
            </div>

            {/* Offline Simulation Toggle */}
            <button
              id="btn-toggle-simulated-offline"
              onClick={handleToggleSimulatedOffline}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 min-h-[42px] ${
                isSimulatedOffline
                  ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 border border-amber-300'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-xs'
              }`}
            >
              <Radio className="w-4 h-4" />
              {isSimulatedOffline ? 'Simulasi Terputus (Klik Pulihkan)' : 'Simulasi Putus Jaringan'}
            </button>
          </div>
        </div>

        {/* Cockpit Stats Row (Bento Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-emerald-800/60">
          <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Antrean Menunggu</span>
            <span className="text-2xl font-black text-white mt-0.5 block font-mono">{pendingCount}</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Siap disinkronkan</span>
          </div>

          <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Konflik / Review</span>
            <span className="text-2xl font-black text-amber-300 mt-0.5 block font-mono">{conflictCount}</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Perlu keputusan operator</span>
          </div>

          <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Sesi Siap Offline</span>
            <span className="text-2xl font-black text-white mt-0.5 block font-mono">{preparedSessions.length}</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">{storageMetrics.cachedParticipantCount} santri ter-cache</span>
          </div>

          <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Cache IndexedDB</span>
            <span className="text-2xl font-black text-white mt-0.5 block font-mono">
              {(storageMetrics.estimatedSizeBytes / 1024).toFixed(1)} KB
            </span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Storage Client Offline</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Pill Bar */}
      <div className="bg-slate-100/90 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        {[
          { id: 'queue', label: `Antrean Absensi (${pendingItems.length})`, icon: RefreshCw, badge: pendingCount > 0 ? `${pendingCount} Pending` : undefined, alert: pendingCount > 0 },
          { id: 'prepare', label: `Siapkan Sesi Offline (${preparedSessions.length})`, icon: Layers },
          { id: 'conflicts', label: `Resolusi Konflik (${conflictCount})`, icon: AlertTriangle, alert: conflictCount > 0 },
          { id: 'backup', label: 'Backup & Pemulihan Database', icon: Database },
          { id: 'deployment', label: 'Arsitektur Local LAN & PWA', icon: Server },
          { id: 'tutorial', label: 'Panduan & Tutorial PWA', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-sync-${tab.id}`}
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
      {/* TAB 1: PENDING QUEUE                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Antrean Absensi Lokal Perangkat</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Data kehadiran yang dicatat saat perangkat offline atau terputus sementara dari server LAN pesantren.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
              <button
                id="btn-add-sample-offline"
                onClick={handleAddSampleOfflineRecord}
                className="px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                title="Tambahkan data uji untuk simulasi offline"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>+ Uji Catatan Offline</span>
              </button>

              {syncedCount > 0 && (
                <button
                  id="btn-clear-synced"
                  onClick={() => {
                    const count = OfflineStorageService.clearSyncedRecords();
                    refreshLocalState();
                    onShowToast(`Berhasil membersihkan ${count} catatan yang sudah tersinkronisasi.`, 'info');
                  }}
                  className="px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4 text-slate-500" />
                  <span>Hapus yg Sync ({syncedCount})</span>
                </button>
              )}

              <button
                id="btn-sync-all-now"
                onClick={handleSyncAllPending}
                disabled={isSyncing || pendingCount === 0 || connectivityState === 'SERVER_OFFLINE'}
                className="px-5 py-2.5 text-xs font-black bg-[#1F5C45] hover:bg-[#12372A] disabled:opacity-50 text-white rounded-2xl flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer min-h-[40px]"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : `Sinkronkan Sekarang (${pendingCount})`}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari santri, NIS, kegiatan..."
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {['ALL', 'pending', 'synced', 'conflict', 'failed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setQueueStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                      queueStatusFilter === st
                        ? 'bg-[#1F5C45] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'SEMUA' : st.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-500 font-mono self-end md:self-auto">
              Menampilkan {filteredQueueItems.length} dari {pendingItems.length} antrean
            </span>
          </div>

          {filteredQueueItems.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 p-12 text-center rounded-3xl border border-slate-200/90 dark:border-zinc-800 space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-500/20">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-base">Antrean Bersih & Tersinkronisasi</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                Seluruh absensi telah tersimpan di server pusat atau tidak ada item antrean yang sesuai filter pencarian.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-950/80 text-slate-600 dark:text-zinc-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-200 dark:border-zinc-800">
                      <th className="py-3.5 px-4">Santri</th>
                      <th className="py-3.5 px-4">Sesi & Kegiatan</th>
                      <th className="py-3.5 px-4">Waktu Capture</th>
                      <th className="py-3.5 px-4">Metode</th>
                      <th className="py-3.5 px-4">Status Request</th>
                      <th className="py-3.5 px-4">Status Sync</th>
                      <th className="py-3.5 px-4">Idempotency ID</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                    {filteredQueueItems.map((item) => {
                      return (
                        <tr key={item.local_id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition">
                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-zinc-200">
                            <div className="font-bold text-slate-900 dark:text-white">{item.student_name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{item.student_number} • {item.classroom_name || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300">
                            <span className="font-bold text-slate-900 dark:text-zinc-200">{item.activity_name || `Sesi #${item.session_id}`}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">
                            <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-zinc-200">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{new Date(item.captured_at_client).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">{new Date(item.captured_at_client).toLocaleDateString('id-ID')}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase border border-slate-200 dark:border-zinc-700">
                              {item.attendance_method}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.requested_status === 'present' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30' :
                              item.requested_status === 'late' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30' :
                              item.requested_status === 'absent' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30' :
                              'bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                            }`}>
                              {item.requested_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {item.sync_status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                PENDING SYNC
                              </span>
                            )}
                            {item.sync_status === 'syncing' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                SYNCING...
                              </span>
                            )}
                            {item.sync_status === 'synced' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                <Check className="w-3 h-3 text-emerald-600" />
                                TERSINKRON
                              </span>
                            )}
                            {item.sync_status === 'conflict' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                KONFLIK
                              </span>
                            )}
                            {item.sync_status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                                GAGAL
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400 font-mono text-[10px]">
                            {item.client_request_id.slice(0, 16)}...
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedQueueItem(item)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-emerald-700 cursor-pointer"
                                title="Lihat rincian payload"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  OfflineStorageService.removePendingRecord(item.local_id);
                                  refreshLocalState();
                                  onShowToast('Catatan berhasil dihapus dari antrean lokal', 'info');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Hapus dari antrean lokal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Queue Item Detail Modal */}
          {selectedQueueItem && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Rincian Antrean Offline</h3>
                  </div>
                  <button onClick={() => setSelectedQueueItem(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Santri:</span>
                    <span className="font-bold text-slate-900 dark:text-zinc-200">{selectedQueueItem.student_name} ({selectedQueueItem.student_number})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Kegiatan:</span>
                    <span className="text-slate-800 dark:text-zinc-200">{selectedQueueItem.activity_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Status:</span>
                    <span className="font-black uppercase text-emerald-700">{selectedQueueItem.requested_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Metode:</span>
                    <span className="uppercase font-mono">{selectedQueueItem.attendance_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Waktu Capture:</span>
                    <span className="font-mono">{new Date(selectedQueueItem.captured_at_client).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Operator:</span>
                    <span>{selectedQueueItem.operator_name || 'Petugas'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                    <span className="text-slate-500 font-bold block mb-1">Client Request ID (Idempotency):</span>
                    <span className="font-mono text-[10px] break-all bg-white dark:bg-zinc-900 p-2 rounded-xl block border border-slate-200 dark:border-zinc-800">
                      {selectedQueueItem.client_request_id}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedQueueItem(null)}
                    className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold cursor-pointer"
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
      {/* TAB 2: PREPARE SESSION FOR OFFLINE                                        */}
      {/* ========================================================================= */}
      {activeTab === 'prepare' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Siapkan Sesi untuk Operasional Offline</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl">
                Unduh snapshot daftar santri dan barcode/RFID ke IndexedDB browser saat terhubung ke LAN, sehingga absensi (Manual / QR Scanner) dapat tetap berjalan lancar meski koneksi terputus di aula/lapangan.
              </p>
            </div>

            <button
              id="btn-prepare-all-active"
              onClick={handlePrepareAllActiveSessions}
              className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 shrink-0 min-h-[40px]"
            >
              <CheckCheck className="w-4 h-4 text-amber-300" />
              <span>Cache Semua Sesi Aktif Hari Ini</span>
            </button>
          </div>

          {/* Cached Sessions List */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Sesi yang Sudah Tersimpan di Perangkat Ini ({preparedSessions.length})
            </h4>

            {preparedSessions.length === 0 ? (
              <div className="bg-slate-50 dark:bg-zinc-950 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 text-center text-xs text-slate-500 space-y-2">
                <Layers className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                <p>Belum ada sesi yang disiapkan untuk offline. Silakan pilih sesi aktif di bawah untuk diunduh ke cache perangkat.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {preparedSessions.map((session) => (
                  <div key={session.session_id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-500/30 shadow-sm hover:shadow-md transition space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-full font-black text-[10px] border border-emerald-200 dark:border-emerald-500/30 uppercase">
                          {session.category_name}
                        </span>
                        <h5 className="font-black text-slate-900 dark:text-white text-sm mt-1.5">{session.activity_name}</h5>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono font-bold">{session.session_code}</p>
                      </div>
                      <button
                        onClick={() => handleRemovePreparedSession(session.session_id)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Hapus cache sesi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-zinc-950 p-3.5 rounded-2xl text-xs space-y-1.5 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800">
                      <div className="flex justify-between">
                        <span>Peserta Ter-cache:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{session.participant_count} Santri</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Sesi:</span>
                        <span className="font-bold capitalize text-emerald-700 dark:text-emerald-400">{session.status_at_cache_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Disiapkan Pada:</span>
                        <span className="font-mono">{new Date(session.cached_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('manual-attendance')}
                          className="flex-1 py-2 px-3 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-2xl text-xs font-bold text-center shadow-xs cursor-pointer active:scale-95"
                        >
                          Absensi Manual
                        </button>
                      )}
                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('qr-scanner')}
                          className="flex-1 py-2 px-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl text-xs font-bold hover:bg-slate-200 text-center cursor-pointer active:scale-95"
                        >
                          QR Scanner
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Active Sessions to Prepare */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Pilih Sesi dari Server untuk Disiapkan Offline</h4>
              <span className="text-xs text-slate-500">{safeSessions.filter(s => s && s.status !== 'cancelled').length} Sesi Aktif</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeSessions.filter(s => s && s.status !== 'cancelled').map((session) => {
                const isPrepared = (preparedSessions || []).some(p => p && p.session_id === session.id);
                return (
                  <div key={session.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-full border border-slate-200 dark:border-zinc-700">
                          {session.category_name || session.activity_name}
                        </span>
                        <h5 className="font-black text-slate-900 dark:text-white text-sm mt-1.5">{session.activity_name}</h5>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono font-bold">{session.session_code}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        session.status === 'open' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        session.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                        'bg-sky-50 text-sky-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{session.start_at.slice(11, 16)} - {session.end_at.slice(11, 16)} WIB</span>
                    </div>

                    <button
                      onClick={() => handlePrepareSession(session)}
                      className={`w-full py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
                        isPrepared
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-100'
                          : 'bg-[#1F5C45] text-white hover:bg-[#12372A]'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>{isPrepared ? 'Perbarui Cache Offline' : 'Siapkan untuk Offline'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFLICT RESOLUTION                                                */}
      {/* ========================================================================= */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Pusat Resolusi Konflik Sinkronisasi</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl">
                Ketika terjadi ketidaksesuaian data antara rekaman offline perangkat dan status di server (misalnya rekaman manual operator server vs scan offline perangkat), sistem melindungi data agar tidak tertimpa secara diam-diam.
              </p>
            </div>

            {conflictCount > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleBatchResolveAllConflicts('KEEP_SERVER')}
                  className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  Semua Pilih Server
                </button>
                <button
                  onClick={() => handleBatchResolveAllConflicts('ACCEPT_OFFLINE')}
                  className="px-3.5 py-2 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-black cursor-pointer shadow-xs"
                >
                  Semua Terima Offline
                </button>
              </div>
            )}
          </div>

          {(pendingItems || []).filter(p => p && p.sync_status === 'conflict').length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 p-12 text-center rounded-3xl border border-slate-200/90 dark:border-zinc-800 space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-500/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-base">Tidak Ada Konflik Data</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                Seluruh rekaman offline dan server konsisten 100%. Tidak ada data yang membutuhkan intervensi admin.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(pendingItems || []).filter(p => p && p.sync_status === 'conflict').map((item) => (
                <div key={item.local_id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-amber-200 dark:border-amber-500/40 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 rounded-full font-black text-xs border border-amber-300 dark:border-amber-500/30">
                          {item.conflict_code || 'KONFLIK_STATUS'}
                        </span>
                        <h4 className="font-black text-slate-900 dark:text-white text-base">{item.student_name} ({item.student_number})</h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        Sesi: <strong className="text-slate-800 dark:text-zinc-200">{item.activity_name || `#${item.session_id}`}</strong> &bull; Operator: {item.operator_name}
                      </p>
                    </div>

                    <div className="text-xs text-slate-400 font-mono">
                      Req ID: {item.client_request_id.slice(0, 14)}...
                    </div>
                  </div>

                  {/* Side-by-Side Diff Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-xs">
                    <div className="border-r border-slate-200/80 dark:border-zinc-800 pr-2">
                      <span className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">Data Offline Perangkat:</span>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-zinc-400">Status Diminta:</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 uppercase">{item.requested_status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-zinc-400">Metode:</span>
                          <span className="font-bold uppercase font-mono">{item.attendance_method}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-zinc-400">Waktu Capture:</span>
                          <span className="font-mono">{new Date(item.captured_at_client).toLocaleTimeString('id-ID')} WIB</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">Status Terkini di Server:</span>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-zinc-400">Status Server:</span>
                          <span className="font-black text-rose-700 dark:text-rose-400 uppercase">
                            {item.server_final_status || 'TERDAPAT PERBEDAAN'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-zinc-400">Alasan Konflik:</span>
                          <span className="text-slate-800 dark:text-zinc-200 font-medium">{item.conflict_message || 'Diubah oleh operator server'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-3 pt-2">
                    <button
                      onClick={() => handleResolveConflict(item, 'KEEP_SERVER')}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-2xl cursor-pointer"
                    >
                      Pertahankan Data Server
                    </button>
                    <button
                      onClick={() => handleResolveConflict(item, 'ACCEPT_OFFLINE')}
                      className="px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-black rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Terima Data Offline ({item.requested_status.toUpperCase()})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BACKUP & PEMULIHAN                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Manajemen Backup & Pemulihan Database Lokal</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Pencadangan data seluruh santri, sesi kehadiran, rekap izin sakit, dan terminal secara mandiri tanpa ketergantungan cloud.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="btn-test-restore-preflight"
                onClick={handleSimulateRestoreTest}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Uji Validasi Restore</span>
              </button>

              <button
                id="btn-create-backup-now"
                onClick={handleCreateBackup}
                className="px-5 py-2.5 text-xs font-black bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-2xl flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer min-h-[40px]"
              >
                <Download className="w-4 h-4" />
                <span>Buat Backup Sekarang (.JSON)</span>
              </button>
            </div>
          </div>

          {restoreTestResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 rounded-3xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Hasil Simulasi Pre-flight Restore Drill:</span>
                <span>{restoreTestResult}</span>
              </div>
            </div>
          )}

          {/* Backup History Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 font-black text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Riwayat Backup Database Lokal
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/50 dark:bg-zinc-950/50 text-slate-600 dark:text-zinc-400 font-bold border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase">
                <tr>
                  <th className="py-3.5 px-4">Nama File</th>
                  <th className="py-3.5 px-4">Waktu Dibuat</th>
                  <th className="py-3.5 px-4">Ukuran</th>
                  <th className="py-3.5 px-4">Cakupan Data</th>
                  <th className="py-3.5 px-4">Checksum SHA256</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {backupHistory.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{b.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">
                      {new Date(b.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300 font-bold">{b.size_formatted}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">
                      {b.record_counts.students} Santri &bull; {b.record_counts.sessions} Sesi &bull; {b.record_counts.records} Rekaman
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px]">{b.checksum}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-full font-black text-[10px] border border-emerald-200 dark:border-emerald-500/30">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEPLOYMENT & PWA SPECS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
          {/* Terminal Identity Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 space-y-4 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white text-base">Identitas Terminal PWA Ini</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                <span className="text-slate-500 dark:text-zinc-400 block font-bold uppercase text-[10px]">Nama Terminal / Device</span>
                {isEditingDeviceName ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="text"
                      value={deviceNameInput}
                      onChange={(e) => setDeviceNameInput(e.target.value)}
                      className="border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl px-2.5 py-1 text-xs w-full text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={handleSaveDeviceName}
                      className="p-1.5 bg-[#1F5C45] text-white rounded-xl cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-black text-slate-900 dark:text-white text-sm">{installation.device_name}</span>
                    <button
                      onClick={() => setIsEditingDeviceName(true)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                <span className="text-slate-500 dark:text-zinc-400 block font-bold uppercase text-[10px]">Installation UUID</span>
                <span className="font-mono text-slate-900 dark:text-white font-black mt-1.5 block truncate">
                  {installation.installation_id}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                <span className="text-slate-500 dark:text-zinc-400 block font-bold uppercase text-[10px]">Platform & Versi</span>
                <span className="font-bold text-slate-900 dark:text-white mt-1.5 block">
                  {installation.platform} ({installation.app_version})
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                <span className="text-slate-500 dark:text-zinc-400 block font-bold uppercase text-[10px]">Clock Offset Server</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 mt-1.5 block font-mono">
                  {OfflineStorageService.getClockOffset()} ms (Sinkron)
                </span>
              </div>
            </div>
          </div>

          {/* Local Deployment Architecture Checklist */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 space-y-4 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white text-base">Panduan Standar Deployment Server Lokal Pesantren</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  1. Local Production Stack (Ubuntu / Debian)
                </div>
                <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  Web server Nginx + PHP 8.2-FPM + MariaDB 10.11 running as systemd services. Menjamin auto-restart saat power outage dan tidak bergantung pada artisan serve.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  2. Local HTTPS & Domain (https://siuba.local)
                </div>
                <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  Sertifikat TLS mandiri (Self-signed / mkcert) pada router DNS local. Mengaktifkan izin Camera API untuk PWA QR Scanner dan Service Worker tanpa internet publik.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  3. Static LAN IP Reservation (192.168.1.200)
                </div>
                <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  IP Server statis di router DHCP. Terminal RFID ESP32 (Sprint 5) dan client PWA tetap dapat menjangkau endpoint API meski router di-reboot.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  4. Automated Linux Cron Scheduler
                </div>
                <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  Crontab memanggil <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono">* * * * * php artisan schedule:run</code> untuk auto-generation sesi akademik, auto-close shalat, dan daily backup harian pukul 02:00 WIB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PANDUAN & TUTORIAL INTERAKTIF PWA                                  */}
      {/* ========================================================================= */}
      {activeTab === 'tutorial' && (
        <div className="space-y-6">
          {/* Hero Tutorial Banner */}
          <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <BookOpen className="w-48 h-48 text-amber-300" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-white/15 rounded-2xl border border-white/20 text-amber-300 backdrop-blur-xs shadow-2xs">
                  <BookOpen className="w-8 h-8 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 bg-black/30 px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Panduan Interaktif Lapangan
                    </span>
                    <span className="text-[10px] font-mono text-emerald-100 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                      SOP Resmi SIUBA PWA
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                    Tutorial & Panduan Praktik Lapangan PWA Offline
                  </h3>
                  <p className="text-xs text-emerald-100/90 mt-1 max-w-3xl leading-relaxed">
                    Panduan operasional resmi bagi pengurus, ustadz/ustadzah, dan musyrif untuk mengoperasikan absensi santri di aula, asrama, dan lapangan tanpa gangguan koneksi internet.
                  </p>
                </div>
              </div>

              {/* Action Jump to Simulator */}
              <button
                onClick={() => {
                  const el = document.getElementById('interactive-sandbox-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#12372A] hover:bg-emerald-50 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                <PlayCircle className="w-4 h-4 text-[#1F5C45]" />
                <span>Buka Simulator Praktik &darr;</span>
              </button>
            </div>
          </div>

          {/* Stepper Navigation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step Selector List */}
            <div className="space-y-3">
              <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider px-1">
                5 Alur Kerja Utama PWA Offline:
              </h4>

              {[
                {
                  num: 1,
                  title: '1. Persiapan Cache Sesi di Kantor',
                  subtitle: 'Unduh daftar santri saat masih terhubung WiFi',
                  badge: 'Tahap Pra-Lapangan'
                },
                {
                  num: 2,
                  title: '2. Rekam Presensi di Lapangan',
                  subtitle: 'Scan QR / tap santri meski tanpa internet',
                  badge: 'Mode Offline Aktif'
                },
                {
                  num: 3,
                  title: '3. Sinkronisasi Idempotent',
                  subtitle: 'Kirim data antrean begitu kembali ke LAN',
                  badge: 'Auto / 1-Klik'
                },
                {
                  num: 4,
                  title: '4. Resolusi Konflik Multi-Device',
                  subtitle: 'Review jika ada perbedaan data server vs HP',
                  badge: 'Proteksi Integritas'
                },
                {
                  num: 5,
                  title: '5. Backup Mandiri & Kesiapan Bencana',
                  subtitle: 'Pencadangan snapshot lokal ber-checksum',
                  badge: 'Disaster Recovery'
                }
              ].map((step) => {
                const isSelected = selectedTutorialStep === step.num;
                return (
                  <button
                    key={step.num}
                    onClick={() => setSelectedTutorialStep(step.num)}
                    className={`w-full text-left p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-[#1F5C45] text-white border-[#164735] shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200/90 dark:border-zinc-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        isSelected ? 'bg-black/30 text-amber-300 border border-amber-300/30' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}>
                        {step.badge}
                      </span>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <h5 className={`font-black text-sm mt-2 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {step.title}
                    </h5>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isSelected ? 'text-emerald-100/90' : 'text-slate-500 dark:text-zinc-400'}`}>
                      {step.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Step Detail Interactive Workspace */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1 Detail */}
              {selectedTutorialStep === 1 && (
                <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Tahap 1 dari 5</span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        Persiapan & Unduh Cache Sesi Sebelum Menuju Lapangan
                      </h4>
                    </div>
                    <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                      <Layers className="w-6 h-6 text-emerald-600" />
                    </span>
                  </div>

                  <div className="prose prose-sm text-slate-600 dark:text-zinc-300 space-y-3 text-xs leading-relaxed">
                    <p>
                      Sebelum petugas atau musyrif bergerak ke lokasi kegiatan (misalnya Masjid Utama, Aula Barat, atau Lapangan Olahraga) yang belum terjangkau sinyal WiFi:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 font-medium bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                      <li>Buka menu <strong>Pusat Sinkronisasi & PWA</strong> pada laptop atau HP Android Anda saat masih terhubung ke WiFi kantor.</li>
                      <li>Pilih sub-tab <strong>"Siapkan Sesi Offline"</strong>.</li>
                      <li>Klik tombol <strong>"Siapkan untuk Offline"</strong> pada sesi kegiatan yang akan diabsen (misal: <em>Shalat Subuh Berjamaah</em> atau <em>KBM Tahfidz</em>).</li>
                      <li>Sistem secara otomatis mengunduh daftar santri, foto, dan kode unik QR/RFID ke penyimpanan browser lokal (IndexedDB).</li>
                    </ol>
                  </div>

                  {/* Step Action & Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => {
                        setActiveTab('prepare');
                        onShowToast('Membuka tab Siapkan Sesi Offline...', 'info');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-2xl cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>Buka Sub-Tab Siapkan Sesi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setSelectedTutorialStep(2)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-2xl cursor-pointer"
                    >
                      Lanjut ke Tahap 2 &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 Detail */}
              {selectedTutorialStep === 2 && (
                <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Tahap 2 dari 5</span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        Pencatatan Presensi di Lapangan (Mode Offline)
                      </h4>
                    </div>
                    <span className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl">
                      <Radio className="w-6 h-6 text-amber-600" />
                    </span>
                  </div>

                  <div className="prose prose-sm text-slate-600 dark:text-zinc-300 space-y-3 text-xs leading-relaxed">
                    <p>
                      Saat berada di aula/lapangan tanpa koneksi internet, sistem tetap dapat digunakan 100% tanpa hambatan:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 font-medium bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                      <li>Buka menu <strong>Absensi Manual</strong> atau <strong>QR Scanner</strong>.</li>
                      <li>Scan kartu barcode/QR santri menggunakan kamera HP atau centang kehadiran santri secara manual.</li>
                      <li>Setiap data presensi akan langsung diberi stempel waktu lokal (WIB) yang akurat beserta <strong>Idempotency Request ID</strong> unik.</li>
                      <li>Data tersimpan aman di antrean lokal perangkat dan tidak akan hilang meskipun browser ditutup atau HP mati.</li>
                    </ol>
                  </div>

                  {/* Step Action & Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleAddSampleOfflineRecord}
                      className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-2xl cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Tambah Simulasi Catatan Offline</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedTutorialStep(1)}
                        className="px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 text-xs font-bold rounded-2xl"
                      >
                        &larr; Tahap 1
                      </button>
                      <button
                        onClick={() => setSelectedTutorialStep(3)}
                        className="px-4 py-2.5 bg-[#1F5C45] text-white text-xs font-bold rounded-2xl"
                      >
                        Lanjut Tahap 3 &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 Detail */}
              {selectedTutorialStep === 3 && (
                <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Tahap 3 dari 5</span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        Re-koneksi & Sinkronisasi Idempotent Otomatis
                      </h4>
                    </div>
                    <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                      <RefreshCw className="w-6 h-6 text-emerald-600" />
                    </span>
                  </div>

                  <div className="prose prose-sm text-slate-600 dark:text-zinc-300 space-y-3 text-xs leading-relaxed">
                    <p>
                      Setelah kegiatan selesai dan petugas kembali ke area jangkauan WiFi kantor/pesantren:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 font-medium bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                      <li>Perangkat otomatis mendeteksi koneksi server LAN (indikator berubah menjadi <strong>Server LAN: Terhubung</strong>).</li>
                      <li>Masuk ke menu <strong>Pusat Sinkronisasi & PWA</strong> &gt; sub-tab <strong>Antrean Absensi</strong>.</li>
                      <li>Klik tombol <strong>"Sinkronkan Sekarang"</strong>.</li>
                      <li>Sistem mengirimkan seluruh rekaman secara batch. Berkat arsitektur <em>Idempotency Key</em>, penekanan tombol berulang kali tidak akan menyebabkan data kehadiran ganda.</li>
                    </ol>
                  </div>

                  {/* Step Action & Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => {
                        setActiveTab('queue');
                        handleSyncAllPending();
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-2xl cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Buka Antrean & Sinkronkan</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedTutorialStep(2)}
                        className="px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 text-xs font-bold rounded-2xl"
                      >
                        &larr; Tahap 2
                      </button>
                      <button
                        onClick={() => setSelectedTutorialStep(4)}
                        className="px-4 py-2.5 bg-[#1F5C45] text-white text-xs font-bold rounded-2xl"
                      >
                        Lanjut Tahap 4 &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 Detail */}
              {selectedTutorialStep === 4 && (
                <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Tahap 4 dari 5</span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        Penanganan & Resolusi Konflik Multi-Perangkat
                      </h4>
                    </div>
                    <span className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl">
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    </span>
                  </div>

                  <div className="prose prose-sm text-slate-600 dark:text-zinc-300 space-y-3 text-xs leading-relaxed">
                    <p>
                      Konflik data terjadi jika seorang santri diabsen secara berbeda di dua perangkat berbeda atau jika admin telah mengubah status santri tersebut di server:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 font-medium bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                      <li>Sistem tidak akan menimpa data sembarangan (prinsip <em>Zero Silent Overwrite</em>).</li>
                      <li>Data yang berkonflik otomatis masuk ke sub-tab <strong>"Resolusi Konflik"</strong>.</li>
                      <li>Operator dapat melihat perbandingan <em>Side-by-Side</em> antara rekaman offline dan data server.</li>
                      <li>Pilih <strong>"Terima Data Offline"</strong> jika data lapangan yang benar, atau <strong>"Pertahankan Data Server"</strong> jika server yang valid.</li>
                    </ol>
                  </div>

                  {/* Step Action & Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('conflicts')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl cursor-pointer"
                    >
                      Buka Sub-Tab Resolusi Konflik ({conflictCount}) &rarr;
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedTutorialStep(3)}
                        className="px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 text-xs font-bold rounded-2xl"
                      >
                        &larr; Tahap 3
                      </button>
                      <button
                        onClick={() => setSelectedTutorialStep(5)}
                        className="px-4 py-2.5 bg-[#1F5C45] text-white text-xs font-bold rounded-2xl"
                      >
                        Lanjut Tahap 5 &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 Detail */}
              {selectedTutorialStep === 5 && (
                <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Tahap 5 dari 5</span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        Pencadangan Mandiri & Kesiapsiagaan Bencana (Disaster Recovery)
                      </h4>
                    </div>
                    <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                      <Database className="w-6 h-6 text-emerald-600" />
                    </span>
                  </div>

                  <div className="prose prose-sm text-slate-600 dark:text-zinc-300 space-y-3 text-xs leading-relaxed">
                    <p>
                      Untuk memastikan kepatuhan standar ISO/Disaster Recovery Pesantren:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 font-medium bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                      <li>Masuk ke sub-tab <strong>"Backup & Pemulihan Database"</strong>.</li>
                      <li>Klik <strong>"Buat Backup Sekarang (.JSON)"</strong> untuk mengunduh snapshot database lengkap dengan kalkulasi SHA-256 Checksum.</li>
                      <li>Lakukan pengujian rutin menggunakan tombol <strong>"Uji Validasi Restore"</strong> untuk memastikan backup dapat dipulihkan dengan target <strong>RTO &le; 30 menit</strong>.</li>
                    </ol>
                  </div>

                  {/* Step Action & Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleCreateBackup}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-2xl cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Buat Backup Snapshot Sekarang</span>
                    </button>

                    <button
                      onClick={() => setSelectedTutorialStep(1)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-2xl cursor-pointer"
                    >
                      &larr; Kembali ke Tahap 1
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive Field Checklist */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-4">
                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  Checklist Kesiapan Operasional Petugas Lapangan:
                </h4>

                <div className="space-y-2.5">
                  {[
                    { id: 'chk1', text: 'Baterai perangkat laptop/smartphone di atas 50% sebelum menuju lapangan.' },
                    { id: 'chk2', text: 'Sesi kehadiran aktif telah di-cache ke IndexedDB saat masih terhubung ke WiFi kantor.' },
                    { id: 'chk3', text: 'Kamera scanner QR telah diizinkan izin aksesnya di browser HP/PWA.' },
                    { id: 'chk4', text: 'Lakukan sinkronisasi antrean segera setelah kembali dalam jangkauan WiFi LAN pesantren.' },
                    { id: 'chk5', text: 'Pastikan angka Antrean Menunggu kembali menjadi 0 setelah proses sinkronisasi selesai.' },
                  ].map((chk) => (
                    <label
                      key={chk.id}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 cursor-pointer hover:border-emerald-300 transition"
                    >
                      <input
                        type="checkbox"
                        checked={!!checklistState[chk.id]}
                        onChange={(e) => setChecklistState({ ...checklistState, [chk.id]: e.target.checked })}
                        className="mt-0.5 rounded accent-emerald-700 w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-xs ${checklistState[chk.id] ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-800 dark:text-zinc-200 font-medium'}`}>
                        {chk.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Accordion FAQ */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  Tanya Jawab Seputar PWA & Offline (FAQ):
                </h4>

                <div className="space-y-2.5">
                  {[
                    {
                      id: 1,
                      q: 'Apakah data santri akan hilang jika baterai HP habis saat offline?',
                      a: 'Tidak. Seluruh rekaman tersimpan di penyimpanan persisten browser IndexedDB. Begitu HP dinyalakan kembali dan membuka browser, seluruh antrean tetap ada dan siap disinkronkan.'
                    },
                    {
                      id: 2,
                      q: 'Bagaimana cara memasang aplikasi ini sebagai aplikasi native di HP Android / Laptop?',
                      a: 'Cukup buka aplikasi melalui Google Chrome / Edge, lalu klik ikon "Instal Aplikasi" di bilah alamat browser atau pilih menu "Tambahkan ke Layar Utama". Aplikasi akan berjalan seperti aplikasi native tanpa perlu Google Play Store.'
                    },
                    {
                      id: 3,
                      q: 'Apakah scanner kamera QR tetap bisa membaca kartu tanpa sinyal internet?',
                      a: 'Bisa. Modul pembaca barcode dan decoder gambar telah dikompilasi ke dalam Service Worker lokal sehingga kamera dapat mendeteksi QR santri secara instan tanpa perlu komunikasi ke internet publik.'
                    },
                    {
                      id: 4,
                      q: 'Bagaimana jika jam di HP petugas berbeda dengan jam server utama?',
                      a: 'Sistem memiliki fitur Clock Offset Synchronization otomatis. Selisih waktu antara HP dan Server dikalkulasi dan dikoreksi saat data dikirim ke server pusat sehingga catatan waktu kehadiran tetap akurat.'
                    }
                  ].map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div key={faq.id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                        <button
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full p-3.5 text-left bg-slate-50 dark:bg-zinc-950 flex items-center justify-between gap-2 font-bold text-xs text-slate-800 dark:text-zinc-200 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <span className="text-emerald-700 dark:text-emerald-400 text-sm font-bold">{isExpanded ? '−' : '+'}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3.5 bg-white dark:bg-zinc-900 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed border-t border-slate-100 dark:border-zinc-800">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

