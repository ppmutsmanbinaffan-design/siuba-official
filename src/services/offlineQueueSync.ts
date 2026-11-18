import { apiClient, isOfflineError } from './apiClient';
import { OfflineStorageService } from './offlineStorageService';
import { ServerConnectivityService } from './serverConnectivityService';
import { PendingAttendanceItem } from '../types';

/**
 * Mengirim antrean absensi offline ke server (POST /offline/attendance/sync).
 *
 * Sebelumnya tombol "Sinkronkan" di Sync Center hanya memproses antrean ke data di browser (yang kemudian tertimpa
 * data server), sehingga absensi yang dicatat saat server mati tidak pernah sampai ke database.
 */
export interface QueueSyncSummary {
  sent: number;
  success: number;
  conflict: number;
  failed: number;
  offline: boolean;
}

const MAX_RETRY = 10;
let running: Promise<QueueSyncSummary> | null = null;

export function pendingCount(): number {
  return OfflineStorageService.getPendingRecords().filter(
    (p) => p.sync_status === 'pending' || (p.sync_status === 'failed' && (p.retry_count || 0) < MAX_RETRY)
  ).length;
}

export function pushPendingAttendance(opts: { includeFailed?: boolean } = {}): Promise<QueueSyncSummary> {
  if (running) return running;
  running = (async () => {
    const summary: QueueSyncSummary = { sent: 0, success: 0, conflict: 0, failed: 0, offline: false };
    const items = OfflineStorageService.getPendingRecords().filter(
      (p) =>
        p.sync_status === 'pending' ||
        p.sync_status === 'syncing' ||
        (p.sync_status === 'failed' && (opts.includeFailed || (p.retry_count || 0) < MAX_RETRY))
    );
    for (let i = 0; i < items.length; i += 200) {
      const chunk = items.slice(i, i + 200);
      chunk.forEach((p) => OfflineStorageService.updatePendingRecord(p.local_id, { sync_status: 'syncing' }));
      try {
        const res: any = await apiClient.post('/offline/attendance/sync', {
          items: chunk.map((p: PendingAttendanceItem) => ({
            client_request_id: p.client_request_id,
            local_id: p.local_id,
            session_id: p.session_id,
            student_id: p.student_id,
            method: p.attendance_method === ('rfid_card' as any) ? 'rfid' : p.attendance_method,
            status: p.requested_status,
            captured_at_client: p.captured_at_client,
            estimated_server_time: p.estimated_server_time,
            clock_offset_ms: p.clock_offset_ms,
            notes: p.notes,
            installation_id: p.device_context?.installation_id,
          })),
        });
        // Respons sinkron tidak memakai bungkus {data}: hasil ada langsung di body
        const body = res?.results ? res : res?.data || res;
        const results: any[] = body?.results || [];
        summary.sent += chunk.length;
        for (const r of results) {
          if (r.success) {
            summary.success++;
            OfflineStorageService.updatePendingRecord(r.local_id, {
              sync_status: 'synced',
              server_attendance_id: r.attendance_record_id,
              server_final_status: r.final_status,
              last_error: undefined,
            } as any);
          } else if (r.requires_review) {
            summary.conflict++;
            OfflineStorageService.updatePendingRecord(r.local_id, {
              sync_status: 'conflict',
              conflict_code: r.code,
              conflict_message: r.message,
              server_attendance_id: r.attendance_record_id,
              server_final_status: r.final_status,
            } as any);
          } else {
            summary.failed++;
            const cur = OfflineStorageService.getPendingRecords().find((x) => x.local_id === r.local_id);
            OfflineStorageService.updatePendingRecord(r.local_id, {
              sync_status: 'failed',
              retry_count: (cur?.retry_count || 0) + 1,
              last_error: `${r.code}: ${r.message}`,
            } as any);
          }
        }
      } catch (err: any) {
        // Server belum terjangkau / ditolak: kembalikan ke antrean
        chunk.forEach((p) =>
          OfflineStorageService.updatePendingRecord(p.local_id, {
            sync_status: 'pending',
            last_error: err?.message,
          } as any)
        );
        if (isOfflineError(err)) {
          summary.offline = true;
          break;
        }
        summary.failed += chunk.length;
      }
    }
    return summary;
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * Sinkron otomatis: saat server kembali online, saat browser kembali online, dan tiap 60 detik bila ada antrean.
 * Mengembalikan fungsi untuk menghentikan.
 */
export function startAutoQueueSync(onSynced: (s: QueueSyncSummary) => void): () => void {
  const run = async () => {
    if (pendingCount() === 0) return;
    if (ServerConnectivityService.getState() === 'SERVER_OFFLINE' || !navigator.onLine) return;
    const s = await pushPendingAttendance();
    if (s.sent > 0 && !s.offline) onSynced(s);
  };
  const unsubscribe = ServerConnectivityService.subscribe((state: any) => {
    if (state === 'SERVER_ONLINE') void run();
  });
  const onOnline = () => setTimeout(() => void run(), 2000);
  window.addEventListener('online', onOnline);
  const timer = setInterval(() => void run(), 60000);
  setTimeout(() => void run(), 5000);
  return () => {
    unsubscribe();
    window.removeEventListener('online', onOnline);
    clearInterval(timer);
  };
}
