import { AcademicSessionContext, AcademicSubstitution, AttendanceSession, Classroom, Teacher, TeacherSessionAccess, User } from '../types';

export class TeacherAuthorizationService {
  /**
   * Checks if user has permission to manage an academic attendance session
   */
  public static verifySessionAccess(params: {
    user: User;
    session: AttendanceSession;
    context?: AcademicSessionContext;
    teachers: Teacher[];
    substitutions: AcademicSubstitution[];
    classrooms: Classroom[];
  }): TeacherSessionAccess {
    const { user, session, context, teachers, substitutions, classrooms } = params;

    // 1. Super Admin or broad permission roles always authorized
    if (user.role === 'super-admin' || user.permissions?.includes('attendance.manage') || user.permissions?.includes('academic.attendance.manage')) {
      return {
        isAuthorized: true,
        roleInSession: 'admin',
        message: 'Akses Penuh Administrator',
      };
    }

    // 2. Identify teacher associated with this user
    const loggedInTeacher = teachers.find(
      (t) => t.user_id === user.id || t.name.toLowerCase().includes(user.name.toLowerCase())
    );

    const teacherId = loggedInTeacher?.id;
    const sessionTeacherId = context?.teacher_id || session.teacher_id;
    const sessionClassroomId = context?.classroom_id || session.classroom_id;

    // 3. Check Substitute Teacher
    const activeSub = substitutions.find(
      (sub) =>
        sub.date === session.session_date &&
        (sub.attendance_session_id === session.id || (context && sub.academic_schedule_id === context.academic_schedule_id))
    );

    if (activeSub && teacherId && activeSub.substitute_teacher_id === teacherId) {
      return {
        isAuthorized: true,
        roleInSession: 'substitute_teacher',
        message: 'Akses Guru Pengganti Terverifikasi',
      };
    }

    // 4. Check Primary Teacher Ownership
    if (teacherId && sessionTeacherId && teacherId === sessionTeacherId) {
      return {
        isAuthorized: true,
        roleInSession: 'primary_teacher',
        message: 'Akses Guru Utama Mata Pelajaran',
      };
    }

    // 5. Check Homeroom Teacher View Access
    if (sessionClassroomId) {
      const classroom = classrooms.find((c) => c.id === sessionClassroomId);
      if (classroom && (classroom.homeroom_teacher.toLowerCase().includes(user.name.toLowerCase()) || (loggedInTeacher && classroom.homeroom_teacher.includes(loggedInTeacher.name)))) {
        return {
          isAuthorized: true,
          roleInSession: 'homeroom_teacher',
          message: 'Akses Wali Kelas (Monitoring)',
        };
      }
    }

    // Default: Unauthorized
    return {
      isAuthorized: false,
      roleInSession: 'unauthorized',
      message: 'AKSES DITOLAK (403): Anda tidak terdaftar sebagai Guru Pengajar, Guru Pengganti, atau Wali Kelas pada sesi KBM ini.',
    };
  }
}
