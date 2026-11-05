<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\ActivityCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    public function definition(): array
    {
        $name = $this->faker->words(3, true);
        return [
            'activity_category_id' => 1,
            'code' => strtoupper(Str::slug($name)),
            'name' => ucfirst($name),
            'description' => $this->faker->sentence(),
            'location' => 'Masjid Utama Pesantren',
            'attendance_enabled' => true,
            'allow_manual' => true,
            'allow_qr' => true,
            'allow_rfid' => true,
            'late_tolerance_minutes' => 15,
            'is_active' => true,
        ];
    }
}
