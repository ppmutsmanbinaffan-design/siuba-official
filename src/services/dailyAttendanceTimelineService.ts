import { 
  Activity, 
  ActivityCategory, 
  ActivityCategoryCode, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  DerivedRoutineStatus, 
  DailyTimelineItem, 
  Dormitory, 
  DormitoryRoom, 
  DormitorySummaryCard, 
  PrayerSummaryCard, 
  Student, 
  StudentDailyTimelineItem, 
  StudentExcusal 
} from '../types';

export class DailyAttendanceTimelineService {
  /**
   * Derive Session Status dynamically based on current time and session state
   */
  static deriveRoutineStatus(
    session: AttendanceSession,
    currentSimulatedTime: string = new Date().toISOString()
  ): DerivedRoutineStatus {
    if (session.status === 'cancelled') return 'cancelled';
    if (session.status === 'closed') return 'completed';

    // Parse current time vs session times
    const sessionDate = session.session_date; // YYYY-MM-DD
    const nowTimeStr = currentSimulatedTime.slice(11, 16); // HH:MM
    const nowDateStr = currentSimulatedTime.slice(0, 10); // YYYY-MM-DD

    if (sessionDate > nowDateStr) return 'upcoming';
    if (sessionDate < nowDateStr && session.status === 'draft') return 'overdue';

    if (nowTimeStr < session.start_at && session.status === 'draft') return 'upcoming';
    if (nowTimeStr >= session.start_at && nowTimeStr <= session.end_at && session.status === 'draft') return 'ready';
    if (session.status === 'open') return 'ongoing';
    if (nowTimeStr > session.end_at && session.status === 'draft') return 'overdue';

    return 'upcoming';
  }

  /**
   * Get Unified Daily Timeline of all sessions on a given date sorted chronologically
   */
  static getDailyTimeline(params: {
    date: string;
    sessions: AttendanceSession[];
    activities: Activity[];
    categories: ActivityCategory[];
    records: AttendanceRecord[];
    simulatedTime?: string;
  }): DailyTimelineItem[] {
    const { date, sessions = [], activities = [], categories = [], records = [], simulatedTime } = params;
    const safeSessions = sessions || [];
    const safeActivities = activities || [];
    const safeCategories = categories || [];
    const safeRecords = records || [];

    const dateSessions = safeSessions.filter((s) => s && s.session_date === date);

    // Sort chronologically by start_at
    dateSessions.sort((a, b) => (a.start_at || '').localeCompare(b.start_at || ''));

    return dateSessions.map((s) => {
      const act = safeActivities.find((a) => a && a.id === s.activity_id) || {
        id: s.activity_id,
        activity_category_id: 1,
        category_name: 'IBADAH',
        code: s.activity_code,
        name: s.activity_name,
        description: '',
        location: s.location,
        participant_type: 'all_students',
        attendance_enabled: true,
        allow_manual: true,
        allow_qr: true,
        allow_rfid: true,
        late_tolerance_minutes: 10,
        is_active: true,
        default_start_time: s.start_at,
        default_present_until: s.present_until,
        default_late_until: s.late_until,
        default_end_time: s.end_at,
      };

      const cat = safeCategories.find((c) => c && c.id === act.activity_category_id);
      const catCode: ActivityCategoryCode = (cat?.code || 'IBADAH') as ActivityCategoryCode;
      const catName = cat?.name || act.category_name || 'Ibadah';

      const sessionRecords = safeRecords.filter((r) => r && r.attendance_session_id === s.id);
      const recordedCount = sessionRecords.length;
      const totalParticipants = s.participant_count || 0;
      const attendanceRate = totalParticipants > 0 ? Math.round((recordedCount / totalParticipants) * 100) : 0;

      const derived_status = this.deriveRoutineStatus(s, simulatedTime);

      return {
        session: s,
        activity: act,
        category_code: catCode,
        category_name: catName,
        derived_status,
        recorded_count: recordedCount,
        total_participants: totalParticipants,
        attendance_rate: attendanceRate,
      };
    });
  }

  /**
   * Get Student Daily Timeline across all enrolled sessions for a given date
   */
  static getStudentDailyTimeline(params: {
    studentId: number;
    date: string;
    sessions: AttendanceSession[];
    activities: Activity[];
    categories: ActivityCategory[];
    records: AttendanceRecord[];
    participants: AttendanceSessionParticipant[];
    excusals?: StudentExcusal[];
  }): StudentDailyTimelineItem[] {
    const { 
      studentId, 
      date, 
      sessions = [], 
      activities = [], 
      categories = [], 
      records = [], 
      participants = [], 
      excusals = [] 
    } = params;

    const safeSessions = sessions || [];
    const safeActivities = activities || [];
    const safeCategories = categories || [];
    const safeRecords = records || [];
    const safeParticipants = participants || [];
    const safeExcusals = excusals || [];

    // Filter sessions where this student is a participant snapshot member
    const studentSessionIds = safeParticipants
      .filter((p) => p && p.student_id === studentId)
      .map((p) => p.attendance_session_id);

    const dateSessions = safeSessions
      .filter((s) => s && s.session_date === date && studentSessionIds.includes(s.id))
      .sort((a, b) => (a.start_at || '').localeCompare(b.start_at || ''));

    return dateSessions.map((s) => {
      const act = safeActivities.find((a) => a && a.id === s.activity_id) || {
        id: s.activity_id,
        activity_category_id: 1,
        category_name: 'IBADAH',
        code: s.activity_code,
        name: s.activity_name,
        description: '',
        location: s.location,
        participant_type: 'all_students',
        attendance_enabled: true,
        allow_manual: true,
        allow_qr: true,
        allow_rfid: true,
        late_tolerance_minutes: 10,
        is_active: true,
        default_start_time: s.start_at,
        default_present_until: s.present_until,
        default_late_until: s.late_until,
        default_end_time: s.end_at,
      };

      const cat = safeCategories.find((c) => c && c.id === act.activity_category_id);
      const catCode: ActivityCategoryCode = (cat?.code || 'IBADAH') as ActivityCategoryCode;

      const record = safeRecords.find((r) => r && r.attendance_session_id === s.id && r.student_id === studentId);

      // Check if student has approved excusal covering this date/time
      const exc = safeExcusals.find(
        (e) =>
          e &&
          e.student_id === studentId &&
          e.status === 'approved' &&
          e.start_at &&
          e.end_at &&
          e.start_at.slice(0, 10) <= date &&
          e.end_at.slice(0, 10) >= date
      );

      let status: any = record ? record.status : 'unrecorded';
      let excuse_reason = record?.notes;

      if (!record && exc) {
        status = 'excused';
        excuse_reason = `${exc.type.toUpperCase()}: ${exc.reason}`;
      }

      return {
        session: s,
        activity: act,
        category_code: catCode,
        record,
        status,
        excuse_reason,
      };
    });
  }

  /**
   * Get 5 Prayer Summary Cards for a given date
   */
  static getPrayerSummaryCards(params: {
    date: string;
    sessions: AttendanceSession[];
    records: AttendanceRecord[];
    students: Student[];
  }): PrayerSummaryCard[] {
    const { date, sessions = [], records = [], students = [] } = params;
    const safeSessions = sessions || [];
    const safeRecords = records || [];
    const safeStudents = students || [];

    const prayers = [
      { code: 'PRAYER-SUBUH', name: 'Shalat Subuh', defaultRange: '04:20–05:00' },
      { code: 'PRAYER-DZUHUR', name: 'Shalat Dzuhur', defaultRange: '12:00–12:45' },
      { code: 'PRAYER-ASHAR', name: 'Shalat Ashar', defaultRange: '15:15–16:00' },
      { code: 'PRAYER-MAGHRIB', name: 'Shalat Maghrib', defaultRange: '18:00–18:45' },
      { code: 'PRAYER-ISYA', name: 'Shalat Isya', defaultRange: '19:15–20:00' },
    ];

    const activeStudents = safeStudents.filter((s) => s && s.is_active && (s.status === 'active' || !s.status));
    const totalStudents = activeStudents.length || 1;

    return prayers.map((p) => {
      const sess = safeSessions.find((s) => s && s.session_date === date && (s.activity_code === p.code || (s.activity_name && s.activity_name.toLowerCase().includes(p.name.toLowerCase().split(' ')[1]))));

      if (!sess) {
        return {
          prayer_code: p.code,
          prayer_name: p.name,
          time_range: p.defaultRange,
          status: 'draft',
          total_students: totalStudents,
          present: 0,
          late: 0,
          permission: 0,
          sick: 0,
          dispensation: 0,
          absent: 0,
          attendance_rate: 0,
        };
      }

      const sessRecords = safeRecords.filter((r) => r && r.attendance_session_id === sess.id);
      const present = sessRecords.filter((r) => r && r.status === 'present').length;
      const late = sessRecords.filter((r) => r && r.status === 'late').length;
      const permission = sessRecords.filter((r) => r && r.status === 'permission').length;
      const sick = sessRecords.filter((r) => r && r.status === 'sick').length;
      const dispensation = sessRecords.filter((r) => r && r.status === 'dispensation').length;
      const absent = sessRecords.filter((r) => r && r.status === 'absent').length;

      const totalRecorded = present + late;
      const totalSessionParticipants = sess.participant_count || totalStudents;
      const rate = totalSessionParticipants > 0 ? Math.round((totalRecorded / totalSessionParticipants) * 100) : 0;

      return {
        prayer_code: p.code,
        prayer_name: p.name,
        time_range: `${sess.start_at}–${sess.end_at}`,
        session_id: sess.id,
        status: sess.status,
        total_students: totalSessionParticipants,
        present,
        late,
        permission,
        sick,
        dispensation,
        absent,
        attendance_rate: rate,
      };
    });
  }

  /**
   * Get Dormitory Level Monitoring Summaries
   */
  static getDormitorySummaryCards(params: {
    date: string;
    dormitories: Dormitory[];
    dormitoryRooms: DormitoryRoom[];
    students: Student[];
    sessions: AttendanceSession[];
    records: AttendanceRecord[];
  }): DormitorySummaryCard[] {
    const { 
      date, 
      dormitories = [], 
      dormitoryRooms = [], 
      students = [], 
      sessions = [], 
      records = [] 
    } = params;

    const safeDormitories = dormitories || [];
    const safeDormitoryRooms = dormitoryRooms || [];
    const safeStudents = students || [];
    const safeSessions = sessions || [];
    const safeRecords = records || [];

    const dateSessions = safeSessions.filter((s) => s && s.session_date === date);

    return safeDormitories.map((dorm) => {
      const dormRoomIds = safeDormitoryRooms.filter((r) => r && r.dormitory_id === dorm.id).map((r) => r.id);
      const dormStudents = safeStudents.filter((s) => s && s.dormitory_room_id && dormRoomIds.includes(s.dormitory_room_id) && s.is_active);

      const activity_summaries = dateSessions.map((sess) => {
        const sessRecords = safeRecords.filter((r) => r && r.attendance_session_id === sess.id);
        const dormStudentIds = dormStudents.map((s) => s.id);
        const recordedDormStudents = sessRecords.filter((r) => dormStudentIds.includes(r.student_id));

        const rate = dormStudents.length > 0 ? Math.round((recordedDormStudents.length / dormStudents.length) * 100) : 0;

        return {
          activity_name: sess.activity_name,
          recorded: recordedDormStudents.length,
          total: dormStudents.length,
          rate,
        };
      });

      const overallRate =
        activity_summaries.length > 0
          ? Math.round(activity_summaries.reduce((acc, a) => acc + a.rate, 0) / activity_summaries.length)
          : 0;

      return {
        dormitory_id: dorm.id,
        dormitory_name: dorm.name,
        total_residents: dormStudents.length,
        activity_summaries,
        overall_rate: overallRate,
      };
    });
  }
}
