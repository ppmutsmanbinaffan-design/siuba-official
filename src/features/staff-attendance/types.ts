import type { 
  Staff, 
  StaffType, 
  StaffAttendanceRecord, 
  StaffAttendanceType, 
  StaffAttendanceStatus, 
  StaffAbsenceType,
  StaffAbsenceStatus,
  AttendanceMethod, 
  TeachingSession, 
  TeachingSessionStatus, 
  TrainingSession, 
  TrainingSessionStatus, 
  TrainingRealizationStatus, 
  AcademicSubstitution, 
  TrainerSubstitution, 
  StaffAbsenceRequest, 
  AttendanceDevice, 
  AttendanceDeviceLog,
  User
} from '../../types';

export type {
  StaffAbsenceType,
  StaffAbsenceStatus
};

export type StaffAttendanceSubView = 
  | 'dashboard'
  | 'daily'
  | 'daily-qr'
  | 'rfid-monitoring'
  | 'absence'
  | 'teaching'
  | 'teaching-detail'
  | 'teaching-qr'
  | 'teacher-substitution'
  | 'training'
  | 'training-detail'
  | 'training-qr'
  | 'trainer-substitution'
  | 'training-realization';

export interface StaffDailySummary {
  date: string;
  total_expected: number;
  total_present: number;
  total_late: number;
  total_permission: number;
  total_sick: number;
  total_leave: number;
  total_official_duty: number;
  total_alpha: number;
  total_checked_in: number;
  total_not_checked_in: number;
  total_checked_out: number;
  total_not_checked_out: number;
  total_early_leave: number;
}

export interface TeachingAttendanceSummary {
  date: string;
  total_sessions: number;
  total_present: number;
  total_late: number;
  total_substituted: number;
  total_cancelled: number;
  total_unrecorded: number;
  total_needs_review: number;
}

export interface TrainingAttendanceSummary {
  date: string;
  total_sessions: number;
  total_trainer_present: number;
  total_trainer_late: number;
  total_trainer_substituted: number;
  total_realized: number;
  total_cancelled: number;
  total_unrecorded: number;
  total_needs_review: number;
}

export interface StaffScanFeedbackItem {
  id: string;
  timestamp: string;
  resultCode: string;
  success: boolean;
  message: string;
  staff?: Staff;
  staffName?: string;
  staffNumber?: string;
  staffType?: StaffType;
  attendanceType: 'daily' | 'teaching' | 'training';
  status?: StaffAttendanceStatus;
  method?: AttendanceMethod;
  mode?: 'CHECK_IN' | 'CHECK_OUT' | 'RECORDED';
  checkInAt?: string;
  checkOutAt?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  contextName?: string;
  substituteTeacherName?: string;
  substituteTrainerName?: string;
}

export interface StaffDailyFilterState {
  search: string;
  staffType: string;
  status: string;
  checkInState: string; // all, checked_in, not_checked_in
  checkOutState: string; // all, checked_out, not_checked_out
}

export interface TeachingFilterState {
  search: string;
  classroomId: string;
  subjectId: string;
  teacherStaffId: string;
  status: string;
  sessionStatus: string;
}

export interface TrainingFilterState {
  search: string;
  extracurricularId: string;
  coachStaffId: string;
  status: string;
  realizationStatus: string;
}

export interface AbsenceFilterState {
  search: string;
  type: string;
  status: string;
}
