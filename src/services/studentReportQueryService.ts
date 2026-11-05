import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Student, 
  Classroom,
  ActivityCategory,
  Activity,
  User,
  AttendanceStatus,
  AttendanceMethod
} from '../types';
import { AttendanceMetricService, MetricSummary, FilterCriteria } from './attendanceMetricService';

export interface StudentDailyReportItem {
  id: number;
  session_id: number;
  date: string;
  activity_name: string;
  category_name: string;
  student_id: number;
  student_name: string;
  student_nis: string;
  classroom_name: string;
  dormitory_name: string;
  status: AttendanceStatus | 'unrecorded';
  timestamp: string | null;
  method: AttendanceMethod | null;
  operator_name: string | null;
  notes: string | null;
}

export interface StudentRecapItem {
  student_id: number;
  student_name: string;
  student_nis: string;
  classroom_name: string;
  total_sessions: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  dispensation: number;
  absent: number;
  unrecorded: number;
  attendance_rate: number;
}

export interface ClassRecapItem {
  classroom_id?: number;
  classroom_name: string;
  total_students: number;
  eligible_sessions: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  dispensation: number;
  absent: number;
  unrecorded: number;
  attendance_rate: number;
}

export interface StudentReportFilterParams {
  date_from?: string;
  date_to?: string;
  activity_id?: number | 'all';
  category_id?: number | 'all';
  classroom_name?: string | 'all';
  status?: AttendanceStatus | 'unrecorded' | 'all';
  method?: AttendanceMethod | 'all';
  search?: string;
}

export class StudentReportQueryService {
  /**
   * Generates flat list of daily attendance logs for students matching filters
   */
  public static getDailyAttendanceReport(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    students: Student[],
    filters: StudentReportFilterParams = {}
  ): { items: StudentDailyReportItem[]; summary: MetricSummary } {
    const {
      date_from,
      date_to,
      activity_id = 'all',
      category_id = 'all',
      classroom_name = 'all',
      status = 'all',
      method = 'all',
      search = ''
    } = filters;

    // Filter sessions
    let scopedSessions = sessions.filter(s => s.status !== 'cancelled');
    if (date_from) {
      scopedSessions = scopedSessions.filter(s => (s.session_date || s.start_at.slice(0, 10)) >= date_from);
    }
    if (date_to) {
      scopedSessions = scopedSessions.filter(s => (s.session_date || s.start_at.slice(0, 10)) <= date_to);
    }
    if (activity_id !== 'all') {
      scopedSessions = scopedSessions.filter(s => s.activity_id === Number(activity_id));
    }
    if (category_id !== 'all') {
      scopedSessions = scopedSessions.filter(s => 
        s.activity_category_id === Number(category_id) || 
        s.category_name?.toLowerCase().includes(String(category_id).toLowerCase())
      );
    }

    const sessionMap = new Map(scopedSessions.map(s => [s.id, s]));
    const sessionIds = new Set(scopedSessions.map(s => s.id));

    // Filter participants (Eligible records)
    let scopedParticipants = participants.filter(
      p => sessionIds.has(p.attendance_session_id) && p.eligibility_status !== 'ineligible'
    );

    if (classroom_name !== 'all') {
      scopedParticipants = scopedParticipants.filter(p => 
        p.classroom_name?.toLowerCase().includes(classroom_name.toLowerCase())
      );
    }

    const studentMap = new Map(students.map(st => [st.id, st]));
    const recordKeyMap = new Map<string, AttendanceRecord>();
    records.forEach(r => {
      recordKeyMap.set(`${r.attendance_session_id}_${r.student_id}`, r);
    });

    const items: StudentDailyReportItem[] = [];

    scopedParticipants.forEach((p, idx) => {
      const session = sessionMap.get(p.attendance_session_id);
      if (!session) return;

      const student = studentMap.get(p.student_id);
      const rec = recordKeyMap.get(`${p.attendance_session_id}_${p.student_id}`);

      const recordStatus: AttendanceStatus | 'unrecorded' = rec ? rec.status : 'unrecorded';

      // Status filter
      if (status !== 'all' && recordStatus !== status) return;

      // Method filter
      if (method !== 'all' && rec?.method !== method) return;

      const stName = student?.name || p.student_name || 'Santri';
      const stNis = student?.student_number || (p as any).student_number || '-';

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = stName.toLowerCase().includes(q);
        const matchNis = stNis.toLowerCase().includes(q);
        const matchClass = (p.classroom_name || '').toLowerCase().includes(q);
        const matchActivity = (session.activity_name || '').toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchClass && !matchActivity) return;
      }

      items.push({
        id: rec ? rec.id : idx + 1000000,
        session_id: session.id,
        date: session.session_date || session.start_at.slice(0, 10),
        activity_name: session.activity_name,
        category_name: session.category_name || 'Rutin',
        student_id: p.student_id,
        student_name: stName,
        student_nis: stNis,
        classroom_name: p.classroom_name || student?.classroom_name || '-',
        dormitory_name: p.dormitory_room_name || student?.dormitory_room_name || '-',
        status: recordStatus,
        timestamp: rec?.check_in_at ? rec.check_in_at.slice(11, 16) : null,
        method: rec?.method || null,
        operator_name: rec?.recorded_by || null,
        notes: rec?.notes || null
      });
    });

    // Sort: Date descending, Session, Student name
    items.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      if (a.session_id !== b.session_id) return b.session_id - a.session_id;
      return a.student_name.localeCompare(b.student_name);
    });

    // Authoritative summary
    const summary = AttendanceMetricService.calculateMetrics(
      scopedSessions,
      scopedParticipants,
      records,
      {
        startDate: date_from,
        endDate: date_to,
        activityCategoryId: category_id,
        activityId: activity_id,
        method: method as any,
      }
    );

    return { items, summary };
  }

  /**
   * Generates student-level aggregate recap
   */
  public static getStudentRecapReport(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    students: Student[],
    filters: StudentReportFilterParams = {}
  ): StudentRecapItem[] {
    const { items } = this.getDailyAttendanceReport(sessions, participants, records, students, filters);

    const studentMap = new Map<number, StudentRecapItem>();

    items.forEach(item => {
      let entry = studentMap.get(item.student_id);
      if (!entry) {
        entry = {
          student_id: item.student_id,
          student_name: item.student_name,
          student_nis: item.student_nis,
          classroom_name: item.classroom_name,
          total_sessions: 0,
          present: 0,
          late: 0,
          permission: 0,
          sick: 0,
          dispensation: 0,
          absent: 0,
          unrecorded: 0,
          attendance_rate: 0,
        };
        studentMap.set(item.student_id, entry);
      }

      entry.total_sessions++;
      if (item.status === 'present') entry.present++;
      else if (item.status === 'late') entry.late++;
      else if (item.status === 'permission') entry.permission++;
      else if (item.status === 'sick') entry.sick++;
      else if (item.status === 'dispensation') entry.dispensation++;
      else if (item.status === 'absent') entry.absent++;
      else entry.unrecorded++;
    });

    const result = Array.from(studentMap.values());
    result.forEach(r => {
      r.attendance_rate = r.total_sessions > 0
        ? Math.round(((r.present + r.late) / r.total_sessions) * 1000) / 10
        : 0;
    });

    result.sort((a, b) => a.student_name.localeCompare(b.student_name));
    return result;
  }

  /**
   * Generates class-level aggregate recap
   */
  public static getClassRecapReport(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    students: Student[],
    filters: StudentReportFilterParams = {}
  ): ClassRecapItem[] {
    const { items } = this.getDailyAttendanceReport(sessions, participants, records, students, filters);

    const classMap = new Map<string, ClassRecapItem>();
    const classStudentSets = new Map<string, Set<number>>();

    items.forEach(item => {
      const cName = item.classroom_name || 'Tidak Ada Kelas';
      let entry = classMap.get(cName);
      if (!entry) {
        entry = {
          classroom_name: cName,
          total_students: 0,
          eligible_sessions: 0,
          present: 0,
          late: 0,
          permission: 0,
          sick: 0,
          dispensation: 0,
          absent: 0,
          unrecorded: 0,
          attendance_rate: 0,
        };
        classMap.set(cName, entry);
        classStudentSets.set(cName, new Set());
      }

      classStudentSets.get(cName)?.add(item.student_id);
      entry.eligible_sessions++;
      if (item.status === 'present') entry.present++;
      else if (item.status === 'late') entry.late++;
      else if (item.status === 'permission') entry.permission++;
      else if (item.status === 'sick') entry.sick++;
      else if (item.status === 'dispensation') entry.dispensation++;
      else if (item.status === 'absent') entry.absent++;
      else entry.unrecorded++;
    });

    const result = Array.from(classMap.values());
    result.forEach(r => {
      r.total_students = classStudentSets.get(r.classroom_name)?.size || 0;
      r.attendance_rate = r.eligible_sessions > 0
        ? Math.round(((r.present + r.late) / r.eligible_sessions) * 1000) / 10
        : 0;
    });

    result.sort((a, b) => a.classroom_name.localeCompare(b.classroom_name));
    return result;
  }
}
