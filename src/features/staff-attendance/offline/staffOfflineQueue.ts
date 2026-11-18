import { apiClient, isOfflineError } from '../../../services/apiClient';
import { OfflineStorageService } from '../../../services/offlineStorageService';
import { ServerConnectivityService } from '../../../services/serverConnectivityService';

/**
 * Tahap 28 — antrean offline presensi SDM.
 *
 * Tap kartu/QR SDM saat server tidak terjangkau disimpan di perangkat ini dengan jam tap yang sudah dikoreksi
 * ke jam server (selisih jam diukur apiClient dari header X-Server-Time), lalu dikirim otomatis ke
 * POST /staff-attendance/daily/offline-sync. Server menolak kiriman ganda lewat client_request_id.
 */

export type StaffQueueStatus = 'pending' | 'syncing' | 'synced' | 'rejected';

export interface StaffQueueItem {
  client_request_id: string;
  identifier: string;
  method: 'qr' | 'rfid' | 'manual';
  staff_name?: string;
  captured_at_client: string;
  estimated_server_time: string;
  clock_offset_ms: number;
  installation_id?: string;
  status: StaffQueueStatus;
  attempts: number;
  result_code?: string;
  result_message?: string;
  duplicate?: boolean;
  synced_at?: string;
}

export interface StaffQueueSummary {
  sent: number;
  success: number;
  rejected: number;
  duplicate: number;
  offline: boolean;
}

const KEY = 'siuba_staff_offline_queue';
const KEEP_DONE_MS = 3 * 24 * 3600 * 1000; // riwayat terkirim/ditolak disimpan 3 hari untuk ditinjau
const DUP_WINDOW_MS = 60 * 1000;
const listeners = new Set<() => void>();

function read(): StaffQueueItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: StaffQueueItem[]): void {
  const now = Date.now();
  const kept = list.filter((i) => i.status === 'pending' || i.status === 'syncing' || !i.synced_at || now - Date.parse(i.synced_at) < KEEP_DONE_MS);
  localStorage.setItem(KEY, JSON.stringify(kept));
  listeners.forEach((fn) => fn());
}

export function subscribeStaffQueue(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStaffQueue(): StaffQueueItem[] {
  return read().sort((a, b) => b.estimated_server_time.localeCompare(a.estimated_server_time));
}

export function staffPendingCount(): number {
  return read().filter((i) => i.status === 'pending' || i.status === 'syncing').length;
}

/** Simpan tap ke antrean. Tap ganda kartu yang sama dalam 1 menit tidak disimpan dua kali. */
export function enqueueStaffScan(params: { identifier: string; method: 'qr' | 'rfid' | 'manual'; staffName?: string }):
  { ok: true; item: StaffQueueItem } | { ok: false; message: string } {
  const offset = OfflineStorageService.getClockOffset();
  const clientNow = new Date();
  const estimated = new Date(clientNow.getTime() + offset);
  const list = read();
  const id = params.identifier.trim();
  const recent = list.find((i) => i.identifier === id && (i.status === 'pending' || i.status === 'syncing')
    && Math.abs(Date.parse(i.estimated_server_time) - estimated.getTime()) < DUP_WINDOW_MS);
  if (recent) return { ok: false, message: `${params.staffName || id} baru saja tercatat di antrean perangkat ini.` };

  let installationId: string | undefined;
  try { installationId = OfflineStorageService.getInstallation().installation_id; } catch { /* abaikan */ }
  const item: StaffQueueItem = {
    client_request_id: 'stf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10),
    identifier: id,
    method: params.method,
    staff_name: params.staffName,
    captured_at_client: clientNow.toISOString(),
    estimated_server_time: estimated.toISOString(),
    clock_offset_ms: Math.round(offset),
    installation_id: installationId,
    status: 'pending',
    attempts: 0,
  };
  try {
    write([...list, item]);
  } catch {
    return { ok: false, message: 'Penyimpanan perangkat penuh — tap tidak bisa disimpan. Hubungi admin.' };
  }
  return { ok: true, item };
}

export function removeStaffQueueItem(clientRequestId: string): void {
  write(read().filter((i) => i.client_request_id !== clientRequestId));
}

export function clearFinishedStaffQueue(): void {
  write(read().filter((i) => i.status === 'pending' || i.status === 'syncing'));
}

let running: Promise<StaffQueueSummary> | null = null;

export function pushStaffQueue(): Promise<StaffQueueSummary> {
  if (running) return running;
  running = (async () => {
    const summary: StaffQueueSummary = { sent: 0, success: 0, rejected: 0, duplicate: 0, offline: false };
    const pending = read().filter((i) => i.status === 'pending' || i.status === 'syncing');
    for (let start = 0; start < pending.length; start += 200) {
      const chunk = pending.slice(start, start + 200);
      const ids = new Set(chunk.map((c) => c.client_request_id));
      write(read().map((i) => (ids.has(i.client_request_id) ? { ...i, status: 'syncing' as const, attempts: i.attempts + 1 } : i)));
      try {
        const res: any = await apiClient.post('/staff-attendance/daily/offline-sync', {
          items: chunk.map((c) => ({
            client_request_id: c.client_request_id,
            identifier: c.identifier,
            method: c.method,
            captured_at_client: c.captured_at_client,
            estimated_server_time: c.estimated_server_time,
            clock_offset_ms: c.clock_offset_ms,
            installation_id: c.installation_id,
          })),
        });
        const results: any[] = res?.data?.results || [];
        const byId = new Map(results.map((r) => [r.client_request_id, r]));
        const now = new Date().toISOString();
        summary.sent += chunk.length;
        write(read().map((i) => {
          const r = byId.get(i.client_request_id);
          if (!ids.has(i.client_request_id)) return i;
          if (!r || !r.final) return { ...i, status: 'pending' as const, result_message: r?.message || i.result_message };
          if (r.success) summary.success++;
          else if (r.duplicate) summary.duplicate++;
          else summary.rejected++;
          return {
            ...i,
            status: r.success || r.duplicate ? 'synced' as const : 'rejected' as const,
            result_code: r.code,
            result_message: r.message,
            duplicate: !!r.duplicate,
            staff_name: r.staff_name || i.staff_name,
            synced_at: now,
          };
        }));
      } catch (err: any) {
        write(read().map((i) => (ids.has(i.client_request_id) ? { ...i, status: 'pending' as const } : i)));
        if (isOfflineError(err)) {
          summary.offline = true;
          break;
        }
        // izin/validasi: biarkan di antrean dan tampilkan pesannya
        write(read().map((i) => (ids.has(i.client_request_id) ? { ...i, result_message: err?.message } : i)));
        break;
      }
    }
    return summary;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Kirim otomatis saat server kembali online, saat browser online lagi, dan tiap 60 detik bila ada antrean. */
export function startAutoStaffQueueSync(onSynced: (s: StaffQueueSummary) => void): () => void {
  const run = async () => {
    if (staffPendingCount() === 0) return;
    if (ServerConnectivityService.getState() === 'SERVER_OFFLINE' || !navigator.onLine) return;
    const s = await pushStaffQueue();
    if (s.sent > 0 && !s.offline) onSynced(s);
  };
  const unsubscribe = ServerConnectivityService.subscribe((state: any) => {
    if (state === 'SERVER_ONLINE') void run();
  });
  const onOnline = () => setTimeout(() => void run(), 2500);
  window.addEventListener('online', onOnline);
  const timer = setInterval(() => void run(), 60000);
  const first = setTimeout(() => void run(), 6000);
  return () => {
    unsubscribe();
    window.removeEventListener('online', onOnline);
    clearInterval(timer);
    clearTimeout(first);
  };
}
