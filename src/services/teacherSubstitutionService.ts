import { AcademicSubstitution, AcademicSchedule, Staff } from '../types';
import { INITIAL_ACADEMIC_SUBSTITUTIONS, INITIAL_ACADEMIC_SCHEDULES } from '../data/initialData';
import { AuditService } from './auditService';
import { StaffIdentityResolver } from './staffIdentityResolver';

export class TeacherSubstitutionService {
  private static STORAGE_KEY = 'siuba_teacher_substitutions';

  public static getInitialSubstitutions(): AcademicSubstitution[] {
    return [...INITIAL_ACADEMIC_SUBSTITUTIONS];
  }

  public static getSubstitutions(): AcademicSubstitution[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        const initial = this.getInitialSubstitutions();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch (_) {
      return this.getInitialSubstitutions();
    }
  }

  public static saveSubstitutions(subs: AcademicSubstitution[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subs));
  }

  /**
   * Find active substitution for a given date and academic schedule
   */
  public static getActiveSubstitution(date: string, academicScheduleId: number): AcademicSubstitution | undefined {
    const subs = this.getSubstitutions();
    return subs.find(s => s.date === date && s.academic_schedule_id === academicScheduleId);
  }

  /**
   * Assign a formal teacher substitution for a schedule and date
   */
  public static assignSubstitution(params: {
    academicScheduleId: number;
    attendanceSessionId?: number | null;
    date: string;
    originalTeacherStaffId: number;
    substituteTeacherStaffId: number;
    reason: string;
    assignedBy: string;
  }): { success: boolean; substitution?: AcademicSubstitution; message: string } {
    const { 
      academicScheduleId, 
      attendanceSessionId, 
      date, 
      originalTeacherStaffId, 
      substituteTeacherStaffId, 
      reason, 
      assignedBy 
    } = params;

    if (!date || !academicScheduleId || !originalTeacherStaffId || !substituteTeacherStaffId) {
      return { success: false, message: 'Parameter penugasan guru pengganti tidak lengkap.' };
    }

    if (originalTeacherStaffId === substituteTeacherStaffId) {
      return { success: false, message: 'Guru pengganti tidak boleh sama dengan guru utama yang digantikan.' };
    }

    const staffList = StaffIdentityResolver.getStaffList();
    const originalStaff = staffList.find(s => s.id === originalTeacherStaffId);
    const substituteStaff = staffList.find(s => s.id === substituteTeacherStaffId);

    if (!originalStaff || !substituteStaff) {
      return { success: false, message: 'Data staf guru utama atau guru pengganti tidak ditemukan.' };
    }

    if (!substituteStaff.is_active) {
      return { success: false, message: `Guru pengganti ${substituteStaff.name} berstatus non-aktif.` };
    }

    const subs = this.getSubstitutions();
    // Check if already substituted for this schedule & date
    const existingIndex = subs.findIndex(s => s.date === date && s.academic_schedule_id === academicScheduleId);

    const now = new Date().toISOString();
    let newSub: AcademicSubstitution;

    if (existingIndex >= 0) {
      // Update existing substitution
      const old = subs[existingIndex];
      newSub = {
        ...old,
        attendance_session_id: attendanceSessionId || old.attendance_session_id,
        original_teacher_id: originalTeacherStaffId,
        substitute_teacher_id: substituteTeacherStaffId,
        reason,
        assigned_by: assignedBy,
        updated_at: now,
      };
      subs[existingIndex] = newSub;
    } else {
      newSub = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        academic_schedule_id: academicScheduleId,
        attendance_session_id: attendanceSessionId || null,
        original_teacher_id: originalTeacherStaffId,
        substitute_teacher_id: substituteTeacherStaffId,
        date,
        reason,
        assigned_by: assignedBy,
        created_at: now,
        updated_at: now,
      };
      subs.push(newSub);
    }

    this.saveSubstitutions(subs);

    // Audit log
    AuditService.log({
      event: 'teacher_substitution_created',
      auditable_type: 'AcademicSubstitution',
      auditable_id: newSub.id,
      auditable_name: `Penugasan Guru Pengganti: ${substituteStaff.name} menggantikan ${originalStaff.name}`,
      old_values: { original_teacher_id: originalTeacherStaffId },
      new_values: { 
        substitute_teacher_id: substituteTeacherStaffId, 
        schedule_id: academicScheduleId, 
        date, 
        reason 
      },
      reason: `Penugasan resmi guru pengganti: ${reason}`,
      user: { id: 1, name: assignedBy, role: 'admin', username: 'admin', is_active: true }
    });

    return {
      success: true,
      substitution: newSub,
      message: `Berhasil menugaskan ${substituteStaff.name} sebagai Guru Pengganti untuk ${originalStaff.name} pada tanggal ${date}.`
    };
  }

  /**
   * Cancel or remove a substitution assignment
   */
  public static cancelSubstitution(
    substitutionId: number, 
    cancelledBy: string, 
    reason: string
  ): { success: boolean; message: string } {
    const subs = this.getSubstitutions();
    const target = subs.find(s => s.id === substitutionId);

    if (!target) {
      return { success: false, message: 'Data penugasan guru pengganti tidak ditemukan.' };
    }

    const updated = subs.filter(s => s.id !== substitutionId);
    this.saveSubstitutions(updated);

    AuditService.log({
      event: 'teacher_substitution_cancelled',
      auditable_type: 'AcademicSubstitution',
      auditable_id: substitutionId,
      auditable_name: `Pembatalan Guru Pengganti (ID #${substitutionId})`,
      old_values: target as any,
      new_values: { status: 'CANCELLED' },
      reason: `Pembatalan penugasan guru pengganti: ${reason}`,
      user: { id: 1, name: cancelledBy, role: 'admin', username: 'admin', is_active: true }
    });

    return { success: true, message: 'Penugasan guru pengganti berhasil dibatalkan. Guru utama dipulihkan.' };
  }

  public static assignSubstitute(params: {
    academicScheduleId: number;
    date: string;
    substituteStaffId: number;
    reason: string;
    assignedBy: string;
  }): { success: boolean; substitution?: AcademicSubstitution; message: string } {
    let schedules: AcademicSchedule[] = INITIAL_ACADEMIC_SCHEDULES;
    try {
      const stored = localStorage.getItem('siuba_academic_schedules');
      if (stored) schedules = JSON.parse(stored);
    } catch (_) {}

    const sched = schedules.find(s => s.id === params.academicScheduleId);
    const origTeacherId = sched ? sched.teacher_id : 1;

    return this.assignSubstitution({
      academicScheduleId: params.academicScheduleId,
      date: params.date,
      originalTeacherStaffId: origTeacherId,
      substituteTeacherStaffId: params.substituteStaffId,
      reason: params.reason,
      assignedBy: params.assignedBy
    });
  }
}
