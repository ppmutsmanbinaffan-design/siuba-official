import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Student, 
  AttendanceDevice, 
  User,
  DataIntegritySummary, 
  DataIntegrityIssue,
  IntegritySeverity,
  IntegrityCategory,
  Staff,
  StaffAttendanceRecord
} from '../types';
import { AuditService } from './auditService';

export class DataIntegrityAuditService {
  /**
   * Run comprehensive data integrity scan across all relational data entities
   */
  public static runAudit(params: {
    sessions?: AttendanceSession[];
    sessionParticipants?: AttendanceSessionParticipant[];
    records?: AttendanceRecord[];
    students?: Student[];
    devices?: AttendanceDevice[];
  }): DataIntegritySummary {
    const sessions = params.sessions || [];
    const sessionParticipants = params.sessionParticipants || [];
    const records = params.records || [];
    const students = params.students || [];
    const devices = params.devices || [];
    const issues: DataIntegrityIssue[] = [];

    const sessionMap = new Map<number, AttendanceSession>(sessions.filter(Boolean).map(s => [s.id, s]));
    const studentMap = new Map<number, Student>(students.filter(Boolean).map(s => [s.id, s]));

    // -------------------------------------------------------------
    // CHECK 1: Attendance record without valid session
    // -------------------------------------------------------------
    records.forEach(r => {
      if (!sessionMap.has(r.attendance_session_id)) {
        issues.push({
          id: `orph_rec_sess_${r.id}`,
          severity: 'critical',
          category: 'ATTENDANCE',
          title: 'Record Absensi Tanpa Sesi Valid (Orphan Record)',
          description: `Record ID #${r.id} (${r.student_name || 'Santri #' + r.student_id}) merujuk pada Session ID #${r.attendance_session_id} yang tidak ada di database.`,
          affected_entity_type: 'AttendanceRecord',
          affected_entity_id: r.id,
          affected_entity_label: `Record #${r.id} (Santri #${r.student_id})`,
          suggested_fix: 'Hapus record orphan atau tautkan ke sesi yang sah.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Record Orphan',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 2: Attendance record without valid student
    // -------------------------------------------------------------
    records.forEach(r => {
      if (!studentMap.has(r.student_id)) {
        issues.push({
          id: `orph_rec_stu_${r.id}`,
          severity: 'critical',
          category: 'ATTENDANCE',
          title: 'Record Absensi Tanpa Data Santri Valid',
          description: `Record ID #${r.id} di Sesi #${r.attendance_session_id} merujuk pada Student ID #${r.student_id} yang tidak ditemukan dalam master data santri.`,
          affected_entity_type: 'AttendanceRecord',
          affected_entity_id: r.id,
          affected_entity_label: `Record #${r.id} di Sesi #${r.attendance_session_id}`,
          suggested_fix: 'Hapus record atau pulihkan data santri terkait.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Record Orphan',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 3: Duplicate attendance records (attendance_session_id + student_id)
    // -------------------------------------------------------------
    const recordPairMap = new Map<string, AttendanceRecord[]>();
    records.forEach(r => {
      const key = `${r.attendance_session_id}_${r.student_id}`;
      if (!recordPairMap.has(key)) {
        recordPairMap.set(key, []);
      }
      recordPairMap.get(key)!.push(r);
    });

    let duplicateAttendanceCount = 0;
    recordPairMap.forEach((recs, key) => {
      if (recs.length > 1) {
        duplicateAttendanceCount += (recs.length - 1);
        const [sessionId, studentId] = key.split('_');
        const session = sessionMap.get(Number(sessionId));
        const student = studentMap.get(Number(studentId));
        
        issues.push({
          id: `dup_attendance_${key}`,
          severity: 'critical',
          category: 'ATTENDANCE',
          title: 'Duplikasi Record Absensi pada Sesi yang Sama',
          description: `Ditemukan ${recs.length} record absensi aktif untuk santri "${student?.name || 'ID ' + studentId}" pada sesi "${session?.activity_name || 'ID ' + sessionId}".`,
          affected_entity_type: 'AttendanceRecordGroup',
          affected_entity_id: key,
          affected_entity_label: `Sesi #${sessionId} - Santri #${studentId}`,
          suggested_fix: 'Dedup data dengan mempertahankan record absensi terbaru/paling valid.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Duplikasi (Pertahankan Terakhir)',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 4: Attendance record for non-participant in session
    // -------------------------------------------------------------
    const participantPairSet = new Set<string>();
    const duplicateParticipantSet = new Set<string>();
    const seenParticipantKeys = new Set<string>();

    sessionParticipants.forEach(p => {
      const key = `${p.attendance_session_id}_${p.student_id}`;
      participantPairSet.add(key);
      if (seenParticipantKeys.has(key)) {
        duplicateParticipantSet.add(key);
      }
      seenParticipantKeys.add(key);
    });

    // Duplicate participant rows
    duplicateParticipantSet.forEach(key => {
      const [sessionId, studentId] = key.split('_');
      const student = studentMap.get(Number(studentId));
      issues.push({
        id: `dup_part_${key}`,
        severity: 'warning',
        category: 'PARTICIPANT',
        title: 'Duplikasi Peserta Terdaftar pada Sesi yang Sama',
        description: `Santri "${student?.name || 'ID ' + studentId}" terdaftar lebih dari 1 kali dalam snapshot peserta Sesi #${sessionId}.`,
        affected_entity_type: 'AttendanceSessionParticipant',
        affected_entity_id: key,
        affected_entity_label: `Sesi #${sessionId} - Santri #${studentId}`,
        suggested_fix: 'Hapus baris duplikat pada tabel peserta sesi.',
        can_auto_repair: true,
        repair_action_label: 'Bersihkan Duplikasi Peserta',
        detected_at: new Date().toISOString()
      });
    });

    records.forEach(r => {
      const key = `${r.attendance_session_id}_${r.student_id}`;
      const hasParticipants = sessionParticipants.some(p => p.attendance_session_id === r.attendance_session_id);
      if (hasParticipants && !participantPairSet.has(key)) {
        const student = studentMap.get(r.student_id);
        const session = sessionMap.get(r.attendance_session_id);
        issues.push({
          id: `non_part_rec_${r.id}`,
          severity: 'warning',
          category: 'PARTICIPANT',
          title: 'Record Absensi untuk Santri Bukan Peserta Sah',
          description: `Santri "${student?.name || 'ID ' + r.student_id}" memiliki record absensi pada sesi "${session?.activity_name || 'ID ' + r.attendance_session_id}", namun tidak terdaftar di daftar peserta sesi.`,
          affected_entity_type: 'AttendanceRecord',
          affected_entity_id: r.id,
          affected_entity_label: `Record #${r.id} di Sesi #${r.attendance_session_id}`,
          suggested_fix: 'Daftarkan santri ke peserta sesi atau tinjau kembali keabsahan record.',
          can_auto_repair: false,
          repair_action_label: 'Tinjau Manual',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 5: Incomplete Closed Required Sessions (Eligible != Recorded)
    // -------------------------------------------------------------
    let incompleteClosedSessionsCount = 0;
    sessions.forEach(sess => {
      if (sess.status === 'closed') {
        const sessParticipants = sessionParticipants.filter(p => p.attendance_session_id === sess.id);
        const sessRecords = records.filter(r => r.attendance_session_id === sess.id);
        
        if (sessParticipants.length > 0 && sessRecords.length < sessParticipants.length) {
          incompleteClosedSessionsCount++;
          const missingCount = sessParticipants.length - sessRecords.length;
          issues.push({
            id: `incomp_sess_${sess.id}`,
            severity: 'critical',
            category: 'SESSION',
            title: 'Sesi Wajib Tertutup Belum Terdata Lengkap (Incomplete Finalization)',
            description: `Sesi "${sess.activity_name} (${sess.session_code})" berstatus CLOSED tetapi baru memiliki ${sessRecords.length} record dari total ${sessParticipants.length} santri wajib (${missingCount} santri belum di-finalisasi/Auto-Alpha).`,
            affected_entity_type: 'AttendanceSession',
            affected_entity_id: sess.id,
            affected_entity_label: `${sess.activity_name} (${sess.session_code})`,
            suggested_fix: 'Jalankan finalisasi Auto-Alpha untuk melengkapi record santri yang belum hadir.',
            can_auto_repair: true,
            repair_action_label: 'Auto-Finalisasi Alpha Peserta Tersisa',
            detected_at: new Date().toISOString()
          });
        }
      }
    });

    // -------------------------------------------------------------
    // CHECK 6: Duplicate QR Tokens across students
    // -------------------------------------------------------------
    const qrMap = new Map<string, Student[]>();
    students.forEach(st => {
      if (st.qr_token) {
        if (!qrMap.has(st.qr_token)) {
          qrMap.set(st.qr_token, []);
        }
        qrMap.get(st.qr_token)!.push(st);
      }
    });

    let duplicateQrCount = 0;
    qrMap.forEach((stus, qr) => {
      if (stus.length > 1) {
        duplicateQrCount += (stus.length - 1);
        issues.push({
          id: `dup_qr_${qr}`,
          severity: 'critical',
          category: 'IDENTITY',
          title: 'Duplikasi QR Token Antar Santri',
          description: `QR Token "${qr}" terdaftar pada ${stus.length} santri berbeda: ${stus.map(s => s.name).join(', ')}.`,
          affected_entity_type: 'StudentQR',
          affected_entity_id: qr,
          affected_entity_label: `QR Token: ${qr}`,
          suggested_fix: 'Regenerasi token QR unik untuk masing-masing santri.',
          can_auto_repair: true,
          repair_action_label: 'Regenerasi Token QR Duplikat',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 7: Duplicate RFID UID across students
    // -------------------------------------------------------------
    const rfidMap = new Map<string, Student[]>();
    students.forEach(st => {
      if (st.rfid_uid) {
        const normalized = st.rfid_uid.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!rfidMap.has(normalized)) {
          rfidMap.set(normalized, []);
        }
        rfidMap.get(normalized)!.push(st);
      }
    });

    let duplicateRfidCount = 0;
    rfidMap.forEach((stus, rfid) => {
      if (stus.length > 1) {
        duplicateRfidCount += (stus.length - 1);
        issues.push({
          id: `dup_rfid_${rfid}`,
          severity: 'critical',
          category: 'IDENTITY',
          title: 'Duplikasi Kartu RFID UID Antar Santri',
          description: `RFID UID "${rfid}" terdaftar pada ${stus.length} santri berbeda: ${stus.map(s => s.name).join(', ')}.`,
          affected_entity_type: 'StudentRFID',
          affected_entity_id: rfid,
          affected_entity_label: `RFID UID: ${rfid}`,
          suggested_fix: 'Unassign RFID dari salah satu santri dan pasangkan kartu baru.',
          can_auto_repair: false,
          repair_action_label: 'Tinjau Manual Kartu',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 8: Active device assigned to closed/cancelled session
    // -------------------------------------------------------------
    let orphanDeviceAssignmentsCount = 0;
    devices.forEach(dev => {
      if (dev.is_active && dev.current_session_id) {
        const sess = sessionMap.get(dev.current_session_id);
        if (!sess || sess.status === 'closed' || sess.status === 'cancelled') {
          orphanDeviceAssignmentsCount++;
          issues.push({
            id: `dev_orphan_sess_${dev.id}`,
            severity: 'warning',
            category: 'DEVICE',
            title: 'Perangkat Terminal Masih Terkunci ke Sesi Selesai/Batal',
            description: `Perangkat "${dev.device_name} (${dev.device_code})" masih terhubung ke Sesi #${dev.current_session_id} yang sudah berstatus ${sess ? sess.status.toUpperCase() : 'DELETED'}.`,
            affected_entity_type: 'AttendanceDevice',
            affected_entity_id: dev.id,
            affected_entity_label: `${dev.device_name} (${dev.device_code})`,
            suggested_fix: 'Lepaskan penugasan sesi (unbind) agar perangkat dapat digunakan untuk sesi lain.',
            can_auto_repair: true,
            repair_action_label: 'Lepaskan Sesi Perangkat (Unbind)',
            detected_at: new Date().toISOString()
          });
        }
      }
    });

    // -------------------------------------------------------------
    // CHECK 9: Duplicate Staff Daily Attendance (staff_id + attendance_date + daily)
    // -------------------------------------------------------------
    let rawStaffRecords: StaffAttendanceRecord[] = [];
    try {
      const stored = localStorage.getItem('siuba_staff_attendance_records');
      if (stored) rawStaffRecords = JSON.parse(stored);
    } catch (_) {}

    const staffDailyPairMap = new Map<string, StaffAttendanceRecord[]>();
    rawStaffRecords.forEach(r => {
      if (r.attendance_type === 'daily') {
        const key = `${r.staff_id}_${r.attendance_date}`;
        if (!staffDailyPairMap.has(key)) {
          staffDailyPairMap.set(key, []);
        }
        staffDailyPairMap.get(key)!.push(r);
      }
    });

    staffDailyPairMap.forEach((recs, key) => {
      if (recs.length > 1) {
        const first = recs[0];
        issues.push({
          id: `dup_staff_att_${key}`,
          severity: 'critical',
          category: 'ATTENDANCE',
          title: 'Duplikasi Presensi Harian SDM',
          description: `Staff "${first.staff_name || 'ID ' + first.staff_id}" memiliki ${recs.length} record presensi harian pada tanggal ${first.attendance_date}.`,
          affected_entity_type: 'StaffAttendanceRecord',
          affected_entity_id: key,
          affected_entity_label: `${first.staff_name || 'Staff #' + first.staff_id} (${first.attendance_date})`,
          suggested_fix: 'Hapus duplikasi dan pertahankan record paling valid/lengkap.',
          can_auto_repair: true,
          repair_action_label: 'Dedup Presensi SDM',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 10: Inconsistent Check-In vs Check-Out Timestamps
    // -------------------------------------------------------------
    rawStaffRecords.forEach(r => {
      if (r.check_in_at && r.check_out_at) {
        const inMs = new Date(r.check_in_at).getTime();
        const outMs = new Date(r.check_out_at).getTime();
        if (outMs < inMs) {
          issues.push({
            id: `inv_staff_time_${r.id}`,
            severity: 'critical',
            category: 'ATTENDANCE',
            title: 'Jam Check-Out Lebih Awal dari Jam Check-In',
            description: `Record Presensi SDM #${r.id} (${r.staff_name}) memiliki check-out (${r.check_out_at.substring(11, 16)}) mendahului check-in (${r.check_in_at.substring(11, 16)}).`,
            affected_entity_type: 'StaffAttendanceRecord',
            affected_entity_id: r.id,
            affected_entity_label: `Record SDM #${r.id} (${r.staff_name})`,
            suggested_fix: 'Koreksi jam check-in atau check-out melalui form koreksi.',
            can_auto_repair: false,
            repair_action_label: 'Tinjau Manual',
            detected_at: new Date().toISOString()
          });
        }
      }
    });

    // -------------------------------------------------------------
    // CHECK 11 (SIUBA v1.1.2): Duplicate Teaching Sessions (academic_schedule_id + session_date)
    // -------------------------------------------------------------
    let rawTeachingSessions: any[] = [];
    try {
      const stored = localStorage.getItem('siuba_teaching_sessions');
      if (stored) rawTeachingSessions = JSON.parse(stored);
    } catch (_) {}

    const teachingSessPairMap = new Map<string, any[]>();
    rawTeachingSessions.forEach(ts => {
      const key = `${ts.academic_schedule_id}_${ts.session_date}`;
      if (!teachingSessPairMap.has(key)) teachingSessPairMap.set(key, []);
      teachingSessPairMap.get(key)!.push(ts);
    });

    teachingSessPairMap.forEach((sessList, key) => {
      if (sessList.length > 1) {
        const first = sessList[0];
        issues.push({
          id: `dup_teaching_sess_${key}`,
          severity: 'critical',
          category: 'SCHEDULE',
          title: 'Duplikasi Sesi Mengajar KBM',
          description: `Jadwal #${first.academic_schedule_id} (${first.subject_name} - ${first.classroom_name}) tergenerate ${sessList.length} kali pada tanggal ${first.session_date}.`,
          affected_entity_type: 'TeachingSession',
          affected_entity_id: key,
          affected_entity_label: `${first.subject_name} (${first.classroom_name} - ${first.session_date})`,
          suggested_fix: 'Hapus duplikasi sesi mengajar dan pertahankan sesi utama.',
          can_auto_repair: true,
          repair_action_label: 'Dedup Sesi Mengajar',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 12 (SIUBA v1.1.2): Duplicate Teaching Attendance Records
    // -------------------------------------------------------------
    const teachingRecPairMap = new Map<string, StaffAttendanceRecord[]>();
    rawStaffRecords.filter(r => r.attendance_type === 'teaching').forEach(r => {
      const key = `${r.staff_id}_${r.context_id}`;
      if (!teachingRecPairMap.has(key)) teachingRecPairMap.set(key, []);
      teachingRecPairMap.get(key)!.push(r);
    });

    teachingRecPairMap.forEach((recs, key) => {
      if (recs.length > 1) {
        const first = recs[0];
        issues.push({
          id: `dup_teaching_rec_${key}`,
          severity: 'critical',
          category: 'ATTENDANCE',
          title: 'Duplikasi Presensi Mengajar Guru',
          description: `Guru "${first.staff_name}" memiliki ${recs.length} record presensi mengajar pada sesi #${first.context_id} (${first.context_name || ''}).`,
          affected_entity_type: 'StaffAttendanceRecord',
          affected_entity_id: key,
          affected_entity_label: `${first.staff_name} - Sesi #${first.context_id}`,
          suggested_fix: 'Hapus duplikasi record mengajar.',
          can_auto_repair: true,
          repair_action_label: 'Dedup Presensi Mengajar',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 13 (SIUBA v1.1.2): Cancelled Session with Erroneous Absent Record
    // -------------------------------------------------------------
    const cancelledSessionIds = new Set(rawTeachingSessions.filter(s => s.status === 'cancelled').map(s => s.id));
    rawStaffRecords.filter(r => r.attendance_type === 'teaching' && r.status === 'absent').forEach(r => {
      if (r.context_id && cancelledSessionIds.has(r.context_id)) {
        issues.push({
          id: `cancel_sess_absent_${r.id}`,
          severity: 'warning',
          category: 'ATTENDANCE',
          title: 'Status Alpha pada Sesi KBM yang Dibatalkan',
          description: `Record presensi #${r.id} (${r.staff_name}) tercatat Alpha padahal sesi mengajar #${r.context_id} telah dibatalkan resmi.`,
          affected_entity_type: 'StaffAttendanceRecord',
          affected_entity_id: r.id,
          affected_entity_label: `${r.staff_name} (Sesi #${r.context_id})`,
          suggested_fix: 'Hapus record Alpha dari sesi yang dibatalkan.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Alpha Kelas Batal',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 14 (SIUBA v1.1.3): Duplicate Training Sessions (extracurricular_schedule_id + session_date)
    // -------------------------------------------------------------
    let rawTrainingSessions: any[] = [];
    try {
      const stored = localStorage.getItem('siuba_training_sessions');
      if (stored) rawTrainingSessions = JSON.parse(stored);
    } catch (_) {}

    const trainingSessPairMap = new Map<string, any[]>();
    rawTrainingSessions.forEach(ts => {
      const key = `${ts.extracurricular_schedule_id}_${ts.session_date}`;
      if (!trainingSessPairMap.has(key)) trainingSessPairMap.set(key, []);
      trainingSessPairMap.get(key)!.push(ts);
    });

    trainingSessPairMap.forEach((sessList, key) => {
      if (sessList.length > 1) {
        const first = sessList[0];
        issues.push({
          id: `dup_training_sess_${key}`,
          severity: 'critical',
          category: 'SCHEDULE',
          title: 'Duplikasi Sesi Latihan Ekstrakurikuler',
          description: `Jadwal Ekskul #${first.extracurricular_schedule_id} (${first.extracurricular_name}) tergenerate ${sessList.length} kali pada tanggal ${first.session_date}.`,
          affected_entity_type: 'TrainingSession',
          affected_entity_id: key,
          affected_entity_label: `${first.extracurricular_name} (${first.session_date})`,
          suggested_fix: 'Hapus duplikasi sesi latihan dan pertahankan sesi utama.',
          can_auto_repair: true,
          repair_action_label: 'Dedup Sesi Latihan',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 15 (SIUBA v1.1.3): Duplicate Training Attendance Records
    // -------------------------------------------------------------
    const trainingRecPairMap = new Map<string, StaffAttendanceRecord[]>();
    rawStaffRecords.filter(r => r.attendance_type === 'training').forEach(r => {
      const key = `${r.staff_id}_${r.context_id}`;
      if (!trainingRecPairMap.has(key)) trainingRecPairMap.set(key, []);
      trainingRecPairMap.get(key)!.push(r);
    });

    trainingRecPairMap.forEach((recs, key) => {
      if (recs.length > 1) {
        const first = recs[0];
        issues.push({
          id: `dup_training_rec_${key}`,
          severity: 'critical',
          category: 'ATTENDANCE',
          title: 'Duplikasi Presensi Melatih Pelatih/Pembina',
          description: `Staf "${first.staff_name}" memiliki ${recs.length} record presensi melatih pada sesi latihan #${first.context_id} (${first.context_name || ''}).`,
          affected_entity_type: 'StaffAttendanceRecord',
          affected_entity_id: key,
          affected_entity_label: `${first.staff_name} - Sesi Latihan #${first.context_id}`,
          suggested_fix: 'Hapus duplikasi record presensi melatih.',
          can_auto_repair: true,
          repair_action_label: 'Dedup Presensi Latihan',
          detected_at: new Date().toISOString()
        });
      }
    });

    // -------------------------------------------------------------
    // CHECK 16 (SIUBA v1.1.3): Cancelled Training Session with Erroneous Absent Record
    // -------------------------------------------------------------
    const cancelledTrainingSessionIds = new Set(rawTrainingSessions.filter(s => s.status === 'cancelled').map(s => s.id));
    rawStaffRecords.filter(r => r.attendance_type === 'training' && r.status === 'absent').forEach(r => {
      if (r.context_id && cancelledTrainingSessionIds.has(r.context_id)) {
        issues.push({
          id: `cancel_training_sess_absent_${r.id}`,
          severity: 'warning',
          category: 'ATTENDANCE',
          title: 'Status Alpha pada Sesi Latihan yang Dibatalkan',
          description: `Record presensi melatih #${r.id} (${r.staff_name}) tercatat Alpha padahal sesi latihan #${r.context_id} telah dibatalkan resmi.`,
          affected_entity_type: 'StaffAttendanceRecord',
          affected_entity_id: r.id,
          affected_entity_label: `${r.staff_name} (Sesi Latihan #${r.context_id})`,
          suggested_fix: 'Hapus record Alpha dari sesi latihan yang dibatalkan.',
          can_auto_repair: true,
          repair_action_label: 'Hapus Alpha Latihan Batal',
          detected_at: new Date().toISOString()
        });
      }
    });

    // Summary calculation
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (criticalCount > 0) status = 'CRITICAL';
    else if (warningCount > 0) status = 'WARNING';

    return {
      total_issues: issues.length,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: infoCount,
      last_audit_at: new Date().toISOString(),
      status,
      issues,
      metrics: {
        total_records_checked: records.length,
        total_sessions_checked: sessions.length,
        total_students_checked: students.length,
        total_participants_checked: sessionParticipants.length,
        total_devices_checked: devices.length,
        duplicate_attendance_count: duplicateAttendanceCount,
        incomplete_closed_sessions_count: incompleteClosedSessionsCount,
        duplicate_rfid_count: duplicateRfidCount,
        duplicate_qr_count: duplicateQrCount,
        orphan_device_assignments_count: orphanDeviceAssignmentsCount
      }
    };
  }

  /**
   * Execute safe automated repair for a detected integrity issue
   */
  public static executeRepair(params: {
    issue: DataIntegrityIssue;
    user: User;
    data: {
      sessions: AttendanceSession[];
      sessionParticipants: AttendanceSessionParticipant[];
      records: AttendanceRecord[];
      students: Student[];
      devices?: AttendanceDevice[];
    };
    onUpdateRecords?: (records: AttendanceRecord[]) => void;
    onUpdateParticipants?: (participants: AttendanceSessionParticipant[]) => void;
    onUpdateStudents?: (students: Student[]) => void;
    onUpdateDevices?: (devices: AttendanceDevice[]) => void;
  }): { success: boolean; message: string } {
    const { issue, user, data, onUpdateRecords, onUpdateParticipants, onUpdateStudents, onUpdateDevices } = params;

    if (!issue.can_auto_repair) {
      return { success: false, message: 'Masalah ini memerlukan tinjauan manual dan tidak dapat diperbaiki otomatis.' };
    }

    try {
      // REPAIR 1: Duplicate Attendance Records
      if (issue.id.startsWith('dup_attendance_')) {
        const [sessionIdStr, studentIdStr] = issue.affected_entity_id.toString().split('_');
        const sId = Number(sessionIdStr);
        const stuId = Number(studentIdStr);

        const matching = data.records.filter(r => r.attendance_session_id === sId && r.student_id === stuId);
        if (matching.length <= 1) {
          return { success: true, message: 'Tidak ada duplikasi yang ditemukan atau sudah diperbaiki.' };
        }

        // Keep latest record by ID
        const sorted = [...matching].sort((a, b) => b.id - a.id);
        const keep = sorted[0];
        const toDeleteIds = sorted.slice(1).map(r => r.id);

        const newRecords = data.records.filter(r => !toDeleteIds.includes(r.id));
        if (onUpdateRecords) onUpdateRecords(newRecords);

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'AttendanceRecord',
          auditable_id: keep.id,
          auditable_name: `Dedup Absensi Sesi #${sId} Santri #${stuId}`,
          old_values: { duplicate_count: matching.length, removed_record_ids: toDeleteIds },
          new_values: { retained_record_id: keep.id, retained_status: keep.status },
          reason: 'Perbaikan integritas data otomatis: pembersihan record duplikat',
          user
        });

        return { success: true, message: `Berhasil menghapus ${toDeleteIds.length} record duplikat, mempertahankan record #${keep.id}.` };
      }

      // REPAIR 2: Orphan Records (No session or no student)
      if (issue.id.startsWith('orph_rec_')) {
        const recId = Number(issue.affected_entity_id);
        const newRecords = data.records.filter(r => r.id !== recId);
        if (onUpdateRecords) onUpdateRecords(newRecords);

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'AttendanceRecord',
          auditable_id: recId,
          auditable_name: `Hapus Orphan Record #${recId}`,
          old_values: { record_id: recId },
          new_values: { status: 'DELETED' },
          reason: 'Perbaikan integritas data otomatis: pembersihan orphan record',
          user
        });

        return { success: true, message: `Record orphan #${recId} berhasil dihapus dari sistem.` };
      }

      // REPAIR 3: Duplicate Participants in session
      if (issue.id.startsWith('dup_part_')) {
        const [sIdStr, stuIdStr] = issue.affected_entity_id.toString().split('_');
        const sId = Number(sIdStr);
        const stuId = Number(stuIdStr);

        let seen = false;
        const newParts = data.sessionParticipants.filter(p => {
          if (p.attendance_session_id === sId && p.student_id === stuId) {
            if (!seen) {
              seen = true;
              return true; // Keep first
            }
            return false; // Drop subsequent
          }
          return true;
        });

        if (onUpdateParticipants) onUpdateParticipants(newParts);

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'AttendanceSessionParticipant',
          auditable_id: issue.affected_entity_id,
          auditable_name: `Dedup Peserta Sesi #${sId} Santri #${stuId}`,
          old_values: { status: 'DUPLICATE_ENTRIES' },
          new_values: { status: 'DEDUPLICATED' },
          reason: 'Perbaikan integritas data otomatis: penghapusan duplikasi peserta sesi',
          user
        });

        return { success: true, message: 'Duplikasi peserta pada sesi berhasil dibersihkan.' };
      }

      // REPAIR 4: Incomplete Closed Required Session (Auto Alpha missing participants)
      if (issue.id.startsWith('incomp_sess_')) {
        const sId = Number(issue.affected_entity_id);
        const sess = data.sessions.find(s => s.id === sId);
        if (!sess) return { success: false, message: 'Sesi tidak ditemukan.' };

        const sessParticipants = data.sessionParticipants.filter(p => p.attendance_session_id === sId);
        const existingStudentIds = new Set(data.records.filter(r => r.attendance_session_id === sId).map(r => r.student_id));
        
        const missingParts = sessParticipants.filter(p => !existingStudentIds.has(p.student_id));
        const newAlphaRecords: AttendanceRecord[] = missingParts.map((p, idx) => ({
          id: Date.now() + idx + Math.floor(Math.random() * 1000),
          attendance_session_id: sId,
          student_id: p.student_id,
          student_number: p.student_number,
          student_name: p.student_name,
          classroom_name: p.classroom_name,
          dormitory_room_name: p.dormitory_room_name,
          status: 'absent',
          method: 'manual',
          record_source: 'system',
          check_in_at: sess.end_at || new Date().toISOString(),
          late_minutes: 0,
          notes: 'Auto-Alpha Sistem (Perbaikan Integritas Data Sprint 11)',
          recorded_by: 'DataIntegrity Daemon'
        }));

        if (newAlphaRecords.length > 0 && onUpdateRecords) {
          onUpdateRecords([...newAlphaRecords, ...data.records]);
        }

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'AttendanceSession',
          auditable_id: sId,
          auditable_name: `Auto-Finalisasi Sesi #${sId} (${sess.activity_name})`,
          old_values: { incomplete_missing_records: missingParts.length },
          new_values: { created_alpha_records_count: newAlphaRecords.length, final_status: 'COMPLETED_RECORDED' },
          reason: 'Perbaikan integritas data otomatis: pemenuhan postulat eligible = recorded pada sesi closed',
          user
        });

        return { success: true, message: `Berhasil menambahkan ${newAlphaRecords.length} record Auto-Alpha untuk peserta yang belum tercatat pada sesi tertutup #${sId}.` };
      }

      // REPAIR 5: Unbind Device from Closed Session
      if (issue.id.startsWith('dev_orphan_sess_')) {
        const devId = Number(issue.affected_entity_id);
        const devs = data.devices || [];
        const targetDev = devs.find(d => d.id === devId);
        if (!targetDev) return { success: false, message: 'Perangkat tidak ditemukan.' };

        const oldSessionId = targetDev.current_session_id;
        const newDevs = devs.map(d => d.id === devId ? { ...d, current_session_id: undefined } : d);
        if (onUpdateDevices) onUpdateDevices(newDevs);

        AuditService.log({
          event: 'device_disabled',
          auditable_type: 'AttendanceDevice',
          auditable_id: devId,
          auditable_name: `Unbind Sesi Perangkat ${targetDev.device_name}`,
          old_values: { current_session_id: oldSessionId },
          new_values: { current_session_id: null },
          reason: 'Perbaikan integritas data otomatis: pelepasan penugasan sesi kadaluarsa/tertutup pada perangkat',
          user
        });

        return { success: true, message: `Perangkat ${targetDev.device_name} berhasil dilepaskan dari Sesi #${oldSessionId}.` };
      }

      // REPAIR 6: Regenerate Duplicate QR Token
      if (issue.id.startsWith('dup_qr_')) {
        const qr = String(issue.affected_entity_id);
        const matchingStudents = data.students.filter(s => s.qr_token === qr);
        if (matchingStudents.length <= 1) {
          return { success: true, message: 'QR Token sudah unik atau telah diperbaiki.' };
        }

        // Keep first student's QR, generate new QR for subsequent students
        const updatedStudents = data.students.map(s => {
          if (s.qr_token === qr && s.id !== matchingStudents[0].id) {
            const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            return { ...s, qr_token: `STU-${s.student_number || s.id}-${randomCode}` };
          }
          return s;
        });

        if (onUpdateStudents) onUpdateStudents(updatedStudents);

        AuditService.log({
          event: 'qr_regenerated',
          auditable_type: 'Student',
          auditable_id: matchingStudents[1].id,
          auditable_name: `Regenerasi QR Duplikat ${qr}`,
          old_values: { qr_token: qr, affected_students: matchingStudents.map(s => s.name) },
          new_values: { status: 'RESOLVED_UNIQUE_TOKENS' },
          reason: 'Perbaikan integritas data otomatis: regenerasi token QR duplikat santri',
          user
        });

        return { success: true, message: `Berhasil meregenerasi token QR unik untuk ${matchingStudents.length - 1} santri yang duplikat.` };
      }

      // REPAIR 7: Dedup Staff Daily Attendance
      if (issue.id.startsWith('dup_staff_att_')) {
        const [staffIdStr, dateStr] = issue.affected_entity_id.toString().split('_');
        const sId = Number(staffIdStr);

        let staffRecords: StaffAttendanceRecord[] = [];
        try {
          const stored = localStorage.getItem('siuba_staff_attendance_records');
          if (stored) staffRecords = JSON.parse(stored);
        } catch (_) {}

        const matching = staffRecords.filter(r => r.staff_id === sId && r.attendance_date === dateStr && r.attendance_type === 'daily');
        if (matching.length <= 1) {
          return { success: true, message: 'Tidak ada duplikasi presensi SDM yang ditemukan.' };
        }

        // Prioritize record with check-out, then with check-in, then earliest id
        const sorted = [...matching].sort((a, b) => {
          if (a.check_out_at && !b.check_out_at) return -1;
          if (!a.check_out_at && b.check_out_at) return 1;
          if (a.check_in_at && !b.check_in_at) return -1;
          if (!a.check_in_at && b.check_in_at) return 1;
          return a.id - b.id;
        });

        const keep = sorted[0];
        const toDeleteIds = sorted.slice(1).map(r => r.id);
        const newRecords = staffRecords.filter(r => !toDeleteIds.includes(r.id));
        localStorage.setItem('siuba_staff_attendance_records', JSON.stringify(newRecords));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'StaffAttendanceRecord',
          auditable_id: keep.id,
          auditable_name: `Dedup Presensi SDM #${sId} (${dateStr})`,
          old_values: { duplicate_count: matching.length, removed_record_ids: toDeleteIds },
          new_values: { retained_record_id: keep.id, retained_status: keep.status },
          reason: 'Perbaikan integritas data otomatis: pembersihan duplikasi presensi SDM',
          user
        });

        return { success: true, message: `Berhasil menghapus ${toDeleteIds.length} record duplikat presensi SDM, mempertahankan record #${keep.id}.` };
      }

      // REPAIR 9 (SIUBA v1.1.2): Duplicate Teaching Sessions
      if (issue.id.startsWith('dup_teaching_sess_')) {
        let teachingSessions: any[] = [];
        const stored = localStorage.getItem('siuba_teaching_sessions');
        if (stored) teachingSessions = JSON.parse(stored);

        const [schedIdStr, dateStr] = issue.affected_entity_id.toString().split('_');
        const schedId = Number(schedIdStr);

        const matching = teachingSessions.filter(s => s.academic_schedule_id === schedId && s.session_date === dateStr);
        if (matching.length <= 1) {
          return { success: true, message: 'Tidak ada duplikasi sesi mengajar atau sudah diperbaiki.' };
        }

        // Keep earliest/most active
        const sorted = [...matching].sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return -1;
          if (a.status !== 'completed' && b.status === 'completed') return 1;
          return a.id - b.id;
        });

        const keep = sorted[0];
        const toDeleteIds = sorted.slice(1).map(s => s.id);
        const newSessions = teachingSessions.filter(s => !toDeleteIds.includes(s.id));
        localStorage.setItem('siuba_teaching_sessions', JSON.stringify(newSessions));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'TeachingSession',
          auditable_id: keep.id,
          auditable_name: `Dedup Sesi Mengajar Jadwal #${schedId} (${dateStr})`,
          old_values: { duplicate_count: matching.length, removed_session_ids: toDeleteIds },
          new_values: { retained_session_id: keep.id, retained_status: keep.status },
          reason: 'Perbaikan integritas data otomatis: pembersihan duplikasi sesi mengajar KBM',
          user
        });

        return { success: true, message: `Berhasil menghapus ${toDeleteIds.length} duplikasi sesi mengajar, mempertahankan sesi #${keep.id}.` };
      }

      // REPAIR 10 (SIUBA v1.1.2): Duplicate Teaching Attendance Records
      if (issue.id.startsWith('dup_teaching_rec_')) {
        let staffRecords: StaffAttendanceRecord[] = [];
        const stored = localStorage.getItem('siuba_staff_attendance_records');
        if (stored) staffRecords = JSON.parse(stored);

        const [staffIdStr, contextIdStr] = issue.affected_entity_id.toString().split('_');
        const sId = Number(staffIdStr);
        const cId = Number(contextIdStr);

        const matching = staffRecords.filter(r => r.staff_id === sId && r.attendance_type === 'teaching' && r.context_id === cId);
        if (matching.length <= 1) {
          return { success: true, message: 'Tidak ada duplikasi record mengajar atau sudah diperbaiki.' };
        }

        const sorted = [...matching].sort((a, b) => {
          if (a.check_out_at && !b.check_out_at) return -1;
          if (!a.check_out_at && b.check_out_at) return 1;
          if (a.check_in_at && !b.check_in_at) return -1;
          if (!a.check_in_at && b.check_in_at) return 1;
          return a.id - b.id;
        });

        const keep = sorted[0];
        const toDeleteIds = sorted.slice(1).map(r => r.id);
        const newRecords = staffRecords.filter(r => !toDeleteIds.includes(r.id));
        localStorage.setItem('siuba_staff_attendance_records', JSON.stringify(newRecords));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'StaffAttendanceRecord',
          auditable_id: keep.id,
          auditable_name: `Dedup Presensi Mengajar Guru #${sId} Sesi #${cId}`,
          old_values: { duplicate_count: matching.length, removed_record_ids: toDeleteIds },
          new_values: { retained_record_id: keep.id, retained_status: keep.status },
          reason: 'Perbaikan integritas data otomatis: pembersihan duplikasi presensi mengajar',
          user
        });

        return { success: true, message: `Berhasil menghapus ${toDeleteIds.length} duplikasi presensi mengajar guru.` };
      }

      // REPAIR 11 (SIUBA v1.1.2): Cancelled Session Erroneous Absent Record
      if (issue.id.startsWith('cancel_sess_absent_')) {
        let staffRecords: StaffAttendanceRecord[] = [];
        const stored = localStorage.getItem('siuba_staff_attendance_records');
        if (stored) staffRecords = JSON.parse(stored);

        const recId = Number(issue.affected_entity_id);
        const targetRec = staffRecords.find(r => r.id === recId);
        const newRecords = staffRecords.filter(r => r.id !== recId);
        localStorage.setItem('siuba_staff_attendance_records', JSON.stringify(newRecords));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'StaffAttendanceRecord',
          auditable_id: recId,
          auditable_name: `Hapus Alpha KBM Sesi Batal #${recId}`,
          old_values: targetRec || { id: recId },
          new_values: { status: 'DELETED' },
          reason: 'Perbaikan integritas data otomatis: pembersihan Alpha pada sesi KBM yang dibatalkan',
          user
        });

        return { success: true, message: `Record Alpha pada sesi KBM yang dibatalkan berhasil dibersihkan.` };
      }

      // REPAIR 12 (SIUBA v1.1.3): Duplicate Training Sessions
      if (issue.id.startsWith('dup_training_sess_')) {
        let trainingSessions: any[] = [];
        const stored = localStorage.getItem('siuba_training_sessions');
        if (stored) trainingSessions = JSON.parse(stored);

        const [schedIdStr, dateStr] = issue.affected_entity_id.toString().split('_');
        const schedId = Number(schedIdStr);

        const matching = trainingSessions.filter(s => s.extracurricular_schedule_id === schedId && s.session_date === dateStr);
        if (matching.length <= 1) {
          return { success: true, message: 'Tidak ada duplikasi sesi latihan atau sudah diperbaiki.' };
        }

        const sorted = [...matching].sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return -1;
          if (a.status !== 'completed' && b.status === 'completed') return 1;
          return a.id - b.id;
        });

        const keep = sorted[0];
        const toDeleteIds = sorted.slice(1).map(s => s.id);
        const newSessions = trainingSessions.filter(s => !toDeleteIds.includes(s.id));
        localStorage.setItem('siuba_training_sessions', JSON.stringify(newSessions));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'TrainingSession',
          auditable_id: keep.id,
          auditable_name: `Dedup Sesi Latihan Jadwal #${schedId} (${dateStr})`,
          old_values: { duplicate_count: matching.length, removed_session_ids: toDeleteIds },
          new_values: { retained_session_id: keep.id, retained_status: keep.status },
          reason: 'Perbaikan integritas data otomatis: pembersihan duplikasi sesi latihan ekstrakurikuler',
          user
        });

        return { success: true, message: `Berhasil menghapus ${toDeleteIds.length} duplikasi sesi latihan, mempertahankan sesi #${keep.id}.` };
      }

      // REPAIR 13 (SIUBA v1.1.3): Duplicate Training Attendance Records
      if (issue.id.startsWith('dup_training_rec_')) {
        let staffRecords: StaffAttendanceRecord[] = [];
        const stored = localStorage.getItem('siuba_staff_attendance_records');
        if (stored) staffRecords = JSON.parse(stored);

        const [staffIdStr, contextIdStr] = issue.affected_entity_id.toString().split('_');
        const sId = Number(staffIdStr);
        const cId = Number(contextIdStr);

        const matching = staffRecords.filter(r => r.staff_id === sId && r.attendance_type === 'training' && r.context_id === cId);
        if (matching.length <= 1) {
          return { success: true, message: 'Tidak ada duplikasi record melatih atau sudah diperbaiki.' };
        }

        const sorted = [...matching].sort((a, b) => {
          if (a.check_out_at && !b.check_out_at) return -1;
          if (!a.check_out_at && b.check_out_at) return 1;
          if (a.check_in_at && !b.check_in_at) return -1;
          if (!a.check_in_at && b.check_in_at) return 1;
          return a.id - b.id;
        });

        const keep = sorted[0];
        const toDeleteIds = sorted.slice(1).map(r => r.id);
        const newRecords = staffRecords.filter(r => !toDeleteIds.includes(r.id));
        localStorage.setItem('siuba_staff_attendance_records', JSON.stringify(newRecords));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'StaffAttendanceRecord',
          auditable_id: keep.id,
          auditable_name: `Dedup Presensi Melatih Staf #${sId} Sesi Latihan #${cId}`,
          old_values: { duplicate_count: matching.length, removed_record_ids: toDeleteIds },
          new_values: { retained_record_id: keep.id, retained_status: keep.status },
          reason: 'Perbaikan integritas data otomatis: pembersihan duplikasi presensi melatih',
          user
        });

        return { success: true, message: `Berhasil menghapus ${toDeleteIds.length} duplikasi presensi melatih.` };
      }

      // REPAIR 14 (SIUBA v1.1.3): Cancelled Training Session Erroneous Absent Record
      if (issue.id.startsWith('cancel_training_sess_absent_')) {
        let staffRecords: StaffAttendanceRecord[] = [];
        const stored = localStorage.getItem('siuba_staff_attendance_records');
        if (stored) staffRecords = JSON.parse(stored);

        const recId = Number(issue.affected_entity_id);
        const targetRec = staffRecords.find(r => r.id === recId);
        const newRecords = staffRecords.filter(r => r.id !== recId);
        localStorage.setItem('siuba_staff_attendance_records', JSON.stringify(newRecords));

        AuditService.log({
          event: 'data_integrity_repair',
          auditable_type: 'StaffAttendanceRecord',
          auditable_id: recId,
          auditable_name: `Hapus Alpha Latihan Sesi Batal #${recId}`,
          old_values: targetRec || { id: recId },
          new_values: { status: 'DELETED' },
          reason: 'Perbaikan integritas data otomatis: pembersihan Alpha pada sesi latihan yang dibatalkan',
          user
        });

        return { success: true, message: `Record Alpha pada sesi latihan yang dibatalkan berhasil dibersihkan.` };
      }

      return { success: false, message: 'Penanganan aksi perbaikan belum terdefinisi untuk tipe isu ini.' };
    } catch (err: any) {
      return { success: false, message: `Gagal menjalankan perbaikan: ${err.message || err}` };
    }
  }
}
