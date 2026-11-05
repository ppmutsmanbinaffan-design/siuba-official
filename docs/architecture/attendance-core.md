# SIUBA Attendance Core Engine Specification

## 1. Executive Overview
The Attendance Core Engine (`App\Services\Attendance\AttendanceService`) serves as the single source of truth for all attendance recording in the SIUBA ecosystem (Sistem Informasi Utsman Bin Affan). It provides unified business rules, strict pre-condition validation, participant snapshot verification, idempotency locks, and atomic transaction recording across all input channels.

## 2. Ingress Channels & Method Support
- **Manual (KBM / Halaqah)**: Form-based single or batch submission by authorized ustadz/teachers (`AttendanceMethod::MANUAL`).
- **QR Token Scan**: Single-student dynamic or static QR token scan via mobile device or scanner kiosk (`AttendanceMethod::QR`).
- **RFID UID Tap**: High-throughput automated gate tap with automatic string normalization (`AttendanceMethod::RFID`).
- **Extensibility**: Future hooks prepared for `FINGERPRINT`, `FACE`, `NFC`, and `MOBILE` geolocation.

## 3. Validation Pipeline (`AttendanceValidationService`)
Every attendance attempt passes through strict sequential pre-conditions:
1. **Active Student Check**: Rejects inactive/suspended students (`STUDENT_INACTIVE`).
2. **Session Status Check**: Verifies session status is `OPEN` (`SESSION_NOT_OPEN` / `SESSION_CLOSED`).
3. **Time Window Check**: Validates check-in timestamp does not exceed `end_at` (`OUTSIDE_ATTENDANCE_TIME`).
4. **Method Allowance Check**: Confirms the parent activity allows the given method (`INVALID_METHOD`).
5. **Participant Snapshot Verification**: If the session has a pre-registered participant snapshot (`attendance_session_participants`), validates that the student belongs to the snapshot (`STUDENT_NOT_PARTICIPANT`).
6. **Duplicate Check (Idempotency)**: Prevents duplicate attendance within the same session using database locks and unique constraint (`ALREADY_RECORDED`).

## 4. Status Determination & Late Minute Calculation
- **`PRESENT` (Hadir)**: Check-in timestamp $\le$ `present_until`. `late_minutes = 0`.
- **`LATE` (Terlambat)**: `present_until` $<$ Check-in timestamp $\le$ `late_until` (or `end_at`). `late_minutes = ceil(diffInMinutes)`.
- **`PERMISSION` / `SICK` / `DISPENSATION`**: Explicitly set through manual operator overrides or approved dispensation workflow.
- **`ABSENT` (Alpha)**: Automated batch resolution upon session closure for unrecorded participants.

## 5. Database Schema & Integrity
- `attendance_sessions`: Root session record with timezone-locked datetimes (`Asia/Jakarta`).
- `attendance_session_participants`: Explicit snapshot table with unique constraint `(attendance_session_id, student_id)`.
- `attendance_records`: Immutable attendance fact table with unique constraint `(attendance_session_id, student_id)`.

## 6. Event Dispatch & Extensibility
Upon successful transaction commit, `App\Events\AttendanceRecorded` is dispatched for:
- Real-time dashboard broadcast via WebSockets.
- Parent SMS / WhatsApp notification queue.
- Student points & disciplinary ledger aggregation.
