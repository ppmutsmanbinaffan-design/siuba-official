import { apiClient, ApiClientError } from '../../../services/apiClient';
import { 
  Activity,
  AttendanceCorrectionResult,
  AttendanceDevice, 
  AttendanceDeviceLog, 
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceRecordHistory, 
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  AttendanceTodayKpi, 
  BulkRecordResult, 
  OpenSessionMonitoringData, 
  ParticipantFilterOptions, 
  QrAttendanceResponse, 
  SessionFilterOptions, 
  SessionStatus, 
  Student, 
  User 
} from '../types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_DEVICES as INITIAL_ATTENDANCE_DEVICES, 
  INITIAL_DEVICE_LOGS as INITIAL_ATTENDANCE_DEVICE_LOGS, 
  INITIAL_RECORDS as INITIAL_ATTENDANCE_RECORDS, 
  INITIAL_SESSIONS as INITIAL_ATTENDANCE_SESSIONS, 
  INITIAL_SESSION_PARTICIPANTS as INITIAL_ATTENDANCE_SESSION_PARTICIPANTS, 
  INITIAL_STUDENTS 
} from '../../../data/initialData';
import { AttendanceEngine } from '../../../services/attendanceEngine';
import { QrAttendanceService } from '../../../services/qrAttendanceService';
import { RfidAttendanceService } from '../../../services/rfidAttendanceService';
import { isDevelopmentToolsEnabled } from '../../../utils/devTools';

const SESSIONS_STORAGE_KEY = 'siuba_attendance_sessions_cache';
const PARTICIPANTS_STORAGE_KEY = 'siuba_session_participants_cache';
const RECORDS_STORAGE_KEY = 'siuba_attendance_records_cache';
const RECORD_HISTORIES_STORAGE_KEY = 'siuba_record_histories_cache';
const DEVICES_STORAGE_KEY = 'siuba_attendance_devices_cache';
const DEVICE_LOGS_STORAGE_KEY = 'siuba_device_logs_cache';

// Helper for local state cache synchronization
function getLocalCache<T>(key: string, defaultData: T): T {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return defaultData;
  }
}

function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('siuba:cache-updated', { detail: { key, data } }));
  } catch {
    // ignore
  }
}

export const attendanceApi = {
  /**
   * Fetch attendance sessions with server filtering + local cache fallback
   */
  async getSessions(filters: SessionFilterOptions = {}): Promise<AttendanceSession[]> {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.categoryId && filters.categoryId !== 'all') params.append('category_id', String(filters.categoryId));
      if (filters.search) params.append('search', filters.search);

      const endpoint = `/attendance/sessions${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiClient.request<AttendanceSession[]>(endpoint);
      if (res && res.data && Array.isArray(res.data)) {
        setLocalCache(SESSIONS_STORAGE_KEY, res.data);
        return res.data;
      }
    } catch (err: any) {
      // Fallback to local storage cache
      console.warn('API /attendance/sessions request fallback to cache:', err.message);
    }

    let sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);

    if (filters.date) {
      sessions = sessions.filter((s) => s.session_date === filters.date);
    }
    if (filters.status && filters.status !== 'all') {
      sessions = sessions.filter((s) => s.status === filters.status);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      sessions = sessions.filter((s) => s.activity_category_id === filters.categoryId);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      sessions = sessions.filter((s) => 
        s.activity_name?.toLowerCase().includes(q) ||
        s.session_code?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q)
      );
    }

    return sessions;
  },

  /**
   * Get single session detail by ID
   */
  async getSessionById(sessionId: number): Promise<AttendanceSession | null> {
    try {
      const res = await apiClient.request<AttendanceSession>(`/attendance/sessions/${sessionId}`);
      if (res && res.data) return res.data;
    } catch (err: any) {
      console.warn(`API /attendance/sessions/${sessionId} failed:`, err.message);
    }

    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    return sessions.find((s) => s.id === sessionId) || null;
  },

  /**
   * Get session participant snapshot
   * Critical: Snapshot is authoritative for the session once generated/opened
   */
  async getSessionParticipants(
    sessionId: number,
    filters: ParticipantFilterOptions = {}
  ): Promise<AttendanceSessionParticipant[]> {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.classroomId && filters.classroomId !== 'all') params.append('classroom_id', String(filters.classroomId));

      const endpoint = `/attendance/sessions/${sessionId}/participants${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiClient.request<AttendanceSessionParticipant[]>(endpoint);
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`API /attendance/sessions/${sessionId}/participants failed:`, err.message);
    }

    const allParticipants = getLocalCache<AttendanceSessionParticipant[]>(
      PARTICIPANTS_STORAGE_KEY,
      INITIAL_ATTENDANCE_SESSION_PARTICIPANTS
    );

    let list = allParticipants.filter((p) => p.attendance_session_id === sessionId);

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((p) => 
        p.student_name?.toLowerCase().includes(q) || 
        p.student_number?.toLowerCase().includes(q) ||
        p.classroom_name?.toLowerCase().includes(q)
      );
    }

    return list;
  },

  /**
   * Get attendance records for a specific session
   */
  async getSessionRecords(sessionId: number): Promise<AttendanceRecord[]> {
    try {
      const res = await apiClient.request<AttendanceRecord[]>(`/attendance/sessions/${sessionId}/records`);
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`API /attendance/sessions/${sessionId}/records failed:`, err.message);
    }

    const allRecords = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);
    return allRecords.filter((r) => r.attendance_session_id === sessionId);
  },

  /**
   * Fetch today's summary KPI across sessions
   */
  async getTodayKpi(date: string = '2026-08-23'): Promise<AttendanceTodayKpi> {
    try {
      const res = await apiClient.request<AttendanceTodayKpi>(`/attendance/kpi?date=${date}`);
      if (res && res.data) return res.data;
    } catch {
      // fallback
    }

    const sessions = (await this.getSessions({ date })).filter((s) => s.session_date === date);
    const allParticipants = getLocalCache<AttendanceSessionParticipant[]>(
      PARTICIPANTS_STORAGE_KEY,
      INITIAL_ATTENDANCE_SESSION_PARTICIPANTS
    );
    const allRecords = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);

    const sessionIds = new Set(sessions.map((s) => s.id));
    const todayParticipants = allParticipants.filter((p) => sessionIds.has(p.attendance_session_id));
    const todayRecords = allRecords.filter((r) => sessionIds.has(r.attendance_session_id));

    const totalEligible = todayParticipants.length;
    const recorded = todayRecords.length;
    const unrecorded = Math.max(0, totalEligible - recorded);

    const presentCount = todayRecords.filter((r) => r.status === 'present').length;
    const lateCount = todayRecords.filter((r) => r.status === 'late').length;
    const permissionCount = todayRecords.filter((r) => r.status === 'permission').length;
    const sickCount = todayRecords.filter((r) => r.status === 'sick').length;
    const dispensationCount = todayRecords.filter((r) => r.status === 'dispensation').length;
    const absentCount = todayRecords.filter((r) => r.status === 'absent').length;

    const completionRate = totalEligible > 0 ? Math.round((recorded / totalEligible) * 100) : 0;

    return {
      totalSessionsToday: sessions.length,
      openSessionsCount: sessions.filter((s) => s.status === 'open').length,
      draftSessionsCount: sessions.filter((s) => s.status === 'draft').length,
      closedSessionsCount: sessions.filter((s) => s.status === 'closed').length,
      totalEligibleParticipants: totalEligible,
      recordedCount: recorded,
      unrecordedCount: unrecorded,
      presentCount,
      lateCount,
      permissionCount,
      sickCount,
      dispensationCount,
      absentCount,
      completionRate,
    };
  },

  /**
   * Open session action (Transition draft -> open)
   * Locks participant snapshot
   */
  async openSession(sessionId: number, operatorName: string = 'Operator SIUBA'): Promise<AttendanceSession> {
    try {
      const res = await apiClient.request<AttendanceSession>(`/attendance/sessions/${sessionId}/open`, {
        method: 'POST',
        body: JSON.stringify({ operator_name: operatorName }),
      });
      if (res && res.data) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`API /attendance/sessions/${sessionId}/open failed:`, err.message);
    }

    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) throw new Error('Sesi tidak ditemukan.');

    const updated: AttendanceSession = {
      ...sessions[index],
      status: 'open',
      opened_at: new Date().toISOString(),
      opened_by: operatorName,
    };

    sessions[index] = updated;
    setLocalCache(SESSIONS_STORAGE_KEY, sessions);
    return updated;
  },

  /**
   * Close session action (Transition open -> closed)
   */
  async closeSession(sessionId: number, operatorName: string = 'Operator SIUBA'): Promise<AttendanceSession> {
    try {
      const res = await apiClient.request<AttendanceSession>(`/attendance/sessions/${sessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ operator_name: operatorName }),
      });
      if (res && res.data) return res.data;
    } catch (err: any) {
      console.warn(`API /attendance/sessions/${sessionId}/close failed:`, err.message);
    }

    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) throw new Error('Sesi tidak ditemukan.');

    const updated: AttendanceSession = {
      ...sessions[index],
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: operatorName,
    };

    sessions[index] = updated;
    setLocalCache(SESSIONS_STORAGE_KEY, sessions);
    return updated;
  },

  /**
   * Cancel session action (Transition -> cancelled)
   */
  async cancelSession(sessionId: number, reason: string, operatorName: string = 'Operator SIUBA'): Promise<AttendanceSession> {
    if (!reason || !reason.trim()) {
      throw new Error('Alasan pembatalan sesi wajib diisi.');
    }

    try {
      const res = await apiClient.request<AttendanceSession>(`/attendance/sessions/${sessionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), operator_name: operatorName }),
      });
      if (res && res.data) return res.data;
    } catch (err: any) {
      console.warn(`API /attendance/sessions/${sessionId}/cancel failed:`, err.message);
    }

    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) throw new Error('Sesi tidak ditemukan.');

    const updated: AttendanceSession = {
      ...sessions[index],
      status: 'cancelled',
      notes: `${sessions[index].notes ? sessions[index].notes + ' | ' : ''}Dibatalkan: ${reason.trim()}`,
      closed_at: new Date().toISOString(),
      closed_by: operatorName,
    };

    sessions[index] = updated;
    setLocalCache(SESSIONS_STORAGE_KEY, sessions);
    return updated;
  },

  /**
   * Record Manual Attendance for an individual student
   */
  async recordManual(params: {
    sessionId: number;
    studentId: number;
    status: AttendanceStatus;
    notes?: string;
    operator: User;
    checkInTime?: string;
  }): Promise<AttendanceResult> {
    const { sessionId, studentId, status, notes, operator, checkInTime = new Date().toISOString() } = params;

    try {
      const res = await apiClient.request<AttendanceResult>(`/attendance/sessions/${sessionId}/manual`, {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          status,
          notes,
          check_in_at: checkInTime,
        }),
      });
      if (res && res.data) return res.data;
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 422) {
        return {
          success: false,
          code: 'ALREADY_RECORDED',
          message: err.message || 'Santri sudah memiliki absensi pada sesi ini.',
        };
      }
    }

    // Engine simulation fallback
    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { success: false, code: 'SESSION_NOT_OPEN', message: 'Sesi absensi tidak ditemukan.' };
    }

    const students = getLocalCache<Student[]>('siuba_students_cache', INITIAL_STUDENTS);
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return { success: false, code: 'STUDENT_NOT_FOUND', message: 'Data santri tidak ditemukan.' };
    }

    const participants = getLocalCache<AttendanceSessionParticipant[]>(
      PARTICIPANTS_STORAGE_KEY,
      INITIAL_ATTENDANCE_SESSION_PARTICIPANTS
    );
    const records = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);
    const activities = getLocalCache<Activity[]>('siuba_master_activities', INITIAL_ACTIVITIES);
    const activity = activities.find((a) => a.id === session.activity_id) || activities[0] || ({
      id: session.activity_id || 1,
      name: session.activity_name || 'Kegiatan Pesantren',
      is_active: true,
      allow_manual: true,
      allow_qr: true,
      allow_rfid: true
    } as Activity);

    const engineResult = AttendanceEngine.record({
      sessionId,
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
      existingRecords: records,
      sessionParticipants: participants,
    });

    if (engineResult.result.success && engineResult.newRecord) {
      records.push(engineResult.newRecord);
      setLocalCache(RECORDS_STORAGE_KEY, records);
    }

    return engineResult.result;
  },

  /**
   * Bulk mark status for unrecorded participants in session
   */
  async recordBulkManual(params: {
    sessionId: number;
    studentIds: number[];
    status: AttendanceStatus;
    notes?: string;
    operator: User;
  }): Promise<BulkRecordResult> {
    const { sessionId, studentIds, status, notes, operator } = params;

    try {
      const res = await apiClient.request<BulkRecordResult>(`/attendance/sessions/${sessionId}/manual-bulk`, {
        method: 'POST',
        body: JSON.stringify({
          student_ids: studentIds,
          status,
          notes,
        }),
      });
      if (res && res.data) return res.data;
    } catch {
      // fallback
    }

    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return {
        total: studentIds.length,
        success: 0,
        skipped: 0,
        failed: studentIds.length,
        messages: ['Sesi absensi tidak ditemukan.'],
        newRecords: [],
      };
    }

    const students = getLocalCache<Student[]>('siuba_students_cache', INITIAL_STUDENTS);
    const targetStudents = students.filter((st) => studentIds.includes(st.id));
    const participants = getLocalCache<AttendanceSessionParticipant[]>(
      PARTICIPANTS_STORAGE_KEY,
      INITIAL_ATTENDANCE_SESSION_PARTICIPANTS
    );
    const records = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);
    const activities = getLocalCache<Activity[]>('siuba_master_activities', INITIAL_ACTIVITIES);
    const activity = activities.find((a) => a.id === session.activity_id) || activities[0] || ({
      id: session.activity_id || 1,
      name: session.activity_name || 'Kegiatan Pesantren',
      is_active: true,
      allow_manual: true,
      allow_qr: true,
      allow_rfid: true
    } as Activity);

    const bulkResult = AttendanceEngine.bulkRecord({
      session,
      activity,
      students: targetStudents,
      status,
      notes,
      operator,
      existingRecords: records,
      sessionParticipants: participants,
    });

    if (bulkResult.newRecords.length > 0) {
      records.push(...bulkResult.newRecords);
      setLocalCache(RECORDS_STORAGE_KEY, records);
    }

    return bulkResult;
  },

  /**
   * Submit QR Code attendance scan
   */
  async submitQr(params: {
    sessionId: number;
    qrToken: string;
    deviceId?: number | null;
    operator: User;
    checkInTime?: string;
  }): Promise<QrAttendanceResponse> {
    const { sessionId, qrToken, deviceId, operator, checkInTime = new Date().toISOString() } = params;

    try {
      const res = await apiClient.request<QrAttendanceResponse>(`/attendance/sessions/${sessionId}/qr`, {
        method: 'POST',
        body: JSON.stringify({
          qr_token: qrToken,
          device_id: deviceId,
          check_in_at: checkInTime,
        }),
      });
      if (res && res.data) return res.data;
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 422) {
        return {
          success: false,
          code: 'ALREADY_RECORDED',
          message: err.message || 'Santri sudah memiliki absensi pada sesi ini.',
        };
      }
    }

    const sessions = getLocalCache<AttendanceSession[]>(SESSIONS_STORAGE_KEY, INITIAL_ATTENDANCE_SESSIONS);
    const students = getLocalCache<Student[]>('siuba_students_cache', INITIAL_STUDENTS);
    const participants = getLocalCache<AttendanceSessionParticipant[]>(
      PARTICIPANTS_STORAGE_KEY,
      INITIAL_ATTENDANCE_SESSION_PARTICIPANTS
    );
    const records = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);
    const devices = getLocalCache<AttendanceDevice[]>(DEVICES_STORAGE_KEY, INITIAL_ATTENDANCE_DEVICES);
    const activities = INITIAL_ACTIVITIES;

    const qrResult = QrAttendanceService.recordQrAttendance({
      sessionId,
      qrToken,
      deviceId,
      operator,
      checkInTime,
      allStudents: students,
      sessions,
      activities,
      devices,
      existingRecords: records,
      sessionParticipants: participants,
    });

    if (qrResult.newRecord) {
      records.push(qrResult.newRecord);
      setLocalCache(RECORDS_STORAGE_KEY, records);
    }

    return qrResult.response;
  },

  /**
   * Correct Attendance Record (Requires mandatory reason)
   */
  async correctRecord(params: {
    recordId: number;
    newStatus: AttendanceStatus;
    reason: string;
    operator: User;
  }): Promise<AttendanceCorrectionResult> {
    const { recordId, newStatus, reason, operator } = params;

    if (!reason || !reason.trim()) {
      return {
        success: false,
        code: 'MISSING_REASON',
        message: 'Alasan koreksi status absensi wajib diisi.',
      };
    }

    try {
      const res = await apiClient.request<AttendanceCorrectionResult>(`/attendance/records/${recordId}/correct`, {
        method: 'POST',
        body: JSON.stringify({
          new_status: newStatus,
          reason: reason.trim(),
        }),
      });
      if (res && res.data) return res.data;
    } catch {
      // fallback
    }

    const records = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);
    const histories = getLocalCache<AttendanceRecordHistory[]>(RECORD_HISTORIES_STORAGE_KEY, []);

    const recordIndex = records.findIndex((r) => r.id === recordId);
    if (recordIndex === -1) {
      return {
        success: false,
        code: 'SERVER_ERROR',
        message: 'Record absensi tidak ditemukan.',
      };
    }

    const targetRecord = records[recordIndex];
    const oldStatus = targetRecord.status;

    if (oldStatus === newStatus) {
      return {
        success: false,
        code: 'ALREADY_RECORDED',
        message: `Santri sudah berstatus '${newStatus}'. Tidak ada perubahan.`,
      };
    }

    const updatedRecord: AttendanceRecord = {
      ...targetRecord,
      status: newStatus,
      notes: `${targetRecord.notes ? targetRecord.notes + ' | ' : ''}Koreksi: ${reason.trim()} (${operator.name})`,
    };

    records[recordIndex] = updatedRecord;
    setLocalCache(RECORDS_STORAGE_KEY, records);

    const newHistory: AttendanceRecordHistory = {
      id: histories.length + 1,
      attendance_record_id: targetRecord.id,
      student_id: targetRecord.student_id,
      student_name: targetRecord.student_name,
      old_status: oldStatus,
      new_status: newStatus,
      old_method: targetRecord.method,
      new_method: targetRecord.method,
      reason: reason.trim(),
      changed_by: operator.name,
      changed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    histories.push(newHistory);
    setLocalCache(RECORD_HISTORIES_STORAGE_KEY, histories);

    return {
      success: true,
      code: 'SUCCESS',
      message: `Status santri ${targetRecord.student_name} berhasil dikoreksi menjadi '${newStatus}'.`,
      updatedRecord,
      history: newHistory,
    };
  },

  /**
   * Fetch RFID Devices
   */
  async getRfidDevices(): Promise<AttendanceDevice[]> {
    try {
      const res = await apiClient.request<AttendanceDevice[]>('/attendance/devices');
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // fallback
    }

    return getLocalCache<AttendanceDevice[]>(DEVICES_STORAGE_KEY, INITIAL_ATTENDANCE_DEVICES);
  },

  /**
   * Fetch Device Logs
   */
  async getDeviceLogs(deviceId?: number): Promise<AttendanceDeviceLog[]> {
    try {
      const endpoint = deviceId ? `/attendance/devices/${deviceId}/logs` : '/attendance/devices/logs';
      const res = await apiClient.request<AttendanceDeviceLog[]>(endpoint);
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // fallback
    }

    let logs = getLocalCache<AttendanceDeviceLog[]>(DEVICE_LOGS_STORAGE_KEY, INITIAL_ATTENDANCE_DEVICE_LOGS);
    if (deviceId) {
      logs = logs.filter((l) => l.attendance_device_id === deviceId);
    }
    return logs;
  },

  /**
   * Fetch Open Sessions Monitoring real-time data
   */
  async getOpenSessionsMonitoring(): Promise<OpenSessionMonitoringData[]> {
    try {
      const res = await apiClient.request<OpenSessionMonitoringData[]>('/attendance/monitoring');
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // fallback
    }

    const sessions = (await this.getSessions()).filter((s) => s.status === 'open');
    const participants = getLocalCache<AttendanceSessionParticipant[]>(
      PARTICIPANTS_STORAGE_KEY,
      INITIAL_ATTENDANCE_SESSION_PARTICIPANTS
    );
    const records = getLocalCache<AttendanceRecord[]>(RECORDS_STORAGE_KEY, INITIAL_ATTENDANCE_RECORDS);
    const activities = INITIAL_ACTIVITIES;

    return sessions.map((session) => {
      const act = activities.find((a) => a.id === session.activity_id);
      const sessionParticipants = participants.filter((p) => p.attendance_session_id === session.id);
      const sessionRecords = records.filter((r) => r.attendance_session_id === session.id);

      const totalEligible = sessionParticipants.length;
      const recordedCount = sessionRecords.length;
      const unrecordedCount = Math.max(0, totalEligible - recordedCount);

      const presentCount = sessionRecords.filter((r) => r.status === 'present').length;
      const lateCount = sessionRecords.filter((r) => r.status === 'late').length;
      const permissionCount = sessionRecords.filter((r) => r.status === 'permission').length;
      const sickCount = sessionRecords.filter((r) => r.status === 'sick').length;
      const dispensationCount = sessionRecords.filter((r) => r.status === 'dispensation').length;
      const absentCount = sessionRecords.filter((r) => r.status === 'absent').length;

      const completionRate = totalEligible > 0 ? Math.round((recordedCount / totalEligible) * 100) : 0;

      // Find last recorded scan for this session
      const lastRecord = sessionRecords.slice(-1)[0];

      return {
        session,
        activity: act,
        totalEligible,
        recordedCount,
        unrecordedCount,
        presentCount,
        lateCount,
        permissionCount,
        sickCount,
        dispensationCount,
        absentCount,
        completionRate,
        lastScanAt: lastRecord?.check_in_at,
        lastStudentName: lastRecord?.student_name,
      };
    });
  },
};
