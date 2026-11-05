import { StaffType, StaffAttendanceStatus, TeachingSessionStatus, TrainingRealizationStatus, StaffAbsenceType, StaffAbsenceStatus } from '../../../types';

/**
 * Maps authoritative backend result codes to human-readable Indonesian messages.
 */
export function getStaffAttendanceMessage(code: string, fallbackMessage?: string): string {
  switch (code) {
    // Daily Attendance Result Codes
    case 'CHECK_IN_SUCCESS':
      return 'Check-in kehadiran harian berhasil dicatat.';
    case 'CHECK_OUT_SUCCESS':
      return 'Check-out kehadiran harian berhasil dicatat.';
    case 'STAFF_NOT_FOUND':
      return 'Data staf tidak ditemukan untuk identitas/kartu yang dipindai.';
    case 'STAFF_INACTIVE':
      return 'Status kepegawaian staf saat ini non-aktif. Tidak dapat mencatat presensi.';
    case 'NOT_WORKING_DAY':
      return 'Hari ini bukan hari kerja atau kalender menunjukkan hari libur.';
    case 'NO_SCHEDULE':
      return 'Jadwal kerja belum dikonfigurasi untuk hari ini.';
    case 'ALREADY_CHECKED_IN':
      return 'Staf sudah melakukan check-in hari ini.';
    case 'ALREADY_CHECKED_OUT':
      return 'Staf sudah melakukan check-out hari ini.';
    case 'OUTSIDE_ATTENDANCE_WINDOW':
      return 'Waktu presensi berada di luar jendela waktu yang diizinkan.';
    case 'APPROVED_ABSENCE_EXISTS':
      return 'Staf memiliki pengajuan Izin / Sakit / Cuti / Dinas yang telah disetujui untuk hari ini.';

    // Teaching Attendance Result Codes
    case 'TEACHING_ATTENDANCE_SUCCESS':
      return 'Kehadiran mengajar KBM berhasil dicatat.';
    case 'NOT_ASSIGNED_TO_TEACHING_SESSION':
      return 'Guru tidak ditugaskan pada sesi mengajar ini (bukan guru utama maupun guru pengganti resmi).';
    case 'SESSION_CANCELLED':
      return 'Sesi KBM telah dibatalkan oleh pihak kurikulum/akademik.';
    case 'SESSION_CLOSED':
      return 'Sesi KBM telah ditutup atau selesai.';
    case 'ALREADY_RECORDED':
      return 'Kehadiran mengajar untuk sesi ini sudah tercatat sebelumnya.';

    // Training Attendance Result Codes
    case 'TRAINING_ATTENDANCE_SUCCESS':
      return 'Kehadiran melatih ekstrakurikuler berhasil dicatat.';
    case 'NOT_ASSIGNED_TO_TRAINING_SESSION':
      return 'Pelatih tidak ditugaskan pada sesi kegiatan ekstrakurikuler ini.';
    case 'TRAINING_REALIZED':
      return 'Jurnal realisasi kegiatan ekstrakurikuler berhasil disimpan.';

    default:
      return fallbackMessage || `Hasil presensi: ${code}`;
  }
}

/**
 * Format staff type to readable Indonesian label
 */
export function formatStaffType(type?: StaffType | string): string {
  switch (type) {
    case 'teacher':
      return 'Guru / Tenaga Pengajar';
    case 'coach':
      return 'Pelatih / Pembina Ekskul';
    case 'musyrif':
      return 'Musyrif / Pembina Asrama';
    case 'admin_staff':
      return 'Staf Administrasi & TU';
    case 'service_staff':
      return 'Staf Sarpras & Pelayanan';
    default:
      return type || 'Staf';
  }
}

/**
 * Format attendance status
 */
export function formatAttendanceStatus(status?: StaffAttendanceStatus | string): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'present':
      return { label: 'Hadir', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'late':
      return { label: 'Terlambat', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'permission':
      return { label: 'Izin', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    case 'sick':
      return { label: 'Sakit', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
    case 'leave':
      return { label: 'Cuti', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    case 'official_duty':
      return { label: 'Dinas Luar', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
    case 'alpha':
      return { label: 'Alpha / Tanpa Ket.', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'substituted':
      return { label: 'Digantikan', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    case 'unrecorded':
    default:
      return { label: 'Belum Tercatat', badgeClass: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60' };
  }
}

/**
 * Format teaching session status
 */
export function formatTeachingSessionStatus(status?: TeachingSessionStatus | string): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'scheduled':
      return { label: 'Terjadwal', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    case 'in_progress':
      return { label: 'Berlangsung', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' };
    case 'completed':
      return { label: 'Selesai', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'cancelled':
      return { label: 'Dibatalkan', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'needs_review':
      return { label: 'Perlu Ditinjau', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    default:
      return { label: status || 'Terjadwal', badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  }
}

/**
 * Format training realization status
 */
export function formatRealizationStatus(status?: TrainingRealizationStatus | string): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'planned':
      return { label: 'Direncanakan', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    case 'ongoing':
      return { label: 'Berlangsung', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'realized':
      return { label: 'Terlaksana', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'not_realized':
      return { label: 'Tidak Terlaksana', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'cancelled':
      return { label: 'Dibatalkan', badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    case 'needs_review':
      return { label: 'Perlu Ditinjau', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    default:
      return { label: status || 'Direncanakan', badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  }
}

/**
 * Format staff absence type
 */
export function formatAbsenceType(type?: StaffAbsenceType | string): {
  label: string;
  badgeClass: string;
} {
  switch (type) {
    case 'permission':
      return { label: 'Izin', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    case 'sick':
      return { label: 'Sakit', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
    case 'leave':
      return { label: 'Cuti', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    case 'official_duty':
      return { label: 'Dinas Luar', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
    default:
      return { label: type || 'Pengajuan', badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  }
}

/**
 * Format absence approval status
 */
export function formatAbsenceStatus(status?: StaffAbsenceStatus | string): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Menunggu Persetujuan', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'approved':
      return { label: 'Disetujui', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'rejected':
      return { label: 'Ditolak', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'cancelled':
      return { label: 'Dibatalkan', badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    default:
      return { label: status || 'Pending', badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  }
}

/**
 * Mask RFID UID for privacy (e.g. 04A81234 -> 04**-**34)
 */
export function maskRfidUid(uid?: string): string {
  if (!uid) return '—';
  if (uid.length <= 4) return '****';
  return `${uid.substring(0, 2)}**-**${uid.substring(uid.length - 2)}`;
}

export const maskCardUid = maskRfidUid;

/**
 * Mask QR Token (e.g. stf_qr_90234123 -> stf_qr_***123)
 */
export function maskQrToken(token?: string): string {
  if (!token) return '—';
  if (token.length <= 8) return '****';
  return `${token.substring(0, 7)}***${token.substring(token.length - 3)}`;
}

/**
 * Extract time HH:mm in WIB (Asia/Jakarta)
 */
export function formatTimeWib(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const timeMatch = isoString.match(/T(\d{2}:\d{2})/);
    if (timeMatch) return timeMatch[1];
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

/**
 * Format full date in Indonesian (e.g. 25 Agustus 2026)
 */
export function formatDateIndonesian(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}
