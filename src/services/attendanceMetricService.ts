import { 
  Activity, 
  ActivityCategory, 
  AttendanceDevice, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  EventRegistration, 
  Extracurricular, 
  ExtracurricularMember, 
  SpecialEvent, 
  Student, 
  StudentExcusal, 
  User 
} from '../types';

export interface FilterCriteria {
  startDate?: string;
  endDate?: string;
  classroomId?: number | string | 'all';
  dormitoryId?: number | string | 'all';
  dormitoryRoomId?: number | string | string[] | 'all';
  activityCategoryId?: number | string | 'all';
  activityId?: number | string | 'all';
  studentId?: number | 'all';
  method?: 'manual' | 'qr' | 'rfid' | 'all';
  deviceId?: number | 'all';
  sessionStatus?: 'closed_only' | 'include_open' | 'all';
}

export interface MetricSummary {
  totalEligible: number;
  totalRecorded: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  dispensation: number;
  absent: number;
  unrecorded: number;

  completionRate: number; // recorded / eligible * 100
  attendanceRate: number; // (present + late) / eligible * 100
  onTimeRate: number;     // present / eligible * 100
  lateRate: number;       // late / eligible * 100
  absentRate: number;     // absent / eligible * 100
  excusedRate: number;    // (permission + sick + dispensation) / eligible * 100
}

export class AttendanceMetricService {
  /**
   * Calculate exact attendance metrics according to Sprint 9 specifications.
   * CRITICAL RULE: Denominator MUST be eligible participants from attendance_session_participants.
   */
  static calculateMetrics(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    filters: FilterCriteria = {}
  ): MetricSummary {
    const {
      startDate,
      endDate,
      classroomId = 'all',
      dormitoryRoomId = 'all',
      activityCategoryId = 'all',
      activityId = 'all',
      studentId = 'all',
      method = 'all',
      deviceId = 'all',
      sessionStatus = 'all',
    } = filters;

    // Filter sessions first
    let scopedSessions = sessions.filter((s) => s.status !== 'cancelled');

    if (sessionStatus === 'closed_only') {
      scopedSessions = scopedSessions.filter((s) => s.status === 'closed');
    } else if (sessionStatus === 'include_open') {
      scopedSessions = scopedSessions.filter((s) => s.status === 'closed' || s.status === 'open');
    }

    if (startDate) {
      scopedSessions = scopedSessions.filter((s) => {
        const sDate = s.session_date || s.start_at.slice(0, 10);
        return sDate >= startDate;
      });
    }

    if (endDate) {
      scopedSessions = scopedSessions.filter((s) => {
        const sDate = s.session_date || s.start_at.slice(0, 10);
        return sDate <= endDate;
      });
    }

    if (activityCategoryId !== 'all') {
      scopedSessions = scopedSessions.filter(
        (s) => (s.activity_category_id && s.activity_category_id === Number(activityCategoryId)) ||
               (s.category_name && s.category_name.toLowerCase().includes(activityCategoryId.toString().toLowerCase()))
      );
    }

    if (activityId !== 'all') {
      scopedSessions = scopedSessions.filter((s) => s.activity_id === Number(activityId));
    }

    const sessionIds = new Set(scopedSessions.map((s) => s.id));

    // Filter participants (Denominator)
    let scopedParticipants = participants.filter(
      (p) => sessionIds.has(p.attendance_session_id) && p.eligibility_status !== 'ineligible'
    );

    if (classroomId !== 'all') {
      const cQuery = classroomId.toString().toLowerCase();
      scopedParticipants = scopedParticipants.filter((p) => {
        return (p.classroom_name || '').toLowerCase().includes(cQuery);
      });
    }

    if (dormitoryRoomId !== 'all') {
      if (Array.isArray(dormitoryRoomId)) {
        const lowerList = dormitoryRoomId.map(r => r.toLowerCase());
        scopedParticipants = scopedParticipants.filter((p) => {
          const pRoom = (p.dormitory_room_name || '').toLowerCase();
          return lowerList.some(q => pRoom.includes(q));
        });
      } else {
        const dQuery = dormitoryRoomId.toString().toLowerCase();
        scopedParticipants = scopedParticipants.filter((p) => {
          return (p.dormitory_room_name || '').toLowerCase().includes(dQuery);
        });
      }
    }

    if (studentId !== 'all') {
      scopedParticipants = scopedParticipants.filter((p) => p.student_id === Number(studentId));
    }

    // Map participant keys for fast lookup: `${session_id}_${student_id}`
    const participantKeys = new Set(scopedParticipants.map((p) => `${p.attendance_session_id}_${p.student_id}`));

    // Filter records
    let scopedRecords = records.filter((r) => {
      if (!sessionIds.has(r.attendance_session_id)) return false;
      if (!participantKeys.has(`${r.attendance_session_id}_${r.student_id}`)) return false;
      if (method !== 'all' && r.method !== method) return false;
      if (deviceId !== 'all' && r.attendance_device_id !== Number(deviceId)) return false;
      return true;
    });

    const totalEligible = scopedParticipants.length;
    const totalRecorded = scopedRecords.length;
    const unrecorded = Math.max(0, totalEligible - totalRecorded);

    let present = 0;
    let late = 0;
    let permission = 0;
    let sick = 0;
    let dispensation = 0;
    let absent = 0;

    scopedRecords.forEach((r) => {
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

    // Zero denominator safe guarding
    const roundRate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

    return {
      totalEligible,
      totalRecorded,
      present,
      late,
      permission,
      sick,
      dispensation,
      absent,
      unrecorded,
      completionRate: roundRate(totalRecorded, totalEligible),
      attendanceRate: roundRate(present + late, totalEligible),
      onTimeRate: roundRate(present, totalEligible),
      lateRate: roundRate(late, totalEligible),
      absentRate: roundRate(absent, totalEligible),
      excusedRate: roundRate(permission + sick + dispensation, totalEligible),
    };
  }

  /**
   * Get Prayer Metrics Breakdown (Subuh, Dzuhur, Ashar, Maghrib, Isya)
   */
  static getPrayerMetrics(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    dateStr: string = '2026-08-23'
  ) {
    const prayerNames = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    const results: Record<string, MetricSummary & { sessionCount: number }> = {};

    prayerNames.forEach((pName) => {
      const pSessions = sessions.filter(
        (s) =>
          (s.session_date === dateStr || s.start_at.startsWith(dateStr)) &&
          s.activity_name.toLowerCase().includes(pName.toLowerCase()) &&
          s.status !== 'cancelled'
      );

      const metrics = this.calculateMetrics(pSessions, participants, records);
      results[pName] = {
        ...metrics,
        sessionCount: pSessions.length,
      };
    });

    return results;
  }

  /**
   * Get Method Breakdown (Manual, QR, RFID)
   */
  static getMethodBreakdown(records: AttendanceRecord[]) {
    const total = records.length;
    let manual = 0;
    let qr = 0;
    let rfid = 0;

    records.forEach((r) => {
      if (r.method === 'manual') manual++;
      else if (r.method === 'qr') qr++;
      else if (r.method === 'rfid') rfid++;
    });

    const roundPct = (num: number) => (total > 0 ? Math.round((num / total) * 1000) / 10 : 0);

    return {
      total,
      manual,
      qr,
      rfid,
      manualPct: roundPct(manual),
      qrPct: roundPct(qr),
      rfidPct: roundPct(rfid),
    };
  }

  /**
   * Get Category Breakdown Metrics
   */
  static getCategoryBreakdown(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    categories: ActivityCategory[]
  ) {
    return categories.map((cat) => {
      const catSessions = sessions.filter(
        (s) => (s.activity_category_id === cat.id || (s.category_name && s.category_name.toLowerCase() === cat.name.toLowerCase())) && s.status !== 'cancelled'
      );
      const metrics = this.calculateMetrics(catSessions, participants, records);

      return {
        category: cat,
        sessionsCount: catSessions.length,
        metrics,
      };
    });
  }

  /**
   * Get Student Individual Attendance Profile
   */
  static getStudentProfileAnalytics(
    studentId: number,
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    categories: ActivityCategory[]
  ) {
    const studentParticipants = participants.filter((p) => p.student_id === studentId);
    const sessionIds = new Set(studentParticipants.map((p) => p.attendance_session_id));
    const studentSessions = sessions.filter((s) => sessionIds.has(s.id) && s.status !== 'cancelled');

    const overallMetrics = this.calculateMetrics(studentSessions, studentParticipants, records, { studentId });

    const categoryBreakdown = categories.map((cat) => {
      const catSessions = studentSessions.filter(
        (s) => s.activity_category_id === cat.id || (s.category_name && s.category_name.toLowerCase() === cat.name.toLowerCase())
      );
      const metrics = this.calculateMetrics(catSessions, studentParticipants, records, { studentId });
      return {
        categoryName: cat.name,
        metrics,
      };
    });

    // Missed Sessions List
    const studentRecords = records.filter((r) => r.student_id === studentId);
    const recordMap = new Map(studentRecords.map((r) => [r.attendance_session_id, r]));

    const missedSessions = studentSessions
      .map((s) => {
        const rec = recordMap.get(s.id);
        return {
          session: s,
          record: rec,
          status: rec ? rec.status : 'unrecorded',
        };
      })
      .filter((item) => item.status === 'absent' || item.status === 'late' || item.status === 'permission' || item.status === 'sick');

    return {
      overallMetrics,
      categoryBreakdown,
      missedSessions,
    };
  }

  /**
   * Check Data Quality Integrity Audit for Admin
   */
  static runDataQualityAudit(
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[]
  ) {
    const issues: Array<{
      id: string;
      type: 'closed_unrecorded' | 'orphan_record' | 'empty_session';
      title: string;
      description: string;
      severity: 'high' | 'medium';
    }> = [];

    // 1. Closed session with unrecorded participants
    const closedSessions = sessions.filter((s) => s.status === 'closed');
    closedSessions.forEach((s) => {
      const sParticipants = participants.filter((p) => p.attendance_session_id === s.id && p.eligibility_status !== 'ineligible');
      const sRecords = records.filter((r) => r.attendance_session_id === s.id);

      if (sParticipants.length > sRecords.length) {
        const diff = sParticipants.length - sRecords.length;
        issues.push({
          id: `dq_unrec_${s.id}`,
          type: 'closed_unrecorded',
          title: `Sesi Ditutup Belum Lengkap: ${s.activity_name}`,
          description: `Sesi #${s.id} berstatus Ditutup tetapi masih memiliki ${diff} santri tanpa catatan presensi (seharusnya diauto-finalize Alpha).`,
          severity: 'high',
        });
      }
    });

    // 2. Empty session without eligible participants
    sessions.forEach((s) => {
      const sParticipants = participants.filter((p) => p.attendance_session_id === s.id);
      if (sParticipants.length === 0 && s.status !== 'draft') {
        issues.push({
          id: `dq_empty_${s.id}`,
          type: 'empty_session',
          title: `Sesi Tanpa Peserta Eligible: ${s.activity_name}`,
          description: `Sesi #${s.id} tidak memiliki santri terdaftar namun berstatus ${s.status.toUpperCase()}.`,
          severity: 'medium',
        });
      }
    });

    return issues;
  }
}
