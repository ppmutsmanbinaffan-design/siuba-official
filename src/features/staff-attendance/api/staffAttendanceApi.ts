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

import { apiClient, isOfflineError } from '../../../services/apiClient';
import { todayLocalDate } from '../../../utils/today';

/** Gabungkan presensi harian dari server ke cache lokal; presensi mengajar/melatih lokal tetap dipertahankan. */
export function mergeServerDailyRecords(serverRecords: StaffAttendanceRecord[], datesToReplace: string[] = []): void {
  try {
    const dates = new Set([...serverRecords.map((r) => r.attendance_date), ...datesToReplace]);
    const local: StaffAttendanceRecord[] = JSON.parse(localStorage.getItem('siuba_staff_attendance_records') || '[]');
    const kept = Array.isArray(local)
      ? local.filter((r) => r.attendance_type !== 'daily' || (!dates.has(r.attendance_date) && !(r as any).__server))
      : [];
    const tagged = serverRecords.map((r) => ({ ...r, __server: true }));
    localStorage.setItem('siuba_staff_attendance_records', JSON.stringify([...tagged, ...kept]));
  } catch {
    // ignore
  }
}

function serverScanToFeedback(d: any, method: AttendanceMethod): StaffScanFeedbackItem {
  const rec = d?.record || {};
  return {
    id: String(Date.now()),
    timestamp: new Date().toISOString(),
    resultCode: d?.code,
    success: !!d?.success,
    message: d?.message,
    staff: d?.staff || undefined,
    staffName: d?.staff?.name,
    staffNumber: d?.staff?.staff_number,
    staffType: d?.staff?.staff_type,
    attendanceType: 'daily',
    status: rec.status,
    method,
    mode: d?.mode || undefined,
    checkInAt: rec.check_in_at || undefined,
    checkOutAt: rec.check_out_at || undefined,
    lateMinutes: rec.late_minutes || 0,
    earlyLeaveMinutes: rec.early_leave_minutes || 0,
    contextName: 'Presensi Harian Kantor / Gerbang',
  } as StaffScanFeedbackItem;
}

export class StaffAttendanceApi {
  // ==========================================
  // 1. KEHADIRAN HARIAN SDM
  // ==========================================
  public static async getDailyRecords(dateStr?: string): Promise<{ data: StaffAttendanceRecord[]; error?: string }> {
    try {
      const res: any = await apiClient.get('/staff-attendance/daily', { date: dateStr || todayLocalDate() });
      if (Array.isArray(res?.data)) {
        mergeServerDailyRecords(res.data, [dateStr || todayLocalDate()]);
        return { data: res.data };
      }
    } catch (err: any) {
      if (!isOfflineError(err)) return { data: [], error: err?.message || 'Gagal memuat presensi SDM.' };
    }
    const today = dateStr || todayLocalDate();
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_type === 'daily' && r.attendance_date === today
    );
    return { data: records };
  }

  public static async getDailySummary(dateStr?: string): Promise<{ data: StaffDailySummary; error?: string }> {
    try {
      const res: any = await apiClient.get('/staff-attendance/daily/summary', { date: dateStr || todayLocalDate() });
      if (res?.data) return { data: res.data };
    } catch (err: any) {
      // gagal dari server: hitung dari cache lokal (sudah berisi data server terakhir)
      console.warn('Ringkasan presensi SDM dari server gagal:', err?.message);
    }
    const today = dateStr || todayLocalDate();
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
    try {
      const res: any = await apiClient.post('/staff-attendance/daily/scan', { identifier: params.identifier, method: params.method });
      return serverScanToFeedback(res.data, params.method);
    } catch (err: any) {
      if (!isOfflineError(err)) {
        return {
          id: String(Date.now()), timestamp: new Date().toISOString(), resultCode: (err?.code || 'SERVER_ERROR') as any,
          success: false, message: err?.message || 'Gagal mencatat presensi.', attendanceType: 'daily', method: params.method,
          lateMinutes: 0, earlyLeaveMinutes: 0, contextName: 'Presensi Harian Kantor / Gerbang',
        } as StaffScanFeedbackItem;
      }
    }
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
    try {
      const res: any = await apiClient.post('/staff-attendance/daily/manual', { staff_id: params.staffId, action: params.action, notes: params.notes });
      const d = res.data || {};
      return { success: !!d.success, message: d.message, record: d.record || undefined };
    } catch (err: any) {
      if (!isOfflineError(err)) return { success: false, message: err?.message || 'Gagal mencatat presensi.' };
    }
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
    try {
      const res: any = await apiClient.post(`/staff-attendance/records/${params.recordId}/correct`, {
        status: params.status, late_minutes: params.lateMinutes, early_leave_minutes: params.earlyLeaveMinutes, notes: params.notes,
      });
      return { success: true, message: res?.message || 'Koreksi presensi harian berhasil disimpan.' };
    } catch (err: any) {
      if (!isOfflineError(err)) return { success: false, message: err?.message || 'Koreksi gagal disimpan.' };
    }
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
    try {
      const res: any = await apiClient.get('/staff-attendance/absences');
      if (Array.isArray(res?.data)) {
        try { localStorage.setItem('siuba_staff_absence_requests', JSON.stringify(res.data)); } catch { /* ignore */ }
        return { data: res.data };
      }
    } catch (err: any) {
      if (!isOfflineError(err)) return { data: [], error: err?.message || 'Gagal memuat pengajuan.' };
    }
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
    try {
      const res: any = await apiClient.post('/staff-attendance/absences', {
        staff_id: params.staffId, type: params.type, start_at: params.startAt, end_at: params.endAt, reason: params.reason,
      });
      return { success: true, message: res?.message || 'Pengajuan berhasil diajukan.', request: res?.data };
    } catch (err: any) {
      if (!isOfflineError(err)) return { success: false, message: err?.message || 'Pengajuan gagal disimpan.' };
    }
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
    try {
      const res: any = await apiClient.post(`/staff-attendance/absences/${params.id}/approve`, { notes: params.notes });
      return { success: true, message: res?.message || 'Pengajuan disetujui.' };
    } catch (err: any) {
      if (!isOfflineError(err)) return { success: false, message: err?.message || 'Gagal menyetujui pengajuan.' };
    }
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
    try {
      const res: any = await apiClient.post(`/staff-attendance/absences/${params.id}/reject`, { rejection_reason: params.rejectionReason });
      return { success: true, message: res?.message || 'Pengajuan ditolak.' };
    } catch (err: any) {
      if (!isOfflineError(err)) return { success: false, message: err?.message || 'Gagal menolak pengajuan.' };
    }
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
  // 3. KEHADIRAN MENGAJAR GURU (KBM) — tersimpan di server (tahap 19)
  // ==========================================
  private static TEACHING_CACHE_KEY = 'siuba_teaching_sessions_server';

  private static readTeachingCache(): Record<string, TeachingSession[]> {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.TEACHING_CACHE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private static writeTeachingCache(date: string, rows: TeachingSession[]): void {
    try {
      const all = this.readTeachingCache();
      all[date] = rows;
      // simpan 7 tanggal terakhir saja
      const keys = Object.keys(all).sort().slice(-7);
      localStorage.setItem(this.TEACHING_CACHE_KEY, JSON.stringify(Object.fromEntries(keys.map((k) => [k, all[k]]))));
    } catch {
      /* kuota penuh: abaikan */
    }
  }

  private static errorMessage(err: any, fallback: string): string {
    if (isOfflineError(err)) return 'Server tidak terjangkau. Presensi mengajar memerlukan koneksi ke server SIUBA.';
    return err?.message || fallback;
  }

  public static async getTeachingSessions(dateStr?: string): Promise<{ data: TeachingSession[]; error?: string }> {
    const date = dateStr || todayLocalDate();
    try {
      const res: any = await apiClient.get<TeachingSession[]>('/teaching/sessions', { date });
      const rows: TeachingSession[] = Array.isArray(res?.data) ? res.data : [];
      this.writeTeachingCache(date, rows);
      return { data: rows };
    } catch (err: any) {
      const cached = this.readTeachingCache()[date];
      if (cached && isOfflineError(err)) return { data: cached, error: 'Offline: menampilkan data terakhir dari server.' };
      return { data: [], error: this.errorMessage(err, 'Gagal memuat sesi mengajar.') };
    }
  }

  public static async getTeachingSessionById(id: number): Promise<{ data?: TeachingSession; error?: string }> {
    try {
      const res: any = await apiClient.get<TeachingSession>(`/teaching/sessions/${id}`);
      return { data: res?.data };
    } catch (err: any) {
      const cached = Object.values(this.readTeachingCache()).flat().find((s) => s.id === id);
      if (cached && isOfflineError(err)) return { data: cached };
      return { error: this.errorMessage(err, 'Sesi mengajar tidak ditemukan.') };
    }
  }

  public static async getTeachingSessionDetail(id: number): Promise<{ data?: TeachingSession; error?: string }> {
    return this.getTeachingSessionById(id);
  }

  public static async getTeachingSummary(dateStr?: string): Promise<{ data: TeachingAttendanceSummary; error?: string }> {
    const date = dateStr || todayLocalDate();
    const { data: sessions, error } = await this.getTeachingSessions(date);
    let present = 0, late = 0, substituted = 0, cancelled = 0, unrecorded = 0, needsReview = 0;
    sessions.forEach((s) => {
      const st = s.teacher_attendance_status || 'unrecorded';
      if (s.status === 'cancelled') cancelled++;
      else {
        if (s.is_substituted || s.substitution_id) substituted++;
        if (st === 'present') present++;
        else if (st === 'late') late++;
        else if (st === 'unrecorded') unrecorded++;
        else needsReview++; // izin / sakit / alpa
      }
    });
    return {
      data: {
        date,
        total_sessions: sessions.length,
        total_present: present,
        total_late: late,
        total_substituted: substituted,
        total_cancelled: cancelled,
        total_unrecorded: unrecorded,
        total_needs_review: needsReview,
      },
      error,
    };
  }

  public static async recordTeachingAttendanceManual(params: {
    sessionId: number;
    staffId: number;
    substituteStaffId?: number | null;
    status?: 'present' | 'permission' | 'sick' | 'absent';
    notes?: string;
    operatorName: string;
  }): Promise<{ success: boolean; message: string; session?: TeachingSession }> {
    try {
      const res: any = await apiClient.post(`/teaching/sessions/${params.sessionId}/manual`, {
        staff_id: params.staffId,
        status: params.status || 'present',
        notes: params.notes || null,
      });
      return { success: true, message: res?.message || 'Presensi mengajar tercatat.', session: res?.data?.session };
    } catch (err: any) {
      return { success: false, message: this.errorMessage(err, 'Gagal mencatat presensi mengajar.') };
    }
  }

  public static async recordTeachingAttendanceScan(params: {
    sessionId?: number | null;
    qrToken: string;
    method?: 'qr' | 'rfid' | 'manual';
    operatorName: string;
  }): Promise<StaffScanFeedbackItem> {
    const base = { id: String(Date.now()), timestamp: new Date().toISOString(), attendanceType: 'teaching' as const };
    try {
      const res: any = await apiClient.post('/teaching/scan', {
        identifier: params.qrToken,
        session_id: params.sessionId || undefined,
        method: params.method || 'qr',
      });
      const d = res?.data || {};
      const sess: TeachingSession | undefined = d.session;
      return {
        ...base,
        resultCode: 'SUCCESS',
        success: true,
        message: res?.message || 'Presensi mengajar tercatat.',
        staffName: sess?.actual_teacher_name || sess?.teacher_name || undefined,
        status: d.status,
        method: params.method || 'qr',
        mode: d.mode === 'check_out' ? 'CHECK_OUT' : d.mode === 'check_in' ? 'CHECK_IN' : 'RECORDED',
        checkInAt: sess?.teacher_check_in_at || undefined,
        lateMinutes: d.late_minutes || 0,
        contextName: sess ? `${sess.subject_name} — ${sess.classroom_name}` : undefined,
      };
    } catch (err: any) {
      return {
        ...base,
        resultCode: err?.code || (isOfflineError(err) ? 'OFFLINE' : 'ERROR'),
        success: false,
        message: this.errorMessage(err, 'Presensi mengajar gagal.'),
      };
    }
  }

  /** Jurnal mengajar: materi, catatan, jumlah santri hadir. */
  public static async submitTeachingJournal(params: {
    sessionId: number;
    topic: string;
    notes?: string;
    studentPresentCount?: number | null;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await apiClient.post(`/teaching/sessions/${params.sessionId}/journal`, {
        topic: params.topic,
        journal_notes: params.notes || null,
        student_present_count: params.studentPresentCount ?? null,
      });
      return { success: true, message: res?.message || 'Jurnal mengajar tersimpan.' };
    } catch (err: any) {
      return { success: false, message: this.errorMessage(err, 'Gagal menyimpan jurnal mengajar.') };
    }
  }

  /** Akhir hari: sesi KBM tanpa presensi guru ditandai alpa. */
  public static async finalizeTeachingDay(dateStr?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await apiClient.post('/teaching/finalize', { date: dateStr || todayLocalDate() });
      return { success: true, message: res?.message || 'Finalisasi selesai.' };
    } catch (err: any) {
      return { success: false, message: this.errorMessage(err, 'Finalisasi gagal.') };
    }
  }

  // ==========================================
  // 4. GURU PENGGANTI (SUBSTITUTION) — server
  // ==========================================
  public static async getTeacherSubstitutions(): Promise<{ data: AcademicSubstitution[]; error?: string }> {
    try {
      const res: any = await apiClient.get<AcademicSubstitution[]>('/teaching/substitutions');
      return { data: Array.isArray(res?.data) ? res.data : [] };
    } catch (err: any) {
      return { data: [], error: this.errorMessage(err, 'Gagal memuat data guru pengganti.') };
    }
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
    try {
      const res: any = await apiClient.post('/teaching/substitutions', {
        academic_schedule_id: params.academicScheduleId,
        substitute_staff_id: params.substituteTeacherStaffId,
        date: params.date,
        reason: params.reason,
      });
      return { success: true, message: res?.message || 'Guru pengganti ditetapkan.', substitution: res?.data };
    } catch (err: any) {
      return { success: false, message: this.errorMessage(err, 'Gagal menetapkan guru pengganti.') };
    }
  }

  // Presensi melatih (pelatih/pembina ekskul) sepenuhnya di server: lihat TrainerAttendanceView (/trainer/*).

  // ==========================================
  // 8. MONITORING RFID TERMINAL SDM
  // ==========================================
  public static async getStaffRfidDevices(): Promise<{ data: AttendanceDevice[]; error?: string }> {
    try {
      // Cache perangkat dari server (diisi saat sinkronisasi)
      const stored = localStorage.getItem('siuba_attendance_devices_cache');
      if (stored) return { data: JSON.parse(stored) };
    } catch (_) {}
    return { data: [] };
  }

  public static async getStaffRfidLogs(): Promise<{ data: AttendanceDeviceLog[]; error?: string }> {
    try {
      const stored = localStorage.getItem('siuba_attendance_device_logs_cache');
      if (stored) return { data: JSON.parse(stored) };
    } catch (_) {}
    return { data: [] };
  }
}
