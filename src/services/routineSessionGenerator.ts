import { 
  Activity, 
  ActivityParticipant, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  DormitoryRoom, 
  DutyRoster,
  ExtracurricularMember, 
  HalaqahMember, 
  PrayerTimeCalendar, 
  RoutineGenerationResult, 
  RoutineSchedule, 
  RoutineScheduleOverride, 
  Student, 
  StudentGroupMember, 
  User 
} from '../types';
import { RoutineScheduleService } from './routineScheduleService';
import { ActivityParticipantService } from './activityParticipantService';

export class RoutineSessionGenerator {
  /**
   * Idempotently Generate Routine Attendance Sessions for a given date
   */
  static generateRoutineSessionsForDate(params: {
    date: string; // "YYYY-MM-DD"
    routineSchedules: RoutineSchedule[];
    routineOverrides?: RoutineScheduleOverride[];
    prayerCalendars?: PrayerTimeCalendar[];
    activities: Activity[];
    students: Student[];
    dormitoryRooms?: DormitoryRoom[];
    halaqahMembers?: HalaqahMember[];
    dutyRosters?: DutyRoster[];
    activityParticipants?: ActivityParticipant[];
    extracurricularMembers?: ExtracurricularMember[];
    studentGroupMembers?: StudentGroupMember[];
    existingSessions: AttendanceSession[];
    existingParticipants: AttendanceSessionParticipant[];
    currentUser?: User;
  }): {
    result: RoutineGenerationResult;
    newSessions: AttendanceSession[];
    newParticipants: AttendanceSessionParticipant[];
  } {
    const {
      date,
      routineSchedules,
      routineOverrides = [],
      prayerCalendars = [],
      activities,
      students,
      dormitoryRooms = [],
      halaqahMembers = [],
      dutyRosters = [],
      activityParticipants = [],
      extracurricularMembers = [],
      studentGroupMembers = [],
      existingSessions,
      existingParticipants,
      currentUser,
    } = params;

    const errors: string[] = [];
    const newSessions: AttendanceSession[] = [];
    const newParticipants: AttendanceSessionParticipant[] = [];

    // Get effective routine schedules for this date
    const effectiveSchedules = RoutineScheduleService.getEffectiveSchedulesForDate({
      date,
      schedules: routineSchedules,
      overrides: routineOverrides,
      prayerCalendars,
    });

    let createdCount = 0;
    let existingCount = 0;
    let cancelledCount = 0;
    let skippedCount = 0;

    for (const item of effectiveSchedules) {
      const {
        schedule,
        effectiveStartTime,
        effectivePresentUntil,
        effectiveLateUntil,
        effectiveEndTime,
        effectiveLocation,
        isCancelled,
      } = item;

      // Find matching activity definition
      const activity = activities.find((a) => a.id === schedule.activity_id);
      if (!activity) {
        errors.push(`Aktivitas ID ${schedule.activity_id} tidak ditemukan untuk Jadwal ID ${schedule.id}`);
        skippedCount++;
        continue;
      }

      // Check for Existing Session (Idempotency Check)
      const isAlreadyGenerated = existingSessions.some((s) => {
        // Check by explicit routine_schedule_id link
        if (s.routine_schedule_id === schedule.id && s.session_date === date) return true;
        // Or check by activity_id + session_date + start_at
        if (s.activity_id === activity.id && s.session_date === date && s.start_at === effectiveStartTime) return true;
        return false;
      });

      if (isAlreadyGenerated) {
        existingCount++;
        continue;
      }

      if (isCancelled) {
        cancelledCount++;
        continue;
      }

      // Generate Session
      const newSessionId = Date.now() + Math.floor(Math.random() * 1000);
      const sessionCode = `ROUTINE-${date.replace(/-/g, '')}-${activity.code}-${schedule.id}`;

      // Create Session object with overridden or routine target properties
      const targetActivity: Activity = {
        ...activity,
        location: effectiveLocation,
        participant_type: schedule.participant_type || activity.participant_type,
        participant_gender: schedule.participant_gender || activity.participant_gender,
      };

      const initialStatus = schedule.auto_open ? 'open' : 'draft';

      const session: AttendanceSession = {
        id: newSessionId,
        activity_id: activity.id,
        activity_name: activity.name,
        activity_code: activity.code,
        session_code: sessionCode,
        session_date: date,
        start_at: effectiveStartTime,
        present_until: effectivePresentUntil,
        late_until: effectiveLateUntil,
        end_at: effectiveEndTime,
        status: initialStatus,
        location: effectiveLocation,
        participant_count: 0,
        routine_schedule_id: schedule.id,
        opened_by: currentUser?.name || 'System Auto-Generator',
        notes: `Sesi Rutin Otomatis (${schedule.frequency})`,
      };

      // Generate Immutable Participant Snapshot
      const snapshots = ActivityParticipantService.generateSessionParticipantsSnapshot({
        session,
        activity: targetActivity,
        students,
        dormitoryRooms,
        halaqahMembers,
        dutyRosters,
        activityParticipants,
        extracurricularMembers,
        studentGroupMembers,
      });

      session.participant_count = snapshots.length;

      newSessions.push(session);
      newParticipants.push(...snapshots);
      createdCount++;
    }

    const result: RoutineGenerationResult = {
      date,
      schedules_found: effectiveSchedules.length,
      created: createdCount,
      existing: existingCount,
      cancelled: cancelledCount,
      skipped: skippedCount,
      errors,
    };

    return {
      result,
      newSessions,
      newParticipants,
    };
  }
}
