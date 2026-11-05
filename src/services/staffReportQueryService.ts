import { 
  Staff, 
  StaffType, 
  StaffAttendanceRecord, 
  StaffAbsenceRequest, 
  TeachingSession, 
  TrainingSession,
  StaffAnalyticsFilters,
  StaffDailyOperationalItem,
  StaffMonthlyRecapItem,
  LateAnalysisItem,
  MissingCheckoutItem,
  DailyTeachingReportItem,
  TeacherMonthlyRecapItem,
  DailyTrainingReportItem,
  TrainerMonthlyRecapItem,
  ExtracurricularMonthlyRecapItem,
  StaffAbsenceReportItem,
  StaffCrossDomainSummaryItem,
  Staff360ProfileData,
  User
} from '../types';
import { StaffIdentityResolver } from './staffIdentityResolver';
import { StaffWorkScheduleResolver } from './staffWorkScheduleResolver';
import { StaffAttendanceService } from './staffAttendanceService';
import { TeachingSessionService } from './teachingSessionService';
import { TrainingSessionService } from './trainingSessionService';
import { StaffAttendanceMetricService } from './staffAttendanceMetricService';
import { ExtracurricularStaffAssignmentService } from './extracurricularStaffAssignmentService';

export class StaffReportQueryService {
  /**
   * Helper to filter staff list based on filters and user scopes
   */
  private static filterStaffList(filters: StaffAnalyticsFilters, user?: User): Staff[] {
    let list = StaffIdentityResolver.getStaffList().filter(s => s.is_active);

    // Apply user scope
    if (user?.role === 'teacher') {
      const self = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (self) list = list.filter(s => s.id === self.id);
      else list = list.filter(s => s.staff_type === 'teacher');
    } else if (user?.role === 'trainer') {
      const self = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (self) list = list.filter(s => s.id === self.id);
      else list = list.filter(s => s.staff_type === 'trainer');
    } else if (user?.role === 'dorm_head') {
      list = list.filter(s => s.staff_type === 'musyrif' || s.department?.toLowerCase().includes('asrama'));
    }

    // Apply filter object
    if (filters.staff_id && filters.staff_id !== 'ALL') {
      list = list.filter(s => s.id === Number(filters.staff_id));
    }
    if (filters.staff_type && filters.staff_type !== 'ALL') {
      list = list.filter(s => s.staff_type === filters.staff_type);
    }
    if (filters.employment_status && filters.employment_status !== 'ALL') {
      list = list.filter(s => s.employment_status === filters.employment_status);
    }

    return list;
  }

  // =========================================================================
  // REPORT 1: DAILY STAFF ATTENDANCE REPORT
  // =========================================================================
  public static getDailyAttendanceReport(filters: StaffAnalyticsFilters, user?: User): StaffDailyOperationalItem[] {
    const staffList = this.filterStaffList(filters, user);
    const dateStr = filters.date_from || new Date().toISOString().substring(0, 10);
    const records = StaffAttendanceService.getRecords().filter(
      r => r.attendance_date === dateStr && r.attendance_type === 'daily'
    );

    const recordByStaff = new Map<number, StaffAttendanceRecord>();
    records.forEach(r => recordByStaff.set(r.staff_id, r));

    const result: StaffDailyOperationalItem[] = [];

    staffList.forEach(staff => {
      const isWorkDay = StaffWorkScheduleResolver.isWorkingDay(staff, dateStr);
      if (staff.requires_daily_attendance === false && !isWorkDay) return;

      const schedule = StaffWorkScheduleResolver.resolveStaffSchedule(staff, dateStr);
      const rec = recordByStaff.get(staff.id);

      let status: StaffDailyOperationalItem['status'] = 'not_checked_in';
      let checkIn: string | null = null;
      let checkOut: string | null = null;
      let lateMinutes = 0;
      let earlyMinutes = 0;
      let method: StaffDailyOperationalItem['method'] = null;

      if (rec) {
        status = rec.status;
        checkIn = rec.check_in_at ? rec.check_in_at.substring(11, 16) : null;
        checkOut = rec.check_out_at ? rec.check_out_at.substring(11, 16) : null;
        lateMinutes = rec.late_minutes || 0;
        earlyMinutes = rec.early_leave_minutes || 0;
        method = rec.check_in_method || null;
      }

      if (filters.attendance_status && filters.attendance_status !== 'ALL') {
        if (status !== filters.attendance_status) return;
      }

      if (filters.attendance_method && filters.attendance_method !== 'ALL') {
        if (method !== filters.attendance_method) return;
      }

      result.push({
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        department: staff.department,
        expected_start: schedule?.scheduled_start_at || '07:00',
        expected_end: schedule?.scheduled_end_at || '16:00',
        check_in_at: checkIn,
        check_out_at: checkOut,
        status,
        late_minutes: lateMinutes,
        early_leave_minutes: earlyMinutes,
        method,
        schedule_name: schedule ? `Shift Standar (${schedule.day_of_week})` : 'Reguler'
      });
    });

    return result;
  }

  // =========================================================================
  // REPORT 2: MONTHLY STAFF RECAP REPORT
  // =========================================================================
  public static getMonthlyStaffRecapReport(filters: StaffAnalyticsFilters, user?: User): StaffMonthlyRecapItem[] {
    const staffList = this.filterStaffList(filters, user);
    const startDate = filters.date_from;
    const endDate = filters.date_to;
    const allRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'daily' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );

    const result: StaffMonthlyRecapItem[] = [];

    staffList.forEach(staff => {
      // Calculate total expected working days in period
      let workingDays = 0;
      const cur = new Date(startDate);
      const end = new Date(endDate);
      while (cur <= end) {
        const dStr = cur.toISOString().substring(0, 10);
        if (staff.requires_daily_attendance !== false && StaffWorkScheduleResolver.isWorkingDay(staff, dStr)) {
          workingDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }

      const sRecords = allRecords.filter(r => r.staff_id === staff.id);
      let present = 0;
      let late = 0;
      let permission = 0;
      let sick = 0;
      let leave = 0;
      let duty = 0;
      let absent = 0;
      let missingCheckout = 0;
      let totalLateMinutes = 0;
      let totalEarlyMinutes = 0;

      sRecords.forEach(r => {
        if (r.status === 'present') present++;
        else if (r.status === 'late') {
          late++;
          totalLateMinutes += (r.late_minutes || 0);
        } else if (r.status === 'permission') permission++;
        else if (r.status === 'sick') sick++;
        else if (r.status === 'leave') leave++;
        else if (r.status === 'official_duty') duty++;
        else if (r.status === 'absent') absent++;

        if (r.early_leave_minutes) totalEarlyMinutes += r.early_leave_minutes;

        if (r.check_in_at && !r.check_out_at && !['permission', 'sick', 'leave', 'absent'].includes(r.status)) {
          missingCheckout++;
        }
      });

      const presenceRate = StaffAttendanceMetricService.calculatePresenceRate(present, late, workingDays);
      const onTimeRate = StaffAttendanceMetricService.calculatePunctualityRate(present, present + late);
      const excusedRate = StaffAttendanceMetricService.calculateExcusedRate(permission, sick, leave, duty, workingDays);
      const alphaRate = StaffAttendanceMetricService.calculateAlphaRate(absent, workingDays);

      result.push({
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        department: staff.department,
        working_days: workingDays,
        present_count: present,
        late_count: late,
        permission_count: permission,
        sick_count: sick,
        leave_count: leave,
        official_duty_count: duty,
        absent_count: absent,
        missing_checkout_count: missingCheckout,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyMinutes,
        presence_rate: presenceRate,
        on_time_rate: onTimeRate,
        excused_rate: excusedRate,
        alpha_rate: alphaRate,
      });
    });

    return result;
  }

  // =========================================================================
  // REPORT 3: LATE ANALYSIS REPORT
  // =========================================================================
  public static getLateAnalysisReport(filters: StaffAnalyticsFilters, user?: User): LateAnalysisItem[] {
    const staffList = this.filterStaffList(filters, user);
    const startDate = filters.date_from;
    const endDate = filters.date_to;
    const records = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'daily' &&
      r.status === 'late' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );

    const result: LateAnalysisItem[] = [];

    staffList.forEach(staff => {
      const sRecords = records.filter(r => r.staff_id === staff.id);
      if (sRecords.length === 0) return;

      const lateDaysCount = sRecords.length;
      const totalLateMinutes = sRecords.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
      const maxLateMinutes = Math.max(...sRecords.map(r => r.late_minutes || 0));
      const averageLateMinutes = Math.round((totalLateMinutes / lateDaysCount) * 10) / 10;
      const lastLateDate = sRecords.map(r => r.attendance_date).sort().reverse()[0] || '-';

      result.push({
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        department: staff.department,
        late_days_count: lateDaysCount,
        total_late_minutes: totalLateMinutes,
        average_late_minutes: averageLateMinutes,
        max_late_minutes: maxLateMinutes,
        last_late_date: lastLateDate,
      });
    });

    return result.sort((a, b) => b.total_late_minutes - a.total_late_minutes);
  }

  // =========================================================================
  // REPORT 4: MISSING CHECKOUT REPORT
  // =========================================================================
  public static getMissingCheckoutReport(filters: StaffAnalyticsFilters, user?: User): MissingCheckoutItem[] {
    const staffList = this.filterStaffList(filters, user);
    const staffMap = new Map<number, Staff>();
    staffList.forEach(s => staffMap.set(s.id, s));

    const startDate = filters.date_from;
    const endDate = filters.date_to;
    const records = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'daily' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate &&
      r.check_in_at && 
      !r.check_out_at &&
      !['permission', 'sick', 'leave', 'absent'].includes(r.status) &&
      staffMap.has(r.staff_id)
    );

    return records.map(r => {
      const staff = staffMap.get(r.staff_id)!;
      const schedule = StaffWorkScheduleResolver.resolveStaffSchedule(staff, r.attendance_date);
      return {
        record_id: r.id,
        date: r.attendance_date,
        staff_id: staff.id,
        staff_name: staff.name,
        staff_type: staff.staff_type,
        check_in_at: r.check_in_at ? r.check_in_at.substring(11, 16) : '-',
        expected_end: schedule?.scheduled_end_at || '16:00',
        department: staff.department,
        method: r.check_in_method || undefined,
      };
    });
  }

  // =========================================================================
  // REPORT 5: DAILY TEACHING REPORT
  // =========================================================================
  public static getDailyTeachingReport(filters: StaffAnalyticsFilters, user?: User): DailyTeachingReportItem[] {
    const startDate = filters.date_from;
    const endDate = filters.date_to;
    let sessions = TeachingSessionService.getTeachingSessions();

    sessions = sessions.filter(s => s.session_date >= startDate && s.session_date <= endDate);

    if (filters.classroom_id && filters.classroom_id !== 'ALL') {
      sessions = sessions.filter(s => s.classroom_id === Number(filters.classroom_id));
    }
    if (filters.subject_id && filters.subject_id !== 'ALL') {
      sessions = sessions.filter(s => s.subject_id === Number(filters.subject_id));
    }
    if (filters.staff_id && filters.staff_id !== 'ALL') {
      const sId = Number(filters.staff_id);
      sessions = sessions.filter(s => s.scheduled_teacher_staff_id === sId || s.actual_teacher_staff_id === sId);
    }

    if (user?.role === 'teacher') {
      const self = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (self) {
        sessions = sessions.filter(s => s.scheduled_teacher_staff_id === self.id || s.actual_teacher_staff_id === self.id);
      }
    }

    const records = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'teaching' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );
    const recordBySession = new Map<number, StaffAttendanceRecord>();
    records.forEach(r => {
      if (r.context_id) recordBySession.set(r.context_id, r);
    });

    return sessions.map(s => {
      const rec = recordBySession.get(s.id);
      const isSub = Boolean(s.substitution_id || (s.actual_teacher_staff_id && s.actual_teacher_staff_id !== s.scheduled_teacher_staff_id));

      return {
        session_id: s.id,
        session_date: s.session_date,
        period_order: s.period_number || 1,
        time_slot: `${s.scheduled_start_at} - ${s.scheduled_end_at}`,
        class_name: s.classroom_name,
        subject_name: s.subject_name,
        scheduled_teacher_name: s.scheduled_teacher_name,
        actual_teacher_name: s.actual_teacher_name || s.scheduled_teacher_name,
        is_substituted: isSub,
        substitution_reason: s.substitution_reason || undefined,
        check_in_at: rec?.check_in_at ? rec.check_in_at.substring(11, 16) : null,
        status: rec ? rec.status : 'unrecorded',
        late_minutes: rec?.late_minutes || 0,
        check_out_at: rec?.check_out_at ? rec.check_out_at.substring(11, 16) : null,
        session_status: s.status,
        student_count: 0,
      };
    });
  }

  // =========================================================================
  // REPORT 6: TEACHER MONTHLY RECAP REPORT
  // =========================================================================
  public static getTeacherMonthlyRecapReport(filters: StaffAnalyticsFilters, user?: User): TeacherMonthlyRecapItem[] {
    const teachers = this.filterStaffList(filters, user).filter(s => s.staff_type === 'teacher');
    const startDate = filters.date_from;
    const endDate = filters.date_to;

    const allSessions = TeachingSessionService.getTeachingSessions().filter(s => 
      s.session_date >= startDate && s.session_date <= endDate
    );
    const allRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'teaching' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );

    const recordBySession = new Map<number, StaffAttendanceRecord>();
    allRecords.forEach(r => {
      if (r.context_id) recordBySession.set(r.context_id, r);
    });

    return teachers.map(teacher => {
      const scheduledSessions = allSessions.filter(s => s.scheduled_teacher_staff_id === teacher.id);
      const cancelledSessions = scheduledSessions.filter(s => s.status === 'cancelled').length;
      const eligibleSessions = scheduledSessions.length - cancelledSessions;

      let attendedSessions = 0;
      let onTimeSessions = 0;
      let lateSessions = 0;
      let substitutedAway = 0;
      let totalLateMinutes = 0;

      scheduledSessions.forEach(s => {
        if (s.status === 'cancelled') return;
        if (s.substitution_id && s.actual_teacher_staff_id !== teacher.id) {
          substitutedAway++;
          return;
        }

        const rec = recordBySession.get(s.id);
        if (rec) {
          if (rec.status === 'present') {
            attendedSessions++;
            onTimeSessions++;
          } else if (rec.status === 'late') {
            attendedSessions++;
            lateSessions++;
            totalLateMinutes += (rec.late_minutes || 0);
          }
        }
      });

      // Sessions where this teacher stepped in as substitute for another
      const substituteTaught = allSessions.filter(s => 
        s.actual_teacher_staff_id === teacher.id && 
        s.scheduled_teacher_staff_id !== teacher.id &&
        s.status !== 'cancelled'
      ).length;

      const unrecordedSessions = Math.max(0, eligibleSessions - attendedSessions - substitutedAway);
      const teachingRate = StaffAttendanceMetricService.calculateTeachingRate(attendedSessions, eligibleSessions);
      const onTimeRate = StaffAttendanceMetricService.calculatePunctualityRate(onTimeSessions, attendedSessions);

      return {
        staff_id: teacher.id,
        teacher_name: teacher.name,
        staff_number: teacher.staff_number,
        eligible_sessions: eligibleSessions,
        attended_sessions: attendedSessions,
        on_time_sessions: onTimeSessions,
        late_sessions: lateSessions,
        substituted_away_sessions: substitutedAway,
        substitute_taught_sessions: substituteTaught,
        cancelled_sessions: cancelledSessions,
        unrecorded_sessions: unrecordedSessions,
        teaching_rate: teachingRate,
        on_time_rate: onTimeRate,
        total_late_minutes: totalLateMinutes,
      };
    });
  }

  // =========================================================================
  // REPORT 7: DAILY TRAINING REPORT
  // =========================================================================
  public static getDailyTrainingReport(filters: StaffAnalyticsFilters, user?: User): DailyTrainingReportItem[] {
    const startDate = filters.date_from;
    const endDate = filters.date_to;
    let sessions = TrainingSessionService.getTrainingSessions();

    sessions = sessions.filter(s => s.session_date >= startDate && s.session_date <= endDate);

    if (filters.extracurricular_id && filters.extracurricular_id !== 'ALL') {
      sessions = sessions.filter(s => s.extracurricular_id === Number(filters.extracurricular_id));
    }
    if (filters.staff_id && filters.staff_id !== 'ALL') {
      const sId = Number(filters.staff_id);
      sessions = sessions.filter(s => s.primary_staff_id === sId || s.actual_primary_staff_id === sId);
    }

    if (user?.role === 'trainer') {
      const self = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (self) {
        sessions = sessions.filter(s => s.primary_staff_id === self.id || s.actual_primary_staff_id === self.id);
      }
    }

    const records = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'training' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );
    const recordBySession = new Map<number, StaffAttendanceRecord>();
    records.forEach(r => {
      if (r.context_id) recordBySession.set(r.context_id, r);
    });

    return sessions.map(s => {
      const rec = recordBySession.get(s.id);
      const isSub = Boolean(s.substitution_id || (s.actual_primary_staff_id && s.actual_primary_staff_id !== s.primary_staff_id));

      return {
        session_id: s.id,
        session_date: s.session_date,
        extracurricular_name: s.extracurricular_name,
        scheduled_time: `${s.scheduled_start_at} - ${s.scheduled_end_at}`,
        scheduled_trainer_name: s.primary_staff_name || 'Belum Ditugaskan',
        actual_trainer_name: s.actual_primary_staff_name || s.primary_staff_name || 'Belum Ditugaskan',
        is_substituted: isSub,
        check_in_at: rec?.check_in_at ? rec.check_in_at.substring(11, 16) : null,
        status: rec ? rec.status : 'unrecorded',
        late_minutes: rec?.late_minutes || 0,
        check_out_at: rec?.check_out_at ? rec.check_out_at.substring(11, 16) : null,
        realization_status: s.realization_status,
        topic: s.topic || undefined,
        student_present_count: s.student_present_count || 0,
      };
    });
  }

  // =========================================================================
  // REPORT 8: TRAINER MONTHLY RECAP REPORT
  // =========================================================================
  public static getTrainerMonthlyRecapReport(filters: StaffAnalyticsFilters, user?: User): TrainerMonthlyRecapItem[] {
    const trainers = this.filterStaffList(filters, user).filter(s => s.staff_type === 'trainer');
    const startDate = filters.date_from;
    const endDate = filters.date_to;

    const allSessions = TrainingSessionService.getTrainingSessions().filter(s => 
      s.session_date >= startDate && s.session_date <= endDate
    );
    const allRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'training' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );
    const assignments = ExtracurricularStaffAssignmentService.getAssignments();

    const recordBySession = new Map<number, StaffAttendanceRecord>();
    allRecords.forEach(r => {
      if (r.context_id) recordBySession.set(r.context_id, r);
    });

    return trainers.map(trainer => {
      const assigned = assignments.find(a => a.staff_id === trainer.id);
      const scheduledSessions = allSessions.filter(s => s.primary_staff_id === trainer.id);
      const cancelledSessions = scheduledSessions.filter(s => s.status === 'cancelled').length;
      const eligibleSessions = scheduledSessions.length - cancelledSessions;

      let attendedSessions = 0;
      let onTimeSessions = 0;
      let lateSessions = 0;
      let substitutedAway = 0;
      let realizedSessions = 0;
      let totalLateMinutes = 0;

      scheduledSessions.forEach(s => {
        if (s.status === 'cancelled') return;
        if (s.substitution_id && s.actual_primary_staff_id !== trainer.id) {
          substitutedAway++;
          return;
        }

        if (s.realization_status === 'realized') realizedSessions++;

        const rec = recordBySession.get(s.id);
        if (rec) {
          if (rec.status === 'present') {
            attendedSessions++;
            onTimeSessions++;
          } else if (rec.status === 'late') {
            attendedSessions++;
            lateSessions++;
            totalLateMinutes += (rec.late_minutes || 0);
          }
        }
      });

      const substituteTaught = allSessions.filter(s => 
        s.actual_primary_staff_id === trainer.id && 
        s.primary_staff_id !== trainer.id &&
        s.status !== 'cancelled'
      ).length;

      const unrecordedSessions = Math.max(0, eligibleSessions - attendedSessions - substitutedAway);
      const needsReviewCount = scheduledSessions.filter(s => 
        s.status !== 'cancelled' && 
        (s.realization_status !== 'realized' || !recordBySession.has(s.id))
      ).length;

      const trainingRate = StaffAttendanceMetricService.calculateTrainingRate(attendedSessions, eligibleSessions);
      const realizationRate = StaffAttendanceMetricService.calculateRealizationRate(realizedSessions, eligibleSessions);

      return {
        staff_id: trainer.id,
        trainer_name: trainer.name,
        staff_number: trainer.staff_number,
        primary_extracurricular: assigned ? assigned.extracurricular_name : 'Ekstrakurikuler',
        eligible_sessions: eligibleSessions,
        attended_sessions: attendedSessions,
        on_time_sessions: onTimeSessions,
        late_sessions: lateSessions,
        substituted_away_sessions: substitutedAway,
        substitute_taught_sessions: substituteTaught,
        cancelled_sessions: cancelledSessions,
        unrecorded_sessions: unrecordedSessions,
        realized_sessions: realizedSessions,
        needs_review_count: needsReviewCount,
        training_rate: trainingRate,
        realization_rate: realizationRate,
        total_late_minutes: totalLateMinutes,
      };
    });
  }

  // =========================================================================
  // REPORT 9: EXTRACURRICULAR MONTHLY REALIZATION REPORT
  // =========================================================================
  public static getExtracurricularMonthlyReport(filters: StaffAnalyticsFilters): ExtracurricularMonthlyRecapItem[] {
    const startDate = filters.date_from;
    const endDate = filters.date_to;
    const allSessions = TrainingSessionService.getTrainingSessions().filter(s => 
      s.session_date >= startDate && s.session_date <= endDate
    );
    const allRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'training' &&
      r.attendance_date >= startDate &&
      r.attendance_date <= endDate
    );

    const recordBySession = new Map<number, StaffAttendanceRecord>();
    allRecords.forEach(r => {
      if (r.context_id) recordBySession.set(r.context_id, r);
    });

    const ekskulMap = new Map<number, { name: string; sessions: TrainingSession[] }>();
    allSessions.forEach(s => {
      if (!ekskulMap.has(s.extracurricular_id)) {
        ekskulMap.set(s.extracurricular_id, { name: s.extracurricular_name, sessions: [] });
      }
      ekskulMap.get(s.extracurricular_id)!.sessions.push(s);
    });

    const result: ExtracurricularMonthlyRecapItem[] = [];

    ekskulMap.forEach((val, ekskulId) => {
      const totalSessions = val.sessions.length;
      const cancelledSessions = val.sessions.filter(s => s.status === 'cancelled').length;
      const eligibleSessions = totalSessions - cancelledSessions;
      const realizedSessions = val.sessions.filter(s => s.realization_status === 'realized').length;

      let trainerAttended = 0;
      let trainerLate = 0;
      let totalStudents = 0;
      let sessionsWithStudents = 0;

      val.sessions.forEach(s => {
        if (s.status === 'cancelled') return;
        const rec = recordBySession.get(s.id);
        if (rec) {
          if (rec.status === 'present') trainerAttended++;
          else if (rec.status === 'late') {
            trainerAttended++;
            trainerLate++;
          }
        }
        if (s.student_present_count) {
          totalStudents += s.student_present_count;
          sessionsWithStudents++;
        }
      });

      const avgStudents = sessionsWithStudents > 0 ? Math.round(totalStudents / sessionsWithStudents) : 0;
      const trainerRate = StaffAttendanceMetricService.calculateTrainingRate(trainerAttended, eligibleSessions);
      const realRate = StaffAttendanceMetricService.calculateRealizationRate(realizedSessions, eligibleSessions);
      const needsReview = val.sessions.filter(s => s.status !== 'cancelled' && s.realization_status !== 'realized').length;

      result.push({
        extracurricular_id: ekskulId,
        extracurricular_name: val.name,
        total_sessions: totalSessions,
        eligible_sessions: eligibleSessions,
        realized_sessions: realizedSessions,
        cancelled_sessions: cancelledSessions,
        trainer_attended_count: trainerAttended,
        trainer_late_count: trainerLate,
        trainer_attendance_rate: trainerRate,
        realization_rate: realRate,
        avg_student_attendance: avgStudents,
        needs_review_count: needsReview,
      });
    });

    return result;
  }

  // =========================================================================
  // REPORT 10: STAFF ABSENCE REPORT (IZIN / SAKIT / CUTI / DINAS)
  // =========================================================================
  public static getStaffAbsenceReport(filters: StaffAnalyticsFilters, user?: User): StaffAbsenceReportItem[] {
    const staffList = this.filterStaffList(filters, user);
    const staffMap = new Map<number, Staff>();
    staffList.forEach(s => staffMap.set(s.id, s));

    const startDate = filters.date_from;
    const endDate = filters.date_to;
    const requests = StaffAttendanceService.getAbsenceRequests().filter(req => 
      req.start_at <= endDate && 
      req.end_at >= startDate &&
      staffMap.has(req.staff_id)
    );

    return requests.map(req => {
      const staff = staffMap.get(req.staff_id)!;
      // Calculate working days duration according to staff schedule
      let durationDays = 0;
      const cur = new Date(req.start_at);
      const end = new Date(req.end_at);
      while (cur <= end) {
        const dStr = cur.toISOString().substring(0, 10);
        if (StaffWorkScheduleResolver.isWorkingDay(staff, dStr)) {
          durationDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (durationDays === 0) durationDays = 1;

      return {
        id: req.id,
        staff_id: staff.id,
        staff_name: staff.name,
        staff_type: staff.staff_type,
        type: req.type,
        start_at: req.start_at,
        end_at: req.end_at,
        duration_days: durationDays,
        reason: req.reason,
        status: req.status,
        requested_at: req.requested_at,
        approved_by: req.approved_by,
        approved_at: req.approved_at,
      };
    });
  }

  // =========================================================================
  // REPORT 11: CROSS-DOMAIN OPERATIONAL SUMMARY (SIDE-BY-SIDE)
  // =========================================================================
  public static getStaffCrossDomainSummary(filters: StaffAnalyticsFilters, user?: User): StaffCrossDomainSummaryItem[] {
    const staffList = this.filterStaffList(filters, user);
    const today = filters.date_from || new Date().toISOString().substring(0, 10);
    const currentMonth = today.substring(0, 7);

    const allDailyRecords = StaffAttendanceService.getRecords().filter(r => r.attendance_type === 'daily');
    const allTeachingSessions = TeachingSessionService.getTeachingSessions();
    const allTrainingSessions = TrainingSessionService.getTrainingSessions();
    const activeAbsences = StaffAttendanceService.getAbsenceRequests().filter(r => 
      r.status === 'approved' && r.start_at <= today && r.end_at >= today
    );

    return staffList.map(staff => {
      // Daily today
      const todayDaily = allDailyRecords.find(r => r.staff_id === staff.id && r.attendance_date === today);
      const todayAbsence = activeAbsences.find(r => r.staff_id === staff.id);

      let dailyStatusToday = 'Belum Hadir';
      let dailyCheckIn: string | undefined;

      if (todayAbsence) {
        dailyStatusToday = `Izin: ${todayAbsence.type.toUpperCase()}`;
      } else if (todayDaily) {
        dailyStatusToday = todayDaily.status.toUpperCase();
        dailyCheckIn = todayDaily.check_in_at ? todayDaily.check_in_at.substring(11, 16) : undefined;
      }

      // Teaching today
      let teachingToday = '-';
      if (staff.staff_type === 'teacher') {
        const tSessions = allTeachingSessions.filter(s => 
          s.session_date === today && 
          (s.scheduled_teacher_staff_id === staff.id || s.actual_teacher_staff_id === staff.id) &&
          s.status !== 'cancelled'
        );
        if (tSessions.length > 0) {
          const completed = tSessions.filter(s => s.status === 'completed').length;
          teachingToday = `${completed}/${tSessions.length} Sesi`;
        } else {
          teachingToday = '0 Sesi';
        }
      }

      // Training today
      let trainingToday = '-';
      if (staff.staff_type === 'trainer') {
        const trSessions = allTrainingSessions.filter(s => 
          s.session_date === today && 
          (s.primary_staff_id === staff.id || s.actual_primary_staff_id === staff.id) &&
          s.status !== 'cancelled'
        );
        if (trSessions.length > 0) {
          const realized = trSessions.filter(s => s.realization_status === 'realized').length;
          trainingToday = `${realized}/${trSessions.length} Sesi`;
        } else {
          trainingToday = '0 Sesi';
        }
      }

      // Monthly rates
      const mDaily = allDailyRecords.filter(r => r.staff_id === staff.id && r.attendance_date.startsWith(currentMonth));
      const mPresent = mDaily.filter(r => r.status === 'present' || r.status === 'late').length;
      const mExpectedDays = 24; // Standard month working days baseline
      const dailyRate = StaffAttendanceMetricService.calculatePresenceRate(mPresent, 0, mExpectedDays);

      let teachingRate: number | null = null;
      if (staff.staff_type === 'teacher') {
        const mTSessions = allTeachingSessions.filter(s => s.scheduled_teacher_staff_id === staff.id && s.session_date.startsWith(currentMonth) && s.status !== 'cancelled');
        const attended = mTSessions.filter(s => s.status === 'completed').length;
        teachingRate = StaffAttendanceMetricService.calculateTeachingRate(attended, mTSessions.length);
      }

      let trainingRate: number | null = null;
      if (staff.staff_type === 'trainer') {
        const mTrSessions = allTrainingSessions.filter(s => s.primary_staff_id === staff.id && s.session_date.startsWith(currentMonth) && s.status !== 'cancelled');
        const attended = mTrSessions.filter(s => s.realization_status === 'realized').length;
        trainingRate = StaffAttendanceMetricService.calculateTrainingRate(attended, mTrSessions.length);
      }

      return {
        staff_id: staff.id,
        staff_name: staff.name,
        staff_number: staff.staff_number,
        staff_type: staff.staff_type,
        department: staff.department,
        daily_status_today: dailyStatusToday,
        daily_check_in: dailyCheckIn,
        teaching_today: teachingToday,
        training_today: trainingToday,
        current_month_daily_rate: dailyRate,
        current_month_teaching_rate: teachingRate,
        current_month_training_rate: trainingRate,
        active_absence: todayAbsence ? todayAbsence.reason : null,
      };
    });
  }

  // =========================================================================
  // REPORT 12: STAFF 360 PROFILE & HISTORY
  // =========================================================================
  public static getStaff360Profile(staffId: number, periodMonth?: string): Staff360ProfileData | null {
    const staff = StaffIdentityResolver.resolveById(staffId);
    if (!staff) return null;

    const monthStr = periodMonth || new Date().toISOString().substring(0, 7);
    const schedule = StaffWorkScheduleResolver.resolveStaffSchedule(staff, `${monthStr}-01`);

    const allRecords = StaffAttendanceService.getRecords().filter(r => r.staff_id === staffId);
    const monthRecords = allRecords.filter(r => r.attendance_date.startsWith(monthStr));
    const absences = StaffAttendanceService.getAbsenceRequests().filter(r => r.staff_id === staffId);

    // Daily summary for the month
    const dailyMonth = monthRecords.filter(r => r.attendance_type === 'daily');
    let present = 0;
    let late = 0;
    let permission = 0;
    let sick = 0;
    let leave = 0;
    let duty = 0;
    let absent = 0;
    let lateMinutes = 0;

    dailyMonth.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') {
        late++;
        lateMinutes += (r.late_minutes || 0);
      } else if (r.status === 'permission') permission++;
      else if (r.status === 'sick') sick++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'official_duty') duty++;
      else if (r.status === 'absent') absent++;
    });

    const workingDays = 24;
    const presenceRate = StaffAttendanceMetricService.calculatePresenceRate(present, late, workingDays);

    let teachingSummary: Staff360ProfileData['teaching_summary'];
    if (staff.staff_type === 'teacher') {
      const tSessions = TeachingSessionService.getTeachingSessions().filter(s => 
        s.scheduled_teacher_staff_id === staff.id && s.session_date.startsWith(monthStr)
      );
      const cancelled = tSessions.filter(s => s.status === 'cancelled').length;
      const eligible = tSessions.length - cancelled;
      const attended = tSessions.filter(s => s.status === 'completed').length;
      const lateT = monthRecords.filter(r => r.attendance_type === 'teaching' && r.status === 'late').length;
      const sub = tSessions.filter(s => Boolean(s.substitution_id)).length;

      teachingSummary = {
        eligible,
        attended,
        late: lateT,
        substituted: sub,
        cancelled,
        teaching_rate: StaffAttendanceMetricService.calculateTeachingRate(attended, eligible),
      };
    }

    let trainingSummary: Staff360ProfileData['training_summary'];
    if (staff.staff_type === 'trainer') {
      const trSessions = TrainingSessionService.getTrainingSessions().filter(s => 
        s.primary_staff_id === staff.id && s.session_date.startsWith(monthStr)
      );
      const cancelled = trSessions.filter(s => s.status === 'cancelled').length;
      const eligible = trSessions.length - cancelled;
      const attended = trSessions.filter(s => s.status === 'completed' || s.realization_status === 'realized').length;
      const lateTr = monthRecords.filter(r => r.attendance_type === 'training' && r.status === 'late').length;
      const realized = trSessions.filter(s => s.realization_status === 'realized').length;

      trainingSummary = {
        eligible,
        attended,
        late: lateTr,
        realized,
        training_rate: StaffAttendanceMetricService.calculateTrainingRate(attended, eligible),
      };
    }

    return {
      staff,
      work_schedule_info: {
        schedule_name: schedule ? `Shift Standar (${schedule.day_of_week})` : 'Reguler',
        effective_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
        standard_in: schedule?.scheduled_start_at || '07:00',
        standard_out: schedule?.scheduled_end_at || '16:00',
      },
      daily_summary: {
        working_days: workingDays,
        present,
        late,
        permission,
        sick,
        leave,
        official_duty: duty,
        absent,
        presence_rate: presenceRate,
        total_late_minutes: lateMinutes,
      },
      teaching_summary: teachingSummary,
      training_summary: trainingSummary,
      recent_records: allRecords.slice(-15).reverse(),
      absence_history: absences,
    };
  }

  // =========================================================================
  // EXPORT UTILITIES: CSV & CLEAN PRINTABLE BUILDER
  // =========================================================================
  public static exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public static printDocument(title: string, contentHtml: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up untuk mencetak laporan.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - SIUBA Pesantren</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #18181b; font-size: 12px; }
            .kop { border-bottom: 3px double #18181b; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
            .kop h2 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop h3 { margin: 2px 0; font-size: 14px; font-weight: normal; color: #3f3f46; }
            .kop p { margin: 2px 0; font-size: 10px; color: #71717a; }
            .report-title { text-align: center; margin: 16px 0; }
            .report-title h1 { margin: 0; font-size: 16px; font-weight: bold; }
            .report-title p { margin: 2px 0; font-size: 11px; color: #52525b; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; }
            th { background-color: #f4f4f5; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .signature-box { margin-top: 40px; display: flex; justify-content: space-between; }
            .sign-col { text-align: center; width: 200px; }
            .sign-line { margin-top: 60px; border-bottom: 1px solid #18181b; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="kop">
            <h2>PONDOK PESANTREN TAHFIDZ UTSMAN BIN AFFAN</h2>
            <h3>SISTEM INFORMASI UTSMAN BIN AFFAN (SIUBA v1.1.4 PRODUCTION)</h3>
            <p>Sekretariat Pusat: Jl. Pesantren No. 01, Kompleks Kampus Putra & Putri | Telp: (021) 8899-7766</p>
          </div>
          ${contentHtml}
          <div class="signature-box">
            <div class="sign-col">
              <div>Mengetahui,</div>
              <div style="font-weight:bold; margin-top: 2px;">Kepala Bagian SDM / HRD</div>
              <div class="sign-line"></div>
              <div style="margin-top: 4px; font-size: 10px;">NIP. 19850612 201101 1 002</div>
            </div>
            <div class="sign-col">
              <div>Dicetak Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
              <div style="font-weight:bold; margin-top: 2px;">Petugas Administrasi SDM</div>
              <div class="sign-line"></div>
              <div style="margin-top: 4px; font-size: 10px;">SIUBA Automated Engine</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
