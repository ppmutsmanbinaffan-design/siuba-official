import { ExtracurricularStaffAssignment, ExtracurricularStaffRole, Staff } from '../types';
import { INITIAL_EXTRACURRICULAR_STAFF_ASSIGNMENTS } from '../data/initialData';
import { AuditService } from './auditService';
import { StaffIdentityResolver } from './staffIdentityResolver';

export class ExtracurricularStaffAssignmentService {
  private static STORAGE_KEY = 'siuba_extracurricular_staff_assignments';

  public static getAssignments(): ExtracurricularStaffAssignment[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return INITIAL_EXTRACURRICULAR_STAFF_ASSIGNMENTS;
  }

  public static saveAssignments(assignments: ExtracurricularStaffAssignment[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(assignments));
    } catch (_) {}
  }

  public static getAssignmentsByExtracurricular(extracurricularId: number): ExtracurricularStaffAssignment[] {
    return this.getAssignments().filter(a => a.extracurricular_id === extracurricularId && a.is_active);
  }

  public static getAssignmentsByStaff(staffId: number): ExtracurricularStaffAssignment[] {
    return this.getAssignments().filter(a => a.staff_id === staffId && a.is_active);
  }

  public static getActiveAssignmentsForDate(extracurricularId: number, dateStr: string): ExtracurricularStaffAssignment[] {
    return this.getAssignments().filter(a => {
      if (a.extracurricular_id !== extracurricularId || !a.is_active) return false;
      if (a.start_date && a.start_date > dateStr) return false;
      if (a.end_date && a.end_date < dateStr) return false;
      return true;
    });
  }

  public static getPrimaryCoach(extracurricularId: number, dateStr: string): ExtracurricularStaffAssignment | undefined {
    const active = this.getActiveAssignmentsForDate(extracurricularId, dateStr);
    return active.find(a => a.is_primary && a.role === 'coach') || active.find(a => a.role === 'coach') || active[0];
  }

  public static isStaffAssigned(staffId: number, extracurricularId: number, dateStr: string): boolean {
    const active = this.getActiveAssignmentsForDate(extracurricularId, dateStr);
    return active.some(a => a.staff_id === staffId);
  }

  public static getRoleLabel(role: ExtracurricularStaffRole): string {
    switch (role) {
      case 'coach':
        return 'Pelatih Utama';
      case 'assistant_coach':
        return 'Asisten Pelatih';
      case 'supervisor':
        return 'Pembina Ekskul';
      case 'guest_trainer':
        return 'Pelatih Tamu';
      default:
        return 'Staf Pelatih';
    }
  }

  public static assignStaff(params: {
    extracurricularId: number;
    extracurricularName: string;
    extracurricularCode?: string;
    staffId: number;
    role: ExtracurricularStaffRole;
    startDate: string;
    endDate?: string | null;
    isPrimary?: boolean;
    notes?: string | null;
    operatorName?: string;
  }): { success: boolean; assignment?: ExtracurricularStaffAssignment; message: string } {
    const staff = StaffIdentityResolver.resolveById(params.staffId);
    if (!staff) {
      return { success: false, message: 'Data staf tidak ditemukan.' };
    }

    const assignments = this.getAssignments();

    // Check duplicate active assignment with same role
    const duplicate = assignments.find(
      a => a.extracurricular_id === params.extracurricularId &&
        a.staff_id === params.staffId &&
        a.role === params.role &&
        a.is_active
    );

    if (duplicate) {
      return { success: false, message: `${staff.name} sudah ditugaskan sebagai ${this.getRoleLabel(params.role)} pada ekskul ini.` };
    }

    // If new assignment is marked primary, demote existing primary for this role
    if (params.isPrimary) {
      assignments.forEach(a => {
        if (a.extracurricular_id === params.extracurricularId && a.is_primary) {
          a.is_primary = false;
        }
      });
    }

    const newAssignment: ExtracurricularStaffAssignment = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      extracurricular_id: params.extracurricularId,
      extracurricular_name: params.extracurricularName,
      extracurricular_code: params.extracurricularCode,
      staff_id: staff.id,
      staff_name: staff.name,
      staff_number: staff.staff_number,
      role: params.role,
      role_label: this.getRoleLabel(params.role),
      start_date: params.startDate,
      end_date: params.endDate || null,
      is_primary: params.isPrimary ?? (params.role === 'coach'),
      is_active: true,
      notes: params.notes || null,
      created_by: params.operatorName || 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assignments.push(newAssignment);
    this.saveAssignments(assignments);

    AuditService.log({
      event: 'extracurricular_staff_assigned',
      auditable_type: 'ExtracurricularStaffAssignment',
      auditable_id: newAssignment.id,
      auditable_name: `${staff.name} (${params.extracurricularName})`,
      new_values: newAssignment,
      reason: `Penugasan staf ${this.getRoleLabel(params.role)} untuk ekskul ${params.extracurricularName}`,
      user: { id: 1, name: params.operatorName || 'Admin', role: 'Super Admin' }
    });

    return {
      success: true,
      assignment: newAssignment,
      message: `Berhasil menugaskan ${staff.name} sebagai ${this.getRoleLabel(params.role)} pada ${params.extracurricularName}.`
    };
  }

  public static removeAssignment(id: number, operatorName: string = 'Admin'): { success: boolean; message: string } {
    const assignments = this.getAssignments();
    const index = assignments.findIndex(a => a.id === id);
    if (index === -1) {
      return { success: false, message: 'Data penugasan tidak ditemukan.' };
    }

    const removed = assignments[index];
    assignments[index].is_active = false;
    assignments[index].updated_at = new Date().toISOString();
    this.saveAssignments(assignments);

    AuditService.log({
      event: 'extracurricular_staff_removed',
      auditable_type: 'ExtracurricularStaffAssignment',
      auditable_id: id,
      auditable_name: `${removed.staff_name} (${removed.extracurricular_name})`,
      old_values: removed,
      reason: `Penonaktifan penugasan pelatih/pembina ekskul ${removed.extracurricular_name}`,
      user: { id: 1, name: operatorName, role: 'Super Admin' }
    });

    return { success: true, message: `Penugasan ${removed.staff_name} berhasil dinonaktifkan.` };
  }
}
