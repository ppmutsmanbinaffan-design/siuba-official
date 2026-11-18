/**
 * Keamanan & Audit: data kesehatan sistem, audit integritas, dan catatan uji pemulihan dari SERVER.
 * Hasil terakhir disimpan di perangkat agar halaman tetap bisa dibuka saat server tidak terjangkau.
 */
import { apiClient } from './apiClient';
import type { DataIntegrityIssue, DataIntegritySummary } from '../types';

export interface ServerHealthReport {
  application_status: 'healthy' | 'warning' | 'critical';
  application_version: string;
  application_env: string;
  debug_mode: boolean;
  iot_key_configured: boolean;
  database_status: 'healthy' | 'warning' | 'critical';
  database_engine: string;
  database_latency_ms: number | null;
  storage_status: 'healthy' | 'warning' | 'critical';
  storage_writable: boolean;
  disk_status: 'healthy' | 'warning' | 'critical';
  disk_total_gb: number | null;
  disk_free_gb: number | null;
  disk_free_percentage: number | null;
  scheduler_status: 'healthy' | 'warning' | 'critical';
  scheduler_last_heartbeat: string | null;
  scheduler_heartbeat_diff_seconds: number | null;
  backup_freshness_status: 'healthy' | 'warning' | 'critical';
  backup_last_successful_at: string | null;
  backup_count_stored: number;
  active_devices_online: number;
  active_devices_total: number;
  failed_logins_today: number;
  inactive_users_count: number;
  overall_status: 'healthy' | 'warning' | 'critical';
  checked_at: string;
}

export type ServerIntegrityIssue = DataIntegrityIssue & { type?: string; context?: Record<string, any> };
export type ServerIntegritySummary = Omit<DataIntegritySummary, 'issues'> & { issues: ServerIntegrityIssue[] };

export interface DrDrillRecord {
  at: string;
  status: 'PASS' | 'FAIL';
  notes?: string | null;
  by?: string | null;
}

const HEALTH_KEY = 'siuba_server_health_report';
const INTEGRITY_KEY = 'siuba_server_integrity_summary';
const DRILLS_KEY = 'siuba_dr_drills';

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh */
  }
}

export const SystemStatusService = {
  cachedHealth: () => readCache<ServerHealthReport>(HEALTH_KEY),
  cachedIntegrity: () => readCache<ServerIntegritySummary>(INTEGRITY_KEY),
  cachedDrills: () => readCache<Record<string, DrDrillRecord>>(DRILLS_KEY) || {},

  async fetchHealth(): Promise<ServerHealthReport> {
    const res: any = await apiClient.get('/system/health-report');
    writeCache(HEALTH_KEY, res.data);
    return res.data as ServerHealthReport;
  },

  async runIntegrity(): Promise<ServerIntegritySummary> {
    const res: any = await apiClient.post('/system/integrity', {});
    writeCache(INTEGRITY_KEY, res.data);
    return res.data as ServerIntegritySummary;
  },

  async repair(issue: ServerIntegrityIssue): Promise<{ message: string; affected: number }> {
    const res: any = await apiClient.post('/system/integrity/repair', { type: issue.type, context: issue.context || {} });
    return { message: res?.message || 'Perbaikan diterapkan.', affected: Number(res?.data?.affected || 0) };
  },

  async fetchDrills(): Promise<Record<string, DrDrillRecord>> {
    const res: any = await apiClient.get('/system/dr-drills');
    const data = (res?.data && typeof res.data === 'object' ? res.data : {}) as Record<string, DrDrillRecord>;
    writeCache(DRILLS_KEY, data);
    return data;
  },

  async recordDrill(planId: string, status: 'PASS' | 'FAIL', notes?: string): Promise<Record<string, DrDrillRecord>> {
    const res: any = await apiClient.post('/system/dr-drills', { plan_id: planId, status, notes: notes || null });
    const data = (res?.data || {}) as Record<string, DrDrillRecord>;
    writeCache(DRILLS_KEY, data);
    return data;
  },
};

export const EMPTY_INTEGRITY: ServerIntegritySummary = {
  total_issues: 0,
  critical_count: 0,
  warning_count: 0,
  info_count: 0,
  last_audit_at: '',
  status: 'HEALTHY',
  issues: [],
  metrics: {
    total_records_checked: 0,
    total_sessions_checked: 0,
    total_students_checked: 0,
    total_participants_checked: 0,
    total_devices_checked: 0,
    duplicate_attendance_count: 0,
    incomplete_closed_sessions_count: 0,
    duplicate_rfid_count: 0,
    duplicate_qr_count: 0,
    orphan_device_assignments_count: 0,
  },
};
