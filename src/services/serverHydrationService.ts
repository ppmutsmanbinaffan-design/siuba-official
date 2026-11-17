/**
 * Mengisi state awal aplikasi (App.tsx) dari server Laravel setelah login,
 * menggantikan data contoh / localStorage. Jika server tidak terjangkau, data lokal tetap dipakai.
 */
import { apiClient, isOfflineError } from './apiClient';
import { ensureLegacyDataPreserved } from './localDataGuard';
import type {
  AttendanceDeviceLog,
  AttendanceRecordHistory,
  AttendanceDevice,
  AttendanceRecord,
  AttendanceSession,
  AttendanceSessionParticipant,
  Classroom,
  Dormitory,
  DormitoryRoom,
  Staff,
  Student,
  StudentExcusal,
  StaffAttendanceRecord,
  StaffAbsenceRequest,
  User,
} from '../types';
import { mergeServerDailyRecords } from '../features/staff-attendance/api/staffAttendanceApi';
import { todayLocalDate } from '../utils/today';

export interface AcademicMaster {
  academic_years: any[];
  semesters: any[];
  subjects: any[];
  lesson_periods: any[];
  teachers: any[];
  teaching_assignments: any[];
  academic_schedules: any[];
  calendar_events: any[];
  session_contexts: any[];
  substitutions: any[];
}

export interface CommunityMaster {
  activities: any[];
  extracurriculars: any[];
  extracurricular_members: any[];
  halaqahs: any[];
  halaqah_members: any[];
  duty_rosters: any[];
  events: any[];
  event_sessions: any[];
  event_registrations: any[];
  event_organizers: any[];
  participant_rules: any[];
  student_groups?: any[];
  student_group_members?: any[];
}

export interface RoutineMaster {
  categories: any[];
  activities: any[];
  routine_schedules: any[];
  routine_overrides: any[];
  prayer_calendars: any[];
  supervisors: any[];
}

export interface ServerSnapshot {
  students?: Student[];
  classrooms?: Classroom[];
  dormitories?: Dormitory[];
  dormitoryRooms?: DormitoryRoom[];
  sessions?: AttendanceSession[];
  participants?: AttendanceSessionParticipant[];
  records?: AttendanceRecord[];
  devices?: AttendanceDevice[];
  deviceLogs?: AttendanceDeviceLog[];
  recordHistories?: AttendanceRecordHistory[];
  staff?: Staff[];
  users?: User[];
  excusals?: StudentExcusal[];
  staffDaily?: StaffAttendanceRecord[];
  staffAbsences?: StaffAbsenceRequest[];
  academic?: AcademicMaster;
  community?: CommunityMaster;
  routine?: RoutineMaster;
  errors: string[];
}

async function fetchAllStudents(): Promise<Student[]> {
  const all: Student[] = [];
  for (let page = 1; page <= 40; page++) {
    const res: any = await apiClient.get<Student[]>('/students', { page, per_page: 500, sort: 'name_asc' });
    const rows: Student[] = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    const last = res?.meta?.last_page ?? 1;
    if (page >= last || rows.length === 0) break;
  }
  return all;
}

async function fetchAllStaff(): Promise<Staff[]> {
  const all: Staff[] = [];
  for (let page = 1; page <= 20; page++) {
    const res: any = await apiClient.get<Staff[]>('/staff', { page, per_page: 500 });
    const rows: Staff[] = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    if (page >= (res?.meta?.last_page ?? 1) || rows.length === 0) break;
  }
  return all;
}

/** Jalankan satu permintaan; izin ditolak (403) diabaikan dengan tenang, offline dilaporkan. */
async function attempt<T>(label: string, fn: () => Promise<T>, errors: string[]): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.status === 403) return undefined; // pengguna memang tidak berhak melihat data ini
    errors.push(`${label}: ${isOfflineError(err) ? 'server tidak terjangkau' : err?.message || 'gagal'}`);
    return undefined;
  }
}

async function fetchDeviceLogs(): Promise<AttendanceDeviceLog[]> {
  return ((await apiClient.get<AttendanceDeviceLog[]>('/attendance/device-logs', { limit: 300 })) as any).data as AttendanceDeviceLog[];
}

export async function loadServerSnapshot(options: { attendanceOnly?: boolean } = {}): Promise<ServerSnapshot> {
  const errors: string[] = [];

  const dailyExtras = () =>
    Promise.all([
      attempt('KBM', async () => ((await apiClient.get<AcademicMaster>('/academic/master')) as any).data as AcademicMaster, errors),
      attempt('Izin santri', async () => ((await apiClient.get<StudentExcusal[]>('/student-excusals')) as any).data as StudentExcusal[], errors),
      attempt('Presensi SDM', async () => ((await apiClient.get<StaffAttendanceRecord[]>('/staff-attendance/daily')) as any).data as StaffAttendanceRecord[], errors),
      attempt('Izin SDM', async () => ((await apiClient.get<StaffAbsenceRequest[]>('/staff-attendance/absences')) as any).data as StaffAbsenceRequest[], errors),
      attempt('Kegiatan & jadwal rutin', async () => ((await apiClient.get<RoutineMaster>('/routine-master')) as any).data as RoutineMaster, errors),
      attempt('Ekskul/Halaqah/Event', async () => ((await apiClient.get<CommunityMaster>('/community/master')) as any).data as CommunityMaster, errors),
    ] as const);

  if (options.attendanceOnly) {
    const [attendance, devices, [academic, excusals, staffDaily, staffAbsences, routine, community]] = await Promise.all([
      attempt('Absensi', async () => ((await apiClient.get<any>('/attendance/snapshot')) as any).data, errors),
      attempt('Perangkat', async () => ((await apiClient.get<AttendanceDevice[]>('/attendance/devices')) as any).data as AttendanceDevice[], errors),
      dailyExtras(),
    ]);
    const deviceLogs = await attempt('Log perangkat', fetchDeviceLogs, errors);
    return {
      sessions: attendance?.sessions, participants: attendance?.participants, records: attendance?.records, devices,
      deviceLogs, recordHistories: attendance?.record_histories,
      excusals, staffDaily, staffAbsences, academic, community, routine, errors,
    };
  }

  const [[academic, excusals, staffDaily, staffAbsences, routine, community], students, classrooms, dormitories, dormitoryRooms, attendance, devices, staff, users, deviceLogs] = await Promise.all([
    dailyExtras(),
    attempt('Santri', fetchAllStudents, errors),
    attempt('Kelas', async () => ((await apiClient.get<Classroom[]>('/classrooms')) as any).data as Classroom[], errors),
    attempt('Asrama', async () => ((await apiClient.get<Dormitory[]>('/dormitories')) as any).data as Dormitory[], errors),
    attempt('Kamar', async () => ((await apiClient.get<DormitoryRoom[]>('/dormitory-rooms')) as any).data as DormitoryRoom[], errors),
    attempt('Absensi', async () => ((await apiClient.get<any>('/attendance/snapshot')) as any).data, errors),
    attempt('Perangkat', async () => ((await apiClient.get<AttendanceDevice[]>('/attendance/devices')) as any).data as AttendanceDevice[], errors),
    attempt('SDM', fetchAllStaff, errors),
    attempt('Pengguna', async () => {
      const res: any = await apiClient.get<User[]>('/users');
      return (Array.isArray(res?.users) ? res.users : res?.data) as User[];
    }, errors),
    attempt('Log perangkat', fetchDeviceLogs, errors),
  ]);

  return {
    students,
    classrooms,
    dormitories,
    dormitoryRooms,
    sessions: attendance?.sessions,
    participants: attendance?.participants,
    records: attendance?.records,
    devices,
    deviceLogs,
    recordHistories: attendance?.record_histories,
    staff,
    users,
    excusals,
    staffDaily,
    staffAbsences,
    academic,
    community,
    routine,
    errors,
  };
}

/**
 * Simpan hasil server ke cache localStorage (untuk mode offline & komponen lama yang membaca cache),
 * hanya setelah data lama yang belum dimigrasikan diamankan.
 */
export function persistSnapshotToCache(snap: ServerSnapshot): void {
  if (!ensureLegacyDataPreserved()) return;
  const write = (key: string, value: unknown) => {
    if (value === undefined) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // kuota penuh: abaikan, state di memori tetap memakai data server
    }
  };
  write('siuba_master_students', snap.students);
  write('siuba_master_classrooms', snap.classrooms);
  write('siuba_master_dormitories', snap.dormitories);
  write('siuba_master_dormitory_rooms', snap.dormitoryRooms);
  write('siuba_attendance_sessions_cache', snap.sessions);
  write('siuba_session_participants_cache', snap.participants);
  write('siuba_attendance_records_cache', snap.records);
  write('siuba_attendance_devices_cache', snap.devices);
  write('siuba_attendance_device_logs_cache', snap.deviceLogs);
  write('siuba_record_histories_cache', snap.recordHistories);
  if (snap.academic?.calendar_events) {
    // Hari libur & kalender akademik untuk penentuan jadwal kerja SDM dan sesi latihan
    write('siuba_calendar_holidays', snap.academic.calendar_events);
    write('siuba_academic_calendar_events', snap.academic.calendar_events);
  }
  if (snap.routine) {
    write('siuba_master_activities', snap.routine.activities);
    if (Array.isArray(snap.routine.categories) && snap.routine.categories.length) write('siuba_activity_categories', snap.routine.categories);
  }
  write('siuba_master_staff', snap.staff);
  write('siuba_student_excusals_v1', snap.excusals);
  write('siuba_staff_absence_requests', snap.staffAbsences);
  if (snap.staffDaily) mergeServerDailyRecords(snap.staffDaily, [todayLocalDate()]);
  write('siuba_staff_master', snap.staff); // daftar SDM yang dibaca halaman Presensi SDM
  try {
    if (snap.students) localStorage.setItem('siuba_students_cache_source', 'server');
    if (snap.staff) localStorage.setItem('siuba_staff_cache_source', 'server');
  } catch {
    // ignore
  }
}
