<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('students.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'student_number' => ['required', 'string', 'max:30', 'unique:students,student_number'],
            'nisn' => ['nullable', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'in:L,P'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'dormitory_room_id' => ['nullable', 'exists:dormitory_rooms,id'],
            'generation_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'rfid_uid' => ['nullable', 'string', 'unique:students,rfid_uid'],
            'is_active' => ['boolean'],
        ];
    }
}
