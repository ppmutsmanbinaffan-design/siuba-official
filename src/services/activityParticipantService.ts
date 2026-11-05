import { 
  Activity, 
  ActivityParticipant, 
  ActivityParticipantRule,
  AttendanceSession, 
  AttendanceSessionParticipant, 
  DormitoryRoom, 
  DutyRoster,
  EventRegistration,
  ExtracurricularMember, 
  HalaqahMember,
  ParticipantType, 
  Student, 
  StudentGroupMember, 
  WalkInAuditLog
} from '../types';

export class ActivityParticipantService {
  /**
   * Resolve Dynamic Participants for an Activity using Rule Engine or Legacy Mode
   */
  static resolveParticipants(params: {
    activity: Activity;
    students: Student[];
    dormitoryRooms?: DormitoryRoom[];
    activityParticipants?: ActivityParticipant[];
    extracurricularMembers?: ExtracurricularMember[];
    studentGroupMembers?: StudentGroupMember[];
    halaqahMembers?: HalaqahMember[];
    dutyRosters?: DutyRoster[];
    eventRegistrations?: EventRegistration[];
    participantRules?: ActivityParticipantRule[];
    targetDate?: string;
  }): {
    students: Student[];
    sourceType: ParticipantType | 'manual' | 'dynamic_rules';
    sourceDetails: string;
    ruleSourcesMap?: Record<number, string[]>;
  } {
    const {
      activity,
      students,
      dormitoryRooms = [],
      activityParticipants = [],
      extracurricularMembers = [],
      studentGroupMembers = [],
      halaqahMembers = [],
      dutyRosters = [],
      eventRegistrations = [],
      participantRules = [],
      targetDate,
    } = params;

    // Base filter: Only active students with status 'active'
    let eligibleStudents = students.filter(
      (s) => s.is_active && (s.status === 'active' || !s.status) && !s.deleted_at
    );

    // Apply Gender Restriction if specified on activity
    if (activity.participant_gender && activity.participant_gender !== 'all') {
      const gTarget = activity.participant_gender;
      eligibleStudents = eligibleStudents.filter((s) => {
        const sGender = s.gender === 'male' || s.gender === 'L' ? 'male' : 'female';
        return sGender === gTarget;
      });
    }

    // Check if there are active Dynamic Participant Rules for this activity
    const activeRules = participantRules.filter(
      (r) => r.activity_id === activity.id && r.is_active
    );

    if (activeRules.length > 0) {
      return this.resolveDynamicParticipantRules({
        rules: activeRules,
        students: eligibleStudents,
        dormitoryRooms,
        activityParticipants,
        extracurricularMembers,
        studentGroupMembers,
        halaqahMembers,
        dutyRosters,
        eventRegistrations,
        targetDate,
      });
    }

    let resultStudents: Student[] = [];
    let sourceDetails = '';

    switch (activity.participant_type) {
      case 'all_students':
        resultStudents = eligibleStudents;
        sourceDetails = `Semua Santri Aktif (${eligibleStudents.length} santri)`;
        break;

      case 'classroom':
        if (activity.classroom_id) {
          resultStudents = eligibleStudents.filter((s) => s.classroom_id === activity.classroom_id);
          const cName = resultStudents[0]?.classroom_name || `Kelas ID ${activity.classroom_id}`;
          sourceDetails = `Anggota Kelas: ${cName}`;
        } else {
          resultStudents = [];
          sourceDetails = 'Kelas belum ditentukan';
        }
        break;

      case 'dormitory':
        if (activity.dormitory_id) {
          const roomIdsInDorm = dormitoryRooms
            .filter((r) => r.dormitory_id === activity.dormitory_id)
            .map((r) => r.id);
          resultStudents = eligibleStudents.filter((s) => s.dormitory_room_id && roomIdsInDorm.includes(s.dormitory_room_id));
          sourceDetails = `Penghuni Asrama ID ${activity.dormitory_id}`;
        } else {
          resultStudents = [];
          sourceDetails = 'Asrama belum ditentukan';
        }
        break;

      case 'room':
        if (activity.dormitory_room_id) {
          resultStudents = eligibleStudents.filter((s) => s.dormitory_room_id === activity.dormitory_room_id);
          const rName = resultStudents[0]?.dormitory_room_name || `Kamar ID ${activity.dormitory_room_id}`;
          sourceDetails = `Penghuni Kamar: ${rName}`;
        } else {
          resultStudents = [];
          sourceDetails = 'Kamar belum ditentukan';
        }
        break;

      case 'extracurricular':
        if (activity.extracurricular_id) {
          const activeMemberStudentIds = extracurricularMembers
            .filter((m) => m.extracurricular_id === activity.extracurricular_id && m.is_active)
            .map((m) => m.student_id);
          resultStudents = eligibleStudents.filter((s) => activeMemberStudentIds.includes(s.id));
          sourceDetails = `Anggota Aktif Ekstrakurikuler ID ${activity.extracurricular_id}`;
        } else {
          resultStudents = [];
          sourceDetails = 'Ekstrakurikuler belum ditentukan';
        }
        break;

      case 'custom_group':
        if (activity.student_group_id) {
          const groupMemberStudentIds = studentGroupMembers
            .filter((m) => m.student_group_id === activity.student_group_id)
            .map((m) => m.student_id);
          resultStudents = eligibleStudents.filter((s) => groupMemberStudentIds.includes(s.id));
          sourceDetails = `Anggota Kelompok Khusus ID ${activity.student_group_id}`;
        } else {
          resultStudents = [];
          sourceDetails = 'Kelompok Khusus belum ditentukan';
        }
        break;

      case 'halaqah':
        if (activity.halaqah_id) {
          const halaqahMemberStudentIds = halaqahMembers
            .filter((m) => m.halaqah_id === activity.halaqah_id && m.is_active)
            .map((m) => m.student_id);
          resultStudents = eligibleStudents.filter((s) => halaqahMemberStudentIds.includes(s.id));
          sourceDetails = `Anggota Halaqah Tahfidz ID ${activity.halaqah_id}`;
        } else {
          resultStudents = [];
          sourceDetails = 'Halaqah Tahfidz belum ditentukan';
        }
        break;

      case 'duty_roster': {
        const activeRosterStudentIds = dutyRosters
          .filter(
            (r) =>
              r.activity_id === activity.id &&
              r.is_active &&
              (!targetDate || r.date === targetDate)
          )
          .map((r) => r.student_id);
        resultStudents = eligibleStudents.filter((s) => activeRosterStudentIds.includes(s.id));
        sourceDetails = `Petugas Roster Kebersihan/Piket (${resultStudents.length} santri bertugas)`;
        break;
      }

      case 'individual':
      default: {
        // If eventRegistrations exist for this activity's event
        if (eventRegistrations.length > 0) {
          const approvedStudentIds = eventRegistrations
            .filter((r) => r.status === 'approved' || r.status === 'attended')
            .map((r) => r.student_id);
          resultStudents = eligibleStudents.filter((s) => approvedStudentIds.includes(s.id));
          sourceDetails = `Peserta Terdaftar Event (${resultStudents.length} terkonfirmasi)`;
        } else {
          const assignedStudentIds = activityParticipants
            .filter((p) => p.activity_id === activity.id && p.is_active)
            .map((p) => p.student_id);
          resultStudents = eligibleStudents.filter((s) => assignedStudentIds.includes(s.id));
          sourceDetails = `Penugasan Perorangan (${resultStudents.length} santri terpilih)`;
        }
        break;
      }
    }

    // Deduplicate (Ensures no student is included multiple times)
    const uniqueMap = new Map<number, Student>();
    resultStudents.forEach((s) => {
      if (!uniqueMap.has(s.id)) {
        uniqueMap.set(s.id, s);
      }
    });

    return {
      students: Array.from(uniqueMap.values()),
      sourceType: activity.participant_type,
      sourceDetails,
    };
  }

  /**
   * Pipeline for Resolving Dynamic Participant Rules (Include / Exclude)
   * Precedence: Union of Includes -> Filter Hard Excludes -> Deduplicate
   */
  static resolveDynamicParticipantRules(params: {
    rules: ActivityParticipantRule[];
    students: Student[];
    dormitoryRooms?: DormitoryRoom[];
    activityParticipants?: ActivityParticipant[];
    extracurricularMembers?: ExtracurricularMember[];
    studentGroupMembers?: StudentGroupMember[];
    halaqahMembers?: HalaqahMember[];
    dutyRosters?: DutyRoster[];
    eventRegistrations?: EventRegistration[];
    targetDate?: string;
  }): {
    students: Student[];
    sourceType: 'dynamic_rules';
    sourceDetails: string;
    ruleSourcesMap: Record<number, string[]>;
  } {
    const {
      rules,
      students,
      dormitoryRooms = [],
      activityParticipants = [],
      extracurricularMembers = [],
      studentGroupMembers = [],
      halaqahMembers = [],
      dutyRosters = [],
      eventRegistrations = [],
      targetDate,
    } = params;

    const includeRules = rules.filter((r) => r.rule_operator === 'include' && r.is_active);
    const excludeRules = rules.filter((r) => r.rule_operator === 'exclude' && r.is_active);

    const includedMap = new Map<number, Student>();
    const sourcesMap: Record<number, string[]> = {};

    const addStudentWithSource = (s: Student, sourceDesc: string) => {
      includedMap.set(s.id, s);
      if (!sourcesMap[s.id]) {
        sourcesMap[s.id] = [];
      }
      if (!sourcesMap[s.id].includes(sourceDesc)) {
        sourcesMap[s.id].push(sourceDesc);
      }
    };

    // Process INCLUDE Rules (Union)
    includeRules.forEach((rule) => {
      const val = rule.rule_value;

      switch (rule.rule_type) {
        case 'all_students':
          students.forEach((s) => addStudentWithSource(s, 'Rule: Semua Santri'));
          break;

        case 'classroom':
          students
            .filter((s) => s.classroom_name === val || String(s.classroom_id) === val)
            .forEach((s) => addStudentWithSource(s, `Rule Include Kelas ${val}`));
          break;

        case 'grade_level':
          students
            .filter((s) => s.classroom_name && s.classroom_name.startsWith(val))
            .forEach((s) => addStudentWithSource(s, `Rule Include Tingkat ${val}`));
          break;

        case 'gender':
          students
            .filter((s) => s.gender === val || (val === 'male' && s.gender === 'L') || (val === 'female' && s.gender === 'P'))
            .forEach((s) => addStudentWithSource(s, `Rule Include Gender ${val}`));
          break;

        case 'dormitory':
          {
            const dormId = Number(val);
            const roomIds = dormitoryRooms.filter((r) => r.dormitory_id === dormId).map((r) => r.id);
            students
              .filter((s) => s.dormitory_room_id && roomIds.includes(s.dormitory_room_id))
              .forEach((s) => addStudentWithSource(s, `Rule Include Asrama ID ${val}`));
          }
          break;

        case 'room':
          students
            .filter((s) => String(s.dormitory_room_id) === val || s.dormitory_room_name === val)
            .forEach((s) => addStudentWithSource(s, `Rule Include Kamar ${val}`));
          break;

        case 'extracurricular':
          {
            const ekskulId = Number(val);
            const memberStudentIds = extracurricularMembers
              .filter((m) => m.extracurricular_id === ekskulId && m.is_active)
              .map((m) => m.student_id);
            students
              .filter((s) => memberStudentIds.includes(s.id))
              .forEach((s) => addStudentWithSource(s, `Rule Include Ekskul ID ${val}`));
          }
          break;

        case 'custom_group':
          {
            const groupId = Number(val);
            const memberStudentIds = studentGroupMembers
              .filter((m) => m.student_group_id === groupId)
              .map((m) => m.student_id);
            students
              .filter((s) => memberStudentIds.includes(s.id))
              .forEach((s) => addStudentWithSource(s, `Rule Include Kelompok ID ${val}`));
          }
          break;

        case 'halaqah':
          {
            const halaqahId = Number(val);
            const memberStudentIds = halaqahMembers
              .filter((m) => m.halaqah_id === halaqahId && m.is_active)
              .map((m) => m.student_id);
            students
              .filter((s) => memberStudentIds.includes(s.id))
              .forEach((s) => addStudentWithSource(s, `Rule Include Halaqah ID ${val}`));
          }
          break;

        case 'duty_roster':
          {
            const rosterStudentIds = dutyRosters
              .filter((r) => r.is_active && (!targetDate || r.date === targetDate))
              .map((r) => r.student_id);
            students
              .filter((s) => rosterStudentIds.includes(s.id))
              .forEach((s) => addStudentWithSource(s, `Rule Include Duty Roster (${targetDate || 'All'})`));
          }
          break;

        case 'registration':
          {
            const approvedStudentIds = eventRegistrations
              .filter((r) => r.status === 'approved' || r.status === 'attended')
              .map((r) => r.student_id);
            students
              .filter((s) => approvedStudentIds.includes(s.id))
              .forEach((s) => addStudentWithSource(s, 'Rule Include Pendaftaran Approved'));
          }
          break;

        case 'individual':
        default:
          {
            const targetStudentId = Number(val);
            const st = students.find((s) => s.id === targetStudentId || s.student_number === val);
            if (st) addStudentWithSource(st, `Rule Include Perorangan (${st.name})`);
          }
          break;
      }
    });

    // Process EXCLUDE Rules (Hard Exclude - overrides includes)
    const excludedStudentIds = new Set<number>();

    excludeRules.forEach((rule) => {
      const val = rule.rule_value;

      switch (rule.rule_type) {
        case 'classroom':
          students
            .filter((s) => s.classroom_name === val || String(s.classroom_id) === val)
            .forEach((s) => excludedStudentIds.add(s.id));
          break;

        case 'grade_level':
          students
            .filter((s) => s.classroom_name && s.classroom_name.startsWith(val))
            .forEach((s) => excludedStudentIds.add(s.id));
          break;

        case 'gender':
          students
            .filter((s) => s.gender === val || (val === 'male' && s.gender === 'L') || (val === 'female' && s.gender === 'P'))
            .forEach((s) => excludedStudentIds.add(s.id));
          break;

        case 'individual':
        default:
          {
            const targetStudentId = Number(val);
            students
              .filter((s) => s.id === targetStudentId || s.student_number === val || s.name === val)
              .forEach((s) => excludedStudentIds.add(s.id));
          }
          break;
      }
    });

    // Apply Hard Exclude Filter
    const finalStudents = Array.from(includedMap.values()).filter((s) => !excludedStudentIds.has(s.id));

    const sourceDetails = `Rule Engine Dinamis: ${includeRules.length} Include, ${excludeRules.length} Excluded -> ${finalStudents.length} Peserta Final`;

    return {
      students: finalStudents,
      sourceType: 'dynamic_rules',
      sourceDetails,
      ruleSourcesMap: sourcesMap,
    };
  }

  /**
   * Generate Immutable Session Participants Snapshot
   */
  static generateSessionParticipantsSnapshot(params: {
    session: AttendanceSession;
    activity: Activity;
    students: Student[];
    dormitoryRooms?: DormitoryRoom[];
    activityParticipants?: ActivityParticipant[];
    extracurricularMembers?: ExtracurricularMember[];
    studentGroupMembers?: StudentGroupMember[];
    halaqahMembers?: HalaqahMember[];
    dutyRosters?: DutyRoster[];
    eventRegistrations?: EventRegistration[];
    participantRules?: ActivityParticipantRule[];
  }): AttendanceSessionParticipant[] {
    const { 
      session, 
      activity, 
      students, 
      dormitoryRooms, 
      activityParticipants, 
      extracurricularMembers, 
      studentGroupMembers, 
      halaqahMembers, 
      dutyRosters,
      eventRegistrations,
      participantRules,
    } = params;

    const resolved = this.resolveParticipants({
      activity,
      students,
      dormitoryRooms,
      activityParticipants,
      extracurricularMembers,
      studentGroupMembers,
      halaqahMembers,
      dutyRosters,
      eventRegistrations,
      participantRules,
      targetDate: session.session_date,
    });

    const nowStr = new Date().toISOString();

    return resolved.students.map((st, idx) => {
      const sources = resolved.ruleSourcesMap?.[st.id];
      const sourceDesc = sources && sources.length > 0 ? sources.join(' + ') : resolved.sourceType;

      return {
        id: Number(`${session.id}${idx + 1}`),
        attendance_session_id: session.id,
        student_id: st.id,
        student_name: st.name,
        student_number: st.student_number,
        classroom_name: st.classroom_name || '-',
        dormitory_room_name: st.dormitory_room_name || '-',
        participant_source: sourceDesc,
        eligibility_status: 'eligible',
        created_at: nowStr,
      };
    });
  }

  /**
   * Add Walk-In Participant to Session Participant Snapshot with Audit Logging
   */
  static addWalkInParticipantSnapshot(params: {
    session: AttendanceSession;
    student: Student;
    operatorName: string;
    reason: string;
    existingParticipants: AttendanceSessionParticipant[];
    existingAuditLogs: WalkInAuditLog[];
  }): {
    updatedParticipants: AttendanceSessionParticipant[];
    updatedAuditLogs: WalkInAuditLog[];
    newParticipant: AttendanceSessionParticipant;
  } {
    const { session, student, operatorName, reason, existingParticipants, existingAuditLogs } = params;

    const nowStr = new Date().toISOString();

    const newParticipant: AttendanceSessionParticipant = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      attendance_session_id: session.id,
      student_id: student.id,
      student_name: student.name,
      student_number: student.student_number,
      classroom_name: student.classroom_name || '-',
      dormitory_room_name: student.dormitory_room_name || '-',
      participant_source: `walk_in (${operatorName})`,
      eligibility_status: 'eligible',
      created_at: nowStr,
    };

    const newAuditLog: WalkInAuditLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      session_id: session.id,
      activity_name: session.activity_name,
      student_id: student.id,
      student_name: student.name,
      student_number: student.student_number,
      operator_name: operatorName,
      reason,
      timestamp: nowStr,
    };

    return {
      updatedParticipants: [...existingParticipants, newParticipant],
      updatedAuditLogs: [...existingAuditLogs, newAuditLog],
      newParticipant,
    };
  }

  /**
   * Check if student is an authorized participant in the session snapshot
   */
  static isStudentSessionParticipant(
    studentId: number,
    sessionId: number,
    sessionParticipants: AttendanceSessionParticipant[]
  ): boolean {
    const records = sessionParticipants.filter((p) => p.attendance_session_id === sessionId);
    if (records.length === 0) {
      // If no snapshot exists yet (legacy/draft), fallback to true
      return true;
    }
    return records.some((p) => p.student_id === studentId && p.eligibility_status !== 'ineligible');
  }
}

