import { 
  TrainingSession, 
  TrainingSessionStatus, 
  TrainingRealizationStatus, 
  TrainingSessionGenerationResult, 
  Extracurricular, 
  AcademicCalendarEvent 
} from '../types';
import { 
  INITIAL_TRAINING_SESSIONS, 
  INITIAL_EXTRACURRICULARS, 
  INITIAL_ACADEMIC_CALENDAR_EVENTS, 
  INITIAL_EXTRACURRICULAR_MEMBERS 
} from '../data/initialData';
import { ExtracurricularStaffAssignmentService } from './extracurricularStaffAssignmentService';
import { TrainerSubstitutionService } from './trainerSubstitutionService';
import { AuditService } from './auditService';
import { StaffIdentityResolver } from './staffIdentityResolver';

export class TrainingSessionService {
  private static STORAGE_KEY = 'siuba_training_sessions';

  public static getTrainingSessions(dateStr?: string): TrainingSession[] {
    let sessions: TrainingSession[] = INITIAL_TRAINING_SESSIONS;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        sessions = JSON.parse(stored);
      }
    } catch (_) {}

    if (dateStr) {
      return sessions.filter(s => s.session_date === dateStr);
    }
    return sessions;
  }

  public static saveTrainingSessions(sessions: TrainingSession[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (_) {}
  }

  public static getTrainingSessionById(id: number): TrainingSession | undefined {
    return this.getTrainingSessions().find(s => s.id === id);
  }

  public static getExtracurriculars(): Extracurricular[] {
    try {
      const stored = localStorage.getItem('siuba_extracurriculars');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return INITIAL_EXTRACURRICULARS;
  }

  public static getCalendarEvents(): AcademicCalendarEvent[] {
    try {
      const stored = localStorage.getItem('siuba_academic_calendar_events');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return INITIAL_ACADEMIC_CALENDAR_EVENTS;
  }

  /**
   * Idempotent Generator for Training Sessions on a given date
   */
  public static generateSessionsForDate(params: {
    date: string;
    operatorName?: string;
  }): TrainingSessionGenerationResult {
    const targetDate = params.date;
    const errors: string[] = [];

    // Check holiday/calendar events
    const calendarEvents = this.getCalendarEvents();
    const holiday = calendarEvents.find(e => 
      e.date_start <= targetDate && 
      e.date_end >= targetDate && 
      (e.type === 'holiday' || e.affects_academic_schedule)
    );

    if (holiday) {
      return {
        date: targetDate,
        schedules_found: 0,
        sessions_created: 0,
        sessions_existing: 0,
        sessions_skipped: 0,
        is_holiday: true,
        holiday_name: holiday.name,
        substitutions_applied: 0,
        errors: [`Tanggal ${targetDate} adalah hari libur: ${holiday.name}. Sesi latihan reguler ditiadakan.`]
      };
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dateObj = new Date(targetDate);
    const dayOfWeek = dayNames[dateObj.getDay()];

    const extras = this.getExtracurriculars().filter(e => e.is_active);
    const allSessions = this.getTrainingSessions();
    const existingDateSessions = allSessions.filter(s => s.session_date === targetDate);

    let createdCount = 0;
    let existingCount = 0;
    let substitutionsApplied = 0;

    // Default schedules mapping per day for active extracurriculars
    // Monday: Panahan (1), Hadroh (2)
    // Tuesday: Tapak Suci (3)
    // Wednesday: Robotika (5)
    // Thursday: Kaligrafi (4)
    const dayMapping: Record<string, number[]> = {
      'monday': [1, 2],
      'tuesday': [3],
      'wednesday': [5],
      'thursday': [4],
      'friday': [],
      'saturday': [1, 3],
      'sunday': []
    };

    const scheduledExtraIds = dayMapping[dayOfWeek] || [1, 2];
    const eligibleExtras = extras.filter(e => scheduledExtraIds.includes(e.id));

    eligibleExtras.forEach((extra, idx) => {
      // Check idempotency (Logical uniqueness: extracurricular_id + session_date)
      const existing = existingDateSessions.find(s => s.extracurricular_id === extra.id);
      if (existing) {
        existingCount++;
        return;
      }

      // Resolve assigned primary coach and assistants
      const primaryAssignment = ExtracurricularStaffAssignmentService.getPrimaryCoach(extra.id, targetDate);
      const allAssignments = ExtracurricularStaffAssignmentService.getActiveAssignmentsForDate(extra.id, targetDate);
      
      const primaryStaffId = primaryAssignment ? primaryAssignment.staff_id : (extra.coach_id || 4);
      const primaryStaffName = primaryAssignment ? primaryAssignment.staff_name : (extra.coach_name || 'Ust. Pelatih');
      const assistantStaffIds = allAssignments.filter(a => a.role === 'assistant_coach').map(a => a.staff_id);

      // Check substitution
      const substitution = TrainerSubstitutionService.getActiveSubstitution(extra.id, targetDate);
      let actualPrimaryStaffId = primaryStaffId;
      let actualPrimaryStaffName = primaryStaffName;
      let substitutionId: number | null = null;
      let substitutionReason: string | null = null;

      if (substitution) {
        actualPrimaryStaffId = substitution.substitute_staff_id;
        actualPrimaryStaffName = substitution.substitute_staff_name;
        substitutionId = substitution.id;
        substitutionReason = substitution.reason;
        substitutionsApplied++;
      }

      // Count registered active student members
      let members = INITIAL_EXTRACURRICULAR_MEMBERS;
      try {
        const storedMembers = localStorage.getItem('siuba_extracurricular_members');
        if (storedMembers) members = JSON.parse(storedMembers);
      } catch (_) {}
      const eligibleStudentCount = members.filter(m => m.extracurricular_id === extra.id && m.is_active).length || 4;

      const newSession: TrainingSession = {
        id: Date.now() + Math.floor(Math.random() * 1000) + idx,
        extracurricular_id: extra.id,
        extracurricular_name: extra.name,
        extracurricular_code: extra.code,
        activity_id: null,
        attendance_session_id: null,
        schedule_id: idx + 1,
        session_date: targetDate,
        scheduled_start_at: '16:00',
        scheduled_end_at: '17:30',
        location: extra.location || 'Area Latihan Ekskul',
        primary_staff_id: primaryStaffId,
        primary_staff_name: primaryStaffName,
        actual_primary_staff_id: actualPrimaryStaffId,
        actual_primary_staff_name: actualPrimaryStaffName,
        assistant_staff_ids: assistantStaffIds,
        status: substitution ? 'substituted' : 'open',
        realization_status: 'planned',
        substitution_id: substitutionId,
        substitution_reason: substitutionReason,
        topic: `Latihan Rutin ${extra.name}`,
        activity_notes: `Sesi latihan terjadwal hari ${dayOfWeek.toUpperCase()}.`,
        student_present_count: 0,
        student_eligible_count: eligibleStudentCount,
        notes: substitution ? `Pelatih utama digantikan oleh ${actualPrimaryStaffName}` : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      allSessions.unshift(newSession);
      createdCount++;
    });

    if (createdCount > 0) {
      this.saveTrainingSessions(allSessions);

      AuditService.log({
        event: 'training_session_generated',
        auditable_type: 'TrainingSession',
        auditable_id: Date.now(),
        auditable_name: `Sesi Latihan Ekstrakurikuler (${targetDate})`,
        new_values: { date: targetDate, created_count: createdCount, existing_count: existingCount },
        reason: `Generator membuat ${createdCount} sesi latihan baru untuk tanggal ${targetDate}`,
        user: { id: 1, name: params.operatorName || 'System Generator', role: 'System' }
      });
    }

    return {
      date: targetDate,
      schedules_found: eligibleExtras.length,
      sessions_created: createdCount,
      sessions_existing: existingCount,
      sessions_skipped: 0,
      substitutions_applied: substitutionsApplied,
      errors
    };
  }

  public static generateDailyTrainingSessions(dateStr: string, operatorName: string = 'System Generator'): {
    total_schedules_checked: number;
    created_count: number;
    existing_count: number;
    duplicate_skipped_count: number;
    sessions: TrainingSession[];
  } {
    const result = this.generateSessionsForDate({ date: dateStr, operatorName });
    const sessions = this.getTrainingSessions(dateStr);
    return {
      total_schedules_checked: result.schedules_found,
      created_count: result.sessions_created,
      existing_count: result.sessions_existing,
      duplicate_skipped_count: result.sessions_existing,
      sessions
    };
  }

  /**
   * Cancel a training session (e.g. rainy weather, field unavailable, emergency)
   */
  public static cancelSession(params: {
    sessionId: number;
    reason: string;
    cancelledBy: string;
  }): { success: boolean; session?: TrainingSession; message: string } {
    const sessions = this.getTrainingSessions();
    const index = sessions.findIndex(s => s.id === params.sessionId);
    if (index === -1) {
      return { success: false, message: 'Sesi latihan tidak ditemukan.' };
    }

    const session = sessions[index];
    if (session.status === 'completed' && session.realization_status === 'realized') {
      return { success: false, message: 'Sesi latihan yang sudah terlaksana (realized) tidak dapat dibatalkan.' };
    }

    session.status = 'cancelled';
    session.realization_status = 'cancelled';
    session.cancellation_reason = params.reason;
    session.cancelled_by = params.cancelledBy;
    session.cancelled_at = new Date().toISOString();
    session.updated_at = new Date().toISOString();

    this.saveTrainingSessions(sessions);

    AuditService.log({
      event: 'training_session_cancelled',
      auditable_type: 'TrainingSession',
      auditable_id: session.id,
      auditable_name: `${session.extracurricular_name} (${session.session_date})`,
      old_values: { status: 'open' },
      new_values: { status: 'cancelled', reason: params.reason, cancelled_by: params.cancelledBy },
      reason: `Pembatalan sesi latihan ${session.extracurricular_name}: ${params.reason}`,
      user: { id: 1, name: params.cancelledBy, role: 'Admin' }
    });

    return {
      success: true,
      session,
      message: `Sesi latihan ${session.extracurricular_name} tanggal ${session.session_date} berhasil dibatalkan.`
    };
  }

  /**
   * Reschedule a training session
   */
  public static rescheduleSession(params: {
    sessionId: number;
    newDate: string;
    newStartTime: string;
    newEndTime: string;
    newLocation?: string;
    reason: string;
    operatorName: string;
  }): { success: boolean; session?: TrainingSession; message: string } {
    const sessions = this.getTrainingSessions();
    const index = sessions.findIndex(s => s.id === params.sessionId);
    if (index === -1) {
      return { success: false, message: 'Sesi latihan tidak ditemukan.' };
    }

    const session = sessions[index];
    const oldDetails = {
      date: session.session_date,
      start: session.scheduled_start_at,
      end: session.scheduled_end_at,
      location: session.location
    };

    session.session_date = params.newDate;
    session.scheduled_start_at = params.newStartTime;
    session.scheduled_end_at = params.newEndTime;
    if (params.newLocation) session.location = params.newLocation;
    session.status = 'rescheduled';
    session.reschedule_reason = params.reason;
    session.updated_at = new Date().toISOString();

    this.saveTrainingSessions(sessions);

    AuditService.log({
      event: 'training_session_rescheduled',
      auditable_type: 'TrainingSession',
      auditable_id: session.id,
      auditable_name: `${session.extracurricular_name} -> ${params.newDate}`,
      old_values: oldDetails,
      new_values: { date: params.newDate, start: params.newStartTime, end: params.newEndTime, location: session.location, reason: params.reason },
      reason: `Penjadwalan ulang sesi latihan ${session.extracurricular_name}: ${params.reason}`,
      user: { id: 1, name: params.operatorName, role: 'Admin' }
    });

    return {
      success: true,
      session,
      message: `Sesi latihan ${session.extracurricular_name} berhasil dijadwalkan ulang ke ${params.newDate} pukul ${params.newStartTime} - ${params.newEndTime}.`
    };
  }
}
