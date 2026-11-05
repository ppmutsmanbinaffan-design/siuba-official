import { AcademicSchedule, AcademicScheduleConflictError, DayOfWeek, LessonPeriod, Subject, Teacher } from '../types';

export class AcademicScheduleService {
  /**
   * Translate English DayOfWeek to Indonesian Day Label
   */
  public static getDayLabel(day: DayOfWeek): string {
    const labels: Record<DayOfWeek, string> = {
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Ahad',
    };
    return labels[day] || day;
  }

  /**
   * Resolve DayOfWeek from JS Date object or string "YYYY-MM-DD"
   */
  public static resolveDayOfWeek(dateInput: Date | string): DayOfWeek {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const dayIndex = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex];
  }

  /**
   * Validate potential schedule entry against conflicts:
   * 1. Teacher conflict: Teacher cannot teach 2 classes at the same day & lesson period.
   * 2. Classroom conflict: Classroom cannot have 2 subjects at the same day & lesson period.
   * 3. Room conflict: Physical room cannot host 2 schedules at the same day & lesson period.
   */
  public static validateScheduleConflict(
    newSchedule: Partial<AcademicSchedule>,
    allSchedules: AcademicSchedule[],
    teachers: Teacher[],
    subjects: Subject[],
    lessonPeriods: LessonPeriod[],
    excludeScheduleId?: number
  ): AcademicScheduleConflictError | null {
    if (!newSchedule.day_of_week || !newSchedule.lesson_period_id || !newSchedule.classroom_id || !newSchedule.teacher_id) {
      return null;
    }

    const activeSchedules = allSchedules.filter(
      (s) => s.is_active && s.id !== excludeScheduleId
    );

    const period = lessonPeriods.find((lp) => lp.id === newSchedule.lesson_period_id);
    const periodLabel = period ? `${period.name} (${period.start_time}–${period.end_time})` : `JP #${newSchedule.lesson_period_id}`;

    // 1. Check Teacher Conflict
    const teacherConflict = activeSchedules.find(
      (s) =>
        s.day_of_week === newSchedule.day_of_week &&
        s.lesson_period_id === newSchedule.lesson_period_id &&
        s.teacher_id === newSchedule.teacher_id
    );

    if (teacherConflict) {
      const teacher = teachers.find((t) => t.id === newSchedule.teacher_id);
      const teacherName = teacher ? teacher.name : `Guru ID #${newSchedule.teacher_id}`;
      return {
        type: 'teacher_conflict',
        message: `BENTROK JADWAL GURU: ${teacherName} sudah dijadwalkan mengajar pada hari ${this.getDayLabel(newSchedule.day_of_week!)} ${periodLabel} di kelas lain!`,
        conflictingSchedule: teacherConflict,
      };
    }

    // 2. Check Classroom Conflict
    const classroomConflict = activeSchedules.find(
      (s) =>
        s.day_of_week === newSchedule.day_of_week &&
        s.lesson_period_id === newSchedule.lesson_period_id &&
        s.classroom_id === newSchedule.classroom_id
    );

    if (classroomConflict) {
      const conflictingSubject = subjects.find((sub) => sub.id === classroomConflict.subject_id);
      const subjName = conflictingSubject ? conflictingSubject.name : `Mapel ID #${classroomConflict.subject_id}`;
      return {
        type: 'classroom_conflict',
        message: `BENTROK JADWAL KELAS: Kelas ini sudah memiliki mata pelajaran '${subjName}' pada hari ${this.getDayLabel(newSchedule.day_of_week!)} ${periodLabel}!`,
        conflictingSchedule: classroomConflict,
      };
    }

    // 3. Check Room Location Conflict (if room specified)
    if (newSchedule.room_location && newSchedule.room_location.trim() !== '') {
      const roomConflict = activeSchedules.find(
        (s) =>
          s.day_of_week === newSchedule.day_of_week &&
          s.lesson_period_id === newSchedule.lesson_period_id &&
          s.room_location &&
          s.room_location.trim().toLowerCase() === newSchedule.room_location?.trim().toLowerCase()
      );

      if (roomConflict) {
        return {
          type: 'room_conflict',
          message: `BENTROK LOKASI RUANGAN: Ruangan '${newSchedule.room_location}' sudah dipakai oleh kelas lain pada hari ${this.getDayLabel(newSchedule.day_of_week!)} ${periodLabel}!`,
          conflictingSchedule: roomConflict,
        };
      }
    }

    return null;
  }
}
