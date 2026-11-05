import React from 'react';
import { AlertTriangle, Database, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { AppEnvironment } from '../types';

interface DangerZoneCardProps {
  appEnv: AppEnvironment;
  allowReset: boolean;
  canPerformReset: boolean;
  onNavigateToReset: () => void;
  onOpenEnvGuard: () => void;
}

export const DangerZoneCard: React.FC<DangerZoneCardProps> = ({
  appEnv,
  allowReset,
  canPerformReset,
  onNavigateToReset,
  onOpenEnvGuard
}) => {
  const isProd = appEnv === 'production';
  const isResetDisabled = !allowReset || isProd || !canPerformReset;

  return (
    <div id="maintenance-danger-zone" className="border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/20 rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-hidden backdrop-blur-md">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              DANGER ZONE / TINDAKAN BERISIKO TINGGI
            </span>
            {isProd && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                PRODUKSI TERPROTEKSI
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-rose-950 dark:text-rose-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            Reset Database & Pengosongan Data Pesantren
          </h3>
          <p className="text-xs sm:text-sm text-rose-800/80 dark:text-rose-200/80 leading-relaxed">
            Operasi ini akan menghapus riwayat presensi harian, sesi terjadwal, dan catatan operasional secara permanen. Eksekusi dilindungi oleh <strong>Backup Verifikasi Otomatis</strong>, <strong>Konfirmasi Frasa Teks</strong>, dan <strong>Re-Autentikasi Sandi</strong>.
          </p>

          {!allowReset && (
            <div className="inline-flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 px-3 py-1.5 rounded-xl font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Reset database dinonaktifkan pada environment ini melalui <code>ALLOW_DATABASE_RESET=false</code>.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0">
          <button
            onClick={onOpenEnvGuard}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer min-h-[44px]"
          >
            Konfigurasi Guard
          </button>

          <button
            onClick={onNavigateToReset}
            disabled={isResetDisabled}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all min-h-[44px] shadow-sm ${
              isResetDisabled
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-300 dark:border-zinc-700/50'
                : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Mulai Wizard Reset</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
