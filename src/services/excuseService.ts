import { ExcusalType, StudentExcusal, AttendanceSession } from '../types';
import { todayLocalDate } from '../utils/today';

export class ExcuseService {
  /**
   * Check if an excusal is active and approved for a specific attendance session.
   * Compares ISO datetime bounds with session start_at and end_at.
   */
  static isExcuseActiveForSession(excusal: StudentExcusal, session: AttendanceSession): boolean {
    if (excusal.status !== 'approved') {
      return false;
    }

    const excuseStart = new Date(excusal.start_at).getTime();
    const excuseEnd = new Date(excusal.end_at).getTime();
    const sessionStart = new Date(session.start_at).getTime();
    const sessionEnd = new Date(session.end_at).getTime();

    // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
    return excuseStart <= sessionEnd && excuseEnd >= sessionStart;
  }


  /**
   * Filter excusals active for today
   */
  static getTodayExcusals(excusals: StudentExcusal[], dateStr: string = todayLocalDate()): StudentExcusal[] {
    const targetDayStart = new Date(`${dateStr}T00:00:00`).getTime();
    const targetDayEnd = new Date(`${dateStr}T23:59:59`).getTime();

    return excusals.filter((e) => {
      const eStart = new Date(e.start_at).getTime();
      const eEnd = new Date(e.end_at).getTime();
      return eStart <= targetDayEnd && eEnd >= targetDayStart;
    });
  }


}
