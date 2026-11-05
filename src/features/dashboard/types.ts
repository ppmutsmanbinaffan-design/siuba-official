import { 
  User, 
  Student, 
  Staff, 
  AttendanceSession, 
  TeachingSession, 
  TrainingSession,
  AttendanceRecord,
  StaffAttendanceRecord
} from '../../types';
import { MetricSummary } from '../../services/attendanceMetricService';
import { StaffIntegratedDashboardData } from '../../types';

export interface DashboardTopSummary {
  activeStudents: number;
  activeStaff: number;
  todayStudentSessions: number;
  staffPresenceRate: number | null;
  studentAttendanceRate: number;
}

export type DashboardActiveDomain = 'all' | 'santri' | 'sdm_daily' | 'teaching' | 'training';

export interface DashboardAttentionItem {
  id: string;
  category: 'santri' | 'sdm_daily' | 'teaching' | 'training' | 'device';
  title: string;
  description: string;
  count?: number;
  severity: 'urgent' | 'warning' | 'info';
  actionLabel: string;
  targetTab: string;
  targetParams?: Record<string, any>;
}

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  targetTab: string;
  targetParams?: Record<string, any>;
  permissionRole?: string[];
  variant?: 'primary' | 'secondary' | 'neutral';
}

export interface StudentTrendPoint {
  date: string;
  label: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number;
}
