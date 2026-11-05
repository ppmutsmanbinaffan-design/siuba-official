import { 
  CachedPreparedSession, 
  CachedParticipant, 
  PendingAttendanceItem, 
  ClientInstallation,
  AttendanceSession,
  AttendanceSessionParticipant,
  Student,
  AttendanceStatus,
  AttendanceMethod
} from '../types';
import { IndexedDbStorageService } from './indexedDbStorageService';

const DB_NAME = 'siuba_offline_db';
const STORAGE_KEY_SESSIONS = 'siuba_cached_sessions';
const STORAGE_KEY_PARTICIPANTS = 'siuba_cached_participants';
const STORAGE_KEY_PENDING = 'siuba_pending_attendance';
const STORAGE_KEY_INSTALLATION = 'siuba_client_installation';
const STORAGE_KEY_METADATA = 'siuba_offline_metadata';

export class OfflineStorageService {
  private static installationId: string = '';

  /**
   * Get or initialize local Client Installation UUID
   */
  public static getInstallation(): ClientInstallation {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INSTALLATION);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }

    const newInstallation: ClientInstallation = {
      installation_id: 'inst_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
      device_name: 'PWA Terminal ' + (navigator.userAgent.includes('Android') ? 'Android' : 'Device'),
      app_version: 'v1.10.0-pwa',
      platform: navigator.userAgent.includes('Android') ? 'Android PWA' : 'Web/LAN Client',
      registered_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_active: true,
      pending_count: 0
    };

    try {
      localStorage.setItem(STORAGE_KEY_INSTALLATION, JSON.stringify(newInstallation));
    } catch (e) {
      console.warn('Storage set failed', e);
    }

    this.installationId = newInstallation.installation_id;
    return newInstallation;
  }

  public static updateInstallationName(name: string): void {
    const inst = this.getInstallation();
    inst.device_name = name;
    inst.last_seen_at = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY_INSTALLATION, JSON.stringify(inst));
    } catch (e) {
      console.warn('Storage set failed', e);
    }
  }

  /**
   * Save clock offset from server
   */
  public static saveClockOffset(serverTimeIso: string): number {
    const serverMs = new Date(serverTimeIso).getTime();
    const clientMs = Date.now();
    const offsetMs = serverMs - clientMs;

    try {
      localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify({
        last_sync: new Date().toISOString(),
        clock_offset_ms: offsetMs,
        server_time_reference: serverTimeIso
      }));
    } catch (e) {
      console.warn('Storage error', e);
    }

    return offsetMs;
  }

  public static getClockOffset(): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_METADATA);
      if (stored) {
        const meta = JSON.parse(stored);
        return meta.clock_offset_ms || 0;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /**
   * Prepare/Preload Session and its participants for Offline Mode
   */
  public static prepareSessionForOffline(
    session: AttendanceSession,
    participants: AttendanceSessionParticipant[],
    students: Student[]
  ): CachedPreparedSession {
    const studentMap = new Map<number, Student>();
    students.forEach(s => studentMap.set(s.id, s));

    const cachedParticipants: CachedParticipant[] = participants
      .filter(p => p.attendance_session_id === session.id)
      .map(p => {
        const s = studentMap.get(p.student_id);
        return {
          session_id: session.id,
          student_id: p.student_id,
          student_number: p.student_number || (s ? s.student_number : ''),
          name: p.student_name || (s ? s.name : ''),
          classroom_name: p.classroom_name || (s ? s.classroom_name : ''),
          dormitory_room_name: p.dormitory_room_name || (s ? s.dormitory_room_name : ''),
          qr_token: s?.qr_token || (s ? `UBA-STU-${s.student_number}-${s.id}` : undefined),
          rfid_uid: s?.rfid_uid,
          status_at_cache: (p as any).current_status || 'present'
        };
      });

    const cachedSession: CachedPreparedSession = {
      session_id: session.id,
      session_code: session.session_code,
      activity_id: session.activity_id,
      activity_name: session.activity_name,
      category_name: (session as any).category_name || session.activity_name,
      start_at: session.start_at,
      present_until: session.present_until,
      late_until: session.late_until,
      end_at: session.end_at,
      status_at_cache_time: session.status,
      allow_manual: (session as any).allow_manual ?? true,
      allow_qr: (session as any).allow_qr ?? true,
      allow_rfid: (session as any).allow_rfid ?? true,
      participant_count: cachedParticipants.length,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      snapshot_version: `v_${session.id}_${Date.now()}`
    };

    // Save session
    const existingSessions = (this.getPreparedSessions() || []).filter(s => s && s.session_id !== session.id);
    existingSessions.push(cachedSession);
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(existingSessions));
    } catch (e) {
      console.warn('Storage set failed', e);
    }

    // Save participants
    const allParticipants = (this.getAllCachedParticipants() || []).filter(p => p && p.session_id !== session.id);
    const updatedParticipants = [...allParticipants, ...cachedParticipants];
    try {
      localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(updatedParticipants));
    } catch (e) {
      console.warn('Storage set failed', e);
    }

    // Async persist to IndexedDB
    try {
      IndexedDbStorageService.savePreparedSession(cachedSession, cachedParticipants).catch(err => {
        console.warn('[IndexedDB] savePreparedSession background error:', err);
      });
    } catch (e) {
      // ignore
    }

    return cachedSession;
  }

  public static getPreparedSessions(): CachedPreparedSession[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SESSIONS) : null;
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public static removePreparedSession(sessionId: number): void {
    const sessions = (this.getPreparedSessions() || []).filter(s => s.session_id !== sessionId);
    const participants = (this.getAllCachedParticipants() || []).filter(p => p.session_id !== sessionId);
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(participants));
    } catch (e) {
      console.warn('Storage remove failed', e);
    }
  }

  public static getAllCachedParticipants(): CachedParticipant[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_PARTICIPANTS) : null;
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public static getCachedParticipantsForSession(sessionId: number): CachedParticipant[] {
    return (this.getAllCachedParticipants() || []).filter(p => p.session_id === sessionId);
  }

  public static findCachedParticipantByQr(sessionId: number, qrToken: string): CachedParticipant | undefined {
    const participants = this.getCachedParticipantsForSession(sessionId) || [];
    const cleanToken = qrToken.trim();
    return participants.find(p => 
      p.qr_token === cleanToken || 
      p.student_number === cleanToken || 
      cleanToken.includes(p.student_number)
    );
  }

  public static findCachedParticipantByRfid(sessionId: number, rfidUid: string): CachedParticipant | undefined {
    const participants = this.getCachedParticipantsForSession(sessionId) || [];
    const cleanUid = rfidUid.trim().toUpperCase();
    return participants.find(p => p.rfid_uid && p.rfid_uid.toUpperCase() === cleanUid);
  }

  /**
   * Pending Attendance Queue Management
   */
  public static getPendingRecords(): PendingAttendanceItem[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_PENDING) : null;
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Check if a pending or synced record already exists locally for this session & student
   */
  public static isDuplicatePending(sessionId: number, studentId: number): boolean {
    const items = this.getPendingRecords();
    return items.some(item => 
      item.session_id === sessionId && 
      item.student_id === studentId && 
      (item.sync_status === 'pending' || item.sync_status === 'syncing' || item.sync_status === 'synced')
    );
  }

  /**
   * Add new offline attendance capture to queue
   */
  public static addPendingAttendance(params: {
    sessionId: number;
    sessionCode?: string;
    activityName?: string;
    studentId: number;
    studentNumber: string;
    studentName: string;
    classroomName?: string;
    dormitoryRoomName?: string;
    method: AttendanceMethod;
    status: AttendanceStatus;
    notes?: string;
    operatorId: number;
    operatorName: string;
  }): { success: boolean; item?: PendingAttendanceItem; message?: string } {
    // Check local duplicate
    if (this.isDuplicatePending(params.sessionId, params.studentId)) {
      return {
        success: false,
        message: `Santri ${params.studentName} (${params.studentNumber}) SUDAH TERCATAT di antrean lokal perangkat ini.`
      };
    }

    const clockOffset = this.getClockOffset();
    const clientNow = new Date();
    const estimatedServerTime = new Date(clientNow.getTime() + clockOffset).toISOString();
    const inst = this.getInstallation();

    const clientRequestId = 'req_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    const localId = 'loc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const pendingItem: PendingAttendanceItem = {
      local_id: localId,
      client_request_id: clientRequestId,
      session_id: params.sessionId,
      session_code: params.sessionCode,
      activity_name: params.activityName,
      student_id: params.studentId,
      student_number: params.studentNumber,
      student_name: params.studentName,
      classroom_name: params.classroomName,
      dormitory_room_name: params.dormitoryRoomName,
      attendance_method: params.method,
      requested_status: params.status,
      notes: params.notes,
      captured_at_client: clientNow.toISOString(),
      estimated_server_time: estimatedServerTime,
      clock_offset_ms: clockOffset,
      device_context: {
        device_name: inst.device_name,
        installation_id: inst.installation_id,
        user_agent: navigator.userAgent
      },
      operator_id: params.operatorId,
      operator_name: params.operatorName,
      sync_status: 'pending',
      retry_count: 0,
      created_at_local: clientNow.toISOString(),
      updated_at_local: clientNow.toISOString()
    };

    const records = this.getPendingRecords();
    records.push(pendingItem);

    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(records));
    } catch (e) {
      return { success: false, message: 'Gagal menulis ke penyimpanan lokal browser: Storage Quota Exceeded' };
    }

    // Async persist to IndexedDB
    try {
      IndexedDbStorageService.addPendingAttendance(pendingItem).catch(err => {
        console.warn('[IndexedDB] addPendingAttendance background error:', err);
      });
    } catch (e) {
      // ignore
    }

    return { success: true, item: pendingItem };
  }

  public static updatePendingRecord(localId: string, updates: Partial<PendingAttendanceItem>): void {
    const records = this.getPendingRecords();
    const index = records.findIndex(r => r.local_id === localId);
    if (index !== -1) {
      records[index] = {
        ...records[index],
        ...updates,
        updated_at_local: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(records));
      } catch (e) {
        console.warn('Storage set failed', e);
      }
    }
  }

  public static removePendingRecord(localId: string): void {
    const records = (this.getPendingRecords() || []).filter(r => r.local_id !== localId);
    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(records));
    } catch (e) {
      console.warn('Storage set failed', e);
    }
  }

  public static clearSyncedRecords(): number {
    const records = this.getPendingRecords() || [];
    const kept = records.filter(r => r.sync_status !== 'synced');
    const removedCount = records.length - kept.length;
    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(kept));
    } catch (e) {
      console.warn('Storage set failed', e);
    }
    return removedCount;
  }

  public static getStorageMetrics(): {
    preparedSessionCount: number;
    cachedParticipantCount: number;
    pendingQueueCount: number;
    syncedCount: number;
    conflictCount: number;
    estimatedSizeBytes: number;
  } {
    const sessions = this.getPreparedSessions() || [];
    const participants = this.getAllCachedParticipants() || [];
    const pending = this.getPendingRecords() || [];

    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('siuba_')) {
          bytes += (localStorage.getItem(key) || '').length * 2;
        }
      }
    } catch {
      bytes = (sessions.length * 200) + (participants.length * 150) + (pending.length * 300);
    }

    return {
      preparedSessionCount: sessions.length,
      cachedParticipantCount: participants.length,
      pendingQueueCount: pending.filter(p => p.sync_status === 'pending' || p.sync_status === 'syncing').length,
      syncedCount: pending.filter(p => p.sync_status === 'synced').length,
      conflictCount: pending.filter(p => p.sync_status === 'conflict').length,
      estimatedSizeBytes: bytes
    };
  }
}
