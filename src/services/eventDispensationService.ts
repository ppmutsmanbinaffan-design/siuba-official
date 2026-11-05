import { SpecialEvent, Student, StudentExcusal } from '../types';

export class EventDispensationService {
  /**
   * Bulk Generate Official Event Dispensations for Event Participants
   */
  static createEventDispensations(params: {
    event: SpecialEvent;
    participants: Student[];
    operatorName: string;
    existingExcusals: StudentExcusal[];
  }): {
    updatedExcusals: StudentExcusal[];
    createdCount: number;
  } {
    const { event, participants, operatorName, existingExcusals } = params;

    const startDate = event.start_at.slice(0, 10);
    const endDate = event.end_at.slice(0, 10);
    const nowStr = new Date().toISOString();

    const newExcusals: StudentExcusal[] = [];

    participants.forEach((student, idx) => {
      // Check if student already has a dispensation for this event & date
      const alreadyHas = existingExcusals.some(
        (e) =>
          e.student_id === student.id &&
          e.start_at?.startsWith(startDate) &&
          e.end_at?.startsWith(endDate) &&
          e.type === 'dispensation' &&
          e.status === 'approved' &&
          e.reason?.includes(event.name)
      );

      if (!alreadyHas) {
        newExcusals.push({
          id: Date.now() + idx + Math.floor(Math.random() * 1000),
          student_id: student.id,
          student_name: student.name,
          student_number: student.student_number,
          classroom_name: student.classroom_name || '-',
          type: 'dispensation',
          reason: `Dispensasi Peserta Event Resmi: ${event.name} (${event.event_type.toUpperCase()})`,
          start_at: `${startDate}T00:00:00`,
          end_at: `${endDate}T23:59:59`,
          status: 'approved',
          approved_by: operatorName,
          approved_at: nowStr,
          created_by: operatorName,
          created_at: nowStr,
          updated_at: nowStr,
          notes: `Dibuat otomatis dari Event ID #${event.id} oleh ${operatorName}`,
        });
      }
    });

    return {
      updatedExcusals: [...existingExcusals, ...newExcusals],
      createdCount: newExcusals.length,
    };
  }
}
