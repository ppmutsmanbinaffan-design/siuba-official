import { User, AttendanceStatus, SessionStatus } from '../../types';

export type MaintenanceSubTab = 'status' | 'backup' | 'reset' | 'integrity' | 'logs';

export type AppEnvironment = 'production' | 'staging' | 'local';

export type MaintenancePermission =
  | 'system.maintenance.view'
  | 'system.backup.view'
  | 'system.backup.create'
  | 'system.database-reset'
  | 'system.integrity-check'
  | 'system.maintenance-logs.view';

export type ResetModeType = 
  | 'MODE_A_OPERATIONAL'
  | 'MODE_B_MASTERS_EXCEPT_CORE'
  | 'MODE_C_FACTORY_RESET';

export interface MaintenanceSystemConfig {
  allow_database_reset: boolean;
  maintenance_mode: boolean;
  app_env: AppEnvironment;
  last_config_updated_at?: string;
  last_config_updated_by?: string;
}

export interface BackupRecord {
  id: string;
  created_at: string;
  size_bytes: number;
  size_human: string;
  checksum_sha256: string;
  verification_status: 'VERIFIED' | 'FAILED' | 'PENDING';
  tables_backed_up: string[];
  total_records_count: number;
  created_by_name: string;
  created_by_role: string;
  backup_type: 'MANUAL' | 'AUTO_BEFORE_RESET' | 'SCHEDULED';
  raw_payload_json?: string;
  notes?: string;
}

export interface ResetModeInfo {
  id: ResetModeType;
  title: string;
  badge: string;
  badgeColor: 'amber' | 'rose' | 'red';
  riskLevel: 'Tinggi' | 'Sangat Tinggi' | 'Ekstrem';
  tagline: string;
  description: string;
  recommendedFor: string;
  deletedEntities: { name: string; count: number; category: string }[];
  preservedEntities: { name: string; count: number; category: string }[];
  reseededEntities: { name: string; description: string }[];
}

export interface ResetExecutionRequest {
  user: User;
  mode: ResetModeType;
  confirmationPhrase: string;
  passwordAttempt: string;
  backupId: string;
  currentData: Record<string, any>;
  onResetCompleted: (newDataset: Record<string, any>) => void;
}

export interface ResetExecutionResult {
  success: boolean;
  operation_id?: string;
  mode?: ResetModeType;
  mode_label?: string;
  backup_id?: string;
  backup_verified?: boolean;
  tables_cleared?: Record<string, number>;
  total_rows_deleted?: number;
  core_data_restored?: Record<string, number>;
  integrity_audit_status?: 'PASS' | 'WARN' | 'FAIL';
  integrity_issues_count?: number;
  duration_ms?: number;
  executed_at?: string;
  executed_by?: string;
  error?: string;
}

export type MaintenanceEventType =
  | 'backup_started'
  | 'backup_completed'
  | 'backup_failed'
  | 'database_reset_started'
  | 'database_reset_completed'
  | 'database_reset_failed'
  | 'integrity_check_started'
  | 'integrity_check_completed'
  | 'environment_config_changed'
  | 'maintenance_mode_toggled';

export interface MaintenanceLogEntry {
  id: string;
  event_type: MaintenanceEventType;
  event_title: string;
  actor_name: string;
  actor_role: string;
  timestamp: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FAILED' | 'INFO';
  operation_id: string;
  duration_ms?: number;
  summary: string;
  details?: Record<string, any>;
  ip_address?: string;
}

export type IntegritySeverityLevel = 'critical' | 'warning' | 'info';

export type IntegrityDomain = 
  | 'ATTENDANCE'
  | 'STUDENT_MASTER'
  | 'STAFF_MASTER'
  | 'SESSION_SCHEDULING'
  | 'STUDENT_CARD'
  | 'SECURITY_RBAC'
  | 'DEVICE_HARDWARE';

export interface IntegrityIssueItem {
  id: string;
  code: string;
  severity: IntegritySeverityLevel;
  domain: IntegrityDomain;
  title: string;
  description: string;
  affected_entity_type: string;
  affected_entity_id: string | number;
  affected_entity_label: string;
  detected_at: string;
  suggested_fix: string;
  can_auto_repair: boolean;
  repair_action_label?: string;
}

export interface IntegrityAuditResult {
  scan_id: string;
  scanned_at: string;
  duration_ms: number;
  total_checks_run: number;
  passed_checks_count: number;
  issues_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  health_score_percent: number;
  issues: IntegrityIssueItem[];
}
