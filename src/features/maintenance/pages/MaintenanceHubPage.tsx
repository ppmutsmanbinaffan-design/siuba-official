import React, { useState, useEffect } from 'react';
import { 
  Server, 
  HardDrive, 
  Database, 
  ShieldCheck, 
  FileText, 
  Sliders, 
  ShieldAlert,
  Lock
} from 'lucide-react';
import { MaintenanceSubTab, MaintenanceSystemConfig, BackupRecord } from '../types';
import { MaintenanceService } from '../services/maintenanceService';
import { User } from '../../../types';
import { SystemStatusTab } from '../components/SystemStatusTab';
import { BackupCenterTab } from '../components/BackupCenterTab';
import { SafeResetWizardTab } from '../components/SafeResetWizardTab';
import { IntegrityCheckTab } from '../components/IntegrityCheckTab';
import { MaintenanceLogsTab } from '../components/MaintenanceLogsTab';
import { EnvironmentGuardModal } from '../components/EnvironmentGuardModal';

interface MaintenanceHubPageProps {
  currentUser: User;
  fullDataset: Record<string, any>;
  onResetCompleted: (newDataset: Record<string, any>) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onUpdateDataset?: (newDataset: Record<string, any>) => void;
  initialTab?: MaintenanceSubTab;
}

export const MaintenanceHubPage: React.FC<MaintenanceHubPageProps> = ({
  currentUser,
  fullDataset,
  onResetCompleted,
  onShowToast,
  onUpdateDataset,
  initialTab = 'status'
}) => {
  const [activeTab, setActiveTab] = useState<MaintenanceSubTab>(initialTab);
  const [config, setConfig] = useState<MaintenanceSystemConfig>(MaintenanceService.getConfig());
  const [backups, setBackups] = useState<BackupRecord[]>(MaintenanceService.getBackups());
  const [logs, setLogs] = useState(MaintenanceService.getLogs());
  const [isEnvGuardOpen, setIsEnvGuardOpen] = useState<boolean>(false);

  const isSuperAdmin = MaintenanceService.checkPermission(currentUser, 'reset');

  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = () => {
    setConfig(MaintenanceService.getConfig());
    setBackups(MaintenanceService.getBackups());
    setLogs(MaintenanceService.getLogs());
  };

  const handleShowToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onShowToast) onShowToast(msg, type);
  };

  const handleSaveConfig = (partial: Partial<MaintenanceSystemConfig>) => {
    const updated = MaintenanceService.updateConfig(partial, currentUser);
    setConfig(updated);
    refreshAll();
    handleShowToast('Konfigurasi environment & safety guard berhasil disimpan.', 'success');
  };

  return (
    <div id="siuba-maintenance-hub" className="space-y-6 pb-12">
      {/* Top Emerald Header Bento Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
              PUSAT PEMELIHARAAN & KEAMANAN SISTEM
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ENV: {config.app_env.toUpperCase()}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs flex items-center gap-1 ${
              config.allow_database_reset
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                : 'bg-rose-500/20 text-rose-200 border-rose-400/30'
            }`}>
              {config.allow_database_reset ? '🔓 Reset Diizinkan' : '🔒 Safety Reset Locked'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Maintenance Hub & Database Guardian
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Pusat kendali snapshot backup terenkripsi, audit integritas struktur data, manajemen safety guard environment, dan eksekusi safe reset database pesantren.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 self-start lg:self-auto flex-wrap">
          <button
            onClick={() => setIsEnvGuardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-black/30 hover:bg-black/40 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all cursor-pointer min-h-[38px] active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Guard Settings</span>
          </button>
        </div>
      </div>

      {/* Sub Tab Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-zinc-800 pb-1.5 overflow-x-auto scrollbar-none shadow-2xs">
        {[
          { id: 'status', label: 'Status Sistem', icon: Server },
          { id: 'backup', label: `Backup Database (${backups.length})`, icon: HardDrive },
          { id: 'reset', label: 'Reset Database', icon: Database, badge: isSuperAdmin ? 'Terproteksi' : 'Kunci' },
          { id: 'integrity', label: 'Pemeriksaan Integritas', icon: ShieldCheck },
          { id: 'logs', label: `Log Maintenance (${logs.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MaintenanceSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
                isActive
                  ? 'bg-[#1F5C45] text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                  isActive
                    ? 'bg-white/20 text-[#C9A227]'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'status' && (
        <SystemStatusTab
          currentUser={currentUser}
          fullDataset={fullDataset}
          config={config}
          onNavigateTab={(t) => setActiveTab(t)}
          onOpenEnvGuard={() => setIsEnvGuardOpen(true)}
          onRunQuickIntegrityScan={() => setActiveTab('integrity')}
        />
      )}

      {activeTab === 'backup' && (
        <BackupCenterTab
          currentUser={currentUser}
          fullDataset={fullDataset}
          backups={backups}
          onRefreshBackups={refreshAll}
          onShowToast={handleShowToast}
        />
      )}

      {activeTab === 'reset' && (
        <SafeResetWizardTab
          currentUser={currentUser}
          fullDataset={fullDataset}
          config={config}
          backups={backups}
          onRefreshData={refreshAll}
          onResetCompleted={(newData) => {
            onResetCompleted(newData);
            refreshAll();
          }}
          onShowToast={handleShowToast}
          onNavigateToIntegrity={() => setActiveTab('integrity')}
          onNavigateToLogs={() => setActiveTab('logs')}
        />
      )}

      {activeTab === 'integrity' && (
        <IntegrityCheckTab
          currentUser={currentUser}
          fullDataset={fullDataset}
          onShowToast={handleShowToast}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {activeTab === 'logs' && (
        <MaintenanceLogsTab
          currentUser={currentUser}
          logs={logs}
          onRefreshLogs={refreshAll}
          onShowToast={handleShowToast}
        />
      )}

      {/* Environment Guard Modal */}
      <EnvironmentGuardModal
        isOpen={isEnvGuardOpen}
        onClose={() => setIsEnvGuardOpen(false)}
        config={config}
        currentUser={currentUser}
        onSaveConfig={handleSaveConfig}
      />
    </div>
  );
};
