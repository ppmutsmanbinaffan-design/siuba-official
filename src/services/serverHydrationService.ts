/**
 * Mengisi state awal aplikasi (App.tsx) dari server Laravel setelah login,
 * menggantikan data contoh / localStorage. Jika server tidak terjangkau, data lokal tetap dipakai.
 */
import { apiClient, isOfflineError } from './apiClient';
import { ensureLegacyDataPreserved } from './localDataGuard';
import type {
  AttendanceDevice,
  AttendanceRecord,
  AttendanceSession,
  AttendanceSessionParticipant,
  Classroom,
  Dormitory,
  DormitoryRoom,
  Staff,
  Student,
  User,
} from '../types';

export interface ServerSnapshot {
  students?: Student[];
  classrooms?: Classroom[];
  dormitories?: Dormitory[];
  dormitoryRooms?: DormitoryRoom[];
  sessions?: AttendanceSession[];
  participants?: AttendanceSessionParticipant[];
  records?: AttendanceRecord[];
  devices?: AttendanceDevice[];
  staff?: Staff[];
  users?: User[];
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

export async function loadServerSnapshot(options: { attendanceOnly?: boolean } = {}): Promise<ServerSnapshot> {
  const errors: string[] = [];

  if (options.attendanceOnly) {
    const [attendance, devices] = await Promise.all([
      attempt('Absensi', async () => ((await apiClient.get<any>('/attendance/snapshot')) as any).data, errors),
      attempt('Perangkat', async () => ((await apiClient.get<AttendanceDevice[]>('/attendance/devices')) as any).data as AttendanceDevice[], errors),
    ]);
    return { sessions: attendance?.sessions, participants: attendance?.participants, records: attendance?.records, devices, errors };
  }

  const [students, classrooms, dormitories, dormitoryRooms, attendance, devices, staff, users] = await Promise.all([
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
    staff,
    users,
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
  write('siuba_master_staff', snap.staff);
  try {
    if (snap.students) localStorage.setItem('siuba_students_cache_source', 'server');
    if (snap.staff) localStorage.setItem('siuba_staff_cache_source', 'server');
  } catch {
    // ignore
  }
}
