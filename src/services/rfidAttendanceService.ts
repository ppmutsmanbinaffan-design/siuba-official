import { 
  Activity, 
  AttendanceDevice, 
  AttendanceDeviceLog, 
  AttendanceDeviceSession, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  RfidAttendanceResponse, 
  Student, 
  User 
} from '../types';
import { StudentIdentityService } from './studentIdentityService';
import { AttendanceEngine } from './attendanceEngine';

export class RfidAttendanceService {
  /**
   * Simple standard cryptographic hash simulation for device tokens (SHA-256 simulation in JS/TS)
   */
  static hashSecret(secret: string): string {
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
      const char = secret.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    // Prefix with hex signature
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256_dev_${hex}_${secret.slice(-6)}`;
  }

  /**
   * Generate a random high-entropy device secret token
   * Format: sec_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   */
  static generateDeviceSecret(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 32; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `sec_live_${rand}`;
  }

  /**
   * Middleware / Helper: Authenticate Attendance Device
   */
  static authenticateDevice(params: {
    deviceCode?: string;
    deviceSecret?: string;
    authHeader?: string; // e.g. "Bearer sec_live_..."
    devices: AttendanceDevice[];
  }): { success: boolean; code?: string; message?: string; device?: AttendanceDevice } {
    const { deviceCode, deviceSecret, authHeader, devices } = params;

    // Extract token from header or secret param
    let token = deviceSecret?.trim();
    if (!token && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!deviceCode || !token) {
      return {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Kredensial perangkat (X-Device-Code / Bearer Secret) tidak ditemukan pada header request.',
      };
    }

    const device = devices.find((d) => d.device_code.toUpperCase() === deviceCode.trim().toUpperCase());
    if (!device) {
      return {
        success: false,
        code: 'INVALID_DEVICE',
        message: `Perangkat dengan kode '${deviceCode}' tidak terdaftar di sistem.`,
      };
    }

    if (!device.is_active) {
      return {
        success: false,
        code: 'DEVICE_DISABLED',
        message: `Perangkat '${device.device_name}' (${device.device_code}) berstatus NON-AKTIF. Silakan hubungi admin.`,
      };
    }

    if (device.device_type !== 'rfid_reader' && device.device_type !== 'kiosk') {
      return {
        success: false,
        code: 'INVALID_DEVICE',
        message: `Tipe perangkat '${device.device_type}' tidak kompatibel untuk pemindaian RFID.`,
      };
    }

    // Verify Secret Hash
    const expectedHash = device.api_token_hash || (device.plain_secret_preview ? this.hashSecret(device.plain_secret_preview) : null);
    const providedHash = this.hashSecret(token);

    if (device.plain_secret_preview && device.plain_secret_preview === token) {
      // Validated via direct plain match during development preview
      return { success: true, device };
    }

    if (expectedHash && expectedHash === providedHash) {
      return { success: true, device };
    }

    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Autentikasi gagal: Secret Key / Token perangkat RFID tidak cocok.',
    };
  }

  /**
   * Resolve Active Session for a given Device
   * Strategy:
   * 1. If explicit locked current_session_id exists in device, use it.
   * 2. If device is assigned to a default_activity_id, query open sessions for that activity.
   * 3. Else search for currently active session for device's assigned activity.
   */
  static resolveDeviceSession(params: {
    device: AttendanceDevice;
    sessions: AttendanceSession[];
    explicitSessionId?: number;
  }): { success: boolean; code?: string; message?: string; session?: AttendanceSession } {
    const { device, sessions, explicitSessionId } = params;

    // 1. Explicit ID
    if (explicitSessionId) {
      const explicit = sessions.find((s) => s.id === explicitSessionId);
      if (explicit && explicit.status === 'open') {
        return { success: true, session: explicit };
      }
      return {
        success: false,
        code: explicit?.status === 'closed' ? 'SESSION_CLOSED' : 'SESSION_NOT_OPEN',
        message: explicit ? `Sesi ${explicit.activity_name} berstatus ${explicit.status}.` : 'Sesi tidak ditemukan.',
      };
    }

    // 2. Device Session Lock
    if (device.current_session_id) {
      const lockedSession = sessions.find((s) => s.id === device.current_session_id);
      if (lockedSession && lockedSession.status === 'open') {
        return { success: true, session: lockedSession };
      }
    }

    // 3. Activity Default Link
    if (device.default_activity_id) {
      const openSessions = sessions.filter(
        (s) => s.activity_id === device.default_activity_id && s.status === 'open'
      );

      if (openSessions.length === 1) {
        return { success: true, session: openSessions[0] };
      }

      if (openSessions.length > 1) {
        return {
          success: false,
          code: 'MULTIPLE_ACTIVE_SESSIONS',
          message: `Ditemukan ${openSessions.length} sesi aktif bersamaan untuk kegiatan ini. Perangkat memerlukan penugasan sesi eksplisit oleh admin.`,
        };
      }
    }

    // 4. Any open session where device location matches or first open session
    const matchingLocationSessions = sessions.filter(
      (s) => s.status === 'open' && (s.location === device.location || s.location.includes('Masjid'))
    );
    if (matchingLocationSessions.length === 1) {
      return { success: true, session: matchingLocationSessions[0] };
    }

    const allOpen = sessions.filter((s) => s.status === 'open');
    if (allOpen.length === 1) {
      return { success: true, session: allOpen[0] };
    }

    if (allOpen.length > 1) {
      return {
        success: false,
        code: 'MULTIPLE_ACTIVE_SESSIONS',
        message: 'Terdapat beberapa sesi aktif. Silakan tautkan perangkat ke sesi tertentu melalui Dashboard Perangkat.',
      };
    }

    return {
      success: false,
      code: 'NO_ACTIVE_SESSION',
      message: 'Tidak ada sesi absensi yang sedang aktif/terbuka untuk perangkat ini.',
    };
  }

  /**
   * Action: RecordRfidAttendance (Sprint 5)
   * Main RFID Check-In Action
   */
  static recordRfidAttendance(params: {
    rawRfidUid: string;
    deviceCode: string;
    deviceSecret?: string;
    authHeader?: string;
    explicitSessionId?: number;
    checkInTime?: string;
    devices: AttendanceDevice[];
    allStudents: Student[];
    sessions: AttendanceSession[];
    activities: Activity[];
    existingRecords: AttendanceRecord[];
    sessionParticipants: AttendanceSessionParticipant[];
  }): { 
    response: RfidAttendanceResponse; 
    newRecord?: AttendanceRecord;
    updatedDevice?: AttendanceDevice;
    deviceLog?: AttendanceDeviceLog;
  } {
    const {
      rawRfidUid,
      deviceCode,
      deviceSecret,
      authHeader,
      explicitSessionId,
      checkInTime = new Date().toISOString().slice(0, 19).replace('T', ' '),
      devices,
      allStudents,
      sessions,
      activities,
      existingRecords,
      sessionParticipants,
    } = params;

    const serverTime = checkInTime;

    // 1. Authenticate Device
    const auth = this.authenticateDevice({
      deviceCode,
      deviceSecret,
      authHeader,
      devices,
    });

    if (!auth.success || !auth.device) {
      return {
        response: {
          success: false,
          code: (auth.code as any) || 'UNAUTHORIZED',
          message: auth.message || 'Device authentication failed.',
          server_time: serverTime,
        },
      };
    }

    const device = auth.device;

    // Update device timestamp & telemetry
    const updatedDevice: AttendanceDevice = {
      ...device,
      last_seen_at: serverTime,
      tap_count_today: (device.tap_count_today || 0) + 1,
      updated_at: serverTime,
    };

    // 2. Resolve Active Session for this Device
    const sessionRes = this.resolveDeviceSession({
      device,
      sessions,
      explicitSessionId,
    });

    if (!sessionRes.success || !sessionRes.session) {
      const log: AttendanceDeviceLog = {
        id: Date.now(),
        attendance_device_id: device.id,
        device_code: device.device_code,
        event_type: 'NO_ACTIVE_SESSION',
        level: 'warning',
        message: sessionRes.message || 'Percobaan tap RFID saat tidak ada sesi aktif.',
        created_at: serverTime,
      };

      return {
        response: {
          success: false,
          code: (sessionRes.code as any) || 'NO_ACTIVE_SESSION',
          message: sessionRes.message || 'Tidak ada sesi absensi aktif untuk perangkat ini.',
          server_time: serverTime,
        },
        updatedDevice,
        deviceLog: log,
      };
    }

    const session = sessionRes.session;

    // 3. Validate Activity allow_rfid
    const activity = activities.find((a) => a.id === session.activity_id) || activities[0];
    if (!activity.allow_rfid) {
      return {
        response: {
          success: false,
          code: 'INVALID_METHOD',
          message: `Metode RFID tidak diizinkan untuk kegiatan '${activity.name}'.`,
          server_time: serverTime,
        },
        updatedDevice,
      };
    }

    // 4. Normalize RFID UID & Resolve Student
    const normalizedUid = StudentIdentityService.normalizeRfid(rawRfidUid);
    if (!normalizedUid) {
      return {
        response: {
          success: false,
          code: 'RFID_NOT_REGISTERED',
          message: 'Format RFID UID tidak valid.',
          server_time: serverTime,
        },
        updatedDevice,
      };
    }

    const student = StudentIdentityService.resolveByRfidUid(normalizedUid, allStudents);
    if (!student) {
      const log: AttendanceDeviceLog = {
        id: Date.now(),
        attendance_device_id: device.id,
        device_code: device.device_code,
        event_type: 'RFID_NOT_REGISTERED',
        level: 'info',
        message: `Kartu RFID UID '${normalizedUid}' tidak terdaftar pada santri manapun.`,
        created_at: serverTime,
      };

      return {
        response: {
          success: false,
          code: 'RFID_NOT_REGISTERED',
          message: `KARTU TIDAK TERDAFTAR (UID: ${normalizedUid})`,
          server_time: serverTime,
        },
        updatedDevice,
        deviceLog: log,
      };
    }

    // 5. Check Inactive Student
    if (!student.is_active || student.status !== 'active') {
      const statusLabel = student.status === 'leave' ? 'Cuti' : student.status === 'transferred' ? 'Pindah' : student.status === 'graduated' ? 'Lulus' : 'Non-Aktif';
      return {
        response: {
          success: false,
          code: 'STUDENT_INACTIVE',
          message: `Santri ${student.name} tidak aktif (${statusLabel}).`,
          display_name: student.name,
          server_time: serverTime,
          student: {
            id: student.id,
            name: student.name,
            student_number: student.student_number,
            classroom: student.classroom_name,
            dormitory_room: student.dormitory_room_name,
            photo_path: student.photo_path,
          },
        },
        updatedDevice,
      };
    }

    // 6. Check Session Participant Snapshot
    if (sessionParticipants && sessionParticipants.length > 0) {
      const isParticipant = sessionParticipants.some(
        (p) => p.attendance_session_id === session.id && p.student_id === student.id && p.eligibility_status !== 'ineligible'
      );

      if (!isParticipant) {
        return {
          response: {
            success: false,
            code: 'STUDENT_NOT_PARTICIPANT',
            message: `${student.name} bukan peserta kegiatan '${activity.name}'.`,
            display_name: student.name,
            server_time: serverTime,
            student: {
              id: student.id,
              name: student.name,
              student_number: student.student_number,
              classroom: student.classroom_name,
              dormitory_room: student.dormitory_room_name,
              photo_path: student.photo_path,
            },
          },
          updatedDevice,
        };
      }
    }

    // 7. Check Duplicate Record (cross-method and same session)
    const existing = existingRecords.find(
      (r) => r.attendance_session_id === session.id && r.student_id === student.id
    );

    if (existing) {
      const methodLabels: Record<string, string> = {
        rfid: 'RFID Card',
        qr: 'QR Code',
        manual: 'Manual',
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
          message: `SUDAH ABSEN: ${student.name} (${statusLabels[existing.status] || existing.status} pukul ${timeStr} via ${methodLabels[existing.method] || existing.method}).`,
          display_name: student.name,
          server_time: serverTime,
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
        updatedDevice,
      };
    }

    // 8. Delegate to Core AttendanceEngine
    const engineRes = AttendanceEngine.record({
      sessionId: session.id,
      sessionStatus: session.status,
      sessionStartAt: session.start_at,
      sessionPresentUntil: session.present_until,
      sessionLateUntil: session.late_until,
      sessionEndAt: session.end_at,
      activity,
      student,
      method: 'rfid',
      device,
      checkInTime: serverTime,
      recordSource: 'device',
      existingRecords,
      sessionParticipants,
    });

    if (!engineRes.result.success || !engineRes.newRecord) {
      return {
        response: {
          success: false,
          code: engineRes.result.code,
          message: engineRes.result.message,
          display_name: student.name,
          server_time: serverTime,
          student: {
            id: student.id,
            name: student.name,
            student_number: student.student_number,
            classroom: student.classroom_name,
            dormitory_room: student.dormitory_room_name,
            photo_path: student.photo_path,
          },
        },
        updatedDevice,
      };
    }

    const newRecord = engineRes.newRecord;

    const log: AttendanceDeviceLog = {
      id: Date.now(),
      attendance_device_id: device.id,
      device_code: device.device_code,
      event_type: 'CARD_SCANNED',
      level: 'info',
      message: `Tap RFID sukses: ${student.name} (${newRecord.status === 'late' ? `Terlambat ${newRecord.late_minutes}m` : 'Tepat Waktu'})`,
      metadata: {
        student_id: student.id,
        student_number: student.student_number,
        rfid_uid: normalizedUid,
        status: newRecord.status,
        late_minutes: newRecord.late_minutes,
      },
      created_at: serverTime,
    };

    return {
      response: {
        success: true,
        code: 'SUCCESS',
        message: newRecord.status === 'late' 
          ? `Hadir Terlambat (${newRecord.late_minutes} menit)` 
          : 'Absensi Berhasil (Tepat Waktu)',
        display_name: student.name,
        server_time: serverTime,
        student: {
          id: student.id,
          name: student.name,
          student_number: student.student_number,
          classroom: student.classroom_name,
          dormitory_room: student.dormitory_room_name,
          photo_path: student.photo_path,
        },
        attendance: {
          id: newRecord.id,
          status: newRecord.status,
          method: 'rfid',
          check_in_at: newRecord.check_in_at,
          late_minutes: newRecord.late_minutes,
          device_name: device.device_name,
          recorded_by: 'Auto Engine (RFID)',
        },
        newRecord,
      },
      newRecord,
      updatedDevice,
      deviceLog: log,
    };
  }

  /**
   * Device Heartbeat Handler
   */
  static processHeartbeat(params: {
    deviceCode: string;
    deviceSecret?: string;
    authHeader?: string;
    firmwareVersion?: string;
    ipAddress?: string;
    devices: AttendanceDevice[];
  }): { 
    success: boolean; 
    server_time: string; 
    code?: string; 
    message?: string; 
    device?: AttendanceDevice;
    updatedDevice?: AttendanceDevice;
    deviceLog?: AttendanceDeviceLog;
  } {
    const { deviceCode, deviceSecret, authHeader, firmwareVersion, ipAddress, devices } = params;
    const serverTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const auth = this.authenticateDevice({ deviceCode, deviceSecret, authHeader, devices });
    if (!auth.success || !auth.device) {
      return {
        success: false,
        server_time: serverTime,
        code: auth.code || 'UNAUTHORIZED',
        message: auth.message || 'Heartbeat authentication failed.',
      };
    }

    const device = auth.device;
    const updatedDevice: AttendanceDevice = {
      ...device,
      last_seen_at: serverTime,
      firmware_version: firmwareVersion || device.firmware_version || '1.0.0',
      ip_address: ipAddress || device.ip_address,
      updated_at: serverTime,
    };

    return {
      success: true,
      server_time: serverTime,
      code: 'SUCCESS',
      message: 'Heartbeat acknowledged.',
      device,
      updatedDevice,
    };
  }

  /**
   * Rotate Device Secret
   */
  static rotateDeviceSecret(params: {
    deviceId: number;
    devices: AttendanceDevice[];
    operator: User;
  }): { 
    success: boolean; 
    updatedDevice: AttendanceDevice; 
    newPlainSecret: string; 
    deviceLog: AttendanceDeviceLog;
  } {
    const { deviceId, devices, operator } = params;
    const device = devices.find((d) => d.id === deviceId);
    if (!device) {
      throw new Error(`Device ID ${deviceId} not found.`);
    }

    const newSecret = this.generateDeviceSecret();
    const newHash = this.hashSecret(newSecret);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const updatedDevice: AttendanceDevice = {
      ...device,
      api_token_hash: newHash,
      plain_secret_preview: newSecret,
      updated_at: now,
    };

    const deviceLog: AttendanceDeviceLog = {
      id: Date.now(),
      attendance_device_id: device.id,
      device_code: device.device_code,
      event_type: 'SECRET_ROTATED',
      level: 'warning',
      message: `Kredensial / Secret Key perangkat berhasil di-regenerasi oleh ${operator.name}. Token lama langsung invalid.`,
      metadata: {
        operator_id: operator.id,
        operator_name: operator.name,
      },
      created_at: now,
    };

    return {
      success: true,
      updatedDevice,
      newPlainSecret: newSecret,
      deviceLog,
    };
  }

  /**
   * Check Device Online status based on last_seen_at (Online if seen within threshold, e.g. 2 minutes)
   */
  static isDeviceOnline(device: AttendanceDevice, thresholdMinutes: number = 2): boolean {
    if (!device.last_seen_at) return false;
    const lastSeen = new Date(device.last_seen_at).getTime();
    const now = Date.now();
    const diffMins = (now - lastSeen) / (1000 * 60);
    return diffMins <= thresholdMinutes && device.is_active;
  }
}
