import React from 'react';
import { 
  Database, 
  HardDrive, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  Radio,
  Server
} from 'lucide-react';
import { MaintenanceSubTab, MaintenanceSystemConfig } from '../types';
import { MaintenanceService } from '../services/maintenanceService';
import { User } from '../../../types';
import { DangerZoneCard } from './DangerZoneCard';

interface SystemStatusTabProps {
  currentUser: User;
  fullDataset: Record<string, any>;
  config: MaintenanceSystemConfig;
  onNavigateTab: (tab: MaintenanceSubTab) => void;
  onOpenEnvGuard: () => void;
  onRunQuickIntegrityScan: () => void;
}

export const SystemStatusTab: React.FC<SystemStatusTabProps> = ({
  currentUser,
  fullDataset,
  config,
  onNavigateTab,
  onOpenEnvGuard,
  onRunQuickIntegrityScan
}) => {
  const summary = MaintenanceService.getDatabaseSummary(fullDataset);
  const isSuperAdmin = MaintenanceService.checkPermission(currentUser, 'reset');
  const isProd = config.app_env === 'production';
  const lastIntegrity = MaintenanceService.getLastIntegrityResult();

  return (
    <div id="maintenance-system-status-tab" className="space-y-6">
      {/* Top Environment & Guard Status Banner */}
      <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm relative overflow-hidden backdrop-blur-md transition-all ${
        isProd
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/50'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              isProd 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                : 'bg-[#1F5C45]/10 text-[#1F5C45] dark:text-[#2F7D5A] border-[#1F5C45]/20'
            }`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isProd
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                    : config.app_env === 'staging'
                    ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                    : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                }`}>
                  ENV: {config.app_env.toUpperCase()}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  config.allow_database_reset
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                }`}>
                  RESET: {config.allow_database_reset ? 'DIIZINKAN' : 'DIKUNCI'}
                </span>
                {config.maintenance_mode && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 animate-pulse">
                    MODE PEMELIHARAAN AKTIF
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                SIUBA Core System & Database Engine v1.0.7
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Pusat monitoring integritas, repositori backup terenkripsi, dan pemeliharaan aman.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={onOpenEnvGuard}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer min-h-[44px]"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Guard Settings</span>
            </button>
            <button
              onClick={() => onNavigateTab('backup')}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all cursor-pointer min-h-[44px]"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Backup Database</span>
            </button>
          </div>
        </div>

        {isProd && (
          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-500/30 flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Mode Produksi Terdeteksi:</strong> Seluruh tindakan pemeliharaan yang berpotensi destruktif dibatasi. Pastikan backup terbaru dibuat sebelum melakukan pemeliharaan berkala.
            </p>
          </div>
        )}
      </div>

      {/* Top 4 Key Metric Cards Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated DB Size */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold mb-2">
            <span>Estimasi Ukuran DB</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{summary.sizeHuman}</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 font-sans">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{summary.totalRecords.toLocaleString()}</span> baris data aktif
          </div>
        </div>

        {/* Last Backup Status */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold mb-2">
            <span>Backup Terakhir</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white truncate font-mono">
            {summary.lastBackup ? summary.lastBackup.id.slice(0, 14) + '...' : 'Belum Ada Backup'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            {summary.lastBackup ? (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Terverifikasi ({summary.lastBackup.size_human})
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" /> Sangat Disarankan Backup
              </span>
            )}
          </div>
        </div>

        {/* Integrity Health Score */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold mb-2">
            <span>Skor Integritas Data</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {lastIntegrity ? `${lastIntegrity.health_score_percent}%` : '100%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            {lastIntegrity && lastIntegrity.issues_count > 0 ? (
              <span className="text-amber-700 dark:text-amber-400 font-bold">{lastIntegrity.issues_count} temuan terdeteksi</span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Struktur Relasi Optimal
              </span>
            )}
          </div>
        </div>

        {/* Subsystem Health */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold mb-2">
            <span>Status Sub-Sistem</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ONLINE</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-mono font-medium">
            Vite + React + Spatie RBAC
          </div>
        </div>
      </div>

      {/* Database Summary Detail Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
              <span>Ringkasan Master & Entitas Database SIUBA</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Jumlah rekaman data aktif per modul operasional</p>
          </div>
          <button
            onClick={onRunQuickIntegrityScan}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1F5C45] dark:text-[#2F7D5A] hover:underline transition-colors cursor-pointer py-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Jalankan Audit Integritas</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {summary.metrics.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                <span className="font-bold text-slate-700 dark:text-zinc-300">{item.domain}</span>
                <span className="text-[9px] uppercase font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">TABEL</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono my-1">
                {item.count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 dark:text-zinc-300 font-semibold truncate">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backup Card */}
        <div 
          onClick={() => onNavigateTab('backup')}
          className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-[#1F5C45] dark:hover:border-[#2F7D5A] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform shadow-2xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#1F5C45] dark:group-hover:text-[#2F7D5A] transition-colors">Repositori Backup</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Buat snapshot & unduh JSON terverifikasi</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-[#1F5C45] dark:text-[#2F7D5A] pt-3 border-t border-slate-100 dark:border-zinc-800">
            <span>Buka Backup Center</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Integrity Card */}
        <div 
          onClick={() => onNavigateTab('integrity')}
          className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Pemeriksaan Integritas</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Deteksi duplikat QR/RFID & orphan data</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <span>Audit Relasi Data</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Logs Card */}
        <div 
          onClick={() => onNavigateTab('logs')}
          className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-purple-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 dark:text-purple-400 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Log Maintenance</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Riwayat audit trail backup & reset sistem</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <span>Lihat Riwayat Log</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Dedicated Danger Zone Component */}
      <DangerZoneCard
        appEnv={config.app_env}
        allowReset={config.allow_database_reset}
        canPerformReset={isSuperAdmin}
        onNavigateToReset={() => onNavigateTab('reset')}
        onOpenEnvGuard={onOpenEnvGuard}
      />
    </div>
  );
};
