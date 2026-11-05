import { ExcusalStatus, ExcusalType, StudentExcusal, AttendanceSession } from '../types';

export class ExcuseService {
  /**
   * Check if an excusal is active and approved for a specific attendance session.
   * Compares ISO datetime bounds with session start_at and end_at.
   */
  static isExcuseActiveForSession(excusal: StudentExcusal, session: AttendanceSession): boolean {
    if (excusal.status !== 'approved') {
      return false;
    }

    const excuseStart = new Date(excusal.start_at).getTime();
    const excuseEnd = new Date(excusal.end_at).getTime();
    const sessionStart = new Date(session.start_at).getTime();
    const sessionEnd = new Date(session.end_at).getTime();

    // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
    return excuseStart <= sessionEnd && excuseEnd >= sessionStart;
  }

  /**
   * Find approved active excuse for a student in a session
   */
  static findActiveApprovedExcuse(
    studentId: number,
    session: AttendanceSession,
    excusals: StudentExcusal[]
  ): StudentExcusal | undefined {
    return excusals.find(
      (e) => e.student_id === studentId && this.isExcuseActiveForSession(e, session)
    );
  }

  /**
   * Filter excusals active for today
   */
  static getTodayExcusals(excusals: StudentExcusal[], dateStr: string = new Date().toISOString().slice(0, 10)): StudentExcusal[] {
    const targetDayStart = new Date(`${dateStr}T00:00:00`).getTime();
    const targetDayEnd = new Date(`${dateStr}T23:59:59`).getTime();

    return excusals.filter((e) => {
      const eStart = new Date(e.start_at).getTime();
      const eEnd = new Date(e.end_at).getTime();
      return eStart <= targetDayEnd && eEnd >= targetDayStart;
    });
  }

  /**
   * Get semantic label for ExcusalType
   */
  static getTypeLabel(type: ExcusalType): string {
    switch (type) {
      case 'permission':
        return 'Izin (Keluarga / Keperluan)';
      case 'sick':
        return 'Sakit (UKS / Rawat)';
      case 'dispensation':
        return 'Dispensasi (Lomba / Tugas)';
      default:
        return type;
    }
  }

  /**
   * Get semantic status label for ExcusalStatus
   */
  static getStatusLabel(status: ExcusalStatus): { label: string; bg: string; text: string; border: string } {
    switch (status) {
      case 'approved':
        return { label: 'Disetujui', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'pending':
        return { label: 'Menunggu Persetujuan', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'rejected':
        return { label: 'Ditolak', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
      case 'cancelled':
        return { label: 'Dibatalkan', bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' };
    }
  }
}
