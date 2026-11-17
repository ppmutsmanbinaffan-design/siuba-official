import { 
  TeachingSession} from '../types';
import { todayLocalDate } from '../utils/today';

export class TeachingSessionService {
  private static STORAGE_KEY = 'siuba_teaching_sessions';



  public static getTeachingSessions(date?: string, filter?: { teacherStaffId?: number; classroomId?: number; status?: string }): TeachingSession[] {
    let sessions: TeachingSession[] = [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      // Data dari server (laporan SDM); tanpa data → kosong (tidak lagi diisi jadwal contoh)
      sessions = data ? JSON.parse(data) : [];
    } catch (_) {
      sessions = [];
    }

    if (date) {
      sessions = sessions.filter(s => s.session_date === date);
    }

    if (filter) {
      if (filter.teacherStaffId) {
        sessions = sessions.filter(s => 
          s.scheduled_teacher_staff_id === filter.teacherStaffId || 
          s.actual_teacher_staff_id === filter.teacherStaffId
        );
      }
      if (filter.classroomId) {
        sessions = sessions.filter(s => s.classroom_id === filter.classroomId);
      }
      if (filter.status && filter.status !== 'ALL') {
        sessions = sessions.filter(s => s.status === filter.status);
      }
    }

    return sessions.sort((a, b) => {
      if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
      return (a.period_number || 0) - (b.period_number || 0);
    });
  }

  public static saveTeachingSessions(sessions: TeachingSession[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  public static getTeachingSessionById(sessionId: number): TeachingSession | undefined {
    const sessions = this.getTeachingSessions();
    return sessions.find(s => s.id === sessionId);
  }






  /**
   * Mark session as completed
   */
  public static completeSession(sessionId: number, notes?: string): void {
    const sessions = this.getTeachingSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index >= 0) {
      const now = new Date().toISOString();
      sessions[index] = {
        ...sessions[index],
        status: 'completed',
        notes: notes || sessions[index].notes,
        updated_at: now
      };
      this.saveTeachingSessions(sessions);
    }
  }
}
