<?php

namespace App\Http\Requests;

use App\Enums\SessionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class CreateSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('attendance.sessions.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'activity_id' => ['required', 'exists:activities,id'],
            'activity_schedule_id' => ['nullable', 'exists:activity_schedules,id'],
            'session_date' => ['required', 'date'],
            'start_at' => ['required', 'date'],
            'present_until' => ['required', 'date', 'after_or_equal:start_at'],
            'late_until' => ['required', 'date', 'after_or_equal:present_until'],
            'end_at' => ['required', 'date', 'after_or_equal:late_until'],
            'status' => ['nullable', new Enum(SessionStatus::class)],
            'location' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
