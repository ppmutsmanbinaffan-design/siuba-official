import { SecuritySettingConfig, User } from '../types';
import { AuditService } from './auditService';

const STORAGE_KEY_SECURITY_CONFIG = 'siuba_security_config';

const DEFAULT_CONFIG: SecuritySettingConfig = {
  session_timeout_minutes: 60,
  max_login_attempts_before_lockout: 5,
  lockout_duration_minutes: 15,
  force_password_change_days: 90,
  min_password_length: 8,
  require_special_char: true,
  require_numbers: true,
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

  /**
   * Reset config to secure default values
   */
  public static resetToDefault(user: User): SecuritySettingConfig {
    return this.updateConfig(DEFAULT_CONFIG, user, 'Reset konfigurasi keamanan ke nilai default aman').config;
  }
}
