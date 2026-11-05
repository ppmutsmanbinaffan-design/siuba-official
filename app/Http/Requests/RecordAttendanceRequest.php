<?php

namespace App\Http\Requests;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class RecordAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('attendance.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'student_id' => ['required_without_all:qr_token,rfid_uid', 'exists:students,id'],
            'qr_token' => ['required_without_all:student_id,rfid_uid', 'string'],
            'rfid_uid' => ['required_without_all:student_id,qr_token', 'string'],
            'method' => ['required', new Enum(AttendanceMethod::class)],
            'status' => ['nullable', new Enum(AttendanceStatus::class)],
            'device_id' => ['nullable', 'exists:attendance_devices,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
