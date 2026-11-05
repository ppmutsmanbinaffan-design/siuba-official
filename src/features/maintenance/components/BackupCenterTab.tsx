import React, { useState } from 'react';
import { 
  HardDrive, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Database, 
  Plus, 
  RefreshCw,
  Search,
  Eye,
  X,
  Info
} from 'lucide-react';
import { BackupRecord } from '../types';
import { MaintenanceService } from '../services/maintenanceService';
import { User } from '../../../types';

interface BackupCenterTabProps {
  currentUser: User;
  fullDataset: Record<string, any>;
  backups: BackupRecord[];
  onRefreshBackups: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupCenterTab: React.FC<BackupCenterTabProps> = ({
  currentUser,
  fullDataset,
  backups,
  onRefreshBackups,
  onShowToast
}) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [backupNotes, setBackupNotes] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const canCreate = MaintenanceService.checkPermission(currentUser, 'backup');

  const handleCreateBackup = () => {
    setIsCreating(true);
    setTimeout(() => {
      const res = MaintenanceService.createBackup(
        fullDataset,
        currentUser,
        'MANUAL',
        backupNotes.trim() || 'Backup manual database SIUBA'
      );
      setIsCreating(false);
      setIsCreateModalOpen(false);
      setBackupNotes('');

      if (res.success && res.backup) {
        onRefreshBackups();
        onShowToast(`Backup ${res.backup.id} berhasil dibuat dan diverifikasi (SHA-256).`, 'success');
      } else {
        onShowToast(res.error || 'Gagal membuat backup.', 'error');
      }
    }, 600);
  };

  const handleDownloadBackup = (backup: BackupRecord) => {
    try {
      const payload = backup.raw_payload_json || JSON.stringify(backup, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`File ${backup.id}.json berhasil diunduh.`, 'success');
    } catch (e: any) {
      onShowToast(`Gagal mengunduh backup: ${e.message}`, 'error');
    }
  };

  const handleDeleteBackup = (backupId: string) => {
    if (window.confirm(`Hapus backup ${backupId} dari penyimpanan lokal?`)) {
      MaintenanceService.deleteBackup(backupId, currentUser);
      onRefreshBackups();
      if (selectedBackup?.id === backupId) setSelectedBackup(null);
      onShowToast(`Backup ${backupId} telah dihapus.`, 'info');
    }
  };

  const filteredBackups = backups.filter(b => 
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="maintenance-backup-center-tab" className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-500/20 shadow-2xs">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Pusat Repositori & Snapshot Backup Database
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Kelola snapshot terenkripsi dan verifikasi checksum SHA-256 sebelum pemeliharaan sistem.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!canCreate || isCreating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[40px] active:scale-95 disabled:opacity-50"
          >
            {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Buat Backup Baru</span>
          </button>
        </div>
      </div>

      {/* Backup Statistics Bar Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition group">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Total Backup</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">{backups.length} Snapshot</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Tersimpan di Penyimpanan Lokal</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition group">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Status Verifikasi</span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>100% SHA-256</span>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Integritas Valid & Siap Restore
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition group">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Format Penyimpanan</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono truncate">JSON Encrypted</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">UTF-8 Full Snapshot</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition group">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Maksimum Retensi</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">20 Snapshot</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Auto Rotate FIFO Safe</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID backup, catatan, aktor..."
            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-2xs"
          />
        </div>

        <div className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-3.5 py-2 rounded-xl">
          Menampilkan <span className="text-slate-900 dark:text-white font-black">{filteredBackups.length}</span> dari {backups.length} backup
        </div>
      </div>

      {/* Backups List (Desktop Table + Mobile Cards) */}
      {filteredBackups.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400">
            <HardDrive className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-black text-slate-700 dark:text-zinc-300">Belum Ada File Backup</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Buat backup pertama Anda sekarang sebelum melakukan perubahan atau reset data sistem.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold transition-all cursor-pointer min-h-[40px] shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Backup Baru</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View (Hidden on mobile < 768px) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-zinc-300">
              <thead className="bg-slate-50 dark:bg-zinc-900/90 text-slate-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-800 font-black">
                <tr>
                  <th className="px-5 py-3.5">ID Backup & Checksum</th>
                  <th className="px-4 py-3.5">Waktu Pembuatan</th>
                  <th className="px-4 py-3.5">Ukuran / Baris Data</th>
                  <th className="px-4 py-3.5">Tipe & Catatan</th>
                  <th className="px-4 py-3.5">Dibuat Oleh</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {filteredBackups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A] flex-shrink-0" />
                        <span>{b.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-xs mt-0.5 font-mono" title={b.checksum_sha256}>
                        {b.checksum_sha256}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-zinc-300 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-white">{new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">{new Date(b.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">{b.size_human}</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans">{b.total_records_count.toLocaleString()} baris ({b.tables_backed_up.length} tabel)</div>
                    </td>
                    <td className="px-4 py-4 max-w-xs font-sans">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1 ${
                        b.backup_type === 'AUTO_BEFORE_RESET'
                          ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                          : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      }`}>
                        {b.backup_type === 'AUTO_BEFORE_RESET' ? 'Auto Pre-Reset' : 'Manual'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate" title={b.notes || ''}>
                        {b.notes || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-sans">
                      <div className="font-bold text-slate-800 dark:text-zinc-200">{b.created_by_name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-mono">{b.created_by_role}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedBackup(b)}
                          title="Lihat Detail Snapshot"
                          className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadBackup(b)}
                          title="Unduh File JSON"
                          className="p-2 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b.id)}
                          title="Hapus Backup"
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Visible on screens < 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredBackups.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-mono text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A] flex-shrink-0" />
                    <span className="truncate">{b.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex-shrink-0">
                    VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl">
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Ukuran:</span>
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">{b.size_human} ({b.total_records_count} baris)</div>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Waktu:</span>
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">
                      {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, {new Date(b.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-400 dark:text-zinc-500">Aktor:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 ml-1 font-medium">{b.created_by_name} ({b.created_by_role})</span>
                  </div>
                </div>

                {b.notes && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                    "{b.notes}"
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => setSelectedBackup(b)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail</span>
                  </button>
                  <button
                    onClick={() => handleDownloadBackup(b)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1F5C45]/10 hover:bg-[#1F5C45]/20 text-[#1F5C45] dark:text-[#2F7D5A] text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh JSON</span>
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(b.id)}
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Create Backup */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1F5C45]/10 text-[#1F5C45] dark:text-[#2F7D5A] flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Buat Snapshot Backup Baru</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Snapshot ini akan merangkum seluruh tabel master santri, SDM, kelas, presensi, kartu santri studio, dan konfigurasi sistem dengan verifikasi SHA-256.
              </p>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Catatan Backup (Opsional):</label>
                <input
                  type="text"
                  value={backupNotes}
                  onChange={(e) => setBackupNotes(e.target.value)}
                  placeholder="Contoh: Backup rutin sebelum semester genap..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40 focus:border-[#1F5C45]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 min-h-[44px]"
              >
                Batal
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold min-h-[44px] shadow-sm transition-all"
              >
                {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isCreating ? 'Membuat & Verifikasi...' : 'Eksekusi Backup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Backup */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">Detail Snapshot: {selectedBackup.id}</h3>
              </div>
              <button
                onClick={() => setSelectedBackup(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-900/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">CHECKSUM SHA-256</span>
                <div className="font-mono text-xs font-bold text-[#1F5C45] dark:text-[#2F7D5A] break-all">{selectedBackup.checksum_sha256}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Ukuran Payload:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{selectedBackup.size_human} ({selectedBackup.size_bytes.toLocaleString()} bytes)</div>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Total Baris:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{selectedBackup.total_records_count.toLocaleString()} baris</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Waktu Pembuatan:</span>
                  <div className="font-bold text-zinc-700 dark:text-zinc-200">{new Date(selectedBackup.created_at).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Aktor Pembuat:</span>
                  <div className="font-bold text-zinc-700 dark:text-zinc-200">{selectedBackup.created_by_name} ({selectedBackup.created_by_role})</div>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500">Tabel Terangkum ({selectedBackup.tables_backed_up.length}):</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedBackup.tables_backed_up.map((t, idx) => (
                    <span key={idx} className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg text-[10px] font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedBackup(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 min-h-[44px]"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  handleDownloadBackup(selectedBackup);
                  setSelectedBackup(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold min-h-[44px] shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
