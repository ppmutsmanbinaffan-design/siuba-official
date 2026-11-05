import { 
  DayOfWeek, 
  PrayerTimeCalendar, 
  RoutineSchedule, 
  RoutineScheduleOverride 
} from '../types';

export class RoutineScheduleService {
  /**
   * Convert Date "YYYY-MM-DD" to DayOfWeek
   */
  static getDayOfWeekFromDate(dateStr: string): DayOfWeek {
    const d = new Date(dateStr);
    const dayNum = d.getDay(); // 0 is Sunday, 1 is Monday...
    const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayNum] || 'monday';
  }

  /**
   * Get Effective Active Routine Schedules for a specific date
   * Incorporates Date checks, Frequency, Overrides, and Prayer Time Calendar priority
   */
  static getEffectiveSchedulesForDate(params: {
    date: string; // "YYYY-MM-DD"
    schedules: RoutineSchedule[];
    overrides?: RoutineScheduleOverride[];
    prayerCalendars?: PrayerTimeCalendar[];
  }): {
    schedule: RoutineSchedule;
    effectiveStartTime: string;
    effectivePresentUntil: string;
    effectiveLateUntil: string;
    effectiveEndTime: string;
    effectiveLocation: string;
    isCancelled: boolean;
    overrideReason?: string;
  }[] {
    const { date, schedules, overrides = [], prayerCalendars = [] } = params;
    const dayOfWeek = this.getDayOfWeekFromDate(date);

    // Look up Date-Specific Prayer Calendar entry if available (Offline Local Calendar)
    const prayerCalendarEntry = prayerCalendars.find((pc) => pc.date === date);

    const results: {
      schedule: RoutineSchedule;
      effectiveStartTime: string;
      effectivePresentUntil: string;
      effectiveLateUntil: string;
      effectiveEndTime: string;
      effectiveLocation: string;
      isCancelled: boolean;
      overrideReason?: string;
    }[] = [];

    // Filter active schedules matching frequency & date range
    const activeSchedules = schedules.filter((s) => {
      if (!s.is_active) return false;

      // Check Effective Date Range
      if (s.effective_start_date && date < s.effective_start_date) return false;
      if (s.effective_end_date && date > s.effective_end_date) return false;

      // Check Frequency
      if (s.frequency === 'daily') return true;
      if (s.frequency === 'weekly' && s.day_of_week === dayOfWeek) return true;
      if (s.frequency === 'selected_days' && s.days_of_week?.includes(dayOfWeek)) return true;

      return false;
    });

    for (const sched of activeSchedules) {
      // Check for Override on this date
      const override = overrides.find((o) => o.routine_schedule_id === sched.id && o.override_date === date);

      let isCancelled = false;
      let overrideReason = override?.reason;
      let startTime = sched.start_time;
      let presentUntil = sched.present_until;
      let lateUntil = sched.late_until;
      let endTime = sched.end_time;
      let location = sched.location || 'Masjid Utama / Asrama';

      if (override) {
        if (override.override_type === 'cancelled') {
          isCancelled = true;
        }
        if (override.new_start_time) startTime = override.new_start_time;
        if (override.new_end_time) endTime = override.new_end_time;
        if (override.new_location) location = override.new_location;
      }

      // Check for Offline Prayer Time Calendar Priority (if applicable to prayer codes)
      if (prayerCalendarEntry && !override?.new_start_time) {
        const actName = (sched.activity_name || '').toLowerCase();
        if (actName.includes('subuh')) {
          startTime = prayerCalendarEntry.subuh;
          presentUntil = this.addMinutesToTime(startTime, 10);
          lateUntil = this.addMinutesToTime(startTime, 25);
          endTime = this.addMinutesToTime(startTime, 40);
        } else if (actName.includes('dzuhur')) {
          startTime = prayerCalendarEntry.dzuhur;
          presentUntil = this.addMinutesToTime(startTime, 10);
          lateUntil = this.addMinutesToTime(startTime, 25);
          endTime = this.addMinutesToTime(startTime, 45);
        } else if (actName.includes('ashar')) {
          startTime = prayerCalendarEntry.ashar;
          presentUntil = this.addMinutesToTime(startTime, 10);
          lateUntil = this.addMinutesToTime(startTime, 25);
          endTime = this.addMinutesToTime(startTime, 45);
        } else if (actName.includes('maghrib')) {
          startTime = prayerCalendarEntry.maghrib;
          presentUntil = this.addMinutesToTime(startTime, 10);
          lateUntil = this.addMinutesToTime(startTime, 25);
          endTime = this.addMinutesToTime(startTime, 45);
        } else if (actName.includes('isya')) {
          startTime = prayerCalendarEntry.isya;
          presentUntil = this.addMinutesToTime(startTime, 10);
          lateUntil = this.addMinutesToTime(startTime, 25);
          endTime = this.addMinutesToTime(startTime, 45);
        }
      }

      results.push({
        schedule: sched,
        effectiveStartTime: startTime,
        effectivePresentUntil: presentUntil,
        effectiveLateUntil: lateUntil,
        effectiveEndTime: endTime,
        effectiveLocation: location,
        isCancelled,
        overrideReason,
      });
    }

    return results;
  }

  private static addMinutesToTime(timeStr: string, minutes: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const date = new Date();
    date.setHours(h, m + minutes, 0, 0);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
