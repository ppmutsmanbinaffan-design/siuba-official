<?php

namespace Database\Seeders;

use App\Enums\DeviceType;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\ActivitySchedule;
use App\Models\AttendanceDevice;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use Illuminate\Database\Seeder;

class DemoActivitySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Classrooms
        $classes = [
            ['name' => 'VII A', 'grade_level' => 7, 'academic_year' => '2026/2027'],
            ['name' => 'VII B', 'grade_level' => 7, 'academic_year' => '2026/2027'],
            ['name' => 'VIII A', 'grade_level' => 8, 'academic_year' => '2026/2027'],
            ['name' => 'VIII B', 'grade_level' => 8, 'academic_year' => '2026/2027'],
            ['name' => 'IX A', 'grade_level' => 9, 'academic_year' => '2026/2027'],
        ];

        $classModels = [];
        foreach ($classes as $c) {
            $classModels[$c['name']] = Classroom::firstOrCreate(['name' => $c['name']], $c);
        }

        // 2. Seed Dormitories & Rooms
        $dormPutra = Dormitory::firstOrCreate(
            ['name' => 'Asrama Putra Al-Fatih'],
            ['gender' => 'L', 'is_active' => true]
        );

        $dormPutri = Dormitory::firstOrCreate(
            ['name' => 'Asrama Putri Aisyah'],
            ['gender' => 'P', 'is_active' => true]
        );

        $rooms = [
            ['dormitory_id' => $dormPutra->id, 'name' => 'Kamar Abu Bakar 01', 'capacity' => 20],
            ['dormitory_id' => $dormPutra->id, 'name' => 'Kamar Umar Bin Khattab 02', 'capacity' => 20],
            ['dormitory_id' => $dormPutri->id, 'name' => 'Kamar Khadijah 01', 'capacity' => 20],
        ];

        $roomModels = [];
        foreach ($rooms as $r) {
            $roomModels[$r['name']] = DormitoryRoom::firstOrCreate(
                ['dormitory_id' => $r['dormitory_id'], 'name' => $r['name']],
                $r
            );
        }

        // 3. Seed Demo Students with unique QR token and RFID UID
        $demoStudents = [
            [
                'student_number' => '202607001',
                'nisn' => '0089123451',
                'name' => 'Ahmad Fauzan',
                'gender' => 'L',
                'classroom_id' => $classModels['VII A']->id,
                'dormitory_room_id' => $roomModels['Kamar Abu Bakar 01']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-X7AK29PQ',
                'rfid_uid' => '04A87F12',
                'is_active' => true,
            ],
            [
                'student_number' => '202607002',
                'nisn' => '0089123452',
                'name' => 'Muhammad Yusuf Al-Baqir',
                'gender' => 'L',
                'classroom_id' => $classModels['VII A']->id,
                'dormitory_room_id' => $roomModels['Kamar Abu Bakar 01']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-M9Y28VKL',
                'rfid_uid' => '04A87F13',
                'is_active' => true,
            ],
            [
                'student_number' => '202607003',
                'nisn' => '0089123453',
                'name' => 'Abdul Aziz Al-Ghazali',
                'gender' => 'L',
                'classroom_id' => $classModels['VII A']->id,
                'dormitory_room_id' => $roomModels['Kamar Umar Bin Khattab 02']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-K3N97WPZ',
                'rfid_uid' => '04A87F14',
                'is_active' => true,
            ],
            [
                'student_number' => '202607004',
                'nisn' => '0089123454',
                'name' => 'Hasan Al-Bashri',
                'gender' => 'L',
                'classroom_id' => $classModels['VII A']->id,
                'dormitory_room_id' => $roomModels['Kamar Umar Bin Khattab 02']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-H4P86TRX',
                'rfid_uid' => '04A87F15',
                'is_active' => true,
            ],
            [
                'student_number' => '202607005',
                'nisn' => '0089123455',
                'name' => 'Bilal Habasyi',
                'gender' => 'L',
                'classroom_id' => $classModels['VII B']->id,
                'dormitory_room_id' => $roomModels['Kamar Abu Bakar 01']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-B1L99XYZ',
                'rfid_uid' => '04A87F16',
                'is_active' => true,
            ],
            [
                'student_number' => '202607006',
                'nisn' => '0089123456',
                'name' => 'Fathimah Az-Zahra',
                'gender' => 'P',
                'classroom_id' => $classModels['VII B']->id,
                'dormitory_room_id' => $roomModels['Kamar Khadijah 01']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-F2A77PQR',
                'rfid_uid' => '04A87F17',
                'is_active' => true,
            ],
            [
                'student_number' => '202607099',
                'nisn' => '0089123499',
                'name' => 'Santri Non-Aktif (Cuti/Keluar)',
                'gender' => 'L',
                'classroom_id' => $classModels['VII A']->id,
                'dormitory_room_id' => $roomModels['Kamar Abu Bakar 01']->id,
                'generation_year' => 2026,
                'qr_token' => 'STU-OFFLINE99',
                'rfid_uid' => '04A87F99',
                'is_active' => false, // Inactive student for test validation
            ],
        ];

        foreach ($demoStudents as $stu) {
            Student::firstOrCreate(
                ['student_number' => $stu['student_number']],
                $stu
            );
        }

        // 4. Seed Attendance Devices
        $devices = [
            [
                'device_code' => 'MSJ-RFID-01',
                'device_name' => 'RFID Gate Masjid Utama (Pintu Barat)',
                'device_type' => DeviceType::RFID_READER,
                'location' => 'Masjid Utama Kampus 1',
                'ip_address' => '192.168.1.101',
                'is_active' => true,
            ],
            [
                'device_code' => 'MSJ-RFID-02',
                'device_name' => 'RFID Gate Masjid Utama (Pintu Timur)',
                'device_type' => DeviceType::RFID_READER,
                'location' => 'Masjid Utama Kampus 1',
                'ip_address' => '192.168.1.102',
                'is_active' => true,
            ],
            [
                'device_code' => 'KBM-QR-01',
                'device_name' => 'Kios Pemindai QR Gedung Kelas',
                'device_type' => DeviceType::QR_SCANNER,
                'location' => 'Lobby Gedung Al-Biruni',
                'ip_address' => '192.168.1.105',
                'is_active' => true,
            ],
        ];

        foreach ($devices as $dev) {
            AttendanceDevice::firstOrCreate(['device_code' => $dev['device_code']], $dev);
        }

        // 5. Seed Demo Activities & Schedules
        $ibadahCat = ActivityCategory::where('code', 'IBADAH')->first();
        $akademikCat = ActivityCategory::where('code', 'AKADEMIK')->first();
        $tahfidzCat = ActivityCategory::where('code', 'TAHFIDZ')->first();
        $apelCat = ActivityCategory::where('code', 'APEL')->first();
        $khususCat = ActivityCategory::where('code', 'KEGIATAN_KHUSUS')->first();

        $activities = [
            [
                'category_id' => $ibadahCat?->id,
                'code' => 'SHALAT-SUBUH',
                'name' => 'Shalat Subuh Berjamaah',
                'description' => 'Shalat Subuh berjamaah di masjid utama pondok.',
                'location' => 'Masjid Utama',
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => true,
                'late_tolerance_minutes' => 15,
                'schedule' => [
                    'start_time' => '04:15:00',
                    'present_until' => '04:30:00',
                    'late_until' => '04:45:00',
                    'end_time' => '05:00:00',
                ],
            ],
            [
                'category_id' => $ibadahCat?->id,
                'code' => 'SHALAT-DZUHUR',
                'name' => 'Shalat Dzuhur Berjamaah',
                'description' => 'Shalat Dzuhur berjamaah di masjid pondok.',
                'location' => 'Masjid Utama',
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => true,
                'late_tolerance_minutes' => 15,
                'schedule' => [
                    'start_time' => '12:00:00',
                    'present_until' => '12:15:00',
                    'late_until' => '12:30:00',
                    'end_time' => '12:45:00',
                ],
            ],
            [
                'category_id' => $akademikCat?->id,
                'code' => 'KBM-PAGI',
                'name' => 'KBM (Kegiatan Belajar Mengajar)',
                'description' => 'Pembelajaran formal kelas pagi. (Manual dan QR diizinkan, RFID dinonaktifkan)',
                'location' => 'Gedung Kelas Al-Farabi',
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => false, // RFID disabled for invalid method testing
                'late_tolerance_minutes' => 10,
                'schedule' => [
                    'start_time' => '07:30:00',
                    'present_until' => '07:45:00',
                    'late_until' => '08:00:00',
                    'end_time' => '11:45:00',
                ],
            ],
            [
                'category_id' => $tahfidzCat?->id,
                'code' => 'TAHFIDZ-SORE',
                'name' => 'Tahfidz Al-Qur\'an (Halaqah Sore)',
                'description' => 'Setoran hafalan dan muraja\'ah bersama musyrif.',
                'location' => 'Masjid & Aula Tahfidz',
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => true,
                'late_tolerance_minutes' => 15,
                'schedule' => [
                    'start_time' => '16:00:00',
                    'present_until' => '16:15:00',
                    'late_until' => '16:30:00',
                    'end_time' => '17:30:00',
                ],
            ],
            [
                'category_id' => $apelCat?->id,
                'code' => 'APEL-PAGI',
                'name' => 'Apel Pagi & Disiplin Santri',
                'description' => 'Pemeriksaan kerapian dan pengarahan komando santri.',
                'location' => 'Lapangan Utama Pesantren',
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => true,
                'late_tolerance_minutes' => 5,
                'schedule' => [
                    'start_time' => '06:45:00',
                    'present_until' => '07:00:00',
                    'late_until' => '07:10:00',
                    'end_time' => '07:25:00',
                ],
            ],
            [
                'category_id' => $khususCat?->id,
                'code' => 'MUHADHARAH',
                'name' => 'Muhadharah (Pidato 3 Bahasa)',
                'description' => 'Latihan public speaking bahasa Arab, Inggris, dan Indonesia.',
                'location' => 'Auditorium Utsman Bin Affan',
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => false,
                'late_tolerance_minutes' => 15,
                'schedule' => [
                    'start_time' => '20:00:00',
                    'present_until' => '20:15:00',
                    'late_until' => '20:30:00',
                    'end_time' => '21:30:00',
                ],
            ],
        ];

        foreach ($activities as $actData) {
            $schedData = $actData['schedule'];
            unset($actData['schedule']);

            $activity = Activity::firstOrCreate(
                ['code' => $actData['code']],
                [
                    'activity_category_id' => $actData['category_id'],
                    'code' => $actData['code'],
                    'name' => $actData['name'],
                    'description' => $actData['description'],
                    'location' => $actData['location'],
                    'allow_manual' => $actData['allow_manual'],
                    'allow_qr' => $actData['allow_qr'],
                    'allow_rfid' => $actData['allow_rfid'],
                    'late_tolerance_minutes' => $actData['late_tolerance_minutes'],
                    'attendance_enabled' => true,
                    'is_active' => true,
                ]
            );

            // Create schedule for all days (1 to 6)
            for ($day = 1; $day <= 6; $day++) {
                ActivitySchedule::firstOrCreate(
                    [
                        'activity_id' => $activity->id,
                        'day_of_week' => $day,
                    ],
                    [
                        'start_time' => $schedData['start_time'],
                        'present_until' => $schedData['present_until'],
                        'late_until' => $schedData['late_until'],
                        'end_time' => $schedData['end_time'],
                        'auto_generate_session' => true,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
