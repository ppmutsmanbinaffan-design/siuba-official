import { Staff, TrainingContextResolution, TrainingSession } from '../types';
import { TrainingSessionService } from './trainingSessionService';
import { ExtracurricularStaffAssignmentService } from './extracurricularStaffAssignmentService';
import { TrainerSubstitutionService } from './trainerSubstitutionService';
import { StaffAttendanceService } from './staffAttendanceService';

export class TrainingAttendanceContextResolver {
  public static readonly DEFAULT_GRACE_PERIOD_MINUTES = 15;
  public static readonly EARLY_SCAN_WINDOW_MINUTES = 60;

  /**
   * Validates and resolves attendance context for a staff member scanning into a training session
   */
  public static resolveContext(
    staff: Staff,
    sessionId: number,
    timeNowStr?: string
  ): TrainingContextResolution {
    const session = TrainingSessionService.getTrainingSessionById(sessionId);
    if (!session) {
      return {
        is_eligible: false,
        code: 'SESSION_NOT_FOUND',
        message: `Sesi latihan ekstrakurikuler dengan ID ${sessionId} tidak ditemukan.`
      };
    }

    if (session.status === 'cancelled') {
      return {
        is_eligible: false,
        code: 'SESSION_CANCELLED',
        message: `Sesi latihan ${session.extracurricular_name} pada tanggal ${session.session_date} telah dibatalkan (${session.cancellation_reason || 'Kegiatan ditiadakan'}).`
      };
    }

    // Check existing attendance record for this staff and training session
    const records = StaffAttendanceService.getRecords();
    const existing = records.find(
      r => r.staff_id === staff.id && 
        r.attendance_type === 'training' && 
        r.context_id === session.id
    );

    if (existing) {
      if (existing.check_out_at) {
        return {
          is_eligible: false,
          code: 'ALREADY_CHECKED_OUT',
          message: `${staff.name} sudah melakukan check-out pada sesi latihan ${session.extracurricular_name}.`,
          session
        };
      }
      return {
        is_eligible: true, // Eligible for check-out
        code: 'ALREADY_RECORDED',
        message: `${staff.name} sudah check-in pada sesi ini pada ${existing.check_in_at}. Lakukan scan lagi untuk check-out.`,
        session
      };
    }

    // Check assignment: active assignment for this extracurricular OR formal substitute
    const sessionDate = session.session_date || new Date().toISOString().substring(0, 10);
    const activeAssignments = ExtracurricularStaffAssignmentService.getActiveAssignmentsForDate(
      session.extracurricular_id,
      sessionDate
    );
    const assignment = activeAssignments.find(a => a.staff_id === staff.id);

    // Check substitution
    const substitution = TrainerSubstitutionService.getActiveSubstitution(session.extracurricular_id, sessionDate);
    const isSubstitute = Boolean(substitution && substitution.substitute_staff_id === staff.id);

    const isDirectlyAssigned = Boolean(assignment);
    const isEligibleStaff = isDirectlyAssigned || isSubstitute || (session.primary_staff_id === staff.id) || (session.actual_primary_staff_id === staff.id);

    if (!isEligibleStaff) {
      return {
        is_eligible: false,
        code: 'NOT_ASSIGNED_TO_TRAINING_SESSION',
        message: `Staf ${staff.name} tidak terdaftar sebagai pelatih, asisten, pembina, maupun pelatih pengganti pada sesi ${session.extracurricular_name}.`,
        session
      };
    }

    // Time calculations
    const now = timeNowStr ? new Date(timeNowStr) : new Date();
    const [startHour, startMin] = (session.scheduled_start_at || '16:00').split(':').map(Number);
    const scheduledStart = new Date(sessionDate);
    scheduledStart.setHours(startHour, startMin, 0, 0);

    const diffMinutes = Math.floor((now.getTime() - scheduledStart.getTime()) / (1000 * 60));
    const gracePeriod = this.DEFAULT_GRACE_PERIOD_MINUTES;

    const isLate = diffMinutes > gracePeriod;
    const lateMinutes = isLate ? diffMinutes : 0;

    return {
      is_eligible: true,
      code: 'VALID',
      message: 'Staf memenuhi syarat untuk presensi melatih ekstrakurikuler.',
      session,
      assignment,
      role: assignment ? assignment.role : (isSubstitute ? 'coach' : 'coach'),
      is_primary: assignment ? assignment.is_primary : (session.actual_primary_staff_id === staff.id),
      is_substitute: isSubstitute,
      is_late: isLate,
      late_minutes: lateMinutes,
      grace_period_minutes: gracePeriod
    };
  }
}
