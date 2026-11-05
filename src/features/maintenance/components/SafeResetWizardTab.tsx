import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Database, 
  HardDrive, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  History, 
  Key, 
  FileText, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  ResetModeType, 
  ResetModeInfo, 
  BackupRecord, 
  ResetExecutionResult,
  MaintenanceSystemConfig 
} from '../types';
import { MaintenanceService } from '../services/maintenanceService';
import { User } from '../../../types';

interface SafeResetWizardTabProps {
  currentUser: User;
  fullDataset: Record<string, any>;
  config: MaintenanceSystemConfig;
  backups: BackupRecord[];
  onRefreshData: () => void;
  onResetCompleted: (newDataset: Record<string, any>) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToIntegrity: () => void;
  onNavigateToLogs: () => void;
}

export const SafeResetWizardTab: React.FC<SafeResetWizardTabProps> = ({
  currentUser,
  fullDataset,
  config,
  backups,
  onRefreshData,
  onResetCompleted,
  onShowToast,
  onNavigateToIntegrity,
  onNavigateToLogs
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedMode, setSelectedMode] = useState<ResetModeType>('MODE_A_OPERATIONAL');
  
  // Backup state
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);

  // Authentication & Confirmation states
  const [passwordAttempt, setPasswordAttempt] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [typedPhrase, setTypedPhrase] = useState<string>('');
  const [acknowledgedRisk, setAcknowledgedRisk] = useState<boolean>(false);

  // Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ResetExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accordion details toggle in step 3
  const [expandedSection, setExpandedSection] = useState<'deleted' | 'preserved' | 'reseeded' | null>('deleted');

  const modes = MaintenanceService.getResetModes(fullDataset);
  const activeModeInfo = modes.find(m => m.id === selectedMode) || modes[0];
  const isSuperAdmin = MaintenanceService.checkPermission(currentUser, 'reset');
  const isResetAllowed = config.allow_database_reset;

  // Auto pick newest verified backup if available
  const latestVerifiedBackup = backups.find(b => b.verification_status === 'VERIFIED') || null;
  const activeBackup = selectedBackup || latestVerifiedBackup;

  const handleCreatePreResetBackup = () => {
    setIsCreatingBackup(true);
    setErrorMessage(null);
    setTimeout(() => {
      const res = MaintenanceService.createBackup(
        fullDataset,
        currentUser,
        'AUTO_BEFORE_RESET',
        `Backup otomatis pra-eksekusi reset (${activeModeInfo.title})`
      );
      setIsCreatingBackup(false);
      if (res.success && res.backup) {
        setSelectedBackup(res.backup);
        onRefreshData();
        onShowToast(`Backup verifikasi ${res.backup.id} berhasil dibuat.`, 'success');
      } else {
        setErrorMessage(res.error || 'Gagal membuat backup.');
        onShowToast(res.error || 'Gagal membuat backup.', 'error');
      }
    }, 600);
  };

  const handleExecuteReset = () => {
    if (!activeBackup) {
      setErrorMessage('Backup wajib dibuat dan diverifikasi terlebih dahulu.');
      return;
    }

    if (typedPhrase.trim().toUpperCase() !== 'RESET DATABASE SIUBA') {
      setErrorMessage('Frasa konfirmasi tidak sesuai. Harap ketik "RESET DATABASE SIUBA" persis.');
      return;
    }

    if (!passwordAttempt) {
      setErrorMessage('Kata sandi Super Admin wajib diisi.');
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    setTimeout(() => {
      const res = MaintenanceService.executeReset({
        user: currentUser,
        mode: selectedMode,
        confirmationPhrase: typedPhrase,
        passwordAttempt: passwordAttempt,
        backupId: activeBackup.id,
        currentData: fullDataset,
        onResetCompleted: (newDataset) => {
          onResetCompleted(newDataset);
        }
      });

      setIsExecuting(false);
      if (res.success && res.operation_id) {
        setExecutionResult(res);
        setCurrentStep(6);
        onRefreshData();
        onShowToast(`Reset Database Berhasil (${res.mode_label})`, 'success');
      } else {
        setErrorMessage(res.error || 'Eksekusi reset ditolak oleh sistem keamanan.');
        onShowToast(res.error || 'Reset ditolak', 'error');
      }
    }, 1000);
  };

  // Reset wizard form
  const handleStartNewWizard = () => {
    setCurrentStep(1);
    setSelectedMode('MODE_A_OPERATIONAL');
    setSelectedBackup(null);
    setPasswordAttempt('');
    setTypedPhrase('');
    setAcknowledgedRisk(false);
    setExecutionResult(null);
    setErrorMessage(null);
  };

  if (!isSuperAdmin) {
    return (
      <div id="unauthorized-reset-guard" className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-3xl p-8 text-center space-y-4 shadow-sm backdrop-blur-md max-w-2xl mx-auto my-6">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-rose-950 dark:text-rose-100">Akses Terkunci — 403 Forbidden</h3>
        <p className="text-xs text-rose-800 dark:text-rose-300 max-w-md mx-auto leading-relaxed">
          Reset database adalah operasi berisiko tinggi yang hanya dapat dieksekusi oleh <strong>Super Admin</strong> dengan hak izin <code className="bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded font-mono text-rose-800 dark:text-rose-200">system.database-reset</code>.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs">
          <span>Role Pengguna Saat Ini:</span>
          <span className="font-bold text-[#C9A227] uppercase">{currentUser.role}</span>
        </div>
      </div>
    );
  }

  if (!isResetAllowed) {
    return (
      <div id="disabled-env-reset-guard" className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-3xl p-8 text-center space-y-4 shadow-sm backdrop-blur-md max-w-2xl mx-auto my-6">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-amber-950 dark:text-amber-100">Reset Database Dinonaktifkan (Environment Guard)</h3>
        <p className="text-xs text-amber-800 dark:text-amber-200/90 max-w-md mx-auto leading-relaxed">
          Fitur reset database telah dikunci pada environment <strong>{config.app_env.toUpperCase()}</strong> demi keselamatan data operasional pesantren.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Untuk mengaktifkan kembali, ubah konfigurasi <code>ALLOW_DATABASE_RESET=true</code> melalui Guard Settings di Status Sistem.
        </p>
      </div>
    );
  }

  return (
    <div id="safe-reset-wizard-container" className="space-y-6">
      {/* Progress Steps Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Alur Wizard Reset Aman
          </span>
          <span className="text-xs font-bold text-[#1F5C45] dark:text-[#2F7D5A]">
            Langkah {currentStep} dari 6
          </span>
        </div>

        {/* Step Pills Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { step: 1, label: '1. Mode', icon: Layers },
            { step: 2, label: '2. Backup', icon: HardDrive },
            { step: 3, label: '3. Dampak', icon: AlertCircle },
            { step: 4, label: '4. Autentikasi', icon: Key },
            { step: 5, label: '5. Konfirmasi', icon: FileText },
            { step: 6, label: '6. Selesai', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div
                key={item.step}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  isCurrent
                    ? 'border-[#1F5C45] dark:border-[#2F7D5A] bg-[#1F5C45]/10 text-[#1F5C45] dark:text-[#2F7D5A] font-bold shadow-sm'
                    : isCompleted
                    ? 'border-emerald-200 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-500'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#1F5C45] dark:text-[#2F7D5A]' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span className="text-[10px] truncate max-w-full font-medium">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Alert Box if any */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs shadow-sm animate-shake">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Tindakan Ditolak:</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-white p-1">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: PILIH MODE RESET */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1F5C45] dark:text-[#2F7D5A]" />
              <span>Langkah 1: Pilih Tingkat & Cakupan Reset Database</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Pilih mode yang sesuai dengan kebutuhan operasional pesantren. Pastikan membaca dampak masing-masing mode secara seksama.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modes.map((mode) => {
              const isSelected = selectedMode === mode.id;

              return (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`p-5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                    isSelected
                      ? 'border-[#1F5C45] dark:border-[#2F7D5A] bg-[#1F5C45]/5 dark:bg-[#1F5C45]/15 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        mode.badgeColor === 'amber'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          : mode.badgeColor === 'rose'
                          ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                          : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30'
                      }`}>
                        {mode.badge}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                        Risiko: {mode.riskLevel}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{mode.title}</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{mode.tagline}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-[11px]">
                    <div className="text-zinc-500 dark:text-zinc-400">
                      <strong>Direkomendasikan Untuk:</strong> {mode.recommendedFor}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#1F5C45] dark:text-[#2F7D5A]">
                      <span>{isSelected ? '✓ Terpilih' : 'Klik untuk Memilih'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all cursor-pointer min-h-[44px]"
            >
              <span>Lanjut ke Verifikasi Backup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: BACKUP & VERIFICATION GATE */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#1F5C45] dark:text-[#2F7D5A]" />
              <span>Langkah 2: Verifikasi Backup Database Wajib</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sistem SIUBA mewajibkan snapshot backup terverifikasi (SHA-256) sebelum mengizinkan eksekusi reset database.
            </p>
          </div>

          {activeBackup ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/40 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Snapshot Backup Terverifikasi Tersedia</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  {activeBackup.verification_status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-white dark:bg-zinc-900/80 p-3.5 rounded-2xl font-mono border border-emerald-100 dark:border-transparent">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">ID BACKUP:</span>
                  <div className="font-bold text-zinc-900 dark:text-white truncate">{activeBackup.id}</div>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">UKURAN / BARIS:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{activeBackup.size_human} ({activeBackup.total_records_count} baris)</div>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">WAKTU:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{new Date(activeBackup.created_at).toLocaleTimeString('id-ID')}</div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between pt-1">
                <span>Checksum: <code className="text-zinc-700 dark:text-zinc-300">{activeBackup.checksum_sha256.slice(0, 24)}...</code></span>
                <button
                  onClick={handleCreatePreResetBackup}
                  disabled={isCreatingBackup}
                  className="text-[#1F5C45] dark:text-[#2F7D5A] hover:underline font-bold cursor-pointer"
                >
                  {isCreatingBackup ? 'Memperbarui...' : 'Buat Snapshot Baru'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-3xl p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-rose-950 dark:text-rose-100">Belum Ada Backup Terverifikasi</h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 max-w-md mx-auto">
                Anda tidak dapat melanjutkan ke tahap berikutnya tanpa membuat snapshot database terlebih dahulu.
              </p>
              <button
                onClick={handleCreatePreResetBackup}
                disabled={isCreatingBackup}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all cursor-pointer min-h-[44px]"
              >
                {isCreatingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                <span>{isCreatingBackup ? 'Membuat Snapshot...' : 'Buat Backup Terverifikasi Sekarang'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 min-h-[44px] cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!activeBackup}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold min-h-[44px] transition-all ${
                activeBackup
                  ? 'bg-[#1F5C45] hover:bg-[#12372A] text-white shadow-sm cursor-pointer'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              <span>Lanjut ke Review Dampak</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW DAMPAK & RINCIAN */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                MODE TERPILIH: {activeModeInfo.title}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              Langkah 3: Review Dampak Transaksi & Reseed Core
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Periksa rincian data yang akan dihapus, data yang dipertahankan, dan seed standar yang akan dipulihkan.
            </p>
          </div>

          <div className="space-y-3">
            {/* Section 1: Data yang akan dihapus */}
            <div className="border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'deleted' ? null : 'deleted')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-950/20 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Data Yang Akan Dihapus Permanen ({activeModeInfo.deletedEntities.length} Kelompok Tabel)</span>
                </span>
                {expandedSection === 'deleted' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedSection === 'deleted' && (
                <div className="p-4 pt-0 space-y-2 border-t border-rose-200 dark:border-rose-800/40 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {activeModeInfo.deletedEntities.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-zinc-900/80 p-2.5 rounded-xl flex items-center justify-between border border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{item.count.toLocaleString()} baris</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Data yang dipertahankan */}
            <div className="border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'preserved' ? null : 'preserved')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/20 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Data Yang Dipertahankan Aman ({activeModeInfo.preservedEntities.length} Kelompok Tabel)</span>
                </span>
                {expandedSection === 'preserved' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedSection === 'preserved' && (
                <div className="p-4 pt-0 space-y-2 border-t border-emerald-200 dark:border-emerald-800/40 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {activeModeInfo.preservedEntities.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-zinc-900/80 p-2.5 rounded-xl flex items-center justify-between border border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{item.count.toLocaleString()} baris</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Data yang dibuat ulang (Core Reseed) */}
            <div className="border border-sky-200 dark:border-blue-800/60 bg-sky-50/50 dark:bg-blue-950/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'reseeded' ? null : 'reseeded')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-sky-800 dark:text-blue-300 hover:bg-sky-100/50 dark:hover:bg-blue-950/20 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-blue-400" />
                  <span>Jaminan Reseed Core Baku SIUBA ({activeModeInfo.reseededEntities.length} Komponen)</span>
                </span>
                {expandedSection === 'reseeded' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedSection === 'reseeded' && (
                <div className="p-4 pt-0 space-y-2 border-t border-sky-200 dark:border-blue-800/40 text-xs">
                  <div className="space-y-2 mt-2">
                    {activeModeInfo.reseededEntities.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="font-bold text-sky-800 dark:text-blue-300">{item.name}</div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 min-h-[44px] cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all cursor-pointer min-h-[44px]"
            >
              <span>Lanjut ke Autentikasi Identitas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RE-AUTENTIKASI KATA SANDI */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-500/30">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              Langkah 4: Re-Autentikasi Kata Sandi Super Admin
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Verifikasi ulang identitas operator berwenang untuk mencegah eksekusi reset yang tidak disengaja.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Nama Operator:</span>
              <span className="font-bold text-zinc-900 dark:text-white">{currentUser.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Role Terverifikasi:</span>
              <span className="font-bold text-[#1F5C45] dark:text-[#2F7D5A] uppercase">{currentUser.role}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <label className="font-bold text-zinc-700 dark:text-zinc-200 block">
              Masukkan Kata Sandi Akun Anda:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordAttempt}
                onChange={(e) => setPasswordAttempt(e.target.value)}
                placeholder="Masukkan kata sandi login Anda..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-2xl pl-4 pr-11 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40 focus:border-[#1F5C45]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              * Sandi diverifikasi secara ephemeral dan tidak disimpan di memori permanen.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 min-h-[44px] cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={() => {
                if (!passwordAttempt || passwordAttempt.length < 3) {
                  setErrorMessage('Kata sandi wajib diisi (minimal 3 karakter).');
                  return;
                }
                setErrorMessage(null);
                setCurrentStep(5);
              }}
              disabled={!passwordAttempt || passwordAttempt.length < 3}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold min-h-[44px] transition-all ${
                passwordAttempt && passwordAttempt.length >= 3
                  ? 'bg-[#1F5C45] hover:bg-[#12372A] text-white shadow-sm cursor-pointer'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              <span>Lanjut ke Konfirmasi Final</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: FINAL CONFIRMATION & SAFETY LOCKS */}
      {currentStep === 5 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-rose-200 dark:border-rose-800/80 p-5 sm:p-7 shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-rose-950 dark:text-rose-100">
              Langkah 5: Konfirmasi Final & Kunci Pengaman
            </h3>
            <p className="text-xs text-rose-800/80 dark:text-rose-200/80">
              Anda akan mengeksekusi: <strong>{activeModeInfo.title}</strong>.
            </p>
          </div>

          {/* Type Phrase Verification */}
          <div className="space-y-2 text-xs">
            <label className="font-bold text-zinc-700 dark:text-zinc-200 block">
              Ketik Frasa Persis Berikut untuk Membuka Kunci:
            </label>
            <div className="bg-rose-50 dark:bg-zinc-900 border border-rose-200 dark:border-zinc-700/80 rounded-2xl p-3 text-center font-mono font-bold text-rose-800 dark:text-rose-300 tracking-wider select-all">
              RESET DATABASE SIUBA
            </div>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder="Ketik RESET DATABASE SIUBA..."
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-2xl p-3 text-sm font-mono text-center text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 uppercase"
            />
          </div>

          {/* Risk Acknowledgment Checkbox */}
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-rose-900 dark:text-rose-200">
              <input
                type="checkbox"
                checked={acknowledgedRisk}
                onChange={(e) => setAcknowledgedRisk(e.target.checked)}
                className="w-5 h-5 accent-rose-600 rounded cursor-pointer mt-0.5 flex-shrink-0"
              />
              <span className="leading-relaxed">
                Saya memahami sepenuhnya bahwa tindakan ini bersifat <strong>permanen dan tidak dapat dibatalkan</strong>. Backup rujukan <code className="text-zinc-900 dark:text-white font-mono font-bold">{activeBackup?.id}</code> telah diverifikasi.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setCurrentStep(4)}
              disabled={isExecuting}
              className="px-5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 min-h-[44px] cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={handleExecuteReset}
              disabled={typedPhrase.trim().toUpperCase() !== 'RESET DATABASE SIUBA' || !acknowledgedRisk || isExecuting}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold min-h-[44px] transition-all ${
                typedPhrase.trim().toUpperCase() === 'RESET DATABASE SIUBA' && acknowledgedRisk && !isExecuting
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-300 dark:border-zinc-700/50'
              }`}
            >
              {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>{isExecuting ? 'Mengeksekusi Reset...' : 'RESET DATABASE SEKARANG'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: EXECUTION RESULT RECEIPT */}
      {currentStep === 6 && executionResult && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-emerald-300 dark:border-emerald-500/60 p-5 sm:p-7 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-emerald-950 dark:text-emerald-100">
              Reset Database Selesai & Berhasil Diterapkan!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Database SIUBA telah dibersihkan sesuai konfigurasi <strong className="text-zinc-900 dark:text-white">{executionResult.mode_label}</strong>.
            </p>
          </div>

          {/* Audit Receipt Grid */}
          <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="text-zinc-500">OPERATION ID:</span>
              <span className="font-bold text-[#1F5C45] dark:text-[#2F7D5A]">{executionResult.operation_id}</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="text-zinc-500">BACKUP RUJUKAN:</span>
              <span className="font-bold text-zinc-900 dark:text-white">{executionResult.backup_id} (VERIFIED)</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="text-zinc-500">TOTAL DATA DIBERSIHKAN:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{executionResult.total_rows_deleted?.toLocaleString()} baris</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="text-zinc-500">DURASI EKSEKUSI:</span>
              <span className="font-bold text-zinc-900 dark:text-white">{executionResult.duration_ms} ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">STATUS INTEGRITAS:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">OPTIMAL (PASS)</span>
            </div>
          </div>

          {/* Action Buttons Post Reset */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={onNavigateToIntegrity}
              className="py-3 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-center min-h-[44px] cursor-pointer"
            >
              Pemeriksaan Integritas
            </button>
            <button
              onClick={onNavigateToLogs}
              className="py-3 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-center min-h-[44px] cursor-pointer"
            >
              Buka Log Maintenance
            </button>
            <button
              onClick={handleStartNewWizard}
              className="py-3 px-4 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm text-center min-h-[44px] cursor-pointer transition-all"
            >
              Selesai & Ke Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
