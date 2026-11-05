import { 
  Staff, 
  StaffAttendanceRecord, 
  StaffAttendanceSummary, 
  StaffType,
  TeachingSession,
  TrainingSession
} from '../types';
import { StaffIdentityResolver } from './staffIdentityResolver';
import { StaffWorkScheduleResolver } from './staffWorkScheduleResolver';
import { StaffAttendanceService } from './staffAttendanceService';
import { TeachingSessionService } from './teachingSessionService';
import { TrainingSessionService } from './trainingSessionService';

export class StaffAttendanceMetricService {
  /**
   * Safe percentage calculation with zero-denominator protection.
   * Returns null when denominator is 0 to avoid misleading 0% or NaN values.
   */
  public static safeRate(numerator: number, denominator: number): number | null {
    if (denominator <= 0) return null;
    return Math.round((numerator / denominator) * 1000) / 10; // 1 decimal precision
  }

  /**
   * Presence Rate: (Present + Late) / Expected
   */
  public static calculatePresenceRate(present: number, late: number, expected: number): number | null {
    return this.safeRate(present + late, expected);
  }

  /**
   * Punctuality Rate: Present / (Present + Late)
   */
  public static calculatePunctualityRate(present: number, attended: number): number | null {
    return this.safeRate(present, attended);
  }

  /**
   * Excused Rate: (Permission + Sick + Leave + Official Duty) / Expected
   */
  public static calculateExcusedRate(
    permission: number, 
    sick: number, 
    leave: number, 
    officialDuty: number, 
    expected: number
  ): number | null {
    return this.safeRate(permission + sick + leave + officialDuty, expected);
  }

  /**
   * Alpha Rate: Absent / Expected
   */
  public static calculateAlphaRate(absent: number, expected: number): number | null {
    return this.safeRate(absent, expected);
  }

  /**
   * Teaching Rate: Attended Sessions / Eligible Sessions
   */
  public static calculateTeachingRate(attended: number, eligible: number): number | null {
    return this.safeRate(attended, eligible);
  }

  /**
   * Training Rate: Attended Sessions / Eligible Sessions
   */
  public static calculateTrainingRate(attended: number, eligible: number): number | null {
    return this.safeRate(attended, eligible);
  }

  /**
   * Realization Rate: Realized Sessions / Eligible Sessions
   */
  public static calculateRealizationRate(realized: number, eligible: number): number | null {
    return this.safeRate(realized, eligible);
  }

  /**
   * Calculate Daily Attendance Summary for a specific date
   */
  public static calculateDailySummary(dateStr: string): StaffAttendanceSummary {
    const staffList = StaffIdentityResolver.getStaffList().filter(s => s.is_active);
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_date === dateStr && r.attendance_type === 'daily'
    );

    let expectedToday = 0;
    let present = 0;
    let late = 0;
    let permission = 0;
    let sick = 0;
    let leave = 0;
    let officialDuty = 0;
    let absent = 0;
    let notCheckedIn = 0;
    let notCheckedOut = 0;

    for (const staff of staffList) {
      if (staff.requires_daily_attendance !== false && StaffWorkScheduleResolver.isWorkingDay(staff, dateStr)) {
        expectedToday++;
      }
    }

    for (const r of records) {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'permission') permission++;
      else if (r.status === 'sick') sick++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'official_duty') officialDuty++;
      else if (r.status === 'absent') absent++;

      if (r.check_in_at && !r.check_out_at && r.status !== 'permission' && r.status !== 'sick' && r.status !== 'leave' && r.status !== 'absent') {
        notCheckedOut++;
      }
    }

    const recordedCount = present + late + permission + sick + leave + officialDuty + absent;
    notCheckedIn = Math.max(0, expectedToday - recordedCount);

    const attended = present + late;
    const attendanceRate = this.calculatePresenceRate(present, late, expectedToday) ?? 0;
    const punctualityRate = this.calculatePunctualityRate(present, attended) ?? 0;

    return {
      total_staff: staffList.length,
      expected_today: expectedToday,
      present,
      late,
      permission,
      sick,
      leave,
      official_duty: officialDuty,
      absent,
      not_checked_in: notCheckedIn,
      not_checked_out: notCheckedOut,
      attendance_rate: Math.round(attendanceRate),
      punctuality_rate: Math.round(punctualityRate),
    };
  }

  /**
   * Calculate Teaching Stats for a specific date or period
   */
  public static calculateTeachingStats(dateOrMonth?: string): {
    totalScheduledSessions: number;
    eligibleSessions: number;
    attendedSessions: number;
    onTimeSessions: number;
    lateSessions: number;
    substitutedSessions: number;
    cancelledSessions: number;
    unrecordedSessions: number;
    teachingRate: number | null;
    onTimeRate: number | null;
    teacherStats: { staff_id: number; name: string; scheduled: number; attended: number; late: number; rate: number | null }[];
  } {
    const sessions = TeachingSessionService.getTeachingSessions(dateOrMonth);
    const records = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'teaching' && (!dateOrMonth || r.attendance_date.startsWith(dateOrMonth))
    );
    const teachers = StaffIdentityResolver.getStaffList().filter(s => s.staff_type === 'teacher' && s.is_active);

    const totalScheduledSessions = sessions.length;
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
    const eligibleSessions = totalScheduledSessions - cancelledSessions;
    const substitutedSessions = sessions.filter(s => Boolean(s.substitution_id)).length;

    let attendedSessions = 0;
    let onTimeSessions = 0;
    let lateSessions = 0;

    const recordBySession = new Map<number, StaffAttendanceRecord>();
    records.forEach(r => {
      if (r.context_id) recordBySession.set(r.context_id, r);
    });

    sessions.forEach(s => {
      if (s.status === 'cancelled') return;
      const rec = recordBySession.get(s.id);
      if (rec) {
        if (rec.status === 'present') {
          attendedSessions++;
          onTimeSessions++;
        } else if (rec.status === 'late') {
          attendedSessions++;
          lateSessions++;
        }
      }
    });

    const unrecordedSessions = Math.max(0, eligibleSessions - attendedSessions);
    const teachingRate = this.calculateTeachingRate(attendedSessions, eligibleSessions);
    const onTimeRate = this.calculatePunctualityRate(onTimeSessions, attendedSessions);

    const teacherStats = teachers.map(t => {
      const tSessions = sessions.filter(s => s.scheduled_teacher_staff_id === t.id && s.status !== 'cancelled');
      const tRecords = records.filter(r => r.staff_id === t.id);
      const attended = tRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const late = tRecords.filter(r => r.status === 'late').length;
      const scheduled = tSessions.length > 0 ? tSessions.length : Math.max(attended, 4);

      return {
        staff_id: t.id,
        name: t.name,
        scheduled,
        attended,
        late,
        rate: this.calculateTeachingRate(attended, scheduled),
      };
    });

    return {
      totalScheduledSessions,
      eligibleSessions,
      attendedSessions,
      onTimeSessions,
      lateSessions,
      substitutedSessions,
      cancelledSessions,
      unrecordedSessions,
      teachingRate,
      onTimeRate,
      teacherStats,
    };
  }

  /**
   * Calculate Trainer Stats for extracurricular activities
   */
  public static calculateTrainerStats(dateOrMonth?: string): {
    totalSessions: number;
    eligibleSessions: number;
    realizedSessions: number;
    attendedSessions: number;
    onTimeSessions: number;
    lateSessions: number;
    substitutedSessions: number;
    cancelledSessions: number;
    unrecordedSessions: number;
    trainingRate: number | null;
    realizationRate: number | null;
    trainerStats: { staff_id: number; name: string; extracurricular: string; attended: number; late: number; rate: number | null }[];
  } {
    const sessions = TrainingSessionService.getTrainingSessions(dateOrMonth);
    const records = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'training' && (!dateOrMonth || r.attendance_date.startsWith(dateOrMonth))
    );
    const trainers = StaffIdentityResolver.getStaffList().filter(s => s.staff_type === 'trainer' && s.is_active);
    const assignments = StaffAttendanceService.getCoachAssignments();

    const totalSessions = sessions.length;
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
    const eligibleSessions = totalSessions - cancelledSessions;
    const realizedSessions = sessions.filter(s => s.realization_status === 'realized').length;
    const substitutedSessions = sessions.filter(s => Boolean(s.substitution_id)).length;

    const presentSessions = records.filter(r => r.status === 'present').length;
    const lateSessions = records.filter(r => r.status === 'late').length;
    const attendedSessions = presentSessions + lateSessions;
    const unrecordedSessions = Math.max(0, eligibleSessions - attendedSessions);

    const trainingRate = this.calculateTrainingRate(attendedSessions, eligibleSessions);
    const realizationRate = this.calculateRealizationRate(realizedSessions, eligibleSessions);

    const trainerStats = trainers.map(t => {
      const tRecords = records.filter(r => r.staff_id === t.id);
      const assignment = assignments.find(a => a.staff_id === t.id);
      const attended = tRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const late = tRecords.filter(r => r.status === 'late').length;
      const tSessions = sessions.filter(s => s.primary_staff_id === t.id && s.status !== 'cancelled');
      const scheduled = tSessions.length > 0 ? tSessions.length : Math.max(attended, 2);

      return {
        staff_id: t.id,
        name: t.name,
        extracurricular: assignment ? assignment.extracurricular_name : 'Ekstrakurikuler',
        attended,
        late,
        rate: this.calculateTrainingRate(attended, scheduled),
      };
    });

    return {
      totalSessions,
      eligibleSessions,
      realizedSessions,
      attendedSessions,
      onTimeSessions: presentSessions,
      lateSessions,
      substitutedSessions,
      cancelledSessions,
      unrecordedSessions,
      trainingRate,
      realizationRate,
      trainerStats,
    };
  }
}
