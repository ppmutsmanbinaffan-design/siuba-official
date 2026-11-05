export type AttendanceMethod = 'manual' | 'qr' | 'rfid' | 'fingerprint' | 'face' | 'nfc' | 'mobile';

export type AttendanceStatus = 'present' | 'late' | 'permission' | 'sick' | 'dispensation' | 'absent';

export type SessionStatus = 'draft' | 'open' | 'closed' | 'cancelled';

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred' | 'leave';

export type RecordSource = 'operator' | 'automatic' | 'system' | 'device';

export type ExcusalType = 'permission' | 'sick' | 'dispensation';

export type ExcusalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type Gender = 'male' | 'female';

export type ParticipantType = 
  | 'all_students' 
  | 'classroom' 
  | 'dormitory' 
  | 'room' 
  | 'individual' 
  | 'extracurricular' 
  | 'custom_group'
  | 'halaqah'
  | 'duty_roster';

export type ParticipantGender = 'all' | 'male' | 'female';

export type ActivityCategoryCode = 
  | 'IBADAH' 
  | 'AKADEMIK' 
  | 'TAHFIDZ' 
  | 'ASRAMA' 
  | 'EKSTRAKURIKULER' 
  | 'APEL' 
  | 'OLAHRAGA' 
  | 'KEBERSIHAN' 
  | 'MAKAN'
  | 'MUHADHARAH'
  | 'KEGIATAN_RUTIN'
  | 'KEGIATAN_KHUSUS';

export type DeviceType = 'manual' | 'qr_scanner' | 'rfid_reader' | 'kiosk';

export type UserRole = 
  | 'super_admin' 
  | 'super-admin' 
  | 'admin' 
  | 'pimpinan' 
  | 'kepala-sekolah' 
  | 'kepala-asrama' 
  | 'guru' 
  | 'teacher' 
  | 'musyrif' 
  | 'pelatih' 
  | 'petugas-masjid' 
  | 'petugas-absensi' 
  | 'operator' 
  | 'kesantrian' 
  | 'academic' 
  | 'panitia-psb' 
  | 'panitia-ppdb' 
  | string;

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  roles?: string[];
  password?: string;
  permissions?: string[];
  is_active: boolean;
  last_login_at?: string;
}

export interface Classroom {
  id: number;
  code?: string;
  name: string;
  grade_level: number;
  academic_year: string;
  homeroom_teacher: string;
  capacity?: number;
  student_count: number;
  is_active: boolean;
}

export interface Dormitory {
  id: number;
  name: string;
  gender: 'male' | 'female' | 'L' | 'P';
  is_active: boolean;
}

export interface DormitoryRoom {
  id: number;
  dormitory_id: number;
  dormitory_name: string;
  code?: string;
  name: string;
  capacity: number;
  supervisor: string;
  is_active: boolean;
}

export interface Student {
  id: number;
  student_number: string; // NIS (Unique, e.g. UBA260001)
  nisn: string;
  name: string;
  nickname?: string;
  gender: 'male' | 'female' | 'L' | 'P';
  birth_place?: string;
  birth_date?: string;
  classroom_id?: number | null;
  classroom_name?: string;
  dormitory_room_id?: number | null;
  dormitory_room_name?: string;
  generation_year: number;
  entry_year?: number;
  photo_path?: string;
  photo?: string;
  qr_token: string;
  rfid_uid?: string | null;
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  status: StudentStatus;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface StudentClassHistory {
  id: number;
  student_id: number;
  classroom_id: number;
  classroom_name: string;
  academic_year: string;
  started_at: string;
  ended_at?: string | null;
  is_current: boolean;
  notes?: string;
}

export interface StudentRoomHistory {
  id: number;
  student_id: number;
  dormitory_room_id: number;
  dormitory_room_name: string;
  started_at: string;
  ended_at?: string | null;
  is_current: boolean;
  notes?: string;
}

export type ExtracurricularMembershipStatus = 
  | 'pending' 
  | 'active' 
  | 'waitlisted' 
  | 'rejected' 
  | 'resigned' 
  | 'removed' 
  | 'completed';

export type ExtracurricularRegistrationSource = 
  | 'student_registration' 
  | 'admin_assignment' 
  | 'class_assignment' 
  | 'import' 
  | 'migration';

export interface Extracurricular {
  id: number;
  code: string;
  name: string;
  description: string;
  category?: string;
  coach_id?: number;
  coach_name?: string;
  assistant_coach_id?: number;
  assistant_coach_name?: string;
  location?: string;
  capacity?: number;
  registration_open_at?: string;
  registration_close_at?: string;
  start_date?: string;
  end_date?: string;
  is_registration_open?: boolean;
  participant_gender?: ParticipantGender;
  allowed_grade_levels?: string[]; // e.g. ["VII", "VIII"]
  waitlist_enabled?: boolean;
  auto_promote_waitlist?: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface ExtracurricularMember {
  id: number;
  extracurricular_id: number;
  student_id: number;
  student_name?: string;
  student_number?: string;
  classroom_name?: string;
  membership_status: ExtracurricularMembershipStatus;
  registration_source?: ExtracurricularRegistrationSource;
  approved_by?: string;
  approved_at?: string;
  joined_at: string;
  left_at?: string | null;
  notes?: string;
  is_active: boolean;
}

export interface StudentGroup {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface StudentGroupMember {
  id: number;
  student_group_id: number;
  student_id: number;
  student_name?: string;
  student_number?: string;
  joined_at: string;
}

export interface ActivityCategory {
  id: number;
  code: ActivityCategoryCode;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export interface Activity {
  id: number;
  activity_category_id: number;
  category_name: string;
  code: string;
  name: string;
  description: string;
  location: string;
  participant_type: ParticipantType;
  participant_gender?: ParticipantGender;
  classroom_id?: number | null;
  dormitory_id?: number | null;
  dormitory_room_id?: number | null;
  extracurricular_id?: number | null;
  student_group_id?: number | null;
  halaqah_id?: number | null;
  routine_schedule_id?: number | null;
  attendance_enabled: boolean;
  allow_manual: boolean;
  allow_qr: boolean;
  allow_rfid: boolean;
  late_tolerance_minutes: number;
  is_active: boolean;
  default_start_time: string;
  default_present_until: string;
  default_late_until: string;
  default_end_time: string;
}

export interface ActivityParticipant {
  id: number;
  activity_id: number;
  student_id: number;
  source_type: ParticipantType | 'manual';
  source_id?: number | null;
  is_active: boolean;
  assigned_at: string;
  removed_at?: string | null;
  created_by?: string;
}

export interface AttendanceSessionParticipant {
  id: number;
  attendance_session_id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  classroom_name: string;
  dormitory_room_name: string;
  participant_source: ParticipantType | 'manual' | 'walk_in' | string;
  eligibility_status: 'eligible' | 'overridden' | 'ineligible';
  created_at: string;
}

export interface AttendanceSession {
  id: number;
  activity_id: number;
  activity_category_id?: number;
  category_name?: string;
  activity_name: string;
  activity_code: string;
  session_code: string;
  session_date: string;
  start_at: string;
  present_until: string;
  late_until: string;
  end_at: string;
  status: SessionStatus;
  location: string;
  participant_count?: number;
  total_participants?: number;
  total_present?: number;
  total_late?: number;
  total_permission?: number;
  total_sick?: number;
  total_dispensation?: number;
  total_absent?: number;
  total_unrecorded?: number;
  opened_by?: string;
  closed_by?: string;
  opened_at?: string;
  closed_at?: string;
  notes?: string;
  routine_schedule_id?: number | null;
  academic_context?: AcademicSessionContext;
  classroom_id?: number;
  subject_id?: number;
  teacher_id?: number;
  substitute_teacher_id?: number;
}

export interface AttendanceRecord {
  id: number;
  attendance_session_id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  classroom_name: string;
  dormitory_room_name: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  record_source?: RecordSource; // 'operator' | 'automatic' | 'system' | 'device'
  check_in_at: string;
  late_minutes: number;
  attendance_device_id?: number;
  attendance_device_name?: string;
  recorded_by?: string;
  notes?: string;
  was_offline?: boolean;
  received_at?: string;
  client_request_id?: string;
  client_installation_id?: string;
  sync_delay_seconds?: number;
}

export interface AttendanceRecordHistory {
  id: number;
  attendance_record_id: number;
  student_id: number;
  student_name: string;
  old_status: AttendanceStatus;
  new_status: AttendanceStatus;
  old_method?: AttendanceMethod;
  new_method?: AttendanceMethod;
  reason: string;
  changed_by: string;
  changed_at: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface StudentExcusal {
  id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  classroom_name?: string;
  dormitory_room_name?: string;
  type: ExcusalType;
  start_at: string; // ISO datetime e.g. "2026-08-23T04:00:00"
  end_at: string; // ISO datetime e.g. "2026-08-23T18:00:00"
  reason: string;
  status: ExcusalStatus;
  notes?: string;
  attachment_path?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DeviceMode = 'attendance' | 'enrollment' | 'maintenance';

export interface AttendanceDevice {
  id: number;
  device_code: string;
  device_name: string;
  device_type: DeviceType;
  location: string;
  api_key_id?: string;
  api_token_hash?: string;
  plain_secret_preview?: string; // Only shown once upon creation/rotation
  ip_address: string;
  last_seen_at: string;
  firmware_version?: string;
  is_active: boolean;
  default_activity_id?: number | null;
  current_session_id?: number | null;
  mode?: DeviceMode;
  tap_count_today?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceDeviceSession {
  id: number;
  attendance_device_id: number;
  attendance_session_id: number;
  activated_at: string;
  deactivated_at?: string | null;
  activated_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDeviceLog {
  id: number;
  attendance_device_id: number;
  device_code: string;
  event_type: 
    | 'AUTH_FAILED' 
    | 'DEVICE_DISABLED' 
    | 'NO_ACTIVE_SESSION' 
    | 'RFID_NOT_REGISTERED' 
    | 'NETWORK_DIAGNOSTIC' 
    | 'FIRMWARE_BOOT' 
    | 'HEARTBEAT'
    | 'SESSION_ASSIGNED'
    | 'SESSION_DEACTIVATED'
    | 'SECRET_ROTATED'
    | 'ENROLLMENT_READ'
    | 'CARD_SCANNED';
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, any>;
  payload?: any;
  status?: 'success' | 'warning' | 'error' | string;
  created_at: string;
}

export interface DeviceAuthCredentials {
  device_code: string;
  device_secret: string;
}

export interface RfidAttendanceResponse {
  success: boolean;
  code: AttendanceResult['code'];
  message: string;
  server_time?: string;
  display_name?: string;
  student?: {
    id: number;
    name: string;
    student_number: string;
    classroom?: string;
    dormitory_room?: string;
    photo_path?: string;
  };
  attendance?: {
    id: number;
    status: AttendanceStatus;
    method: AttendanceMethod;
    check_in_at: string;
    late_minutes: number;
    device_name?: string;
    recorded_by?: string;
  };
  existingAttendance?: {
    status: AttendanceStatus;
    method: AttendanceMethod;
    check_in_at: string;
    recorded_by?: string;
  };
  newRecord?: AttendanceRecord;
}

export interface RfidAuditLog {
  id: number;
  student_id: number;
  student_name: string;
  action: 'assigned' | 'unassigned' | 'replaced' | 'captured';
  old_rfid_uid?: string;
  new_rfid_uid?: string;
  operator_name: string;
  device_code?: string;
  timestamp: string;
  notes?: string;
}

export interface AttendanceResult {
  success: boolean;
  code: 
    | 'SUCCESS' 
    | 'ALREADY_RECORDED' 
    | 'SESSION_NOT_OPEN' 
    | 'SESSION_CLOSED' 
    | 'NO_ACTIVE_SESSION'
    | 'MULTIPLE_ACTIVE_SESSIONS'
    | 'INVALID_METHOD' 
    | 'INVALID_QR'
    | 'INVALID_DEVICE'
    | 'DEVICE_DISABLED'
    | 'DEVICE_NOT_ASSIGNED'
    | 'RFID_NOT_REGISTERED'
    | 'RFID_ALREADY_ASSIGNED'
    | 'STUDENT_INACTIVE' 
    | 'STUDENT_NOT_PARTICIPANT'
    | 'OUTSIDE_ATTENDANCE_TIME' 
    | 'STUDENT_NOT_FOUND' 
    | 'UNAUTHORIZED'
    | 'CORRECTION_NOT_ALLOWED'
    | 'MISSING_REASON'
    | 'SERVER_ERROR';
  message: string;
  record?: AttendanceRecord;
  student?: Student;
}

export interface QrAttendanceResponse {
  success: boolean;
  code: AttendanceResult['code'];
  message: string;
  student?: {
    id: number;
    name: string;
    student_number: string;
    classroom?: string;
    dormitory_room?: string;
    photo_path?: string;
  };
  attendance?: {
    id: number;
    status: AttendanceStatus;
    method: AttendanceMethod;
    check_in_at: string;
    late_minutes: number;
    device_name?: string;
    recorded_by?: string;
  };
  existingAttendance?: {
    status: AttendanceStatus;
    method: AttendanceMethod;
    check_in_at: string;
    recorded_by?: string;
  };
  newRecord?: AttendanceRecord;
}

export interface QrAuditLog {
  id: number;
  student_id: number;
  student_name: string;
  action: 'generated' | 'regenerated' | 'revoked' | 'scanned';
  old_token_hash?: string;
  new_token: string;
  operator_name: string;
  timestamp: string;
  ip_address?: string;
  notes?: string;
}

export interface AttendanceSummary {
  total_participants: number;
  recorded: number;
  unrecorded: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  dispensation: number;
  absent: number;
  attendance_rate: number; // ((present + late) / total) * 100
  completion_rate: number; // (recorded / total) * 100
  excused_rate: number; // ((permission + sick + dispensation) / total) * 100
}

export interface BulkRecordResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  messages: string[];
  newRecords: AttendanceRecord[];
}

export interface AttendanceCorrectionResult {
  success: boolean;
  code?: string;
  message: string;
  oldRecord?: AttendanceRecord;
  updatedRecord?: AttendanceRecord;
  record?: AttendanceRecord;
  historyEntry?: AttendanceRecordHistory;
  history?: AttendanceRecordHistory;
}

// ==========================================
// SPRINT 6: ACADEMIC / KBM DOMAIN TYPES
// ==========================================

export type SemesterCode = 'GANJIL' | 'GENAP';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type SubjectCategory = 'UMUM' | 'DINYYAH' | 'TAHFIDZ' | 'BAHASA' | 'LOKAL';

export type AcademicCalendarType = 'holiday' | 'exam' | 'school_event' | 'pesantren_event' | 'special_schedule';

export interface AcademicYear {
  id: number;
  name: string; // e.g. "2026/2027"
  start_date: string; // e.g. "2026-07-15"
  end_date: string; // e.g. "2027-06-20"
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Semester {
  id: number;
  academic_year_id: number;
  code: SemesterCode;
  name: string; // e.g. "Semester Ganjil 2026/2027"
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: number;
  code: string; // e.g. "FIQIH", "MTK", "ARB"
  name: string; // e.g. "Fiqih Wadhil", "Matematika Terpadu"
  short_name?: string;
  category: SubjectCategory;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Teacher {
  id: number;
  staff_id?: number | null; // Direct link to Staff.id (SIUBA v1.1.2)
  user_id?: number | null;
  employee_number?: string; // NIP / NIPY
  name: string;
  gender?: Gender;
  is_active: boolean;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeachingAssignment {
  id: number;
  academic_year_id: number;
  semester_id: number;
  classroom_id: number;
  subject_id: number;
  teacher_id: number;
  weekly_periods: number; // Target JP per minggu e.g. 3
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LessonPeriod {
  id: number;
  code: string; // e.g. "JP-01"
  name: string; // e.g. "JP 1"
  period_number: number; // 1, 2, 3...
  start_time: string; // "07:00"
  end_time: string; // "07:40"
  day_type?: 'normal' | 'jumat' | 'ramadan';
  is_break: boolean; // true for ISTIRAHAT/ISHOMA
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSchedule {
  id: number;
  academic_year_id: number;
  semester_id: number;
  day_of_week: DayOfWeek;
  classroom_id: number;
  subject_id: number;
  teacher_id: number;
  lesson_period_id: number;
  room_location?: string;
  is_active: boolean;
  effective_start_date?: string;
  effective_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSubstitution {
  id: number;
  academic_schedule_id: number;
  attendance_session_id?: number | null;
  original_teacher_id: number;
  substitute_teacher_id: number;
  date: string; // "YYYY-MM-DD"
  reason?: string;
  assigned_by: string;
  created_at: string;
  updated_at?: string;
}

export interface AcademicCalendarEvent {
  id: number;
  academic_year_id: number;
  date_start: string; // "YYYY-MM-DD"
  date_end: string; // "YYYY-MM-DD"
  type: AcademicCalendarType;
  name: string;
  description?: string;
  affects_academic_schedule: boolean; // if true & holiday -> suppresses session generator
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSessionContext {
  id: number;
  attendance_session_id: number;
  academic_schedule_id: number;
  lesson_period_id: number;
  classroom_id: number;
  subject_id: number;
  teacher_id: number;
  substitute_teacher_id?: number | null;
  period_count: number; // Default 1 for per_period
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  room_location?: string;
  created_at?: string;
}

export interface AcademicScheduleConflictError {
  type: 'teacher_conflict' | 'classroom_conflict' | 'room_conflict';
  message: string;
  conflictingSchedule?: AcademicSchedule;
}

export interface GenerationResult {
  date: string;
  schedules_found: number;
  sessions_created: number;
  sessions_existing: number;
  sessions_skipped: number;
  is_holiday?: boolean;
  holiday_name?: string;
  errors: string[];
}

export interface TeacherSessionAccess {
  isAuthorized: boolean;
  roleInSession: 'primary_teacher' | 'substitute_teacher' | 'homeroom_teacher' | 'admin' | 'unauthorized';
  message?: string;
}

// Sprint 7: Routine Activities, Prayers, Dormitory & Halaqah Interfaces

export interface Halaqah {
  id: number;
  code: string;
  name: string;
  supervisor_id?: number | null;
  supervisor_name?: string;
  location?: string;
  is_active: boolean;
  student_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HalaqahMember {
  id: number;
  halaqah_id: number;
  student_id: number;
  student_name?: string;
  student_number?: string;
  joined_at: string;
  left_at?: string | null;
  is_active: boolean;
  created_at?: string;
}

export type RoutineFrequency = 'daily' | 'weekly' | 'selected_days';

export interface RoutineSchedule {
  id: number;
  activity_id: number;
  activity_name?: string;
  day_of_week?: DayOfWeek | null; // null for daily
  days_of_week?: DayOfWeek[]; // for selected_days
  frequency: RoutineFrequency;
  start_time: string; // "HH:MM" e.g. "04:20"
  present_until: string; // "04:30"
  late_until: string; // "04:45"
  end_time: string; // "05:00"
  effective_start_date?: string | null; // "YYYY-MM-DD"
  effective_end_date?: string | null;
  auto_generate_session: boolean;
  auto_open?: boolean;
  auto_close?: boolean;
  auto_close_after_minutes?: number;
  schedule_set_code?: ScheduleSetName;
  location?: string;
  participant_type?: ParticipantType;
  participant_target_id?: number | null;
  participant_gender?: ParticipantGender;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type OverrideType = 'cancelled' | 'rescheduled' | 'time_change' | 'location_change' | 'participant_change' | 'special_session';

export interface RoutineScheduleOverride {
  id: number;
  routine_schedule_id: number;
  override_date: string; // "YYYY-MM-DD"
  override_type: OverrideType;
  new_start_time?: string;
  new_end_time?: string;
  new_location?: string;
  reason?: string;
  created_at?: string;
}

export interface PrayerTimeCalendar {
  date: string; // "YYYY-MM-DD"
  subuh: string; // "04:25"
  dzuhur: string; // "12:00"
  ashar: string; // "15:15"
  maghrib: string; // "17:58"
  isya: string; // "19:10"
  created_at?: string;
}

export interface ActivitySupervisor {
  id: number;
  activity_id: number;
  user_id: number;
  user_name?: string;
  role_type?: string; // e.g. "Petugas Masjid", "Musyrif Asrama", "Pembina Tahfidz"
  is_active: boolean;
  created_at?: string;
}

export interface RoutineGenerationResult {
  date: string;
  schedules_found: number;
  created: number;
  existing: number;
  cancelled: number;
  skipped: number;
  errors: string[];
}

export type DerivedRoutineStatus = 'upcoming' | 'ready' | 'ongoing' | 'overdue' | 'completed' | 'cancelled';

export interface DailyTimelineItem {
  session: AttendanceSession;
  activity: Activity;
  category_code: ActivityCategoryCode;
  category_name: string;
  derived_status: DerivedRoutineStatus;
  recorded_count: number;
  total_participants: number;
  attendance_rate: number;
}

export interface StudentDailyTimelineItem {
  session: AttendanceSession;
  activity: Activity;
  category_code: ActivityCategoryCode;
  record?: AttendanceRecord;
  status: AttendanceStatus | 'unrecorded' | 'excused';
  excuse_reason?: string;
}

export interface PrayerSummaryCard {
  prayer_code: string;
  prayer_name: string;
  time_range: string;
  session_id?: number;
  status: SessionStatus;
  total_students: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  dispensation: number;
  absent: number;
  attendance_rate: number;
}

export interface DormitorySummaryCard {
  dormitory_id: number;
  dormitory_name: string;
  total_residents: number;
  activity_summaries: {
    activity_name: string;
    recorded: number;
    total: number;
    rate: number;
  }[];
  overall_rate: number;
}

export interface RoutineAttentionAlert {
  student_id: number;
  student_name: string;
  student_number: string;
  classroom_name?: string;
  dormitory_room_name?: string;
  unrecorded_count: number;
  absent_count: number;
  late_count: number;
  total_missed_events: number;
  missed_activities: string[];
}

export interface DutyRoster {
  id: number;
  activity_id: number;
  activity_name?: string;
  date: string; // YYYY-MM-DD
  student_id: number;
  student_name?: string;
  student_number?: string;
  role?: string | null; // e.g. "Piket Kebersihan", "Muadzin Subuh", "Pengawas Belajar"
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export type ScheduleSetName = 'NORMAL' | 'RAMADAN' | 'UJIAN' | 'LIBUR';

export interface RoutineScheduleSet {
  id: number;
  code: ScheduleSetName;
  name: string;
  description?: string;
  is_active: boolean;
}

/* ==========================================================================
   Sprint 8: Events, Dynamic Participant Rules & Walk-In
   ========================================================================== */

export type EventType = 
  | 'school_event' 
  | 'pesantren_event' 
  | 'seminar' 
  | 'competition' 
  | 'training' 
  | 'outing' 
  | 'study_tour' 
  | 'service' 
  | 'ceremony' 
  | 'special_activity';

export type EventStatus = 
  | 'draft' 
  | 'published' 
  | 'registration_open' 
  | 'registration_closed' 
  | 'ongoing' 
  | 'completed' 
  | 'cancelled';

export type EventParticipantMode = 
  | 'all_students' 
  | 'classroom' 
  | 'dormitory' 
  | 'room' 
  | 'extracurricular' 
  | 'custom_group' 
  | 'individual' 
  | 'registration' 
  | 'invitation' 
  | 'duty_roster';

export type EventFinalizationPolicy = 'required' | 'optional' | 'checkin_only';

export type EventRegistrationStatus = 
  | 'pending' 
  | 'approved' 
  | 'waitlisted' 
  | 'rejected' 
  | 'cancelled' 
  | 'attended';

export interface SpecialEvent {
  id: number;
  code: string;
  name: string;
  description: string;
  event_type: EventType;
  start_at: string; // ISO or YYYY-MM-DD HH:mm
  end_at: string;
  registration_open_at?: string;
  registration_close_at?: string;
  location?: string;
  capacity?: number;
  participant_mode: EventParticipantMode;
  attendance_enabled: boolean;
  allow_manual: boolean;
  allow_qr: boolean;
  allow_rfid: boolean;
  status: EventStatus;
  finalization_policy: EventFinalizationPolicy;
  activity_id?: number;
  created_by?: string;
  created_at?: string;
}

export interface EventSession {
  id: number;
  event_id: number;
  name: string;
  start_at: string; // YYYY-MM-DD HH:mm
  present_until: string;
  late_until: string;
  end_at: string;
  location?: string;
  attendance_required: boolean;
  sort_order: number;
  attendance_session_id?: number;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  student_id: number;
  student_name?: string;
  student_number?: string;
  classroom_name?: string;
  status: EventRegistrationStatus;
  registered_at: string;
  registration_source: string;
  approved_by?: string;
  approved_at?: string;
  cancelled_at?: string;
  notes?: string;
}

export interface EventOrganizer {
  id: number;
  event_id: number;
  user_id: number;
  user_name?: string;
  role?: string;
  is_active: boolean;
}

export type ActivityParticipantRuleType = 
  | 'all_students' 
  | 'gender' 
  | 'classroom' 
  | 'grade_level' 
  | 'dormitory' 
  | 'room' 
  | 'extracurricular' 
  | 'custom_group' 
  | 'halaqah' 
  | 'duty_roster' 
  | 'individual' 
  | 'registration';

export type ActivityParticipantRuleOperator = 'include' | 'exclude';

export interface ActivityParticipantRule {
  id: number;
  activity_id: number;
  activity_name?: string;
  rule_type: ActivityParticipantRuleType;
  rule_operator: ActivityParticipantRuleOperator;
  rule_value: string; // e.g. "VII A" or JSON string e.g. ["1","2"]
  rule_description?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export interface WalkInAuditLog {
  id: number;
  session_id: number;
  activity_name?: string;
  student_id: number;
  student_name: string;
  student_number: string;
  operator_name: string;
  reason: string;
  timestamp: string;
}

export type ExtracurricularEligibilityCode = 
  | 'ELIGIBLE' 
  | 'REGISTRATION_CLOSED' 
  | 'CAPACITY_FULL' 
  | 'WAITLIST_AVAILABLE' 
  | 'GENDER_NOT_ALLOWED' 
  | 'GRADE_NOT_ALLOWED' 
  | 'MAX_MEMBERSHIP_REACHED' 
  | 'STUDENT_INACTIVE' 
  | 'ALREADY_REGISTERED';

// ==========================================
// SPRINT 10: PWA, OFFLINE SYNC & RESILIENCE
// ==========================================

export type ServerConnectivityState = 'SERVER_ONLINE' | 'SERVER_OFFLINE' | 'CHECKING';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type SyncConflictCode = 
  | 'ALREADY_SYNCED' 
  | 'BUSINESS_DUPLICATE' 
  | 'AUTO_ALPHA_CONFLICT_RESOLVED' 
  | 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW' 
  | 'SESSION_INVALID' 
  | 'PARTICIPANT_INVALID' 
  | 'METHOD_INVALID' 
  | 'TIMESTAMP_INVALID' 
  | 'PERMISSION_INVALID' 
  | 'OPERATOR_INACTIVE';

export interface PendingAttendanceItem {
  local_id: string;
  client_request_id: string; // Idempotent UUID
  session_id: number;
  session_code?: string;
  activity_name?: string;
  student_id: number;
  student_number: string;
  student_name: string;
  classroom_name?: string;
  dormitory_room_name?: string;
  attendance_method: AttendanceMethod;
  requested_status: AttendanceStatus;
  notes?: string;
  captured_at_client: string; // ISO string
  estimated_server_time?: string;
  clock_offset_ms?: number;
  device_context?: {
    device_name?: string;
    installation_id?: string;
    user_agent?: string;
  };
  operator_id: number;
  operator_name: string;
  sync_status: SyncStatus;
  conflict_code?: SyncConflictCode;
  conflict_message?: string;
  server_attendance_id?: number;
  server_final_status?: AttendanceStatus;
  retry_count: number;
  last_error?: string;
  last_attempt_at?: string;
  created_at_local: string;
  updated_at_local: string;
}

export interface CachedPreparedSession {
  session_id: number;
  session_code: string;
  activity_id: number;
  activity_name: string;
  category_name: string;
  start_at: string;
  present_until: string;
  late_until: string;
  end_at: string;
  status_at_cache_time: SessionStatus;
  allow_manual: boolean;
  allow_qr: boolean;
  allow_rfid: boolean;
  participant_count: number;
  cached_at: string;
  expires_at: string;
  snapshot_version: string;
}

export interface CachedParticipant {
  session_id: number;
  student_id: number;
  student_number: string;
  name: string;
  classroom_name?: string;
  dormitory_room_name?: string;
  qr_token?: string;
  rfid_uid?: string;
  status_at_cache?: AttendanceStatus;
}

export interface ClientInstallation {
  installation_id: string;
  device_name: string;
  user_id?: number;
  user_name?: string;
  app_version: string;
  platform: string;
  registered_at: string;
  last_seen_at: string;
  is_active: boolean;
  pending_count?: number;
}

export interface SyncBatchOperationResult {
  client_request_id: string;
  local_id: string;
  success: boolean;
  code: SyncConflictCode | 'SYNCED' | 'FAILED';
  message: string;
  attendance_record_id?: number;
  final_status?: AttendanceStatus;
  requires_review?: boolean;
}

export interface SyncBatchResponse {
  success: boolean;
  processed_count: number;
  success_count: number;
  conflict_count: number;
  failed_count: number;
  server_time: string;
  results: SyncBatchOperationResult[];
}

export interface DatabaseBackupMeta {
  id: string;
  filename: string;
  size_bytes: number;
  size_formatted: string;
  created_at: string;
  created_by: string;
  record_counts: {
    students: number;
    sessions: number;
    participants: number;
    records: number;
    excusals: number;
  };
  status: 'completed' | 'failed' | 'in_progress';
  checksum: string;
}

// ==========================================
// SPRINT 11: SECURITY, AUDIT, DATA INTEGRITY & DISASTER RECOVERY TYPES
// ==========================================

export type AuditLogEvent = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'restored' 
  | 'status_changed' 
  | 'attendance_corrected' 
  | 'session_opened' 
  | 'session_closed' 
  | 'session_cancelled' 
  | 'session_reopened' 
  | 'rfid_assigned' 
  | 'rfid_removed' 
  | 'qr_regenerated' 
  | 'role_changed' 
  | 'permission_changed' 
  | 'device_created' 
  | 'device_disabled' 
  | 'device_secret_rotated' 
  | 'backup_created' 
  | 'restore_started' 
  | 'restore_completed' 
  | 'offline_conflict_resolved' 
  | 'login_success' 
  | 'login_failed' 
  | 'user_deactivated' 
  | 'data_integrity_repair'
  | 'security_setting_changed'
  | 'uat_signed_off'
  | 'go_live_approved'
  | 'staff_created'
  | 'staff_updated'
  | 'staff_deactivated'
  | 'staff_qr_regenerated'
  | 'staff_rfid_assigned'
  | 'staff_rfid_removed'
  | 'staff_checkin'
  | 'staff_checkout'
  | 'staff_manual_checkin'
  | 'staff_manual_checkout'
  | 'staff_teaching'
  | 'staff_training'
  | 'staff_absence_recorded'
  | 'staff_absence_created'
  | 'staff_absence_approved'
  | 'staff_absence_rejected'
  | 'staff_attendance_corrected'
  | 'staff_attendance_finalized'
  | 'staff_work_schedule_created'
  | 'staff_work_schedule_updated'
  | 'staff_teaching_scan'
  | 'staff_teaching_checkout'
  | 'staff_teaching_manual'
  | 'staff_teaching_manual_update'
  | 'teaching_attendance_finalized'
  | 'teacher_substitution_created'
  | 'teacher_substitution_cancelled'
  | 'teaching_session_generated'
  | 'teaching_session_cancelled'
  | 'teaching_session_rescheduled'
  | 'extracurricular_staff_assigned'
  | 'extracurricular_staff_removed'
  | 'training_session_generated'
  | 'training_session_rescheduled'
  | 'training_session_cancelled'
  | 'trainer_substitution_created'
  | 'trainer_substitution_cancelled'
  | 'trainer_training_checkin_manual'
  | 'trainer_training_checkout_manual'
  | 'trainer_training_scan'
  | 'trainer_training_checkout'
  | 'trainer_attendance_corrected'
  | 'training_realization_submitted'
  | 'training_realization_updated'
  | 'training_session_finalized';

export interface AuditLog {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  role?: string | null;
  attendance_device_id?: number | null;
  client_installation_id?: string | null;
  event: AuditLogEvent;
  auditable_type: string;
  auditable_id: number | string;
  auditable_name?: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  reason?: string | null;
  ip_address?: string | null;
  user_agent_summary?: string | null;
  created_at: string;
}

export type IntegritySeverity = 'critical' | 'warning' | 'info';
export type IntegrityCategory = 'ATTENDANCE' | 'PARTICIPANT' | 'SESSION' | 'IDENTITY' | 'DEVICE' | 'SCHEDULE';

export interface DataIntegrityIssue {
  id: string;
  severity: IntegritySeverity;
  category: IntegrityCategory;
  title: string;
  description: string;
  affected_entity_type: string;
  affected_entity_id: number | string;
  affected_entity_label: string;
  suggested_fix: string;
  can_auto_repair: boolean;
  repair_action_label?: string;
  detected_at: string;
}

export interface DataIntegritySummary {
  total_issues: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  last_audit_at: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  issues: DataIntegrityIssue[];
  metrics: {
    total_records_checked: number;
    total_sessions_checked: number;
    total_students_checked: number;
    total_participants_checked: number;
    total_devices_checked: number;
    duplicate_attendance_count: number;
    incomplete_closed_sessions_count: number;
    duplicate_rfid_count: number;
    duplicate_qr_count: number;
    orphan_device_assignments_count: number;
  };
}

export interface SystemHealthReport {
  application_status: 'healthy' | 'warning' | 'critical';
  application_version: string;
  application_env: 'production' | 'staging' | 'development';
  database_status: 'healthy' | 'warning' | 'critical';
  database_engine: string;
  database_latency_ms: number;
  storage_status: 'healthy' | 'warning' | 'critical';
  storage_writable: boolean;
  disk_status: 'healthy' | 'warning' | 'critical';
  disk_total_gb: number;
  disk_free_gb: number;
  disk_free_percentage: number;
  scheduler_status: 'healthy' | 'warning' | 'critical';
  scheduler_last_heartbeat: string;
  scheduler_heartbeat_diff_seconds: number;
  backup_freshness_status: 'healthy' | 'warning' | 'critical';
  backup_last_successful_at: string;
  backup_count_stored: number;
  active_devices_online: number;
  active_devices_total: number;
  failed_logins_today: number;
  inactive_users_count: number;
  overall_status: 'healthy' | 'warning' | 'critical';
  checked_at: string;
}

export interface SecuritySettingConfig {
  session_timeout_minutes: number;
  max_login_attempts_before_lockout: number;
  lockout_duration_minutes: number;
  force_password_change_days: number;
  min_password_length: number;
  require_special_char: boolean;
  require_numbers: boolean;
  allow_concurrent_sessions: boolean;
  pwa_offline_cache_max_days: number;
  audit_retention_days: number;
  backup_retention_days: number;
  strict_https_enforced: boolean;
  csp_policy_active: boolean;
  ip_rate_limiting_enabled: boolean;
  maintenance_mode: boolean;
}

export interface DisasterRecoveryPlan {
  id: string;
  title: string;
  scenario: string;
  rpo_target: string;
  rto_target: string;
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  steps: string[];
  last_drill_at?: string;
  last_drill_status?: 'PASS' | 'PENDING';
}

// =========================================================================
// SPRINT 12 TYPES: QA, LOAD TESTING, UAT, SOP, DEPLOYMENT & GO-LIVE
// =========================================================================

export type UATRole = 
  | 'Super Admin' 
  | 'Admin' 
  | 'Pimpinan' 
  | 'Kepala Sekolah' 
  | 'Kepala Asrama' 
  | 'Guru' 
  | 'Wali Kelas' 
  | 'Musyrif' 
  | 'Pembina' 
  | 'Petugas';

export type UATResultStatus = 'PASS' | 'PASS_WITH_NOTE' | 'FAIL' | 'PENDING';

export interface UATTestCase {
  id: string;
  module: string;
  role: UATRole;
  scenario: string;
  preconditions: string;
  steps: string[];
  expected_result: string;
  actual_result?: string;
  status: UATResultStatus;
  tester_name?: string;
  tested_at?: string;
  notes?: string;
  evidence?: string;
}

export interface UATSignOffItem {
  id: string;
  role: UATRole;
  module: string;
  representative_name: string;
  representative_title: string;
  status: 'ACCEPTED' | 'ACCEPTED_WITH_NOTES' | 'REJECTED' | 'WAITING';
  signed_at?: string;
  notes?: string;
  signature_hash?: string;
}

export type BugSeverity = 'BLOCKER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'RETEST' | 'CLOSED' | 'DEFERRED';

export interface BugBacklogItem {
  id: string;
  title: string;
  module: string;
  severity: BugSeverity;
  status: BugStatus;
  repro_steps: string;
  expected: string;
  actual: string;
  owner: string;
  created_at: string;
  resolved_at?: string;
  notes?: string;
  workaround?: string;
}

export interface LoadTestMetric {
  name: string;
  concurrency: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  throughput_req_sec: number;
  cpu_peak_percent: number;
  memory_peak_mb: number;
  duplicate_records_created: number;
  data_integrity_pass: boolean;
  status: 'PASS' | 'WARNING' | 'FAIL';
  notes: string;
}

export interface ChaosExperimentResult {
  id: string;
  name: string;
  scenario: string;
  injected_fault: string;
  expected_behavior: string;
  actual_behavior: string;
  data_loss: boolean;
  recovery_duration_seconds: number;
  status: 'PASS' | 'FAIL';
}

export interface GoLiveChecklistItem {
  id: string;
  category: 'SECURITY' | 'PERFORMANCE' | 'DATA_INTEGRITY' | 'HARDWARE' | 'BACKUP_DR' | 'UAT' | 'DEPLOYMENT' | 'OPERATIONAL';
  title: string;
  description: string;
  is_blocking: boolean;
  completed: boolean;
  verified_by?: string;
  verified_at?: string;
  evidence_summary?: string;
}

export interface OperationalSOPDoc {
  id: string;
  code: string;
  category: 'ADMIN' | 'OPERATOR' | 'HARDWARE' | 'EMERGENCY' | 'DATA';
  title: string;
  target_audience: string;
  objective: string;
  frequency: string;
  steps: { step_number: number; title: string; instruction: string; check: string }[];
  contingency_fallback: string;
  last_reviewed: string;
}

export interface ReleaseCandidateMeta {
  version: string;
  release_candidate: string;
  release_date: string;
  status: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  target_environment: string;
  database_version: string;
  firmware_version: string;
  git_commit_tag: string;
  total_unit_tests: number;
  unit_tests_pass: number;
  total_acceptance_specs: number;
  acceptance_specs_pass: number;
  critical_issues_count: number;
  blocker_issues_count: number;
  p95_attendance_ms: number;
  rpo_tested: string;
  rto_tested: string;
}

// ==========================================
// SIUBA v1.1: MODUL ABSENSI SDM / STAFF DOMAIN
// ==========================================

export type StaffType = 'teacher' | 'trainer' | 'musyrif' | 'administration' | 'employee' | 'management' | 'other';

export type StaffEmploymentStatus = 'permanent' | 'contract' | 'honorary' | 'part_time' | 'volunteer' | 'inactive';

export type StaffAttendanceType = 'daily' | 'teaching' | 'training' | 'meeting' | 'duty' | 'event';

export type StaffAttendanceStatus = 'present' | 'late' | 'permission' | 'sick' | 'leave' | 'official_duty' | 'absent';

export type StaffAttendanceMethod = AttendanceMethod;

export interface Staff {
  id: number;
  user_id?: number | null;
  staff_number: string; // e.g. STF260001 / NIP
  name: string;
  gender: Gender;
  staff_type: StaffType;
  employment_status: StaffEmploymentStatus;
  phone?: string;
  email?: string;
  photo?: string;
  qr_token: string; // e.g. STF-K7P9NX26QM
  rfid_uid?: string | null;
  department?: string;
  position?: string;
  join_date?: string;
  leave_date?: string | null;
  requires_daily_attendance?: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface StaffAttendanceRecord {
  id: number;
  staff_id: number;
  staff_name?: string;
  staff_number?: string;
  staff_type?: StaffType;
  attendance_date: string; // YYYY-MM-DD
  attendance_type: StaffAttendanceType;
  context_type?: 'academic_session' | 'training_session' | 'duty_shift' | 'meeting' | 'general' | null;
  context_id?: number | null;
  context_name?: string;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: StaffAttendanceStatus;
  check_in_method?: AttendanceMethod | null;
  check_out_method?: AttendanceMethod | null;
  late_minutes: number;
  early_leave_minutes: number;
  attendance_device_id?: number | null;
  recorded_by?: string | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  finalized_at?: string | null;
  finalized_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffAttendanceRecordHistory {
  id: number;
  staff_attendance_record_id: number;
  old_values: Partial<StaffAttendanceRecord>;
  new_values: Partial<StaffAttendanceRecord>;
  reason: string;
  changed_by: string;
  changed_at: string;
}

export interface StaffWorkSchedule {
  id: number;
  staff_id?: number | null;
  staff_type?: StaffType | null;
  staff_group?: StaffType | 'all' | null;
  day_of_week: DayOfWeek;
  check_in_open_at: string;
  scheduled_start_at: string;
  late_after: string;
  check_out_open_at: string;
  scheduled_end_at: string;
  check_out_close_at?: string | null;
  is_working_day: boolean;
  grace_period_minutes?: number;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  priority?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type StaffAbsenceType = 'permission' | 'sick' | 'leave' | 'official_duty';

export type StaffAbsenceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StaffAbsenceRequest {
  id: number;
  staff_id: number;
  staff_name?: string;
  staff_number?: string;
  type: StaffAbsenceType;
  start_at: string;
  end_at: string;
  reason: string;
  attachment?: string | null;
  status: StaffAbsenceStatus;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  decision_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffAttendanceSummary {
  total_staff: number;
  expected_today: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  leave: number;
  official_duty: number;
  absent: number;
  not_checked_in: number;
  not_checked_out: number;
  attendance_rate: number;
  punctuality_rate: number;
}

export interface StaffAttendanceScanResponse {
  success: boolean;
  code: string;
  message: string;
  staff?: Staff;
  record?: StaffAttendanceRecord;
  mode?: 'CHECK_IN' | 'CHECK_OUT' | 'RECORDED';
}

// ==========================================
// SIUBA v1.1.2: ABSENSI MENGAJAR GURU (KBM)
// ==========================================

export type TeachingSessionStatus = 'scheduled' | 'open' | 'completed' | 'cancelled' | 'substituted';

export interface TeachingSession {
  id: number;
  academic_schedule_id: number;
  attendance_session_id?: number | null; // Student attendance session reference
  session_date: string; // YYYY-MM-DD
  classroom_id: number;
  classroom_name: string;
  subject_id: number;
  subject_name: string;
  subject_code?: string;
  lesson_period_id: number;
  lesson_period_name: string;
  period_number?: number;
  room_location?: string;
  scheduled_teacher_staff_id: number;
  scheduled_teacher_name: string;
  teacher_name?: string; // Ergonomic alias for scheduled_teacher_name
  teacher_staff_id?: number; // Ergonomic alias for scheduled_teacher_staff_id
  actual_teacher_staff_id?: number | null;
  actual_teacher_name?: string | null;
  teacher_check_in_at?: string | null;
  teacher_attendance_status?: StaffAttendanceStatus | 'unrecorded';
  late_minutes?: number;
  start_time?: string;
  end_time?: string;
  is_substituted?: boolean;
  substitute_teacher_id?: number | null;
  scheduled_start_at: string; // e.g. "2026-08-24T07:00:00+07:00" or "07:00"
  scheduled_end_at: string; // e.g. "2026-08-24T07:40:00+07:00" or "07:40"
  status: TeachingSessionStatus;
  substitution_id?: number | null;
  substitution_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  teaching_journal_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeachingSessionGenerationResult {
  date: string;
  schedules_found: number;
  sessions_created: number;
  sessions_existing: number;
  sessions_skipped: number;
  is_holiday?: boolean;
  holiday_name?: string;
  substitutions_applied: number;
  errors: string[];
}

export interface TeachingContextResolution {
  is_eligible: boolean;
  code: 'VALID' | 'NOT_ASSIGNED_TO_TEACHING_SESSION' | 'SESSION_NOT_FOUND' | 'SESSION_CANCELLED' | 'ALREADY_RECORDED' | 'TOO_EARLY' | 'ALREADY_CHECKED_OUT';
  message: string;
  session?: TeachingSession;
  expected_teacher_staff_id?: number;
  allowed_teacher_staff_id?: number;
  is_substitute?: boolean;
  is_late?: boolean;
  late_minutes?: number;
  grace_period_minutes?: number;
}

export interface TeachingAttendanceSummary {
  total_sessions: number;
  scheduled_count: number;
  attended_count: number;
  present_count: number;
  late_count: number;
  substituted_count: number;
  cancelled_count: number;
  unrecorded_count: number;
  absent_count: number;
  realization_rate: number; // (attended_count / (total_sessions - cancelled_count || 1)) * 100
  punctuality_rate: number; // (present_count / (attended_count || 1)) * 100
  late_rate: number; // (late_count / (attended_count || 1)) * 100
  total_late_minutes: number;
}

// =======================================================
// SIUBA v1.1.3: ABSENSI PELATIH / PEMBINA EKSTRAKURIKULER
// =======================================================

export type ExtracurricularStaffRole = 'coach' | 'assistant_coach' | 'supervisor' | 'guest_trainer';

export interface ExtracurricularStaffAssignment {
  id: number;
  extracurricular_id: number;
  extracurricular_name?: string;
  extracurricular_code?: string;
  staff_id: number;
  staff_name: string;
  staff_number?: string;
  role: ExtracurricularStaffRole;
  role_label?: string; // "Pelatih Utama", "Asisten Pelatih", "Pembina", "Pelatih Tamu"
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD nullable
  is_primary: boolean;
  is_active: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TrainingSessionStatus = 'scheduled' | 'open' | 'completed' | 'cancelled' | 'rescheduled' | 'substituted';
export type TrainingRealizationStatus = 'planned' | 'ongoing' | 'realized' | 'not_realized' | 'cancelled' | 'needs_review';

export interface TrainingSession {
  id: number;
  extracurricular_id: number;
  extracurricular_name: string;
  extracurricular_code: string;
  activity_id?: number | null;
  attendance_session_id?: number | null; // Link to student extracurricular attendance session
  schedule_id?: number | null;
  session_date: string; // YYYY-MM-DD
  scheduled_start_at: string; // "16:00" or ISO
  scheduled_end_at: string; // "17:30" or ISO
  start_time?: string;
  end_time?: string;
  location?: string | null;
  primary_staff_id?: number | null;
  primary_staff_name?: string | null;
  coach_staff_id?: number | null; // Ergonomic alias for primary_staff_id
  coach_name?: string | null; // Ergonomic alias for primary_staff_name
  actual_primary_staff_id?: number | null;
  actual_primary_staff_name?: string | null;
  actual_coach_staff_id?: number | null;
  actual_coach_name?: string | null;
  assistant_staff_id?: number | null;
  assistant_staff_ids?: number[];
  trainer_check_in_at?: string | null;
  trainer_attendance_status?: StaffAttendanceStatus | 'unrecorded';
  trainer_late_minutes?: number;
  is_substituted?: boolean;
  substitute_coach_staff_id?: number | null;
  status: TrainingSessionStatus;
  realization_status: TrainingRealizationStatus;
  substitution_id?: number | null;
  substitution_reason?: string | null;
  topic?: string | null; // Topic / Materi latihan e.g. "Teknik Dasar Memanah - Stance & Anchor Point"
  activity_notes?: string | null; // Catatan kegiatan / pelaksanaan
  obstacles?: string | null; // Kendala lapangan
  actual_start_at?: string | null;
  actual_end_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  reschedule_reason?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  student_present_count?: number; // Snapshot of student presence count
  student_eligible_count?: number; // Snapshot of total registered students
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TrainerSubstitution {
  id: number;
  training_session_id?: number | null;
  extracurricular_id: number;
  extracurricular_name?: string;
  original_staff_id: number;
  original_staff_name: string;
  substitute_staff_id: number;
  substitute_staff_name: string;
  date: string; // YYYY-MM-DD
  reason: string;
  status: 'active' | 'cancelled' | 'completed';
  assigned_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingContextResolution {
  is_eligible: boolean;
  code: 'VALID' | 'NOT_ASSIGNED_TO_TRAINING_SESSION' | 'SESSION_NOT_FOUND' | 'SESSION_CANCELLED' | 'ALREADY_RECORDED' | 'TOO_EARLY' | 'ALREADY_CHECKED_OUT';
  message: string;
  session?: TrainingSession;
  assignment?: ExtracurricularStaffAssignment;
  role?: ExtracurricularStaffRole;
  is_primary?: boolean;
  is_substitute?: boolean;
  is_late?: boolean;
  late_minutes?: number;
  grace_period_minutes?: number;
}

export interface TrainingSessionGenerationResult {
  date: string;
  schedules_found: number;
  sessions_created: number;
  sessions_existing: number;
  sessions_skipped: number;
  is_holiday?: boolean;
  holiday_name?: string;
  substitutions_applied: number;
  errors: string[];
}

export interface TrainingAttendanceSummary {
  total_sessions: number;
  scheduled_count: number;
  realized_sessions: number;
  attended_count: number;
  present_count: number;
  late_count: number;
  substituted_count: number;
  cancelled_count: number;
  unrecorded_count: number;
  absent_count: number;
  needs_review_count: number;
  trainer_attendance_rate: number; // (attended_count / (total_sessions - cancelled_count || 1)) * 100
  realization_rate: number; // (realized_sessions / (total_sessions - cancelled_count || 1)) * 100
  punctuality_rate: number; // (present_count / (attended_count || 1)) * 100
  late_rate: number; // (late_count / (attended_count || 1)) * 100
  total_late_minutes: number;
}

export interface TrainingReconciliationItem {
  session_id: number;
  extracurricular_name: string;
  session_date: string;
  scheduled_time: string;
  trainer_name: string;
  trainer_attended: boolean;
  trainer_status?: StaffAttendanceStatus;
  student_session_id?: number | null;
  students_eligible: number;
  students_present: number;
  realization_status: TrainingRealizationStatus;
  needs_review: boolean;
  review_reason?: string;
}// ==========================================
// SIUBA v1.1.4: DASHBOARD & LAPORAN SDM TERPADU
// ==========================================

export interface StaffAnalyticsFilters {
  date_from: string;
  date_to: string;
  staff_id?: number | 'ALL';
  staff_type?: StaffType | 'ALL';
  employment_status?: string | 'ALL';
  attendance_status?: StaffAttendanceStatus | 'ALL';
  classroom_id?: number | 'ALL';
  subject_id?: number | 'ALL';
  extracurricular_id?: number | 'ALL';
  attendance_method?: StaffAttendanceMethod | 'ALL';
  unit_id?: number | null | 'ALL';
}

export interface StaffDailyOperationalItem {
  staff_id: number;
  staff_name: string;
  staff_number?: string;
  staff_type: StaffType;
  department?: string;
  expected_start: string;
  expected_end: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: StaffAttendanceStatus | 'not_checked_in';
  late_minutes: number;
  early_leave_minutes: number;
  method?: StaffAttendanceMethod | null;
  schedule_name?: string;
}

export interface StaffMonthlyRecapItem {
  staff_id: number;
  staff_name: string;
  staff_number?: string;
  staff_type: StaffType;
  department?: string;
  working_days: number;
  present_count: number;
  late_count: number;
  permission_count: number;
  sick_count: number;
  leave_count: number;
  official_duty_count: number;
  absent_count: number;
  missing_checkout_count: number;
  total_late_minutes: number;
  total_early_leave_minutes: number;
  presence_rate: number | null; // (present + late) / working_days * 100
  on_time_rate: number | null; // present / (present + late) * 100
  excused_rate: number | null; // (permission + sick + leave + duty) / working_days * 100
  alpha_rate: number | null; // absent / working_days * 100
}

export interface LateAnalysisItem {
  staff_id: number;
  staff_name: string;
  staff_number?: string;
  staff_type: StaffType;
  department?: string;
  late_days_count: number;
  total_late_minutes: number;
  average_late_minutes: number;
  max_late_minutes: number;
  last_late_date: string;
}

export interface MissingCheckoutItem {
  record_id: number;
  date: string;
  staff_id: number;
  staff_name: string;
  staff_type: StaffType;
  check_in_at: string;
  expected_end: string;
  department?: string;
  method?: StaffAttendanceMethod;
}

export interface DailyTeachingReportItem {
  session_id: number;
  session_date: string;
  period_order: number;
  time_slot: string;
  class_name: string;
  subject_name: string;
  scheduled_teacher_name: string;
  actual_teacher_name: string;
  is_substituted: boolean;
  substitution_reason?: string;
  check_in_at?: string | null;
  status: StaffAttendanceStatus | 'unrecorded';
  late_minutes: number;
  check_out_at?: string | null;
  session_status: TeachingSessionStatus;
  student_count: number;
}

export interface TeacherMonthlyRecapItem {
  staff_id: number;
  teacher_name: string;
  staff_number?: string;
  eligible_sessions: number;
  attended_sessions: number;
  on_time_sessions: number;
  late_sessions: number;
  substituted_away_sessions: number;
  substitute_taught_sessions: number;
  cancelled_sessions: number;
  unrecorded_sessions: number;
  teaching_rate: number | null; // attended / eligible * 100
  on_time_rate: number | null; // on_time / attended * 100
  total_late_minutes: number;
}

export interface DailyTrainingReportItem {
  session_id: number;
  session_date: string;
  extracurricular_name: string;
  scheduled_time: string;
  scheduled_trainer_name: string;
  actual_trainer_name: string;
  is_substituted: boolean;
  check_in_at?: string | null;
  status: StaffAttendanceStatus | 'unrecorded';
  late_minutes: number;
  check_out_at?: string | null;
  realization_status: TrainingRealizationStatus;
  topic?: string;
  student_present_count: number;
}

export interface TrainerMonthlyRecapItem {
  staff_id: number;
  trainer_name: string;
  staff_number?: string;
  primary_extracurricular: string;
  eligible_sessions: number;
  attended_sessions: number;
  on_time_sessions: number;
  late_sessions: number;
  substituted_away_sessions: number;
  substitute_taught_sessions: number;
  cancelled_sessions: number;
  unrecorded_sessions: number;
  realized_sessions: number;
  needs_review_count: number;
  training_rate: number | null; // attended / eligible * 100
  realization_rate: number | null; // realized / eligible * 100
  total_late_minutes: number;
}

export interface ExtracurricularMonthlyRecapItem {
  extracurricular_id: number;
  extracurricular_name: string;
  total_sessions: number;
  eligible_sessions: number;
  realized_sessions: number;
  cancelled_sessions: number;
  trainer_attended_count: number;
  trainer_late_count: number;
  trainer_attendance_rate: number | null;
  realization_rate: number | null;
  avg_student_attendance: number;
  needs_review_count: number;
}

export interface StaffAbsenceReportItem {
  id: number;
  staff_id: number;
  staff_name: string;
  staff_type: StaffType;
  type: 'permission' | 'sick' | 'leave' | 'official_duty';
  start_at: string;
  end_at: string;
  duration_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface StaffCrossDomainSummaryItem {
  staff_id: number;
  staff_name: string;
  staff_number?: string;
  staff_type: StaffType;
  department?: string;
  daily_status_today: string;
  daily_check_in?: string;
  teaching_today: string; // e.g. "3/3 Sesi" or "-"
  training_today: string; // e.g. "1/1 Sesi" or "-"
  current_month_daily_rate: number | null;
  current_month_teaching_rate: number | null;
  current_month_training_rate: number | null;
  active_absence?: string | null;
}

export interface Staff360ProfileData {
  staff: Staff;
  work_schedule_info: {
    schedule_name: string;
    effective_days: string[];
    standard_in: string;
    standard_out: string;
  };
  daily_summary: {
    working_days: number;
    present: number;
    late: number;
    permission: number;
    sick: number;
    leave: number;
    official_duty: number;
    absent: number;
    presence_rate: number | null;
    total_late_minutes: number;
  };
  teaching_summary?: {
    eligible: number;
    attended: number;
    late: number;
    substituted: number;
    cancelled: number;
    teaching_rate: number | null;
  };
  training_summary?: {
    eligible: number;
    attended: number;
    late: number;
    realized: number;
    training_rate: number | null;
  };
  recent_records: StaffAttendanceRecord[];
  absence_history: StaffAbsenceRequest[];
}

export interface StaffIntegratedDashboardData {
  summary_date: string;
  daily: {
    total_staff_active: number;
    staff_by_type: Record<StaffType, number>;
    expected_today: number;
    present: number;
    late: number;
    permission: number;
    sick: number;
    leave: number;
    official_duty: number;
    absent: number;
    not_checked_in: number;
    not_checked_out: number;
    presence_rate: number | null;
    excused_rate: number | null;
    alpha_rate: number | null;
    total_late_minutes: number;
  };
  teaching: {
    scheduled_sessions: number;
    eligible_sessions: number;
    realized_sessions: number;
    attended_sessions: number;
    on_time_sessions: number;
    late_sessions: number;
    substituted_sessions: number;
    cancelled_sessions: number;
    unrecorded_sessions: number;
    needs_review_sessions: number;
    teaching_attendance_rate: number | null;
    on_time_rate: number | null;
  };
  training: {
    total_sessions: number;
    eligible_sessions: number;
    realized_sessions: number;
    trainer_attended: number;
    trainer_on_time: number;
    trainer_late: number;
    trainer_substituted: number;
    cancelled_sessions: number;
    unrecorded_sessions: number;
    needs_review_count: number;
    training_attendance_rate: number | null;
    realization_rate: number | null;
  };
  operational_lists: {
    not_checked_in: Array<{ staff: Staff; expected_start: string; schedule_name: string }>;
    not_checked_out: Array<{ staff: Staff; check_in_at: string; expected_end: string; record_id: number }>;
    late_today: Array<{ staff: Staff; check_in_at: string; expected_start: string; late_minutes: number }>;
    approved_absences: Array<{ staff: Staff; type: string; start_at: string; end_at: string; reason: string }>;
    teaching_needs_review: Array<{ session: TeachingSession; issue: string }>;
    training_needs_review: Array<{ session: TrainingSession; issue: string }>;
  };
  trends: {
    daily: Array<{ date: string; expected: number; present: number; late: number; excused: number; absent: number; presence_rate: number | null }>;
    teaching: Array<{ date: string; eligible: number; attended: number; late: number; substitute: number; cancelled: number; unrecorded: number }>;
    training: Array<{ date: string; eligible: number; realized: number; attended: number; late: number; substitute: number; cancelled: number; needs_review: number }>;
  };
  data_quality: {
    staff_without_schedule: number;
    staff_without_qr: number;
    staff_without_rfid: number;
    missing_checkout_count: number;
    unresolved_teaching_count: number;
    unresolved_training_count: number;
    critical_issues: string[];
  };
}

// ==========================================
// SIUBA v1.2: CUSTOM STUDENT CARD TEMPLATES
// ==========================================

export type CardOrientation = 'landscape' | 'portrait';

export type CardSide = 'front' | 'back';

export type StudentCardElementType = 
  | 'student_photo'
  | 'student_name'
  | 'student_number'
  | 'nisn'
  | 'classroom'
  | 'dormitory'
  | 'room'
  | 'qr_code'
  | 'barcode'
  | 'valid_thru'
  | 'school_name'
  | 'static_text';

export type CardPhotoShape = 'rectangle' | 'rounded' | 'circle';

export interface StudentCardTemplateElement {
  id: string;
  template_id: string;
  element_side: CardSide;
  element_type: StudentCardElementType;
  label: string;
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
  rotation_deg?: number;
  font_size_pt?: number;
  font_weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  font_family?: string;
  text_align?: 'left' | 'center' | 'right';
  color?: string;
  background_color?: string;
  border_radius_mm?: number;
  is_visible: boolean;
  z_index: number;
  photo_shape?: CardPhotoShape;
  object_fit?: 'cover' | 'contain';
  static_text_value?: string;
  max_lines?: number;
  settings?: Record<string, any>;
}

export interface StudentCardTemplate {
  id: string;
  name: string;
  category?: 'reguler' | 'santriwati' | 'smp' | 'smk' | 'asrama' | 'custom' | string;
  description?: string;
  front_image_path?: string | null;
  back_image_path?: string | null;
  bg_fit?: 'cover' | 'contain';
  orientation: CardOrientation;
  width_mm: number;
  height_mm: number;
  bleed_mm: number;
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  elements: StudentCardTemplateElement[];
}

// ==========================================
// SIUBA v1.2: SAFE DATABASE RESET & MAINTENANCE
// ==========================================

export type DatabaseResetMode = 
  | 'MODE_A_OPERATIONAL'
  | 'MODE_B_MASTERS_EXCEPT_CORE'
  | 'MODE_C_FACTORY_RESET';

export interface DatabaseBackupInfo {
  id: string;
  created_at: string;
  size_bytes: number;
  size_human: string;
  checksum_sha256: string;
  verification_status: 'VERIFIED' | 'FAILED' | 'PENDING';
  tables_backed_up: string[];
  total_records_count: number;
  raw_payload_json?: string;
}

export interface DatabaseResetExecutionSummary {
  mode: DatabaseResetMode;
  mode_label: string;
  backup_id: string;
  backup_verified: boolean;
  tables_cleared: Record<string, number>;
  total_rows_deleted: number;
  core_data_restored: Record<string, number>;
  integrity_audit_status: 'PASS' | 'WARN' | 'FAIL';
  integrity_issues_count: number;
  duration_ms: number;
  executed_at: string;
  executed_by: string;
}

export interface DatabaseResetAuditLog {
  id: string;
  event_type: 'database_reset_started' | 'database_reset_completed' | 'database_reset_failed';
  actor_name: string;
  actor_role: string;
  mode: DatabaseResetMode;
  backup_id?: string;
  timestamp: string;
  result: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  error_message?: string;
  details?: Record<string, any>;
}

export interface DatabaseResetSystemConfig {
  allow_database_reset: boolean;
  maintenance_mode: boolean;
  app_env: 'production' | 'staging' | 'local';
}



