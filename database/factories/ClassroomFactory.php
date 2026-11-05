<?php

namespace Database\Factories;

use App\Models\Classroom;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClassroomFactory extends Factory
{
    protected $model = Classroom::class;

    public function definition(): array
    {
        return [
            'name' => 'Kelas ' . $this->faker->randomElement(['VII A', 'VII B', 'VIII A', 'VIII B', 'IX A']),
            'grade_level' => $this->faker->randomElement([7, 8, 9]),
            'academic_year' => '2026/2027',
            'homeroom_teacher_id' => null,
            'is_active' => true,
        ];
    }
}
