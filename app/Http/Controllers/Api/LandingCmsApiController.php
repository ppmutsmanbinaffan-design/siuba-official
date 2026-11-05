<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LandingCmsApiController extends Controller
{
    public static function defaultProfile(): array
    {
        return [
            'pesantren_name' => 'Pondok Pesantren Modern Utsman Bin Affan',
            'hero_badge' => 'Pondok Pesantren Modern Utsman Bin Affan',
            'hero_title' => 'MEMBANGUN GENERASI RABBANI, HAFIDZ QUR’AN & UNGGUL DALAM SAINS TEKNOLOGI',
            'hero_subtitle' => 'Memadukan kurikulum Tahfidzul Qur’an bersanad, penguasaan Bahasa Arab & Inggris, serta ekosistem manajemen pesantren digital terpadu (SIUBA Smart Card RFID & QR).',
            'founded_year' => 'Sejak 2012',
            'profile_description' => 'Lembaga pendidikan Islam terpadu yang menyeimbangkan kafa’ah syar’iyyah, hafalan Al-Qur’an, dan keunggulan akademik modern.',
            'profile_image' => 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
            'pillars' => [
                ['icon' => 'menu_book', 'label' => 'Tahfidzul Qur’an'],
                ['icon' => 'translate', 'label' => 'Dwi Bahasa Aktif'],
                ['icon' => 'psychology', 'label' => 'Adab & Kepemimpinan'],
                ['icon' => 'memory', 'label' => 'Sains & Teknologi IT'],
            ],
            'vision' => 'Menjadi Lembaga Pendidikan Islam Terbaik dalam Mencetak Generasi Penghafal Al-Qur’an yang Berakhlak Mulia, Cerdas, Mandiri, dan Berwawasan Global.',
            'motto' => 'Beriman • Berilmu • Beramal • Berprestasi',
            'missions' => [
                'Menyelenggarakan pendidikan Tahfidzul Qur’an yang mutqin dan berakhlak Qur’ani sesuai pemahaman Ahlussunnah wal Jama’ah.',
                'Mengembangkan kompetensi akademik, sains, dan penguasaan Bahasa Arab & Inggris secara aktif.',
                'Membina kemandirian, jiwa kepemimpinan (leadership), dan kepedulian sosial santri melalui pembiasaan asrama 24 jam.',
                'Menerapkan tata kelola pesantren modern yang transparan dan akuntabel berbasis teknologi SIUBA Digital.',
            ],
            'mudir_name' => 'KH. Abdullah Gymnastiar, Lc. — Pimpinan Pondok',
            'mudir_title' => 'Pimpinan Pondok',
            'mudir_role' => 'Pengasuh & Ketua Dewan Masyayikh Pondok Pesantren Modern Utsman Bin Affan',
            'mudir_photo' => 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
            'mudir_quote' => 'Kami berkomitmen menjaga amanah orang tua dengan mendidik santri sepenuh hati serta pelaporan kehadiran real-time.',
            'mudir_body_1' => 'Segala puji bagi Allah Subhanahu wa Ta’ala. Pondok Pesantren Utsman Bin Affan hadir sebagai rumah peradaban bagi generasi muda Islam untuk menghafal dan mentadabburi Al-Qur’an, memperdalam ilmu syar’i bersanad, sekaligus menguasai sains dan teknologi modern.',
            'mudir_body_2' => 'Kami menyadari bahwa menitipkan putra-putri di pesantren adalah amanah besar. Oleh karena itu, seluruh proses pembinaan di masjid, kelas, hingga kamar asrama dijalankan dengan pendampingan ustadz dan musyrif secara terukur 24 jam serta terintegrasi melalui sistem presensi pintar SIUBA Digital.',
            'stat_students' => '850+ Santri',
            'stat_teachers' => '95+ Ustadz/ah',
            'stat_graduation' => '96.8%',
            'stat_kelulusan_desc' => 'Alumni diterima di PTN Favorit, Timur Tengah (Al-Azhar, Madinah, LIPIA) & Perguruan Tinggi Islam.',
            'stat_jenjang' => 'SMP IT & SMA IT',
            'stat_asrama' => 'Putra & Putri',
            'sejarah_title' => 'Perjalanan Membangun Peradaban Qur’ani Sejak 2012',
            'sejarah_text' => 'Didirikan pada tahun 2012 oleh para ulama, akademisi, dan tokoh masyarakat, Pondok Pesantren Utsman Bin Affan bermula dari halaqah tahfidz sederhana dengan 35 santri mukim. Kini telah berkembang menjadi lembaga pendidikan Islam modern berasrama (SMP IT, SMA IT & Takhassus) yang memadukan tradisi keilmuan Islam bersanad dengan inovasi teknologi digital SIUBA.',
            'advantages' => [
                [
                    'icon' => 'verified',
                    'title' => '1. Sanad Tahfidz & Pembinaan Mutqin',
                    'desc' => 'Dibimbing langsung oleh para Hafidz/ah bersanad dengan target 15–30 Juz yang teruji kelancarannya.',
                ],
                [
                    'icon' => 'qr_code_scanner',
                    'title' => '2. Sistem Digital Presensi SIUBA',
                    'desc' => 'Kehadiran shalat berjamaah, KBM kelas, kamar asrama, dan izin santri terpantau akurat dengan Smart Card RFID/QR.',
                ],
                [
                    'icon' => 'translate',
                    'title' => '3. Lingkungan Bilingual (Arab & Inggris)',
                    'desc' => 'Pembiasaan percakapan harian Bahasa Arab dan Inggris untuk membekali santri melanjutkan studi ke Timur Tengah & PTN.',
                ],
                [
                    'icon' => 'shield_with_heart',
                    'title' => '4. Asrama Ramah Anak & Bebas Bullying',
                    'desc' => 'Pendampingan musyrif/ah di setiap kamar dengan pendekatan kasih sayang, adab Islami, dan disiplin positif.',
                ],
            ],
            'programs_desc' => 'Dirancang secara komprehensif mencakup Kurikulum Terpadu, Tahfidz Al-Qur’an, Bahasa Arab & Inggris, Pembinaan Akhlak & Kepemimpinan, serta Life Skill Islami.',
            'programs' => [
                [
                    'icon' => 'school',
                    'code' => 'PROGRAM 01',
                    'title' => 'Kurikulum Terpadu',
                    'desc' => 'Integrasi Kurikulum Nasional (Kemendikbud/Kemenag) dengan Kurikulum Diniyah Kepesantrenan (Aqidah, Fiqih, Hadits, Tafsir & Sirah).',
                    'badge' => 'SMP IT & SMA IT Resmi',
                ],
                [
                    'icon' => 'menu_book',
                    'code' => 'PROGRAM 02',
                    'title' => 'Tahfidz Al-Qur’an',
                    'desc' => 'Tahsin metode Talaqqi bersanad, setoran Ziyadah & Muraja’ah harian pagi-petang, serta Ujian Tasmi’ sekali duduk.',
                    'badge' => 'Target 15 – 30 Juz Mutqin',
                ],
                [
                    'icon' => 'translate',
                    'code' => 'PROGRAM 03',
                    'title' => 'Bahasa Arab & Inggris',
                    'desc' => 'Pembiasaan komunikasi harian dwibahasa, pemberian mufradat/vocabulary pagi, Nahwu-Sharaf, TOEFL/TOAFL & Muhadatsah.',
                    'badge' => 'Bilingual Active Area',
                ],
                [
                    'icon' => 'psychology',
                    'code' => 'PROGRAM 04',
                    'title' => 'Pembinaan Akhlak & Kepemimpinan',
                    'desc' => 'Penanaman adab penuntut ilmu, Khitobah/Public Speaking 3 bahasa, manajemen organisasi santri (OSIS/OPPM), & bakti sosial.',
                    'badge' => 'Character & Leadership',
                ],
                [
                    'icon' => 'auto_awesome',
                    'code' => 'PROGRAM 05',
                    'title' => 'Life Skill Islami',
                    'desc' => 'Kemandirian hidup berasrama, olahraga sunnah (Panahan & Bela Diri), Literasi Digital/Coding, Jurnalistik & Kewirausahaan Santri.',
                    'badge' => 'Mandiri & Produktif',
                ],
            ],
            'facilities_desc' => 'Lingkungan belajar dan mukim yang representatif, bersih, aman, serta dilengkapi integrasi reader kartu pintar RFID SIUBA di setiap titik kegiatan.',
            'facilities' => [
                [
                    'badge' => '01. Asrama Santri',
                    'title' => 'Asrama Putra & Putri Terpisah',
                    'desc' => 'Kamar nyaman berventilasi sehat/AC, ranjang & loker pribadi, kamar mandi bersih, layanan laundry, serta pendampingan Musyrif/ah di setiap gedung.',
                    'image' => 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'badge' => '02. Masjid Jami’',
                    'title' => 'Masjid Jami’ Pusat Ibadah & Halaqah',
                    'desc' => 'Jantung aktivitas shalat berjamaah 5 waktu, halaqah Tahfidzul Qur’an, kajian kitab kuning, dan terminal tap RFID kehadiran shalat santri.',
                    'image' => 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'badge' => '03. Laboratorium',
                    'title' => 'Laboratorium Sains (MIPA) & Komputer IT',
                    'desc' => 'Dilengkapi peralatan praktikum Fisika, Kimia, Biologi, serta Laboratorium Komputer & Coding dengan jaringan terfilter aman.',
                    'image' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'badge' => '04. Perpustakaan',
                    'title' => 'Perpustakaan Kitab Turats & Digital',
                    'desc' => 'Ribuan koleksi kitab rujukan Islam (Tafsir, Hadits, Fiqih), ensiklopedia sains, buku olimpiade, dan ruang baca ber-AC yang tenang.',
                    'image' => 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'badge' => '05. Lapangan Olahraga',
                    'title' => 'Sarana Olahraga & Arena Panahan',
                    'desc' => 'Lapangan Futsal, Basket, Voli, Badminton, Tenis Meja, serta area khusus latihan Panahan (Archery) dan Bela Diri Santri.',
                    'image' => 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'badge' => '06. Ruang Praktik',
                    'title' => 'Ruang Praktik Bahasa, Multimedia & Keterampilan',
                    'desc' => 'Studio podcast & jurnalistik santri, ruang praktik ibadah/dakwah, ruang keterampilan tata boga/kewirausahaan, dan aula serbaguna.',
                    'image' => 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            'gallery_video' => [
                'badge' => 'VIDEO PROFIL RESMI',
                'duration' => 'YouTube HD • 04:15 Menit',
                'title' => 'Profil Pondok Pesantren Modern Utsman Bin Affan',
                'desc' => 'Menyaksikan lebih dekat suasana halaqah tahfidz, pembelajaran sains modern, dan kehidupan berasrama 24 jam.',
                'image' => 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
                'video_url' => 'https://www.youtube.com/watch?v=9No-FiEInLA',
            ],
            'gallery_items' => [
                [
                    'category' => 'kegiatan',
                    'badge' => 'Foto Kegiatan',
                    'title' => 'Haflah & Wisuda Akbar Tahfidz 30 Juz',
                    'desc' => 'Ujian terbuka tasmi’ Al-Qur’an di hadapan masyayikh & wali santri.',
                    'image' => 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'category' => 'aktivitas',
                    'badge' => 'Aktivitas Santri',
                    'title' => 'Halaqah Pagi & KBM Interaktif',
                    'desc' => 'Setoran hafalan harian ba’da Subuh dan diskusi sains di kelas.',
                    'image' => 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'category' => 'lingkungan',
                    'badge' => 'Lingkungan Pesantren',
                    'title' => 'Kawasan Kampus Hijau, Asri & Kondusif',
                    'desc' => 'Taman belajar terbuka dan area hijau yang mendukung ketenangan menghafal.',
                    'image' => 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'category' => 'aktivitas',
                    'badge' => 'Aktivitas Santri',
                    'title' => 'Latihan Panahan, Robotik & Khitobah',
                    'desc' => 'Pengembangan bakat kepemimpinan, olahraga sunnah, dan literasi teknologi.',
                    'image' => 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
                ],
                [
                    'category' => 'kegiatan',
                    'badge' => 'Foto Kegiatan',
                    'title' => 'Kompetisi Sains, Bahasa & Mukhayyam Qur’an',
                    'desc' => 'Semangat berprestasi santri dalam ajang nasional maupun kegiatan pondok.',
                    'image' => 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            'faqs' => [
                [
                    'question' => '1. Apakah calon santri yang belum lancar membaca Al-Qur’an bisa mendaftar?',
                    'answer' => 'Bisa. Pada semester awal, santri baru akan mengikuti program matrikulasi Tahsin Al-Qur’an Intensif (Metode Talaqqi) untuk memperbaiki makharijul huruf dan tajwid sebelum masuk ke target setoran Tahfidz.',
                ],
                [
                    'question' => '2. Apa saja syarat pendaftaran dan bagaimana alur tes seleksinya?',
                    'answer' => 'Calon santri mengisi formulir online, menyiapkan Akta Kelahiran, KK, Rapor 2 semester terakhir, dan Pas Foto. Tes seleksi dilaksanakan sistem One Day Service setiap hari Sabtu meliputi Tes Al-Qur’an, Akademik Dasar, Psikotes Asrama, dan Wawancara Wali.',
                ],
                [
                    'question' => '3. Apakah Biaya Bulanan (SPP) sudah mencakup makan dan laundry?',
                    'answer' => 'Ya, biaya Syahriyah/SPP bulanan bersifat All-In (mencakup makan 3 kali sehari bergizi, asrama, layanan laundry pakaian, pemeriksaan kesehatan ringan di Poskestren, serta pendidikan sekolah & tahfidz).',
                ],
                [
                    'question' => '4. Kapan jadwal kunjungan orang tua/wali santri dan bagaimana aturan membawa HP?',
                    'answer' => 'Santri tidak diperkenankan membawa HP pribadi di asrama agar fokus menghafal dan belajar. Komunikasi dengan orang tua difasilitasi melalui telepon asrama terjadwal bersama Musyrif/ah, serta jadwal penjengukan (kunjungan wali) setiap pekan ke-2 dan ke-4 hari Ahad.',
                ],
                [
                    'question' => '5. Bagaimana cara santri melakukan absensi harian dan jika santri sakit/izin?',
                    'answer' => 'Setiap santri memiliki Kartu Pintar Santri (CR80 RFID & QR) untuk tap kehadiran di masjid, kelas, dan kamar asrama. Jika santri sakit atau izin pulang, Musyrif/Kesantrian mencatatnya resmi di modul Izin & Dispensasi SIUBA sehingga terpantau real-time oleh pimpinan dan wali kelas.',
                ],
            ],
            'contact_phone' => '(021) 890-1234 / 0812-3456-7890',
            'contact_email' => 'info@utsman.sch.id • admin@utsman.sch.id',
            'contact_address' => 'Pondok Pesantren Utsman Bin Affan — Indonesia',
            'hero_slides' => [
                [
                    'bg_image' => 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1920&q=80',
                    'card_image' => 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
                    'card_badge' => 'Akreditasi A • Boarding School',
                    'card_caption' => 'Lingkungan pendidikan berasrama yang asri, kondusif, dan terpantau secara digital 24 jam.',
                ],
                [
                    'bg_image' => 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1920&q=80',
                    'card_image' => 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
                    'card_badge' => 'Tahfidz 15–30 Juz Bersanad',
                    'card_caption' => 'Setoran Ziyadah & Muraja’ah harian ba’da Subuh dan Maghrib dibimbing Hafidz/ah bersanad.',
                ],
                [
                    'bg_image' => 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=80',
                    'card_image' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
                    'card_badge' => 'Sains, IT & Bilingual Area',
                    'card_caption' => 'Integrasi kurikulum nasional, laboratorium sains & komputer modern, serta Bahasa Arab & Inggris aktif.',
                ],
                [
                    'bg_image' => 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1920&q=80',
                    'card_image' => 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
                    'card_badge' => 'SIUBA Smart Card RFID & QR',
                    'card_caption' => 'Presensi shalat berjamaah, kelas, asrama, dan perizinan santri tercatat real-time di sistem SIUBA.',
                ],
            ],
        ];
    }

    public static function defaultPpdb(): array
    {
        return [
            'academic_year' => '2026 / 2027',
            'status_badge' => 'GELOMBANG 1 BUKA',
            'total_quota' => '240 Kursi',
            'quota_description' => 'Terdiri dari 120 kursi jenjang SMP IT (60 Putra & 60 Putri) dan 120 kursi jenjang SMA IT / Takhassus (60 Putra & 60 Putri).',
            'wave_1' => '01 Okt – 31 Des 2026',
            'wave_1_test' => 'Setiap Sabtu (One Day Service)',
            'wave_1_announce' => '3 Hari Setelah Tes',
            'wave_1_rereg' => 'Maks. 14 Hari Setelah Lulus',
            'wave_2' => '01 Jan – 31 Mar 2027',
            'wave_2_test' => 'Setiap Sabtu (Jan – Mar 2027)',
            'wave_2_announce' => '3 Hari Setelah Tes',
            'wave_2_rereg' => '01 – 15 April 2027',
            // Gelombang Pendaftaran Dinamis
            'wave_items' => [
                [
                    'name' => 'Gelombang I — Prestasi, Beasiswa & Reguler',
                    'status' => 'Buka',
                    'open_date' => '01 Oktober 2026',
                    'close_date' => '31 Desember 2026',
                    'date_range' => '01 Okt – 31 Des 2026',
                    'exam_date' => 'Setiap Sabtu (Pukul 08.00 – 14.00 WIB)',
                    'announce_date' => '3 Hari Setelah Tes',
                    'rereg_date' => 'Maks. 14 Hari Setelah Lulus',
                    'note' => 'One Day Service: Tes Al-Qur\'an, Akademik & Wawancara langsung dalam 1 hari.',
                ],
                [
                    'name' => 'Gelombang II — Reguler (Jika Kuota Tersedia)',
                    'status' => 'Segera Dibuka',
                    'open_date' => '01 Januari 2027',
                    'close_date' => '31 Maret 2027',
                    'date_range' => '01 Jan – 31 Mar 2027',
                    'exam_date' => 'Setiap Sabtu (Jan – Mar 2027)',
                    'announce_date' => '3 Hari Setelah Tes',
                    'rereg_date' => '01 – 15 April 2027',
                    'note' => 'Dibuka jika kuota Gelombang I belum terpenuhi.',
                ],
            ],
            'boarding_entry_date' => '12 Juli 2027 (Khutbatul Arsy & MATSABA)',
            'test_schedule' => 'Setiap Sabtu (Pukul 08.00 – 14.00 WIB)',
            'scholarship_note' => 'Tersedia jalur Beasiswa Tahfidz (Hafal min. 5–30 Juz), Juara Olimpiade Sains, & Yatim Berprestasi.',
            'smp_badge' => 'Lulusan SD / MI',
            'smp_title' => 'JENJANG SMP IT (BOARDING)',
            'smp_desc' => 'Fondasi Tahsin bersanad, Target Tahfidz 10–15 Juz, Bahasa Arab & Inggris Aktif, serta Kurikulum Nasional Kemenag/Kemendikbud.',
            'smp_duration' => '3 Tahun',
            'smp_quota' => '120 Santri (60 Pa / 60 Pi)',
            'smp_boarding' => 'Terpisah Pa/Pi',
            'smp_image' => 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
            'sma_badge' => 'Lulusan SMP / MTs',
            'sma_title' => 'JENJANG SMA IT & TAKHASSUS',
            'sma_desc' => 'Tahfidz 30 Juz Mutqin Bersanad, Kajian Kitab Turats, Olimpiade MIPA/Sains & Persiapan Masuk PTN / Universitas Timur Tengah.',
            'sma_duration' => '3 Tahun',
            'sma_quota' => '120 Santri (60 Pa / 60 Pi)',
            'sma_program' => 'MIPA & Syariah',
            'sma_image' => 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
            // Rincian Biaya Pendidikan
            'fee_registration' => 'Rp 350.000',
            'fee_dsp' => 'Rp 14.500.000',
            'fee_spp' => 'Rp 1.650.000 / bulan',
            'fee_uniform_books' => 'Rp 3.200.000',
            'fee_includes' => 'Makan 3x sehari bergizi, Asrama ber-AC/nyaman, Laundry pakaian, Layanan Poskestren, SPP Sekolah & Halaqah Tahfidz, serta Kartu Pintar RFID SIUBA.',
            // Rincian Komponen Biaya Fleksibel (Dapat ditambah/disesuaikan)
            'fee_items' => [
                [
                    'name' => 'Biaya Formulir & Seleksi',
                    'amount' => 'Rp 350.000',
                    'badge' => 'Sekali Saat Pendaftaran',
                    'desc' => 'Sudah termasuk biaya Tes Seleksi Al-Qur\'an, Akademik, & Psikotes Kesiapan Asrama.',
                ],
                [
                    'name' => 'Dana Pengembangan / Wakaf Asrama (DSP)',
                    'amount' => 'Rp 14.500.000',
                    'badge' => 'Tersedia Beasiswa 25%–100%',
                    'desc' => 'Dana Pengembangan Sarana Asrama & Pendidikan (dibayarkan saat daftar ulang setelah lulus).',
                ],
                [
                    'name' => 'Syahriyah / SPP Bulanan (All-In)',
                    'amount' => 'Rp 1.650.000 / bulan',
                    'badge' => 'Sudah Termasuk Makan & Laundry',
                    'desc' => 'Makan 3x sehari bergizi, Asrama ber-AC/nyaman, Laundry pakaian, Layanan Poskestren, SPP Sekolah & Halaqah Tahfidz, serta Kartu Pintar RFID SIUBA.',
                ],
                [
                    'name' => 'Paket Seragam (5 Stel), Kitab & Kasur',
                    'amount' => 'Rp 3.200.000',
                    'badge' => 'Perlengkapan Awal Santri',
                    'desc' => '5 Stel Seragam, Paket Kitab Diniyah Tahun I, Kasur/Bantal/Sprei, Lemari Asrama, & Kartu RFID SIUBA.',
                ],
            ],
            // Beasiswa
            'scholarship_tahfidz' => 'Hafal 5–10 Juz: Potongan DSP 25% • Hafal 15 Juz: Potongan DSP 50% • Hafal 30 Juz Mutqin: Bebas DSP 100% + Beasiswa SPP.',
            'scholarship_academic' => 'Juara 1–3 OSN/KSM/MTQ Tingkat Provinsi/Nasional: Potongan Dana Pengembangan 50% s.d. 100%.',
            'scholarship_orphan' => 'Kuota khusus 15 kursi Beasiswa Penuh bagi santri Yatim/Dhuafa yang lulus seleksi Tahfidz & Akademik.',
            // Jenis & Ketentuan Beasiswa Fleksibel (Dapat ditambah/disesuaikan)
            'scholarship_items' => [
                [
                    'title' => 'Beasiswa Tahfidz Al-Qur\'an',
                    'badge' => 'Jalur Tahfidz',
                    'desc' => 'Hafal 5–10 Juz: Potongan DSP 25% • Hafal 15 Juz: Potongan DSP 50% • Hafal 30 Juz Mutqin: Bebas DSP 100% + Beasiswa SPP Bulanan.',
                ],
                [
                    'title' => 'Beasiswa Prestasi Akademik & Sains',
                    'badge' => 'Jalur Prestasi',
                    'desc' => 'Juara 1–3 OSN/KSM/MTQ Tingkat Provinsi/Nasional: Potongan Dana Pengembangan 50% s.d. 100%.',
                ],
                [
                    'title' => 'Beasiswa Yatim & Dhuafa Berprestasi',
                    'badge' => 'Jalur Sosial & Afirmasi',
                    'desc' => 'Kuota khusus 15 kursi Beasiswa Penuh bagi santri Yatim/Dhuafa yang lulus seleksi Tahfidz & Akademik.',
                ],
            ],
            // Syarat & Materi Tes
            'requirements_list' => "1. Mengisi formulir pendaftaran PSB Online atau Offline di Sekretariat.\n2. Fotokopi Akta Kelahiran & Kartu Keluarga (masing-masing 2 lembar).\n3. Fotokopi Rapor 2 semester terakhir yang telah dilegalisir.\n4. Surat Keterangan Aktif Sekolah & Nomor Induk Siswa Nasional (NISN).\n5. Pas Foto berwarna ukuran 3x4 (4 lembar, putri berjilbab putih/gelap).\n6. Surat Keterangan Sehat dari Dokter/Puskesmas & bebas penyakit menular.",
            'selection_materials' => "1. Tes Membaca & Menghafal Al-Qur'an (Tajwid, kelancaran bacaan, dan tes kecepatan menghafal 1 halaman baru).\n2. Tes Akademik Dasar (Matematika, IPA, Bahasa Indonesia, dan Pengetahuan Agama Islam Dasar).\n3. Tes Psikotes Kesiapan Berasrama & Kemandirian Calon Santri.\n4. Wawancara Komitmen Orang Tua / Wali Santri bersama Dewan Masyayikh.",
            // Kontak & Rekening Resmi
            'whatsapp_contact' => '0812-3456-7890',
            'admin_contact_name' => 'Ustadz H. Ahmad Fauzi, S.Pd.I (Ketua Panitia PSB)',
            'bank_account' => 'Bank Syariah Indonesia (BSI) — No. Rek: 7123-456-789 a.n. Yayasan Ponpes Utsman Bin Affan',
            'secretariat_hours' => 'Senin – Sabtu, Pukul 08.00 – 16.00 WIB (Gedung Pusat Lt. 1)',
        ];
    }

    public static function seedDefaultNewsIfEmpty(): void
    {
        if (DB::table('landing_news')->count() === 0) {
            $now = now();
            DB::table('landing_news')->insert([
                [
                    'title' => 'Wisuda Akbar Tahfidzul Qur’an: 48 Santri Tuntaskan Setoran 30 Juz Sekali Duduk',
                    'category' => 'Tahfidz Al-Qur’an',
                    'published_date' => '25 Oktober 2026',
                    'excerpt' => 'Alhamdulillah, sebanyak 48 santri putra dan putri jenjang SMP IT dan SMA IT berhasil menyelesaikan ujian tasmi’ hafalan 30 juz Al-Qur’an tahun ini.',
                    'image_url' => 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
                    'is_published' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'title' => 'Implementasi Penuh SIUBA v1.2: Presensi RFID & QR Terintegrasi di Masjid, Kelas & Asrama',
                    'category' => 'Inovasi Digital',
                    'published_date' => '18 Oktober 2026',
                    'excerpt' => 'Pesantren Utsman Bin Affan resmi mengoperasikan sistem presensi pintar real-time untuk memantau kehadiran santri dan ustadz secara akurat.',
                    'image_url' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
                    'is_published' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'title' => 'Delegasi Santri Utsman Bin Affan Raih Medali Emas Olimpiade Sains & Bahasa Arab Nasional',
                    'category' => 'Prestasi Akademik',
                    'published_date' => '10 Oktober 2026',
                    'excerpt' => 'Tim olimpiade pesantren kembali mengharumkan nama lembaga dengan memborong 3 medali emas cabang Matematika, Fisika, dan Debat Bahasa Arab.',
                    'image_url' => 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
                    'is_published' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    public static function seedDefaultPpdbRegistrationsIfEmpty(): void
    {
        if (DB::table('ppdb_registrations')->count() === 0) {
            $now = now();
            DB::table('ppdb_registrations')->insert([
                [
                    'reg_number' => 'PPDB-2026-0001',
                    'student_name' => 'Muhammad Fatih Al-Ayyubi',
                    'nisn' => '0124589301',
                    'gender' => 'Putra',
                    'birth_info' => 'Jakarta, 14 Mei 2014',
                    'level' => 'SMP IT',
                    'track' => 'Beasiswa Tahfidz',
                    'juz_memorized' => '8 Juz',
                    'parent_name' => 'H. Ridwan Kamilullah',
                    'whatsapp' => '081288990011',
                    'origin_school' => 'SDIT Al-Hikmah Jakarta Selatan',
                    'address' => 'Jl. Kebagusan Raya No. 45, Pasar Minggu, Jakarta Selatan',
                    'status' => 'Diterima',
                    'test_score_quran' => '95 (Jayyid Jiddan)',
                    'test_score_academic' => '88',
                    'notes' => 'Bacaan sangat tartil, hafalan 8 juz mutqin. Direkomendasikan beasiswa potongan DSP 25%.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'reg_number' => 'PPDB-2026-0002',
                    'student_name' => 'Aisyah Humaira Zahra',
                    'nisn' => '0098341209',
                    'gender' => 'Putri',
                    'birth_info' => 'Bandung, 22 Agustus 2011',
                    'level' => 'SMA IT',
                    'track' => 'Prestasi Akademik',
                    'juz_memorized' => '5 Juz',
                    'parent_name' => 'Dr. Irfan Hakim, M.T.',
                    'whatsapp' => '081322334455',
                    'origin_school' => 'SMPIT Nurul Fikri Depok',
                    'address' => 'Perum Griya Asri Blok C2 No. 10, Cimanggis, Depok',
                    'status' => 'Tes Seleksi',
                    'test_score_quran' => '89',
                    'test_score_academic' => '94',
                    'notes' => 'Juara 1 OSN Matematika Tingkat Kota. Dijadwalkan wawancara wali hari Sabtu.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'reg_number' => 'PPDB-2026-0003',
                    'student_name' => 'Zaidan Abdurrahman',
                    'nisn' => '0113490872',
                    'gender' => 'Putra',
                    'birth_info' => 'Bekasi, 03 Januari 2011',
                    'level' => 'Takhassus',
                    'track' => 'Reguler',
                    'juz_memorized' => '15 Juz',
                    'parent_name' => 'Ustadz Lukmanul Hakim',
                    'whatsapp' => '085711223344',
                    'origin_school' => 'MTs Negeri 1 Bekasi',
                    'address' => 'Jl. KH. Noer Ali No. 18, Bekasi Barat',
                    'status' => 'Baru',
                    'test_score_quran' => '-',
                    'test_score_academic' => '-',
                    'notes' => 'Pendaftar baru dari formulir online, menunggu konfirmasi jadwal tes.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    public function getPublicData(): JsonResponse
    {
        self::seedDefaultNewsIfEmpty();
        self::seedDefaultPpdbRegistrationsIfEmpty();

        $profileRow = DB::table('landing_settings')->where('key', 'profile')->first();
        $ppdbRow = DB::table('landing_settings')->where('key', 'ppdb')->first();

        $profile = $profileRow ? array_merge(self::defaultProfile(), json_decode($profileRow->value, true) ?? []) : self::defaultProfile();
        $ppdb = $ppdbRow ? array_merge(self::defaultPpdb(), json_decode($ppdbRow->value, true) ?? []) : self::defaultPpdb();

        if (empty($ppdb['wave_items'])) {
            $ppdb['wave_items'] = self::defaultPpdb()['wave_items'];
        }
        if (empty($ppdb['fee_items'])) {
            $ppdb['fee_items'] = self::defaultPpdb()['fee_items'];
        }
        if (empty($ppdb['scholarship_items'])) {
            $ppdb['scholarship_items'] = self::defaultPpdb()['scholarship_items'];
        }

        $news = DB::table('landing_news')
            ->where('is_published', true)
            ->orderByDesc('id')
            ->get();

        $registrations = DB::table('ppdb_registrations')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'profile' => $profile,
            'ppdb' => $ppdb,
            'news' => $news,
            'registrations' => $registrations,
        ]);
    }

    public function checkPpdbStatus(Request $request): JsonResponse
    {
        self::seedDefaultPpdbRegistrationsIfEmpty();
        $q = trim((string) $request->query('q', ''));
        if ($q === '') {
            return response()->json(['success' => false, 'message' => 'Masukkan Nomor Registrasi, NISN, atau Nomor WhatsApp.'], 422);
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $q);

        $item = DB::table('ppdb_registrations')
            ->where('reg_number', 'like', '%' . $q . '%')
            ->orWhere('nisn', $q)
            ->orWhere('whatsapp', 'like', '%' . $q . '%')
            ->orWhere(function ($query) use ($cleanPhone) {
                if (strlen($cleanPhone) >= 6) {
                    $query->where('whatsapp', 'like', '%' . substr($cleanPhone, -8) . '%');
                }
            })
            ->orWhere('student_name', 'like', '%' . $q . '%')
            ->orderByDesc('id')
            ->first();

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Data pendaftar tidak ditemukan. Pastikan Nomor Registrasi / WhatsApp / Nama sudah benar.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'registration' => $item,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $existingRow = DB::table('landing_settings')->where('key', 'profile')->first();
        $existing = $existingRow ? (json_decode($existingRow->value, true) ?? []) : self::defaultProfile();
        $merged = array_merge($existing, $request->all());

        DB::table('landing_settings')->updateOrInsert(
            ['key' => 'profile'],
            ['value' => json_encode($merged, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        );

        return response()->json([
            'success' => true,
            'message' => 'Seluruh perubahan konten Landing Page berhasil disimpan.',
            'profile' => $merged,
        ]);
    }

    public function updatePpdb(Request $request): JsonResponse
    {
        $existingRow = DB::table('landing_settings')->where('key', 'ppdb')->first();
        $existing = $existingRow ? (json_decode($existingRow->value, true) ?? []) : self::defaultPpdb();
        $data = $request->all();
        $merged = array_merge($existing, $data);

        if ($request->has('wave_items')) {
            $merged['wave_items'] = $request->input('wave_items');
        }
        if ($request->has('fee_items')) {
            $merged['fee_items'] = $request->input('fee_items');
        }
        if ($request->has('scholarship_items')) {
            $merged['scholarship_items'] = $request->input('scholarship_items');
        }

        DB::table('landing_settings')->updateOrInsert(
            ['key' => 'ppdb'],
            ['value' => json_encode($merged, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        );

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan Informasi PPDB berhasil diperbarui.',
            'ppdb' => $merged,
        ]);
    }

    public function storeNews(Request $request): JsonResponse
    {
        $id = DB::table('landing_news')->insertGetId([
            'title' => (string) $request->input('title', 'Berita Baru Pesantren'),
            'category' => (string) $request->input('category', 'Kegiatan Pondok'),
            'published_date' => (string) $request->input('published_date', date('d F Y')),
            'excerpt' => (string) $request->input('excerpt', ''),
            'image_url' => (string) $request->input('image_url', 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80'),
            'is_published' => (bool) $request->input('is_published', true),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Berita berhasil ditambahkan.',
            'news' => DB::table('landing_news')->find($id),
        ]);
    }

    public function updateNews(Request $request, int $id): JsonResponse
    {
        DB::table('landing_news')->where('id', $id)->update([
            'title' => (string) $request->input('title'),
            'category' => (string) $request->input('category', 'Kegiatan Pondok'),
            'published_date' => (string) $request->input('published_date'),
            'excerpt' => (string) $request->input('excerpt', ''),
            'image_url' => (string) $request->input('image_url'),
            'is_published' => (bool) $request->input('is_published', true),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Berita berhasil diperbarui.',
            'news' => DB::table('landing_news')->find($id),
        ]);
    }

    public function deleteNews(int $id): JsonResponse
    {
        DB::table('landing_news')->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Berita berhasil dihapus.',
        ]);
    }

    public function submitPpdbRegistration(Request $request): JsonResponse
    {
        $studentName = $request->input('student_name') ?? $request->input('nama_lengkap') ?? 'Calon Santri';
        $level = $request->input('level') ?? $request->input('jenjang') ?? 'SMP IT';
        $track = $request->input('track') ?? $request->input('jalur') ?? 'Reguler';
        $parentName = $request->input('parent_name') ?? $request->input('nama_wali') ?? '-';
        $whatsapp = $request->input('whatsapp') ?? $request->input('no_whatsapp') ?? '-';
        $originSchool = $request->input('origin_school') ?? $request->input('asal_sekolah') ?? '-';
        $gender = (string) $request->input('gender', 'Putra');
        $nisn = (string) $request->input('nisn', '');
        $birthInfo = (string) $request->input('birth_info', '');
        $wave = (string) $request->input('wave', '');
        $juz = (string) $request->input('juz_memorized', '0 Juz');
        $address = (string) $request->input('address', '');

        $notes = (string) $request->input('notes', '');
        if ($wave !== '' && !str_contains($notes, 'Gelombang:')) {
            $notes = trim(($notes !== '' ? $notes . ' | ' : '') . 'Gelombang: ' . $wave);
        }

        $nextNum = DB::table('ppdb_registrations')->max('id') + 1;
        $regNumber = sprintf('PSB-2026-%04d', $nextNum);

        $id = DB::table('ppdb_registrations')->insertGetId([
            'reg_number' => $regNumber,
            'student_name' => (string) $studentName,
            'nisn' => $nisn,
            'gender' => $gender,
            'birth_info' => $birthInfo,
            'level' => (string) $level,
            'track' => (string) $track,
            'juz_memorized' => $juz,
            'parent_name' => (string) $parentName,
            'whatsapp' => (string) $whatsapp,
            'origin_school' => (string) ($originSchool ?: '-'),
            'address' => $address,
            'status' => (string) $request->input('status', 'Baru'),
            'test_score_quran' => (string) $request->input('test_score_quran', '-'),
            'test_score_academic' => (string) $request->input('test_score_academic', '-'),
            'notes' => $notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Ambil Nomor WhatsApp & Nama Admin Panitia PSB dari Pengaturan CMS
        $ppdbSettingsRow = DB::table('landing_settings')->where('key', 'ppdb')->first();
        $ppdbSettings = $ppdbSettingsRow ? (json_decode($ppdbSettingsRow->value, true) ?? []) : self::defaultPpdb();
        $adminWa = $ppdbSettings['whatsapp_contact'] ?? '0812-3456-7890';
        $adminName = $ppdbSettings['admin_contact_name'] ?? 'Panitia PSB';

        // Normalisasi format nomor WA panitia ke 628...
        $cleanAdminPhone = preg_replace('/[^0-9]/', '', (string) $adminWa);
        if (str_starts_with($cleanAdminPhone, '0')) {
            $cleanAdminPhone = '62' . substr($cleanAdminPhone, 1);
        } elseif (str_starts_with($cleanAdminPhone, '8')) {
            $cleanAdminPhone = '62' . $cleanAdminPhone;
        }

        $nowDate = now()->translatedFormat('d F Y, H:i') . ' WIB';

        // Susun teks notifikasi WhatsApp resmi panitia
        $waMessage = "📋 *NOTIFIKASI PENDAFTARAN SANTRI BARU (PSB)*\n"
            . "*Pondok Pesantren Modern Utsman Bin Affan*\n"
            . "──────────────────────────────\n"
            . "Bismillah, telah masuk pendaftaran calon santri baru via Web Portal:\n\n"
            . "🔖 *No. Registrasi:* " . $regNumber . "\n"
            . "👤 *Nama Calon Santri:* " . $studentName . " (" . $gender . ")\n"
            . "🆔 *NISN:* " . ($nisn ?: '-') . "\n"
            . "🌊 *Gelombang:* " . ($wave ?: 'Gelombang I') . "\n"
            . "🏷 *Jenjang Pendidikan:* " . $level . "\n"
            . "🎯 *Jalur Pendaftaran:* " . $track . "\n"
            . "📖 *Capaian Hafalan:* " . $juz . "\n"
            . "🏫 *Asal Sekolah:* " . ($originSchool ?: '-') . "\n"
            . "👨‍👩‍👦 *Nama Orang Tua/Wali:* " . ($parentName ?: '-') . "\n"
            . "📱 *WhatsApp Orang Tua:* " . ($whatsapp ?: '-') . "\n"
            . "📍 *Alamat:* " . ($address ?: '-') . "\n"
            . "⏰ *Waktu Mendaftar:* " . $nowDate . "\n\n"
            . "Mohon Panitia PSB memverifikasi data dan mengonfirmasi jadwal seleksi santri. Terima kasih.\n"
            . "_Sistem Informasi Terpadu SIUBA_";

        $adminWaUrl = 'https://wa.me/' . $cleanAdminPhone . '?text=' . urlencode($waMessage);

        // Dukungan otomatis WA Gateway / Fonnte / Wablas (jika env disetel)
        $gatewayStatus = 'direct_wa_link_ready';
        $gatewayUrl = env('WA_GATEWAY_URL');
        $gatewayToken = env('WA_GATEWAY_TOKEN') ?: env('FONNTE_TOKEN');

        if ($gatewayUrl && $gatewayToken && $cleanAdminPhone) {
            try {
                \Illuminate\Support\Facades\Http::timeout(3)->withHeaders([
                    'Authorization' => $gatewayToken,
                ])->post($gatewayUrl, [
                    'target' => $cleanAdminPhone,
                    'message' => $waMessage,
                ]);
                $gatewayStatus = 'dispatched_to_gateway';
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Auto WA Gateway failed: ' . $e->getMessage());
                $gatewayStatus = 'gateway_skipped_fallback_link';
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran PSB berhasil disimpan dengan Nomor Registrasi: ' . $regNumber,
            'registration' => DB::table('ppdb_registrations')->find($id),
            'admin_phone' => $adminWa,
            'admin_name' => $adminName,
            'admin_clean_phone' => $cleanAdminPhone,
            'admin_whatsapp_url' => $adminWaUrl,
            'notification_message' => $waMessage,
            'gateway_status' => $gatewayStatus,
        ]);
    }

    public function updatePpdbRegistrationStatus(Request $request, int $id): JsonResponse
    {
        $updateData = ['updated_at' => now()];
        foreach (['status', 'test_score_quran', 'test_score_academic', 'notes', 'level', 'track', 'juz_memorized', 'gender', 'nisn', 'birth_info', 'address'] as $field) {
            if ($request->has($field)) {
                $updateData[$field] = (string) $request->input($field);
            }
        }

        DB::table('ppdb_registrations')->where('id', $id)->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Data & status seleksi calon santri berhasil diperbarui.',
            'registration' => DB::table('ppdb_registrations')->find($id),
        ]);
    }

    public function deletePpdbRegistration(int $id): JsonResponse
    {
        DB::table('ppdb_registrations')->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data pendaftar PPDB dihapus.',
        ]);
    }
}
