import { 
  AcademicCalendarEvent, 
  AcademicSchedule, 
  AcademicSessionContext, 
  Activity, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Classroom, 
  GenerationResult, 
  LessonPeriod, 
  Student, 
  Subject, 
  Teacher, 
  User 
} from '../types';
import { AcademicScheduleService } from './academicScheduleService';

export class AcademicSessionGenerator {
  /**
   * Generates Attendance Sessions & Contexts for a given date from Academic Schedules.
   * Idempotent: Does not create duplicate sessions if session code or context already exists for that schedule & date.
   * Participant Snapshot: Locks the current list of active students in the classroom into attendance_session_participants.
   */
  public static generateSessionsForDate(params: {
    date: string; // YYYY-MM-DD
    academicYearId: number;
    semesterId: number;
    academicSchedules: AcademicSchedule[];
    lessonPeriods: LessonPeriod[];
    calendarEvents: AcademicCalendarEvent[];
    classrooms: Classroom[];
    subjects: Subject[];
    teachers: Teacher[];
    students: Student[];
    activities: Activity[];
    existingSessions: AttendanceSession[];
    existingContexts: AcademicSessionContext[];
    existingParticipants: AttendanceSessionParticipant[];
    currentUser: User;
  }): {
    result: GenerationResult;
    newSessions: AttendanceSession[];
    newContexts: AcademicSessionContext[];
    newParticipants: AttendanceSessionParticipant[];
    newActivities: Activity[];
  } {
    const {
      date,
      academicYearId,
      semesterId,
      academicSchedules,
      lessonPeriods,
      calendarEvents,
      classrooms,
      subjects,
      teachers,
      students,
      activities,
      existingSessions,
      existingContexts,
      existingParticipants,
      currentUser,
    } = params;

    const errors: string[] = [];

    // 1. Check if date falls on a holiday event
    const holidayEvent = calendarEvents.find(
      (ev) =>
        ev.affects_academic_schedule &&
        ev.type === 'holiday' &&
        date >= ev.date_start &&
        date <= ev.date_end
    );

    if (holidayEvent) {
      return {
        result: {
          date,
          schedules_found: 0,
          sessions_created: 0,
          sessions_existing: 0,
          sessions_skipped: 0,
          is_holiday: true,
          holiday_name: holidayEvent.name,
          errors: [`Tanggal ${date} merupakan Hari Libur: ${holidayEvent.name}. Sesi KBM tidak digenerate.`],
        },
        newSessions: [],
        newContexts: [],
        newParticipants: [],
        newActivities: [],
      };
    }

    // 2. Resolve Day of Week
    const dayOfWeek = AcademicScheduleService.resolveDayOfWeek(date);

    // 3. Find active schedules for this semester and day
    const daySchedules = academicSchedules.filter(
      (s) =>
        s.is_active &&
        s.academic_year_id === academicYearId &&
        s.semester_id === semesterId &&
        s.day_of_week === dayOfWeek
    );

    let createdCount = 0;
    let existingCount = 0;
    let skippedCount = 0;

    const newSessions: AttendanceSession[] = [];
    const newContexts: AcademicSessionContext[] = [];
    const newParticipants: AttendanceSessionParticipant[] = [];
    const newActivities: Activity[] = [];

    let nextSessionId = Math.max(0, ...existingSessions.map((s) => s.id)) + 1;
    let nextContextId = Math.max(0, ...existingContexts.map((c) => c.id)) + 1;
    let nextParticipantId = Math.max(0, ...existingParticipants.map((p) => p.id)) + 1;
    let nextActivityId = Math.max(0, ...activities.map((a) => a.id)) + 1;

    for (const schedule of daySchedules) {
      const period = lessonPeriods.find((lp) => lp.id === schedule.lesson_period_id);
      if (!period || !period.is_active) {
        skippedCount++;
        continue;
      }

      // Skip break periods
      if (period.is_break) {
        skippedCount++;
        continue;
      }

      const classroom = classrooms.find((c) => c.id === schedule.classroom_id);
      const subject = subjects.find((sub) => sub.id === schedule.subject_id);
      const teacher = teachers.find((t) => t.id === schedule.teacher_id);

      if (!classroom || !subject || !teacher) {
        errors.push(`Jadwal #${schedule.id} dilewati: Master Kelas, Mapel, atau Guru tidak ditemukan.`);
        skippedCount++;
        continue;
      }

      // Format session code e.g. KBM-20260824-VIIA-FIQIH-JP01
      const cleanClassCode = classroom.code ? classroom.code.replace(/[^A-Za-z0-9]/g, '') : `KLS${classroom.id}`;
      const cleanDate = date.replace(/-/g, '');
      const periodCode = period.code.replace(/[^A-Za-z0-9]/g, '');
      const sessionCode = `KBM-${cleanDate}-${cleanClassCode}-${subject.code}-${periodCode}`;

      // Check Idempotency: Does session or context exist?
      const sessionExists = existingSessions.some((s) => s.session_code === sessionCode && s.session_date === date);
      const contextExists = existingContexts.some(
        (c) => c.academic_schedule_id === schedule.id && c.created_at?.startsWith(date)
      );

      if (sessionExists || contextExists) {
        existingCount++;
        continue;
      }

      // 4. Resolve or create Activity for this KBM course
      const activityCode = `ACT-KBM-${cleanClassCode}-${subject.code}`;
      let activity = activities.find((a) => a.code === activityCode) || newActivities.find((a) => a.code === activityCode);

      if (!activity) {
        activity = {
          id: nextActivityId++,
          activity_category_id: 2, // AKADEMIK
          category_name: 'Akademik',
          code: activityCode,
          name: `KBM ${subject.name} - Kelas ${classroom.name}`,
          description: `Sesi Pembelajaran ${subject.name} untuk kelas ${classroom.name}`,
          location: schedule.room_location || `Ruang Kelas ${classroom.name}`,
          participant_type: 'classroom',
          classroom_id: classroom.id,
          attendance_enabled: true,
          allow_manual: true,
          allow_qr: true,
          allow_rfid: true,
          late_tolerance_minutes: 10,
          is_active: true,
          default_start_time: period.start_time,
          default_present_until: `${period.start_time.slice(0, 3)}10`,
          default_late_until: period.end_time,
          default_end_time: period.end_time,
        };
        newActivities.push(activity);
      }

      // Calculate start and end ISO Datetimes
      const startIso = `${date}T${period.start_time}:00`;
      const endIso = `${date}T${period.end_time}:00`;

      // Present until 10 minutes after start time
      const [sh, sm] = period.start_time.split(':').map(Number);
      const presentUntilMinutes = sm + 10;
      const ph = sh + Math.floor(presentUntilMinutes / 60);
      const pm = presentUntilMinutes % 60;
      const presentUntilStr = `${String(ph).padStart(2, '0')}:${String(pm).padStart(2, '0')}`;
      const presentUntilIso = `${date}T${presentUntilStr}:00`;

      // 5. Create AttendanceSession
      const newSession: AttendanceSession = {
        id: nextSessionId++,
        activity_id: activity.id,
        activity_name: `${subject.short_name || subject.name} - ${classroom.name} (${period.name})`,
        activity_code: activity.code,
        session_code: sessionCode,
        session_date: date,
        start_at: startIso,
        present_until: presentUntilIso,
        late_until: endIso,
        end_at: endIso,
        status: 'draft', // Created in 'draft' status ready for teacher to open!
        location: schedule.room_location || `Ruang Kelas ${classroom.name}`,
        notes: `Sesi KBM Jadwal Terjadwal: Guru ${teacher.name}`,
        classroom_id: classroom.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
      };

      // 6. Create AcademicSessionContext
      const newContext: AcademicSessionContext = {
        id: nextContextId++,
        attendance_session_id: newSession.id,
        academic_schedule_id: schedule.id,
        lesson_period_id: period.id,
        classroom_id: classroom.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
        period_count: 1,
        scheduled_start_time: period.start_time,
        scheduled_end_time: period.end_time,
        room_location: schedule.room_location,
        created_at: `${date} 00:05:00`,
      };

      newSession.academic_context = newContext;

      // 7. Create Participant Snapshot (all active students in this classroom)
      const classStudents = students.filter(
        (st) => st.is_active && st.status === 'active' && st.classroom_id === classroom.id
      );

      for (const st of classStudents) {
        newParticipants.push({
          id: nextParticipantId++,
          attendance_session_id: newSession.id,
          student_id: st.id,
          student_name: st.name,
          student_number: st.student_number,
          classroom_name: st.classroom_name || classroom.name,
          dormitory_room_name: st.dormitory_room_name || '-',
          participant_source: 'classroom',
          eligibility_status: 'eligible',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
      }

      newSession.participant_count = classStudents.length;

      newSessions.push(newSession);
      newContexts.push(newContext);
      createdCount++;
    }

    return {
      result: {
        date,
        schedules_found: daySchedules.length,
        sessions_created: createdCount,
        sessions_existing: existingCount,
        sessions_skipped: skippedCount,
        errors,
      },
      newSessions,
      newContexts,
      newParticipants,
      newActivities,
    };
  }
}
