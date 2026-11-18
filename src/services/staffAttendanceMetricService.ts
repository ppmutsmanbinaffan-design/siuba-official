import { 
  StaffAttendanceSummary} from '../types';
import { StaffIdentityResolver } from './staffIdentityResolver';
import { StaffWorkScheduleResolver } from './staffWorkScheduleResolver';
import { StaffAttendanceService } from './staffAttendanceService';
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


}
