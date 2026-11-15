<?php

return [
    // NexAbsen V4 / ESP32 RFID Gateway
    'nexabsen' => [
        'key' => env('NEXABSEN_GLOBAL_KEY'),
        'master_admin_uid' => env('NEXABSEN_MASTER_ADMIN_UID'),
        // Batas toleransi waktu tap offline yang dikirim perangkat (menit ke belakang)
        'max_offline_backdate_minutes' => (int) env('NEXABSEN_MAX_OFFLINE_MINUTES', 720),
    ],

    // WhatsApp Gateway (Fonnte / Wablas) untuk notifikasi PSB
    'wa_gateway' => [
        'url' => env('WA_GATEWAY_URL'),
        'token' => env('WA_GATEWAY_TOKEN', env('FONNTE_TOKEN')),
    ],
];
