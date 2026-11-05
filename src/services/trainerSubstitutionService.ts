import { TrainerSubstitution, Staff } from '../types';
import { INITIAL_TRAINER_SUBSTITUTIONS } from '../data/initialData';
import { AuditService } from './auditService';
import { StaffIdentityResolver } from './staffIdentityResolver';

export class TrainerSubstitutionService {
  private static STORAGE_KEY = 'siuba_trainer_substitutions';

  public static getSubstitutions(): TrainerSubstitution[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return INITIAL_TRAINER_SUBSTITUTIONS;
  }

  public static saveSubstitutions(subs: TrainerSubstitution[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subs));
    } catch (_) {}
  }

  public static getSubstitutionsByDate(dateStr: string): TrainerSubstitution[] {
    return this.getSubstitutions().filter(s => s.date === dateStr && s.status === 'active');
  }

  public static getActiveSubstitution(extracurricularId: number, dateStr: string): TrainerSubstitution | undefined {
    return this.getSubstitutions().find(
      s => s.extracurricular_id === extracurricularId && s.date === dateStr && s.status === 'active'
    );
  }

  public static assignSubstitution(params: {
    extracurricularId: number;
    extracurricularName: string;
    originalStaffId: number;
    substituteStaffId: number;
    date: string;
    reason: string;
    assignedBy: string;
  }): { success: boolean; substitution?: TrainerSubstitution; message: string } {
    if (params.originalStaffId === params.substituteStaffId) {
      return { success: false, message: 'Pelatih pengganti tidak boleh sama dengan pelatih asli.' };
    }

    const origStaff = StaffIdentityResolver.resolveById(params.originalStaffId);
    const subStaff = StaffIdentityResolver.resolveById(params.substituteStaffId);

    if (!origStaff || !subStaff) {
      return { success: false, message: 'Data staf pelatih tidak valid atau tidak ditemukan.' };
    }

    const subs = this.getSubstitutions();

    // Check existing active substitution for this extracurricular and date
    const existing = subs.find(
      s => s.extracurricular_id === params.extracurricularId && s.date === params.date && s.status === 'active'
    );

    if (existing) {
      existing.status = 'cancelled';
    }

    const newSub: TrainerSubstitution = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      extracurricular_id: params.extracurricularId,
      extracurricular_name: params.extracurricularName,
      original_staff_id: origStaff.id,
      original_staff_name: origStaff.name,
      substitute_staff_id: subStaff.id,
      substitute_staff_name: subStaff.name,
      date: params.date,
      reason: params.reason,
      status: 'active',
      assigned_by: params.assignedBy || 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    subs.unshift(newSub);
    this.saveSubstitutions(subs);

    AuditService.log({
      event: 'trainer_substitution_created',
      auditable_type: 'TrainerSubstitution',
      auditable_id: newSub.id,
      auditable_name: `${subStaff.name} menggantikan ${origStaff.name} (${params.extracurricularName})`,
      new_values: newSub,
      reason: `Penugasan pelatih pengganti untuk ${params.extracurricularName} tanggal ${params.date}: ${params.reason}`,
      user: { id: 1, name: params.assignedBy, role: 'Admin' }
    });

    return {
      success: true,
      substitution: newSub,
      message: `Berhasil menugaskan ${subStaff.name} sebagai pelatih pengganti untuk ${params.extracurricularName} pada ${params.date}.`
    };
  }

  public static cancelSubstitution(id: number, operatorName: string = 'Admin'): { success: boolean; message: string } {
    const subs = this.getSubstitutions();
    const index = subs.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, message: 'Data pelatih pengganti tidak ditemukan.' };
    }

    const cancelled = subs[index];
    subs[index].status = 'cancelled';
    subs[index].updated_at = new Date().toISOString();
    this.saveSubstitutions(subs);

    AuditService.log({
      event: 'trainer_substitution_cancelled',
      auditable_type: 'TrainerSubstitution',
      auditable_id: id,
      auditable_name: `${cancelled.substitute_staff_name} -> ${cancelled.original_staff_name}`,
      old_values: cancelled,
      reason: `Pembatalan pelatih pengganti untuk ${cancelled.extracurricular_name} pada tanggal ${cancelled.date}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, message: 'Penugasan pelatih pengganti berhasil dibatalkan. Pelatih utama dipulihkan.' };
  }
}
