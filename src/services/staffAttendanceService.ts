import { 
  Staff, 
  StaffAttendanceRecord, 
  StaffAttendanceType, 
  StaffAttendanceStatus, 
  AttendanceMethod, 
  AttendanceSession,
  TeachingSession,
  TrainingSession,
  ExtracurricularStaffAssignment,
  StaffAbsenceRequest,
  StaffAttendanceScanResponse,
  StaffAttendanceRecordHistory
} from '../types';
import { StaffIdentityResolver } from './staffIdentityResolver';
import { StaffWorkScheduleResolver } from './staffWorkScheduleResolver';
import { StaffAttendanceValidationService } from './staffAttendanceValidationService';
import { AuditService } from './auditService';
import { TeachingSessionService } from './teachingSessionService';
import { TeachingAttendanceContextResolver } from './teachingAttendanceContextResolver';
import { TrainingSessionService } from './trainingSessionService';
import { TrainingAttendanceContextResolver } from './trainingAttendanceContextResolver';
import { ExtracurricularStaffAssignmentService } from './extracurricularStaffAssignmentService';
import { TrainerSubstitutionService } from './trainerSubstitutionService';

export class StaffAttendanceService {
  private static RECORDS_KEY = 'siuba_staff_attendance_records';
  private static ABSENCE_KEY = 'siuba_staff_absence_requests';
  private static ASSIGNMENTS_KEY = 'siuba_extracurricular_staff_assignments';

  public static getInitialRecords(): StaffAttendanceRecord[] {
    const today = new Date().toISOString().substring(0, 10);
    return [
      {
        id: 1,
        staff_id: 1,
        staff_name: 'Ust. Ahmad Fauzi, S.Kom',
        staff_number: 'STF260001',
        staff_type: 'teacher',
        attendance_date: today,
        attendance_type: 'daily',
        scheduled_start_at: `${today}T07:00:00+07:00`,
        scheduled_end_at: `${today}T16:00:00+07:00`,
        check_in_at: `${today}T06:48:12+07:00`,
        check_out_at: null,
        status: 'present',
        check_in_method: 'rfid',
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: 'RFID-GATE-01',
        notes: 'Check-in gerbang utama',
        created_at: `${today}T06:48:12+07:00`,
        updated_at: `${today}T06:48:12+07:00`,
      },
      {
        id: 2,
        staff_id: 2,
        staff_name: 'Ust. Dr. M. Rasyid',
        staff_number: 'STF260002',
        staff_type: 'teacher',
        attendance_date: today,
        attendance_type: 'daily',
        scheduled_start_at: `${today}T07:00:00+07:00`,
        scheduled_end_at: `${today}T16:00:00+07:00`,
        check_in_at: `${today}T06:55:00+07:00`,
        check_out_at: null,
        status: 'present',
        check_in_method: 'qr',
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: 'Petugas TU',
        notes: 'Scan QR di lobi kantor',
        created_at: `${today}T06:55:00+07:00`,
        updated_at: `${today}T06:55:00+07:00`,
      },
      {
        id: 3,
        staff_id: 3,
        staff_name: 'Ust. M. Ridwan, M.Pd',
        staff_number: 'STF260003',
        staff_type: 'teacher',
        attendance_date: today,
        attendance_type: 'daily',
        scheduled_start_at: `${today}T07:00:00+07:00`,
        scheduled_end_at: `${today}T16:00:00+07:00`,
        check_in_at: `${today}T07:22:45+07:00`,
        check_out_at: null,
        status: 'late',
        check_in_method: 'rfid',
        late_minutes: 22,
        early_leave_minutes: 0,
        recorded_by: 'RFID-GATE-01',
        notes: 'Terlambat 22 menit',
        created_at: `${today}T07:22:45+07:00`,
        updated_at: `${today}T07:22:45+07:00`,
      },
      {
        id: 4,
        staff_id: 1,
        staff_name: 'Ust. Ahmad Fauzi, S.Kom',
        staff_number: 'STF260001',
        staff_type: 'teacher',
        attendance_date: today,
        attendance_type: 'teaching',
        context_type: 'academic_session',
        context_id: 101,
        context_name: 'TIK — Kelas VII A (Jam Ke-1)',
        scheduled_start_at: `${today}T07:30:00+07:00`,
        scheduled_end_at: `${today}T08:50:00+07:00`,
        check_in_at: `${today}T07:28:15+07:00`,
        check_out_at: null,
        status: 'present',
        check_in_method: 'manual',
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: 'Ust. Ahmad Fauzi, S.Kom',
        notes: 'Presensi KBM mandiri',
        created_at: `${today}T07:28:15+07:00`,
        updated_at: `${today}T07:28:15+07:00`,
      }
    ];
  }

  public static getRecords(): StaffAttendanceRecord[] {
    try {
      const stored = localStorage.getItem(this.RECORDS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse staff attendance records', e);
    }
    const initial = this.getInitialRecords();
    this.saveRecords(initial);
    return initial;
  }

  public static saveRecords(records: StaffAttendanceRecord[]): void {
    try {
      localStorage.setItem(this.RECORDS_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save staff records', e);
    }
  }

  public static getAbsenceRequests(): StaffAbsenceRequest[] {
    try {
      const stored = localStorage.getItem(this.ABSENCE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse absence requests', e);
    }
    const today = new Date().toISOString().substring(0, 10);
    const initial: StaffAbsenceRequest[] = [
      {
        id: 1,
        staff_id: 8,
        staff_name: 'Pak Joko Santoso',
        staff_number: 'STF260008',
        type: 'official_duty',
        start_at: `${today}T08:00:00+07:00`,
        end_at: `${today}T15:00:00+07:00`,
        reason: 'Belanja suku cadang genset & sarpras pesantren',
        status: 'approved',
        requested_at: `${today}T06:30:00+07:00`,
        approved_by: 'Kepala Bagian TU',
        approved_at: `${today}T07:00:00+07:00`,
        created_at: `${today}T06:30:00+07:00`,
        updated_at: `${today}T07:00:00+07:00`,
      }
    ];
    this.saveAbsenceRequests(initial);
    return initial;
  }

  public static saveAbsenceRequests(requests: StaffAbsenceRequest[]): void {
    try {
      localStorage.setItem(this.ABSENCE_KEY, JSON.stringify(requests));
    } catch (e) {
      console.error('Failed to save absence requests', e);
    }
  }

  public static getCoachAssignments(): any[] {
    try {
      const stored = localStorage.getItem(this.ASSIGNMENTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse coach assignments', e);
    }
    const initial = [
      {
        id: 1,
        extracurricular_id: 1,
        extracurricular_name: 'Panahan Tradisional Utsman',
        staff_id: 4,
        staff_name: 'Ust. Dimas Wahyudi',
        role: 'coach',
        start_date: '2026-07-01',
        is_active: true
      },
      {
        id: 2,
        extracurricular_id: 2,
        extracurricular_name: 'Robotika & Coding Santri',
        staff_id: 1,
        staff_name: 'Ust. Ahmad Fauzi, S.Kom',
        role: 'coach',
        start_date: '2026-07-01',
        is_active: true
      }
    ];
    localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(initial));
    return initial;
  }

  // ==========================================
  // AUTHORITATIVE RECORD METHOD (DAILY CHECK-IN / CHECK-OUT)
  // ==========================================
  public static recordDailyScan(params: {
    identifier: string; // QR token, RFID UID, or Staff Number
    method: AttendanceMethod;
    deviceCode?: string;
    operatorName?: string;
    timestamp?: string;
  }): StaffAttendanceScanResponse {
    const timeNow = params.timestamp || new Date().toISOString();
    const dateStr = timeNow.substring(0, 10);
    const records = this.getRecords();

    // 1. Resolve Staff Identity
    let staff: Staff | null = null;
    if (params.method === 'qr') {
      staff = StaffIdentityResolver.resolveByQrToken(params.identifier);
    } else if (params.method === 'rfid') {
      staff = StaffIdentityResolver.resolveByRfidUid(params.identifier);
    } else {
      staff = StaffIdentityResolver.resolveByStaffNumber(params.identifier) || StaffIdentityResolver.resolveById(Number(params.identifier));
    }

    if (!staff) {
      return {
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Data staff tidak ditemukan untuk kartu/QR yang dipindai',
      };
    }

    // 2. Validate
    const validation = StaffAttendanceValidationService.validateDailyAttendance(staff, dateStr, records);
    if (!validation.valid && validation.code !== 'ALREADY_CHECKED_IN') {
      return {
        success: false,
        code: validation.code,
        message: validation.message,
        staff,
      };
    }

    // 3. Resolve Schedule
    const schedule = StaffWorkScheduleResolver.resolveSchedule(staff, dateStr);
    if (!schedule) {
      return {
        success: false,
        code: 'NO_SCHEDULE',
        message: 'Jadwal kerja belum dikonfigurasi untuk hari ini',
        staff,
      };
    }

    // 4. Check existing daily record
    const existingIndex = records.findIndex(
      r => r.staff_id === staff!.id && r.attendance_date === dateStr && r.attendance_type === 'daily'
    );

    if (existingIndex === -1) {
      // CHECK-IN FLOW
      const { status, late_minutes } = StaffWorkScheduleResolver.calculateCheckInStatus(schedule, timeNow, dateStr);
      
      const newRecord: StaffAttendanceRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'daily',
        scheduled_start_at: `${dateStr}T${schedule.scheduled_start_at}:00+07:00`,
        scheduled_end_at: `${dateStr}T${schedule.scheduled_end_at}:00+07:00`,
        check_in_at: timeNow,
        check_out_at: null,
        status: status,
        check_in_method: params.method,
        late_minutes: late_minutes,
        early_leave_minutes: 0,
        recorded_by: params.deviceCode || params.operatorName || 'System Scanner',
        notes: late_minutes > 0 ? `Terlambat ${late_minutes} menit` : 'Tepat waktu',
        created_at: timeNow,
        updated_at: timeNow,
      };

      records.unshift(newRecord);
      this.saveRecords(records);

      AuditService.log({
        event: 'staff_checkin',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: newRecord.id,
        auditable_name: `${staff.name} (Check-in Harian)`,
        new_values: { staff_id: staff.id, check_in_at: timeNow, status: status, late_minutes },
        reason: `Check-in harian: ${staff.name} (${status.toUpperCase()})`,
        user: { id: 1, name: params.operatorName || 'Device Scanner', role: 'Admin' }
      });

      return {
        success: true,
        code: 'CHECK_IN_SUCCESS',
        message: `Check-in berhasil: ${staff.name} (${status === 'late' ? `Terlambat ${late_minutes}m` : 'Hadir Tepat Waktu'})`,
        staff,
        record: newRecord,
        mode: 'CHECK_IN'
      };
    } else {
      // CHECK-OUT FLOW
      const existing = records[existingIndex];
      if (existing.check_out_at) {
        return {
          success: false,
          code: 'ALREADY_CHECKED_OUT',
          message: `${staff.name} sudah melakukan check-out pada ${existing.check_out_at.substring(11, 16)}`,
          staff,
          record: existing,
        };
      }

      // Calculate early leave minutes
      const earlyLeaveMinutes = StaffWorkScheduleResolver.calculateEarlyLeaveMinutes(schedule, timeNow, dateStr);

      existing.check_out_at = timeNow;
      existing.check_out_method = params.method;
      existing.early_leave_minutes = earlyLeaveMinutes;
      existing.updated_at = timeNow;
      if (earlyLeaveMinutes > 0) {
        existing.notes = (existing.notes ? `${existing.notes} | ` : '') + `Pulang cepat ${earlyLeaveMinutes} menit`;
      }

      records[existingIndex] = existing;
      this.saveRecords(records);

      AuditService.log({
        event: 'staff_checkout',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: existing.id,
        auditable_name: `${staff.name} (Check-out Harian)`,
        new_values: { staff_id: staff.id, check_out_at: timeNow, early_leave_minutes: earlyLeaveMinutes },
        reason: `Check-out harian: ${staff.name}`,
        user: { id: 1, name: params.operatorName || 'Device Scanner', role: 'Admin' }
      });

      return {
        success: true,
        code: 'CHECK_OUT_SUCCESS',
        message: `Check-out berhasil: ${staff.name} (${earlyLeaveMinutes > 0 ? `Pulang awal ${earlyLeaveMinutes}m` : 'Selesai Jam Kerja'})`,
        staff,
        record: existing,
        mode: 'CHECK_OUT'
      };
    }
  }

  // ==========================================
  // TEACHING ATTENDANCE (GURU MENGAJAR KBM)
  // ==========================================
  public static recordTeachingAttendance(params: {
    staffId: number;
    session: AttendanceSession;
    method: AttendanceMethod;
    operatorName?: string;
    substituteTeacherId?: number | null;
    timestamp?: string;
  }): StaffAttendanceScanResponse {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, code: 'STAFF_NOT_FOUND', message: 'Data guru tidak ditemukan' };
    }

    const records = this.getRecords();
    const validation = StaffAttendanceValidationService.validateTeachingAttendance(
      staff,
      params.session,
      records,
      params.substituteTeacherId
    );

    if (!validation.valid) {
      return { success: false, code: validation.code, message: validation.message, staff };
    }

    const timeNow = params.timestamp || new Date().toISOString();
    const dateStr = params.session.session_date || timeNow.substring(0, 10);
    const sessionStart = params.session.start_at ? params.session.start_at.substring(11, 16) : '07:30';
    const sessionEnd = params.session.end_at ? params.session.end_at.substring(11, 16) : '08:50';

    // Calculate teaching lateness
    const startMs = StaffWorkScheduleResolver.parseTimeToMs(dateStr, sessionStart);
    const nowMs = new Date(timeNow).getTime();
    let status: StaffAttendanceStatus = 'present';
    let lateMinutes = 0;

    if (nowMs > startMs + 10 * 60000) { // tolerance 10 mins
      lateMinutes = Math.max(1, Math.floor((nowMs - startMs) / 60000));
      status = 'late';
    }

    const newRecord: StaffAttendanceRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      staff_type: staff.staff_type,
      attendance_date: dateStr,
      attendance_type: 'teaching',
      context_type: 'academic_session',
      context_id: params.session.id,
      context_name: `${params.session.activity_name || params.session.session_code} (${params.session.category_name || 'KBM'})`,
      scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
      scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
      check_in_at: timeNow,
      check_out_at: null,
      status: status,
      check_in_method: params.method,
      late_minutes: lateMinutes,
      early_leave_minutes: 0,
      recorded_by: params.operatorName || staff.name,
      notes: lateMinutes > 0 ? `Terlambat mengajar ${lateMinutes} menit` : 'Mengajar tepat waktu',
      created_at: timeNow,
      updated_at: timeNow,
    };

    records.unshift(newRecord);
    this.saveRecords(records);

    AuditService.log({
      event: 'staff_teaching',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: newRecord.id,
      auditable_name: `${staff.name} (Mengajar KBM)`,
      new_values: { staff_id: staff.id, session_id: params.session.id, status, lateMinutes },
      reason: `Presensi Mengajar: ${staff.name} pada sesi ${params.session.activity_name || params.session.session_code}`,
      user: { id: 1, name: params.operatorName || staff.name, role: 'Teacher' }
    });

    return {
      success: true,
      code: 'TEACHING_RECORDED',
      message: `Presensi mengajar tercatat: ${staff.name} di ${params.session.activity_name || params.session.session_code}`,
      staff,
      record: newRecord,
      mode: 'RECORDED'
    };
  }

  // ==========================================
  // SIUBA v1.1.2: ADVANCED TEACHING SESSION SCAN (QR & RFID)
  // ==========================================
  public static recordTeachingAttendanceScan(params: {
    staffId: number;
    sessionId: number;
    method: 'qr' | 'rfid';
    operatorName?: string;
    timestamp?: string;
  }): StaffAttendanceScanResponse {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, code: 'STAFF_NOT_FOUND', message: 'Data staf pengajar tidak ditemukan' };
    }

    const session = TeachingSessionService.getTeachingSessionById(params.sessionId);
    if (!session) {
      return { success: false, code: 'SESSION_NOT_FOUND', message: 'Sesi mengajar tidak ditemukan' };
    }

    const records = this.getRecords();
    const timeNow = params.timestamp || new Date().toISOString();

    const resolution = TeachingAttendanceContextResolver.resolveTeachingContext({
      staff,
      sessionId: params.sessionId,
      timeNowStr: timeNow,
      existingRecords: records
    });

    if (!resolution.is_eligible && resolution.code !== 'ALREADY_RECORDED') {
      return {
        success: false,
        code: resolution.code,
        message: resolution.message,
        staff
      };
    }

    // Check if ready for check-out (already checked in)
    if (resolution.code === 'ALREADY_RECORDED') {
      return this.recordTeachingCheckOut({
        staffId: params.staffId,
        sessionId: params.sessionId,
        method: params.method,
        timestamp: timeNow,
        operatorName: params.operatorName
      });
    }

    // Check-in new teaching attendance
    const dateStr = session.session_date || timeNow.substring(0, 10);
    const sessionStart = session.scheduled_start_at ? session.scheduled_start_at.substring(11, 16) : '07:00';
    const sessionEnd = session.scheduled_end_at ? session.scheduled_end_at.substring(11, 16) : '07:40';

    const status: StaffAttendanceStatus = resolution.is_late ? 'late' : 'present';
    const lateMinutes = resolution.late_minutes || 0;

    const newRecord: StaffAttendanceRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      staff_type: staff.staff_type,
      attendance_date: dateStr,
      attendance_type: 'teaching',
      context_type: 'academic_session',
      context_id: session.id,
      context_name: `${session.subject_name} — ${session.classroom_name} (${session.lesson_period_name})`,
      scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
      scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
      check_in_at: timeNow,
      check_out_at: null,
      status: status,
      check_in_method: params.method,
      late_minutes: lateMinutes,
      early_leave_minutes: 0,
      recorded_by: params.operatorName || (params.method === 'rfid' ? 'RFID-CLASS-READER' : 'QR-TEACHER-SCAN'),
      notes: resolution.is_substitute 
        ? `Guru Pengganti untuk ${session.scheduled_teacher_name}${lateMinutes > 0 ? ` (Terlambat ${lateMinutes}m)` : ''}`
        : (lateMinutes > 0 ? `Terlambat mengajar ${lateMinutes} menit` : 'Mengajar tepat waktu'),
      created_at: timeNow,
      updated_at: timeNow,
    };

    records.unshift(newRecord);
    this.saveRecords(records);

    AuditService.log({
      event: 'staff_teaching_scan',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: newRecord.id,
      auditable_name: `${staff.name} (Mengajar ${session.subject_name})`,
      new_values: { staff_id: staff.id, session_id: session.id, status, lateMinutes, method: params.method },
      reason: `Scan presensi mengajar via ${params.method.toUpperCase()} pada ${session.subject_name} (${session.classroom_name})`,
      user: { id: 1, name: params.operatorName || staff.name, role: 'Teacher' }
    });

    return {
      success: true,
      code: 'TEACHING_CHECKIN_SUCCESS',
      message: `Presensi mengajar tercatat: ${staff.name} pada ${session.subject_name} (${session.classroom_name} - ${session.lesson_period_name}) [${status === 'late' ? `Terlambat ${lateMinutes}m` : 'Tepat Waktu'}]`,
      staff,
      record: newRecord,
      mode: 'CHECK_IN'
    };
  }

  // ==========================================
  // SIUBA v1.1.2: TEACHING CHECK-OUT
  // ==========================================
  public static recordTeachingCheckOut(params: {
    staffId: number;
    sessionId: number;
    method?: AttendanceMethod;
    timestamp?: string;
    operatorName?: string;
  }): StaffAttendanceScanResponse {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, code: 'STAFF_NOT_FOUND', message: 'Data staf guru tidak ditemukan' };
    }

    const session = TeachingSessionService.getTeachingSessionById(params.sessionId);
    const records = this.getRecords();
    const existingIndex = records.findIndex(
      r => r.staff_id === staff.id && 
        r.attendance_type === 'teaching' && 
        r.context_id === params.sessionId
    );

    if (existingIndex < 0) {
      return {
        success: false,
        code: 'NOT_CHECKED_IN',
        message: `Guru ${staff.name} belum melakukan check-in pada sesi mengajar ini.`,
        staff
      };
    }

    const existing = records[existingIndex];
    if (existing.check_out_at) {
      return {
        success: false,
        code: 'ALREADY_CHECKED_OUT',
        message: `Guru ${staff.name} sudah menyelesaikan check-out mengajar pada pukul ${existing.check_out_at.substring(11, 16)}.`,
        staff,
        record: existing
      };
    }

    const timeNow = params.timestamp || new Date().toISOString();
    existing.check_out_at = timeNow;
    existing.check_out_method = params.method || 'manual';
    existing.updated_at = timeNow;

    records[existingIndex] = existing;
    this.saveRecords(records);

    // Complete the teaching session
    if (session) {
      TeachingSessionService.completeSession(session.id);
    }

    AuditService.log({
      event: 'staff_teaching_checkout',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: existing.id,
      auditable_name: `${staff.name} (Check-out Mengajar)`,
      old_values: { check_out_at: null },
      new_values: { check_out_at: timeNow, method: params.method || 'manual' },
      reason: `Check-out mengajar selesai KBM: ${existing.context_name}`,
      user: { id: 1, name: params.operatorName || staff.name, role: 'Teacher' }
    });

    return {
      success: true,
      code: 'TEACHING_CHECKOUT_SUCCESS',
      message: `Check-out mengajar berhasil: ${staff.name} telah menyelesaikan KBM pada pukul ${timeNow.substring(11, 16)}.`,
      staff,
      record: existing,
      mode: 'CHECK_OUT'
    };
  }

  // ==========================================
  // SIUBA v1.1.2: MANUAL TEACHING ATTENDANCE ENTRY (KURIKULUM / OPERATOR)
  // ==========================================
  public static recordTeachingAttendanceManual(params: {
    staffId: number;
    sessionId: number;
    action: 'check_in' | 'check_out' | 'both';
    checkInTime?: string; // HH:mm
    checkOutTime?: string; // HH:mm
    status?: StaffAttendanceStatus;
    reason: string;
    operatorName: string;
  }): { success: boolean; message: string; record?: StaffAttendanceRecord } {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data guru tidak ditemukan' };
    }

    const session = TeachingSessionService.getTeachingSessionById(params.sessionId);
    if (!session) {
      return { success: false, message: 'Sesi mengajar tidak ditemukan' };
    }

    if (session.status === 'cancelled') {
      return { success: false, message: 'Sesi mengajar telah dibatalkan. Tidak dapat mencatat presensi.' };
    }

    const records = this.getRecords();
    const dateStr = session.session_date;
    const existingIndex = records.findIndex(
      r => r.staff_id === staff.id && 
        r.attendance_type === 'teaching' && 
        r.context_id === session.id
    );

    const timeNow = new Date().toISOString();
    const sessionStart = session.scheduled_start_at ? session.scheduled_start_at.substring(11, 16) : '07:00';
    const sessionEnd = session.scheduled_end_at ? session.scheduled_end_at.substring(11, 16) : '07:40';

    if (existingIndex < 0) {
      // New teaching record
      let status: StaffAttendanceStatus = params.status || 'present';
      let lateMinutes = 0;

      if (params.checkInTime) {
        const startMs = StaffWorkScheduleResolver.parseTimeToMs(dateStr, sessionStart);
        const checkInMs = StaffWorkScheduleResolver.parseTimeToMs(dateStr, params.checkInTime);
        if (checkInMs > startMs + 5 * 60000) {
          lateMinutes = Math.max(1, Math.floor((checkInMs - startMs) / 60000));
          if (!params.status) status = 'late';
        }
      }

      const newRecord: StaffAttendanceRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'teaching',
        context_type: 'academic_session',
        context_id: session.id,
        context_name: `${session.subject_name} — ${session.classroom_name} (${session.lesson_period_name})`,
        scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
        scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
        check_in_at: params.checkInTime ? `${dateStr}T${params.checkInTime}:00+07:00` : (params.action !== 'check_out' ? timeNow : null),
        check_out_at: params.checkOutTime ? `${dateStr}T${params.checkOutTime}:00+07:00` : (params.action === 'both' ? timeNow : null),
        status: status,
        check_in_method: 'manual',
        check_out_method: params.checkOutTime || params.action === 'both' ? 'manual' : null,
        late_minutes: lateMinutes,
        early_leave_minutes: 0,
        recorded_by: params.operatorName,
        notes: `Entri Manual KBM: ${params.reason}`,
        created_at: timeNow,
        updated_at: timeNow,
      };

      records.unshift(newRecord);
      this.saveRecords(records);

      if (params.action === 'check_out' || params.action === 'both' || params.checkOutTime) {
        TeachingSessionService.completeSession(session.id);
      }

      AuditService.log({
        event: 'staff_teaching_manual',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: newRecord.id,
        auditable_name: `${staff.name} (Entri Manual Mengajar)`,
        new_values: newRecord,
        reason: `Presensi manual mengajar oleh ${params.operatorName}: ${params.reason}`,
        user: { id: 1, name: params.operatorName, role: 'Kurikulum/Admin' }
      });

      return { success: true, message: `Presensi mengajar ${staff.name} berhasil disimpan.`, record: newRecord };
    } else {
      // Update existing record
      const record = records[existingIndex];
      const oldValues = { ...record };

      if (params.checkInTime) {
        record.check_in_at = `${dateStr}T${params.checkInTime}:00+07:00`;
        record.check_in_method = 'manual';
      }
      if (params.checkOutTime || params.action === 'check_out' || params.action === 'both') {
        record.check_out_at = params.checkOutTime ? `${dateStr}T${params.checkOutTime}:00+07:00` : timeNow;
        record.check_out_method = 'manual';
        TeachingSessionService.completeSession(session.id);
      }
      if (params.status) {
        record.status = params.status;
      }
      record.notes = (record.notes ? `${record.notes} | ` : '') + `Update Manual: ${params.reason}`;
      record.updated_at = timeNow;

      records[existingIndex] = record;
      this.saveRecords(records);

      AuditService.log({
        event: 'staff_teaching_manual_update',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: record.id,
        auditable_name: `${staff.name} (Update Manual Mengajar)`,
        old_values: oldValues,
        new_values: record,
        reason: `Pembaruan manual presensi mengajar oleh ${params.operatorName}: ${params.reason}`,
        user: { id: 1, name: params.operatorName, role: 'Kurikulum/Admin' }
      });

      return { success: true, message: `Data presensi mengajar ${staff.name} berhasil diperbarui.`, record };
    }
  }

  // ==========================================
  // SIUBA v1.1.2: CONTROLLED TEACHING FINALIZATION (KBM ALPHA & SICK/SUB FILLING)
  // ==========================================
  public static finalizeTeachingAttendance(dateStr: string, operatorName: string = 'Kurikulum Scheduler'): {
    totalSessions: number;
    finalizedAbsent: number;
    substitutedCount: number;
    alreadyRecorded: number;
    cancelledCount: number;
    message: string;
  } {
    const sessions = TeachingSessionService.getTeachingSessions(dateStr);
    const records = this.getRecords();
    const absenceRequests = this.getAbsenceRequests().filter(a => a.status === 'approved');

    let finalizedAbsent = 0;
    let substitutedCount = 0;
    let alreadyRecorded = 0;
    let cancelledCount = 0;

    const now = new Date().toISOString();

    for (const session of sessions) {
      if (session.status === 'cancelled') {
        cancelledCount++;
        continue;
      }

      // Check if session has teacher attendance record
      const existing = records.find(
        r => r.attendance_type === 'teaching' && r.context_id === session.id
      );

      if (existing) {
        alreadyRecorded++;
        if (!existing.finalized_at) {
          existing.finalized_at = now;
          existing.finalized_by = operatorName;
        }
        continue;
      }

      // Session unrecorded: Determine responsible teacher
      const isSubstituted = session.status === 'substituted' || Boolean(session.actual_teacher_staff_id);
      const targetStaffId = isSubstituted && session.actual_teacher_staff_id 
        ? session.actual_teacher_staff_id 
        : session.scheduled_teacher_staff_id;

      const staff = StaffIdentityResolver.resolveById(targetStaffId);
      if (!staff) continue;

      if (isSubstituted) {
        substitutedCount++;
      }

      // Check if teacher has approved full-day absence (sick/permission/leave/official duty)
      const approvedAbsence = absenceRequests.find(
        a => a.staff_id === staff.id && 
             a.start_at.substring(0, 10) <= dateStr && 
             a.end_at.substring(0, 10) >= dateStr
      );

      const status: StaffAttendanceStatus = approvedAbsence
        ? (approvedAbsence.type === 'sick' ? 'sick' : approvedAbsence.type === 'leave' ? 'leave' : approvedAbsence.type === 'official_duty' ? 'official_duty' : 'permission')
        : 'absent';

      const sessionStart = session.scheduled_start_at ? session.scheduled_start_at.substring(11, 16) : '07:00';
      const sessionEnd = session.scheduled_end_at ? session.scheduled_end_at.substring(11, 16) : '07:40';

      records.push({
        id: Date.now() + Math.floor(Math.random() * 100000) + session.id,
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'teaching',
        context_type: 'academic_session',
        context_id: session.id,
        context_name: `${session.subject_name} — ${session.classroom_name} (${session.lesson_period_name})`,
        scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
        scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
        status: status,
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: operatorName,
        finalized_at: now,
        finalized_by: operatorName,
        notes: approvedAbsence 
          ? `Auto finalisasi pengajaran (${approvedAbsence.type}): ${approvedAbsence.reason}`
          : (isSubstituted ? `Guru Pengganti (${staff.name}) tidak hadir tanpa keterangan pada KBM` : 'Guru tidak hadir mengajar tanpa keterangan (Alpha KBM)'),
        created_at: now,
        updated_at: now,
      });

      if (status === 'absent') {
        finalizedAbsent++;
      }

      TeachingSessionService.completeSession(session.id);
    }

    this.saveRecords(records);

    AuditService.log({
      event: 'teaching_attendance_finalized',
      auditable_type: 'TeachingAttendanceFinalization',
      auditable_id: dateStr,
      auditable_name: `Finalisasi KBM Mengajar ${dateStr}`,
      reason: `Finalisasi presensi mengajar tanggal ${dateStr}: ${finalizedAbsent} Alpha KBM, ${alreadyRecorded} terlaksana, ${cancelledCount} dibatalkan dari ${sessions.length} sesi.`,
      user: { id: 1, name: operatorName, role: 'Kurikulum/Admin' }
    });

    return {
      totalSessions: sessions.length,
      finalizedAbsent,
      substitutedCount,
      alreadyRecorded,
      cancelledCount,
      message: `Finalisasi KBM ${dateStr} selesai. ${sessions.length} total sesi: ${alreadyRecorded} tercatat mengajar, ${finalizedAbsent} ditetapkan Alpha KBM, ${cancelledCount} dibatalkan.`
    };
  }

  // ==========================================
  // SIUBA v1.1.3: TRAINING ATTENDANCE SCAN (QR & RFID)
  // ==========================================
  public static recordTrainingAttendanceScan(params: {
    staffId: number;
    sessionId: number;
    method: 'qr' | 'rfid';
    operatorName?: string;
    timestamp?: string;
  }): StaffAttendanceScanResponse {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, code: 'STAFF_NOT_FOUND', message: 'Data staf pelatih/pembina tidak ditemukan' };
    }

    const session = TrainingSessionService.getTrainingSessionById(params.sessionId);
    if (!session) {
      return { success: false, code: 'SESSION_NOT_FOUND', message: 'Sesi latihan ekstrakurikuler tidak ditemukan' };
    }

    const records = this.getRecords();
    const timeNow = params.timestamp || new Date().toISOString();

    const resolution = TrainingAttendanceContextResolver.resolveContext(
      staff,
      params.sessionId,
      timeNow
    );

    if (!resolution.is_eligible && resolution.code !== 'ALREADY_RECORDED') {
      return {
        success: false,
        code: resolution.code,
        message: resolution.message,
        staff
      };
    }

    // Check if ready for check-out (already checked in)
    if (resolution.code === 'ALREADY_RECORDED') {
      return this.recordTrainingCheckOut({
        staffId: params.staffId,
        sessionId: params.sessionId,
        method: params.method,
        timestamp: timeNow,
        operatorName: params.operatorName
      });
    }

    // Check-in new training attendance
    const dateStr = session.session_date || timeNow.substring(0, 10);
    const sessionStart = session.scheduled_start_at || '16:00';
    const sessionEnd = session.scheduled_end_at || '17:30';

    const status: StaffAttendanceStatus = resolution.is_late ? 'late' : 'present';
    const lateMinutes = resolution.late_minutes || 0;

    const newRecord: StaffAttendanceRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      staff_type: staff.staff_type,
      attendance_date: dateStr,
      attendance_type: 'training',
      context_type: 'training_session',
      context_id: session.id,
      context_name: `${session.extracurricular_name} (${session.scheduled_start_at} - ${session.scheduled_end_at})`,
      scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
      scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
      check_in_at: timeNow,
      check_out_at: null,
      status: status,
      check_in_method: params.method,
      late_minutes: lateMinutes,
      early_leave_minutes: 0,
      recorded_by: params.operatorName || (params.method === 'rfid' ? 'RFID-TRAINER-GATE' : 'QR-TRAINER-SCAN'),
      notes: resolution.is_substitute 
        ? `Pelatih Pengganti untuk ${session.primary_staff_name || 'Pelatih Asli'}${lateMinutes > 0 ? ` (Terlambat ${lateMinutes}m)` : ''}`
        : (lateMinutes > 0 ? `Terlambat melatih ${lateMinutes} menit (Toleransi ${resolution.grace_period_minutes}m)` : 'Melatih tepat waktu'),
      created_at: timeNow,
      updated_at: timeNow,
    };

    records.unshift(newRecord);
    this.saveRecords(records);

    AuditService.log({
      event: 'trainer_training_scan',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: newRecord.id,
      auditable_name: `${staff.name} (Melatih ${session.extracurricular_name})`,
      new_values: { staff_id: staff.id, session_id: session.id, status, lateMinutes, method: params.method },
      reason: `Scan presensi melatih via ${params.method.toUpperCase()} pada ${session.extracurricular_name}`,
      user: { id: 1, name: params.operatorName || staff.name, role: 'Trainer' }
    });

    return {
      success: true,
      code: 'TRAINING_CHECKIN_SUCCESS',
      message: `Presensi melatih tercatat: ${staff.name} pada ${session.extracurricular_name} (${session.scheduled_start_at} - ${session.scheduled_end_at}) [${status === 'late' ? `Terlambat ${lateMinutes}m` : 'Tepat Waktu'}]`,
      staff,
      record: newRecord,
      mode: 'CHECK_IN'
    };
  }

  // ==========================================
  // SIUBA v1.1.3: TRAINING CHECK-OUT
  // ==========================================
  public static recordTrainingCheckOut(params: {
    staffId: number;
    sessionId: number;
    method?: AttendanceMethod;
    timestamp?: string;
    operatorName?: string;
  }): StaffAttendanceScanResponse {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, code: 'STAFF_NOT_FOUND', message: 'Data pelatih/pembina tidak ditemukan' };
    }

    const session = TrainingSessionService.getTrainingSessionById(params.sessionId);
    const records = this.getRecords();
    const existingIndex = records.findIndex(
      r => r.staff_id === staff.id && 
        r.attendance_type === 'training' && 
        r.context_id === params.sessionId
    );

    if (existingIndex < 0) {
      return {
        success: false,
        code: 'NOT_CHECKED_IN',
        message: `Pelatih ${staff.name} belum melakukan check-in pada sesi latihan ini.`,
        staff
      };
    }

    const existing = records[existingIndex];
    if (existing.check_out_at) {
      return {
        success: false,
        code: 'ALREADY_CHECKED_OUT',
        message: `Pelatih ${staff.name} sudah menyelesaikan check-out melatih pada pukul ${existing.check_out_at.substring(11, 16)}.`,
        staff,
        record: existing
      };
    }

    const timeNow = params.timestamp || new Date().toISOString();
    existing.check_out_at = timeNow;
    existing.check_out_method = params.method || 'manual';
    existing.updated_at = timeNow;

    records[existingIndex] = existing;
    this.saveRecords(records);

    AuditService.log({
      event: 'trainer_training_checkout',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: existing.id,
      auditable_name: `${staff.name} (Check-out Melatih)`,
      old_values: { check_out_at: null },
      new_values: { check_out_at: timeNow, method: params.method || 'manual' },
      reason: `Check-out melatih selesai: ${existing.context_name}`,
      user: { id: 1, name: params.operatorName || staff.name, role: 'Trainer' }
    });

    return {
      success: true,
      code: 'TRAINING_CHECKOUT_SUCCESS',
      message: `Check-out melatih berhasil: ${staff.name} telah selesai melatih pada pukul ${timeNow.substring(11, 16)}.`,
      staff,
      record: existing,
      mode: 'CHECK_OUT'
    };
  }

  // ==========================================
  // SIUBA v1.1.3: MANUAL TRAINING ATTENDANCE ENTRY / CORRECTION
  // ==========================================
  public static recordTrainingAttendanceManual(params: {
    staffId: number;
    sessionId: number;
    action: 'check_in' | 'check_out' | 'both';
    checkInTime?: string; // HH:mm
    checkOutTime?: string; // HH:mm
    status?: StaffAttendanceStatus;
    reason: string;
    operatorName: string;
  }): { success: boolean; message: string; record?: StaffAttendanceRecord } {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data staf pelatih tidak ditemukan' };
    }

    const session = TrainingSessionService.getTrainingSessionById(params.sessionId);
    if (!session) {
      return { success: false, message: 'Sesi latihan tidak ditemukan' };
    }

    if (session.status === 'cancelled') {
      return { success: false, message: 'Sesi latihan telah dibatalkan. Tidak dapat mencatat presensi.' };
    }

    const records = this.getRecords();
    const dateStr = session.session_date;
    const existingIndex = records.findIndex(
      r => r.staff_id === staff.id && 
        r.attendance_type === 'training' && 
        r.context_id === session.id
    );

    const timeNow = new Date().toISOString();
    const sessionStart = session.scheduled_start_at || '16:00';
    const sessionEnd = session.scheduled_end_at || '17:30';

    if (existingIndex < 0) {
      // New training record
      let status: StaffAttendanceStatus = params.status || 'present';
      let lateMinutes = 0;

      if (params.checkInTime) {
        const startMs = StaffWorkScheduleResolver.parseTimeToMs(dateStr, sessionStart);
        const checkInMs = StaffWorkScheduleResolver.parseTimeToMs(dateStr, params.checkInTime);
        if (checkInMs > startMs + 15 * 60000) {
          lateMinutes = Math.max(1, Math.floor((checkInMs - startMs) / 60000));
          if (!params.status) status = 'late';
        }
      }

      const newRecord: StaffAttendanceRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'training',
        context_type: 'training_session',
        context_id: session.id,
        context_name: `${session.extracurricular_name} (${session.scheduled_start_at} - ${session.scheduled_end_at})`,
        scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
        scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
        check_in_at: params.checkInTime ? `${dateStr}T${params.checkInTime}:00+07:00` : (params.action !== 'check_out' ? timeNow : null),
        check_out_at: params.checkOutTime ? `${dateStr}T${params.checkOutTime}:00+07:00` : (params.action === 'both' ? timeNow : null),
        status: status,
        check_in_method: 'manual',
        check_out_method: params.checkOutTime || params.action === 'both' ? 'manual' : null,
        late_minutes: lateMinutes,
        early_leave_minutes: 0,
        recorded_by: params.operatorName,
        notes: `Entri Manual Latihan: ${params.reason}`,
        created_at: timeNow,
        updated_at: timeNow,
      };

      records.unshift(newRecord);
      this.saveRecords(records);

      AuditService.log({
        event: 'trainer_training_checkin_manual',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: newRecord.id,
        auditable_name: `${staff.name} (Entri Manual Melatih)`,
        new_values: newRecord,
        reason: `Presensi manual melatih oleh ${params.operatorName}: ${params.reason}`,
        user: { id: 1, name: params.operatorName, role: 'Pembina/Admin' }
      });

      return { success: true, message: `Presensi melatih ${staff.name} berhasil disimpan.`, record: newRecord };
    } else {
      // Update existing record
      const record = records[existingIndex];
      const oldValues = { ...record };

      if (params.checkInTime) {
        record.check_in_at = `${dateStr}T${params.checkInTime}:00+07:00`;
        record.check_in_method = 'manual';
      }
      if (params.checkOutTime || params.action === 'check_out' || params.action === 'both') {
        record.check_out_at = params.checkOutTime ? `${dateStr}T${params.checkOutTime}:00+07:00` : timeNow;
        record.check_out_method = 'manual';
      }
      if (params.status) {
        record.status = params.status;
      }
      record.notes = (record.notes ? `${record.notes} | ` : '') + `Koreksi Manual: ${params.reason}`;
      record.updated_at = timeNow;

      records[existingIndex] = record;
      this.saveRecords(records);

      AuditService.log({
        event: 'trainer_attendance_corrected',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: record.id,
        auditable_name: `${staff.name} (Koreksi Presensi Melatih)`,
        old_values: oldValues,
        new_values: record,
        reason: `Koreksi manual presensi melatih oleh ${params.operatorName}: ${params.reason}`,
        user: { id: 1, name: params.operatorName, role: 'Pembina/Admin' }
      });

      return { success: true, message: `Data presensi melatih ${staff.name} berhasil diperbarui.`, record };
    }
  }

  // ==========================================
  // SIUBA v1.1.3: CONTROLLED TRAINING FINALIZATION (EKSKUL ALPHA & ABSENCE FILLING)
  // ==========================================
  public static finalizeTrainingAttendance(dateStr: string, operatorName: string = 'Pembina Ekskul'): {
    totalSessions: number;
    finalizedAbsent: number;
    substitutedCount: number;
    alreadyRecorded: number;
    cancelledCount: number;
    message: string;
  } {
    const sessions = TrainingSessionService.getTrainingSessions(dateStr);
    const records = this.getRecords();
    const absenceRequests = this.getAbsenceRequests().filter(a => a.status === 'approved');

    let finalizedAbsent = 0;
    let substitutedCount = 0;
    let alreadyRecorded = 0;
    let cancelledCount = 0;

    const now = new Date().toISOString();

    for (const session of sessions) {
      if (session.status === 'cancelled') {
        cancelledCount++;
        continue;
      }

      // Check if session has trainer attendance record
      const existing = records.find(
        r => r.attendance_type === 'training' && r.context_id === session.id
      );

      if (existing) {
        alreadyRecorded++;
        if (!existing.finalized_at) {
          existing.finalized_at = now;
          existing.finalized_by = operatorName;
        }
        continue;
      }

      // Session unrecorded: Determine responsible trainer
      const isSubstituted = session.status === 'substituted' || Boolean(session.actual_primary_staff_id && session.actual_primary_staff_id !== session.primary_staff_id);
      const targetStaffId = session.actual_primary_staff_id || session.primary_staff_id || 4;

      const staff = StaffIdentityResolver.resolveById(targetStaffId);
      if (!staff) continue;

      if (isSubstituted) {
        substitutedCount++;
      }

      // Check if trainer has approved full-day absence
      const approvedAbsence = absenceRequests.find(
        a => a.staff_id === staff.id && 
             a.start_at.substring(0, 10) <= dateStr && 
             a.end_at.substring(0, 10) >= dateStr
      );

      const status: StaffAttendanceStatus = approvedAbsence
        ? (approvedAbsence.type === 'sick' ? 'sick' : approvedAbsence.type === 'leave' ? 'leave' : approvedAbsence.type === 'official_duty' ? 'official_duty' : 'permission')
        : 'absent';

      const sessionStart = session.scheduled_start_at || '16:00';
      const sessionEnd = session.scheduled_end_at || '17:30';

      records.push({
        id: Date.now() + Math.floor(Math.random() * 100000) + session.id,
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'training',
        context_type: 'training_session',
        context_id: session.id,
        context_name: `${session.extracurricular_name} (${session.scheduled_start_at} - ${session.scheduled_end_at})`,
        scheduled_start_at: `${dateStr}T${sessionStart}:00+07:00`,
        scheduled_end_at: `${dateStr}T${sessionEnd}:00+07:00`,
        status: status,
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: operatorName,
        finalized_at: now,
        finalized_by: operatorName,
        notes: approvedAbsence 
          ? `Auto finalisasi latihan (${approvedAbsence.type}): ${approvedAbsence.reason}`
          : (isSubstituted ? `Pelatih Pengganti (${staff.name}) tidak hadir tanpa keterangan pada sesi latihan` : 'Pelatih tidak hadir tanpa keterangan (Alpha Latihan)'),
        created_at: now,
        updated_at: now,
      });

      if (status === 'absent') {
        finalizedAbsent++;
      }
    }

    this.saveRecords(records);

    AuditService.log({
      event: 'training_session_finalized',
      auditable_type: 'TrainingAttendanceFinalization',
      auditable_id: dateStr,
      auditable_name: `Finalisasi Latihan Ekstrakurikuler ${dateStr}`,
      reason: `Finalisasi presensi pelatih tanggal ${dateStr}: ${finalizedAbsent} Alpha Latihan, ${alreadyRecorded} hadir/tercatat, ${cancelledCount} dibatalkan dari ${sessions.length} sesi.`,
      user: { id: 1, name: operatorName, role: 'Pembina/Admin' }
    });

    return {
      totalSessions: sessions.length,
      finalizedAbsent,
      substitutedCount,
      alreadyRecorded,
      cancelledCount,
      message: `Finalisasi presensi pelatih ${dateStr} selesai. ${sessions.length} total sesi: ${alreadyRecorded} tercatat melatih, ${finalizedAbsent} ditetapkan Alpha, ${cancelledCount} dibatalkan.`
    };
  }

  // Legacy fallback for generic AttendanceSession
  public static recordTrainingAttendance(params: {
    staffId: number;
    session: AttendanceSession;
    method: AttendanceMethod;
    operatorName?: string;
    timestamp?: string;
  }): StaffAttendanceScanResponse {
    return this.recordTrainingAttendanceScan({
      staffId: params.staffId,
      sessionId: params.session.id,
      method: params.method === 'rfid' ? 'rfid' : 'qr',
      operatorName: params.operatorName,
      timestamp: params.timestamp
    });
  }

  private static HISTORIES_KEY = 'siuba_staff_attendance_histories';

  public static getHistories(recordId?: number): StaffAttendanceRecordHistory[] {
    try {
      const stored = localStorage.getItem(this.HISTORIES_KEY);
      if (stored) {
        const list: StaffAttendanceRecordHistory[] = JSON.parse(stored);
        if (recordId) {
          return list.filter(h => h.staff_attendance_record_id === recordId);
        }
        return list;
      }
    } catch (e) {
      console.warn('Failed to parse attendance histories', e);
    }
    return [];
  }

  public static saveHistories(histories: StaffAttendanceRecordHistory[]): void {
    try {
      localStorage.setItem(this.HISTORIES_KEY, JSON.stringify(histories));
    } catch (e) {
      console.error('Failed to save attendance histories', e);
    }
  }

  // ==========================================
  // MANUAL ATTENDANCE (CHECK-IN / CHECK-OUT BY OPERATOR)
  // ==========================================
  public static recordManualAttendance(params: {
    staffId: number;
    attendanceDate: string;
    action: 'check_in' | 'check_out' | 'both';
    checkInTime?: string;
    checkOutTime?: string;
    status?: StaffAttendanceStatus;
    reason: string;
    operatorName: string;
  }): { success: boolean; message: string; record?: StaffAttendanceRecord } {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data staff tidak ditemukan' };
    }

    const records = this.getRecords();
    const dateStr = params.attendanceDate;
    const existingIndex = records.findIndex(
      r => r.staff_id === staff.id && r.attendance_date === dateStr && r.attendance_type === 'daily'
    );

    const scheduleDetail = StaffWorkScheduleResolver.resolveScheduleDetail(staff, dateStr);
    const schedule = scheduleDetail.schedule;
    const timeNow = new Date().toISOString();

    if (existingIndex === -1) {
      // Create new record
      let status: StaffAttendanceStatus = params.status || 'present';
      let lateMinutes = 0;

      if (params.checkInTime && schedule && !params.status) {
        const fullCheckInStr = `${dateStr}T${params.checkInTime}:00+07:00`;
        const res = StaffWorkScheduleResolver.calculateCheckInStatus(schedule, fullCheckInStr, dateStr);
        status = res.status;
        lateMinutes = res.late_minutes;
      }

      let earlyLeaveMinutes = 0;
      if (params.checkOutTime && schedule) {
        const fullCheckOutStr = `${dateStr}T${params.checkOutTime}:00+07:00`;
        earlyLeaveMinutes = StaffWorkScheduleResolver.calculateEarlyLeaveMinutes(schedule, fullCheckOutStr, dateStr);
      }

      const newRecord: StaffAttendanceRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'daily',
        scheduled_start_at: schedule ? `${dateStr}T${schedule.scheduled_start_at}:00+07:00` : null,
        scheduled_end_at: schedule ? `${dateStr}T${schedule.scheduled_end_at}:00+07:00` : null,
        check_in_at: params.checkInTime ? `${dateStr}T${params.checkInTime}:00+07:00` : (params.action !== 'check_out' ? timeNow : null),
        check_out_at: params.checkOutTime ? `${dateStr}T${params.checkOutTime}:00+07:00` : (params.action === 'both' ? timeNow : null),
        status: status,
        check_in_method: 'manual',
        check_out_method: params.checkOutTime || params.action === 'both' ? 'manual' : null,
        late_minutes: lateMinutes,
        early_leave_minutes: earlyLeaveMinutes,
        recorded_by: params.operatorName,
        notes: `Entri Manual: ${params.reason}`,
        created_at: timeNow,
        updated_at: timeNow,
      };

      records.unshift(newRecord);
      this.saveRecords(records);

      AuditService.log({
        event: 'staff_manual_checkin',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: newRecord.id,
        auditable_name: `${staff.name} (Entri Manual Harian)`,
        new_values: newRecord,
        reason: `Presensi manual oleh ${params.operatorName}: ${params.reason}`,
        user: { id: 1, name: params.operatorName, role: 'Admin' }
      });

      return { success: true, message: `Presensi manual untuk ${staff.name} berhasil disimpan`, record: newRecord };
    } else {
      // Update existing record
      const record = records[existingIndex];
      const oldValues = { ...record };

      if (params.checkInTime) {
        record.check_in_at = `${dateStr}T${params.checkInTime}:00+07:00`;
        record.check_in_method = 'manual';
      }
      if (params.checkOutTime || params.action === 'check_out' || params.action === 'both') {
        record.check_out_at = params.checkOutTime ? `${dateStr}T${params.checkOutTime}:00+07:00` : timeNow;
        record.check_out_method = 'manual';
        if (schedule) {
          record.early_leave_minutes = StaffWorkScheduleResolver.calculateEarlyLeaveMinutes(schedule, record.check_out_at, dateStr);
        }
      }
      if (params.status) {
        record.status = params.status;
      }
      record.notes = (record.notes ? `${record.notes} | ` : '') + `Update Manual: ${params.reason}`;
      record.updated_at = timeNow;

      records[existingIndex] = record;
      this.saveRecords(records);

      AuditService.log({
        event: 'staff_manual_checkout',
        auditable_type: 'StaffAttendanceRecord',
        auditable_id: record.id,
        auditable_name: `${staff.name} (Update Manual Harian)`,
        old_values: oldValues,
        new_values: record,
        reason: `Pembaruan manual presensi oleh ${params.operatorName}: ${params.reason}`,
        user: { id: 1, name: params.operatorName, role: 'Admin' }
      });

      return { success: true, message: `Data presensi ${staff.name} berhasil diperbarui`, record };
    }
  }

  // ==========================================
  // MANUAL OVERRIDE / CORRECTION
  // ==========================================
  public static correctRecord(params: {
    recordId: number;
    newStatus: StaffAttendanceStatus;
    newCheckIn?: string;
    newCheckOut?: string;
    reason: string;
    operatorName: string;
  }): { success: boolean; message: string; record?: StaffAttendanceRecord } {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === params.recordId);
    if (index === -1) {
      return { success: false, message: 'Record presensi tidak ditemukan' };
    }

    const oldRecord = { ...records[index] };
    const record = records[index];

    record.status = params.newStatus;
    if (params.newCheckIn !== undefined) record.check_in_at = params.newCheckIn;
    if (params.newCheckOut !== undefined) record.check_out_at = params.newCheckOut;
    record.notes = (record.notes ? `${record.notes} | ` : '') + `Koreksi: ${params.reason} (oleh ${params.operatorName})`;
    record.updated_at = new Date().toISOString();

    records[index] = record;
    this.saveRecords(records);

    // Save history entry
    const histories = this.getHistories();
    const historyEntry: StaffAttendanceRecordHistory = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_attendance_record_id: record.id,
      old_values: oldRecord,
      new_values: {
        status: record.status,
        check_in_at: record.check_in_at,
        check_out_at: record.check_out_at,
        notes: record.notes
      },
      reason: params.reason,
      changed_by: params.operatorName,
      changed_at: new Date().toISOString(),
    };
    histories.unshift(historyEntry);
    this.saveHistories(histories);

    AuditService.log({
      event: 'staff_attendance_corrected',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: record.id,
      auditable_name: `${record.staff_name} (${record.attendance_type})`,
      old_values: oldRecord,
      new_values: record,
      reason: `Koreksi presensi SDM: ${params.reason}`,
      user: { id: 1, name: params.operatorName, role: 'Admin' }
    });

    return { success: true, message: 'Koreksi presensi berhasil disimpan', record };
  }

  // ==========================================
  // ABSENCE REQUESTS (IZIN, SAKIT, CUTI, DINAS)
  // ==========================================
  public static createAbsenceRequest(params: {
    staffId: number;
    type: 'permission' | 'sick' | 'leave' | 'official_duty';
    startAt: string;
    endAt: string;
    reason: string;
    attachment?: string;
    operatorName: string;
    autoApprove?: boolean;
  }): { success: boolean; message: string; request?: StaffAbsenceRequest } {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data staff tidak ditemukan' };
    }

    const requests = this.getAbsenceRequests();
    const timeNow = new Date().toISOString();
    const isAutoApproved = params.autoApprove !== false;

    const newReq: StaffAbsenceRequest = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      type: params.type,
      start_at: params.startAt,
      end_at: params.endAt,
      reason: params.reason,
      attachment: params.attachment || null,
      status: isAutoApproved ? 'approved' : 'pending',
      requested_at: timeNow,
      approved_by: isAutoApproved ? params.operatorName : null,
      approved_at: isAutoApproved ? timeNow : null,
      decision_notes: isAutoApproved ? 'Disetujui oleh pengurus/TU' : null,
      created_at: timeNow,
      updated_at: timeNow,
    };

    requests.unshift(newReq);
    this.saveAbsenceRequests(requests);

    if (isAutoApproved) {
      this.syncAbsenceToAttendance(newReq, params.operatorName);
    }

    AuditService.log({
      event: 'staff_absence_created',
      auditable_type: 'StaffAbsenceRequest',
      auditable_id: newReq.id,
      auditable_name: `${staff.name} (${params.type})`,
      new_values: newReq,
      reason: `Pengajuan ${params.type} untuk ${staff.name}`,
      user: { id: 1, name: params.operatorName, role: 'Admin' }
    });

    return { success: true, message: `Izin/Cuti untuk ${staff.name} berhasil dicatat`, request: newReq };
  }

  public static approveAbsenceRequest(
    requestId: number, 
    operatorName: string = 'Kepala Bagian TU',
    notes: string = 'Disetujui'
  ): { success: boolean; message: string } {
    const requests = this.getAbsenceRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) {
      return { success: false, message: 'Permohonan tidak ditemukan' };
    }

    const req = requests[index];
    const oldValues = { ...req };
    req.status = 'approved';
    req.approved_by = operatorName;
    req.approved_at = new Date().toISOString();
    req.decision_notes = notes;
    req.updated_at = new Date().toISOString();

    requests[index] = req;
    this.saveAbsenceRequests(requests);

    // Sync to daily attendance
    this.syncAbsenceToAttendance(req, operatorName);

    AuditService.log({
      event: 'staff_absence_approved',
      auditable_type: 'StaffAbsenceRequest',
      auditable_id: req.id,
      auditable_name: `${req.staff_name} (${req.type})`,
      old_values: oldValues,
      new_values: req,
      reason: `Persetujuan izin/cuti ${req.type} untuk ${req.staff_name}: ${notes}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, message: `Permohonan izin ${req.staff_name} berhasil disetujui` };
  }

  public static rejectAbsenceRequest(
    requestId: number, 
    operatorName: string = 'Kepala Bagian TU',
    notes: string = 'Ditolak'
  ): { success: boolean; message: string } {
    const requests = this.getAbsenceRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) {
      return { success: false, message: 'Permohonan tidak ditemukan' };
    }

    const req = requests[index];
    const oldValues = { ...req };
    req.status = 'rejected';
    req.rejected_by = operatorName;
    req.rejected_at = new Date().toISOString();
    req.decision_notes = notes;
    req.updated_at = new Date().toISOString();

    requests[index] = req;
    this.saveAbsenceRequests(requests);

    AuditService.log({
      event: 'staff_absence_rejected',
      auditable_type: 'StaffAbsenceRequest',
      auditable_id: req.id,
      auditable_name: `${req.staff_name} (${req.type})`,
      old_values: oldValues,
      new_values: req,
      reason: `Penolakan izin/cuti ${req.type} untuk ${req.staff_name}: ${notes}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, message: `Permohonan izin ${req.staff_name} ditolak` };
  }

  private static syncAbsenceToAttendance(req: StaffAbsenceRequest, operatorName: string): void {
    const dateStr = req.start_at.substring(0, 10);
    const records = this.getRecords();
    const existingIndex = records.findIndex(
      r => r.staff_id === req.staff_id && r.attendance_date === dateStr && r.attendance_type === 'daily'
    );

    const statusMap: Record<string, StaffAttendanceStatus> = {
      permission: 'permission',
      sick: 'sick',
      leave: 'leave',
      official_duty: 'official_duty'
    };
    const targetStatus = statusMap[req.type] || 'permission';
    const now = new Date().toISOString();

    if (existingIndex === -1) {
      const staff = StaffIdentityResolver.resolveById(req.staff_id);
      records.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000) + 1,
        staff_id: req.staff_id,
        staff_name: req.staff_name || staff?.name || 'Staff',
        staff_number: req.staff_number || staff?.staff_number || 'STF000',
        staff_type: staff?.staff_type || 'other',
        attendance_date: dateStr,
        attendance_type: 'daily',
        status: targetStatus,
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: operatorName,
        notes: `Pengajuan ${req.type.toUpperCase()}: ${req.reason}`,
        created_at: now,
        updated_at: now,
      });
      this.saveRecords(records);
    } else {
      records[existingIndex].status = targetStatus;
      records[existingIndex].notes = `Pengajuan ${req.type.toUpperCase()}: ${req.reason}`;
      records[existingIndex].updated_at = now;
      this.saveRecords(records);
    }
  }

  // ==========================================
  // DAILY FINALIZATION (IDEMPOTENT ALPHA/ABSENCE FILLING)
  // ==========================================
  public static finalizeDailyAttendance(dateStr: string, operatorName: string = 'System Scheduler'): {
    totalExpected: number;
    finalizedAbsent: number;
    finalizedAbsenceLeaves: number;
    alreadyRecorded: number;
    message: string;
  } {
    const allStaff = StaffIdentityResolver.getStaffList();
    const records = this.getRecords();
    const absenceRequests = this.getAbsenceRequests().filter(a => a.status === 'approved');
    
    let finalizedAbsent = 0;
    let finalizedAbsenceLeaves = 0;
    let alreadyRecorded = 0;
    let totalExpected = 0;

    const now = new Date().toISOString();

    for (const staff of allStaff) {
      // Eligibility check on date
      if (!StaffIdentityResolver.isStaffEligibleOnDate(staff, dateStr)) {
        continue;
      }

      // Schedule and holiday check
      const scheduleDetail = StaffWorkScheduleResolver.resolveScheduleDetail(staff, dateStr);
      if (!scheduleDetail.is_working_day) {
        continue;
      }

      totalExpected++;

      // Check existing record
      const existing = records.find(
        r => r.staff_id === staff.id && r.attendance_date === dateStr && r.attendance_type === 'daily'
      );

      if (existing) {
        alreadyRecorded++;
        if (!existing.finalized_at) {
          existing.finalized_at = now;
          existing.finalized_by = operatorName;
        }
        continue;
      }

      // Check approved absence request
      const absence = absenceRequests.find(
        a => a.staff_id === staff.id && 
             a.start_at.substring(0, 10) <= dateStr && 
             a.end_at.substring(0, 10) >= dateStr
      );

      const status: StaffAttendanceStatus = absence 
        ? (absence.type === 'sick' ? 'sick' : absence.type === 'leave' ? 'leave' : absence.type === 'official_duty' ? 'official_duty' : 'permission')
        : 'absent';

      records.push({
        id: Date.now() + Math.floor(Math.random() * 100000) + staff.id,
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        attendance_date: dateStr,
        attendance_type: 'daily',
        status: status,
        late_minutes: 0,
        early_leave_minutes: 0,
        recorded_by: operatorName,
        finalized_at: now,
        finalized_by: operatorName,
        notes: absence ? `Auto finalisasi izin: ${absence.reason}` : 'Tidak hadir tanpa keterangan (Alpha)',
        created_at: now,
        updated_at: now,
      });

      if (status === 'absent') {
        finalizedAbsent++;
      } else {
        finalizedAbsenceLeaves++;
      }
    }

    this.saveRecords(records);

    AuditService.log({
      event: 'staff_attendance_finalized',
      auditable_type: 'StaffAttendanceFinalization',
      auditable_id: dateStr,
      auditable_name: `Finalisasi Presensi SDM ${dateStr}`,
      reason: `Finalisasi presensi harian SDM tanggal ${dateStr}: ${finalizedAbsent} Alpha, ${finalizedAbsenceLeaves} Izin/Cuti dari ${totalExpected} SDM terjadwal`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return {
      totalExpected,
      finalizedAbsent,
      finalizedAbsenceLeaves,
      alreadyRecorded,
      message: `Finalisasi sukses. ${totalExpected} SDM terjadwal: ${alreadyRecorded} telah presensi, ${finalizedAbsenceLeaves} izin/cuti, ${finalizedAbsent} ditetapkan Alpha.`
    };
  }
}
