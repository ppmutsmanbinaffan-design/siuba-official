import { Staff, StaffAttendanceRecord, StaffAbsenceRequest } from '../types';
import { StaffWorkScheduleResolver } from './staffWorkScheduleResolver';
import { StaffIdentityResolver } from './staffIdentityResolver';

export interface ValidationResult {
  valid: boolean;
  code: string;
  message: string;
  is_checkout_candidate?: boolean;
}

export class StaffAttendanceValidationService {
  public static validateDailyCheckIn(
    staff: Staff,
    dateStr: string,
    timeNowStr: string,
    existingRecords: StaffAttendanceRecord[],
    absenceRequests: StaffAbsenceRequest[]
  ): ValidationResult {
    if (!staff) {
      return { valid: false, code: 'STAFF_NOT_FOUND', message: 'Data staf tidak ditemukan' };
    }

    if (!staff.is_active) {
      return { valid: false, code: 'STAFF_INACTIVE', message: `Staf ${staff.name} berstatus non-aktif` };
    }

    if (staff.requires_daily_attendance === false) {
      return { valid: false, code: 'DAILY_ATTENDANCE_NOT_REQUIRED', message: `${staff.name} tidak diwajibkan presensi harian` };
    }

    if (!StaffIdentityResolver.isStaffEligibleOnDate(staff, dateStr)) {
      return { valid: false, code: 'STAFF_INELIGIBLE_DATE', message: `${staff.name} belum/tidak aktif bertugas pada tanggal ${dateStr}` };
    }

    const scheduleDetail = StaffWorkScheduleResolver.resolveScheduleDetail(staff, dateStr);
    if (!scheduleDetail.is_working_day) {
      const reason = scheduleDetail.is_holiday 
        ? `Hari Libur (${scheduleDetail.holiday_name})` 
        : `Bukan Hari Kerja (${StaffWorkScheduleResolver.getDayOfWeekName(dateStr).toUpperCase()})`;
      return { valid: false, code: 'NOT_WORKING_DAY', message: `${reason} untuk ${staff.name}` };
    }

    // Check approved absence on this date
    const approvedAbsence = absenceRequests.find(a => 
      a.staff_id === staff.id && 
      a.status === 'approved' && 
      dateStr >= a.start_at && 
      dateStr <= a.end_at
    );

    if (approvedAbsence) {
      const typeLabel = approvedAbsence.type === 'permission' ? 'Izin' 
        : approvedAbsence.type === 'sick' ? 'Sakit' 
        : approvedAbsence.type === 'leave' ? 'Cuti' : 'Dinas Luar';
      return { 
        valid: false, 
        code: 'APPROVED_ABSENCE_EXISTS', 
        message: `${staff.name} memiliki permohonan ${typeLabel} yang telah disetujui pada tanggal ini (${approvedAbsence.reason})` 
      };
    }

    const existingDaily = existingRecords.find(
      r => r.staff_id === staff.id && r.attendance_date === dateStr && r.attendance_type === 'daily'
    );

    if (existingDaily) {
      if (existingDaily.check_out_at) {
        return { 
          valid: false, 
          code: 'ALREADY_CHECKED_OUT', 
          message: `${staff.name} sudah menyelesaikan presensi check-in & check-out hari ini` 
        };
      }

      // Check if current time is within check_out window
      const schedule = scheduleDetail.schedule;
      const checkOutOpenMs = schedule 
        ? StaffWorkScheduleResolver.parseTimeToMs(dateStr, schedule.check_out_open_at)
        : StaffWorkScheduleResolver.parseTimeToMs(dateStr, '12:00');
      
      const nowMs = new Date(timeNowStr).getTime();

      if (nowMs >= checkOutOpenMs) {
        // Eligible for checkout
        return { 
          valid: true, 
          code: 'READY_FOR_CHECKOUT', 
          message: `Waktu check-out terbuka untuk ${staff.name}`,
          is_checkout_candidate: true 
        };
      }

      // Double-tap scan before checkout window
      const inTime = existingDaily.check_in_at ? existingDaily.check_in_at.substring(11, 16) : '-';
      return { 
        valid: false, 
        code: 'ALREADY_CHECKED_IN', 
        message: `${staff.name} sudah tercatat check-in pukul ${inTime}. Pintu check-out baru dibuka pukul ${schedule?.check_out_open_at || '12:00'}.` 
      };
    }

    // Check early check-in limit if schedule defines check_in_open_at
    if (scheduleDetail.schedule?.check_in_open_at) {
      const checkInOpenMs = StaffWorkScheduleResolver.parseTimeToMs(dateStr, scheduleDetail.schedule.check_in_open_at);
      const nowMs = new Date(timeNowStr).getTime();
      if (nowMs < checkInOpenMs) {
        return { 
          valid: false, 
          code: 'TOO_EARLY', 
          message: `Gerbang presensi belum dibuka (Buka pukul ${scheduleDetail.schedule.check_in_open_at})` 
        };
      }
    }

    return { valid: true, code: 'VALID', message: 'Valid untuk check-in harian' };
  }


  public static validateDailyAttendance(
    staff: Staff,
    dateStr: string,
    existingRecords: StaffAttendanceRecord[] = [],
    absenceRequests: StaffAbsenceRequest[] = []
  ): ValidationResult {
    const timeNowStr = new Date().toISOString();
    return this.validateDailyCheckIn(staff, dateStr, timeNowStr, existingRecords, absenceRequests);
  }



}
