import { 
  Staff, 
  StaffType, 
  StaffAttendanceRecord, 
  StaffAbsenceRequest, 
  TeachingSession, 
  TrainingSession,
  StaffIntegratedDashboardData,
  StaffAnalyticsFilters,
  User
} from '../types';
import { StaffIdentityResolver } from './staffIdentityResolver';
import { StaffWorkScheduleResolver } from './staffWorkScheduleResolver';
import { StaffAttendanceService } from './staffAttendanceService';
import { TeachingSessionService } from './teachingSessionService';
import { TrainingSessionService } from './trainingSessionService';
import { StaffAttendanceMetricService } from './staffAttendanceMetricService';

export class StaffAnalyticsQueryService {
  /**
   * Generates integrated dashboard data strictly adhering to SIUBA v1.1.4 specifications.
   * Isolates the 3 domains (Daily, Teaching, Training) into separate non-conflated KPI models.
   */
  public static getIntegratedDashboardData(
    dateStr: string = new Date().toISOString().substring(0, 10),
    user?: User
  ): StaffIntegratedDashboardData {
    const allStaff = StaffIdentityResolver.getStaffList();
    const activeStaff = allStaff.filter(s => s.is_active);

    // Apply role-based filtering if user is scoped
    const scopedStaff = this.applyRoleStaffScope(activeStaff, user);
    const scopedStaffIds = new Set(scopedStaff.map(s => s.id));

    // Daily Attendance Records
    const dailyRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_date === dateStr && 
      r.attendance_type === 'daily' &&
      scopedStaffIds.has(r.staff_id)
    );

    // Absence Requests for Today
    const absenceRequests = StaffAttendanceService.getAbsenceRequests().filter(req => 
      req.status === 'approved' &&
      req.start_at <= dateStr &&
      req.end_at >= dateStr &&
      scopedStaffIds.has(req.staff_id)
    );

    // Teaching Sessions for Today
    let teachingSessions = TeachingSessionService.getTeachingSessions(dateStr);
    if (user?.role === 'teacher') {
      const staffSelf = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (staffSelf) {
        teachingSessions = teachingSessions.filter(s => 
          s.scheduled_teacher_staff_id === staffSelf.id || s.actual_teacher_staff_id === staffSelf.id
        );
      }
    }

    // Training Sessions for Today
    let trainingSessions = TrainingSessionService.getTrainingSessions(dateStr);
    if (user?.role === 'trainer') {
      const staffSelf = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (staffSelf) {
        trainingSessions = trainingSessions.filter(s => 
          s.primary_staff_id === staffSelf.id || s.actual_primary_staff_id === staffSelf.id
        );
      }
    }

    // ----------------------------------------------------
    // DOMAIN 1: DAILY ATTENDANCE METRICS
    // ----------------------------------------------------
    const staffByType: Record<StaffType, number> = {
      teacher: 0,
      trainer: 0,
      musyrif: 0,
      administration: 0,
      employee: 0,
      management: 0,
      other: 0,
    };
    scopedStaff.forEach(s => {
      staffByType[s.staff_type] = (staffByType[s.staff_type] || 0) + 1;
    });

    let expectedToday = 0;
    const expectedStaffList: { staff: Staff; schedule: any }[] = [];

    for (const staff of scopedStaff) {
      if (staff.requires_daily_attendance !== false && StaffWorkScheduleResolver.isWorkingDay(staff, dateStr)) {
        expectedToday++;
        const schedule = StaffWorkScheduleResolver.resolveStaffSchedule(staff, dateStr);
        expectedStaffList.push({ staff, schedule });
      }
    }

    let present = 0;
    let late = 0;
    let permission = 0;
    let sick = 0;
    let leave = 0;
    let officialDuty = 0;
    let absent = 0;
    let notCheckedOut = 0;
    let totalLateMinutes = 0;

    const recordByStaffId = new Map<number, StaffAttendanceRecord>();
    dailyRecords.forEach(r => {
      recordByStaffId.set(r.staff_id, r);

      if (r.status === 'present') present++;
      else if (r.status === 'late') {
        late++;
        totalLateMinutes += (r.late_minutes || 0);
      }
      else if (r.status === 'permission') permission++;
      else if (r.status === 'sick') sick++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'official_duty') officialDuty++;
      else if (r.status === 'absent') absent++;

      if (r.check_in_at && !r.check_out_at && !['permission', 'sick', 'leave', 'absent'].includes(r.status)) {
        notCheckedOut++;
      }
    });

    const recordedCount = present + late + permission + sick + leave + officialDuty + absent;
    const notCheckedIn = Math.max(0, expectedToday - recordedCount);

    const presenceRate = StaffAttendanceMetricService.calculatePresenceRate(present, late, expectedToday);
    const excusedRate = StaffAttendanceMetricService.calculateExcusedRate(permission, sick, leave, officialDuty, expectedToday);
    const alphaRate = StaffAttendanceMetricService.calculateAlphaRate(absent, expectedToday);

    // ----------------------------------------------------
    // DOMAIN 2: TEACHING SESSIONS METRICS
    // ----------------------------------------------------
    const scheduledTeaching = teachingSessions.length;
    const cancelledTeaching = teachingSessions.filter(s => s.status === 'cancelled').length;
    const eligibleTeaching = scheduledTeaching - cancelledTeaching;
    const realizedTeaching = teachingSessions.filter(s => s.status === 'completed').length;
    const substitutedTeaching = teachingSessions.filter(s => Boolean(s.substitution_id)).length;

    const teachingRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'teaching' && r.attendance_date === dateStr
    );
    const teachingRecordBySession = new Map<number, StaffAttendanceRecord>();
    teachingRecords.forEach(r => {
      if (r.context_id) teachingRecordBySession.set(r.context_id, r);
    });

    let attendedTeaching = 0;
    let onTimeTeaching = 0;
    let lateTeaching = 0;

    teachingSessions.forEach(s => {
      if (s.status === 'cancelled') return;
      const rec = teachingRecordBySession.get(s.id);
      if (rec) {
        if (rec.status === 'present') {
          attendedTeaching++;
          onTimeTeaching++;
        } else if (rec.status === 'late') {
          attendedTeaching++;
          lateTeaching++;
        }
      }
    });

    const unrecordedTeaching = Math.max(0, eligibleTeaching - attendedTeaching);
    const teachingNeedsReview = teachingSessions.filter(s => 
      s.status !== 'cancelled' && 
      (!teachingRecordBySession.has(s.id) || (s.status === 'completed' && !teachingRecordBySession.has(s.id)))
    ).length;

    const teachingAttendanceRate = StaffAttendanceMetricService.calculateTeachingRate(attendedTeaching, eligibleTeaching);
    const teachingOnTimeRate = StaffAttendanceMetricService.calculatePunctualityRate(onTimeTeaching, attendedTeaching);

    // ----------------------------------------------------
    // DOMAIN 3: TRAINING SESSIONS METRICS
    // ----------------------------------------------------
    const totalTraining = trainingSessions.length;
    const cancelledTraining = trainingSessions.filter(s => s.status === 'cancelled').length;
    const eligibleTraining = totalTraining - cancelledTraining;
    const realizedTraining = trainingSessions.filter(s => s.realization_status === 'realized').length;
    const substitutedTraining = trainingSessions.filter(s => Boolean(s.substitution_id)).length;

    const trainingRecords = StaffAttendanceService.getRecords().filter(r => 
      r.attendance_type === 'training' && r.attendance_date === dateStr
    );
    const trainingRecordBySession = new Map<number, StaffAttendanceRecord>();
    trainingRecords.forEach(r => {
      if (r.context_id) trainingRecordBySession.set(r.context_id, r);
    });

    let trainerAttended = 0;
    let trainerOnTime = 0;
    let trainerLate = 0;

    trainingSessions.forEach(s => {
      if (s.status === 'cancelled') return;
      const rec = trainingRecordBySession.get(s.id);
      if (rec) {
        if (rec.status === 'present') {
          trainerAttended++;
          trainerOnTime++;
        } else if (rec.status === 'late') {
          trainerAttended++;
          trainerLate++;
        }
      }
    });

    const unrecordedTraining = Math.max(0, eligibleTraining - trainerAttended);
    const trainingNeedsReviewCount = trainingSessions.filter(s => 
      s.status !== 'cancelled' && 
      (!trainingRecordBySession.has(s.id) || (s.realization_status !== 'realized' && trainingRecordBySession.has(s.id)))
    ).length;

    const trainingAttendanceRate = StaffAttendanceMetricService.calculateTrainingRate(trainerAttended, eligibleTraining);
    const trainingRealizationRate = StaffAttendanceMetricService.calculateRealizationRate(realizedTraining, eligibleTraining);

    // ----------------------------------------------------
    // OPERATIONAL LIVE LISTS (TODAY'S ACTION ITEMS)
    // ----------------------------------------------------
    // 1. Belum Check-in
    const notCheckedInList: Array<{ staff: Staff; expected_start: string; schedule_name: string }> = [];
    expectedStaffList.forEach(({ staff, schedule }) => {
      if (!recordByStaffId.has(staff.id)) {
        notCheckedInList.push({
          staff,
          expected_start: schedule.expected_in || '07:00',
          schedule_name: schedule.schedule_name || 'Reguler'
        });
      }
    });

    // 2. Belum Check-out
    const notCheckedOutList: Array<{ staff: Staff; check_in_at: string; expected_end: string; record_id: number }> = [];
    dailyRecords.forEach(r => {
      if (r.check_in_at && !r.check_out_at && !['permission', 'sick', 'leave', 'absent'].includes(r.status)) {
        const staff = scopedStaff.find(s => s.id === r.staff_id);
        if (staff) {
          const schedule = StaffWorkScheduleResolver.resolveStaffSchedule(staff, dateStr);
          notCheckedOutList.push({
            staff,
            check_in_at: r.check_in_at.substring(11, 16) || r.check_in_at,
            expected_end: schedule?.scheduled_end_at || '16:00',
            record_id: r.id
          });
        }
      }
    });

    // 3. Terlambat Hari Ini
    const lateTodayList: Array<{ staff: Staff; check_in_at: string; expected_start: string; late_minutes: number }> = [];
    dailyRecords.filter(r => r.status === 'late').forEach(r => {
      const staff = scopedStaff.find(s => s.id === r.staff_id);
      if (staff) {
        const schedule = StaffWorkScheduleResolver.resolveStaffSchedule(staff, dateStr);
        lateTodayList.push({
          staff,
          check_in_at: r.check_in_at ? r.check_in_at.substring(11, 16) : '-',
          expected_start: schedule?.scheduled_start_at || '07:00',
          late_minutes: r.late_minutes || 0
        });
      }
    });

    // 4. Approved Absences
    const approvedAbsencesList: Array<{ staff: Staff; type: string; start_at: string; end_at: string; reason: string }> = [];
    absenceRequests.forEach(req => {
      const staff = scopedStaff.find(s => s.id === req.staff_id);
      if (staff) {
        approvedAbsencesList.push({
          staff,
          type: req.type,
          start_at: req.start_at,
          end_at: req.end_at,
          reason: req.reason
        });
      }
    });

    // 5. Teaching Needs Review
    const teachingNeedsReviewList: Array<{ session: TeachingSession; issue: string }> = [];
    teachingSessions.forEach(session => {
      if (session.status === 'cancelled') return;
      const rec = teachingRecordBySession.get(session.id);
      if (!rec && session.status === 'completed') {
        teachingNeedsReviewList.push({
          session,
          issue: 'Sesi selesai namun presensi guru belum tercatat/terverifikasi'
        });
      } else if (!rec && session.status === 'open') {
        teachingNeedsReviewList.push({
          session,
          issue: 'Sesi sedang berjalan namun guru belum melakukan scan masuk'
        });
      } else if (session.substitution_id && !session.actual_teacher_staff_id) {
        teachingNeedsReviewList.push({
          session,
          issue: 'Substitusi dijadwalkan namun guru pengganti belum dikonfirmasi'
        });
      }
    });

    // 6. Training Needs Review
    const trainingNeedsReviewList: Array<{ session: TrainingSession; issue: string }> = [];
    trainingSessions.forEach(session => {
      if (session.status === 'cancelled') return;
      const rec = trainingRecordBySession.get(session.id);
      if (rec && session.realization_status !== 'realized') {
        trainingNeedsReviewList.push({
          session,
          issue: 'Pelatih hadir namun jurnal realisasi materi latihan belum diisi'
        });
      } else if (!rec && session.status !== 'scheduled') {
        trainingNeedsReviewList.push({
          session,
          issue: 'Sesi ekskul berlangsung namun pelatih belum tercatat hadir'
        });
      }
    });

    // ----------------------------------------------------
    // TRENDS GENERATION (7-DAY ROLLING)
    // ----------------------------------------------------
    const trends = this.generateHistoricalTrends(dateStr, scopedStaff);

    // ----------------------------------------------------
    // DATA QUALITY CHECKS (ADMIN ONLY)
    // ----------------------------------------------------
    let staffWithoutSchedule = 0;
    let staffWithoutQr = 0;
    let staffWithoutRfid = 0;
    const criticalIssues: string[] = [];

    scopedStaff.forEach(s => {
      const sch = StaffWorkScheduleResolver.resolveSchedule(s, dateStr);
      if (!sch) staffWithoutSchedule++;
      if (!s.qr_token) staffWithoutQr++;
      if (!s.rfid_uid) staffWithoutRfid++;
    });

    if (notCheckedOutList.length > 5) {
      criticalIssues.push(`Terdapat ${notCheckedOutList.length} pegawai belum melakukan check-out hari ini.`);
    }
    if (teachingNeedsReviewList.length > 0) {
      criticalIssues.push(`Terdapat ${teachingNeedsReviewList.length} sesi mengajar KBM memerlukan review/verifikasi.`);
    }
    if (trainingNeedsReviewList.length > 0) {
      criticalIssues.push(`Terdapat ${trainingNeedsReviewList.length} sesi latihan ekskul belum melengkapi jurnal realisasi.`);
    }

    return {
      summary_date: dateStr,
      daily: {
        total_staff_active: scopedStaff.length,
        staff_by_type: staffByType,
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
        presence_rate: presenceRate,
        excused_rate: excusedRate,
        alpha_rate: alphaRate,
        total_late_minutes: totalLateMinutes,
      },
      teaching: {
        scheduled_sessions: scheduledTeaching,
        eligible_sessions: eligibleTeaching,
        realized_sessions: realizedTeaching,
        attended_sessions: attendedTeaching,
        on_time_sessions: onTimeTeaching,
        late_sessions: lateTeaching,
        substituted_sessions: substitutedTeaching,
        cancelled_sessions: cancelledTeaching,
        unrecorded_sessions: unrecordedTeaching,
        needs_review_sessions: teachingNeedsReview,
        teaching_attendance_rate: teachingAttendanceRate,
        on_time_rate: teachingOnTimeRate,
      },
      training: {
        total_sessions: totalTraining,
        eligible_sessions: eligibleTraining,
        realized_sessions: realizedTraining,
        trainer_attended: trainerAttended,
        trainer_on_time: trainerOnTime,
        trainer_late: trainerLate,
        trainer_substituted: substitutedTraining,
        cancelled_sessions: cancelledTraining,
        unrecorded_sessions: unrecordedTraining,
        needs_review_count: trainingNeedsReviewCount,
        training_attendance_rate: trainingAttendanceRate,
        realization_rate: trainingRealizationRate,
      },
      operational_lists: {
        not_checked_in: notCheckedInList,
        not_checked_out: notCheckedOutList,
        late_today: lateTodayList,
        approved_absences: approvedAbsencesList,
        teaching_needs_review: teachingNeedsReviewList,
        training_needs_review: trainingNeedsReviewList,
      },
      trends,
      data_quality: {
        staff_without_schedule: staffWithoutSchedule,
        staff_without_qr: staffWithoutQr,
        staff_without_rfid: staffWithoutRfid,
        missing_checkout_count: notCheckedOut,
        unresolved_teaching_count: teachingNeedsReviewList.length,
        unresolved_training_count: trainingNeedsReviewList.length,
        critical_issues: criticalIssues,
      }
    };
  }

  /**
   * Helper to generate 7-day rolling trend series
   */
  private static generateHistoricalTrends(
    endDateStr: string,
    scopedStaff: Staff[]
  ) {
    const dailyTrend: StaffIntegratedDashboardData['trends']['daily'] = [];
    const teachingTrend: StaffIntegratedDashboardData['trends']['teaching'] = [];
    const trainingTrend: StaffIntegratedDashboardData['trends']['training'] = [];

    const baseDate = new Date(endDateStr);
    const allRecords = StaffAttendanceService.getRecords();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);

      // Daily
      let expected = 0;
      scopedStaff.forEach(s => {
        if (s.requires_daily_attendance !== false && StaffWorkScheduleResolver.isWorkingDay(s, dateStr)) {
          expected++;
        }
      });
      const dRecords = allRecords.filter(r => r.attendance_date === dateStr && r.attendance_type === 'daily');
      const present = dRecords.filter(r => r.status === 'present').length;
      const late = dRecords.filter(r => r.status === 'late').length;
      const excused = dRecords.filter(r => ['permission', 'sick', 'leave', 'official_duty'].includes(r.status)).length;
      const absent = dRecords.filter(r => r.status === 'absent').length;
      const presenceRate = StaffAttendanceMetricService.calculatePresenceRate(present, late, expected);

      dailyTrend.push({
        date: dateStr,
        expected,
        present,
        late,
        excused,
        absent,
        presence_rate: presenceRate
      });

      // Teaching
      const tSessions = TeachingSessionService.getTeachingSessions(dateStr);
      const tCancelled = tSessions.filter(s => s.status === 'cancelled').length;
      const tEligible = tSessions.length - tCancelled;
      const tRecords = allRecords.filter(r => r.attendance_date === dateStr && r.attendance_type === 'teaching');
      const tAttended = tRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const tLate = tRecords.filter(r => r.status === 'late').length;
      const tSub = tSessions.filter(s => Boolean(s.substitution_id)).length;
      const tUnrecorded = Math.max(0, tEligible - tAttended);

      teachingTrend.push({
        date: dateStr,
        eligible: tEligible,
        attended: tAttended,
        late: tLate,
        substitute: tSub,
        cancelled: tCancelled,
        unrecorded: tUnrecorded
      });

      // Training
      const trSessions = TrainingSessionService.getTrainingSessions(dateStr);
      const trCancelled = trSessions.filter(s => s.status === 'cancelled').length;
      const trEligible = trSessions.length - trCancelled;
      const trRealized = trSessions.filter(s => s.realization_status === 'realized').length;
      const trRecords = allRecords.filter(r => r.attendance_date === dateStr && r.attendance_type === 'training');
      const trAttended = trRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const trLate = trRecords.filter(r => r.status === 'late').length;
      const trSub = trSessions.filter(s => Boolean(s.substitution_id)).length;
      const trNeedsReview = trSessions.filter(s => s.status !== 'cancelled' && s.realization_status !== 'realized').length;

      trainingTrend.push({
        date: dateStr,
        eligible: trEligible,
        realized: trRealized,
        attended: trAttended,
        late: trLate,
        substitute: trSub,
        cancelled: trCancelled,
        needs_review: trNeedsReview
      });
    }

    return {
      daily: dailyTrend,
      teaching: teachingTrend,
      training: trainingTrend
    };
  }

  /**
   * Scopes staff list according to user roles
   */
  public static applyRoleStaffScope(staffList: Staff[], user?: User): Staff[] {
    if (!user) return staffList;
    if (['admin', 'superadmin', 'headmaster'].includes(user.role)) {
      return staffList;
    }
    if (user.role === 'dorm_head') {
      // Dormitory head scopes to Musyrif & boarding supervisors
      return staffList.filter(s => s.staff_type === 'musyrif' || s.department?.toLowerCase().includes('asrama'));
    }
    if (user.role === 'teacher') {
      // Teacher self-scope or teacher group
      const staffSelf = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (staffSelf) {
        return staffList.filter(s => s.id === staffSelf.id);
      }
      return staffList.filter(s => s.staff_type === 'teacher');
    }
    if (user.role === 'trainer') {
      // Trainer self-scope or extracurricular trainers
      const staffSelf = StaffIdentityResolver.resolveByEmail(user.email || '');
      if (staffSelf) {
        return staffList.filter(s => s.id === staffSelf.id);
      }
      return staffList.filter(s => s.staff_type === 'trainer');
    }
    return staffList;
  }
}
