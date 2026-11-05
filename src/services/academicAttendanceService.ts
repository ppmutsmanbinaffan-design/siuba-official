import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  Classroom, 
  LessonPeriod, 
  Student, 
  Subject, 
  User 
} from '../types';

export interface StudentDailyMatrixRow {
  student: Student;
  periodStatuses: Record<number, { status: AttendanceStatus; method?: string; checkInAt?: string; lateMinutes?: number }>;
  summary: {
    present: number;
    late: number;
    permission: number;
    sick: number;
    dispensation: number;
    absent: number;
    unrecorded: number;
  };
}

export class AcademicAttendanceService {
  /**
   * Copies attendance records from a previous period session (e.g. Fiqih JP 1 -> JP 2)
   * Only copies for students who DO NOT yet have a record in the current target session.
   * Does NOT overwrite existing records or approved excusals.
   */
  public static copyPreviousPeriodAttendance(params: {
    sourceSession: AttendanceSession;
    targetSession: AttendanceSession;
    sourceRecords: AttendanceRecord[];
    targetRecords: AttendanceRecord[];
    participants: AttendanceSessionParticipant[];
    currentUser: User;
  }): {
    success: boolean;
    copiedCount: number;
    skippedCount: number;
    newRecords: AttendanceRecord[];
    message: string;
  } {
    const { sourceSession, targetSession, sourceRecords, targetRecords, participants, currentUser } = params;

    const sourceRecsForSession = sourceRecords.filter((r) => r.attendance_session_id === sourceSession.id);
    const existingTargetRecs = targetRecords.filter((r) => r.attendance_session_id === targetSession.id);
    const targetParticipants = participants.filter((p) => p.attendance_session_id === targetSession.id);

    let copiedCount = 0;
    let skippedCount = 0;
    const newRecords: AttendanceRecord[] = [];

    let nextRecordId = Math.max(0, ...targetRecords.map((r) => r.id)) + 1;

    for (const srcRec of sourceRecsForSession) {
      // Check if student already has a record in target session
      const existsInTarget = existingTargetRecs.some((tr) => tr.student_id === srcRec.student_id);
      if (existsInTarget) {
        skippedCount++;
        continue;
      }

      // Check if student is an eligible participant in target session
      const participant = targetParticipants.find((p) => p.student_id === srcRec.student_id);
      if (!participant || participant.eligibility_status === 'ineligible') {
        skippedCount++;
        continue;
      }

      // Create copied record for target session
      const nowTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const copiedRecord: AttendanceRecord = {
        id: nextRecordId++,
        attendance_session_id: targetSession.id,
        student_id: srcRec.student_id,
        student_name: srcRec.student_name,
        student_number: srcRec.student_number,
        classroom_name: srcRec.classroom_name,
        dormitory_room_name: srcRec.dormitory_room_name,
        status: srcRec.status,
        method: 'manual', // Record copy is saved as operator/manual check-in
        record_source: 'operator',
        check_in_at: nowTime,
        late_minutes: srcRec.late_minutes,
        recorded_by: `${currentUser.name} (Disalin dari ${sourceSession.activity_name})`,
        notes: `Salin Kehadiran Otomatis dari ${sourceSession.session_code}`,
      };

      newRecords.push(copiedRecord);
      copiedCount++;
    }

    return {
      success: true,
      copiedCount,
      skippedCount,
      newRecords,
      message: `Berhasil menyalin ${copiedCount} data kehadiran dari Sesi ${sourceSession.activity_name}. (${skippedCount} lewati karena sudah terisi/tidak eligible).`,
    };
  }

  /**
   * Generates Daily Academic Matrix for a given classroom & date across all lesson periods
   */
  public static getDailyAcademicMatrix(params: {
    date: string;
    classroomId: number;
    sessions: AttendanceSession[];
    records: AttendanceRecord[];
    students: Student[];
    lessonPeriods: LessonPeriod[];
  }): {
    periods: LessonPeriod[];
    classSessions: AttendanceSession[];
    rows: StudentDailyMatrixRow[];
  } {
    const { date, classroomId, sessions, records, students, lessonPeriods } = params;

    // Filter sessions for this classroom and date
    const classSessions = sessions.filter(
      (s) => s.session_date === date && s.classroom_id === classroomId
    );

    const activeStudents = students.filter(
      (st) => st.is_active && st.status === 'active' && st.classroom_id === classroomId
    );

    const activePeriods = lessonPeriods.filter((lp) => lp.is_active && !lp.is_break);

    const rows: StudentDailyMatrixRow[] = activeStudents.map((student) => {
      const periodStatuses: Record<number, { status: AttendanceStatus; method?: string; checkInAt?: string; lateMinutes?: number }> = {};

      const summary = {
        present: 0,
        late: 0,
        permission: 0,
        sick: 0,
        dispensation: 0,
        absent: 0,
        unrecorded: 0,
      };

      for (const period of activePeriods) {
        // Find session for this period
        const session = classSessions.find(
          (s) => s.academic_context?.lesson_period_id === period.id
        );

        if (!session) {
          continue;
        }

        const rec = records.find(
          (r) => r.attendance_session_id === session.id && r.student_id === student.id
        );

        if (rec) {
          periodStatuses[period.id] = {
            status: rec.status,
            method: rec.method,
            checkInAt: rec.check_in_at,
            lateMinutes: rec.late_minutes,
          };
          summary[rec.status]++;
        } else {
          summary.unrecorded++;
        }
      }

      return {
        student,
        periodStatuses,
        summary,
      };
    });

    return {
      periods: activePeriods,
      classSessions,
      rows,
    };
  }
}
