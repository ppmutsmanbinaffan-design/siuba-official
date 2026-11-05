import { 
  Staff, 
  StaffAttendanceRecord, 
  TeachingAttendanceSummary, 
  TeachingSession 
} from '../types';
import { TeachingSessionService } from './teachingSessionService';
import { StaffIdentityResolver } from './staffIdentityResolver';

export interface TeacherTeachingMetric {
  staff_id: number;
  staff_name: string;
  employee_number: string;
  department: string;
  scheduled_sessions: number;
  attended_sessions: number;
  on_time_sessions: number;
  late_sessions: number;
  as_substitute_sessions: number;
  substituted_away_sessions: number;
  cancelled_sessions: number;
  unrecorded_sessions: number;
  absent_sessions: number;
  total_late_minutes: number;
  realization_rate: number;
  punctuality_rate: number;
}

export class TeachingAttendanceMetricService {
  /**
   * Calculate teaching attendance summary for a specific date or list of sessions
   */
  public static calculateDailySummary(dateStr: string = new Date().toISOString().substring(0, 10)): TeachingAttendanceSummary {
    return this.calculateSummary(dateStr);
  }

  public static calculateSummary(
    dateStr?: string,
    sessions?: TeachingSession[],
    records?: StaffAttendanceRecord[]
  ): TeachingAttendanceSummary {
    const teachingSessions = sessions || (dateStr ? TeachingSessionService.getTeachingSessions(dateStr) : TeachingSessionService.getTeachingSessions());
    
    let staffRecords: StaffAttendanceRecord[] = records || [];
    if (!records) {
      try {
        const stored = localStorage.getItem('siuba_staff_attendance_records');
        if (stored) staffRecords = JSON.parse(stored);
      } catch (_) {}
    }

    const teachingRecords = staffRecords.filter(r => 
      r.attendance_type === 'teaching' && 
      (!dateStr || r.attendance_date === dateStr)
    );

    const totalSessions = teachingSessions.length;
    let attendedCount = 0;
    let presentCount = 0;
    let lateCount = 0;
    let substitutedCount = 0;
    let cancelledCount = 0;
    let unrecordedCount = 0;
    let absentCount = 0;
    let totalLateMinutes = 0;

    const recordBySessionId = new Map<number, StaffAttendanceRecord>();
    teachingRecords.forEach(r => {
      if (r.context_id) {
        recordBySessionId.set(r.context_id, r);
      }
    });

    teachingSessions.forEach(session => {
      if (session.status === 'cancelled') {
        cancelledCount++;
        return;
      }

      if (session.status === 'substituted' || session.substitution_id) {
        substitutedCount++;
      }

      const rec = recordBySessionId.get(session.id);
      if (rec) {
        if (rec.status === 'present') {
          attendedCount++;
          presentCount++;
        } else if (rec.status === 'late') {
          attendedCount++;
          lateCount++;
          totalLateMinutes += (rec.late_minutes || 0);
        } else if (rec.status === 'absent') {
          absentCount++;
        }
      } else {
        if (session.status === 'completed') {
          // Completed without record = unrecorded
          unrecordedCount++;
        } else {
          unrecordedCount++;
        }
      }
    });

    const eligibleSessions = Math.max(1, totalSessions - cancelledCount);
    const realizationRate = totalSessions > 0 ? Math.round((attendedCount / eligibleSessions) * 100) : 100;
    const punctualityRate = attendedCount > 0 ? Math.round((presentCount / attendedCount) * 100) : 100;
    const lateRate = attendedCount > 0 ? Math.round((lateCount / attendedCount) * 100) : 0;

    return {
      total_sessions: totalSessions,
      scheduled_count: totalSessions - cancelledCount,
      attended_count: attendedCount,
      present_count: presentCount,
      late_count: lateCount,
      substituted_count: substitutedCount,
      cancelled_count: cancelledCount,
      unrecorded_count: unrecordedCount,
      absent_count: absentCount,
      realization_rate: Math.min(100, realizationRate),
      punctuality_rate: Math.min(100, punctualityRate),
      late_rate: Math.min(100, lateRate),
      total_late_minutes: totalLateMinutes
    };
  }

  /**
   * Calculate teacher-by-teacher teaching breakdown matrix
   */
  public static calculateTeacherBreakdown(
    dateStr?: string,
    sessions?: TeachingSession[],
    records?: StaffAttendanceRecord[],
    staffList?: Staff[]
  ): TeacherTeachingMetric[] {
    const list = staffList || StaffIdentityResolver.getStaffList().filter(s => s.staff_type === 'teacher' || s.staff_type === 'management');
    const allSessions = sessions || (dateStr ? TeachingSessionService.getTeachingSessions(dateStr) : TeachingSessionService.getTeachingSessions());

    let staffRecords: StaffAttendanceRecord[] = records || [];
    if (!records) {
      try {
        const stored = localStorage.getItem('siuba_staff_attendance_records');
        if (stored) staffRecords = JSON.parse(stored);
      } catch (_) {}
    }

    const teachingRecords = staffRecords.filter(r => 
      r.attendance_type === 'teaching' && 
      (!dateStr || r.attendance_date === dateStr)
    );

    return list.map(staff => {
      // Scheduled sessions where this staff is the primary teacher
      const scheduledSessions = allSessions.filter(s => s.scheduled_teacher_staff_id === staff.id);
      // Sessions taught as substitute
      const substituteSessions = allSessions.filter(s => s.actual_teacher_staff_id === staff.id && s.scheduled_teacher_staff_id !== staff.id);
      // Sessions where original teacher was substituted by someone else
      const substitutedAwaySessions = scheduledSessions.filter(s => s.status === 'substituted' && s.actual_teacher_staff_id !== staff.id);
      // Cancelled
      const cancelledSessions = scheduledSessions.filter(s => s.status === 'cancelled');

      // Records for this staff
      const myRecords = teachingRecords.filter(r => r.staff_id === staff.id);
      const onTimeRecords = myRecords.filter(r => r.status === 'present');
      const lateRecords = myRecords.filter(r => r.status === 'late');
      const absentRecords = myRecords.filter(r => r.status === 'absent');
      const lateMinutes = lateRecords.reduce((acc, r) => acc + (r.late_minutes || 0), 0);

      const attended = onTimeRecords.length + lateRecords.length;
      const targetSessions = Math.max(0, (scheduledSessions.length - cancelledSessions.length - substitutedAwaySessions.length) + substituteSessions.length);
      const eligibleDenom = Math.max(1, targetSessions);

      const unrecorded = Math.max(0, targetSessions - attended - absentRecords.length);
      const realization = targetSessions > 0 ? Math.min(100, Math.round((attended / eligibleDenom) * 100)) : 100;
      const punctuality = attended > 0 ? Math.round((onTimeRecords.length / attended) * 100) : 100;

      return {
        staff_id: staff.id,
        staff_name: staff.name,
        employee_number: staff.staff_number || `STF-${staff.id}`,
        department: staff.department || 'Akademik & Pengajaran',
        scheduled_sessions: scheduledSessions.length,
        attended_sessions: attended,
        on_time_sessions: onTimeRecords.length,
        late_sessions: lateRecords.length,
        as_substitute_sessions: substituteSessions.length,
        substituted_away_sessions: substitutedAwaySessions.length,
        cancelled_sessions: cancelledSessions.length,
        unrecorded_sessions: unrecorded,
        absent_sessions: absentRecords.length,
        total_late_minutes: lateMinutes,
        realization_rate: realization,
        punctuality_rate: punctuality
      };
    });
  }
}
