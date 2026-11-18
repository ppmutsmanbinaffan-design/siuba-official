import { ActivityCategory } from '../types';

/**
 * Kategori kegiatan bawaan — dipakai hanya sebelum data kategori dari server termuat
 * (server mengisinya lewat ActivityCategorySeeder).
 * Data contoh lain (santri, sesi, presensi, SDM, jadwal) sudah dihapus: aplikasi hanya memakai data server.
 */
export const INITIAL_CATEGORIES: ActivityCategory[] = [
  { id: 1, code: 'IBADAH', name: 'Ibadah', description: 'Shalat fardhu 5 waktu, qiyamul lail, shalat dhuha, dzikir pagi petang.', icon: 'MoonStar', is_active: true, sort_order: 1 },
  { id: 2, code: 'AKADEMIK', name: 'Akademik', description: 'Kegiatan Belajar Mengajar (KBM) kelas formal di sekolah/madrasah.', icon: 'BookOpen', is_active: true, sort_order: 2 },
  { id: 3, code: 'TAHFIDZ', name: 'Tahfidz', description: 'Halaqah Al-Qur\'an, setoran ziyadah dan muraja\'ah hafalan santri.', icon: 'BookmarkCheck', is_active: true, sort_order: 3 },
  { id: 4, code: 'ASRAMA', name: 'Asrama', description: 'Absensi malam asrama, pembinaan kamar, dan ketertiban pondok.', icon: 'Home', is_active: true, sort_order: 4 },
  { id: 5, code: 'EKSTRAKURIKULER', name: 'Ekstrakurikuler', description: 'Kegiatan minat bakat, pramuka, tapak suci, panahan, dsb.', icon: 'Award', is_active: true, sort_order: 5 },
  { id: 6, code: 'APEL', name: 'Apel', description: 'Apel pagi santri, upacara bendera, pengarahan pimpinan pondok.', icon: 'Flag', is_active: true, sort_order: 6 },
  { id: 7, code: 'OLAHRAGA', name: 'Olahraga', description: 'Senam pagi santri, lari pagi, dan kebugaran jasmani.', icon: 'Activity', is_active: true, sort_order: 7 },
  { id: 8, code: 'KEBERSIHAN', name: 'Kebersihan', description: 'Kerja bakti mingguan, ro\'an, dan kebersihan asrama/lingkungan.', icon: 'Sparkles', is_active: true, sort_order: 8 },
  { id: 9, code: 'MAKAN', name: 'Makan', description: 'Makan pagi, makan siang, dan makan malam santri.', icon: 'Utensils', is_active: true, sort_order: 9 },
  { id: 10, code: 'MUHADHARAH', name: 'Muhadharah', description: 'Latihan khutbah dan pidato santri 3 bahasa.', icon: 'Mic', is_active: true, sort_order: 10 },
  { id: 11, code: 'KEGIATAN_RUTIN', name: 'Kegiatan Rutin', description: 'Belajar malam (mudzakarah), piket kamar, dan agenda harian.', icon: 'Clock', is_active: true, sort_order: 11 },
  { id: 12, code: 'KEGIATAN_KHUSUS', name: 'Kegiatan Khusus', description: 'Tabligh akbar, rihlah santri, dan event pondok.', icon: 'Star', is_active: true, sort_order: 12 },
];

/** Sidik jari data contoh lama — dipakai localDataGuard untuk membersihkan sisa data contoh di browser. */
export const DEMO_STUDENT_NUMBERS = ["UBA260001","UBA260002","UBA260003","UBA260004","UBA260005","UBA260006","UBA260007","UBA260008","UBA260009","UBA260010","UBA260011","UBA260012","UBA260013","UBA260014","UBA260015","UBA260099"];
export const DEMO_SESSION_CODES = ["ATT-20260823-SUBUH-001","ATT-20260823-FIQIH-001","ATT-20260822-DZUHUR-001"];
