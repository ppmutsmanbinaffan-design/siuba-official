<?php

/*
| Pengaturan operasional SIUBA.
| Jadwal kerja SDM default (sama dengan bawaan aplikasi React sebelumnya).
| Format jam HH:MM, zona waktu mengikuti APP_TIMEZONE.
*/
$weekday = ['check_in_open_at' => '06:00', 'scheduled_start_at' => '07:00', 'late_after' => '07:15',
    'scheduled_end_at' => '16:00', 'check_out_close_at' => '21:00', 'working' => true];

return [
    'staff_schedule' => [
        'monday' => $weekday,
        'tuesday' => $weekday,
        'wednesday' => $weekday,
        'thursday' => $weekday,
        'friday' => array_merge($weekday, ['scheduled_end_at' => '12:00']),
        'saturday' => array_merge($weekday, ['scheduled_end_at' => '14:00']),
        'sunday' => array_merge($weekday, ['working' => false]),
    ],

    // Jeda minimal (menit) antara check-in dan check-out, agar tap ganda tidak langsung tercatat pulang
    'staff_min_minutes_before_checkout' => (int) env('SIUBA_STAFF_MIN_CHECKOUT_MINUTES', 30),
    // Tap SDM offline lebih lama dari ini ditolak saat dikirim (tahap 28)
    'staff_offline_max_days' => (int) env('SIUBA_STAFF_OFFLINE_MAX_DAYS', 7),
    // Port HTTPS LAN yang dipasang pasang-https-lan.bat (tahap 29)
    'https_port' => (int) env('SIUBA_HTTPS_PORT', 8443),

    /*
    | Izinkan reset database dari Maintenance Hub (tetap butuh Super Admin, kata sandi, frasa konfirmasi,
    | dan backup otomatis). Setelah aplikasi dipakai sungguhan, sebaiknya set SIUBA_ALLOW_DATABASE_RESET=false.
    */
    'allow_database_reset' => env('SIUBA_ALLOW_DATABASE_RESET', true),
];
