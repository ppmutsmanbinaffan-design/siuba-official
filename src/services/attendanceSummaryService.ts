import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceSummary, 
  StudentExcusal 
} from '../types';

export class AttendanceSummaryService {
  /**
   * Calculate summary metrics for a specific session
   */
  static calculateSessionSummary(
    session: AttendanceSession,
    participants: AttendanceSessionParticipant[] = [],
    records: AttendanceRecord[] = []
  ): AttendanceSummary {
    if (!session) {
      return {
        total_participants: 0,
        recorded: 0,
        unrecorded: 0,
        present: 0,
        late: 0,
        permission: 0,
        sick: 0,
        dispensation: 0,
        absent: 0,
        attendance_rate: 0,
        completion_rate: 0,
        excused_rate: 0,
      };
    }
    const sessionParticipants = (participants || []).filter(
      (p) => p && p.attendance_session_id === session.id && p.eligibility_status !== 'ineligible'
    );
    const sessionRecords = (records || []).filter((r) => r && r.attendance_session_id === session.id);

    const total = sessionParticipants.length || session.participant_count || 0;
    const recorded = sessionRecords.length;
    const unrecorded = Math.max(0, total - recorded);

    let present = 0;
    let late = 0;
    let permission = 0;
    let sick = 0;
    let dispensation = 0;
    let absent = 0;

    sessionRecords.forEach((r) => {
      switch (r.status) {
        case 'present':
          present++;
          break;
        case 'late':
          late++;
          break;
        case 'permission':
          permission++;
          break;
        case 'sick':
          sick++;
          break;
        case 'dispensation':
          dispensation++;
          break;
        case 'absent':
          absent++;
          break;
      }
    });

    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;
    const completionRate = total > 0 ? Math.round((recorded / total) * 1000) / 10 : 0;
    const excusedRate = total > 0 ? Math.round(((permission + sick + dispensation) / total) * 1000) / 10 : 0;

    return {
      total_participants: total,
      recorded,
      unrecorded,
      present,
      late,
      permission,
      sick,
      dispensation,
      absent,
      attendance_rate: attendanceRate,
      completion_rate: completionRate,
      excused_rate: excusedRate,
    };
  }

  /**
   * Calculate aggregated operational metrics for today's sessions
   */
  static calculateTodaySummary(
    sessions: AttendanceSession[] = [],
    participants: AttendanceSessionParticipant[] = [],
    records: AttendanceRecord[] = [],
    dateStr: string = '2026-08-23'
  ) {
    const todaySessions = (sessions || []).filter((s) => s && (s.session_date === dateStr || (s.start_at && s.start_at.startsWith(dateStr))));
    const openSessions = todaySessions.filter((s) => s && s.status === 'open');
    const closedSessions = todaySessions.filter((s) => s && s.status === 'closed');
    const upcomingSessions = todaySessions.filter((s) => s && s.status === 'draft');

    let totalEligible = 0;
    let totalRecorded = 0;
    let totalPresent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalAbsent = 0;

    todaySessions.forEach((s) => {
      const summary = this.calculateSessionSummary(s, participants, records);
      totalEligible += summary.total_participants;
      totalRecorded += summary.recorded;
      totalPresent += summary.present;
      totalLate += summary.late;
      totalExcused += summary.permission + summary.sick + summary.dispensation;
      totalAbsent += summary.absent;
    });

    const overallAttendanceRate = totalEligible > 0 ? Math.round(((totalPresent + totalLate) / totalEligible) * 1000) / 10 : 0;
    const overallCompletionRate = totalEligible > 0 ? Math.round((totalRecorded / totalEligible) * 1000) / 10 : 0;

    return {
      totalSessions: todaySessions.length,
      openSessions: openSessions.length,
      closedSessions: closedSessions.length,
      upcomingSessions: upcomingSessions.length,
      totalParticipants: totalEligible,
      recorded: totalRecorded,
      unrecorded: Math.max(0, totalEligible - totalRecorded),
      present: totalPresent,
      late: totalLate,
      excused: totalExcused,
      absent: totalAbsent,
      overallAttendanceRate,
      overallCompletionRate,
    };
  }

  /**
   * Determine "BUTUH PERHATIAN" items for the operational dashboard
   */
  static getAttentionItems(
    sessions: AttendanceSession[] = [],
    excusals: StudentExcusal[] = [],
    records: AttendanceRecord[] = [],
    participants: AttendanceSessionParticipant[] = []
  ) {
    const items: Array<{
      id: string;
      type: 'unclosed_session' | 'pending_excuse' | 'unrecorded_active';
      title: string;
      count: number;
      description: string;
      actionTab: string;
      sessionId?: number;
      severity: 'high' | 'medium' | 'info';
    }> = [];

    // 1. Pending excusals
    const pendingExcusals = (excusals || []).filter((e) => e && e.status === 'pending');
    if (pendingExcusals.length > 0) {
      items.push({
        id: 'pending_excuses',
        type: 'pending_excuse',
        title: 'Izin & Sakit Menunggu Persetujuan',
        count: pendingExcusals.length,
        description: `${pendingExcusals.length} pengajuan izin/sakit santri perlu diverifikasi dan disetujui musyrif.`,
        actionTab: 'excuses',
        severity: 'high',
      });
    }

    // 2. Open sessions with unrecorded students
    const openSessions = (sessions || []).filter((s) => s && s.status === 'open');
    openSessions.forEach((s) => {
      const summary = this.calculateSessionSummary(s, participants, records);
      if (summary.unrecorded > 0) {
        items.push({
          id: `unrecorded_${s.id}`,
          type: 'unrecorded_active',
          title: `Santri Belum Absen: ${s.activity_name}`,
          count: summary.unrecorded,
          description: `${summary.unrecorded} dari ${summary.total_participants} santri belum tercatat pada sesi aktif.`,
          actionTab: 'manual-attendance',
          sessionId: s.id,
          severity: 'medium',
        });
      }
    });

    return items;
  }
}
