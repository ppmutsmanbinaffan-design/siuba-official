<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('activities.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'activity_category_id' => ['required', 'exists:activity_categories,id'],
            'code' => ['required', 'string', 'max:50', 'unique:activities,code'],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'location' => ['nullable', 'string', 'max:150'],
            'allow_manual' => ['boolean'],
            'allow_qr' => ['boolean'],
            'allow_rfid' => ['boolean'],
            'late_tolerance_minutes' => ['required', 'integer', 'min:0', 'max:120'],
            'attendance_enabled' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }
}
