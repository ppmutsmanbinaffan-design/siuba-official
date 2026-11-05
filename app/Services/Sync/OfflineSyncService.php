<?php

namespace App\Services\Sync;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceRecordHistory;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\ClientInstallation;
use App\Models\Student;
use App\Models\User;
use App\Services\Attendance\AttendanceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OfflineSyncService
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    /**
     * Process batch offline sync operations sent from PWA client IndexedDB.
     *
     * @param array $items Array of offline pending items:
     *   [
     *     'client_request_id' => string,
     *     'local_id' => string,
     *     'session_id' => int,
     *     'student_id' => int,
     *     'method' => string,
     *     'status' => string,
     *     'captured_at_client' => string (ISO),
     *     'estimated_server_time' => ?string (ISO),
     *     'clock_offset_ms' => ?int,
     *     'notes' => ?string,
     *     'installation_id' => ?string,
     *   ]
     * @param User|null $operator
     * @return array
     */
    public function processBatchSync(array $items, ?User $operator = null): array
    {
        $results = [];
        $serverTime = Carbon::now('Asia/Jakarta');

        foreach ($items as $item) {
            $clientRequestId = $item['client_request_id'] ?? null;
            $localId = $item['local_id'] ?? null;
            $sessionId = $item['session_id'] ?? null;
            $studentId = $item['student_id'] ?? null;
            $methodStr = $item['method'] ?? 'manual';
            $statusStr = $item['status'] ?? 'present';
            $capturedAtClient = isset($item['captured_at_client']) ? Carbon::parse($item['captured_at_client']) : $serverTime;
            $installationId = $item['installation_id'] ?? null;
            $notes = $item['notes'] ?? null;

            // Track client installation last seen
            if ($installationId) {
                ClientInstallation::updateOrCreate(
                    ['installation_uuid' => $installationId],
                    ['last_seen_at' => $serverTime, 'user_id' => $operator?->id]
                );
            }

            // 1. Basic validation
            if (!$sessionId || !$studentId || !$clientRequestId) {
                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => false,
                    'code' => 'INVALID_PAYLOAD',
                    'message' => 'Format payload antrean offline tidak lengkap.',
                    'requires_review' => false,
                ];
                continue;
            }

            $session = AttendanceSession::find($sessionId);
            $student = Student::find($studentId);

            if (!$session || !$student) {
                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => false,
                    'code' => 'NOT_FOUND',
                    'message' => 'Sesi atau Santri tidak ditemukan di database server.',
                    'requires_review' => false,
                ];
                continue;
            }

            // 2. Participant validation in session snapshot
            $participant = AttendanceSessionParticipant::where('attendance_session_id', $session->id)
                ->where('student_id', $student->id)
                ->first();

            if (!$participant || $participant->eligibility_status === 'ineligible') {
                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => false,
                    'code' => 'PARTICIPANT_INVALID',
                    'message' => "Santri {$student->name} bukan peserta sah pada sesi ini.",
                    'requires_review' => true,
                ];
                continue;
            }

            // 3. Check exact idempotency: already synced with same client_request_id
            $existingWithSameRequestId = AttendanceRecord::where('client_request_id', $clientRequestId)->first();
            if ($existingWithSameRequestId) {
                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => true,
                    'code' => 'ALREADY_SYNCED',
                    'message' => 'Data absensi telah tersinkronisasi sebelumnya (Idempoten).',
                    'attendance_record_id' => $existingWithSameRequestId->id,
                    'final_status' => $existingWithSameRequestId->status->value,
                    'requires_review' => false,
                ];
                continue;
            }

            // 4. Check business duplicate & conflict on session + student
            $existingRecord = AttendanceRecord::where('attendance_session_id', $session->id)
                ->where('student_id', $student->id)
                ->first();

            $method = AttendanceMethod::tryFrom($methodStr) ?? AttendanceMethod::MANUAL;
            $requestedStatus = AttendanceStatus::tryFrom($statusStr) ?? AttendanceStatus::PRESENT;
            $syncDelaySeconds = max(0, $serverTime->diffInSeconds($capturedAtClient));

            if ($existingRecord) {
                // 4a. Auto-Alpha Conflict Resolution:
                // If record was auto-generated by system because session was closed, but offline capture was made in time:
                if ($existingRecord->status === AttendanceStatus::ABSENT && $existingRecord->record_source === 'system') {
                    $oldStatus = $existingRecord->status->value;
                    $lateMinutes = $this->attendanceService->calculateLateMinutes($session, $capturedAtClient, $requestedStatus);

                    DB::transaction(function () use (
                        $existingRecord,
                        $student,
                        $requestedStatus,
                        $method,
                        $capturedAtClient,
                        $lateMinutes,
                        $notes,
                        $clientRequestId,
                        $installationId,
                        $syncDelaySeconds,
                        $oldStatus,
                        $operator
                    ) {
                        $existingRecord->update([
                            'status' => $requestedStatus,
                            'method' => $method,
                            'check_in_at' => $capturedAtClient,
                            'late_minutes' => $lateMinutes,
                            'recorded_by' => $operator?->id,
                            'notes' => $notes ? ($notes . ' | Offline Sync Auto-Alpha Corrected') : 'Offline Sync Auto-Alpha Corrected',
                            'record_source' => 'operator',
                            'was_offline' => true,
                            'client_request_id' => $clientRequestId,
                            'client_installation_id' => $installationId,
                            'sync_delay_seconds' => $syncDelaySeconds,
                        ]);

                        AttendanceRecordHistory::create([
                            'attendance_record_id' => $existingRecord->id,
                            'student_id' => $student->id,
                            'old_status' => $oldStatus,
                            'new_status' => $requestedStatus->value,
                            'old_method' => $existingRecord->method->value,
                            'new_method' => $method->value,
                            'reason' => 'Valid offline attendance synchronized after session finalization (Auto-Alpha Corrected).',
                            'changed_by' => $operator ? $operator->name : 'Offline Sync Engine',
                            'changed_at' => Carbon::now('Asia/Jakarta'),
                            'metadata' => [
                                'client_request_id' => $clientRequestId,
                                'captured_at_client' => $capturedAtClient->toIso8601String(),
                                'installation_id' => $installationId,
                            ],
                        ]);
                    });

                    $results[] = [
                        'client_request_id' => $clientRequestId,
                        'local_id' => $localId,
                        'success' => true,
                        'code' => 'AUTO_ALPHA_CONFLICT_RESOLVED',
                        'message' => "Konflik Auto-Alpha berhasil dikoreksi menjadi {$requestedStatus->label()}.",
                        'attendance_record_id' => $existingRecord->id,
                        'final_status' => $requestedStatus->value,
                        'requires_review' => false,
                    ];
                    continue;
                }

                // 4b. Human Correction Protection:
                // If record was manually recorded/edited by an operator, protect it from silent overwrite
                if ($existingRecord->record_source === 'operator') {
                    $results[] = [
                        'client_request_id' => $clientRequestId,
                        'local_id' => $localId,
                        'success' => false,
                        'code' => 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW',
                        'message' => "Konflik: Data presensi telah diatur secara manual oleh operator ({$existingRecord->status->label()}). Memerlukan review manual.",
                        'attendance_record_id' => $existingRecord->id,
                        'final_status' => $existingRecord->status->value,
                        'requires_review' => true,
                    ];
                    continue;
                }

                // 4c. Other business duplicate
                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => true,
                    'code' => 'BUSINESS_DUPLICATE',
                    'message' => "Santri sudah memiliki catatan kehadiran ({$existingRecord->status->label()}).",
                    'attendance_record_id' => $existingRecord->id,
                    'final_status' => $existingRecord->status->value,
                    'requires_review' => false,
                ];
                continue;
            }

            // 5. New Offline Record Creation
            $calculatedStatus = $requestedStatus;
            if ($method === AttendanceMethod::QR) {
                $calculatedStatus = $this->attendanceService->determineStatus($session, $capturedAtClient);
            }
            $lateMinutes = $this->attendanceService->calculateLateMinutes($session, $capturedAtClient, $calculatedStatus);

            try {
                $record = DB::transaction(function () use (
                    $session,
                    $student,
                    $calculatedStatus,
                    $method,
                    $capturedAtClient,
                    $lateMinutes,
                    $operator,
                    $notes,
                    $clientRequestId,
                    $installationId,
                    $syncDelaySeconds
                ) {
                    return AttendanceRecord::create([
                        'attendance_session_id' => $session->id,
                        'student_id' => $student->id,
                        'status' => $calculatedStatus,
                        'method' => $method,
                        'check_in_at' => $capturedAtClient,
                        'late_minutes' => $lateMinutes,
                        'recorded_by' => $operator?->id,
                        'notes' => $notes,
                        'record_source' => 'offline_sync',
                        'was_offline' => true,
                        'client_request_id' => $clientRequestId,
                        'client_installation_id' => $installationId,
                        'sync_delay_seconds' => $syncDelaySeconds,
                    ]);
                });

                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => true,
                    'code' => 'SYNCED',
                    'message' => "Presensi {$student->name} ({$calculatedStatus->label()}) berhasil disinkronkan.",
                    'attendance_record_id' => $record->id,
                    'final_status' => $calculatedStatus->value,
                    'requires_review' => false,
                ];
            } catch (\Exception $e) {
                Log::error("Offline sync item failed: " . $e->getMessage(), ['item' => $item]);
                $results[] = [
                    'client_request_id' => $clientRequestId,
                    'local_id' => $localId,
                    'success' => false,
                    'code' => 'SERVER_ERROR',
                    'message' => 'Gagal menyimpan ke database server. Silakan coba lagi atau hubungi tim IT.',
                    'requires_review' => false,
                ];
            }
        }

        $successCount = count(array_filter($results, fn($r) => $r['success']));
        $conflictCount = count(array_filter($results, fn($r) => !$r['success'] && ($r['requires_review'] ?? false)));
        $failedCount = count(array_filter($results, fn($r) => !$r['success'] && !($r['requires_review'] ?? false)));

        return [
            'success' => $failedCount === 0 && $conflictCount === 0,
            'processed_count' => count($results),
            'success_count' => $successCount,
            'conflict_count' => $conflictCount,
            'failed_count' => $failedCount,
            'server_time' => $serverTime->toIso8601String(),
            'results' => $results,
        ];
    }
}
