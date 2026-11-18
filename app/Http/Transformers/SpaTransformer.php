<?php

namespace App\Http\Transformers;

use App\Models\AttendanceRecord;
use App\Models\AttendanceRecordHistory;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Models\StudentExcusal;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffAbsenceRequest;
use App\Models\StaffProfile;
use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceLog;

/**
 * Mengubah model Eloquent menjadi bentuk JSON yang diharapkan aplikasi React (src/types.ts).
 */
class SpaTransformer
{
    /** Ambil nilai string dari enum (BackedEnum) maupun string biasa. */
    public static function val(mixed $v): mixed
    {
        return $v instanceof \BackedEnum ? $v->value : $v;
    }

    public static function student(Student $s): array
    {
        $status = $s->status ?: 'active';
        if ($status === 'active' && !$s->is_active) {
            $status = 'inactive';
        }

        return [
            'id' => $s->id,
            'student_number' => $s->student_number,
            'nisn' => $s->nisn ?? '',
            'name' => $s->name,
            'nickname' => $s->nickname,
            'gender' => self::val($s->gender),
            'birth_place' => $s->birth_place,
            'birth_date' => $s->birth_date?->format('Y-m-d'),
            'classroom_id' => $s->classroom_id,
            'classroom_name' => $s->relationLoaded('classroom') ? $s->classroom?->name : null,
            'dormitory_room_id' => $s->dormitory_room_id,
            'dormitory_room_name' => $s->relationLoaded('dormitoryRoom') ? $s->dormitoryRoom?->name : null,
            'generation_year' => $s->generation_year,
            'entry_year' => $s->entry_year,
            'photo' => $s->photo,
            'photo_path' => $s->photo,
            'qr_token' => $s->qr_token,
            'rfid_uid' => $s->rfid_uid,
            'guardian_name' => $s->guardian_name,
            'guardian_phone' => $s->guardian_phone,
            'address' => $s->address,
            'status' => $status,
            'is_active' => (bool) $s->is_active,
            'created_at' => $s->created_at?->toIso8601String(),
            'updated_at' => $s->updated_at?->toIso8601String(),
            'deleted_at' => $s->deleted_at?->toIso8601String(),
        ];
    }

    public static function classroom(Classroom $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'name' => $c->name,
            'grade_level' => (int) $c->grade_level,
            'academic_year' => $c->academic_year,
            'homeroom_teacher' => $c->homeroom_teacher_name ?? '',
            'homeroom_teacher_id' => $c->homeroom_teacher_id,
            'capacity' => $c->capacity,
            'student_count' => (int) ($c->students_count ?? 0),
            'is_active' => (bool) $c->is_active,
        ];
    }

    public static function dormitory(Dormitory $d): array
    {
        return [
            'id' => $d->id,
            'name' => $d->name,
            'gender' => self::val($d->gender),
            'is_active' => (bool) $d->is_active,
            'room_count' => (int) ($d->rooms_count ?? 0),
        ];
    }

    public static function dormitoryRoom(DormitoryRoom $r): array
    {
        return [
            'id' => $r->id,
            'dormitory_id' => $r->dormitory_id,
            'dormitory_name' => $r->relationLoaded('dormitory') ? ($r->dormitory?->name ?? '') : '',
            'code' => $r->code,
            'name' => $r->name,
            'capacity' => (int) $r->capacity,
            'supervisor' => $r->supervisor_name ?? '',
            'supervisor_id' => $r->supervisor_id,
            'student_count' => (int) ($r->students_count ?? 0),
            'is_active' => (bool) $r->is_active,
        ];
    }

    /**
     * @param array<string,int>|null $stats  hasil hitungan status (opsional, untuk daftar sesi)
     */
    public static function session(AttendanceSession $s, ?array $stats = null): array
    {
        $activity = $s->relationLoaded('activity') ? $s->activity : null;

        $data = [
            'id' => $s->id,
            'activity_id' => $s->activity_id,
            'activity_category_id' => $activity?->activity_category_id,
            'category_name' => $activity && $activity->relationLoaded('category') ? $activity->category?->name : null,
            'activity_name' => $activity?->name ?? $s->session_code,
            'activity_code' => $activity?->code ?? '',
            'session_code' => $s->session_code,
            'session_date' => $s->session_date?->format('Y-m-d'),
            'start_at' => $s->start_at?->toIso8601String(),
            'present_until' => $s->present_until?->toIso8601String(),
            'late_until' => $s->late_until?->toIso8601String(),
            'end_at' => $s->end_at?->toIso8601String(),
            'status' => self::val($s->status),
            'location' => $s->location ?? ($activity?->location ?? ''),
            'opened_by' => $s->relationLoaded('openedByUser') ? $s->openedByUser?->name : null,
            'closed_by' => $s->relationLoaded('closedByUser') ? $s->closedByUser?->name : null,
            'opened_at' => $s->opened_at?->toIso8601String(),
            'closed_at' => $s->closed_at?->toIso8601String(),
            'notes' => $s->notes,
        ];

        if ($stats !== null) {
            $total = (int) ($stats['participants'] ?? 0);
            $recorded = (int) ($stats['recorded'] ?? 0);
            $data += [
                'participant_count' => $total,
                'total_participants' => $total,
                'total_present' => (int) ($stats['present'] ?? 0),
                'total_late' => (int) ($stats['late'] ?? 0),
                'total_permission' => (int) ($stats['permission'] ?? 0),
                'total_sick' => (int) ($stats['sick'] ?? 0),
                'total_dispensation' => (int) ($stats['dispensation'] ?? 0),
                'total_absent' => (int) ($stats['absent'] ?? 0),
                'total_unrecorded' => max(0, $total - $recorded),
            ];
        }

        return $data;
    }

    public static function participant(AttendanceSessionParticipant $p): array
    {
        $student = $p->relationLoaded('student') ? $p->student : null;
        $eligibility = strtolower((string) ($p->eligibility_status ?? 'eligible'));

        return [
            'id' => $p->id,
            'attendance_session_id' => $p->attendance_session_id,
            'student_id' => $p->student_id,
            'student_name' => $student?->name ?? '',
            'student_number' => $student?->student_number ?? '',
            'classroom_id' => $student?->classroom_id,
            'classroom_name' => $student?->classroom?->name ?? '',
            'dormitory_room_name' => $student?->dormitoryRoom?->name ?? '',
            'participant_source' => $p->participant_source ?? 'manual',
            'eligibility_status' => $eligibility === 'ineligible' ? 'ineligible' : ($eligibility === 'eligible' ? 'eligible' : 'overridden'),
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }

    public static function record(AttendanceRecord $r): array
    {
        $student = $r->relationLoaded('student') ? $r->student : null;
        $method = self::val($r->method);

        return [
            'id' => $r->id,
            'attendance_session_id' => $r->attendance_session_id,
            'student_id' => $r->student_id,
            'student_name' => $student?->name ?? '',
            'student_number' => $student?->student_number ?? '',
            'classroom_name' => $student?->classroom?->name ?? '',
            'dormitory_room_name' => $student?->dormitoryRoom?->name ?? '',
            'status' => self::val($r->status),
            'method' => $method,
            'record_source' => $method === 'manual' ? 'operator' : ($method === 'rfid' ? 'device' : 'operator'),
            'check_in_at' => $r->check_in_at?->toIso8601String(),
            'late_minutes' => (int) $r->late_minutes,
            'attendance_device_id' => $r->attendance_device_id,
            'attendance_device_name' => $r->relationLoaded('device') ? $r->device?->device_name : null,
            'recorded_by' => $r->relationLoaded('recordedBy') ? $r->recordedBy?->name : null,
            'notes' => $r->notes,
        ];
    }

    public static function history(AttendanceRecordHistory $h, ?string $studentName = null): array
    {
        return [
            'id' => $h->id,
            'attendance_record_id' => $h->attendance_record_id,
            'student_id' => $h->student_id,
            'student_name' => $studentName ?? '',
            'old_status' => $h->old_status,
            'new_status' => $h->new_status,
            'old_method' => $h->old_method,
            'new_method' => $h->new_method,
            'reason' => $h->reason,
            'changed_by' => $h->changed_by,
            'changed_at' => $h->changed_at?->toIso8601String(),
            'created_at' => $h->created_at?->toIso8601String(),
        ];
    }

    public static function staff(StaffProfile $s): array
    {
        return [
            'id' => $s->id,
            'user_id' => $s->user_id,
            'username' => $s->relationLoaded('user') ? $s->user?->username : null,
            'roles' => $s->relationLoaded('user') && $s->user ? $s->user->getRoleNames()->values() : [],
            'staff_number' => $s->staff_number,
            'name' => $s->name,
            'gender' => $s->gender === 'P' ? 'female' : 'male',
            'staff_type' => $s->staff_type,
            'employment_status' => $s->employment_status,
            'phone' => $s->phone,
            'email' => $s->email,
            'photo' => $s->photo,
            'qr_token' => $s->qr_token,
            'rfid_uid' => $s->rfid_uid,
            'department' => $s->department,
            'position' => $s->position,
            'join_date' => $s->join_date?->format('Y-m-d'),
            'leave_date' => $s->leave_date?->format('Y-m-d'),
            'requires_daily_attendance' => (bool) $s->requires_daily_attendance,
            'is_active' => (bool) $s->is_active,
            'created_at' => $s->created_at?->toIso8601String(),
            'updated_at' => $s->updated_at?->toIso8601String(),
            'deleted_at' => $s->deleted_at?->toIso8601String(),
        ];
    }

    public static function device(AttendanceDevice $d, int $tapsToday = 0): array
    {
        $threshold = (int) config('services.nexabsen.offline_threshold_seconds', 60);
        $online = $d->is_active && $d->last_seen_at && $d->last_seen_at->diffInSeconds(now(), true) <= $threshold;

        return [
            'id' => $d->id,
            'device_code' => $d->device_code,
            'device_name' => $d->device_name,
            'device_type' => self::val($d->device_type),
            'location' => $d->location ?? '',
            'ip_address' => $d->ip_address ?? '',
            'last_seen_at' => $d->last_seen_at?->toIso8601String() ?? '',
            'is_active' => (bool) $d->is_active,
            'is_online' => $online,
            'status' => !$d->is_active ? 'pending_or_disabled' : ($online ? 'online' : 'offline'),
            'tap_count_today' => $tapsToday,
            'mode' => $d->mode ?? 'attendance',
            'device_mode' => $d->mode ?? 'attendance',
            'location_label' => $d->location ?? '',
            'last_ping_at' => $d->last_seen_at?->toIso8601String(),
            'current_session_id' => $d->current_session_id,
            'has_device_token' => (bool) $d->api_token_hash,
            'protocol' => $d->protocol ?? 'nexabsen',
            'serial_number' => $d->serial_number,
            'mac_address' => $d->mac_address,
            'firmware_version' => $d->firmware_version,
            'activated_at' => $d->activated_at?->toIso8601String(),
            'created_at' => $d->created_at?->toIso8601String(),
            'updated_at' => $d->updated_at?->toIso8601String(),
        ];
    }

    public static function deviceLog(AttendanceDeviceLog $l): array
    {
        return [
            'id' => $l->id,
            'attendance_device_id' => $l->attendance_device_id,
            'device_code' => $l->device_code,
            'event_type' => $l->event_type,
            'level' => $l->level,
            'status' => $l->level === 'info' ? 'success' : $l->level,
            'message' => $l->message,
            'metadata' => $l->metadata,
            'created_at' => $l->created_at?->toIso8601String(),
        ];
    }

    public static function excusal(StudentExcusal $e): array
    {
        $st = $e->relationLoaded('student') ? $e->student : null;

        return [
            'id' => $e->id,
            'student_id' => $e->student_id,
            'student_name' => $st?->name ?? '',
            'student_number' => $st?->student_number ?? '',
            'classroom_name' => $st?->classroom?->name,
            'dormitory_room_name' => $st?->dormitoryRoom?->name,
            'type' => $e->type,
            'start_at' => $e->start_at?->format('Y-m-d\TH:i:s'),
            'end_at' => $e->end_at?->format('Y-m-d\TH:i:s'),
            'reason' => $e->reason,
            'status' => $e->status,
            'notes' => $e->notes,
            'attachment_path' => $e->attachment_path,
            'approved_by' => $e->relationLoaded('approver') ? $e->approver?->name : null,
            'approved_at' => $e->approved_at?->format('Y-m-d H:i:s'),
            'created_by' => $e->created_by_name ?? '',
            'created_at' => $e->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $e->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    public static function staffRecord(StaffAttendanceRecord $r): array
    {
        $staff = $r->relationLoaded('staff') ? $r->staff : null;

        return [
            'id' => $r->id,
            'staff_id' => $r->staff_profile_id,
            'staff_name' => $staff?->name,
            'staff_number' => $staff?->staff_number,
            'staff_type' => $staff?->staff_type,
            'attendance_date' => $r->attendance_date?->format('Y-m-d'),
            'attendance_type' => $r->attendance_type,
            'context_type' => $r->attendance_type === 'daily' ? 'general' : null,
            'scheduled_start_at' => $r->scheduled_start_at?->toIso8601String(),
            'scheduled_end_at' => $r->scheduled_end_at?->toIso8601String(),
            'check_in_at' => $r->check_in_at?->toIso8601String(),
            'check_out_at' => $r->check_out_at?->toIso8601String(),
            'status' => $r->status,
            'check_in_method' => $r->check_in_method,
            'check_out_method' => $r->check_out_method,
            'late_minutes' => (int) $r->late_minutes,
            'early_leave_minutes' => (int) $r->early_leave_minutes,
            'attendance_device_id' => $r->attendance_device_id,
            'recorded_by' => $r->recorded_by_name,
            'notes' => $r->notes,
            'metadata' => $r->metadata,
            'created_at' => $r->created_at?->toIso8601String(),
            'updated_at' => $r->updated_at?->toIso8601String(),
        ];
    }

    public static function staffAbsence(StaffAbsenceRequest $a): array
    {
        $staff = $a->relationLoaded('staff') ? $a->staff : null;
        $decided = in_array($a->status, ['approved', 'rejected'], true);

        return [
            'id' => $a->id,
            'staff_id' => $a->staff_profile_id,
            'staff_name' => $staff?->name,
            'staff_number' => $staff?->staff_number,
            'type' => $a->type,
            'start_at' => $a->start_at?->format('Y-m-d\TH:i:s'),
            'end_at' => $a->end_at?->format('Y-m-d\TH:i:s'),
            'reason' => $a->reason,
            'attachment' => $a->attachment,
            'status' => $a->status,
            'requested_at' => $a->created_at?->toIso8601String(),
            'approved_by' => $a->status === 'approved' ? $a->decided_by_name : null,
            'approved_at' => $a->status === 'approved' ? $a->decided_at?->toIso8601String() : null,
            'rejected_by' => $a->status === 'rejected' ? $a->decided_by_name : null,
            'rejected_at' => $a->status === 'rejected' ? $a->decided_at?->toIso8601String() : null,
            'decision_notes' => $decided ? $a->decision_notes : null,
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ];
    }
}
