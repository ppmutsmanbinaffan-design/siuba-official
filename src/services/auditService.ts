import { apiClient } from './apiClient';
import { AuditLog, AuditLogEvent, User } from '../types';

const STORAGE_KEY_AUDIT_LOGS = 'siuba_audit_logs';
const REDACTED_KEYS = [
  'password',
  'password_hash',
  'password_confirmation',
  'secret',
  'device_secret',
  'token',
  'api_key',
  'app_key',
  'wifi_password',
  'qr_token_raw',
  'session_token',
  'remember_token'
];

/** Id entri contoh yang dulu otomatis dimasukkan ke log audit; dibersihkan dari cache browser lama. */
const LEGACY_DEMO_AUDIT_IDS = new Set([101, 102, 103, 104, 105, 106]);

export class AuditService {
  private static logs: AuditLog[] = [];
  private static initialized: boolean = false;

  private static init() {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      const parsed: AuditLog[] = stored ? JSON.parse(stored) : [];
      // Buang entri contoh lama (bukan kejadian nyata)
      this.logs = (Array.isArray(parsed) ? parsed : []).filter((l) => !LEGACY_DEMO_AUDIT_IDS.has(Number(l.id)));
      if (stored && this.logs.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(this.logs));
      }
    } catch {
      this.logs = [];
    }
    this.initialized = true;
  }

  /**
   * Deep sanitize object to redact sensitive keys (passwords, tokens, keys)
   */
  private static sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizePayload(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = REDACTED_KEYS.some(secret => lowerKey.includes(secret));

      if (isSensitive) {
        cleaned[key] = '[REDACTED_SECRET]';
      } else if (val && typeof val === 'object') {
        cleaned[key] = this.sanitizePayload(val);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  /**
   * Record a new audit log
   */
  public static log(params: {
    event: AuditLogEvent;
    auditable_type: string;
    auditable_id: number | string;
    auditable_name?: string;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    reason?: string | null;
    user?: User | { id?: number; name?: string; role?: string };
    attendance_device_id?: number | null;
    client_installation_id?: string | null;
    ip_address?: string;
    user_agent_summary?: string;
  }): AuditLog {
    this.init();

    const sanitizedOld = params.old_values ? this.sanitizePayload(params.old_values) : null;
    const sanitizedNew = params.new_values ? this.sanitizePayload(params.new_values) : null;

    const newLog: AuditLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: params.user?.id ?? null,
      user_name: params.user?.name ?? 'System / Daemon',
      role: params.user?.role ?? 'System',
      attendance_device_id: params.attendance_device_id ?? null,
      client_installation_id: params.client_installation_id ?? null,
      event: params.event,
      auditable_type: params.auditable_type,
      auditable_id: params.auditable_id,
      auditable_name: params.auditable_name || `${params.auditable_type} #${params.auditable_id}`,
      old_values: sanitizedOld,
      new_values: sanitizedNew,
      reason: params.reason || null,
      ip_address: params.ip_address || (typeof window !== 'undefined' ? '192.168.1.24' : '127.0.0.1'),
      user_agent_summary: params.user_agent_summary || (typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 60) : 'Server Process'),
      created_at: new Date().toISOString()
    };

    this.logs.unshift(newLog);

    // Limit in-memory/localStorage to 1000 items
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to persist audit log', e);
    }

    return newLog;
  }

  /**
   * Get all logs with optional filtering
   */
  /** Log audit dari server (sumber utama); digabung dengan log lokal perangkat ini. */
  private static serverLogs: AuditLog[] = [];

  /**
   * Ambil log audit dari server. Gagal diam-diam bila offline / tidak berhak — log lokal tetap tampil.
   * @returns true bila berhasil memuat dari server
   */
  public static async syncFromServer(): Promise<boolean> {
    try {
      const res: any = await apiClient.get<AuditLog[]>('/audit-logs', { limit: 500 });
      const list = Array.isArray(res?.data) ? res.data : [];
      // Id server diberi awalan negatif agar tidak bentrok dengan id log lokal (Date.now()).
      this.serverLogs = list.map((l: AuditLog) => ({ ...l, id: -Math.abs(Number(l.id)) }));
      return true;
    } catch {
      return false;
    }
  }

  public static getLogs(filter?: {
    event?: AuditLogEvent | 'ALL';
    auditable_type?: string | 'ALL';
    user_id?: number | 'ALL';
    search?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLog[] {
    this.init();
    let result = [...this.serverLogs, ...this.logs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    if (!filter) return result;

    if (filter.event && filter.event !== 'ALL') {
      result = result.filter(l => l.event === filter.event);
    }

    if (filter.auditable_type && filter.auditable_type !== 'ALL') {
      result = result.filter(l => l.auditable_type.toLowerCase() === filter.auditable_type!.toLowerCase());
    }

    if (filter.user_id && filter.user_id !== 'ALL') {
      result = result.filter(l => l.user_id === filter.user_id);
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(l => 
        (l.auditable_name && l.auditable_name.toLowerCase().includes(q)) ||
        (l.reason && l.reason.toLowerCase().includes(q)) ||
        (l.user_name && l.user_name.toLowerCase().includes(q)) ||
        (l.auditable_type && l.auditable_type.toLowerCase().includes(q)) ||
        (l.ip_address && l.ip_address.includes(q))
      );
    }

    if (filter.startDate) {
      result = result.filter(l => new Date(l.created_at) >= new Date(filter.startDate!));
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.created_at) <= end);
    }

    return result;
  }

  /**
   * Get summary statistics for audit dashboard
   */
  public static getAuditStats() {
    this.init();
    const all = [...this.serverLogs, ...this.logs];
    const total = all.length;
    const corrections = all.filter(l => l.event === 'attendance_corrected').length;
    const roleChanges = all.filter(l => l.event === 'role_changed' || l.event === 'permission_changed').length;
    const deviceEvents = all.filter(l => l.event === 'device_secret_rotated' || l.event === 'device_created' || l.event === 'device_disabled').length;
    const backups = all.filter(l => l.event === 'backup_created' || l.event === 'restore_completed').length;
    const qrRfidChanges = all.filter(l => l.event === 'qr_regenerated' || l.event === 'rfid_assigned' || l.event === 'rfid_removed').length;

    return {
      total,
      corrections,
      roleChanges,
      deviceEvents,
      backups,
      qrRfidChanges
    };
  }

}
