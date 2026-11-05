import { 
  AttendanceStatus, 
  StaffAttendanceStatus, 
  StaffType, 
  AttendanceMethod, 
  StaffAttendanceMethod 
} from '../../types';

export type ReportCategory = 
  | 'hub'
  | 'student' 
  | 'sdm_daily' 
  | 'teaching' 
  | 'training' 
  | 'absence'
  | 'device';

export type StudentReportSubView = 'daily' | 'student_recap' | 'class_recap';
export type StaffReportSubView = 'daily_list' | 'monthly_recap';
export type TeachingReportSubView = 'session_list' | 'teacher_summary';
export type TrainingReportSubView = 'session_list' | 'trainer_summary';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BaseReportFilters {
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
  valueDisplay: string;
}
