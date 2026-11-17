import { 
  TrainingSession, 
  Extracurricular} from '../types';
import { StaffIdentityResolver } from './staffIdentityResolver';

export class TrainingSessionService {
  private static STORAGE_KEY = 'siuba_training_sessions';

  public static getTrainingSessions(dateStr?: string): TrainingSession[] {
    let sessions: TrainingSession[] = [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        sessions = JSON.parse(stored);
      }
    } catch (_) {}

    if (dateStr) {
      return sessions.filter(s => s.session_date === dateStr);
    }
    return sessions;
  }



  public static getExtracurriculars(): Extracurricular[] {
    try {
      const stored = localStorage.getItem('siuba_extracurriculars');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  }


  // Pembuatan sesi latihan dari jadwal kini dilakukan server (TrainerApiController::generateFor,
  // otomatis tiap 00:20 lewat penjadwal). Generator lama di browser memakai jadwal contoh yang tertanam di kode.
}
