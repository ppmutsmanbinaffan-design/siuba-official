import { 
  Activity, 
  AttendanceDevice, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  QrAttendanceResponse, 
  Student, 
  User 
} from '../types';
import { StudentIdentityService } from './studentIdentityService';
import { AttendanceEngine } from './attendanceEngine';

export class QrAttendanceService {
  /**
   * Action: RecordQrAttendance (Sprint 4)
   * Resolves student by token and validates session, participant, activity method, and duplicates.
   */
  static recordQrAttendance(params: {
    sessionId: number;
    qrToken: string;
    deviceId?: number | null;
    operator: User;
    checkInTime?: string;
    allStudents: Student[];
    sessions: AttendanceSession[];
    activities: Activity[];
    devices: AttendanceDevice[];
    existingRecords: AttendanceRecord[];
    sessionParticipants: AttendanceSessionParticipant[];
  }): { response: QrAttendanceResponse; newRecord?: AttendanceRecord } {
    const {
      sessionId,
      qrToken,
      deviceId,
      operator,
      checkInTime = new Date().toISOString(),
      allStudents,
      sessions,
      activities,
      devices,
      existingRecords,
      sessionParticipants,
    } = params;

    // 1. Authorization check
    if (
      operator.role !== 'admin' &&
      operator.role !== 'super_admin' &&
      operator.role !== 'pengurus' &&
      operator.role !== 'ustadz' &&
      operator.role !== 'security' &&
      operator.permissions &&
      !operator.permissions.includes('attendance.qr') &&
      !operator.permissions.includes('attendance.*')
    ) {
      return {
        response: {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Anda tidak memiliki hak akses untuk memproses absensi QR (permission: attendance.qr).',
        },
      };
    }

    // 2. Validate Session
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return {
        response: {
          success: false,
          code: 'SESSION_NOT_OPEN',
          message: 'Sesi absensi tidak ditemukan.',
        },
      };
    }

    if (session.status === 'draft') {
      return {
        response: {
          success: false,
          code: 'SESSION_NOT_OPEN',
          message: 'Sesi absensi belum dibuka (masih berstatus Draf).',
        },
      };
    }

    if (session.status === 'closed' || session.status === 'cancelled') {
      return {
        response: {
          success: false,
          code: 'SESSION_CLOSED',
          message: 'Sesi absensi sudah ditutup.',
        },
      };
    }

    // 3. Validate Activity
    const activity = activities.find((a) => a.id === session.activity_id) || activities[0];
    if (!activity.allow_qr) {
      return {
        response: {
          success: false,
          code: 'INVALID_METHOD',
          message: `Metode QR Code tidak diaktifkan untuk kegiatan '${activity.name}'.`,
        },
      };
    }

    // 4. Validate Device (if provided)
    let matchedDevice: AttendanceDevice | undefined = undefined;
    if (deviceId) {
      matchedDevice = devices.find((d) => d.id === deviceId);
      if (!matchedDevice) {
        return {
          response: {
            success: false,
            code: 'INVALID_DEVICE',
            message: 'Perangkat terminal scanner tidak valid atau tidak terdaftar.',
          },
        };
      }
      if (!matchedDevice.is_active) {
        return {
          response: {
            success: false,
            code: 'INVALID_DEVICE',
            message: `Perangkat terminal '${matchedDevice.device_name}' berstatus non-aktif.`,
          },
        };
      }
      if (matchedDevice.device_type !== 'qr_scanner' && matchedDevice.device_type !== 'kiosk' && matchedDevice.device_type !== 'manual') {
        return {
          response: {
            success: false,
            code: 'INVALID_DEVICE',
            message: `Tipe perangkat '${matchedDevice.device_type}' tidak kompatibel untuk pemindaian QR.`,
          },
        };
      }
    }

    // 5. Token Syntax & Resolution
    const cleanToken = qrToken?.trim();
    if (!cleanToken) {
      return {
        response: {
          success: false,
          code: 'INVALID_QR',
          message: 'QR Token tidak valid atau kosong.',
        },
      };
    }

    const student = StudentIdentityService.resolveByQrToken(cleanToken, allStudents);
    if (!student) {
      return {
        response: {
          success: false,
          code: 'INVALID_QR',
          message: 'QR tidak terdaftar dalam database santri.',
        },
      };
    }

    // 6. Check Inactive Student
    if (!student.is_active || student.status !== 'active') {
      const statusLabel = student.status === 'leave' ? 'Cuti' : student.status === 'transferred' ? 'Pindah' : student.status === 'graduated' ? 'Lulus' : 'Non-Aktif';
      return {
        response: {
          success: false,
          code: 'STUDENT_INACTIVE',
          message: `Santri ${student.name} tidak aktif (${statusLabel}).`,
          student: {
            id: student.id,
            name: student.name,
            student_number: student.student_number,
            classroom: student.classroom_name,
            dormitory_room: student.dormitory_room_name,
            photo_path: student.photo_path,
          },
        },
      };
    }

    // 7. Check Session Participant Snapshot
    if (sessionParticipants && sessionParticipants.length > 0) {
      const isParticipant = sessionParticipants.some(
        (p) => p.attendance_session_id === session.id && p.student_id === student.id && p.eligibility_status !== 'ineligible'
      );
      if (!isParticipant) {
        return {
          response: {
            success: false,
            code: 'STUDENT_NOT_PARTICIPANT',
            message: `${student.name} bukan peserta kegiatan ini.`,
            student: {
              id: student.id,
              name: student.name,
              student_number: student.student_number,
              classroom: student.classroom_name,
              dormitory_room: student.dormitory_room_name,
              photo_path: student.photo_path,
            },
          },
        };
      }
    }

    // 8. Check Existing Duplicate Record in Database
    const existing = existingRecords.find(
      (r) => r.attendance_session_id === session.id && r.student_id === student.id
    );
    if (existing) {
      const methodLabels: Record<string, string> = {
        qr: 'QR Code',
        manual: 'Manual',
        rfid: 'RFID',
      };
      const statusLabels: Record<string, string> = {
        present: 'Hadir',
        late: 'Terlambat',
        permission: 'Izin',
        sick: 'Sakit',
        dispensation: 'Dispensasi',
        absent: 'Alpha',
      };

      const timeStr = existing.check_in_at ? existing.check_in_at.slice(11, 19) : '-';

      return {
        response: {
          success: false,
          code: 'ALREADY_RECORDED',
          message: `Santri sudah melakukan absensi (${statusLabels[existing.status] || existing.status} pukul ${timeStr} via ${methodLabels[existing.method] || existing.method}).`,
          student: {
            id: student.id,
            name: student.name,
            student_number: student.student_number,
            classroom: student.classroom_name,
            dormitory_room: student.dormitory_room_name,
            photo_path: student.photo_path,
          },
          existingAttendance: {
            status: existing.status,
            method: existing.method,
            check_in_at: existing.check_in_at,
            recorded_by: existing.recorded_by,
          },
        },
      };
    }

    // 9. Delegate to Central Core AttendanceEngine
    const engineRes = AttendanceEngine.record({
      sessionId: session.id,
      sessionStatus: session.status,
      sessionStartAt: session.start_at,
      sessionPresentUntil: session.present_until,
      sessionLateUntil: session.late_until,
      sessionEndAt: session.end_at,
      activity,
      student,
      method: 'qr',
      device: matchedDevice,
      operator,
      checkInTime,
      existingRecords,
      sessionParticipants,
      allowParticipantOverride: false,
    });

    if (!engineRes.result.success || !engineRes.newRecord) {
      return {
        response: {
          success: false,
          code: engineRes.result.code,
          message: engineRes.result.message,
          student: {
            id: student.id,
            name: student.name,
            student_number: student.student_number,
            classroom: student.classroom_name,
            dormitory_room: student.dormitory_room_name,
            photo_path: student.photo_path,
          },
        },
      };
    }

    const createdRecord = engineRes.newRecord;
    const timeFormatted = createdRecord.check_in_at.slice(11, 19);

    return {
      response: {
        success: true,
        code: 'SUCCESS',
        message: createdRecord.status === 'late' 
          ? `Absensi berhasil (Terlambat ${createdRecord.late_minutes} menit).` 
          : 'Absensi berhasil (Hadir tepat waktu).',
        student: {
          id: student.id,
          name: student.name,
          student_number: student.student_number,
          classroom: student.classroom_name,
          dormitory_room: student.dormitory_room_name,
          photo_path: student.photo_path,
        },
        attendance: {
          id: createdRecord.id,
          status: createdRecord.status,
          method: createdRecord.method,
          check_in_at: timeFormatted,
          late_minutes: createdRecord.late_minutes,
          device_name: createdRecord.attendance_device_name,
          recorded_by: createdRecord.recorded_by,
        },
        newRecord: createdRecord,
      },
      newRecord: createdRecord,
    };
  }
}
