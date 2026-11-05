import { 
  Activity, 
  AttendanceDevice, 
  AttendanceDeviceLog, 
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceRecordHistory, 
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  BulkRecordResult, 
  Classroom, 
  DormitoryRoom, 
  QrAttendanceResponse, 
  RfidAttendanceResponse, 
  SessionStatus, 
  Student, 
  StudentExcusal, 
  User, 
  UserRole 
} from '../../types';

export type {
  Activity,
  AttendanceDevice,
  AttendanceDeviceLog,
  AttendanceMethod,
  AttendanceRecord,
  AttendanceRecordHistory,
  AttendanceResult,
  AttendanceSession,
  AttendanceSessionParticipant,
  AttendanceStatus,
  BulkRecordResult,
  Classroom,
  DormitoryRoom,
  QrAttendanceResponse,
  RfidAttendanceResponse,
  SessionStatus,
  Student,
  StudentExcusal,
  User,
  UserRole,
};

export interface AttendanceTodayKpi {
  totalSessionsToday: number;
  openSessionsCount: number;
  draftSessionsCount: number;
  closedSessionsCount: number;
  totalEligibleParticipants: number;
  recordedCount: number;
  unrecordedCount: number;
  presentCount: number;
  lateCount: number;
  permissionCount: number;
  sickCount: number;
  dispensationCount: number;
  absentCount: number;
  completionRate: number; // percentage 0-100
}

export interface SessionFilterOptions {
  date?: string;
  status?: SessionStatus | 'all';
  categoryId?: number | 'all';
  search?: string;
}

export interface ParticipantFilterOptions {
  search?: string;
  classroomId?: number | 'all';
  status?: AttendanceStatus | 'unrecorded' | 'all';
  method?: AttendanceMethod | 'all';
}

export interface OpenSessionMonitoringData {
  session: AttendanceSession;
  activity?: Activity;
  totalEligible: number;
  recordedCount: number;
  unrecordedCount: number;
  presentCount: number;
  lateCount: number;
  permissionCount: number;
  sickCount: number;
  dispensationCount: number;
  absentCount: number;
  completionRate: number;
  lastScanAt?: string;
  lastStudentName?: string;
}

export interface QrScanHistoryItem {
  id: string;
  studentId: number;
  studentName: string;
  studentNumber: string;
  classroomName: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  checkInAt: string;
  lateMinutes: number;
  resultCode: AttendanceResult['code'];
  message: string;
  photoPath?: string;
  originalMethod?: AttendanceMethod;
  originalTime?: string;
}

export interface AttendanceCorrectionResult {
  success: boolean;
  code?: string;
  message: string;
  record?: AttendanceRecord;
  oldRecord?: AttendanceRecord;
  updatedRecord?: AttendanceRecord;
  history?: AttendanceRecordHistory;
  historyEntry?: AttendanceRecordHistory;
}
