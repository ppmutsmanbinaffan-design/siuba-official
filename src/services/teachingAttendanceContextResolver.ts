import { 
  Staff, 
  StaffAttendanceRecord, 
  TeachingContextResolution, 
  TeachingSession 
} from '../types';
import { TeachingSessionService } from './teachingSessionService';

export class TeachingAttendanceContextResolver {
  public static readonly DEFAULT_GRACE_PERIOD_MINUTES = 5;
  public static readonly DEFAULT_EARLY_CHECKIN_MINUTES = 15;

  /**
   * Resolves teaching context for a specific staff and teaching session
   */
  public static resolveTeachingContext(params: {
    staff: Staff;
    sessionId: number;
    timeNowStr?: string;
    allowEarlyMinutes?: number;
    gracePeriodMinutes?: number;
    existingRecords?: StaffAttendanceRecord[];
  }): TeachingContextResolution {
    const {
      staff,
      sessionId,
      timeNowStr = new Date().toISOString(),
      allowEarlyMinutes = this.DEFAULT_EARLY_CHECKIN_MINUTES,
      gracePeriodMinutes = this.DEFAULT_GRACE_PERIOD_MINUTES,
      existingRecords = []
    } = params;

    const session = TeachingSessionService.getTeachingSessionById(sessionId);
    if (!session) {
      return {
        is_eligible: false,
        code: 'SESSION_NOT_FOUND',
        message: `Sesi mengajar ID #${sessionId} tidak ditemukan dalam jadwal akademik.`
      };
    }

    if (session.status === 'cancelled') {
      return {
        is_eligible: false,
        code: 'SESSION_CANCELLED',
        message: `Sesi mengajar ${session.subject_name} (${session.classroom_name}) telah dibatalkan (${session.cancellation_reason || 'Alasan tidak dicantumkan'}).`
      };
    }

    // Determine allowed teacher (Substitute teacher takes precedence over scheduled teacher)
    const isSubstituted = session.status === 'substituted' || Boolean(session.actual_teacher_staff_id);
    const expectedTeacherId = session.scheduled_teacher_staff_id;
    const allowedTeacherId = isSubstituted && session.actual_teacher_staff_id
      ? session.actual_teacher_staff_id
      : expectedTeacherId;

    const isSubstituteStaff = isSubstituted && staff.id === session.actual_teacher_staff_id;

    // Verify staff assignment
    if (staff.id !== allowedTeacherId) {
      const allowedName = isSubstituted && session.actual_teacher_name 
        ? session.actual_teacher_name 
        : session.scheduled_teacher_name;
      
      return {
        is_eligible: false,
        code: 'NOT_ASSIGNED_TO_TEACHING_SESSION',
        message: `Staf ${staff.name} tidak ditugaskan pada sesi KBM ini. Guru pengajar yang sah adalah: ${allowedName}.`,
        session,
        expected_teacher_staff_id: expectedTeacherId,
        allowed_teacher_staff_id: allowedTeacherId,
      };
    }

    // Duplicate check on this teaching session
    const existing = existingRecords.find(
      r => r.staff_id === staff.id &&
        r.attendance_type === 'teaching' &&
        r.context_id === session.id
    );

    if (existing) {
      if (existing.check_out_at) {
        return {
          is_eligible: false,
          code: 'ALREADY_CHECKED_OUT',
          message: `Guru ${staff.name} sudah menyelesaikan presensi check-in & check-out pada sesi ${session.subject_name} (${session.classroom_name}).`,
          session
        };
      }

      return {
        is_eligible: true,
        code: 'ALREADY_RECORDED',
        message: `Guru ${staff.name} sudah check-in pada sesi ini pukul ${existing.check_in_at?.substring(11, 16) || '-'}. Siap untuk check-out.`,
        session,
        is_substitute: isSubstituteStaff
      };
    }

    // Time window calculation
    const now = new Date(timeNowStr).getTime();
    const scheduledStartMs = new Date(session.scheduled_start_at).getTime();

    // Check early limit
    if (!isNaN(scheduledStartMs)) {
      const earliestAllowedMs = scheduledStartMs - (allowEarlyMinutes * 60 * 1000);
      if (now < earliestAllowedMs) {
        const earlyDiffMins = Math.ceil((earliestAllowedMs - now) / 60000);
        return {
          is_eligible: false,
          code: 'TOO_EARLY',
          message: `Presensi mengajar belum dibuka. Gerbang dibuka ${allowEarlyMinutes} menit sebelum KBM (kurang ${earlyDiffMins} menit).`,
          session
        };
      }
    }

    // Late calculation with grace period
    let isLate = false;
    let lateMinutes = 0;

    if (!isNaN(scheduledStartMs)) {
      const graceThresholdMs = scheduledStartMs + (gracePeriodMinutes * 60 * 1000);
      if (now > graceThresholdMs) {
        isLate = true;
        lateMinutes = Math.max(1, Math.floor((now - scheduledStartMs) / 60000));
      }
    }

    return {
      is_eligible: true,
      code: 'VALID',
      message: isLate 
        ? `Valid mengajar (Terlambat ${lateMinutes} menit - toleransi ${gracePeriodMinutes} mnt)`
        : 'Valid mengajar tepat waktu',
      session,
      expected_teacher_staff_id: expectedTeacherId,
      allowed_teacher_staff_id: allowedTeacherId,
      is_substitute: isSubstituteStaff,
      is_late: isLate,
      late_minutes: lateMinutes,
      grace_period_minutes: gracePeriodMinutes
    };
  }

  /**
   * Finds the best active/upcoming teaching session for a teacher right now
   */
  public static resolveCurrentSessionForTeacher(
    staffId: number, 
    dateStr: string = new Date().toISOString().substring(0, 10),
    timeNowStr: string = new Date().toISOString()
  ): TeachingSession | undefined {
    const todaySessions = TeachingSessionService.getTeachingSessions(dateStr, { teacherStaffId: staffId });
    if (todaySessions.length === 0) return undefined;

    const now = new Date(timeNowStr).getTime();

    // Prefer session currently in progress or starting within next 20 mins
    const sorted = [...todaySessions].sort((a, b) => {
      const aStart = new Date(a.scheduled_start_at).getTime();
      const bStart = new Date(b.scheduled_start_at).getTime();
      return aStart - bStart;
    });

    const currentOrNext = sorted.find(s => {
      if (s.status === 'completed' || s.status === 'cancelled') return false;
      const startMs = new Date(s.scheduled_start_at).getTime();
      const endMs = new Date(s.scheduled_end_at).getTime();
      // Within window: 20 mins before start until end
      return now >= (startMs - 20 * 60000) && now <= endMs;
    });

    return currentOrNext || sorted.find(s => s.status !== 'completed' && s.status !== 'cancelled') || sorted[0];
  }
}
