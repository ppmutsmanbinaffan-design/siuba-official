import { User } from '../../../types';
import {
  MaintenanceSystemConfig,
  BackupRecord,
  ResetModeInfo,
  MaintenanceLogEntry,
  IntegrityAuditResult,
  IntegrityIssueItem
} from '../types';

const CONFIG_STORAGE_KEY = 'siuba_system_maintenance_config_v107';
const BACKUPS_STORAGE_KEY = 'siuba_maintenance_backups_v107';
const LOGS_STORAGE_KEY = 'siuba_maintenance_logs_v107';
const INTEGRITY_HISTORY_KEY = 'siuba_integrity_audit_history_v107';

export class MaintenanceService {
  private static defaultConfig: MaintenanceSystemConfig = {
    allow_database_reset: true, // Configurable per environment
    maintenance_mode: false,
    app_env: 'local',
    last_config_updated_at: new Date().toISOString(),
    last_config_updated_by: 'Super Admin SIUBA'
  };

  /**
   * Get Current System Environment Configuration
   */
  public static getConfig(): MaintenanceSystemConfig {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        return { ...this.defaultConfig, ...JSON.parse(raw) };
      } catch (e) {
        console.error('Failed to parse maintenance config', e);
      }
    }
    return this.defaultConfig;
  }


  /**
   * Check RBAC permissions for maintenance actions
   */
  public static checkPermission(user: User, action: 'view' | 'backup' | 'reset' | 'integrity' | 'logs'): boolean {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    const isSuperAdmin = role === 'super_admin' || role === 'super-admin' || role === 'super admin' || role === 'admin';
    const permissions = user.permissions || [];

    switch (action) {
      case 'view':
        return isSuperAdmin || permissions.includes('system.maintenance.view');
      case 'backup':
        return isSuperAdmin || permissions.includes('system.backup.create') || permissions.includes('system.backup.view');
      case 'reset':
        // Strictest: Super Admin or explicit system.database-reset
        return isSuperAdmin || permissions.includes('system.database-reset');
      case 'integrity':
        return isSuperAdmin || permissions.includes('system.integrity-check') || permissions.includes('system.maintenance.view');
      case 'logs':
        return isSuperAdmin || permissions.includes('system.maintenance-logs.view') || permissions.includes('system.maintenance.view');
      default:
        return false;
    }
  }


  /**
   * Compute comprehensive database summary from the full dataset
   */
  public static getDatabaseSummary(currentData: Record<string, any>) {
    const studentsCount = currentData.students?.length || 0;
    const staffCount = currentData.staff?.length || 0;
    const usersCount = currentData.users?.length || 0;
    const attendanceRecordsCount = currentData.records?.length || 0;
    const staffAttendanceCount = currentData.staffRecords?.length || 0;
    const sessionsCount = currentData.sessions?.length || 0;
    const teachingSessionsCount = currentData.teachingSessions?.length || 0;
    const trainingSessionsCount = currentData.trainingSessions?.length || 0;
    const studentCardTemplatesCount = currentData.cardTemplates?.length || 4; // Default standard templates
    const classroomsCount = currentData.classrooms?.length || 0;
    const dormsCount = (currentData.dormitories?.length || 0) + (currentData.dormitoryRooms?.length || 0);
    const activitiesCount = currentData.activities?.length || 0;
    const devicesCount = currentData.devices?.length || 0;
    const auditLogsCount = this.getLogs().length;

    // Approximate size calculation
    const payloadStr = JSON.stringify(currentData || {});
    const sizeBytes = new Blob([payloadStr]).size;
    const sizeHuman = sizeBytes > 1024 * 1024
      ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(sizeBytes / 1024).toFixed(2)} KB`;

    const backups = this.getBackups();
    const lastBackup = backups.length > 0 ? backups[0] : null;

    return {
      totalRecords: studentsCount + staffCount + usersCount + attendanceRecordsCount + staffAttendanceCount + sessionsCount + classroomsCount + dormsCount + activitiesCount,
      sizeBytes,
      sizeHuman,
      lastBackup,
      metrics: [
        { label: 'Total Santri Aktif', count: studentsCount, domain: 'Santri', color: 'emerald' },
        { label: 'Total SDM & Guru', count: staffCount, domain: 'SDM', color: 'cyan' },
        { label: 'Pengguna Sistem (RBAC)', count: usersCount, domain: 'Sistem', color: 'purple' },
        { label: 'Presensi Santri (Harian)', count: attendanceRecordsCount, domain: 'Presensi', color: 'emerald' },
        { label: 'Presensi Harian SDM', count: staffAttendanceCount, domain: 'Presensi SDM', color: 'teal' },
        { label: 'Sesi Absensi Terjadwal', count: sessionsCount, domain: 'Sesi', color: 'amber' },
        { label: 'Sesi KBM Mengajar Guru', count: teachingSessionsCount, domain: 'KBM', color: 'blue' },
        { label: 'Sesi Latihan Ekskul', count: trainingSessionsCount, domain: 'Ekskul', color: 'indigo' },
        { label: 'Template Kartu Santri', count: studentCardTemplatesCount, domain: 'Kartu', color: 'rose' },
        { label: 'Master Kelas & Jenjang', count: classroomsCount, domain: 'Akademik', color: 'amber' },
        { label: 'Asrama & Kamar Santri', count: dormsCount, domain: 'Asrama', color: 'orange' },
        { label: 'Perangkat Terminal RFID/QR', count: devicesCount, domain: 'Hardware', color: 'zinc' },
      ]
    };
  }

  /**
   * Get reset modes definition with dynamic data impact breakdown
   */
  public static getResetModes(currentData: Record<string, any>): ResetModeInfo[] {
    const summary = this.getDatabaseSummary(currentData);

    return [
      {
        id: 'MODE_A_OPERATIONAL',
        title: 'Reset Data Operasional (Harian & Transaksi Presensi)',
        badge: 'Disarankan untuk Tahun Ajaran Baru',
        badgeColor: 'amber',
        riskLevel: 'Tinggi',
        tagline: 'Bersihkan seluruh catatan presensi, sesi absensi, dan log transaksi tanpa merusak struktur master santri, SDM, maupun kelas.',
        description: 'Menghapus riwayat transaksi presensi santri, presensi SDM, sesi absensi, sesi KBM, sesi ekskul, serta log perangkat. Seluruh Master Data (Santri, Guru, Kamar, Kelas, Kegiatan, Desain Kartu Santri) TETAP AMAN.',
        recommendedFor: 'Pergantian semester/tahun ajaran baru, atau pembersihan data uji coba operasional.',
        deletedEntities: [
          { name: 'Presensi Santri (Attendance Records)', count: currentData.records?.length || 0, category: 'Operasional' },
          { name: 'Sesi Absensi Terjadwal (Attendance Sessions)', count: currentData.sessions?.length || 0, category: 'Operasional' },
          { name: 'Presensi Harian SDM (Staff Records)', count: currentData.staffRecords?.length || 0, category: 'Operasional' },
          { name: 'Sesi KBM Mengajar Guru', count: currentData.teachingSessions?.length || 0, category: 'Operasional' },
          { name: 'Sesi Latihan Ekskul', count: currentData.trainingSessions?.length || 0, category: 'Operasional' },
          { name: 'Riwayat Koreksi Presensi (Audit Trail)', count: currentData.recordHistories?.length || 0, category: 'Operasional' },
          { name: 'Permohonan Izin & Dispensasi', count: currentData.excusals?.length || 0, category: 'Operasional' },
          { name: 'Log Perangkat Terminal & Antrean Offline', count: currentData.deviceLogs?.length || 0, category: 'Operasional' },
        ],
        preservedEntities: [
          { name: 'Master Santri Aktif & Identitas QR/RFID', count: currentData.students?.length || 0, category: 'Master' },
          { name: 'Master SDM, Ustadz & Tenaga Pendidik', count: currentData.staff?.length || 0, category: 'Master' },
          { name: 'Master Kelas, Jenjang & Jadwal Pelajaran', count: currentData.classrooms?.length || 0, category: 'Master' },
          { name: 'Master Asrama & Kamar Santri', count: (currentData.dormitories?.length || 0) + (currentData.dormitoryRooms?.length || 0), category: 'Master' },
          { name: 'Master Kegiatan & Aturan Peserta', count: currentData.activities?.length || 0, category: 'Master' },
          { name: 'Template Kartu Santri Studio (CR80)', count: currentData.cardTemplates?.length || 4, category: 'Master' },
          { name: 'Akun Super Admin & Pengguna Sistem (RBAC)', count: currentData.users?.length || 0, category: 'Sistem' },
          { name: 'Master Perangkat Terminal Hardware', count: currentData.devices?.length || 0, category: 'Master' }
        ],
        reseededEntities: [
          { name: 'Kategori Kegiatan Baku', description: '12 Kategori baku sistem (Ibadah, Akademik, Tahfidz, Asrama, dll.)' },
          { name: 'Katalog RBAC Baku', description: 'Struktur peran dan izin bawaan Spatie RBAC' }
        ]
      },
      {
        id: 'MODE_B_MASTERS_EXCEPT_CORE',
        title: 'Reset Master & Data Operasional (Kecuali Akun Super Admin & Core RBAC)',
        badge: 'Pembersihan Master Skala Besar',
        badgeColor: 'rose',
        riskLevel: 'Sangat Tinggi',
        tagline: 'Mengosongkan seluruh master data santri, SDM, kelas, dan riwayat presensi. Hanya akun Super Admin, Role Spatie, dan pengaturan inti yang dipertahankan.',
        description: 'Digunakan saat yayasan/pesantren ingin memasukkan ulang seluruh database santri & pegawai dari awal menggunakan template impor baru tanpa kehilangan akun Super Admin.',
        recommendedFor: 'Re-implementasi sistem dari awal atau pembersihan database testing total.',
        deletedEntities: [
          { name: 'Seluruh Presensi Santri & SDM', count: (currentData.records?.length || 0) + (currentData.staffRecords?.length || 0), category: 'Operasional' },
          { name: 'Seluruh Sesi Absensi & KBM', count: (currentData.sessions?.length || 0) + (currentData.teachingSessions?.length || 0), category: 'Operasional' },
          { name: 'Master Santri Aktif & Riwayat Kelas', count: currentData.students?.length || 0, category: 'Master' },
          { name: 'Master SDM, Guru & Penugasan Mengajar', count: currentData.staff?.length || 0, category: 'Master' },
          { name: 'Master Kelas, Asrama & Kamar', count: (currentData.classrooms?.length || 0) + (currentData.dormitories?.length || 0), category: 'Master' },
          { name: 'Master Ekstrakurikuler & Kelompok Santri', count: (currentData.extracurriculars?.length || 0) + (currentData.studentGroups?.length || 0), category: 'Master' },
          { name: 'Master Kegiatan Pesantren', count: currentData.activities?.length || 0, category: 'Master' },
        ],
        preservedEntities: [
          { name: 'Akun Super Admin Terdaftar', count: (currentData.users || []).filter((u: any) => u.role === 'super-admin' || u.role === 'super_admin' || u.role === 'admin').length || 1, category: 'Sistem' },
          { name: 'Hak Akses Spatie RBAC (7 Role Standar)', count: 7, category: 'Sistem' },
          { name: 'Konfigurasi Sistem & Environment Guard', count: 1, category: 'Sistem' }
        ],
        reseededEntities: [
          { name: 'Akun Super Admin Standar', description: 'Memastikan admin utama tetap dapat login pasca-reset' },
          { name: 'Kategori Kegiatan Baku Pesantren', description: '12 Kategori baku otomatis terisi kembali' },
          { name: 'Template Kartu Santri Standar', description: 'Template kartu default ID-1 Landscape & Portrait' }
        ]
      },
      {
        id: 'MODE_C_FACTORY_RESET',
        title: 'Factory Reset (Kembali ke Initial Seed Demo SIUBA)',
        badge: 'Dangerous / Tindakan Ekstrem',
        badgeColor: 'red',
        riskLevel: 'Ekstrem',
        tagline: 'Mengembalikan seluruh database ke kondisi seed awal pabrik (default demo santri & ustadz Utsman Bin Affan).',
        description: 'Seluruh modifikasi, data santri riil, presensi, kartu baru, dan pengaturan kustom akan ditimpa dengan initial seed demo.',
        recommendedFor: 'Testing lab lingkungan developer atau reset demonstrasi.',
        deletedEntities: [
          { name: 'Seluruh Modifikasi Data Pengguna', count: summary.totalRecords, category: 'Semua Domain' }
        ],
        preservedEntities: [
          { name: 'Struktur Skema Database SIUBA v1.0.7', count: 1, category: 'Sistem' }
        ],
        reseededEntities: [
          { name: 'Initial Dataset Santri Utsman Bin Affan', description: 'Data santri lengkap (NIS, QR, RFID, Kamar, Kelas)' },
          { name: 'Initial Master SDM & Guru KBM', description: 'Data Ustadz, jadwal KBM, dan perangkat terminal demo' },
          { name: 'Initial Kegiatan Pesantren', description: 'Shalat Berjamaah, KBM, Tahfidz Al-Qur\'an, Apel Pagi' }
        ]
      }
    ];
  }

  /**
   * Backups Management
   */
  public static getBackups(): BackupRecord[] {
    const raw = localStorage.getItem(BACKUPS_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse backups', e);
      }
    }
    return [];
  }



  // Reset database kini dijalankan di server (POST /maintenance/reset, tahap 13).

  /**
   * Run Comprehensive Data Integrity Audit Scan
   */
  public static runIntegrityAudit(currentData: Record<string, any>): IntegrityAuditResult {
    const startTime = performance.now();
    const scanId = `SCAN-INT-${Date.now().toString(36).toUpperCase()}`;
    const issues: IntegrityIssueItem[] = [];
    let totalChecks = 0;

    const students = (currentData.students || []) as any[];
    const records = (currentData.records || []) as any[];
    const sessions = (currentData.sessions || []) as any[];
    const classrooms = (currentData.classrooms || []) as any[];
    const dormRooms = (currentData.dormitoryRooms || []) as any[];
    const activities = (currentData.activities || []) as any[];
    const staff = (currentData.staff || []) as any[];
    const staffRecords = (currentData.staffRecords || []) as any[];
    const teachingSessions = (currentData.teachingSessions || []) as any[];
    const trainingSessions = (currentData.trainingSessions || []) as any[];
    const cardTemplates = (currentData.cardTemplates || []) as any[];

    const studentMap = new Map<number, any>(students.map(s => [s.id, s]));
    const sessionMap = new Map<number, any>(sessions.map(s => [s.id, s]));
    const classroomMap = new Map<number, any>(classrooms.map(c => [c.id, c]));
    const roomMap = new Map<number, any>(dormRooms.map(r => [r.id, r]));
    const staffMap = new Map<number, any>(staff.map(st => [st.id, st]));

    // Check 1: Duplicate Student Numbers (NIS)
    totalChecks++;
    const nisMap = new Map<string, any[]>();
    students.forEach(s => {
      if (s.student_number) {
        const nis = s.student_number.trim();
        if (!nisMap.has(nis)) nisMap.set(nis, []);
        nisMap.get(nis)!.push(s);
      }
    });
    nisMap.forEach((matched, nis) => {
      if (matched.length > 1) {
        issues.push({
          id: `ISSUE-NIS-DUP-${nis}`,
          code: 'STUDENT_NIS_DUPLICATE',
          severity: 'critical',
          domain: 'STUDENT_MASTER',
          title: `Duplikasi Nomor Induk Santri (NIS: ${nis})`,
          description: `Ditemukan ${matched.length} santri memiliki NIS yang identik: ${matched.map(m => m.name).join(', ')}.`,
          affected_entity_type: 'Student',
          affected_entity_id: matched[0].id,
          affected_entity_label: `NIS: ${nis}`,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Perbarui NIS salah satu santri agar unik.',
          can_auto_repair: false
        });
      }
    });

    // Check 2: Duplicate RFID / NFC Card UID
    totalChecks++;
    const rfidMap = new Map<string, any[]>();
    students.forEach(s => {
      if (s.rfid_card_id && s.rfid_card_id.trim()) {
        const uid = s.rfid_card_id.trim();
        if (!rfidMap.has(uid)) rfidMap.set(uid, []);
        rfidMap.get(uid)!.push(s);
      }
    });
    rfidMap.forEach((matched, uid) => {
      if (matched.length > 1) {
        issues.push({
          id: `ISSUE-RFID-DUP-${uid}`,
          code: 'RFID_CARD_DUPLICATE',
          severity: 'critical',
          domain: 'STUDENT_MASTER',
          title: `Duplikasi Kartu RFID Santri (UID: ${uid})`,
          description: `Kartu RFID UID ${uid} tertaut ke lebih dari satu santri: ${matched.map(m => m.name).join(', ')}.`,
          affected_entity_type: 'Student',
          affected_entity_id: matched[0].id,
          affected_entity_label: `UID: ${uid}`,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Lepaskan tautan kartu RFID pada salah satu santri.',
          can_auto_repair: true,
          repair_action_label: 'Lepas Tautan RFID Duplikat'
        });
      }
    });

    // Check 3: Orphan Attendance Records (Session doesn't exist)
    totalChecks++;
    records.forEach(r => {
      if (!sessionMap.has(r.attendance_session_id)) {
        issues.push({
          id: `ISSUE-ORPH-REC-${r.id}`,
          code: 'ATTENDANCE_ORPHAN_SESSION',
          severity: 'warning',
          domain: 'ATTENDANCE',
          title: 'Record Presensi Tanpa Sesi Valid (Orphan Record)',
          description: `Record Presensi ID #${r.id} (${r.student_name || 'Santri #' + r.student_id}) merujuk Session ID #${r.attendance_session_id} yang tidak ada di database.`,
          affected_entity_type: 'AttendanceRecord',
          affected_entity_id: r.id,
          affected_entity_label: `Record #${r.id}`,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Hapus record orphan atau tautkan ke sesi yang valid.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Record Presensi Orphan'
        });
      }
    });

    // Check 4: Attendance Double Scans (Same Session + Same Student)
    totalChecks++;
    const pairMap = new Map<string, any[]>();
    records.forEach(r => {
      const key = `${r.attendance_session_id}_${r.student_id}`;
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key)!.push(r);
    });
    pairMap.forEach((matched, key) => {
      if (matched.length > 1) {
        issues.push({
          id: `ISSUE-ATT-DUP-${key}`,
          code: 'ATTENDANCE_DOUBLE_RECORD',
          severity: 'warning',
          domain: 'ATTENDANCE',
          title: `Presensi Ganda pada Sesi #${matched[0].attendance_session_id}`,
          description: `Santri #${matched[0].student_id} (${matched[0].student_name}) tercatat ${matched.length} kali dalam satu sesi yang sama.`,
          affected_entity_type: 'AttendanceRecord',
          affected_entity_id: matched[0].id,
          affected_entity_label: `Sesi #${matched[0].attendance_session_id} - ${matched[0].student_name}`,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Gabungkan atau hapus record duplikat, simpan record terbaru.',
          can_auto_repair: true,
          repair_action_label: 'Dedup Record Presensi'
        });
      }
    });

    // Check 5: Student in Non-Existent Classroom
    totalChecks++;
    students.forEach(s => {
      if (s.classroom_id && !classroomMap.has(s.classroom_id)) {
        issues.push({
          id: `ISSUE-STU-CLASS-${s.id}`,
          code: 'STUDENT_INVALID_CLASSROOM',
          severity: 'info',
          domain: 'STUDENT_MASTER',
          title: `Santri Merujuk Kelas Tidak Ditemukan`,
          description: `Santri ${s.name} (NIS: ${s.student_number}) memiliki classroom_id #${s.classroom_id} yang tidak ada di master kelas.`,
          affected_entity_type: 'Student',
          affected_entity_id: s.id,
          affected_entity_label: s.name,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Tetapkan santri ke kelas aktif yang valid.',
          can_auto_repair: false
        });
      }
    });

    // Check 6: Student in Non-Existent Dormitory Room
    totalChecks++;
    students.forEach(s => {
      if (s.dormitory_room_id && !roomMap.has(s.dormitory_room_id)) {
        issues.push({
          id: `ISSUE-STU-ROOM-${s.id}`,
          code: 'STUDENT_INVALID_ROOM',
          severity: 'info',
          domain: 'STUDENT_MASTER',
          title: `Santri Merujuk Kamar Asrama Tidak Ditemukan`,
          description: `Santri ${s.name} memiliki dormitory_room_id #${s.dormitory_room_id} yang tidak terdaftar di master kamar.`,
          affected_entity_type: 'Student',
          affected_entity_id: s.id,
          affected_entity_label: s.name,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Tetapkan santri ke kamar asrama yang valid.',
          can_auto_repair: false
        });
      }
    });

    // Check 7: Staff Attendance Records without valid staff
    totalChecks++;
    staffRecords.forEach(sr => {
      if (sr.staff_id && !staffMap.has(sr.staff_id)) {
        issues.push({
          id: `ISSUE-STAFF-ORPH-${sr.id}`,
          code: 'STAFF_RECORD_ORPHAN',
          severity: 'warning',
          domain: 'STAFF_MASTER',
          title: 'Presensi SDM Tanpa Data Pegawai Valid',
          description: `Presensi SDM ID #${sr.id} merujuk staff_id #${sr.staff_id} yang tidak ditemukan.`,
          affected_entity_type: 'StaffAttendanceRecord',
          affected_entity_id: sr.id,
          affected_entity_label: `Presensi SDM #${sr.id}`,
          detected_at: new Date().toISOString(),
          suggested_fix: 'Hapus record atau pulihkan data SDM terkait.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Record SDM Orphan'
        });
      }
    });

    // Calculate metrics
    const duration = Math.round(performance.now() - startTime);
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    const passedCount = Math.max(0, totalChecks - (criticalCount > 0 ? 1 : 0) - (warningCount > 0 ? 1 : 0));

    const healthScore = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 10) - (infoCount * 2));

    const result: IntegrityAuditResult = {
      scan_id: scanId,
      scanned_at: new Date().toISOString(),
      duration_ms: duration,
      total_checks_run: totalChecks,
      passed_checks_count: passedCount,
      issues_count: issues.length,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: infoCount,
      health_score_percent: healthScore,
      issues
    };

    // Save scan to history
    localStorage.setItem(INTEGRITY_HISTORY_KEY, JSON.stringify(result));

    // Audit log
    this.appendLog({
      id: `LOG-INT-${Date.now().toString(36).toUpperCase()}`,
      event_type: 'integrity_check_completed',
      event_title: 'Audit Integritas Database Selesai',
      actor_name: 'Sistem Auditor SIUBA',
      actor_role: 'system',
      timestamp: new Date().toISOString(),
      status: criticalCount > 0 ? 'BLOCKED' : warningCount > 0 ? 'INFO' : 'SUCCESS',
      operation_id: scanId,
      duration_ms: duration,
      summary: `Pemeriksaan integritas ${totalChecks} uji selesai dalam ${duration}ms. Skor Kesehatan: ${healthScore}%. Ditemukan ${issues.length} catatan (${criticalCount} kritis, ${warningCount} peringatan).`
    });

    return result;
  }

  public static getLastIntegrityResult(): IntegrityAuditResult | null {
    const raw = localStorage.getItem(INTEGRITY_HISTORY_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse integrity result', e);
      }
    }
    return null;
  }

  /**
   * Maintenance Audit Trail Logging
   */
  public static getLogs(): MaintenanceLogEntry[] {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse logs', e);
      }
    }
    return [
      {
        id: 'LOG-INIT-001',
        event_type: 'environment_config_changed',
        event_title: 'Inisialisasi Sistem Maintenance v1.0.7',
        actor_name: 'Super Admin SIUBA',
        actor_role: 'super_admin',
        timestamp: '2026-08-26T04:00:00.000Z',
        status: 'SUCCESS',
        operation_id: 'INIT-V107',
        summary: 'Sistem Maintenance & Safe Database Reset diaktifkan dengan Environment Guard.'
      }
    ];
  }

  public static appendLog(entry: MaintenanceLogEntry) {
    const existing = this.getLogs();
    const sanitizedEntry = this.sanitizeLogEntry(entry);
    const updated = [sanitizedEntry, ...existing.slice(0, 99)]; // Keep latest 100
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Redact sensitive secrets (passwords, tokens, keys) from maintenance logs
   */
  private static sanitizeLogEntry(entry: MaintenanceLogEntry): MaintenanceLogEntry {
    if (!entry.details) return entry;
    const sanitized = { ...entry.details };
    const forbiddenKeys = ['password', 'passwordAttempt', 'secret', 'token', 'apiKey', 'APP_KEY', 'DB_PASSWORD'];

    const redact = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      Object.keys(obj).forEach(k => {
        if (forbiddenKeys.some(f => k.toLowerCase().includes(f.toLowerCase()))) {
          obj[k] = '[REDACTED_FOR_SECURITY]';
        } else if (typeof obj[k] === 'object') {
          redact(obj[k]);
        }
      });
    };

    redact(sanitized);
    return { ...entry, details: sanitized };
  }
}
