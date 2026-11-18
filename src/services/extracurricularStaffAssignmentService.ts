import { ExtracurricularStaffAssignment } from '../types';
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
    return [];
  }









}
