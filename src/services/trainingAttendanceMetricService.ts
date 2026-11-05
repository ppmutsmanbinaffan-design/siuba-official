import { 
  TrainingAttendanceSummary, 
  TrainingSession, 
  StaffAttendanceRecord,
  ExtracurricularStaffAssignment
} from '../types';
import { TrainingSessionService } from './trainingSessionService';
import { StaffAttendanceService } from './staffAttendanceService';
import { ExtracurricularStaffAssignmentService } from './extracurricularStaffAssignmentService';
import { TrainingRealizationService } from './trainingRealizationService';

export interface CoachMetricItem {
  staff_id: number;
  staff_name: string;
  staff_number?: string;
  primary_extracurricular: string;
  total_assigned_sessions: number;
  attended_count: number;
  present_count: number;
  late_count: number;
  substituted_out_count: number;
  substituted_in_count: number;
  absent_count: number;
  attendance_rate: number;
  total_late_minutes: number;
}

export interface ExtracurricularMetricItem {
  extracurricular_id: number;
  extracurricular_name: string;
  total_sessions: number;
  realized_sessions: number;
  cancelled_sessions: number;
  realization_rate: number;
  primary_coach_name: string;
  trainer_attended_count: number;
  trainer_attendance_rate: number;
  total_students_present: number;
}

export class TrainingAttendanceMetricService {
  /**
   * Calculates high-level aggregate metrics for training sessions and trainer attendance
   */
  public static calculateSummary(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    extracurricularId?: number;
    staffId?: number;
  }): TrainingAttendanceSummary {
    let sessions = TrainingSessionService.getTrainingSessions();
    let records = StaffAttendanceService.getRecords().filter(r => r.attendance_type === 'training');

    if (params?.date) {
      sessions = sessions.filter(s => s.session_date === params.date);
      records = records.filter(r => r.attendance_date === params.date);
    } else {
      if (params?.startDate) {
        sessions = sessions.filter(s => s.session_date >= params.startDate!);
        records = records.filter(r => r.attendance_date >= params.startDate!);
      }
      if (params?.endDate) {
        sessions = sessions.filter(s => s.session_date <= params.endDate!);
        records = records.filter(r => r.attendance_date <= params.endDate!);
      }
    }

    if (params?.extracurricularId) {
      sessions = sessions.filter(s => s.extracurricular_id === params.extracurricularId);
    }

    if (params?.staffId) {
      sessions = sessions.filter(s => 
        s.primary_staff_id === params.staffId || 
        s.actual_primary_staff_id === params.staffId ||
        (s.assistant_staff_ids && s.assistant_staff_ids.includes(params.staffId!))
      );
      records = records.filter(r => r.staff_id === params.staffId);
    }

    const total_sessions = sessions.length;
    const cancelled_count = sessions.filter(s => s.status === 'cancelled').length;
    const scheduled_count = total_sessions - cancelled_count;
    const realized_sessions = sessions.filter(s => s.realization_status === 'realized').length;
    const substituted_count = sessions.filter(s => Boolean(s.substitution_id)).length;

    // Attended records from staff attendance
    const present_count = records.filter(r => r.status === 'present').length;
    const late_count = records.filter(r => r.status === 'late').length;
    const absent_count = records.filter(r => r.status === 'absent').length;
    const attended_count = present_count + late_count;

    const total_late_minutes = records
      .filter(r => r.status === 'late')
      .reduce((sum, r) => sum + (r.late_minutes || 0), 0);

    const unrecorded_count = Math.max(0, scheduled_count - attended_count - absent_count);

    // Count reconciliation review items
    const reconciliationItems = sessions.map(s => TrainingRealizationService.reconcileSession(s));
    const needs_review_count = reconciliationItems.filter(item => item.needs_review).length;

    const effectiveDenominator = Math.max(1, scheduled_count);
    const trainer_attendance_rate = Number(((attended_count / effectiveDenominator) * 100).toFixed(1));
    const realization_rate = Number(((realized_sessions / effectiveDenominator) * 100).toFixed(1));
    const punctuality_rate = attended_count > 0 ? Number(((present_count / attended_count) * 100).toFixed(1)) : 100;
    const late_rate = attended_count > 0 ? Number(((late_count / attended_count) * 100).toFixed(1)) : 0;

    return {
      total_sessions,
      scheduled_count,
      realized_sessions,
      attended_count,
      present_count,
      late_count,
      substituted_count,
      cancelled_count,
      unrecorded_count,
      absent_count,
      needs_review_count,
      trainer_attendance_rate,
      realization_rate,
      punctuality_rate,
      late_rate,
      total_late_minutes
    };
  }

  /**
   * Breakdown metrics per coach
   */
  public static calculatePerCoachMetrics(): CoachMetricItem[] {
    const assignments = ExtracurricularStaffAssignmentService.getAssignments().filter(a => a.is_active);
    const sessions = TrainingSessionService.getTrainingSessions();
    const records = StaffAttendanceService.getRecords().filter(r => r.attendance_type === 'training');

    // Group unique staff
    const staffMap = new Map<number, CoachMetricItem>();

    assignments.forEach(a => {
      if (!staffMap.has(a.staff_id)) {
        staffMap.set(a.staff_id, {
          staff_id: a.staff_id,
          staff_name: a.staff_name,
          staff_number: a.staff_number,
          primary_extracurricular: a.extracurricular_name || 'Ekskul',
          total_assigned_sessions: 0,
          attended_count: 0,
          present_count: 0,
          late_count: 0,
          substituted_out_count: 0,
          substituted_in_count: 0,
          absent_count: 0,
          attendance_rate: 100,
          total_late_minutes: 0
        });
      }
    });

    // Populate session counts
    sessions.forEach(s => {
      if (s.status === 'cancelled') return;

      if (s.primary_staff_id && staffMap.has(s.primary_staff_id)) {
        const item = staffMap.get(s.primary_staff_id)!;
        item.total_assigned_sessions++;
        if (s.substitution_id && s.actual_primary_staff_id !== s.primary_staff_id) {
          item.substituted_out_count++;
        }
      }

      if (s.substitution_id && s.actual_primary_staff_id && s.actual_primary_staff_id !== s.primary_staff_id) {
        if (staffMap.has(s.actual_primary_staff_id)) {
          const subItem = staffMap.get(s.actual_primary_staff_id)!;
          subItem.substituted_in_count++;
        }
      }
    });

    // Populate attendance records
    records.forEach(r => {
      if (staffMap.has(r.staff_id)) {
        const item = staffMap.get(r.staff_id)!;
        if (r.status === 'present') {
          item.present_count++;
          item.attended_count++;
        } else if (r.status === 'late') {
          item.late_count++;
          item.attended_count++;
          item.total_late_minutes += (r.late_minutes || 0);
        } else if (r.status === 'absent') {
          item.absent_count++;
        }
      }
    });

    // Calculate rates
    staffMap.forEach(item => {
      const denom = Math.max(1, item.total_assigned_sessions - item.substituted_out_count + item.substituted_in_count);
      item.attendance_rate = Number(((item.attended_count / denom) * 100).toFixed(1));
    });

    return Array.from(staffMap.values());
  }

  /**
   * Breakdown metrics per extracurricular
   */
  public static calculatePerExtracurricularMetrics(): ExtracurricularMetricItem[] {
    const extras = TrainingSessionService.getExtracurriculars().filter(e => e.is_active);
    const sessions = TrainingSessionService.getTrainingSessions();
    const records = StaffAttendanceService.getRecords().filter(r => r.attendance_type === 'training');

    return extras.map(extra => {
      const extraSessions = sessions.filter(s => s.extracurricular_id === extra.id);
      const total_sessions = extraSessions.length;
      const cancelled_sessions = extraSessions.filter(s => s.status === 'cancelled').length;
      const realized_sessions = extraSessions.filter(s => s.realization_status === 'realized').length;
      const scheduled = total_sessions - cancelled_sessions;

      const extraRecords = records.filter(r => 
        extraSessions.some(s => s.id === r.context_id)
      );
      const trainer_attended_count = extraRecords.filter(r => r.status === 'present' || r.status === 'late').length;

      const total_students_present = extraSessions.reduce((sum, s) => sum + (s.student_present_count || 0), 0);

      const effective = Math.max(1, scheduled);
      const realization_rate = Number(((realized_sessions / effective) * 100).toFixed(1));
      const trainer_attendance_rate = Number(((trainer_attended_count / effective) * 100).toFixed(1));

      return {
        extracurricular_id: extra.id,
        extracurricular_name: extra.name,
        total_sessions,
        realized_sessions,
        cancelled_sessions,
        realization_rate,
        primary_coach_name: extra.coach_name || 'Pelatih',
        trainer_attended_count,
        trainer_attendance_rate,
        total_students_present
      };
    });
  }
}
