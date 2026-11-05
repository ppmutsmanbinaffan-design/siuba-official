<?php

namespace Database\Seeders;

use App\Models\ActivityCategory;
use Illuminate\Database\Seeder;

class ActivityCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'code' => 'IBADAH',
                'name' => 'Ibadah',
                'description' => 'Shalat fardhu berjamaah 5 waktu, qiyamul lail, shalat dhuha, dzikir pagi petang.',
                'icon' => 'moon-star',
                'sort_order' => 1,
            ],
            [
                'code' => 'AKADEMIK',
                'name' => 'Akademik',
                'description' => 'Kegiatan Belajar Mengajar (KBM) kelas formal di sekolah/madrasah.',
                'icon' => 'book-open',
                'sort_order' => 2,
            ],
            [
                'code' => 'TAHFIDZ',
                'name' => 'Tahfidz',
                'description' => 'Halaqah Al-Qur\'an, setoran ziyadah dan muraja\'ah hafalan santri.',
                'icon' => 'bookmark',
                'sort_order' => 3,
            ],
            [
                'code' => 'ASRAMA',
                'name' => 'Asrama',
                'description' => 'Absensi malam asrama, pembinaan kamar, dan ketertiban pondok.',
                'icon' => 'home',
                'sort_order' => 4,
            ],
            [
                'code' => 'EKSTRAKURIKULER',
                'name' => 'Ekstrakurikuler',
                'description' => 'Kegiatan minat bakat, pramuka, beladiri tapak suci, panahan, dsb.',
                'icon' => 'award',
                'sort_order' => 5,
            ],
            [
                'code' => 'APEL',
                'name' => 'Apel',
                'description' => 'Apel pagi santri, upacara bendera, pengarahan pimpinan pondok.',
                'icon' => 'flag',
                'sort_order' => 6,
            ],
            [
                'code' => 'OLAHRAGA',
                'name' => 'Olahraga',
                'description' => 'Senam pagi santri, lari pagi santri, dan kebugaran jasmani.',
                'icon' => 'activity',
                'sort_order' => 7,
            ],
            [
                'code' => 'KEBERSIHAN',
                'name' => 'Kebersihan',
                'description' => 'Kerja bakti mingguan, ro\'an, dan kebersihan asrama/lingkungan.',
                'icon' => 'sparkles',
                'sort_order' => 8,
            ],
            [
                'code' => 'KEGIATAN_KHUSUS',
                'name' => 'Kegiatan Khusus',
                'description' => 'Muhadharah (latihan pidato 3 bahasa), tabligh akbar, rihlah santri.',
                'icon' => 'star',
                'sort_order' => 9,
            ],
        ];

        foreach ($categories as $cat) {
            ActivityCategory::firstOrCreate(
                ['code' => $cat['code']],
                $cat
            );
        }
    }
}
