/**
 * Pengaman data lama di localStorage.
 *
 * Sebelum aplikasi terhubung ke API Laravel, data santri/absensi hanya tersimpan di browser.
 * Saat data server pertama kali menimpa cache lokal, data lama yang BELUM dimigrasikan
 * (lewat halaman /migrasi-data) disalin dulu ke `siuba_unmigrated_backup_v1` agar tidak hilang.
 */
import { INITIAL_STUDENTS, INITIAL_SESSIONS } from '../data/initialData';

export const PRESERVED_BACKUP_KEY = 'siuba_unmigrated_backup_v1';
const MIGRATED_FLAG = 'siuba_local_migrated_at';

export const LEGACY_KEYS = [
  'siuba_master_students',
  'siuba_master_classrooms',
  'siuba_master_dormitories',
  'siuba_master_dormitory_rooms',
  'siuba_master_activities',
  'siuba_master_staff',
  'siuba_attendance_sessions_cache',
  'siuba_session_participants_cache',
  'siuba_attendance_records_cache',
  'siuba_student_excusals_v1',
  'siuba_staff_attendance_records',
];

const demoNis = new Set(INITIAL_STUDENTS.map((s) => String(s.student_number)));
const demoSessions = new Set(INITIAL_SESSIONS.map((s) => String(s.session_code)));

function readArray(key: string): any[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** True jika browser ini menyimpan data santri/sesi asli (bukan sekadar data contoh). */
export function hasRealLocalData(): boolean {
  if (typeof window === 'undefined') return false;
  // Cache yang sudah berasal dari server tidak dihitung sebagai data lama
  if (localStorage.getItem('siuba_students_cache_source') === 'server') return false;
  const students = readArray('siuba_master_students');
  const sessions = readArray('siuba_attendance_sessions_cache');
  return (
    students.some((s) => s && s.student_number && !demoNis.has(String(s.student_number))) ||
    sessions.some((s) => s && s.session_code && !demoSessions.has(String(s.session_code)))
  );
}

/**
 * Pastikan data lama aman sebelum cache lokal ditimpa data server.
 * @returns true jika boleh menimpa cache lokal; false jika penyimpanan cadangan gagal (jangan timpa).
 */
export function ensureLegacyDataPreserved(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (localStorage.getItem(MIGRATED_FLAG) || localStorage.getItem(PRESERVED_BACKUP_KEY)) return true;
    if (!hasRealLocalData()) return true;

    const dump: Record<string, string | null> = {};
    for (const k of LEGACY_KEYS) dump[k] = localStorage.getItem(k);
    localStorage.setItem(
      PRESERVED_BACKUP_KEY,
      JSON.stringify({ saved_at: new Date().toISOString(), origin: window.location.origin, keys: dump })
    );
    console.warn('SIUBA: data lama di browser ini diamankan. Buka /migrasi-data untuk memindahkannya ke server.');
    return true;
  } catch (e) {
    // Kuota localStorage penuh: jangan timpa data lama sama sekali
    console.error('SIUBA: gagal mengamankan data lama; cache lokal tidak ditimpa.', e);
    return false;
  }
}

/** Ada data lama yang diamankan dan belum dimigrasikan? (untuk menampilkan pengingat) */
export function hasPendingLegacyMigration(): boolean {
  try {
    return !!localStorage.getItem(PRESERVED_BACKUP_KEY) && !localStorage.getItem(MIGRATED_FLAG);
  } catch {
    return false;
  }
}
