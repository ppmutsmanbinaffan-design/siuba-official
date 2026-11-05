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

/**
 * Pre-seeded realistic audit trail events for SIUBA Pesantren
 */
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 101,
    user_id: 1,
    user_name: 'KH. Abdullah Syukri (Super Admin)',
    role: 'Super Admin',
    event: 'role_changed',
    auditable_type: 'UserRoleAssignment',
    auditable_id: 4,
    auditable_name: 'Ust. Ahmad Dahlan',
    old_values: { role: 'Guru', permissions: ['view_attendance', 'record_class'] },
    new_values: { role: 'Wali Kelas & Pembina Asrama', permissions: ['view_attendance', 'record_class', 'approve_excusal', 'manage_room'] },
    reason: 'Promosi SK Pengurus Tahun Ajaran Baru 2026/2027',
    ip_address: '192.168.1.15',
    user_agent_summary: 'Chrome 122 on macOS / LAN Internal',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  },
  {
    id: 102,
    user_id: 2,
    user_name: 'Ust. Zulkifli (Admin Kesantrian)',
    role: 'Admin',
    event: 'device_secret_rotated',
    auditable_type: 'AttendanceDevice',
    auditable_id: 3,
    auditable_name: 'ESP32 RFID Reader - Gerbang Asrama Putra (DEV-ASR-01)',
    old_values: { secret_hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069', status: 'active' },
    new_values: { secret_hash: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', status: 'active' },
    reason: 'Rotasi berkala token perangkat terminal IoT sesuai SOP Keamanan',
    ip_address: '192.168.1.18',
    user_agent_summary: 'Firefox 123 on Linux Desktop / LAN Internal',
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: 103,
    user_id: 3,
    user_name: 'Ust. Muhammad Ilyas (Petugas Asrama)',
    role: 'Musyrif',
    event: 'attendance_corrected',
    auditable_type: 'AttendanceRecord',
    auditable_id: 1254,
    auditable_name: 'Ahmad Fauzi (NIS: UBA260001) - Sholat Subuh Berjamaah',
    old_values: { status: 'absent', source: 'automatic', notes: 'Auto-Alpha Penutupan Sesi' },
    new_values: { status: 'sick', source: 'operator', notes: 'Koreksi: Santri dirawat di Poskestren sejak malam' },
    reason: 'Surat Keterangan Dokter Poskestren No. 44/SKD/VIII/2026',
    ip_address: '192.168.1.42',
    user_agent_summary: 'SIUBA PWA Mobile / Android 14',
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  },
  {
    id: 104,
    user_id: 1,
    user_name: 'KH. Abdullah Syukri (Super Admin)',
    role: 'Super Admin',
    event: 'qr_regenerated',
    auditable_type: 'Student',
    auditable_id: 12,
    auditable_name: 'Farhan Ramadhan (NIS: UBA260012)',
    old_values: { qr_token_hash: 'sha256:d8578edf8458ce06fbc5bb76a58c5ca4... [REDACTED]' },
    new_values: { qr_token_hash: 'sha256:9f83ca4628c61456a02fb191a329... [REDACTED]' },
    reason: 'Kartu santri fisik hilang dan ditemukan orang lain, token lama direvokasi',
    ip_address: '192.168.1.15',
    user_agent_summary: 'Chrome 122 on macOS / LAN Internal',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
  },
  {
    id: 105,
    user_id: 1,
    user_name: 'KH. Abdullah Syukri (Super Admin)',
    role: 'Super Admin',
    event: 'backup_created',
    auditable_type: 'SystemBackup',
    auditable_id: 'bkp_20260823_040000',
    auditable_name: 'siuba_full_backup_20260823_040000.sql.gz',
    old_values: null,
    new_values: { 
      filename: 'siuba_full_backup_20260823_040000.sql.gz', 
      size: '14.8 MB', 
      checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      destination: 'NAS Local Synology + External SSD'
    },
    reason: 'Otomatisasi Cron Job Harian Backup Pukul 04:00 WIB',
    ip_address: '127.0.0.1 (CLI Cron)',
    user_agent_summary: 'Laravel Scheduler Service / Linux Kernel 6.1',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 106,
    user_id: 2,
    user_name: 'Ust. Zulkifli (Admin Kesantrian)',
    role: 'Admin',
    event: 'offline_conflict_resolved',
    auditable_type: 'OfflineSyncBatch',
    auditable_id: 'sync_client_9942',
    auditable_name: 'Batch Sinkronisasi 14 Record Petugas Lapangan',
    old_values: { conflict_policy: 'HUMAN_DECISION_PENDING', pending_count: 14 },
    new_values: { auto_alpha_overwritten: 3, manual_attendance_retained: 11, status: 'RESOLVED_AUTO' },
    reason: 'Resolusi otomatis Auto-Alpha versus data riil tap offline saat listrik padam',
    ip_address: '192.168.1.18',
    user_agent_summary: 'Firefox 123 on Linux Desktop / LAN Internal',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  }
];

export class AuditService {
  private static logs: AuditLog[] = [];
  private static initialized: boolean = false;

  private static init() {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      if (stored) {
        this.logs = JSON.parse(stored);
      } else {
        this.logs = [...INITIAL_AUDIT_LOGS];
        localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(this.logs));
      }
    } catch {
      this.logs = [...INITIAL_AUDIT_LOGS];
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
  public static getLogs(filter?: {
    event?: AuditLogEvent | 'ALL';
    auditable_type?: string | 'ALL';
    user_id?: number | 'ALL';
    search?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLog[] {
    this.init();
    let result = [...this.logs];

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
    const total = this.logs.length;
    const corrections = this.logs.filter(l => l.event === 'attendance_corrected').length;
    const roleChanges = this.logs.filter(l => l.event === 'role_changed' || l.event === 'permission_changed').length;
    const deviceEvents = this.logs.filter(l => l.event === 'device_secret_rotated' || l.event === 'device_created' || l.event === 'device_disabled').length;
    const backups = this.logs.filter(l => l.event === 'backup_created' || l.event === 'restore_completed').length;
    const qrRfidChanges = this.logs.filter(l => l.event === 'qr_regenerated' || l.event === 'rfid_assigned' || l.event === 'rfid_removed').length;

    return {
      total,
      corrections,
      roleChanges,
      deviceEvents,
      backups,
      qrRfidChanges
    };
  }

  /**
   * Clear all audit logs (Super Admin Only with reason)
   */
  public static clearLogs(user: User, reason: string): boolean {
    if (user.role !== 'Super Admin') return false;
    this.logs = [];
    try {
      localStorage.removeItem(STORAGE_KEY_AUDIT_LOGS);
    } catch {}
    
    // Log the purge itself
    this.log({
      event: 'security_setting_changed',
      auditable_type: 'AuditRetentionEngine',
      auditable_id: 'ALL_LOGS',
      auditable_name: 'Pembersihan Arsip Audit Log',
      old_values: { action: 'purge_logs' },
      new_values: { status: 'cleared', retention_cycle: 'reset' },
      reason: reason || 'Pembersihan audit log manual oleh Super Admin',
      user
    });

    return true;
  }
}
