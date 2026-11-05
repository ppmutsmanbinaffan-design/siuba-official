import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Lock, CheckCircle2, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { MaintenanceSystemConfig, AppEnvironment } from '../types';
import { User } from '../../../types';

interface EnvironmentGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MaintenanceSystemConfig;
  currentUser: User;
  onSaveConfig: (partial: Partial<MaintenanceSystemConfig>) => void;
}

export const EnvironmentGuardModal: React.FC<EnvironmentGuardModalProps> = ({
  isOpen,
  onClose,
  config,
  currentUser,
  onSaveConfig
}) => {
  const [appEnv, setAppEnv] = useState<AppEnvironment>(config.app_env);
  const [allowReset, setAllowReset] = useState<boolean>(config.allow_database_reset);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(config.maintenance_mode);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      app_env: appEnv,
      allow_database_reset: allowReset,
      maintenance_mode: maintenanceMode
    });
    onClose();
  };

  return (
    <div id="env-guard-modal-backdrop" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1F5C45]/10 text-[#1F5C45] dark:text-[#2F7D5A] flex items-center justify-center border border-[#1F5C45]/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Environment & Safety Guard</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Proteksi tingkat sistem database SIUBA v1.0.7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          {/* Target Environment */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Environment Aplikasi (APP_ENV)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'production', label: 'Production', desc: 'Proteksi Maksimal' },
                { id: 'staging', label: 'Staging', desc: 'Uji Pra-Rilis' },
                { id: 'local', label: 'Local / Dev', desc: 'Pengembangan' }
              ].map((env) => (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => setAppEnv(env.id as AppEnvironment)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer min-h-[44px] ${
                    appEnv === env.id
                      ? 'border-[#1F5C45] bg-[#1F5C45]/10 text-[#1F5C45] dark:text-[#2F7D5A] font-bold shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="font-bold text-xs">{env.label}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{env.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle ALLOW_DATABASE_RESET */}
          <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Izinkan Reset Database (ALLOW_DATABASE_RESET)</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Jika dinonaktifkan, seluruh tombol eksekusi reset database dikunci.</p>
              </div>
              <input
                type="checkbox"
                checked={allowReset}
                onChange={(e) => setAllowReset(e.target.checked)}
                className="w-5 h-5 accent-[#1F5C45] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Toggle MAINTENANCE_MODE */}
          <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Mode Pemeliharaan (MAINTENANCE_MODE)</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Kunci akses transaksi presensi santri & scanner untuk umum selama pemeliharaan.</p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {appEnv === 'production' && allowReset && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Peringatan Produksi:</strong> Mengaktifkan izin reset pada environment Produksi sangat tidak disarankan demi keamanan data operasional santri.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 cursor-pointer min-h-[44px]"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm cursor-pointer min-h-[44px] transition-all"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
