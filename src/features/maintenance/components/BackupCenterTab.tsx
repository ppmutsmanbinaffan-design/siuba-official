import React, { useEffect, useState } from 'react';
import { HardDrive, Download, Trash2, RefreshCw, Plus, AlertTriangle, Info, RotateCcw, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { BackupRecord } from '../types';
import { User } from '../../../types';
import { apiClient } from '../../../services/apiClient';

/**
 * Pusat Backup: backup SUNGGUHAN database server (semua tabel) ke storage/app/backups.
 * Versi sebelumnya hanya menyimpan salinan data browser ke localStorage — tidak bisa dipakai memulihkan server.
 */
interface ServerBackup {
  id: number;
  backup_id: string;
  filename: string;
  size: number;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string;
  file_exists: boolean;
  restorable: boolean;
  checksum?: string | null;
}

interface VerifyResult {
  backup_id: string;
  ok: boolean;
  checksum_ok: boolean;
  complete: boolean;
  rows: number;
  tables: number;
  counts: Record<string, number>;
  problems: string[];
  warnings: string[];
}

interface BackupCenterTabProps {
  currentUser: User;
  fullDataset?: Record<string, any>;
  backups?: BackupRecord[];
  onRefreshBackups?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  /** Tampilan ringkas (Pusat Sinkronisasi): tanpa hapus & pulihkan — kelola penuh di Maintenance Hub */
  compact?: boolean;
}

const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export const BackupCenterTab: React.FC<BackupCenterTabProps> = ({ currentUser, onShowToast, compact = false }) => {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [items, setItems] = useState<ServerBackup[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<ServerBackup | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  const isSuperAdmin =
    (currentUser as any)?.role === 'super-admin' || (currentUser as any)?.role === 'super_admin' ||
    ((currentUser as any)?.roles || []).includes('super-admin');

  const errMsg = (err: any, fallback: string) => {
    const fieldMsg = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
    return fieldMsg || err?.message || fallback;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/maintenance/backups');
      setItems(res?.data || []);
      setLastBackupAt(res?.meta?.last_backup_at || null);
      setForbidden(false);
    } catch (err: any) {
      if (err?.status === 403) {
        setForbidden(true);
        return;
      }
      onShowToast(errMsg(err, 'Gagal memuat daftar backup.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res: any = await apiClient.post('/maintenance/backups', { notes: notes.trim() || undefined });
      onShowToast(res?.message || 'Backup berhasil dibuat.', 'success');
      setNotes('');
      await load();
    } catch (err: any) {
      onShowToast(errMsg(err, 'Backup gagal.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (b: ServerBackup) => {
    try {
      const res = await fetch(`/api/v1/maintenance/backups/${encodeURIComponent(b.backup_id)}/download`, {
        headers: { Authorization: `Bearer ${apiClient.getToken() || ''}`, Accept: 'application/gzip' },
      });
      if (!res.ok) throw new Error(`Unduhan gagal (HTTP ${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = b.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      onShowToast(errMsg(err, 'Gagal mengunduh backup.'), 'error');
    }
  };

  // Uji pulih: baca seluruh isi berkas di server tanpa mengubah database
  const handleVerify = async (b: ServerBackup) => {
    setVerifying(b.backup_id);
    try {
      const res: any = await apiClient.post(`/maintenance/backups/${encodeURIComponent(b.backup_id)}/verify`, {});
      setVerifyResult(res?.data || null);
      onShowToast(res?.message || 'Uji pulih selesai.', res?.data?.ok ? 'success' : 'error');
      await load();
    } catch (err: any) {
      onShowToast(errMsg(err, 'Uji pulih gagal dijalankan.'), 'error');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (b: ServerBackup) => {
    if (!confirm(`Hapus backup ${b.backup_id}? Berkas di server ikut terhapus.`)) return;
    try {
      const res: any = await apiClient.delete(`/maintenance/backups/${encodeURIComponent(b.backup_id)}`);
      onShowToast(res?.message || 'Backup dihapus.', 'success');
      await load();
    } catch (err: any) {
      onShowToast(errMsg(err, 'Gagal menghapus backup.'), 'error');
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res: any = await apiClient.post(`/maintenance/backups/${encodeURIComponent(restoreTarget.backup_id)}/restore`, {
        confirmation: confirmText.trim(),
        reason: 'Pemulihan dari Pusat Backup',
      });
      onShowToast(res?.message || 'Database dipulihkan.', 'success');
      setRestoreTarget(null);
      setConfirmText('');
      await load();
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      onShowToast(errMsg(err, 'Pemulihan gagal.'), 'error');
    } finally {
      setRestoring(false);
    }
  };

  const ageHours = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 3600000 : Infinity;
  const expected = restoreTarget ? `PULIHKAN ${restoreTarget.backup_id}` : '';

  return (
    <div className="space-y-5">
      {forbidden ? (
        <div id="backup-forbidden" className="p-4 rounded-2xl border bg-slate-50 border-slate-200 text-slate-700 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" />
          <span>Daftar & pembuatan backup database hanya untuk Admin / Super Admin (izin Backup atau Pemeliharaan Sistem). Hubungi admin bila perlu backup.</span>
        </div>
      ) : (<>
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${ageHours <= 26 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
        {ageHours <= 26 ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />}
        <div className="text-xs leading-relaxed">
          <p className="font-black text-sm">
            {lastBackupAt ? `Backup terakhir: ${fmtDate(lastBackupAt)}` : 'Belum ada backup database.'}
          </p>
          <p className="mt-0.5">
            Backup berisi <b>seluruh data</b> (santri, absensi, SDM, KBM, pengaturan, dll.) dan disimpan di folder
            <code className="mx-1 px-1 bg-white/70 rounded">storage/app/backups</code> pada komputer server (14 backup terakhir disimpan).
            Backup otomatis dibuat tiap malam pukul 01:30 (bila penjadwal Windows terpasang) dan saat <b>jalankan-siuba.bat</b> dijalankan bila backup terakhir lebih dari 20 jam lalu.
            Unduh backup secara berkala dan simpan di flashdisk/Google Drive agar aman bila komputer server rusak.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row gap-2">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan backup (opsional), mis. Sebelum kenaikan kelas"
          className="flex-1 bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Membuat backup…' : 'Buat Backup Sekarang'}
        </button>
        <button onClick={load} className="px-3 py-2 border border-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer" title="Muat ulang">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 text-zinc-600 text-[11px] uppercase">
            <tr>
              <th className="text-left py-2.5 px-3">Backup</th>
              <th className="text-left py-2.5 px-3">Dibuat</th>
              <th className="text-left py-2.5 px-3">Isi / Catatan</th>
              <th className="text-right py-2.5 px-3">Ukuran</th>
              <th className="text-center py-2.5 px-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-zinc-400">{loading ? 'Memuat…' : 'Belum ada backup.'}</td></tr>
            )}
            {items.map((b) => (
              <tr key={b.id}>
                <td className="py-2.5 px-3">
                  <div className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-zinc-400" /> {b.backup_id}
                  </div>
                  <div className="mt-0.5">
                    {b.status === 'verified' && b.file_exists ? (
                      <span className="text-emerald-700 font-bold">Terverifikasi</span>
                    ) : b.status === 'failed' ? (
                      <span className="text-rose-700 font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Gagal</span>
                    ) : !b.file_exists ? (
                      <span className="text-amber-700 font-bold">Berkas hilang</span>
                    ) : (
                      <span className="text-zinc-500">{b.status}</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-zinc-700">
                  {fmtDate(b.created_at)}
                  <div className="text-[11px] text-zinc-400">{b.created_by}</div>
                </td>
                <td className="py-2.5 px-3 text-zinc-600 max-w-xs">{b.notes || '-'}</td>
                <td className="py-2.5 px-3 text-right font-mono">{b.size ? fmtSize(b.size) : '-'}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {b.file_exists && (
                      <button onClick={() => handleDownload(b)} title="Unduh" className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                        <Download className="w-4 h-4 text-zinc-700" />
                      </button>
                    )}
                    {b.file_exists && b.restorable && (
                      <button onClick={() => handleVerify(b)} disabled={verifying !== null} title="Uji pulih: periksa berkas bisa dibaca utuh & checksum cocok" className="p-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 cursor-pointer disabled:opacity-50">
                        {verifying === b.backup_id ? <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-700" />}
                      </button>
                    )}
                    {!compact && isSuperAdmin && b.status === 'verified' && b.file_exists && b.restorable && (
                      <button onClick={() => { setRestoreTarget(b); setConfirmText(''); }} title="Pulihkan database dari backup ini" className="p-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 cursor-pointer">
                        <RotateCcw className="w-4 h-4 text-amber-700" />
                      </button>
                    )}
                    {!compact && (
                      <button onClick={() => handleDelete(b)} title="Hapus" className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 cursor-pointer">
                        <Trash2 className="w-4 h-4 text-rose-700" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {verifyResult && (
        <div id="backup-verify-result" className={`p-4 rounded-2xl border text-xs space-y-1.5 ${verifyResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
          <p className="font-black text-sm flex items-center gap-1.5">
            {verifyResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            Uji pulih {verifyResult.backup_id}: {verifyResult.ok ? 'LAYAK DIPULIHKAN' : 'TIDAK LAYAK DIPULIHKAN'}
          </p>
          <p>
            Checksum {verifyResult.checksum_ok ? 'cocok' : 'TIDAK cocok'} &bull; isi {verifyResult.complete ? 'utuh' : 'TIDAK utuh'} &bull;{' '}
            {verifyResult.rows.toLocaleString('id-ID')} baris dari {verifyResult.tables} tabel
          </p>
          {Object.keys(verifyResult.counts || {}).length > 0 && (
            <p className="text-[11px] opacity-80">
              Terbanyak: {Object.entries(verifyResult.counts).map(([t, n]) => `${t} ${n.toLocaleString('id-ID')}`).join(' · ')}
            </p>
          )}
          {verifyResult.problems.map((m) => <p key={m} className="font-semibold">• {m}</p>)}
          {verifyResult.warnings.map((m) => <p key={m} className="text-amber-800">• {m}</p>)}
        </div>
      )}

      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Tombol <ShieldCheck className="inline w-3 h-3" /> menguji apakah backup bisa dipulihkan (berkas dibaca utuh di server, database tidak diubah).{' '}
          {compact
            ? 'Hapus & pulihkan backup dilakukan di Maintenance Hub → Pusat Backup (pemulihan khusus Super Admin).'
            : <>Pemulihan (tombol <RotateCcw className="inline w-3 h-3" />) hanya untuk Super Admin. Sebelum memulihkan, sistem otomatis membuat
              backup pengaman dari data saat ini, dan bila pemulihan gagal di tengah jalan seluruh perubahan dibatalkan.</>}{' '}
          Backup juga bisa dibuat lewat terminal: <code className="px-1 bg-white rounded">php artisan system:backup</code>.
        </span>
      </div>
      </>)}

      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-black text-zinc-900">Pulihkan database?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Seluruh data saat ini akan <b>diganti</b> dengan isi backup <b>{restoreTarget.backup_id}</b> ({fmtDate(restoreTarget.created_at)}).
                  Data yang dimasukkan setelah tanggal itu akan hilang (tetapi tersimpan di backup pengaman yang dibuat otomatis).
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">
                Ketik <code className="px-1 bg-zinc-100 rounded select-all">{expected}</code> untuk melanjutkan
              </label>
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRestoreTarget(null)} disabled={restoring} className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-bold cursor-pointer">Batal</button>
              <button
                onClick={handleRestore}
                disabled={restoring || confirmText.trim() !== expected}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {restoring && <RefreshCw className="w-4 h-4 animate-spin" />}
                {restoring ? 'Memulihkan…' : 'Pulihkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
