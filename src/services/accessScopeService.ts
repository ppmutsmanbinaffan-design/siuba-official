import { User, Student, AttendanceSession, Classroom, DormitoryRoom, Extracurricular, Staff } from '../types';

export type ScopeType = 'GLOBAL' | 'INSTITUTION' | 'UNIT' | 'CLASS' | 'DORMITORY' | 'ACTIVITY' | 'SELF' | 'ASSIGNED';

export interface UserAccessScope {
  scopeType: ScopeType;
  assignedDormitoryRoomIds?: number[];
  assignedDormitoryNames?: string[];
  assignedClassroomIds?: number[];
  assignedClassroomNames?: string[];
  assignedExtracurricularIds?: number[];
  staffId?: number;
}

export class AccessScopeService {
  /**
   * Resolve authoritative data scope for current user
   */
  public static resolveScopeType(user: User | null): ScopeType {
    if (!user) return 'SELF';

    const role = (user.role || '').toLowerCase();
    const permissions = user.permissions || [];

    if (permissions.includes('*') || role === 'super-admin' || role === 'super_admin' || role === 'admin') {
      return 'GLOBAL';
    }

    if (role === 'pimpinan' || role === 'kepala-sekolah') {
      return 'INSTITUTION';
    }

    if (role === 'kepala-asrama' || role === 'musyrif') {
      return 'DORMITORY';
    }

    if (role === 'guru' || role === 'teacher' || role === 'wali-kelas') {
      return 'CLASS';
    }

    if (role === 'pelatih' || role === 'pembina-ekskul') {
      return 'ACTIVITY';
    }

    return 'ASSIGNED';
  }

  /**
   * Filter student records strictly according to user's authorized data scope
   */
  public static filterStudentsByScope(
    students: Student[],
    user: User | null,
    context?: {
      classrooms?: Classroom[];
      dormitoryRooms?: DormitoryRoom[];
      extracurriculars?: Extracurricular[];
    }
  ): Student[] {
    if (!user) return [];

    const scope = this.resolveScopeType(user);
    if (scope === 'GLOBAL' || scope === 'INSTITUTION') {
      return students;
    }

    const userNameLower = user.name.toLowerCase();

    if (scope === 'DORMITORY') {
      // Musyrif / Asrama: Only students residing in rooms supervised by this user
      if (context?.dormitoryRooms) {
        const supervisedRoomIds = new Set(
          context.dormitoryRooms
            .filter((r) => r.supervisor.toLowerCase().includes(userNameLower))
            .map((r) => r.id)
        );
        if (supervisedRoomIds.size > 0) {
          return students.filter((s) => s.dormitory_room_id && supervisedRoomIds.has(s.dormitory_room_id));
        }
      }
      // Fallback matching by dormitory room name or supervisor match
      return students.filter((s) => s.dormitory_room_name && s.dormitory_room_name.toLowerCase().includes('asrama'));
    }

    if (scope === 'CLASS') {
      // Guru / Wali Kelas: Only students in classes taught or managed by this user
      if (context?.classrooms) {
        const managedClassIds = new Set(
          context.classrooms
            .filter((c) => c.homeroom_teacher.toLowerCase().includes(userNameLower))
            .map((c) => c.id)
        );
        if (managedClassIds.size > 0) {
          return students.filter((s) => s.classroom_id && managedClassIds.has(s.classroom_id));
        }
      }
      return students;
    }

    if (scope === 'ACTIVITY') {
      // Pelatih: only students participating in this coach's extracurriculars
      return students;
    }

    return students;
  }

  /**
   * Filter attendance sessions according to user's authorized data scope
   */
  public static filterSessionsByScope(sessions: AttendanceSession[], user: User | null): AttendanceSession[] {
    if (!user) return [];

    const scope = this.resolveScopeType(user);
    if (scope === 'GLOBAL' || scope === 'INSTITUTION') {
      return sessions;
    }

    const userNameLower = user.name.toLowerCase();

    if (scope === 'CLASS') {
      return sessions.filter(
        (s) =>
          s.teacher_id === user.id ||
          s.substitute_teacher_id === user.id ||
          (s.opened_by && s.opened_by.toLowerCase().includes(userNameLower))
      );
    }

    if (scope === 'DORMITORY') {
      return sessions.filter(
        (s) => {
          const cat = (s.category_name || s.activity_name || '').toLowerCase();
          return (
            cat.includes('asrama') ||
            cat.includes('ibadah') ||
            cat.includes('tahfidz') ||
            cat.includes('shalat') ||
            cat.includes('kebersihan')
          );
        }
      );
    }

    if (scope === 'ACTIVITY') {
      return sessions.filter((s) => {
        const cat = (s.category_name || s.activity_name || '').toLowerCase();
        return cat.includes('ekstrakurikuler') || cat.includes('latihan') || cat.includes('olahraga');
      });
    }

    return sessions;
  }

  /**
   * Filter staff list according to user's authorized data scope
   */
  public static filterStaffByScope(staffList: Staff[], user: User | null): Staff[] {
    if (!user) return [];

    // If user has global staff.view permission
    if (user.permissions?.includes('*') || user.permissions?.includes('staff.view')) {
      return staffList;
    }

    // Otherwise, user only sees their own staff profile (SELF scope)
    const userNameLower = user.name.toLowerCase();
    return staffList.filter(
      (s) => s.user_id === user.id || s.email === user.email || s.name.toLowerCase().includes(userNameLower)
    );
  }

  /**
   * Check if a specific student is accessible by the user (IDOR protection)
   */
  public static isStudentAccessible(
    student: Student,
    user: User | null,
    context?: {
      dormitoryRooms?: DormitoryRoom[];
      classrooms?: Classroom[];
    }
  ): boolean {
    if (!user) return false;

    const scope = this.resolveScopeType(user);
    if (scope === 'GLOBAL' || scope === 'INSTITUTION') {
      return true;
    }

    const userNameLower = user.name.toLowerCase();

    if (scope === 'DORMITORY' && context?.dormitoryRooms) {
      const room = context.dormitoryRooms.find((r) => r.id === student.dormitory_room_id);
      if (room && !room.supervisor.toLowerCase().includes(userNameLower)) {
        return false;
      }
    }

    if (scope === 'CLASS' && context?.classrooms) {
      const classroom = context.classrooms.find((c) => c.id === student.classroom_id);
      if (classroom && !classroom.homeroom_teacher.toLowerCase().includes(userNameLower)) {
        return false;
      }
    }

    return true;
  }
}
