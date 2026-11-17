import { apiClient, isOfflineError } from './apiClient';
import { SecuritySettingConfig, User } from '../types';
import { AuditService } from './auditService';

const STORAGE_KEY_SECURITY_CONFIG = 'siuba_security_config';

const DEFAULT_CONFIG: SecuritySettingConfig = {
  session_timeout_minutes: 0,
  max_login_attempts_before_lockout: 5,
  lockout_duration_minutes: 15,
  force_password_change_days: 90,
  min_password_length: 8,
  require_special_char: false,
  require_numbers: false,
  allow_concurrent_sessions: false,
  pwa_offline_cache_max_days: 7,
  audit_retention_days: 365,
  backup_retention_days: 30,
  strict_https_enforced: true,
  csp_policy_active: true,
  ip_rate_limiting_enabled: true,
  maintenance_mode: false
};

export class SecurityConfigService {
  /**
   * Get current active security configuration
   */
  public static getConfig(): SecuritySettingConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SECURITY_CONFIG);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Update security settings with audit log
   */
  public static updateConfig(newConfig: Partial<SecuritySettingConfig>, user: User, reason: string): { success: boolean; config: SecuritySettingConfig } {
    const current = this.getConfig();
    const updated: SecuritySettingConfig = { ...current, ...newConfig };

    try {
      localStorage.setItem(STORAGE_KEY_SECURITY_CONFIG, JSON.stringify(updated));
    } catch {}

    AuditService.log({
      event: 'security_setting_changed',
      auditable_type: 'SecurityConfiguration',
      auditable_id: 'SYSTEM_CONFIG',
      auditable_name: 'Konfigurasi Keamanan & Kebijakan Akses',
      old_values: current,
      new_values: updated,
      reason: reason || 'Pembaruan parameter kebijakan keamanan sistem oleh admin',
      user
    });

    return { success: true, config: updated };
  }

  /** Ambil kebijakan keamanan dari server (GET /settings → security) dan simpan ke cache perangkat. */
  public static async syncFromServer(): Promise<SecuritySettingConfig | null> {
    try {
      const res: any = await apiClient.get('/settings');
      const sec = res?.data?.security;
      if (!sec) return null;
      const merged = { ...this.getConfig(), ...sec } as SecuritySettingConfig;
      try {
        localStorage.setItem(STORAGE_KEY_SECURITY_CONFIG, JSON.stringify(merged));
      } catch {}
      return merged;
    } catch {
      return null;
    }
  }

  /** Simpan kebijakan yang ditegakkan server (PUT /settings/security, khusus pemegang izin Audit Keamanan). */
  public static async saveToServer(config: SecuritySettingConfig): Promise<{ success: boolean; message: string; config?: SecuritySettingConfig }> {
    const payload = {
      session_timeout_minutes: Number(config.session_timeout_minutes) || 0,
      max_login_attempts_before_lockout: Number(config.max_login_attempts_before_lockout) || 5,
      lockout_duration_minutes: Number(config.lockout_duration_minutes) || 15,
      min_password_length: Number(config.min_password_length) || 8,
      require_numbers: Boolean(config.require_numbers),
      require_special_char: Boolean(config.require_special_char),
      allow_concurrent_sessions: Boolean(config.allow_concurrent_sessions),
      audit_retention_days: Number(config.audit_retention_days) || 365,
    };
    try {
      const res: any = await apiClient.put('/settings/security', payload);
      const merged = { ...config, ...(res?.data || payload) } as SecuritySettingConfig;
      try {
        localStorage.setItem(STORAGE_KEY_SECURITY_CONFIG, JSON.stringify(merged));
      } catch {}
      return { success: true, message: 'Kebijakan keamanan disimpan di server dan langsung berlaku.', config: merged };
    } catch (err: any) {
      if (err?.status === 403) return { success: false, message: 'Hanya Super Admin (izin Audit Keamanan) yang dapat mengubah kebijakan keamanan.' };
      if (isOfflineError(err)) return { success: false, message: 'Server tidak terjangkau. Kebijakan keamanan hanya bisa diubah saat terhubung ke server.' };
      return { success: false, message: err?.message || 'Gagal menyimpan kebijakan keamanan.' };
    }
  }

  /**
   * Reset config to secure default values
   */
  public static resetToDefault(user: User): SecuritySettingConfig {
    return this.updateConfig(DEFAULT_CONFIG, user, 'Reset konfigurasi keamanan ke nilai default aman').config;
  }
}
