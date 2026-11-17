import { apiClient, ApiResponse, isOfflineError } from '../../../services/apiClient';
import { ensureLegacyDataPreserved } from '../../../services/localDataGuard';
import { Student, StudentStatus, Classroom, DormitoryRoom } from '../../../types';
import { StudentIdentityService } from '../../../services/studentIdentityService';
import { isDevelopmentToolsEnabled } from '../../../utils/devTools';

export interface StudentListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  classroom_id?: string | number;
  dormitory_room_id?: string | number;
  gender?: string;
  sort?: string;
}

export interface PaginatedStudentResult {
  data: Student[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

export interface CreateStudentPayload {
  student_number: string;
  nisn: string;
  name: string;
  nickname?: string;
  gender: 'male' | 'female' | 'L' | 'P';
  birth_place?: string;
  birth_date?: string;
  classroom_id?: number | null;
  dormitory_room_id?: number | null;
  generation_year?: number;
  entry_year?: number;
  photo?: string;
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  status?: StudentStatus;
  rfid_uid?: string | null;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {
  is_active?: boolean;
}

// Local cache store key
const LOCAL_STUDENTS_KEY = 'siuba_master_students';
const LOCAL_CLASSROOMS_KEY = 'siuba_master_classrooms';
const LOCAL_ROOMS_KEY = 'siuba_master_dormitory_rooms';

// Internal helpers for persistence fallback
function getLocalStudents(): Student[] {
  // Cache santri dari server; kosong bila perangkat belum pernah sinkron (tidak lagi diisi data contoh).
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalStudents(students: Student[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
    } catch {
      // ignore
    }
  }
}

/** Simpan/perbarui santri dari server ke cache lokal (untuk mode offline). */
function upsertLocalStudents(items: Student[]): void {
  if (!items.length) return;
  // Pertama kali terhubung ke server: buang data contoh (demo) agar tidak tercampur data asli
  let fromServer = false;
  try {
    fromServer = localStorage.getItem('siuba_students_cache_source') === 'server';
    if (!fromServer) {
      // Amankan data lama yang belum dimigrasikan sebelum cache ditimpa data server
      if (!ensureLegacyDataPreserved()) return;
      localStorage.setItem('siuba_students_cache_source', 'server');
    }
  } catch {
    // ignore
  }
  const base = fromServer ? getLocalStudents() : [];
  const all = base.filter((s) => !items.some((i) => String(i.id) === String(s.id)));
  saveLocalStudents([...all, ...items]);
}

function cacheList(key: string, data: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function readCachedList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export const studentApi = {
  /**
   * Fetch paginated student list with search, filter, and sorting
   */
  async getStudents(params: StudentListParams = {}): Promise<PaginatedStudentResult> {
    const {
      page = 1,
      per_page = 10,
      search = '',
      status = 'all',
      classroom_id = 'all',
      dormitory_room_id = 'all',
      gender = 'all',
      sort = 'name_asc',
    } = params;

    try {
      // Attempt backend API call
      const res = await apiClient.get<Student[]>('/students', {
        page,
        per_page,
        search,
        status: status !== 'all' ? status : undefined,
        classroom_id: classroom_id !== 'all' ? classroom_id : undefined,
        dormitory_room_id: dormitory_room_id !== 'all' ? dormitory_room_id : undefined,
        gender: gender !== 'all' ? gender : undefined,
        sort,
      });

      if (res.data && Array.isArray(res.data) && res.meta) {
        upsertLocalStudents(res.data);
        return {
          data: res.data,
          meta: {
            total: res.meta.total || res.data.length,
            page: res.meta.page || page,
            per_page: res.meta.per_page || per_page,
            last_page: res.meta.last_page || Math.ceil((res.meta.total || res.data.length) / per_page),
          },
        };
      }
    } catch (err: any) {
      if (!isOfflineError(err)) throw err;
      console.warn('Server offline, memakai data santri tersimpan:', err.message);
    }

    // Local resilient filtering & pagination
    let all = getLocalStudents();

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      all = all.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.student_number.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.toLowerCase().includes(q)) ||
          (s.guardian_name && s.guardian_name.toLowerCase().includes(q))
      );
    }

    if (status !== 'all') {
      all = all.filter((s) => s.status === status);
    }

    if (classroom_id !== 'all') {
      all = all.filter((s) => String(s.classroom_id) === String(classroom_id));
    }

    if (dormitory_room_id !== 'all') {
      all = all.filter((s) => String(s.dormitory_room_id) === String(dormitory_room_id));
    }

    if (gender !== 'all') {
      all = all.filter((s) => s.gender === gender || (gender === 'male' && s.gender === 'L') || (gender === 'female' && s.gender === 'P'));
    }

    // Sort
    all.sort((a, b) => {
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      if (sort === 'name_desc') return b.name.localeCompare(a.name);
      if (sort === 'nis_asc') return a.student_number.localeCompare(b.student_number);
      if (sort === 'nis_desc') return b.student_number.localeCompare(a.student_number);
      if (sort === 'newest') return (b.id || 0) - (a.id || 0);
      return a.name.localeCompare(b.name);
    });

    const total = all.length;
    const last_page = Math.max(1, Math.ceil(total / per_page));
    const validPage = Math.min(Math.max(1, page), last_page);
    const start = (validPage - 1) * per_page;
    const paginatedData = all.slice(start, start + per_page);

    return {
      data: paginatedData,
      meta: {
        total,
        page: validPage,
        per_page,
        last_page,
      },
    };
  },

  /**
   * Fetch single student by ID
   */
  async getStudentById(id: number | string): Promise<Student> {
    try {
      const res = await apiClient.get<Student>(`/students/${id}`);
      if (res.data) {
        upsertLocalStudents([res.data]);
        return res.data;
      }
    } catch (err: any) {
      if (!isOfflineError(err)) throw err;
      console.warn(`API /students/${id} routed to local storage:`, err.message);
    }

    const all = getLocalStudents();
    const found = all.find((s) => String(s.id) === String(id));
    if (!found) {
      throw new Error(`Data santri dengan ID ${id} tidak ditemukan.`);
    }
    return found;
  },

  /**
   * Create new student
   */
  async createStudent(payload: CreateStudentPayload): Promise<Student> {
    const all = getLocalStudents();

    // Resolve class & room names
    const classrooms: Classroom[] = typeof window !== 'undefined' && localStorage.getItem(LOCAL_CLASSROOMS_KEY)
      ? JSON.parse(localStorage.getItem(LOCAL_CLASSROOMS_KEY)!)
      : [];
    const rooms: DormitoryRoom[] = typeof window !== 'undefined' && localStorage.getItem(LOCAL_ROOMS_KEY)
      ? JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY)!)
      : [];

    const matchedClass = classrooms.find((c) => c.id === payload.classroom_id);
    const matchedRoom = rooms.find((r) => r.id === payload.dormitory_room_id);

    try {
      const res = await apiClient.post<Student>('/students', payload);
      if (res.data) {
        upsertLocalStudents([res.data]);
        return res.data;
      }
    } catch (err: any) {
      if (!isOfflineError(err)) throw err;
      console.warn('Server offline, santri disimpan sementara di perangkat ini:', err.message);
    }

    // Mode offline: cek NIS terhadap data lokal
    const existingNis = all.find((s) => s.student_number.toLowerCase() === payload.student_number.toLowerCase());
    if (existingNis) {
      const err: any = new Error('NIS sudah terdaftar di sistem.');
      err.status = 422;
      err.errors = { student_number: ['NIS ini sudah digunakan oleh santri lain.'] };
      throw err;
    }

    const newId = all.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
    const qr_token = StudentIdentityService.generateQrToken(all.map((s) => s.qr_token));

    const newStudent: Student = {
      id: newId,
      student_number: payload.student_number.trim(),
      nisn: payload.nisn?.trim() || '',
      name: payload.name.trim(),
      nickname: payload.nickname?.trim(),
      gender: payload.gender,
      birth_place: payload.birth_place?.trim(),
      birth_date: payload.birth_date,
      classroom_id: payload.classroom_id || null,
      classroom_name: matchedClass ? matchedClass.name : undefined,
      dormitory_room_id: payload.dormitory_room_id || null,
      dormitory_room_name: matchedRoom ? matchedRoom.name : undefined,
      generation_year: payload.generation_year || new Date().getFullYear(),
      entry_year: payload.entry_year || new Date().getFullYear(),
      photo: payload.photo,
      guardian_name: payload.guardian_name?.trim(),
      guardian_phone: payload.guardian_phone?.trim(),
      address: payload.address?.trim(),
      status: payload.status || 'active',
      is_active: payload.status === 'active',
      qr_token,
      rfid_uid: payload.rfid_uid?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalStudents([...all, newStudent]);
    return newStudent;
  },

  /**
   * Update student details
   */
  async updateStudent(id: number | string, payload: UpdateStudentPayload): Promise<Student> {
    try {
      const res = await apiClient.put<Student>(`/students/${id}`, payload);
      if (res.data) {
        upsertLocalStudents([res.data]);
        return res.data;
      }
    } catch (err: any) {
      if (!isOfflineError(err)) throw err;
      console.warn(`Server offline, perubahan santri ${id} disimpan sementara di perangkat ini:`, err.message);
    }

    const all = getLocalStudents();
    const index = all.findIndex((s) => String(s.id) === String(id));
    if (index === -1) {
      throw new Error(`Data santri dengan ID ${id} tidak ditemukan.`);
    }

    // NIS uniqueness check
    if (payload.student_number) {
      const duplicate = all.find(
        (s) => String(s.id) !== String(id) && s.student_number.toLowerCase() === payload.student_number!.toLowerCase()
      );
      if (duplicate) {
        const err: any = new Error('NIS sudah terdaftar di sistem.');
        err.status = 422;
        err.errors = { student_number: ['NIS ini sudah digunakan oleh santri lain.'] };
        throw err;
      }
    }


    // Resolve class & room names if changed
    const classrooms: Classroom[] = typeof window !== 'undefined' && localStorage.getItem(LOCAL_CLASSROOMS_KEY)
      ? JSON.parse(localStorage.getItem(LOCAL_CLASSROOMS_KEY)!)
      : [];
    const rooms: DormitoryRoom[] = typeof window !== 'undefined' && localStorage.getItem(LOCAL_ROOMS_KEY)
      ? JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY)!)
      : [];

    const matchedClass = payload.classroom_id ? classrooms.find((c) => c.id === payload.classroom_id) : undefined;
    const matchedRoom = payload.dormitory_room_id ? rooms.find((r) => r.id === payload.dormitory_room_id) : undefined;

    const existing = all[index];
    const updated: Student = {
      ...existing,
      ...payload,
      classroom_name: matchedClass ? matchedClass.name : (payload.classroom_id === null ? undefined : existing.classroom_name),
      dormitory_room_name: matchedRoom ? matchedRoom.name : (payload.dormitory_room_id === null ? undefined : existing.dormitory_room_name),
      is_active: payload.status ? payload.status === 'active' : (payload.is_active !== undefined ? payload.is_active : existing.is_active),
      updated_at: new Date().toISOString(),
    };

    all[index] = updated;
    saveLocalStudents(all);
    return updated;
  },

  /**
   * Change student lifecycle status (active, inactive, graduated, transferred, resigned)
   */
  async updateStatus(id: number | string, newStatus: StudentStatus): Promise<Student> {
    return this.updateStudent(id, {
      status: newStatus,
      is_active: newStatus === 'active',
    });
  },

  /**
   * Fetch academic master classes for filter and select
   */
  async getClassrooms(): Promise<Classroom[]> {
    try {
      const res = await apiClient.get<Classroom[]>('/classrooms');
      if (res.data && Array.isArray(res.data)) {
        cacheList(LOCAL_CLASSROOMS_KEY, res.data);
        return res.data;
      }
    } catch (err: any) {
      if (!isOfflineError(err)) throw err;
    }
    return readCachedList<Classroom>(LOCAL_CLASSROOMS_KEY, []);
  },

  /**
   * Fetch dormitory rooms for filter and select
   */
  async getDormitoryRooms(): Promise<DormitoryRoom[]> {
    try {
      const res = await apiClient.get<DormitoryRoom[]>('/dormitory-rooms');
      if (res.data && Array.isArray(res.data)) {
        cacheList(LOCAL_ROOMS_KEY, res.data);
        return res.data;
      }
    } catch (err: any) {
      if (!isOfflineError(err)) throw err;
    }
    return readCachedList<DormitoryRoom>(LOCAL_ROOMS_KEY, []);
  },
};
