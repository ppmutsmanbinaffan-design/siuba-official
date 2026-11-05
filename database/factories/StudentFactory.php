<?php

namespace Database\Factories;

use App\Models\Classroom;
use App\Models\DormitoryRoom;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'student_number' => $this->faker->unique()->numerify('2026######'),
            'nisn' => $this->faker->unique()->numerify('0089######'),
            'name' => $this->faker->name(),
            'gender' => $this->faker->randomElement(['L', 'P']),
            'classroom_id' => Classroom::factory(),
            'dormitory_room_id' => null,
            'generation_year' => 2026,
            'qr_token' => 'STU-' . strtoupper(Str::random(8)),
            'rfid_uid' => strtoupper($this->faker->bothify('??##??##')),
            'is_active' => true,
        ];
    }
}
