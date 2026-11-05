import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  RoutineAttentionAlert, 
  Student 
} from '../types';

export class RoutineAttendanceAttentionService {
  /**
   * Get list of students needing attention (multiple absences or unrecorded events)
   */
  static getAttentionAlerts(params: {
    date: string;
    sessions: AttendanceSession[];
    records: AttendanceRecord[];
    participants: AttendanceSessionParticipant[];
    students: Student[];
    minMissedThreshold?: number; // default 2
  }): RoutineAttentionAlert[] {
    const { date, sessions, records, participants, students, minMissedThreshold = 2 } = params;

    const dateSessions = sessions.filter((s) => s.session_date === date && s.status !== 'cancelled');

    const alerts: RoutineAttentionAlert[] = [];

    for (const st of students) {
      if (!st.is_active || st.status === 'inactive' || st.deleted_at) continue;

      let unrecordedCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      const missedActivities: string[] = [];

      for (const sess of dateSessions) {
        // Check if student was enrolled in this session
        const isEnrolled = participants.some((p) => p.attendance_session_id === sess.id && p.student_id === st.id);
        if (!isEnrolled) continue;

        const rec = records.find((r) => r.attendance_session_id === sess.id && r.student_id === st.id);

        if (!rec) {
          if (sess.status === 'closed' || sess.status === 'open') {
            unrecordedCount++;
            missedActivities.push(`${sess.activity_name} (Belum Absen)`);
          }
        } else if (rec.status === 'absent') {
          absentCount++;
          missedActivities.push(`${sess.activity_name} (Alpha)`);
        } else if (rec.status === 'late') {
          lateCount++;
        }
      }

      const totalMissed = unrecordedCount + absentCount;

      if (totalMissed >= minMissedThreshold) {
        alerts.push({
          student_id: st.id,
          student_name: st.name,
          student_number: st.student_number,
          classroom_name: st.classroom_name,
          dormitory_room_name: st.dormitory_room_name,
          unrecorded_count: unrecordedCount,
          absent_count: absentCount,
          late_count: lateCount,
          total_missed_events: totalMissed,
          missed_activities: missedActivities,
        });
      }
    }

    // Sort descending by total_missed_events
    alerts.sort((a, b) => b.total_missed_events - a.total_missed_events);

    return alerts;
  }
}
