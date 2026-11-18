import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  StaffQueueItem,
  clearFinishedStaffQueue,
  getStaffQueue,
  pushStaffQueue,
  removeStaffQueueItem,
  subscribeStaffQueue,
} from './staffOfflineQueue';

/** Tahap 28 — daftar tap SDM yang tersimpan di perangkat saat server tidak terjangkau. */
interface Props {
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSynced?: () => void;
  /** sembunyikan panel bila antrean kosong */
  hideWhenEmpty?: boolean;
}

const jam = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const StaffOfflineQueuePanel: React.FC<Props> = ({ onShowToast, onSynced, hideWhenEmpty }) => {
  const [items, setItems] = useState<StaffQueueItem[]>(() => getStaffQueue());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(getStaffQueue());
    const unsub = subscribeStaffQueue(refresh);
    const onStorage = (e: StorageEvent) => { if (e.key === 'siuba_staff_offline_queue') refresh(); };
    window.addEventListener('storage', onStorage);
    return () => { unsub(); window.removeEventListener('storage', onStorage); };
  }, []);

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
  const rejected = items.filter((i) => i.status === 'rejected');
  const synced = items.filter((i) => i.status === 'synced');
  if (hideWhenEmpty && items.length === 0) return null;

  const sendNow = async () => {
    setBusy(true);
    try {
      const s = await pushStaffQueue();
      if (s.offline) onShowToast?.('Server belum terjangkau. Tap SDM tetap tersimpan dan dikirim otomatis nanti.', 'error');
      else if (s.sent === 0) onShowToast?.('Tidak ada tap SDM yang menunggu dikirim.', 'info');
      else {
        onShowToast?.(`${s.success} tap SDM terkirim${s.duplicate ? `, ${s.duplicate} tap ganda diabaikan` : ''}${s.rejected ? `, ${s.rejected} ditolak (lihat alasannya)` : ''}.`, s.rejected ? 'info' : 'success');
        onSynced?.();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3" data-testid="staff-offline-queue">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CloudOff className={`w-4 h-4 ${pending.length ? 'text-amber-600' : 'text-slate-500'}`} />
          <h3 className="text-sm font-bold text-slate-800">Antrean Offline Presensi SDM</h3>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${pending.length ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
            {pending.length} menunggu
          </span>
        </div>
        <div className="flex gap-2">
          {(synced.length > 0 || rejected.length > 0) && (
            <button type="button" onClick={clearFinishedStaffQueue} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Bersihkan riwayat
            </button>
          )}
          <button type="button" disabled={busy || pending.length === 0} onClick={sendNow}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Kirim sekarang
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-700">
        Tap kartu/QR SDM saat server mati disimpan di perangkat ini dengan jam tap aslinya, lalu dikirim otomatis begitu server tersambung.
        Jangan hapus data browser sebelum antrean terkirim.
      </p>
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
          {items.slice(0, 50).map((i) => (
            <li key={i.client_request_id} className="py-2 flex items-start gap-2">
              {i.status === 'synced' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                : i.status === 'rejected' ? <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                : <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">
                  {i.staff_name || i.identifier} <span className="font-normal text-slate-600">· {jam(i.estimated_server_time)} · {i.method.toUpperCase()}</span>
                </div>
                <div className="text-slate-700">
                  {i.status === 'synced' ? (i.duplicate ? 'Tap ganda — sudah tercatat sebelumnya.' : i.result_message || 'Terkirim.')
                    : i.status === 'rejected' ? `Ditolak: ${i.result_message || i.result_code}`
                    : i.result_message ? `Menunggu (${i.result_message})` : 'Menunggu dikirim'}
                </div>
              </div>
              {i.status === 'rejected' && (
                <button type="button" aria-label="Hapus dari daftar" onClick={() => removeStaffQueueItem(i.client_request_id)} className="p-1 rounded text-slate-600 hover:bg-slate-100 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StaffOfflineQueuePanel;
