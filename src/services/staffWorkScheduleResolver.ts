import { Staff, StaffWorkSchedule, DayOfWeek, AcademicCalendarEvent } from '../types';
import { INITIAL_ACADEMIC_CALENDAR_EVENTS } from '../data/initialData';
import { AuditService } from './auditService';

export class StaffWorkScheduleResolver {
  private static STORAGE_KEY = 'siuba_staff_work_schedules';
  private static HOLIDAYS_KEY = 'siuba_calendar_holidays';
  private static SPECIAL_DAYS_KEY = 'siuba_special_working_days';

  public static getInitialSchedules(): StaffWorkSchedule[] {
    const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return days.map((day, idx) => {
      const isWorking = day !== 'sunday';
      const isJumat = day === 'friday';
      const isSabtu = day === 'saturday';

      return {
        id: idx + 1,
        staff_group: 'all',
        day_of_week: day,
        check_in_open_at: '06:00',
        scheduled_start_at: '07:00',
        late_after: '07:15',
        check_out_open_at: isJumat ? '11:30' : isSabtu ? '13:00' : '15:30',
        scheduled_end_at: isJumat ? '12:00' : isSabtu ? '14:00' : '16:00',
        check_out_close_at: '21:00',
        is_working_day: isWorking,
        grace_period_minutes: 15,
        priority: 1,
        is_active: true,
      };
    });
  }

  public static getSchedules(): StaffWorkSchedule[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse work schedules', e);
    }
    const initial = this.getInitialSchedules();
    this.saveSchedules(initial);
    return initial;
  }

  public static saveSchedules(schedules: StaffWorkSchedule[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(schedules));
    } catch (e) {
      console.error('Failed to save work schedules', e);
    }
  }

  public static getDayOfWeekName(dateStr: string): DayOfWeek {
    const d = new Date(dateStr);
    const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday ...
    const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex] || 'monday';
  }

  public static isHoliday(dateStr: string): { isHoliday: boolean; eventName?: string } {
    try {
      // Check stored custom holidays first
      const storedHolidays = localStorage.getItem(this.HOLIDAYS_KEY);
      const customEvents: AcademicCalendarEvent[] = storedHolidays ? JSON.parse(storedHolidays) : INITIAL_ACADEMIC_CALENDAR_EVENTS;
      
      const match = customEvents.find(e => {
        if (e.type !== 'holiday') return false;
        return dateStr >= e.date_start && dateStr <= e.date_end;
      });

      if (match) {
        return { isHoliday: true, eventName: match.name };
      }
    } catch (e) {
      console.warn('Holiday check error', e);
    }

    return { isHoliday: false };
  }

  public static isSpecialWorkingDay(dateStr: string): { isSpecial: boolean; note?: string } {
    try {
      const stored = localStorage.getItem(this.SPECIAL_DAYS_KEY);
      if (stored) {
        const specialDays: { date: string; note: string }[] = JSON.parse(stored);
        const match = specialDays.find(d => d.date === dateStr);
        if (match) {
          return { isSpecial: true, note: match.note };
        }
      }
    } catch (e) {
      console.warn('Special working day check error', e);
    }
    return { isSpecial: false };
  }

  public static resolveSchedule(staff: Staff, dateStr: string): StaffWorkSchedule | null {
    const dayName = this.getDayOfWeekName(dateStr);
    const all = this.getSchedules();

    // Check effective date filter
    const activeSchedules = all.filter(s => {
      if (!s.is_active) return false;
      if (s.day_of_week !== dayName) return false;
      if (s.effective_start_date && dateStr < s.effective_start_date) return false;
      if (s.effective_end_date && dateStr > s.effective_end_date) return false;
      return true;
    });

    // 1. Priority: Specific individual staff override
    const individual = activeSchedules.find(s => s.staff_id === staff.id);
    if (individual) return individual;

    // 2. Priority: Staff group / type override
    const group = activeSchedules.find(s => s.staff_type === staff.staff_type || s.staff_group === staff.staff_type);
    if (group) return group;

    // 3. Priority: Institution default
    const def = activeSchedules.find(s => s.staff_group === 'all' || (!s.staff_id && !s.staff_type && !s.staff_group));
    return def || null;
  }

  public static resolveStaffSchedule(staff: Staff, dateStr: string): StaffWorkSchedule | null {
    return this.resolveSchedule(staff, dateStr);
  }

  public static resolveScheduleDetail(staff: Staff, dateStr: string): {
    schedule: StaffWorkSchedule | null;
    is_working_day: boolean;
    source: 'individual' | 'staff_type' | 'institution_default' | 'none';
    is_holiday: boolean;
    holiday_name?: string;
    is_special_working_day: boolean;
  } {
    const holidayCheck = this.isHoliday(dateStr);
    const specialDayCheck = this.isSpecialWorkingDay(dateStr);
    const schedule = this.resolveSchedule(staff, dateStr);

    let source: 'individual' | 'staff_type' | 'institution_default' | 'none' = 'none';
    if (schedule) {
      if (schedule.staff_id === staff.id) source = 'individual';
      else if (schedule.staff_type === staff.staff_type || schedule.staff_group === staff.staff_type) source = 'staff_type';
      else source = 'institution_default';
    }

    let isWorking = false;
    if (specialDayCheck.isSpecial) {
      isWorking = true;
    } else if (holidayCheck.isHoliday) {
      isWorking = false;
    } else if (schedule) {
      isWorking = schedule.is_working_day;
    }

    return {
      schedule,
      is_working_day: isWorking,
      source,
      is_holiday: holidayCheck.isHoliday,
      holiday_name: holidayCheck.eventName,
      is_special_working_day: specialDayCheck.isSpecial,
    };
  }

  public static isWorkingDay(staff: Staff, dateStr: string): boolean {
    const detail = this.resolveScheduleDetail(staff, dateStr);
    return detail.is_working_day;
  }

  /**
   * Parse "HH:mm" time string relative to dateStr into Unix timestamp (ms)
   */
  public static parseTimeToMs(dateStr: string, timeStr: string): number {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const d = new Date(dateStr);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.getTime();
  }

  public static calculateCheckInStatus(
    schedule: StaffWorkSchedule, 
    checkInTimeStr: string, 
    dateStr: string
  ): { status: 'present' | 'late'; late_minutes: number } {
    const lateThresholdMs = this.parseTimeToMs(dateStr, schedule.late_after || schedule.scheduled_start_at);
    const checkInMs = new Date(checkInTimeStr).getTime();

    if (checkInMs > lateThresholdMs) {
      const diffMs = checkInMs - this.parseTimeToMs(dateStr, schedule.scheduled_start_at);
      const lateMinutes = Math.max(1, Math.floor(diffMs / 60000));
      return { status: 'late', late_minutes: lateMinutes };
    }

    return { status: 'present', late_minutes: 0 };
  }

  public static calculateEarlyLeaveMinutes(
    schedule: StaffWorkSchedule, 
    checkOutTimeStr: string, 
    dateStr: string
  ): number {
    const scheduledEndMs = this.parseTimeToMs(dateStr, schedule.scheduled_end_at);
    const checkOutMs = new Date(checkOutTimeStr).getTime();

    if (checkOutMs < scheduledEndMs) {
      const diffMs = scheduledEndMs - checkOutMs;
      return Math.max(0, Math.floor(diffMs / 60000));
    }
    return 0;
  }

  public static updateSchedule(
    id: number, 
    data: Partial<StaffWorkSchedule>, 
    operatorName: string = 'System Admin'
  ): { success: boolean; schedule?: StaffWorkSchedule; message: string } {
    const schedules = this.getSchedules();
    const index = schedules.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, message: 'Jadwal kerja tidak ditemukan' };
    }

    const oldSchedule = { ...schedules[index] };
    const updated: StaffWorkSchedule = {
      ...oldSchedule,
      ...data,
      updated_at: new Date().toISOString()
    };

    schedules[index] = updated;
    this.saveSchedules(schedules);

    AuditService.log({
      event: 'staff_work_schedule_updated',
      auditable_type: 'StaffWorkSchedule',
      auditable_id: id,
      auditable_name: `Jadwal ${updated.day_of_week.toUpperCase()} (${updated.staff_group || 'all'})`,
      old_values: oldSchedule,
      new_values: updated,
      reason: `Pembaruan konfigurasi jadwal kerja oleh ${operatorName}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, schedule: updated, message: 'Jadwal kerja berhasil diperbarui' };
  }

  public static createSchedule(
    data: Omit<StaffWorkSchedule, 'id'>, 
    operatorName: string = 'System Admin'
  ): { success: boolean; schedule?: StaffWorkSchedule; message: string } {
    const schedules = this.getSchedules();
    const nextId = schedules.length > 0 ? Math.max(...schedules.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newSchedule: StaffWorkSchedule = {
      ...data,
      id: nextId,
      created_at: now,
      updated_at: now,
    };

    schedules.push(newSchedule);
    this.saveSchedules(schedules);

    AuditService.log({
      event: 'staff_work_schedule_created',
      auditable_type: 'StaffWorkSchedule',
      auditable_id: nextId,
      auditable_name: `Jadwal Baru ${newSchedule.day_of_week.toUpperCase()}`,
      new_values: newSchedule,
      reason: `Penambahan konfigurasi jadwal kerja baru oleh ${operatorName}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, schedule: newSchedule, message: 'Jadwal kerja baru berhasil dibuat' };
  }
}
