import { 
  Staff, 
  StaffAttendanceRecord, 
  StaffAttendanceStatus, 
  StaffAbsenceRequest, 
  StaffAbsenceType, 
  TeachingSession, 
  TrainingSession, 
  AcademicSubstitution, 
  TrainerSubstitution, 
  AttendanceDevice, 
  AttendanceDeviceLog,
  AttendanceMethod
} from '../../../types';
import { 
  StaffDailySummary, 
  TeachingAttendanceSummary, 
  TrainingAttendanceSummary, 
  StaffScanFeedbackItem 
} from '../types';
import { StaffAttendanceService } from '../../../services/staffAttendanceService';
import { TeachingSessionService } from '../../../services/teachingSessionService';
import { TrainingSessionService } from '../../../services/trainingSessionService';
import { TeacherSubstitutionService } from '../../../services/teacherSubstitutionService';
import { TrainerSubstitutionService } from '../../../services/trainerSubstitutionService';
import { TrainingRealizationService } from '../../../services/trainingRealizationService';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';
import { AuditService } from '../../../services/auditService';
import { INITIAL_DEVICES, INITIAL_DEVICE_LOGS } from '../../../data/initialData';

export class StaffAttendanceApi {
  // ==========================================
  // 1. KEHADIRAN HARIAN SDM
  // ==========================================
  public static async getDailyRecords(dateStr?: string): Promise<{ data: StaffAttendanceRecord[]; error?: string }> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_type === 'daily' && r.attendance_date === today
    );
    return { data: records };
  }

  public static async getDailySummary(dateStr?: string): Promise<{ data: StaffDailySummary; error?: string }> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const staffList = StaffIdentityResolver.getStaffList().filter(s => s.is_active);
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_type === 'daily' && r.attendance_date === today
    );
    const absences = StaffAttendanceService.getAbsenceRequests().filter(
      a => a.status === 'approved' && a.start_at.substring(0, 10) <= today && a.end_at.substring(0, 10) >= today
    );

    const totalExpected = staffList.length;
    let presentCount = 0;
    let lateCount = 0;
    let checkedOutCount = 0;
    let earlyLeaveCount = 0;

    records.forEach(r => {
      if (r.status === 'present') presentCount++;
      if (r.status === 'late') lateCount++;
      if (r.check_out_at) checkedOutCount++;
      if (r.early_leave_minutes && r.early_leave_minutes > 0) earlyLeaveCount++;
    });

    const permissionCount = absences.filter(a => a.type === 'permission').length;
    const sickCount = absences.filter(a => a.type === 'sick').length;
    const leaveCount = absences.filter(a => a.type === 'leave').length;
    const officialDutyCount = absences.filter(a => a.type === 'official_duty').length;

    const checkedInCount = records.length;
    const notCheckedInCount = Math.max(0, totalExpected - checkedInCount - (permissionCount + sickCount + leaveCount + officialDutyCount));
    const notCheckedOutCount = Math.max(0, checkedInCount - checkedOutCount);
    const alphaCount = 0; // Determined at day close

    return {
      data: {
        date: today,
        total_expected: totalExpected,
        total_present: presentCount,
        total_late: lateCount,
        total_permission: permissionCount,
        total_sick: sickCount,
        total_leave: leaveCount,
        total_official_duty: officialDutyCount,
        total_alpha: alphaCount,
        total_checked_in: checkedInCount,
        total_not_checked_in: notCheckedInCount,
        total_checked_out: checkedOutCount,
        total_not_checked_out: notCheckedOutCount,
        total_early_leave: earlyLeaveCount,
      }
    };
  }

  public static async recordDailyScan(params: {
    identifier: string; // QR token or RFID UID
    method: AttendanceMethod;
    operatorName?: string;
  }): Promise<StaffScanFeedbackItem> {
    const res = StaffAttendanceService.recordDailyScan({
      identifier: params.identifier,
      method: params.method,
      operatorName: params.operatorName,
    });

    return {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      resultCode: res.code,
      success: res.success,
      message: res.message,
      staff: res.staff,
      staffName: res.staff?.name,
      staffNumber: res.staff?.staff_number,
      staffType: res.staff?.staff_type,
      attendanceType: 'daily',
      status: res.record?.status,
      method: params.method,
      mode: res.mode,
      checkInAt: res.record?.check_in_at || undefined,
      checkOutAt: res.record?.check_out_at || undefined,
      lateMinutes: res.record?.late_minutes || 0,
      earlyLeaveMinutes: res.record?.early_leave_minutes || 0,
      contextName: 'Presensi Harian Kantor / Gerbang',
    };
  }

  public static async recordDailyManual(params: {
    staffId: number;
    action: 'check_in' | 'check_out';
    notes?: string;
    operatorName: string;
  }): Promise<{ success: boolean; message: string; record?: StaffAttendanceRecord }> {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data staf tidak ditemukan.' };
    }

    const res = StaffAttendanceService.recordDailyScan({
      identifier: String(staff.id),
      method: 'manual',
      operatorName: params.operatorName,
    });

    return {
      success: res.success,
      message: res.message,
      record: res.record,
    };
  }

  public static async correctDailyAttendance(params: {
    recordId: number;
    status: StaffAttendanceStatus;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    notes: string;
    operatorName: string;
  }): Promise<{ success: boolean; message: string }> {
    const records = StaffAttendanceService.getRecords();
    const index = records.findIndex(r => r.id === params.recordId);
    if (index === -1) {
      return { success: false, message: 'Catatan presensi harian tidak ditemukan.' };
    }

    const oldRecord = { ...records[index] };
    records[index].status = params.status;
    if (params.lateMinutes !== undefined) records[index].late_minutes = params.lateMinutes;
    if (params.earlyLeaveMinutes !== undefined) records[index].early_leave_minutes = params.earlyLeaveMinutes;
    records[index].notes = params.notes;
    records[index].updated_at = new Date().toISOString();

    StaffAttendanceService.saveRecords(records);

    AuditService.log({
      event: 'staff_attendance_corrected',
      auditable_type: 'StaffAttendanceRecord',
      auditable_id: params.recordId,
      auditable_name: `${records[index].staff_name} (Koreksi Presensi)`,
      old_values: oldRecord,
      new_values: records[index],
      reason: `Koreksi presensi manual oleh ${params.operatorName}: ${params.notes}`,
      user: { id: 1, name: params.operatorName, role: 'Admin' }
    });

    return { success: true, message: 'Koreksi presensi harian berhasil disimpan.' };
  }

  // ==========================================
  // 2. IZIN / SAKIT / CUTI / DINAS (ABSENCE)
  // ==========================================
  public static async getAbsenceRequests(): Promise<{ data: StaffAbsenceRequest[]; error?: string }> {
    const requests = StaffAttendanceService.getAbsenceRequests();
    return { data: requests };
  }

  public static async createAbsenceRequest(params: {
    staffId: number;
    type: StaffAbsenceType;
    startAt: string;
    endAt: string;
    reason: string;
    operatorName: string;
  }): Promise<{ success: boolean; message: string; request?: StaffAbsenceRequest }> {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data staf tidak ditemukan.' };
    }

    const requests = StaffAttendanceService.getAbsenceRequests();
    const now = new Date().toISOString();
    const newReq: StaffAbsenceRequest = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      type: params.type,
      start_at: params.startAt,
      end_at: params.endAt,
      reason: params.reason,
      status: 'pending',
      requested_at: now,
      created_at: now,
      updated_at: now,
    };

    requests.unshift(newReq);
    StaffAttendanceService.saveAbsenceRequests(requests);

    AuditService.log({
      event: 'staff_absence_created',
      auditable_type: 'StaffAbsenceRequest',
      auditable_id: newReq.id,
      auditable_name: `${staff.name} (${params.type.toUpperCase()})`,
      new_values: newReq,
      reason: `Pengajuan ${params.type}: ${params.reason}`,
      user: { id: 1, name: params.operatorName, role: 'Staff' }
    });

    return { success: true, message: `Pengajuan ${params.type} untuk ${staff.name} berhasil diajukan.`, request: newReq };
  }

  public static async approveAbsenceRequest(params: {
    id: number;
    approverName: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    const requests = StaffAttendanceService.getAbsenceRequests();
    const index = requests.findIndex(r => r.id === params.id);
    if (index === -1) {
      return { success: false, message: 'Data pengajuan tidak ditemukan.' };
    }

    const req = requests[index];
    req.status = 'approved';
    req.approved_by = params.approverName;
    req.approved_at = new Date().toISOString();
    req.updated_at = new Date().toISOString();

    StaffAttendanceService.saveAbsenceRequests(requests);

    AuditService.log({
      event: 'staff_absence_approved',
      auditable_type: 'StaffAbsenceRequest',
      auditable_id: req.id,
      auditable_name: `${req.staff_name} (${req.type.toUpperCase()})`,
      new_values: req,
      reason: `Persetujuan ${req.type} oleh ${params.approverName}`,
      user: { id: 1, name: params.approverName, role: 'Kepala Bagian' }
    });

    return { success: true, message: `Pengajuan ${req.type} untuk ${req.staff_name} berhasil disetujui.` };
  }

  public static async rejectAbsenceRequest(params: {
    id: number;
    approverName: string;
    rejectionReason: string;
  }): Promise<{ success: boolean; message: string }> {
    const requests = StaffAttendanceService.getAbsenceRequests();
    const index = requests.findIndex(r => r.id === params.id);
    if (index === -1) {
      return { success: false, message: 'Data pengajuan tidak ditemukan.' };
    }

    const req = requests[index];
    req.status = 'rejected';
    req.approved_by = params.approverName;
    req.reason = `${req.reason} [Ditolak: ${params.rejectionReason}]`;
    req.updated_at = new Date().toISOString();

    StaffAttendanceService.saveAbsenceRequests(requests);

    AuditService.log({
      event: 'staff_absence_rejected',
      auditable_type: 'StaffAbsenceRequest',
      auditable_id: req.id,
      auditable_name: `${req.staff_name} (${req.type.toUpperCase()})`,
      new_values: req,
      reason: `Penolakan ${req.type}: ${params.rejectionReason}`,
      user: { id: 1, name: params.approverName, role: 'Kepala Bagian' }
    });

    return { success: true, message: `Pengajuan ${req.type} untuk ${req.staff_name} telah ditolak.` };
  }

  // ==========================================
  // 3. KEHADIRAN MENGAJAR GURU (KBM)
  // ==========================================
  public static async getTeachingSessions(dateStr?: string): Promise<{ data: TeachingSession[]; error?: string }> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const sessions = TeachingSessionService.getTeachingSessions(today);
    return { data: sessions };
  }

  public static async getTeachingSessionById(id: number): Promise<{ data?: TeachingSession; error?: string }> {
    const session = TeachingSessionService.getTeachingSessionById(id);
    if (!session) return { error: 'Sesi mengajar tidak ditemukan.' };
    return { data: session };
  }

  public static async getTeachingSessionDetail(id: number): Promise<{ data?: TeachingSession; error?: string }> {
    return this.getTeachingSessionById(id);
  }

  public static async getTeachingSummary(dateStr?: string): Promise<{ data: TeachingAttendanceSummary; error?: string }> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const sessions = TeachingSessionService.getTeachingSessions(today);
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_type === 'teaching' && r.attendance_date === today
    );

    let present = 0;
    let late = 0;
    let substituted = 0;
    let cancelled = 0;
    let unrecorded = 0;
    let needsReview = 0;

    sessions.forEach(s => {
      const rec = records.find(r => r.context_id === s.id);
      if (s.status === 'cancelled') cancelled++;
      else if (s.status === 'substituted' || s.substitution_id) substituted++;
      else if (rec?.status === 'present') present++;
      else if (rec?.status === 'late') late++;
      else unrecorded++;
    });

    return {
      data: {
        date: today,
        total_sessions: sessions.length,
        total_present: present,
        total_late: late,
        total_substituted: substituted,
        total_cancelled: cancelled,
        total_unrecorded: unrecorded,
        total_needs_review: needsReview,
      }
    };
  }

  public static async recordTeachingAttendanceManual(params: {
    sessionId: number;
    staffId: number;
    substituteStaffId?: number | null;
    notes?: string;
    operatorName: string;
  }): Promise<{ success: boolean; message: string; session?: TeachingSession; record?: StaffAttendanceRecord }> {
    const session = TeachingSessionService.getTeachingSessionById(params.sessionId);
    if (!session) {
      return { success: false, message: 'Sesi mengajar tidak ditemukan.' };
    }

    if (session.status === 'cancelled') {
      return { success: false, message: 'Sesi mengajar ini telah dibatalkan.' };
    }

    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data guru tidak ditemukan.' };
    }

    const isAssigned = session.scheduled_teacher_staff_id === params.staffId || 
      session.actual_teacher_staff_id === params.staffId || 
      (params.substituteStaffId && params.substituteStaffId === params.staffId);
    if (!isAssigned) {
      return {
        success: false,
        message: 'Guru tidak ditugaskan pada sesi mengajar ini (Gunakan fitur Guru Pengganti resmi jika menggantikan).'
      };
    }

    const now = new Date().toISOString();
    const startTime = session.scheduled_start_at.includes('T') ? session.scheduled_start_at.substring(11, 16) : session.scheduled_start_at;
    const endTime = session.scheduled_end_at.includes('T') ? session.scheduled_end_at.substring(11, 16) : session.scheduled_end_at;
    const scheduledStart = session.scheduled_start_at.includes('T') ? session.scheduled_start_at : `${session.session_date}T${startTime}:00+07:00`;
    const scheduledEnd = session.scheduled_end_at.includes('T') ? session.scheduled_end_at : `${session.session_date}T${endTime}:00+07:00`;
    
    // Server calculates late minutes
    let lateMinutes = 0;
    const nowTimeStr = now.substring(11, 16);
    if (nowTimeStr > startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [nh, nm] = nowTimeStr.split(':').map(Number);
      lateMinutes = Math.max(0, (nh * 60 + nm) - (sh * 60 + sm));
    }

    const status: StaffAttendanceStatus = lateMinutes > 5 ? 'late' : 'present';

    // Update Teaching Session
    session.actual_teacher_staff_id = params.staffId;
    session.actual_teacher_name = staff.name;
    session.status = 'open';
    session.updated_at = now;

    // Save
    const sessions = TeachingSessionService.getTeachingSessions();
    const sIndex = sessions.findIndex(s => s.id === session.id);
    if (sIndex >= 0) {
      sessions[sIndex] = session;
      TeachingSessionService.saveTeachingSessions(sessions);
    }

    // Save Staff Attendance Record (Type: Teaching)
    const records = StaffAttendanceService.getRecords();
    const existingRecIdx = records.findIndex(
      r => r.staff_id === staff.id && r.attendance_type === 'teaching' && r.context_id === session.id
    );

    const teachingRecord: StaffAttendanceRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      staff_type: staff.staff_type,
      attendance_date: session.session_date,
      attendance_type: 'teaching',
      context_type: 'academic_session',
      context_id: session.id,
      context_name: `${session.subject_name} — ${session.classroom_name}`,
      scheduled_start_at: scheduledStart,
      scheduled_end_at: scheduledEnd,
      check_in_at: now,
      check_out_at: null,
      status: status,
      check_in_method: 'manual',
      late_minutes: lateMinutes,
      early_leave_minutes: 0,
      recorded_by: params.operatorName,
      notes: params.notes || (lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Tepat waktu'),
      created_at: now,
      updated_at: now,
    };

    if (existingRecIdx >= 0) {
      records[existingRecIdx] = teachingRecord;
    } else {
      records.unshift(teachingRecord);
    }
    StaffAttendanceService.saveRecords(records);

    AuditService.log({
      event: 'staff_teaching_manual',
      auditable_type: 'TeachingSession',
      auditable_id: session.id,
      auditable_name: `${session.subject_name} (${session.classroom_name}) - ${staff.name}`,
      new_values: session,
      reason: `Presensi mengajar manual: ${staff.name} (${status.toUpperCase()})`,
      user: { id: 1, name: params.operatorName, role: 'Teacher' }
    });

    return {
      success: true,
      message: `Presensi mengajar ${session.subject_name} untuk ${staff.name} berhasil dicatat (${status === 'late' ? `Terlambat ${lateMinutes}m` : 'Hadir'}).`,
      session,
      record: teachingRecord
    };
  }

  public static async recordTeachingAttendanceScan(params: {
    sessionId: number;
    qrToken: string;
    operatorName: string;
  }): Promise<StaffScanFeedbackItem> {
    const session = TeachingSessionService.getTeachingSessionById(params.sessionId);
    if (!session) {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'SESSION_NOT_FOUND',
        success: false,
        message: 'Sesi mengajar tidak ditemukan.',
        attendanceType: 'teaching',
      };
    }

    if (session.status === 'cancelled') {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'SESSION_CANCELLED',
        success: false,
        message: 'Sesi mengajar ini telah dibatalkan oleh pihak akademik.',
        attendanceType: 'teaching',
      };
    }

    const staff = StaffIdentityResolver.resolveByQrToken(params.qrToken) || StaffIdentityResolver.resolveById(Number(params.qrToken));
    if (!staff) {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'STAFF_NOT_FOUND',
        success: false,
        message: 'QR Token staf tidak valid atau data staf tidak ditemukan.',
        attendanceType: 'teaching',
      };
    }

    const isAssigned = session.scheduled_teacher_staff_id === staff.id || session.actual_teacher_staff_id === staff.id;
    if (!isAssigned) {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'NOT_ASSIGNED_TO_TEACHING_SESSION',
        success: false,
        message: `Guru ${staff.name} tidak ditugaskan pada sesi mengajar ${session.subject_name} (${session.classroom_name}).`,
        staff,
        staffName: staff.name,
        staffType: staff.staff_type,
        attendanceType: 'teaching',
      };
    }

    const res = await this.recordTeachingAttendanceManual({
      sessionId: params.sessionId,
      staffId: staff.id,
      operatorName: params.operatorName,
    });

    return {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      resultCode: res.success ? 'SUCCESS' : 'ERROR',
      success: res.success,
      message: res.message,
      staff,
      staffName: staff.name,
      staffNumber: staff.staff_number,
      staffType: staff.staff_type,
      attendanceType: 'teaching',
      status: res.record?.status,
      method: 'qr',
      lateMinutes: res.record?.late_minutes || 0,
      contextName: `${session.subject_name} — ${session.classroom_name}`,
    };
  }

  // ==========================================
  // 4. GURU PENGGANTI (SUBSTITUTION)
  // ==========================================
  public static async getTeacherSubstitutions(): Promise<{ data: AcademicSubstitution[]; error?: string }> {
    const subs = TeacherSubstitutionService.getSubstitutions();
    return { data: subs };
  }

  public static async createTeacherSubstitution(params: {
    academicScheduleId: number;
    attendanceSessionId?: number | null;
    date: string;
    originalTeacherStaffId: number;
    substituteTeacherStaffId: number;
    reason: string;
    assignedBy: string;
  }): Promise<{ success: boolean; message: string; substitution?: AcademicSubstitution }> {
    return TeacherSubstitutionService.assignSubstitution(params);
  }

  // ==========================================
  // 5. KEHADIRAN MELATIH PEMBINA EKSTRAKURIKULER
  // ==========================================
  public static async getTrainingSessions(dateStr?: string): Promise<{ data: TrainingSession[]; error?: string }> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const sessions = TrainingSessionService.getTrainingSessions(today);
    return { data: sessions };
  }

  public static async getTrainingSessionById(id: number): Promise<{ data?: TrainingSession; error?: string }> {
    const session = TrainingSessionService.getTrainingSessionById(id);
    if (!session) return { error: 'Sesi latihan tidak ditemukan.' };
    return { data: session };
  }

  public static async getTrainingSessionDetail(id: number): Promise<{ data?: TrainingSession; error?: string }> {
    return this.getTrainingSessionById(id);
  }

  public static async getTrainingSummary(dateStr?: string): Promise<{ data: TrainingAttendanceSummary; error?: string }> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const sessions = TrainingSessionService.getTrainingSessions(today);
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_type === 'training' && r.attendance_date === today
    );

    let present = 0;
    let late = 0;
    let substituted = 0;
    let realized = 0;
    let cancelled = 0;
    let unrecorded = 0;
    let needsReview = 0;

    sessions.forEach(s => {
      const rec = records.find(r => r.context_id === s.id);
      if (s.status === 'cancelled') cancelled++;
      else if (s.status === 'rescheduled' || s.realization_status === 'needs_review') needsReview++;
      else if (s.status === 'substituted' || s.substitution_id) substituted++;
      else if (rec?.status === 'present') present++;
      else if (rec?.status === 'late') late++;
      else unrecorded++;

      if (s.realization_status === 'realized') realized++;
    });

    return {
      data: {
        date: today,
        total_sessions: sessions.length,
        total_trainer_present: present,
        total_trainer_late: late,
        total_trainer_substituted: substituted,
        total_realized: realized,
        total_cancelled: cancelled,
        total_unrecorded: unrecorded,
        total_needs_review: needsReview,
      }
    };
  }

  public static async recordTrainingAttendanceManual(params: {
    sessionId: number;
    staffId: number;
    substituteStaffId?: number | null;
    notes?: string;
    operatorName: string;
  }): Promise<{ success: boolean; message: string; session?: TrainingSession; record?: StaffAttendanceRecord }> {
    const session = TrainingSessionService.getTrainingSessionById(params.sessionId);
    if (!session) {
      return { success: false, message: 'Sesi ekstrakurikuler tidak ditemukan.' };
    }

    if (session.status === 'cancelled') {
      return { success: false, message: 'Sesi latihan ini telah dibatalkan.' };
    }

    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data pelatih tidak ditemukan.' };
    }

    const isAssigned = session.primary_staff_id === params.staffId || 
      session.actual_primary_staff_id === params.staffId || 
      (session.assistant_staff_ids && session.assistant_staff_ids.includes(params.staffId)) || 
      (params.substituteStaffId && params.substituteStaffId === params.staffId);
    if (!isAssigned) {
      return {
        success: false,
        message: 'Pelatih tidak ditugaskan pada sesi kegiatan ini (Gunakan fitur Pelatih Pengganti resmi jika menggantikan).'
      };
    }

    const now = new Date().toISOString();
    const startTime = session.scheduled_start_at.includes('T') ? session.scheduled_start_at.substring(11, 16) : session.scheduled_start_at;
    const endTime = session.scheduled_end_at.includes('T') ? session.scheduled_end_at.substring(11, 16) : session.scheduled_end_at;
    const scheduledStart = session.scheduled_start_at.includes('T') ? session.scheduled_start_at : `${session.session_date}T${startTime}:00+07:00`;
    const scheduledEnd = session.scheduled_end_at.includes('T') ? session.scheduled_end_at : `${session.session_date}T${endTime}:00+07:00`;
    
    // Server calculates late minutes
    let lateMinutes = 0;
    const nowTimeStr = now.substring(11, 16);
    if (nowTimeStr > startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [nh, nm] = nowTimeStr.split(':').map(Number);
      lateMinutes = Math.max(0, (nh * 60 + nm) - (sh * 60 + sm));
    }

    const status: StaffAttendanceStatus = lateMinutes > 5 ? 'late' : 'present';

    // Update Training Session
    session.actual_primary_staff_id = params.staffId;
    session.actual_primary_staff_name = staff.name;
    session.status = 'open';
    session.realization_status = 'ongoing';
    session.updated_at = now;

    // Save
    const sessions = TrainingSessionService.getTrainingSessions();
    const sIndex = sessions.findIndex(s => s.id === session.id);
    if (sIndex >= 0) {
      sessions[sIndex] = session;
      TrainingSessionService.saveTrainingSessions(sessions);
    }

    // Save Staff Attendance Record (Type: Training)
    const records = StaffAttendanceService.getRecords();
    const existingRecIdx = records.findIndex(
      r => r.staff_id === staff.id && r.attendance_type === 'training' && r.context_id === session.id
    );

    const trainingRecord: StaffAttendanceRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      staff_type: staff.staff_type,
      attendance_date: session.session_date,
      attendance_type: 'training',
      context_type: 'training_session',
      context_id: session.id,
      context_name: `${session.extracurricular_name} (${session.location || 'Lapangan'})`,
      scheduled_start_at: scheduledStart,
      scheduled_end_at: scheduledEnd,
      check_in_at: now,
      check_out_at: null,
      status: status,
      check_in_method: 'manual',
      late_minutes: lateMinutes,
      early_leave_minutes: 0,
      recorded_by: params.operatorName,
      notes: params.notes || (lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Tepat waktu'),
      created_at: now,
      updated_at: now,
    };

    if (existingRecIdx >= 0) {
      records[existingRecIdx] = trainingRecord;
    } else {
      records.unshift(trainingRecord);
    }
    StaffAttendanceService.saveRecords(records);

    AuditService.log({
      event: 'trainer_training_checkin_manual',
      auditable_type: 'TrainingSession',
      auditable_id: session.id,
      auditable_name: `${session.extracurricular_name} - ${staff.name}`,
      new_values: session,
      reason: `Presensi melatih manual: ${staff.name} (${status.toUpperCase()})`,
      user: { id: 1, name: params.operatorName, role: 'Coach' }
    });

    return {
      success: true,
      message: `Presensi pelatih ${session.extracurricular_name} untuk ${staff.name} berhasil dicatat (${status === 'late' ? `Terlambat ${lateMinutes}m` : 'Hadir'}).`,
      session,
      record: trainingRecord
    };
  }

  public static async recordTrainingAttendanceScan(params: {
    sessionId: number;
    qrToken: string;
    operatorName: string;
  }): Promise<StaffScanFeedbackItem> {
    const session = TrainingSessionService.getTrainingSessionById(params.sessionId);
    if (!session) {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'SESSION_NOT_FOUND',
        success: false,
        message: 'Sesi kegiatan ekstrakurikuler tidak ditemukan.',
        attendanceType: 'training',
      };
    }

    if (session.status === 'cancelled') {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'SESSION_CANCELLED',
        success: false,
        message: 'Sesi kegiatan ekskul ini telah dibatalkan.',
        attendanceType: 'training',
      };
    }

    const staff = StaffIdentityResolver.resolveByQrToken(params.qrToken) || StaffIdentityResolver.resolveById(Number(params.qrToken));
    if (!staff) {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'STAFF_NOT_FOUND',
        success: false,
        message: 'QR Token staf tidak valid atau data pelatih tidak ditemukan.',
        attendanceType: 'training',
      };
    }

    const isAssigned = session.primary_staff_id === staff.id || 
      session.actual_primary_staff_id === staff.id || 
      (session.assistant_staff_ids && session.assistant_staff_ids.includes(staff.id));
    if (!isAssigned) {
      return {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        resultCode: 'NOT_ASSIGNED_TO_TRAINING_SESSION',
        success: false,
        message: `Pelatih ${staff.name} tidak ditugaskan pada sesi kegiatan ${session.extracurricular_name}.`,
        staff,
        staffName: staff.name,
        staffType: staff.staff_type,
        attendanceType: 'training',
      };
    }

    const res = await this.recordTrainingAttendanceManual({
      sessionId: params.sessionId,
      staffId: staff.id,
      operatorName: params.operatorName,
    });

    return {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      resultCode: res.success ? 'SUCCESS' : 'ERROR',
      success: res.success,
      message: res.message,
      staff,
      staffName: staff.name,
      staffNumber: staff.staff_number,
      staffType: staff.staff_type,
      attendanceType: 'training',
      status: res.record?.status,
      method: 'qr',
      lateMinutes: res.record?.late_minutes || 0,
      contextName: `${session.extracurricular_name} (${session.location || 'Lapangan'})`,
    };
  }

  // ==========================================
  // 6. PELATIH PENGGANTI (SUBSTITUTION)
  // ==========================================
  public static async getTrainerSubstitutions(): Promise<{ data: TrainerSubstitution[]; error?: string }> {
    const subs = TrainerSubstitutionService.getSubstitutions();
    return { data: subs };
  }

  public static async createTrainerSubstitution(params: {
    extracurricularId: number;
    extracurricularName: string;
    originalStaffId: number;
    substituteStaffId: number;
    date: string;
    reason: string;
    assignedBy: string;
  }): Promise<{ success: boolean; message: string; substitution?: TrainerSubstitution }> {
    return TrainerSubstitutionService.assignSubstitution(params);
  }

  // ==========================================
  // 7. REALISASI KEGIATAN EKSTRAKURIKULER
  // ==========================================
  public static async submitTrainingRealization(params: {
    sessionId: number;
    topic: string;
    activityNotes?: string;
    obstacles?: string;
    actualStartAt?: string;
    actualEndAt?: string;
    studentPresentCount?: number;
    studentEligibleCount?: number;
    operatorName: string;
  }): Promise<{ success: boolean; message: string; session?: TrainingSession }> {
    return TrainingRealizationService.submitRealization(params);
  }

  // ==========================================
  // 8. MONITORING RFID TERMINAL SDM
  // ==========================================
  public static async getStaffRfidDevices(): Promise<{ data: AttendanceDevice[]; error?: string }> {
    try {
      const stored = localStorage.getItem('siuba_devices');
      if (stored) return { data: JSON.parse(stored) };
    } catch (_) {}
    return { data: INITIAL_DEVICES };
  }

  public static async getStaffRfidLogs(): Promise<{ data: AttendanceDeviceLog[]; error?: string }> {
    try {
      const stored = localStorage.getItem('siuba_device_logs');
      if (stored) return { data: JSON.parse(stored) };
    } catch (_) {}
    return { data: INITIAL_DEVICE_LOGS };
  }
}
