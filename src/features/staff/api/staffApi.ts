import { apiClient } from '../../../services/apiClient';
import { Staff, StaffType, StaffEmploymentStatus, User } from '../../../types';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';
import { INITIAL_USERS } from '../../../data/initialData';
import { isDevelopmentToolsEnabled } from '../../../utils/devTools';

export interface StaffListParams {
  page?: number;
  per_page?: number;
  search?: string;
  staff_type?: string;
  employment_status?: string;
  is_active?: string | boolean;
  sort?: string;
}

export interface PaginatedStaffResult {
  data: Staff[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

export interface CreateStaffPayload {
  staff_number: string;
  name: string;
  gender: 'male' | 'female' | 'L' | 'P';
  staff_type: StaffType;
  employment_status: StaffEmploymentStatus;
  phone: string;
  email?: string;
  department?: string;
  position?: string;
  join_date?: string;
  requires_daily_attendance?: boolean;
  is_active?: boolean;
  user_id?: number | null;
  rfid_uid?: string | null;
  photo?: string;
}

export interface UpdateStaffPayload extends Partial<CreateStaffPayload> {}

const LOCAL_STAFF_KEY = 'siuba_master_staff';
const LOCAL_USERS_KEY = 'siuba_master_users';

function getLocalStaff(): Staff[] {
  if (typeof window === 'undefined') return StaffIdentityResolver.getInitialStaff();
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_KEY);
    if (raw === null) {
      const initial = StaffIdentityResolver.getInitialStaff();
      localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = StaffIdentityResolver.getInitialStaff();
      localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return StaffIdentityResolver.getInitialStaff();
  }
}

function saveLocalStaff(staff: Staff[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(staff));
    } catch {
      // ignore
    }
  }
}

export const staffApi = {
  /**
   * Fetch paginated staff list with search, filter, and sorting
   */
  async getStaffList(params: StaffListParams = {}): Promise<PaginatedStaffResult> {
    const {
      page = 1,
      per_page = 10,
      search = '',
      staff_type = 'all',
      employment_status = 'all',
      is_active = 'all',
      sort = 'name_asc',
    } = params;

    try {
      const res = await apiClient.get<Staff[]>('/staff', {
        page,
        per_page,
        search,
        staff_type: staff_type !== 'all' ? staff_type : undefined,
        employment_status: employment_status !== 'all' ? employment_status : undefined,
        is_active: is_active !== 'all' ? is_active : undefined,
        sort,
      });

      if (res.data && Array.isArray(res.data) && res.meta) {
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
      console.warn('API /staff resolved to local repository:', err.message);
    }

    let all = getLocalStaff();

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      all = all.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.staff_number.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.position && s.position.toLowerCase().includes(q))
      );
    }

    if (staff_type !== 'all') {
      all = all.filter((s) => s.staff_type === staff_type);
    }

    if (employment_status !== 'all') {
      all = all.filter((s) => s.employment_status === employment_status);
    }

    if (is_active !== 'all') {
      const boolVal = is_active === 'true' || is_active === true;
      all = all.filter((s) => s.is_active === boolVal);
    }

    // Sort
    all.sort((a, b) => {
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      if (sort === 'name_desc') return b.name.localeCompare(a.name);
      if (sort === 'number_asc') return a.staff_number.localeCompare(b.staff_number);
      if (sort === 'number_desc') return b.staff_number.localeCompare(a.staff_number);
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
   * Fetch single staff by ID
   */
  async getStaffById(id: number | string): Promise<Staff> {
    try {
      const res = await apiClient.get<Staff>(`/staff/${id}`);
      if (res.data) return res.data;
    } catch (err: any) {
      console.warn(`API /staff/${id} routed to local storage:`, err.message);
    }

    const all = getLocalStaff();
    const found = all.find((s) => String(s.id) === String(id));
    if (!found) {
      throw new Error(`Data SDM dengan ID ${id} tidak ditemukan.`);
    }
    return found;
  },

  /**
   * Create new staff
   */
  async createStaff(payload: CreateStaffPayload): Promise<Staff> {
    const all = getLocalStaff();
    const existing = all.find((s) => s.staff_number.toLowerCase() === payload.staff_number.toLowerCase());
    if (existing) {
      const err: any = new Error('Nomor SDM / NIP sudah terdaftar di sistem.');
      err.status = 422;
      err.errors = { staff_number: ['Nomor identitas SDM ini sudah digunakan.'] };
      throw err;
    }

    try {
      const res = await apiClient.post<Staff>('/staff', payload);
      if (res.data) {
        saveLocalStaff([...all, res.data]);
        return res.data;
      }
    } catch (err: any) {
      if (err.status === 422) throw err;
      console.warn('API /staff POST failed, saving locally:', err.message);
    }

    const normalizedGender: 'male' | 'female' = 
      payload.gender === 'female' || payload.gender === 'P' ? 'female' : 'male';

    const newId = all.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
    const newStaff: Staff = {
      id: newId,
      staff_number: payload.staff_number.trim(),
      name: payload.name.trim(),
      gender: normalizedGender,
      staff_type: payload.staff_type,
      employment_status: payload.employment_status,
      phone: payload.phone.trim(),
      email: payload.email?.trim() || '',
      department: payload.department?.trim() || '',
      position: payload.position?.trim() || '',
      join_date: payload.join_date || new Date().toISOString().substring(0, 10),
      requires_daily_attendance: payload.requires_daily_attendance !== undefined ? payload.requires_daily_attendance : true,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      user_id: payload.user_id || null,
      rfid_uid: payload.rfid_uid?.trim() || null,
      qr_token: `STF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalStaff([...all, newStaff]);
    return newStaff;
  },

  /**
   * Update staff
   */
  async updateStaff(id: number | string, payload: UpdateStaffPayload): Promise<Staff> {
    const all = getLocalStaff();
    const index = all.findIndex((s) => String(s.id) === String(id));
    if (index === -1) {
      throw new Error(`Data SDM dengan ID ${id} tidak ditemukan.`);
    }

    if (payload.staff_number) {
      const duplicate = all.find(
        (s) => String(s.id) !== String(id) && s.staff_number.toLowerCase() === payload.staff_number!.toLowerCase()
      );
      if (duplicate) {
        const err: any = new Error('Nomor SDM sudah terdaftar di sistem.');
        err.status = 422;
        err.errors = { staff_number: ['Nomor identitas SDM ini sudah digunakan.'] };
        throw err;
      }
    }

    try {
      const res = await apiClient.put<Staff>(`/staff/${id}`, payload);
      if (res.data) {
        all[index] = res.data;
        saveLocalStaff(all);
        return res.data;
      }
    } catch (err: any) {
      if (err.status === 422) throw err;
      console.warn(`API /staff/${id} PUT failed, updating locally:`, err.message);
    }

    const existing = all[index];
    const normalizedGender: 'male' | 'female' = payload.gender
      ? payload.gender === 'female' || payload.gender === 'P'
        ? 'female'
        : 'male'
      : existing.gender;

    const updated: Staff = {
      ...existing,
      ...payload,
      gender: normalizedGender,
      updated_at: new Date().toISOString(),
    };

    all[index] = updated;
    saveLocalStaff(all);
    return updated;
  },

  /**
   * Toggle staff active/inactive
   */
  async toggleActive(id: number | string): Promise<Staff> {
    const staff = await this.getStaffById(id);
    return this.updateStaff(id, { is_active: !staff.is_active });
  },

  /**
   * Get available system users for linking
   */
  async getUsers(): Promise<User[]> {
    try {
      const res = await apiClient.get<User[]>('/users');
      if (res.data && Array.isArray(res.data)) return res.data;
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  },
};
