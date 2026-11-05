import { 
  TrainingSession, 
  TrainingRealizationStatus, 
  TrainingReconciliationItem 
} from '../types';
import { TrainingSessionService } from './trainingSessionService';
import { StaffAttendanceService } from './staffAttendanceService';
import { AuditService } from './auditService';

export class TrainingRealizationService {
  /**
   * Submit / Complete Realization Journal for a Training Session
   */
  public static submitRealization(params: {
    sessionId: number;
    topic: string;
    activityNotes?: string;
    obstacles?: string;
    actualStartAt?: string;
    actualEndAt?: string;
    studentPresentCount?: number;
    studentEligibleCount?: number;
    operatorName: string;
  }): { success: boolean; session?: TrainingSession; message: string } {
    const sessions = TrainingSessionService.getTrainingSessions();
    const index = sessions.findIndex(s => s.id === params.sessionId);
    if (index === -1) {
      return { success: false, message: 'Sesi latihan tidak ditemukan.' };
    }

    const session = sessions[index];
    const now = new Date().toISOString();

    session.topic = params.topic;
    session.activity_notes = params.activityNotes || null;
    session.obstacles = params.obstacles || null;
    session.actual_start_at = params.actualStartAt || `${session.session_date}T${session.scheduled_start_at}:00+07:00`;
    session.actual_end_at = params.actualEndAt || now;
    if (params.studentPresentCount !== undefined) session.student_present_count = params.studentPresentCount;
    if (params.studentEligibleCount !== undefined) session.student_eligible_count = params.studentEligibleCount;
    
    session.realization_status = 'realized';
    session.status = 'completed';
    session.completed_by = params.operatorName;
    session.completed_at = now;
    session.updated_at = now;

    TrainingSessionService.saveTrainingSessions(sessions);

    AuditService.log({
      event: 'training_realization_submitted',
      auditable_type: 'TrainingSession',
      auditable_id: session.id,
      auditable_name: `${session.extracurricular_name} - ${session.topic}`,
      new_values: {
        topic: params.topic,
        activity_notes: params.activityNotes,
        obstacles: params.obstacles,
        realization_status: 'realized',
        completed_by: params.operatorName
      },
      reason: `Pengisian jurnal realisasi latihan ${session.extracurricular_name} (${session.session_date})`,
      user: { id: 1, name: params.operatorName, role: 'Trainer' }
    });

    return {
      success: true,
      session,
      message: `Jurnal realisasi latihan ${session.extracurricular_name} berhasil disimpan.`
    };
  }

  /**
   * Update existing realization journal
   */
  public static updateRealization(params: {
    sessionId: number;
    topic?: string;
    activityNotes?: string;
    obstacles?: string;
    operatorName: string;
  }): { success: boolean; session?: TrainingSession; message: string } {
    const sessions = TrainingSessionService.getTrainingSessions();
    const index = sessions.findIndex(s => s.id === params.sessionId);
    if (index === -1) {
      return { success: false, message: 'Sesi latihan tidak ditemukan.' };
    }

    const session = sessions[index];
    if (params.topic !== undefined) session.topic = params.topic;
    if (params.activityNotes !== undefined) session.activity_notes = params.activityNotes;
    if (params.obstacles !== undefined) session.obstacles = params.obstacles;
    session.updated_at = new Date().toISOString();

    TrainingSessionService.saveTrainingSessions(sessions);

    AuditService.log({
      event: 'training_realization_updated',
      auditable_type: 'TrainingSession',
      auditable_id: session.id,
      auditable_name: `${session.extracurricular_name} - ${session.topic}`,
      new_values: { topic: session.topic, activity_notes: session.activity_notes, obstacles: session.obstacles },
      reason: `Pembaruan jurnal realisasi latihan ${session.extracurricular_name}`,
      user: { id: 1, name: params.operatorName, role: 'Trainer' }
    });

    return {
      success: true,
      session,
      message: `Jurnal realisasi latihan ${session.extracurricular_name} berhasil diperbarui.`
    };
  }

  /**
   * Reconcile student attendance with trainer attendance for operational integrity
   */
  public static reconcileSession(session: TrainingSession): TrainingReconciliationItem {
    const trainerRecords = StaffAttendanceService.getRecords().filter(
      r => r.attendance_type === 'training' && r.context_id === session.id
    );

    const primaryRecord = trainerRecords.find(
      r => r.staff_id === (session.actual_primary_staff_id || session.primary_staff_id)
    ) || trainerRecords[0];

    const trainerAttended = Boolean(primaryRecord && (primaryRecord.status === 'present' || primaryRecord.status === 'late'));
    const studentsPresent = session.student_present_count || 0;
    const studentsEligible = session.student_eligible_count || 0;

    let needsReview = false;
    let reviewReason: string | undefined;

    if (session.status === 'cancelled') {
      needsReview = false;
    } else if (studentsPresent > 0 && !trainerAttended) {
      needsReview = true;
      reviewReason = 'Santri hadir latihan namun presensi pelatih belum tercatat.';
    } else if (trainerAttended && studentsPresent === 0 && studentsEligible > 0 && session.realization_status === 'realized') {
      needsReview = true;
      reviewReason = 'Pelatih hadir namun tidak ada rekap kehadiran santri yang tercatat.';
    }

    return {
      session_id: session.id,
      extracurricular_name: session.extracurricular_name,
      session_date: session.session_date,
      scheduled_time: `${session.scheduled_start_at} - ${session.scheduled_end_at}`,
      trainer_name: session.actual_primary_staff_name || session.primary_staff_name || 'Pelatih',
      trainer_attended: trainerAttended,
      trainer_status: primaryRecord ? primaryRecord.status : undefined,
      student_session_id: session.attendance_session_id,
      students_eligible: studentsEligible,
      students_present: studentsPresent,
      realization_status: session.realization_status,
      needs_review: needsReview,
      review_reason: reviewReason
    };
  }

  public static getReconciliationList(dateStr?: string): TrainingReconciliationItem[] {
    const sessions = TrainingSessionService.getTrainingSessions(dateStr);
    return sessions.map(s => this.reconcileSession(s));
  }
}
