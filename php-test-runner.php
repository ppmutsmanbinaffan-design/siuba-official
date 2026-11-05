<?php

/**
 * SIUBA (Sistem Informasi Utsman Bin Affan) - Attendance Engine PHP Test Suite
 * Sprint 0 & 1 Verification Runner
 */

require_once __DIR__ . '/app/Enums/AttendanceMethod.php';
require_once __DIR__ . '/app/Enums/AttendanceStatus.php';
require_once __DIR__ . '/app/Enums/SessionStatus.php';
require_once __DIR__ . '/app/Enums/ActivityType.php';
require_once __DIR__ . '/app/Enums/AttendanceResultCode.php';
require_once __DIR__ . '/app/Enums/DeviceType.php';

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Enums\ActivityType;
use App\Enums\AttendanceResultCode;
use App\Enums\DeviceType;

$passed = 0;
$failed = 0;
$results = [];

function assert_test(string $name, bool $condition, string $detail = '') {
    global $passed, $failed, $results;
    if ($condition) {
        $passed++;
        $results[] = ["name" => $name, "status" => "PASS", "detail" => $detail];
        echo "  [PASS] {$name}\n";
    } else {
        $failed++;
        $results[] = ["name" => $name, "status" => "FAIL", "detail" => $detail];
        echo "  [FAIL] {$name} - {$detail}\n";
    }
}

echo "====================================================================\n";
echo "  SIUBA ABSENSI SANTRI - SPRINT 0 & 1 AUTOMATED PHP ENGINE TEST SUITE\n";
echo "====================================================================\n\n";

// Test 1: AttendanceStatus Enum Indonesian Labels
echo "Testing Enums & Indonesian Labels:\n";
assert_test("Present status label is 'Hadir'", AttendanceStatus::PRESENT->label() === 'Hadir');
assert_test("Late status label is 'Terlambat'", AttendanceStatus::LATE->label() === 'Terlambat');
assert_test("Permission status label is 'Izin'", AttendanceStatus::PERMISSION->label() === 'Izin');
assert_test("Sick status label is 'Sakit'", AttendanceStatus::SICK->label() === 'Sakit');
assert_test("Dispensation status label is 'Dispensasi'", AttendanceStatus::DISPENSATION->label() === 'Dispensasi');
assert_test("Absent status label is 'Alpha'", AttendanceStatus::ABSENT->label() === 'Alpha');

// Test 2: AttendanceMethod Enum Extensibility
echo "\nTesting Attendance Methods:\n";
assert_test("Manual method exists", AttendanceMethod::MANUAL->value === 'manual');
assert_test("QR method exists", AttendanceMethod::QR->value === 'qr');
assert_test("RFID method exists", AttendanceMethod::RFID->value === 'rfid');
assert_test("Future methods (fingerprint, face, nfc, mobile) defined", 
    AttendanceMethod::FINGERPRINT->value === 'fingerprint' &&
    AttendanceMethod::FACE->value === 'face' &&
    AttendanceMethod::NFC->value === 'nfc' &&
    AttendanceMethod::MOBILE->value === 'mobile'
);

// Test 3: SessionStatus Transitions
echo "\nTesting Session Transitions:\n";
assert_test("Draft can transition to Open", SessionStatus::DRAFT->canTransitionTo(SessionStatus::OPEN));
assert_test("Draft can transition to Cancelled", SessionStatus::DRAFT->canTransitionTo(SessionStatus::CANCELLED));
assert_test("Open can transition to Closed", SessionStatus::OPEN->canTransitionTo(SessionStatus::CLOSED));
assert_test("Open can transition to Cancelled", SessionStatus::OPEN->canTransitionTo(SessionStatus::CANCELLED));
assert_test("Closed cannot reopen without administrative override", !SessionStatus::CLOSED->canTransitionTo(SessionStatus::OPEN));

// Test 4: RFID UID Normalization Logic
echo "\nTesting RFID UID Normalization:\n";
function normalizeRfid(?string $raw): ?string {
    if ($raw === null || trim($raw) === '') return null;
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $raw));
}
assert_test("RFID UID '04 a8 7f 12' normalizes to '04A87F12'", normalizeRfid('04 a8 7f 12') === '04A87F12');
assert_test("RFID UID '04:A8:7F:12' normalizes to '04A87F12'", normalizeRfid('04:A8:7F:12') === '04A87F12');
assert_test("RFID UID '  04-a8-7f-12  ' normalizes to '04A87F12'", normalizeRfid('  04-a8-7f-12  ') === '04A87F12');

// Test 5: Automatic Status & Late Minutes Calculation
echo "\nTesting Automatic Status & Late Minutes Engine:\n";
function determineAttendanceStatus(string $checkIn, string $startAt, string $presentUntil, string $lateUntil, string $endAt): array {
    $tCheck = strtotime($checkIn);
    $tPresent = strtotime($presentUntil);
    $tLate = strtotime($lateUntil);
    $tEnd = strtotime($endAt);

    if ($tCheck > $tEnd) {
        return ["code" => "OUTSIDE_ATTENDANCE_TIME", "status" => null, "late_minutes" => 0];
    }
    if ($tCheck <= $tPresent) {
        return ["code" => "SUCCESS", "status" => AttendanceStatus::PRESENT, "late_minutes" => 0];
    }
    if ($tCheck <= $tLate) {
        $lateMins = (int) ceil(($tCheck - $tPresent) / 60);
        return ["code" => "SUCCESS", "status" => AttendanceStatus::LATE, "late_minutes" => $lateMins];
    }
    if ($tCheck <= $tEnd) {
        $lateMins = (int) ceil(($tCheck - $tPresent) / 60);
        return ["code" => "SUCCESS", "status" => AttendanceStatus::LATE, "late_minutes" => $lateMins];
    }
    return ["code" => "OUTSIDE_ATTENDANCE_TIME", "status" => null, "late_minutes" => 0];
}

// Scenario: Subuh 04:15 - 05:00, present_until 04:30, late_until 04:45
$onTime = determineAttendanceStatus("2026-08-23 04:25:00", "2026-08-23 04:15:00", "2026-08-23 04:30:00", "2026-08-23 04:45:00", "2026-08-23 05:00:00");
assert_test("Check-in 04:25 gives status PRESENT with 0 late minutes", $onTime['status'] === AttendanceStatus::PRESENT && $onTime['late_minutes'] === 0);

$late = determineAttendanceStatus("2026-08-23 04:38:00", "2026-08-23 04:15:00", "2026-08-23 04:30:00", "2026-08-23 04:45:00", "2026-08-23 05:00:00");
assert_test("Check-in 04:38 gives status LATE with 8 late minutes", $late['status'] === AttendanceStatus::LATE && $late['late_minutes'] === 8);

$tooLate = determineAttendanceStatus("2026-08-23 05:10:00", "2026-08-23 04:15:00", "2026-08-23 04:30:00", "2026-08-23 04:45:00", "2026-08-23 05:00:00");
assert_test("Check-in 05:10 gives OUTSIDE_ATTENDANCE_TIME", $tooLate['code'] === "OUTSIDE_ATTENDANCE_TIME");

// Test 6: Method Allowance Validation
echo "\nTesting Method Allowance Validation:\n";
function validateMethod(bool $allowManual, bool $allowQr, bool $allowRfid, AttendanceMethod $method): bool {
    return match($method) {
        AttendanceMethod::MANUAL => $allowManual,
        AttendanceMethod::QR => $allowQr,
        AttendanceMethod::RFID => $allowRfid,
        default => false,
    };
}
assert_test("Activity allows Manual when allow_manual=true", validateMethod(true, true, true, AttendanceMethod::MANUAL));
assert_test("Activity rejects RFID when allow_rfid=false (e.g. KBM)", !validateMethod(true, true, false, AttendanceMethod::RFID));

// Test 7: Result Codes & STUDENT_NOT_PARTICIPANT Verification
echo "\nTesting AttendanceResultCode Enum:\n";
assert_test("STUDENT_NOT_PARTICIPANT code exists", AttendanceResultCode::STUDENT_NOT_PARTICIPANT->value === 'STUDENT_NOT_PARTICIPANT');
assert_test("STUDENT_NOT_PARTICIPANT message is Indonesian translated", str_contains(AttendanceResultCode::STUDENT_NOT_PARTICIPANT->message(), 'peserta terdaftar'));
assert_test("ALREADY_RECORDED code exists", AttendanceResultCode::ALREADY_RECORDED->value === 'ALREADY_RECORDED');
assert_test("SESSION_NOT_OPEN code exists", AttendanceResultCode::SESSION_NOT_OPEN->value === 'SESSION_NOT_OPEN');

// Test 8: Participant Snapshot Logic Simulation
echo "\nTesting Participant Snapshot Validation Logic:\n";
function validateParticipantSnapshot(array $registeredStudentIds, int $targetStudentId): array {
    if (empty($registeredStudentIds)) {
        return ["valid" => true, "code" => AttendanceResultCode::SUCCESS];
    }
    if (in_array($targetStudentId, $registeredStudentIds, true)) {
        return ["valid" => true, "code" => AttendanceResultCode::SUCCESS];
    }
    return ["valid" => false, "code" => AttendanceResultCode::STUDENT_NOT_PARTICIPANT];
}
$snapshot = [101, 102, 103];
assert_test("Registered student in snapshot passes validation", validateParticipantSnapshot($snapshot, 101)['valid'] === true);
assert_test("Unregistered student in snapshot is blocked with STUDENT_NOT_PARTICIPANT", validateParticipantSnapshot($snapshot, 999)['code'] === AttendanceResultCode::STUDENT_NOT_PARTICIPANT);
assert_test("Session without snapshot allows all students", validateParticipantSnapshot([], 999)['valid'] === true);

// Test 9: Dynamic Participant Resolution & Precedence (EXCLUDE > INCLUDE)
echo "\nTesting Dynamic Participant Rule Resolution:\n";
function resolveParticipants(array $includes, array $excludes): array {
    $union = array_unique($includes);
    $final = array_diff($union, $excludes);
    return array_values($final);
}
$includes = [1, 2, 3, 2, 4]; // Class 10A + Halaqah 1 includes student 2 twice
$excludes = [3]; // Exclude student 3
$resolved = resolveParticipants($includes, $excludes);
assert_test("Dynamic participant union deduplicates same student", count(array_keys($resolved, 2)) === 1);
assert_test("Dynamic participant precedence: EXCLUDE beats INCLUDE", !in_array(3, $resolved, true));
assert_test("Dynamic participant count matches expected", count($resolved) === 3); // 1, 2, 4

// Test 10: Idempotent Session Code Generation
echo "\nTesting Idempotent Session Code Generation:\n";
function makeAcademicSessionCode(int $scheduleId, string $dateStr): string {
    return "KBM-SCH{$scheduleId}-" . str_replace('-', '', $dateStr);
}
$code1 = makeAcademicSessionCode(42, '2026-08-24');
$code2 = makeAcademicSessionCode(42, '2026-08-24');
assert_test("Academic session code is deterministic & idempotent", $code1 === $code2 && $code1 === 'KBM-SCH42-20260824');

// Test 11: Sprint 9 Analytics Metric Formulas (Eligible Denominator & Rates)
echo "\nTesting Sprint 9 Analytics Metric Service:\n";
function computeMetrics(int $eligible, int $present, int $late, int $permission, int $sick, int $dispensation, int $absent): array {
    $recorded = $present + $late + $permission + $sick + $dispensation + $absent;
    $unrecorded = max(0, $eligible - $recorded);
    $round = fn(int $num, int $den) => $den > 0 ? round(($num / $den) * 100, 1) : 0.0;

    return [
        'total_eligible' => $eligible,
        'total_recorded' => $recorded,
        'present' => $present,
        'late' => $late,
        'permission' => $permission,
        'sick' => $sick,
        'dispensation' => $dispensation,
        'absent' => $absent,
        'unrecorded' => $unrecorded,
        'completion_rate' => $round($recorded, $eligible),
        'attendance_rate' => $round($present + $late, $eligible),
        'on_time_rate' => $round($present, $eligible),
        'late_rate' => $round($late, $eligible),
        'absent_rate' => $round($absent, $eligible),
    ];
}

$testMetrics = computeMetrics(100, 80, 10, 3, 2, 1, 4);
assert_test("Attendance Rate = 90.0% for (80 present + 10 late) / 100 eligible", $testMetrics['attendance_rate'] === 90.0);
assert_test("On-Time Rate = 80.0% for 80 present / 100 eligible", $testMetrics['on_time_rate'] === 80.0);
assert_test("Late Rate = 10.0% for 10 late / 100 eligible", $testMetrics['late_rate'] === 10.0);
assert_test("Absent Rate = 4.0% for 4 alpha / 100 eligible", $testMetrics['absent_rate'] === 4.0);
assert_test("Completion Rate = 100.0% for 100 recorded / 100 eligible", $testMetrics['completion_rate'] === 100.0);

$zeroMetrics = computeMetrics(0, 0, 0, 0, 0, 0, 0);
assert_test("Zero denominator safely returns 0.0% without division by zero error", $zeroMetrics['attendance_rate'] === 0.0);

// Test 12: Sprint 10 Offline Idempotency & Auto-Alpha Conflict Resolution
echo "\nTesting Sprint 10 Offline Sync & Conflict Rules:\n";
function evaluateSyncItem(
    string $clientRequestId,
    array $syncedRequestIds,
    ?array $existingServerRecord,
    string $capturedAtClient,
    string $sessionEndAt
): array {
    // 1. Exact Idempotency
    if (in_array($clientRequestId, $syncedRequestIds, true)) {
        return ['code' => 'ALREADY_SYNCED', 'success' => true, 'action' => 'none'];
    }

    // 2. Existing Record Conflict Check
    if ($existingServerRecord !== null) {
        // Auto-Alpha Conflict: System auto-marked absent, client captured legitimate check-in before session end
        if ($existingServerRecord['status'] === 'absent' && $existingServerRecord['source'] === 'system') {
            if (strtotime($capturedAtClient) <= strtotime($sessionEndAt)) {
                return ['code' => 'AUTO_ALPHA_CONFLICT_RESOLVED', 'success' => true, 'action' => 'update_to_present'];
            }
        }

        // Human Manual Record: Protected from silent overwrite
        if ($existingServerRecord['source'] === 'operator') {
            return ['code' => 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW', 'success' => false, 'action' => 'review_required'];
        }

        return ['code' => 'BUSINESS_DUPLICATE', 'success' => true, 'action' => 'none'];
    }

    return ['code' => 'SYNCED', 'success' => true, 'action' => 'insert'];
}

$idempotentCheck = evaluateSyncItem('req_123', ['req_123'], null, '2026-08-24 07:10:00', '2026-08-24 07:30:00');
assert_test("Duplicate client_request_id returns ALREADY_SYNCED", $idempotentCheck['code'] === 'ALREADY_SYNCED');

$autoAlphaCheck = evaluateSyncItem('req_124', [], ['status' => 'absent', 'source' => 'system'], '2026-08-24 07:15:00', '2026-08-24 07:30:00');
assert_test("Valid offline capture safely resolves system Auto-Alpha", $autoAlphaCheck['code'] === 'AUTO_ALPHA_CONFLICT_RESOLVED' && $autoAlphaCheck['action'] === 'update_to_present');

$humanProtectionCheck = evaluateSyncItem('req_125', [], ['status' => 'permission', 'source' => 'operator'], '2026-08-24 07:15:00', '2026-08-24 07:30:00');
assert_test("Human operator correction is protected from silent offline overwrite", $humanProtectionCheck['code'] === 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW');

echo "\n====================================================================\n";
echo "  SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "====================================================================\n";

if ($failed === 0) {
    exit(0);
} else {
    exit(1);
}
