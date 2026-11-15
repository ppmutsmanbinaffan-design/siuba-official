<?php

return [
    // NexAbsen V4 / ESP32 RFID Gateway
    'nexabsen' => [
        'key' => env('NEXABSEN_GLOBAL_KEY'),
        'master_admin_uid' => env('NEXABSEN_MASTER_ADMIN_UID'),
        // Batas toleransi waktu tap offline yang dikirim perangkat (menit ke belakang)
        'max_offline_backdate_minutes' => (int) env('NEXABSEN_MAX_OFFLINE_MINUTES', 720),
        // Perangkat baru otomatis aktif? false = harus diaktifkan admin dulu (disarankan)
        'auto_register_device' => (bool) env('NEXABSEN_AUTO_REGISTER_DEVICE', false),
        // Buat sesi "Presensi Harian" otomatis jika hari ini belum ada sesi sama sekali
        'auto_daily_session' => (bool) env('NEXABSEN_AUTO_DAILY_SESSION', true),
        'default_device_name' => env('NEXABSEN_DEFAULT_DEVICE_NAME', 'Nexabsen RFID Terminal'),
        'default_device_location' => env('NEXABSEN_DEFAULT_DEVICE_LOCATION', 'Belum ditentukan'),
        // Perangkat dianggap offline jika tidak ada ping selama N detik
        'offline_threshold_seconds' => (int) env('NEXABSEN_OFFLINE_THRESHOLD_SECONDS', 60),
    ],

    // WhatsApp Gateway (Fonnte / Wablas) untuk notifikasi PSB
    'wa_gateway' => [
        'url' => env('WA_GATEWAY_URL'),
        'token' => env('WA_GATEWAY_TOKEN', env('FONNTE_TOKEN')),
    ],
];
