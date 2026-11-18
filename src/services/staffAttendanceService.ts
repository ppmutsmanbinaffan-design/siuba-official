import { 
  Staff, 
  StaffAttendanceRecord, 
  StaffAttendanceStatus, 
  AttendanceMethod, 
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
import { todayLocalDate } from '../utils/today';

export class StaffAttendanceService {
  private static RECORDS_KEY = 'siuba_staff_attendance_records';
  private static ABSENCE_KEY = 'siuba_staff_absence_requests';
  private static ASSIGNMENTS_KEY = 'siuba_extracurricular_staff_assignments';

  public static getInitialRecords(): StaffAttendanceRecord[] {
    const today = todayLocalDate();
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
    const today = todayLocalDate();
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

}
