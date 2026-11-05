import { AttendanceMethod, AttendanceResult, AttendanceStatus, SessionStatus, AttendanceDevice } from '../types';

export interface StatusMeta {
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  iconColor: string;
  dotColor: string;
}

export const ATTENDANCE_STATUS_MAP: Record<AttendanceStatus, StatusMeta> = {
  present: {
    label: 'Hadir',
    shortLabel: 'H',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    iconColor: 'text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  late: {
    label: 'Terlambat',
    shortLabel: 'T',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    iconColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
  },
  permission: {
    label: 'Izin',
    shortLabel: 'I',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    iconColor: 'text-blue-400',
    dotColor: 'bg-blue-500',
  },
  sick: {
    label: 'Sakit',
    shortLabel: 'S',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-400',
    iconColor: 'text-violet-400',
    dotColor: 'bg-violet-500',
  },
  dispensation: {
    label: 'Dispensasi',
    shortLabel: 'D',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-400',
    iconColor: 'text-teal-400',
    dotColor: 'bg-teal-500',
  },
  absent: {
    label: 'Alpha',
    shortLabel: 'A',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    iconColor: 'text-rose-400',
    dotColor: 'bg-rose-500',
  },
};

export const ATTENDANCE_METHOD_MAP: Record<AttendanceMethod, { label: string; badgeBg: string; badgeText: string }> = {
  manual: {
    label: 'Manual',
    badgeBg: 'bg-zinc-800',
    badgeText: 'text-zinc-300',
  },
  qr: {
    label: 'QR Code',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-400',
  },
  rfid: {
    label: 'RFID Card',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
  },
  fingerprint: {
    label: 'Sidik Jari',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-400',
  },
  face: {
    label: 'Face Rec.',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-400',
  },
  nfc: {
    label: 'NFC Mobile',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
  },
  mobile: {
    label: 'Aplikasi',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-400',
  },
};

export const SESSION_STATUS_MAP: Record<SessionStatus, { label: string; bg: string; text: string; border: string }> = {
  draft: {
    label: 'Draf',
    bg: 'bg-zinc-800/80',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
  },
  open: {
    label: 'Dibuka',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  closed: {
    label: 'Ditutup',
    bg: 'bg-zinc-800/60',
    text: 'text-zinc-400',
    border: 'border-zinc-700/60',
  },
  cancelled: {
    label: 'Dibatalkan',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
};

export const DEVICE_STATUS_MAP: Record<'online' | 'offline' | 'disabled' | 'unknown', { label: string; bg: string; text: string; dot: string }> = {
  online: {
    label: 'Online',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400 animate-pulse',
  },
  offline: {
    label: 'Offline',
    bg: 'bg-zinc-800',
    text: 'text-zinc-400',
    dot: 'bg-zinc-500',
  },
  disabled: {
    label: 'Non-Aktif',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  unknown: {
    label: 'Tidak Diketahui',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
};

/**
 * Maps backend result codes to friendly Indonesian messages
 */
export function getAttendanceErrorMessage(code?: AttendanceResult['code'] | string, fallback?: string): string {
  switch (code) {
    case 'SUCCESS':
      return 'Absensi berhasil dicatat.';
    case 'ALREADY_RECORDED':
      return 'Santri sudah memiliki absensi pada sesi ini.';
    case 'SESSION_NOT_OPEN':
      return 'Sesi absensi belum dibuka.';
    case 'SESSION_CLOSED':
      return 'Sesi absensi sudah ditutup.';
    case 'NO_ACTIVE_SESSION':
      return 'Tidak ada sesi absensi yang sedang aktif.';
    case 'MULTIPLE_ACTIVE_SESSIONS':
      return 'Terdapat beberapa sesi aktif. Silakan pilih sesi secara spesifik.';
    case 'INVALID_METHOD':
      return 'Metode absensi tidak diizinkan untuk kegiatan ini.';
    case 'INVALID_QR':
      return 'QR Code tidak valid atau format tidak dikenali.';
    case 'INVALID_DEVICE':
      return 'Perangkat terminal tidak terdaftar atau tidak valid.';
    case 'DEVICE_DISABLED':
      return 'Perangkat absensi sedang dinonaktifkan.';
    case 'DEVICE_NOT_ASSIGNED':
      return 'Perangkat belum ditugaskan ke sesi aktif mana pun.';
    case 'RFID_NOT_REGISTERED':
      return 'Kartu RFID belum terdaftar pada data santri.';
    case 'RFID_ALREADY_ASSIGNED':
      return 'Kartu RFID ini sudah terhubung ke santri lain.';
    case 'STUDENT_INACTIVE':
      return 'Santri berstatus tidak aktif atau sedang cuti.';
    case 'STUDENT_NOT_PARTICIPANT':
      return 'Santri tidak terdaftar sebagai peserta sesi ini.';
    case 'OUTSIDE_ATTENDANCE_TIME':
      return 'Absensi dilakukan di luar rentang waktu yang diperbolehkan.';
    case 'STUDENT_NOT_FOUND':
      return 'Data santri tidak ditemukan di sistem.';
    case 'UNAUTHORIZED':
      return 'Anda tidak memiliki hak akses untuk melakukan aksi ini.';
    case 'CORRECTION_NOT_ALLOWED':
      return 'Koreksi absensi tidak diizinkan untuk sesi ini.';
    case 'MISSING_REASON':
      return 'Alasan koreksi status absensi wajib diisi.';
    case 'SERVER_ERROR':
      return 'Terjadi kesalahan sistem saat memproses absensi.';
    default:
      return fallback || 'Absensi tidak dapat diproses. Silakan coba kembali.';
  }
}

/**
 * Safely masks RFID UID for privacy protection (e.g., "04A87F12" -> "04A8****7F12" or "****7F12")
 */
export function maskRfidUid(uid?: string | null): string {
  if (!uid) return '—';
  const clean = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length <= 4) return '****' + clean;
  if (clean.length <= 8) return clean.slice(0, 2) + '****' + clean.slice(-2);
  return clean.slice(0, 4) + '****' + clean.slice(-4);
}

/**
 * Formats time in HH:mm WIB format
 */
export function formatAttendanceTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    // If it's already "04:15" or "12:30:00"
    if (dateStr.includes(':') && !dateStr.includes('T') && !dateStr.includes('-')) {
      const parts = dateStr.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    // If it's ISO or "YYYY-MM-DD HH:mm:ss"
    const parsed = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) {
      // Extract with regex if Date parse fails
      const match = dateStr.match(/(\d{1,2}):(\d{2})/);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : dateStr;
    }
    return parsed.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats date into readable Indonesian string (e.g., "Minggu, 23 Agu 2026")
 */
export function formatIndonesianDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const parsed = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats time range e.g. "04:15 – 05:00"
 */
export function formatSessionTimeRange(startAt?: string, endAt?: string): string {
  const start = formatAttendanceTime(startAt);
  const end = formatAttendanceTime(endAt);
  return `${start} – ${end}`;
}

/**
 * Calculates device online/offline/disabled status based on last seen and is_active
 */
export function getDeviceStatus(device: AttendanceDevice): 'online' | 'offline' | 'disabled' {
  if (!device.is_active) return 'disabled';
  if (!device.last_seen_at) return 'offline';
  try {
    const lastSeenTime = new Date(device.last_seen_at.replace(' ', 'T')).getTime();
    const now = Date.now();
    // Device is considered online if seen in the last 120 seconds (2 minutes)
    if (now - lastSeenTime <= 120 * 1000) {
      return 'online';
    }
  } catch {
    return 'offline';
  }
  return 'offline';
}
