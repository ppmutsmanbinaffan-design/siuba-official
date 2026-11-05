import { 
  AcademicCalendarEvent, 
  AcademicSchedule, 
  Classroom, 
  LessonPeriod, 
  Staff, 
  Subject, 
  Teacher, 
  TeachingSession, 
  TeachingSessionGenerationResult, 
  TeachingSessionStatus 
} from '../types';
import { 
  INITIAL_ACADEMIC_CALENDAR_EVENTS, 
  INITIAL_ACADEMIC_SCHEDULES, 
  INITIAL_CLASSROOMS, 
  INITIAL_LESSON_PERIODS, 
  INITIAL_SUBJECTS, 
  INITIAL_TEACHERS 
} from '../data/initialData';
import { AcademicScheduleService } from './academicScheduleService';
import { TeacherSubstitutionService } from './teacherSubstitutionService';
import { StaffIdentityResolver } from './staffIdentityResolver';
import { AuditService } from './auditService';

export class TeachingSessionService {
  private static STORAGE_KEY = 'siuba_teaching_sessions';

  /**
   * Helper to find staff by Teacher record or Staff list
   */
  public static resolveStaffForTeacher(teacherId: number, teachers: Teacher[] = INITIAL_TEACHERS, staffList: Staff[] = []): Staff | undefined {
    const list = staffList.length > 0 ? staffList : StaffIdentityResolver.getStaffList();
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return undefined;

    // 1. Direct staff_id match
    if (teacher.staff_id) {
      const s = list.find(st => st.id === teacher.staff_id);
      if (s) return s;
    }

    // 2. User ID match
    if (teacher.user_id) {
      const s = list.find(st => st.user_id === teacher.user_id);
      if (s) return s;
    }

    // 3. Name fuzzy match
    const cleanTeacherName = (teacher.name || '').toLowerCase().replace(/ustadz|ustadzah|ust\.|s\.pd|m\.pd|s\.kom|lc|dr\./g, '').trim();
    const matched = list.find(st => {
      const cleanStaffName = (st.name || '').toLowerCase().replace(/ustadz|ustadzah|ust\.|s\.pd|m\.pd|s\.kom|lc|dr\./g, '').trim();
      return cleanStaffName.includes(cleanTeacherName) || cleanTeacherName.includes(cleanStaffName);
    });

    if (matched) return matched;

    // 4. Default fallback to first teacher in staff list
    return list.find(st => st.staff_type === 'teacher') || list[0];
  }

  /**
   * Generates initial seed data for teaching sessions
   */
  public static getInitialSessions(): TeachingSession[] {
    const today = new Date().toISOString().substring(0, 10);
    const dayOfWeek = AcademicScheduleService.resolveDayOfWeek(today);

    const activeSchedules = INITIAL_ACADEMIC_SCHEDULES.filter(s => s.is_active && (s.day_of_week === dayOfWeek || s.day_of_week === 'monday'));
    const staffList = StaffIdentityResolver.getStaffList();
    const teachers = INITIAL_TEACHERS;
    const lessonPeriods = INITIAL_LESSON_PERIODS;
    const classrooms = INITIAL_CLASSROOMS;
    const subjects = INITIAL_SUBJECTS;

    const sessions: TeachingSession[] = activeSchedules.map((schedule, idx) => {
      const classroom = classrooms.find(c => c.id === schedule.classroom_id);
      const subject = subjects.find(sub => sub.id === schedule.subject_id);
      const period = lessonPeriods.find(lp => lp.id === schedule.lesson_period_id);
      const staff = this.resolveStaffForTeacher(schedule.teacher_id, teachers, staffList);

      const staffId = staff ? staff.id : (schedule.teacher_id === 1 ? 2 : schedule.teacher_id === 2 ? 1 : 3);
      const staffName = staff ? staff.name : `Ust. Guru #${schedule.teacher_id}`;

      // Check if substituted
      const sub = TeacherSubstitutionService.getActiveSubstitution(today, schedule.id);
      const actualStaff = sub ? staffList.find(s => s.id === sub.substitute_teacher_id) : undefined;

      const startTime = period?.start_time || '07:00';
      const endTime = period?.end_time || '07:40';

      return {
        id: 100 + idx + 1,
        academic_schedule_id: schedule.id,
        attendance_session_id: idx === 0 ? 2 : null,
        session_date: today,
        classroom_id: schedule.classroom_id,
        classroom_name: classroom ? classroom.name : `Kelas #${schedule.classroom_id}`,
        subject_id: schedule.subject_id,
        subject_name: subject ? subject.name : `Mapel #${schedule.subject_id}`,
        subject_code: subject?.code || 'MPL',
        lesson_period_id: schedule.lesson_period_id,
        lesson_period_name: period ? period.name : `JP #${schedule.lesson_period_id}`,
        period_number: period?.period_number || (idx + 1),
        room_location: schedule.room_location || classroom?.name || 'Ruang Kelas',
        scheduled_teacher_staff_id: staffId,
        scheduled_teacher_name: staffName,
        actual_teacher_staff_id: actualStaff ? actualStaff.id : (idx === 0 ? 1 : null),
        actual_teacher_name: actualStaff ? actualStaff.name : (idx === 0 ? 'Ust. Ahmad Fauzi, S.Kom' : null),
        scheduled_start_at: `${today}T${startTime}:00+07:00`,
        scheduled_end_at: `${today}T${endTime}:00+07:00`,
        status: sub ? 'substituted' : (idx === 0 ? 'completed' : 'scheduled'),
        substitution_id: sub ? sub.id : (idx === 0 ? 1 : null),
        substitution_reason: sub ? sub.reason : (idx === 0 ? 'Pendampingan Lomba Fiqih santri Jawa Timur' : null),
        notes: idx === 0 ? 'Sesi KBM pagi berjalan lancar' : null,
        created_at: `${today}T06:00:00+07:00`,
        updated_at: `${today}T06:00:00+07:00`,
      };
    });

    return sessions;
  }

  public static getTeachingSessions(date?: string, filter?: { teacherStaffId?: number; classroomId?: number; status?: string }): TeachingSession[] {
    let sessions: TeachingSession[] = [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        sessions = this.getInitialSessions();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      } else {
        sessions = JSON.parse(data);
      }
    } catch (_) {
      sessions = this.getInitialSessions();
    }

    if (date) {
      sessions = sessions.filter(s => s.session_date === date);
    }

    if (filter) {
      if (filter.teacherStaffId) {
        sessions = sessions.filter(s => 
          s.scheduled_teacher_staff_id === filter.teacherStaffId || 
          s.actual_teacher_staff_id === filter.teacherStaffId
        );
      }
      if (filter.classroomId) {
        sessions = sessions.filter(s => s.classroom_id === filter.classroomId);
      }
      if (filter.status && filter.status !== 'ALL') {
        sessions = sessions.filter(s => s.status === filter.status);
      }
    }

    return sessions.sort((a, b) => {
      if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
      return (a.period_number || 0) - (b.period_number || 0);
    });
  }

  public static saveTeachingSessions(sessions: TeachingSession[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  public static getTeachingSessionById(sessionId: number): TeachingSession | undefined {
    const sessions = this.getTeachingSessions();
    return sessions.find(s => s.id === sessionId);
  }

  /**
   * Idempotent generator for Teaching Sessions on a given date.
   */
  public static generateSessionsForDate(params: {
    date: string;
    academicYearId?: number;
    semesterId?: number;
    schedules?: AcademicSchedule[];
    lessonPeriods?: LessonPeriod[];
    calendarEvents?: AcademicCalendarEvent[];
    classrooms?: Classroom[];
    subjects?: Subject[];
    teachers?: Teacher[];
    staffList?: Staff[];
    operatorName?: string;
  }): TeachingSessionGenerationResult {
    const {
      date,
      academicYearId = 1,
      semesterId = 1,
      schedules = INITIAL_ACADEMIC_SCHEDULES,
      lessonPeriods = INITIAL_LESSON_PERIODS,
      calendarEvents = INITIAL_ACADEMIC_CALENDAR_EVENTS,
      classrooms = INITIAL_CLASSROOMS,
      subjects = INITIAL_SUBJECTS,
      teachers = INITIAL_TEACHERS,
      staffList = StaffIdentityResolver.getStaffList(),
      operatorName = 'Sistem Auto-Generator'
    } = params;

    const errors: string[] = [];

    // 1. Check if date falls on holiday event
    const holidayEvent = calendarEvents.find(
      ev => ev.affects_academic_schedule &&
        ev.type === 'holiday' &&
        date >= ev.date_start &&
        date <= ev.date_end
    );

    if (holidayEvent) {
      return {
        date,
        schedules_found: 0,
        sessions_created: 0,
        sessions_existing: 0,
        sessions_skipped: 0,
        is_holiday: true,
        holiday_name: holidayEvent.name,
        substitutions_applied: 0,
        errors: [`Tanggal ${date} merupakan Hari Libur Resmi (${holidayEvent.name}). Sesi mengajar KBM tidak digenerate.`]
      };
    }

    // 2. Resolve day of week
    const dayOfWeek = AcademicScheduleService.resolveDayOfWeek(date);

    // 3. Find active schedules for this day
    const daySchedules = schedules.filter(
      s => s.is_active &&
        s.academic_year_id === academicYearId &&
        s.semester_id === semesterId &&
        s.day_of_week === dayOfWeek
    );

    const allSessions = this.getTeachingSessions();
    const existingDateSessions = allSessions.filter(s => s.session_date === date);

    let createdCount = 0;
    let existingCount = 0;
    let substitutionsCount = 0;

    const newSessions: TeachingSession[] = [];

    for (const schedule of daySchedules) {
      // Idempotency: Check if session already generated for this schedule + date
      const exists = existingDateSessions.find(s => s.academic_schedule_id === schedule.id);
      if (exists) {
        existingCount++;
        continue;
      }

      const classroom = classrooms.find(c => c.id === schedule.classroom_id);
      const subject = subjects.find(sub => sub.id === schedule.subject_id);
      const period = lessonPeriods.find(lp => lp.id === schedule.lesson_period_id);
      const staff = this.resolveStaffForTeacher(schedule.teacher_id, teachers, staffList);

      const staffId = staff ? staff.id : (schedule.teacher_id === 1 ? 2 : schedule.teacher_id === 2 ? 1 : 3);
      const staffName = staff ? staff.name : `Ust. Pengajar #${schedule.teacher_id}`;

      // Check formal substitution
      const sub = TeacherSubstitutionService.getActiveSubstitution(date, schedule.id);
      let actualStaffId: number | null = null;
      let actualStaffName: string | null = null;
      let initialStatus: TeachingSessionStatus = 'scheduled';

      if (sub) {
        const subStaff = staffList.find(s => s.id === sub.substitute_teacher_id);
        if (subStaff) {
          actualStaffId = subStaff.id;
          actualStaffName = subStaff.name;
          initialStatus = 'substituted';
          substitutionsCount++;
        }
      }

      const startTime = period?.start_time || '07:00';
      const endTime = period?.end_time || '07:40';

      const session: TeachingSession = {
        id: Date.now() + createdCount + Math.floor(Math.random() * 1000),
        academic_schedule_id: schedule.id,
        attendance_session_id: null,
        session_date: date,
        classroom_id: schedule.classroom_id,
        classroom_name: classroom ? classroom.name : `Kelas #${schedule.classroom_id}`,
        subject_id: schedule.subject_id,
        subject_name: subject ? subject.name : `Mapel #${schedule.subject_id}`,
        subject_code: subject?.code || 'MPL',
        lesson_period_id: schedule.lesson_period_id,
        lesson_period_name: period ? period.name : `JP #${schedule.lesson_period_id}`,
        period_number: period?.period_number || 1,
        room_location: schedule.room_location || classroom?.name || 'Ruang Kelas',
        scheduled_teacher_staff_id: staffId,
        scheduled_teacher_name: staffName,
        actual_teacher_staff_id: actualStaffId,
        actual_teacher_name: actualStaffName,
        scheduled_start_at: `${date}T${startTime}:00+07:00`,
        scheduled_end_at: `${date}T${endTime}:00+07:00`,
        status: initialStatus,
        substitution_id: sub ? sub.id : null,
        substitution_reason: sub ? sub.reason : null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newSessions.push(session);
      createdCount++;
    }

    if (newSessions.length > 0) {
      const merged = [...allSessions, ...newSessions];
      this.saveTeachingSessions(merged);

      AuditService.log({
        event: 'teaching_session_generated',
        auditable_type: 'TeachingSession',
        auditable_id: newSessions[0].id,
        auditable_name: `Generate ${newSessions.length} Sesi Mengajar (${date})`,
        old_values: { date, existing_count: existingCount },
        new_values: { created_count: createdCount, total_date_sessions: existingCount + createdCount },
        reason: `Auto-generasi jadwal mengajar harian KBM untuk ${AcademicScheduleService.getDayLabel(dayOfWeek)}, ${date}`,
        user: { id: 1, name: operatorName, role: 'admin', username: 'admin', is_active: true }
      });
    }

    return {
      date,
      schedules_found: daySchedules.length,
      sessions_created: createdCount,
      sessions_existing: existingCount,
      sessions_skipped: 0,
      is_holiday: false,
      substitutions_applied: substitutionsCount,
      errors
    };
  }

  public static generateDailyTeachingSessions(dateStr: string, operatorName: string = 'System Generator'): {
    total_schedules_checked: number;
    created_count: number;
    existing_count: number;
    duplicate_skipped_count: number;
    sessions: TeachingSession[];
  } {
    const result = this.generateSessionsForDate({ date: dateStr, operatorName });
    const sessions = this.getTeachingSessions(dateStr);
    return {
      total_schedules_checked: result.schedules_found,
      created_count: result.sessions_created,
      existing_count: result.sessions_existing,
      duplicate_skipped_count: result.sessions_existing,
      sessions
    };
  }

  /**
   * Cancel an academic teaching session (e.g. school event, emergency, meeting)
   */
  public static cancelTeachingSession(params: {
    sessionId: number;
    reason: string;
    cancelledBy: string;
  }): { success: boolean; message: string; session?: TeachingSession } {
    const { sessionId, reason, cancelledBy } = params;

    if (!reason || reason.trim().length === 0) {
      return { success: false, message: 'Alasan pembatalan kelas wajib diisi.' };
    }

    const sessions = this.getTeachingSessions();
    const index = sessions.findIndex(s => s.id === sessionId);

    if (index < 0) {
      return { success: false, message: 'Sesi mengajar tidak ditemukan.' };
    }

    const target = sessions[index];
    if (target.status === 'completed') {
      return { success: false, message: 'Sesi mengajar yang sudah selesai tidak dapat dibatalkan.' };
    }

    const now = new Date().toISOString();
    const updated: TeachingSession = {
      ...target,
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
      cancelled_at: now,
      updated_at: now,
    };

    sessions[index] = updated;
    this.saveTeachingSessions(sessions);

    AuditService.log({
      event: 'teaching_session_cancelled',
      auditable_type: 'TeachingSession',
      auditable_id: sessionId,
      auditable_name: `Pembatalan Sesi Mengajar: ${target.subject_name} (${target.classroom_name} - ${target.lesson_period_name})`,
      old_values: { status: target.status },
      new_values: { status: 'cancelled', reason, cancelled_by: cancelledBy },
      reason: `Kelas dibatalkan: ${reason}`,
      user: { id: 1, name: cancelledBy, role: 'admin', username: 'admin', is_active: true }
    });

    return {
      success: true,
      message: `Sesi mengajar ${target.subject_name} di ${target.classroom_name} berhasil dibatalkan. Guru tidak akan dihitung alpha.`,
      session: updated
    };
  }

  /**
   * Assign a substitute teacher directly to a teaching session
   */
  public static assignSubstituteToSession(params: {
    sessionId: number;
    substituteStaffId: number;
    reason: string;
    assignedBy: string;
  }): { success: boolean; message: string; session?: TeachingSession } {
    const { sessionId, substituteStaffId, reason, assignedBy } = params;

    const sessions = this.getTeachingSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index < 0) {
      return { success: false, message: 'Sesi mengajar tidak ditemukan.' };
    }

    const target = sessions[index];
    if (target.scheduled_teacher_staff_id === substituteStaffId) {
      return { success: false, message: 'Guru pengganti tidak boleh sama dengan guru terjadwal.' };
    }

    const staffList = StaffIdentityResolver.getStaffList();
    const subStaff = staffList.find(s => s.id === substituteStaffId);
    if (!subStaff || !subStaff.is_active) {
      return { success: false, message: 'Data guru pengganti tidak aktif atau tidak ditemukan.' };
    }

    // Call TeacherSubstitutionService
    const subResult = TeacherSubstitutionService.assignSubstitution({
      academicScheduleId: target.academic_schedule_id,
      attendanceSessionId: target.attendance_session_id,
      date: target.session_date,
      originalTeacherStaffId: target.scheduled_teacher_staff_id,
      substituteTeacherStaffId: substituteStaffId,
      reason,
      assignedBy
    });

    if (!subResult.success || !subResult.substitution) {
      return { success: false, message: subResult.message };
    }

    const now = new Date().toISOString();
    const updated: TeachingSession = {
      ...target,
      status: 'substituted',
      actual_teacher_staff_id: subStaff.id,
      actual_teacher_name: subStaff.name,
      substitution_id: subResult.substitution.id,
      substitution_reason: reason,
      updated_at: now
    };

    sessions[index] = updated;
    this.saveTeachingSessions(sessions);

    return {
      success: true,
      message: `Berhasil menugaskan ${subStaff.name} menggantikan ${target.scheduled_teacher_name} pada sesi ${target.subject_name} (${target.classroom_name}).`,
      session: updated
    };
  }

  /**
   * Reschedule or change time window of a teaching session
   */
  public static rescheduleTeachingSession(params: {
    sessionId: number;
    newStartTime: string; // HH:mm
    newEndTime: string;   // HH:mm
    reason: string;
    operatorName: string;
  }): { success: boolean; message: string; session?: TeachingSession } {
    const { sessionId, newStartTime, newEndTime, reason, operatorName } = params;

    const sessions = this.getTeachingSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index < 0) {
      return { success: false, message: 'Sesi mengajar tidak ditemukan.' };
    }

    const target = sessions[index];
    const date = target.session_date;

    const now = new Date().toISOString();
    const updated: TeachingSession = {
      ...target,
      scheduled_start_at: `${date}T${newStartTime}:00+07:00`,
      scheduled_end_at: `${date}T${newEndTime}:00+07:00`,
      notes: target.notes ? `${target.notes} | Jam disesuaikan: ${newStartTime}-${newEndTime} (${reason})` : `Jam disesuaikan: ${newStartTime}-${newEndTime} (${reason})`,
      updated_at: now
    };

    sessions[index] = updated;
    this.saveTeachingSessions(sessions);

    AuditService.log({
      event: 'teaching_session_rescheduled',
      auditable_type: 'TeachingSession',
      auditable_id: sessionId,
      auditable_name: `Penyesuaian Waktu Sesi #${sessionId} (${target.subject_name})`,
      old_values: { start: target.scheduled_start_at, end: target.scheduled_end_at },
      new_values: { start: updated.scheduled_start_at, end: updated.scheduled_end_at, reason },
      reason: `Reschedule jam KBM: ${reason}`,
      user: { id: 1, name: operatorName, role: 'admin', username: 'admin', is_active: true }
    });

    return {
      success: true,
      message: `Waktu sesi mengajar ${target.subject_name} berhasil diubah menjadi ${newStartTime} - ${newEndTime}.`,
      session: updated
    };
  }

  /**
   * Mark session as completed
   */
  public static completeSession(sessionId: number, notes?: string): void {
    const sessions = this.getTeachingSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index >= 0) {
      const now = new Date().toISOString();
      sessions[index] = {
        ...sessions[index],
        status: 'completed',
        notes: notes || sessions[index].notes,
        updated_at: now
      };
      this.saveTeachingSessions(sessions);
    }
  }
}
