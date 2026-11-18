import { 
  Activity, 
  AttendanceDevice, 
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  BulkRecordResult, 
  RecordSource, 
  SessionStatus, 
  Student, 
  User 
} from '../types';
import { StudentIdentityService } from './studentIdentityService';
import { ExcuseService } from './excuseService';

export class AttendanceEngine {
  /**
   * Normalize RFID UID: e.g. "04 a8 7f 12" -> "04A87F12"
   */
  static normalizeRfid(rawUid: string | null | undefined): string | null {
    return StudentIdentityService.normalizeRfid(rawUid);
  }

  /**
   * Determine automatic attendance status based on session timing
   */
  static determineStatus(
    checkInTimeStr: string,
    presentUntilStr: string,
    lateUntilStr: string,
    endAtStr: string
  ): { status: AttendanceStatus; lateMinutes: number; code: string; message: string } {
    const checkIn = new Date(checkInTimeStr).getTime();
    const presentUntil = new Date(presentUntilStr).getTime();
    const lateUntil = new Date(lateUntilStr).getTime();
    const endAt = new Date(endAtStr).getTime();

    if (checkIn > endAt) {
      return {
        status: 'absent',
        lateMinutes: 0,
        code: 'OUTSIDE_ATTENDANCE_TIME',
        message: 'Waktu absensi untuk sesi ini telah berakhir.',
      };
    }

    if (checkIn <= presentUntil) {
      return {
        status: 'present',
        lateMinutes: 0,
        code: 'SUCCESS',
        message: 'Hadir tepat waktu.',
      };
    }

    if (checkIn <= lateUntil || checkIn <= endAt) {
      const diffMs = checkIn - presentUntil;
      const lateMins = Math.ceil(diffMs / (60 * 1000));
      return {
        status: 'late',
        lateMinutes: lateMins,
        code: 'SUCCESS',
        message: `Terlambat ${lateMins} menit.`,
      };
    }

    return {
      status: 'absent',
      lateMinutes: 0,
      code: 'OUTSIDE_ATTENDANCE_TIME',
      message: 'Waktu absensi telah berakhir.',
    };
  }

  /**
   * Validate method allowance for activity
   */
  static isMethodAllowed(activity: Activity, method: AttendanceMethod): boolean {
    switch (method) {
      case 'manual':
        return activity.allow_manual;
      case 'qr':
        return activity.allow_qr;
      case 'rfid':
        return activity.allow_rfid;
      default:
        return false;
    }
  }


  /**
   * Single Record Attendance (Individual)
   */
  static record(params: {
    sessionId: number;
    sessionStatus: SessionStatus;
    sessionStartAt: string;
    sessionPresentUntil: string;
    sessionLateUntil: string;
    sessionEndAt: string;
    activity: Activity;
    student: Student;
    method: AttendanceMethod;
    device?: AttendanceDevice;
    operator?: User;
    checkInTime?: string;
    overrideStatus?: AttendanceStatus;
    recordSource?: RecordSource;
    notes?: string;
    existingRecords: AttendanceRecord[];
    sessionParticipants?: AttendanceSessionParticipant[];
    allowParticipantOverride?: boolean;
  }): { result: AttendanceResult; newRecord?: AttendanceRecord } {
    const {
      sessionId,
      sessionStatus,
      sessionPresentUntil,
      sessionLateUntil,
      sessionEndAt,
      activity,
      student,
      method,
      device,
      operator,
      checkInTime = new Date().toISOString(),
      overrideStatus,
      recordSource = 'operator',
      notes,
      existingRecords,
      sessionParticipants,
      allowParticipantOverride = false,
    } = params;

    // 1. Validate student active & status
    if (!student.is_active || (student.status && student.status !== 'active')) {
      const statusLabel = student.status === 'leave' ? 'Cuti' : student.status === 'transferred' ? 'Pindah' : student.status === 'graduated' ? 'Lulus' : 'Non-Aktif';
      return {
        result: {
          success: false,
          code: 'STUDENT_INACTIVE',
          message: `Santri ${student.name} (NIS: ${student.student_number}) berstatus ${statusLabel} dan tidak dapat melakukan absensi.`,
          student,
        },
      };
    }

    // 2. Validate session status
    if (sessionStatus === 'draft') {
      return {
        result: {
          success: false,
          code: 'SESSION_NOT_OPEN',
          message: 'Sesi absensi belum dibuka (masih dalam status Draf).',
          student,
        },
      };
    }

    if (sessionStatus === 'closed') {
      return {
        result: {
          success: false,
          code: 'SESSION_CLOSED',
          message: 'Sesi absensi telah ditutup.',
          student,
        },
      };
    }

    if (sessionStatus === 'cancelled') {
      return {
        result: {
          success: false,
          code: 'SESSION_CLOSED',
          message: 'Sesi absensi telah dibatalkan.',
          student,
        },
      };
    }

    // 3. Validate Session Participant Membership Snapshot
    if (sessionParticipants && sessionParticipants.length > 0 && !allowParticipantOverride) {
      const isParticipant = sessionParticipants.some(
        (p) => p.attendance_session_id === sessionId && p.student_id === student.id && p.eligibility_status !== 'ineligible'
      );

      if (!isParticipant) {
        return {
          result: {
            success: false,
            code: 'STUDENT_NOT_PARTICIPANT',
            message: `Santri ${student.name} (NIS: ${student.student_number}) bukan peserta kegiatan '${activity.name}'.`,
            student,
          },
        };
      }
    }

    // 4. Validate method allowance
    if (!this.isMethodAllowed(activity, method)) {
      const methodLabel = method === 'rfid' ? 'RFID' : method === 'qr' ? 'QR Code' : 'Manual';
      return {
        result: {
          success: false,
          code: 'INVALID_METHOD',
          message: `Metode '${methodLabel}' tidak diperbolehkan untuk kegiatan '${activity.name}'.`,
          student,
        },
      };
    }

    // 5. Duplicate protection (check in same session)
    const existing = existingRecords.find(
      (r) => r.attendance_session_id === sessionId && r.student_id === student.id
    );

    if (existing) {
      const statusLabels: Record<AttendanceStatus, string> = {
        present: 'Hadir',
        late: 'Terlambat',
        permission: 'Izin',
        sick: 'Sakit',
        dispensation: 'Dispensasi',
        absent: 'Alpha',
      };
      return {
        result: {
          success: false,
          code: 'ALREADY_RECORDED',
          message: `Santri ${student.name} sudah tercatat ${statusLabels[existing.status]} pada ${existing.check_in_at.slice(11, 16)}.`,
          record: existing,
          student,
        },
      };
    }

    // 6. Automatic Timing / Status Determination
    let status: AttendanceStatus;
    let lateMinutes = 0;

    if (overrideStatus) {
      status = overrideStatus;
      lateMinutes = overrideStatus === 'late' ? 5 : 0;
    } else {
      const timing = this.determineStatus(checkInTime, sessionPresentUntil, sessionLateUntil, sessionEndAt);
      if (timing.code === 'OUTSIDE_ATTENDANCE_TIME') {
        return {
          result: {
            success: false,
            code: 'OUTSIDE_ATTENDANCE_TIME',
            message: 'Waktu absensi untuk sesi ini telah berakhir.',
            student,
          },
        };
      }
      status = timing.status;
      lateMinutes = timing.lateMinutes;
    }

    // 7. Create Record
    const newRecord: AttendanceRecord = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      attendance_session_id: sessionId,
      student_id: student.id,
      student_name: student.name,
      student_number: student.student_number,
      classroom_name: student.classroom_name || '-',
      dormitory_room_name: student.dormitory_room_name || '-',
      status,
      method,
      record_source: recordSource,
      check_in_at: checkInTime,
      late_minutes: lateMinutes,
      attendance_device_id: device?.id,
      attendance_device_name: device?.device_name,
      recorded_by: operator?.name ?? (device ? 'Auto Engine' : 'Operator'),
      notes: notes ?? (lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : undefined),
    };

    const statusLabels: Record<AttendanceStatus, string> = {
      present: 'Hadir',
      late: 'Terlambat',
      permission: 'Izin',
      sick: 'Sakit',
      dispensation: 'Dispensasi',
      absent: 'Alpha',
    };

    return {
      result: {
        success: true,
        code: 'SUCCESS',
        message: `Absensi ${student.name} (${statusLabels[status]}) berhasil dicatat via ${method.toUpperCase()}.`,
        record: newRecord,
        student,
      },
      newRecord,
    };
  }

  /**
   * Bulk Attendance Action
   */
  static bulkRecord(params: {
    session: AttendanceSession;
    activity: Activity;
    students: Student[];
    status: AttendanceStatus;
    notes?: string;
    operator: User;
    checkInTime?: string;
    existingRecords: AttendanceRecord[];
    sessionParticipants: AttendanceSessionParticipant[];
  }): BulkRecordResult {
    const {
      session,
      activity,
      students,
      status,
      notes,
      operator,
      checkInTime = new Date().toISOString(),
      existingRecords,
      sessionParticipants,
    } = params;

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const messages: string[] = [];
    const createdRecords: AttendanceRecord[] = [];
    const currentRecords = [...existingRecords];

    students.forEach((student) => {
      // Check if already recorded in this session
      const already = currentRecords.find(
        (r) => r.attendance_session_id === session.id && r.student_id === student.id
      );

      if (already) {
        skippedCount++;
        messages.push(`${student.name}: Sudah tercatat sebelumnya (Dilewati).`);
        return;
      }

      const { result, newRecord } = this.record({
        sessionId: session.id,
        sessionStatus: session.status,
        sessionStartAt: session.start_at,
        sessionPresentUntil: session.present_until,
        sessionLateUntil: session.late_until,
        sessionEndAt: session.end_at,
        activity,
        student,
        method: 'manual',
        operator,
        checkInTime,
        overrideStatus: status,
        recordSource: 'operator',
        notes,
        existingRecords: currentRecords,
        sessionParticipants,
        allowParticipantOverride: true,
      });

      if (result.success && newRecord) {
        successCount++;
        createdRecords.push(newRecord);
        currentRecords.unshift(newRecord);
      } else {
        failedCount++;
        messages.push(`${student.name}: ${result.message}`);
      }
    });

    return {
      total: students.length,
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
      messages,
      newRecords: createdRecords,
    };
  }



}
