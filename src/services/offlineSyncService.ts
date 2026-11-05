import { 
  PendingAttendanceItem, 
  SyncBatchResponse, 
  SyncBatchOperationResult,
  AttendanceSession,
  AttendanceSessionParticipant,
  AttendanceRecord,
  AttendanceRecordHistory,
  Student,
  AttendanceStatus
} from '../types';
import { OfflineStorageService } from './offlineStorageService';

export class OfflineSyncService {
  /**
   * Process and synchronize pending offline attendance operations into authoritative server state
   */
  public static processSyncBatch(
    itemsToSync: PendingAttendanceItem[],
    sessions: AttendanceSession[],
    participants: AttendanceSessionParticipant[],
    records: AttendanceRecord[],
    recordHistories: AttendanceRecordHistory[],
    students: Student[],
    currentUser: { id: number; name: string }
  ): {
    batchResponse: SyncBatchResponse;
    updatedRecords: AttendanceRecord[];
    updatedHistories: AttendanceRecordHistory[];
    updatedParticipants: AttendanceSessionParticipant[];
  } {
    const results: SyncBatchOperationResult[] = [];
    let currentRecords = [...records];
    let currentHistories = [...recordHistories];
    let currentParticipants = [...participants];

    const sessionMap = new Map<number, AttendanceSession>();
    sessions.forEach(s => sessionMap.set(s.id, s));

    const studentMap = new Map<number, Student>();
    students.forEach(s => studentMap.set(s.id, s));

    // Sort by capture time ascending
    const sortedItems = [...itemsToSync].sort((a, b) => 
      new Date(a.captured_at_client).getTime() - new Date(b.captured_at_client).getTime()
    );

    for (const item of sortedItems) {
      const session = sessionMap.get(item.session_id);
      const student = studentMap.get(item.student_id);

      // 1. Session validation
      if (!session) {
        results.push({
          client_request_id: item.client_request_id,
          local_id: item.local_id,
          success: false,
          code: 'SESSION_INVALID',
          message: `Sesi ID ${item.session_id} tidak ditemukan di server.`
        });
        OfflineStorageService.updatePendingRecord(item.local_id, {
          sync_status: 'failed',
          conflict_code: 'SESSION_INVALID',
          last_error: 'Sesi tidak valid di server',
          last_attempt_at: new Date().toISOString()
        });
        continue;
      }

      if (session.status === 'cancelled') {
        results.push({
          client_request_id: item.client_request_id,
          local_id: item.local_id,
          success: false,
          code: 'SESSION_INVALID',
          message: `Sesi ${session.activity_name} telah dibatalkan di server.`
        });
        OfflineStorageService.updatePendingRecord(item.local_id, {
          sync_status: 'failed',
          conflict_code: 'SESSION_INVALID',
          last_error: 'Sesi telah dibatalkan',
          last_attempt_at: new Date().toISOString()
        });
        continue;
      }

      // 2. Participant validation
      const isParticipantEligible = currentParticipants.some(
        p => p.attendance_session_id === session.id && p.student_id === item.student_id
      );

      if (!isParticipantEligible) {
        results.push({
          client_request_id: item.client_request_id,
          local_id: item.local_id,
          success: false,
          code: 'PARTICIPANT_INVALID',
          message: `Santri ${item.student_name} (${item.student_number}) bukan peserta terdaftar pada sesi ini.`
        });
        OfflineStorageService.updatePendingRecord(item.local_id, {
          sync_status: 'conflict',
          conflict_code: 'PARTICIPANT_INVALID',
          last_error: 'Santri bukan peserta sah sesi',
          last_attempt_at: new Date().toISOString()
        });
        continue;
      }

      // 3. Method allowed validation
      const allowManual = (session as any).allow_manual ?? true;
      const allowQr = (session as any).allow_qr ?? true;

      if (item.attendance_method === 'manual' && !allowManual) {
        results.push({
          client_request_id: item.client_request_id,
          local_id: item.local_id,
          success: false,
          code: 'METHOD_INVALID',
          message: 'Metode manual tidak diizinkan pada sesi ini.'
        });
        OfflineStorageService.updatePendingRecord(item.local_id, {
          sync_status: 'failed',
          conflict_code: 'METHOD_INVALID',
          last_error: 'Metode manual dinonaktifkan',
          last_attempt_at: new Date().toISOString()
        });
        continue;
      }

      if (item.attendance_method === 'qr' && !allowQr) {
        results.push({
          client_request_id: item.client_request_id,
          local_id: item.local_id,
          success: false,
          code: 'METHOD_INVALID',
          message: 'Metode QR Scanner tidak diizinkan pada sesi ini.'
        });
        OfflineStorageService.updatePendingRecord(item.local_id, {
          sync_status: 'failed',
          conflict_code: 'METHOD_INVALID',
          last_error: 'Metode QR dinonaktifkan',
          last_attempt_at: new Date().toISOString()
        });
        continue;
      }

      // 4. Check existing server record (Duplicate vs Conflict handling)
      const existingRecordIndex = currentRecords.findIndex(
        r => r.attendance_session_id === session.id && r.student_id === item.student_id
      );

      const captureTime = new Date(item.captured_at_client);
      const sessionStart = new Date(session.start_at);
      const sessionEnd = new Date(session.end_at);
      const presentUntil = new Date(session.present_until);

      // Determine authoritative status based on capture time
      let calculatedStatus: AttendanceStatus = item.requested_status;
      if (item.attendance_method === 'qr') {
        if (captureTime <= presentUntil) {
          calculatedStatus = 'present';
        } else if (captureTime <= sessionEnd) {
          calculatedStatus = 'late';
        } else {
          calculatedStatus = 'absent';
        }
      }

      const lateMinutes = captureTime > presentUntil
        ? Math.max(0, Math.round((captureTime.getTime() - presentUntil.getTime()) / 60000))
        : 0;

      if (existingRecordIndex !== -1) {
        const existingRecord = currentRecords[existingRecordIndex];

        // 4a. Exact idempotency (Same client_request_id or same captured offline)
        if (existingRecord.client_request_id === item.client_request_id) {
          results.push({
            client_request_id: item.client_request_id,
            local_id: item.local_id,
            success: true,
            code: 'ALREADY_SYNCED',
            message: 'Data absensi telah tersinkronisasi sebelumnya.',
            attendance_record_id: existingRecord.id,
            final_status: existingRecord.status
          });
          OfflineStorageService.updatePendingRecord(item.local_id, {
            sync_status: 'synced',
            conflict_code: 'ALREADY_SYNCED',
            server_attendance_id: existingRecord.id,
            server_final_status: existingRecord.status,
            last_attempt_at: new Date().toISOString()
          });
          continue;
        }

        // 4b. Auto-Alpha Conflict Resolution
        // If the server auto-finalized the record to absent (record_source === 'system'),
        // but client capture time was legitimate before session end:
        if (existingRecord.status === 'absent' && existingRecord.record_source === 'system') {
          const oldStatus = existingRecord.status;
          const updatedRecord: AttendanceRecord = {
            ...existingRecord,
            status: calculatedStatus,
            method: item.attendance_method,
            record_source: 'operator',
            check_in_at: item.captured_at_client,
            late_minutes: lateMinutes,
            recorded_by: `${item.operator_name} (Offline Sync)`,
            notes: item.notes ? `${item.notes} | Offline Sync` : 'Offline Sync after session finalization',
            was_offline: true,
            received_at: new Date().toISOString(),
            client_request_id: item.client_request_id,
            client_installation_id: item.device_context?.installation_id,
            sync_delay_seconds: Math.round((Date.now() - captureTime.getTime()) / 1000)
          };

          currentRecords[existingRecordIndex] = updatedRecord;

          // Create audit history entry
          const historyEntry: AttendanceRecordHistory = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            attendance_record_id: existingRecord.id,
            student_id: item.student_id,
            student_name: item.student_name,
            old_status: oldStatus,
            new_status: calculatedStatus,
            old_method: existingRecord.method,
            new_method: item.attendance_method,
            reason: 'Offline attendance synchronized after session finalization (Auto-Alpha Corrected).',
            changed_by: `Sync Engine / ${item.operator_name}`,
            changed_at: new Date().toISOString(),
            metadata: {
              client_request_id: item.client_request_id,
              captured_at_client: item.captured_at_client,
              installation_id: item.device_context?.installation_id
            },
            created_at: new Date().toISOString()
          };

          currentHistories.push(historyEntry);

          // Update participant snapshot
          currentParticipants = currentParticipants.map(p => 
            p.attendance_session_id === session.id && p.student_id === item.student_id
              ? { ...p, current_status: calculatedStatus, check_in_time: item.captured_at_client, method: item.attendance_method }
              : p
          );

          results.push({
            client_request_id: item.client_request_id,
            local_id: item.local_id,
            success: true,
            code: 'AUTO_ALPHA_CONFLICT_RESOLVED',
            message: `Konflik Auto-Alpha berhasil dikoreksi menjadi ${calculatedStatus.toUpperCase()} (Terekam sebelum sesi ditutup).`,
            attendance_record_id: existingRecord.id,
            final_status: calculatedStatus
          });

          OfflineStorageService.updatePendingRecord(item.local_id, {
            sync_status: 'synced',
            conflict_code: 'AUTO_ALPHA_CONFLICT_RESOLVED',
            server_attendance_id: existingRecord.id,
            server_final_status: calculatedStatus,
            last_attempt_at: new Date().toISOString()
          });
          continue;
        }

        // 4c. Human Administrative Override Conflict Protection
        // If an operator or teacher manually altered/confirmed the record, do NOT silent overwrite
        if (existingRecord.record_source === 'operator') {
          results.push({
            client_request_id: item.client_request_id,
            local_id: item.local_id,
            success: false,
            code: 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW',
            message: `Konflik: Status server (${existingRecord.status.toUpperCase()}) telah diatur manual oleh ${existingRecord.recorded_by}. Perlu ditinjau secara manual.`,
            attendance_record_id: existingRecord.id,
            final_status: existingRecord.status,
            requires_review: true
          });

          OfflineStorageService.updatePendingRecord(item.local_id, {
            sync_status: 'conflict',
            conflict_code: 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW',
            conflict_message: `Server status: ${existingRecord.status.toUpperCase()} (by ${existingRecord.recorded_by})`,
            server_attendance_id: existingRecord.id,
            server_final_status: existingRecord.status,
            last_attempt_at: new Date().toISOString()
          });
          continue;
        }

        // 4d. Other duplicate
        results.push({
          client_request_id: item.client_request_id,
          local_id: item.local_id,
          success: true,
          code: 'BUSINESS_DUPLICATE',
          message: `Santri sudah memiliki catatan kehadiran (${existingRecord.status.toUpperCase()}).`,
          attendance_record_id: existingRecord.id,
          final_status: existingRecord.status
        });

        OfflineStorageService.updatePendingRecord(item.local_id, {
          sync_status: 'synced',
          conflict_code: 'BUSINESS_DUPLICATE',
          server_attendance_id: existingRecord.id,
          server_final_status: existingRecord.status,
          last_attempt_at: new Date().toISOString()
        });
        continue;
      }

      // 5. New Valid Record Creation
      const newRecordId = Date.now() + Math.floor(Math.random() * 1000);
      const newRecord: AttendanceRecord = {
        id: newRecordId,
        attendance_session_id: session.id,
        student_id: item.student_id,
        student_name: item.student_name,
        student_number: item.student_number,
        classroom_name: item.classroom_name || student?.classroom_name || '-',
        dormitory_room_name: item.dormitory_room_name || student?.dormitory_room_name || '-',
        status: calculatedStatus,
        method: item.attendance_method,
        record_source: 'operator',
        check_in_at: item.captured_at_client,
        late_minutes: lateMinutes,
        recorded_by: `${item.operator_name} (Offline PWA)`,
        notes: item.notes,
        was_offline: true,
        received_at: new Date().toISOString(),
        client_request_id: item.client_request_id,
        client_installation_id: item.device_context?.installation_id,
        sync_delay_seconds: Math.round((Date.now() - captureTime.getTime()) / 1000)
      };

      currentRecords.push(newRecord);

      // Update participant snapshot
      currentParticipants = currentParticipants.map(p => 
        p.attendance_session_id === session.id && p.student_id === item.student_id
          ? { ...p, current_status: calculatedStatus, check_in_time: item.captured_at_client, method: item.attendance_method }
          : p
      );

      results.push({
        client_request_id: item.client_request_id,
        local_id: item.local_id,
        success: true,
        code: 'SYNCED',
        message: `Absensi ${calculatedStatus.toUpperCase()} berhasil disinkronkan ke server.`,
        attendance_record_id: newRecordId,
        final_status: calculatedStatus
      });

      OfflineStorageService.updatePendingRecord(item.local_id, {
        sync_status: 'synced',
        conflict_code: 'ALREADY_SYNCED',
        server_attendance_id: newRecordId,
        server_final_status: calculatedStatus,
        last_attempt_at: new Date().toISOString()
      });
    }

    const successCount = results.filter(r => r.success).length;
    const conflictCount = results.filter(r => !r.success && r.requires_review).length;
    const failedCount = results.filter(r => !r.success && !r.requires_review).length;

    const batchResponse: SyncBatchResponse = {
      success: failedCount === 0 && conflictCount === 0,
      processed_count: results.length,
      success_count: successCount,
      conflict_count: conflictCount,
      failed_count: failedCount,
      server_time: new Date().toISOString(),
      results
    };

    return {
      batchResponse,
      updatedRecords: currentRecords,
      updatedHistories: currentHistories,
      updatedParticipants: currentParticipants
    };
  }

  /**
   * Resolve an individual conflict (Admin Override)
   */
  public static resolveConflict(
    item: PendingAttendanceItem,
    decision: 'ACCEPT_OFFLINE' | 'KEEP_SERVER',
    records: AttendanceRecord[],
    recordHistories: AttendanceRecordHistory[],
    participants: AttendanceSessionParticipant[],
    adminUser: { id: number; name: string }
  ): {
    updatedRecords: AttendanceRecord[];
    updatedHistories: AttendanceRecordHistory[];
    updatedParticipants: AttendanceSessionParticipant[];
    message: string;
  } {
    let currentRecords = [...records];
    let currentHistories = [...recordHistories];
    let currentParticipants = [...participants];

    const recordIndex = currentRecords.findIndex(
      r => r.attendance_session_id === item.session_id && r.student_id === item.student_id
    );

    if (decision === 'ACCEPT_OFFLINE') {
      if (recordIndex !== -1) {
        const oldRec = currentRecords[recordIndex];
        const updatedRec: AttendanceRecord = {
          ...oldRec,
          status: item.requested_status,
          method: item.attendance_method,
          notes: `${oldRec.notes || ''} | Manual conflict resolution: Accepted Offline`,
          was_offline: true,
          received_at: new Date().toISOString(),
          recorded_by: `${adminUser.name} (Resolved Conflict)`
        };
        currentRecords[recordIndex] = updatedRec;

        currentHistories.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          attendance_record_id: oldRec.id,
          student_id: item.student_id,
          student_name: item.student_name,
          old_status: oldRec.status,
          new_status: item.requested_status,
          old_method: oldRec.method,
          new_method: item.attendance_method,
          reason: `Conflict manually resolved by ${adminUser.name}: Accepted offline capture.`,
          changed_by: adminUser.name,
          changed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

        currentParticipants = currentParticipants.map(p => 
          p.attendance_session_id === item.session_id && p.student_id === item.student_id
            ? { ...p, current_status: item.requested_status }
            : p
        );
      }

      OfflineStorageService.updatePendingRecord(item.local_id, {
        sync_status: 'synced',
        conflict_message: 'Konflik diterima oleh admin',
        last_attempt_at: new Date().toISOString()
      });

      return {
        updatedRecords: currentRecords,
        updatedHistories: currentHistories,
        updatedParticipants: currentParticipants,
        message: `Data offline ${item.student_name} (${item.requested_status.toUpperCase()}) berhasil diterapkan.`
      };
    } else {
      // Keep server record
      OfflineStorageService.updatePendingRecord(item.local_id, {
        sync_status: 'synced',
        conflict_message: 'Admin mempertahankan data server',
        last_attempt_at: new Date().toISOString()
      });

      return {
        updatedRecords: currentRecords,
        updatedHistories: currentHistories,
        updatedParticipants: currentParticipants,
        message: `Data server untuk ${item.student_name} tetap dipertahankan.`
      };
    }
  }
}
