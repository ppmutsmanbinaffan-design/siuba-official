# SIUBA Domain & Dynamic Participant Engine Architecture (Sprint 6–8)

## 1. Executive Summary
Tahap 2 integrates the academic, routine/boarding, and extracurricular/event scheduling domains into the unified SIUBA attendance architecture. All domains share a single source of truth:
- **`ActivityParticipantResolver`**: A unified dynamic rule engine supporting `include`/`exclude` rules with deduplication and strict precedence.
- **`GenerateSessionParticipants`**: Creates immutable snapshots (`attendance_session_participants`) at session creation time, locked upon `OPEN`.
- **`AttendanceService`**: Single centralized engine recording all attendance fact records (`attendance_records`) across Manual, QR, and RFID methods.

---

## 2. Dynamic Participant Engine
The participant engine resolves students dynamically according to active `activity_participant_rules`:
- **Supported Sources**: `all_students` (with gender filter), `classroom`, `grade_level`, `dormitory`, `room`, `halaqah`, `extracurricular`, `duty_roster` (date-sensitive), `event_registration` (approved only), and `individual`.
- **Precedence**: `EXCLUDE` strictly overrides `INCLUDE`.
- **Deduplication**: Students matching multiple rules (e.g. Class 10A + Halaqah Utsman) are included exactly once with full source tracing in audit metadata.
- **Draft Session Refresh**: Draft sessions support previewing participant count changes (`previewRefresh`) and refreshing the snapshot before opening.

---

## 3. Sprint 6: Academic / KBM Domain
- **Entities**: `AcademicYear`, `Semester`, `Subject`, `LessonPeriod` (Jam Pelajaran / JP), `TeachingAssignment` (SK Mengajar), `AcademicSchedule`, `AcademicSessionContext`, `AcademicCalendarEvent`, `AcademicSubstitution`.
- **Generator (`AcademicSessionGenerator`)**: Evaluates day of week, active semester, and calendar holidays to generate daily sessions idempotently.
- **Snapshot Context**: Stores historical class, subject, and teacher references in `academic_session_contexts` so historical attendance records remain immutable even if schedules change.

---

## 4. Sprint 7: Ibadah & Boarding Domain
- **Entities**: `Halaqah`, `HalaqahMember`, `DutyRoster` (Piket/Imam/Muadzin), `RoutineScheduleOverride`.
- **Routine Generator (`RoutineSessionGenerator`)**: Generates 5 daily prayer sessions and boarding activities with automatic cross-midnight calculation (e.g. 23:30 to 00:30 next day).
- **Roster Binding**: Filters duty roster participants for the specific session date.

---

## 5. Sprint 8: Extracurricular & Event Domain
- **Entities**: `Extracurricular`, `ExtracurricularMember`, `Event`, `EventSession`, `EventRegistration`, `EventAttendanceSessionContext`, `EventOrganizer`.
- **Capacity & Waitlist**: Atomic validation in `ExtracurricularEligibilityService` for registration, waitlist queuing, and automatic waitlist promotion upon member resignation.
- **Event Generator (`EventSessionGenerator`)**: Idempotently generates attendance sessions for event sessions with support for `required`, `optional`, and `checkin_only` finalization policies.

---

## 6. Verification & Test Matrix
- `tests/Feature/DynamicParticipantEngineTest.php`: Gender filter, multi-source deduplication, exclude precedence, snapshot locking.
- `tests/Feature/AcademicSessionGeneratorTest.php`: Idempotent generation, holiday suppression, snapshot creation, and attendance recording.
- `tests/Feature/RoutineBoardingEngineTest.php`: Cross-midnight time calculation, halaqah membership, duty roster date resolution.
- `tests/Feature/ExtracurricularAndEventTest.php`: Capacity limits, waitlist promotion, event session generation, and QR check-in.
