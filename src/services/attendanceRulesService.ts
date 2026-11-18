/**
 * Aturan Absensi dari Pengaturan Sistem (GET /settings → attendance), disimpan di perangkat
 * agar tetap berlaku saat offline. Dipakai halaman scanner: bunyi konfirmasi & mode kios layar penuh.
 */
import { AudioFeedbackService } from './audioFeedbackService';

export interface AttendanceRules {
  late_tolerance_minutes: number;
  auto_close_session_minutes: number;
  rfid_debounce_seconds: number;
  allow_self_excusal: boolean;
  enable_kiosk_fullscreen: boolean;
  enable_audio_chime: boolean;
}

const STORAGE_KEY = 'siuba_attendance_rules';

export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  late_tolerance_minutes: 15,
  auto_close_session_minutes: 30,
  rfid_debounce_seconds: 5,
  allow_self_excusal: true,
  enable_kiosk_fullscreen: false,
  enable_audio_chime: true,
};

export function getAttendanceRules(): AttendanceRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_ATTENDANCE_RULES, ...JSON.parse(raw) };
  } catch {
    // cache rusak → pakai bawaan
  }
  return { ...DEFAULT_ATTENDANCE_RULES };
}

/** Simpan aturan dari server lalu terapkan bunyi bawaan. */
export function applyServerAttendanceRules(rules: Partial<AttendanceRules> | null | undefined): AttendanceRules {
  const merged = { ...getAttendanceRules(), ...(rules || {}) } as AttendanceRules;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // penyimpanan penuh / diblokir
  }
  AudioFeedbackService.setSoundEnabled(Boolean(merged.enable_audio_chime));
  return merged;
}

/** Bunyi konfirmasi bawaan untuk halaman scanner (pengguna tetap bisa mematikannya di halaman itu). */
export function defaultChimeEnabled(): boolean {
  return Boolean(getAttendanceRules().enable_audio_chime);
}

/**
 * Mode kios: bila diaktifkan, minta layar penuh pada interaksi pertama di halaman scanner
 * (browser hanya mengizinkan layar penuh setelah ada klik/sentuhan pengguna).
 * Mengembalikan fungsi pembersih untuk useEffect.
 */
export function enableKioskFullscreenOnFirstInteraction(onEnter?: () => void): () => void {
  if (typeof document === 'undefined' || !getAttendanceRules().enable_kiosk_fullscreen) return () => {};
  const el: any = document.documentElement;
  if (!el?.requestFullscreen) return () => {};

  const handler = () => {
    if (document.fullscreenElement) return cleanup();
    el.requestFullscreen()
      .then(() => onEnter?.())
      .catch(() => {})
      .finally(cleanup);
  };
  const cleanup = () => {
    document.removeEventListener('pointerdown', handler, true);
    document.removeEventListener('keydown', handler, true);
  };
  document.addEventListener('pointerdown', handler, true);
  document.addEventListener('keydown', handler, true);
  return cleanup;
}
