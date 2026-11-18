<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrayerTimeCalendar extends Model
{
    protected $fillable = ['date', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

    protected $casts = ['date' => 'date'];
}
