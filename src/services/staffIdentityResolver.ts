import { Staff, Gender, StaffType, StaffEmploymentStatus } from '../types';
import { AuditService } from './auditService';

export class StaffIdentityResolver {
  private static STORAGE_KEY = 'siuba_staff_master';

  public static getInitialStaff(): Staff[] {
    return [
      {
        id: 1,
        user_id: 2,
        staff_number: 'STF260001',
        name: 'Ust. Ahmad Fauzi, S.Kom',
        gender: 'male',
        staff_type: 'teacher',
        employment_status: 'permanent',
        phone: '081234567801',
        email: 'ahmad.fauzi@pesantren.id',
        qr_token: 'STF-K7P9NX26QM',
        rfid_uid: 'STF-E20011',
        department: 'Kurikulum & TIK',
        position: 'Guru TIK & IT Lead',
        join_date: '2020-07-01',
        requires_daily_attendance: true,
        is_active: true,
      },
      {
        id: 2,
        user_id: 3,
        staff_number: 'STF260002',
        name: 'Ust. Dr. M. Rasyid',
        gender: 'male',
        staff_type: 'teacher',
        employment_status: 'permanent',
        phone: '081234567802',
        email: 'm.rasyid@pesantren.id',
        qr_token: 'STF-R8W2MV91LP',
        rfid_uid: 'STF-E20012',
        department: 'Kepengasuhan & KBM',
        position: 'Kepala Sekolah & Guru Fiqih',
        join_date: '2018-07-01',
        requires_daily_attendance: true,
        is_active: true,
      },
      {
        id: 3,
        user_id: null,
        staff_number: 'STF260003',
        name: 'Ust. M. Ridwan, M.Pd',
        gender: 'male',
        staff_type: 'teacher',
        employment_status: 'permanent',
        phone: '081234567803',
        email: 'ridwan@pesantren.id',
        qr_token: 'STF-B4N7QL39ZK',
        rfid_uid: 'STF-E20013',
        department: 'Bahasa Arab',
        position: 'Guru Bahasa Arab',
        join_date: '2021-08-01',
        requires_daily_attendance: true,
        is_active: true,
      },
      {
        id: 4,
        user_id: null,
        staff_number: 'STF260004',
        name: 'Ust. Dimas Wahyudi',
        gender: 'male',
        staff_type: 'trainer',
        employment_status: 'contract',
        phone: '081234567804',
        email: 'dimas.panahan@pesantren.id',
        qr_token: 'STF-X9T3KJ71VM',
        rfid_uid: 'STF-E20014',
        department: 'Ekstrakurikuler',
        position: 'Pelatih Panahan & Olahraga',
        join_date: '2022-01-10',
        requires_daily_attendance: false,
        is_active: true,
      },
      {
        id: 5,
        user_id: 4,
        staff_number: 'STF260005',
        name: 'Ust. Hamzah As-Salimi',
        gender: 'male',
        staff_type: 'musyrif',
        employment_status: 'permanent',
        phone: '081234567805',
        email: 'hamzah@pesantren.id',
        qr_token: 'STF-M5K8PL23WQ',
        rfid_uid: 'STF-E20015',
        department: 'Asrama Umar Bin Khattab',
        position: 'Kepala Asrama Putra',
        join_date: '2019-06-01',
        requires_daily_attendance: true,
        is_active: true,
      },
      {
        id: 6,
        user_id: null,
        staff_number: 'STF260006',
        name: 'Ust. Salman Al-Farisi',
        gender: 'male',
        staff_type: 'musyrif',
        employment_status: 'permanent',
        phone: '081234567806',
        email: 'salman.asrama@pesantren.id',
        qr_token: 'STF-S3H9KL44TR',
        rfid_uid: 'STF-E20016',
        department: 'Asrama Utsman',
        position: 'Musyrif Kamar & Tahfidz',
        join_date: '2023-07-01',
        requires_daily_attendance: true,
        is_active: true,
      },
      {
        id: 7,
        user_id: null,
        staff_number: 'STF260007',
        name: 'Hj. Siti Rahmah, S.E',
        gender: 'female',
        staff_type: 'administration',
        employment_status: 'permanent',
        phone: '081234567807',
        email: 'siti.tu@pesantren.id',
        qr_token: 'STF-P2W5NT88YX',
        rfid_uid: 'STF-E20017',
        department: 'Tata Usaha & Keuangan',
        position: 'Kepala Bagian Administrasi / TU',
        join_date: '2017-04-01',
        requires_daily_attendance: true,
        is_active: true,
      },
      {
        id: 8,
        user_id: null,
        staff_number: 'STF260008',
        name: 'Pak Joko Santoso',
        gender: 'male',
        staff_type: 'employee',
        employment_status: 'permanent',
        phone: '081234567808',
        email: 'joko.sarpras@pesantren.id',
        qr_token: 'STF-J7N4QM11KV',
        rfid_uid: 'STF-E20018',
        department: 'Sarana & Prasarana',
        position: 'Staf Pemeliharaan & Umum',
        join_date: '2020-02-15',
        requires_daily_attendance: true,
        is_active: true,
      }
    ];
  }

  public static getStaffList(): Staff[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored staff list', e);
    }
    const initial = this.getInitialStaff();
    this.saveStaffList(initial);
    return initial;
  }

  public static saveStaffList(staff: Staff[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(staff));
    } catch (e) {
      console.error('Failed to save staff list', e);
    }
  }

  public static normalizeRfidUid(uid: string): string {
    if (!uid) return '';
    return uid.trim().toUpperCase().replace(/[\s\-:]/g, '');
  }

  public static resolveByQrToken(qrToken: string, staffList?: Staff[]): Staff | null {
    if (!qrToken) return null;
    const list = staffList || this.getStaffList();
    const token = qrToken.trim();
    return list.find(s => s.is_active && s.qr_token === token) || null;
  }

  public static resolveByRfidUid(rfidUid: string, staffList?: Staff[]): Staff | null {
    if (!rfidUid) return null;
    const list = staffList || this.getStaffList();
    const normalized = this.normalizeRfidUid(rfidUid);
    return list.find(s => s.is_active && s.rfid_uid && this.normalizeRfidUid(s.rfid_uid) === normalized) || null;
  }

  public static resolveByStaffNumber(staffNumber: string, staffList?: Staff[]): Staff | null {
    if (!staffNumber) return null;
    const list = staffList || this.getStaffList();
    const num = staffNumber.trim().toUpperCase();
    return list.find(s => s.is_active && s.staff_number.toUpperCase() === num) || null;
  }

  public static resolveByIdentifier(identifier: string, staffList?: Staff[]): Staff | null {
    if (!identifier) return null;
    const trimmed = identifier.trim();
    // Try staff number
    let staff = this.resolveByStaffNumber(trimmed, staffList);
    if (staff) return staff;
    // Try QR Token
    staff = this.resolveByQrToken(trimmed, staffList);
    if (staff) return staff;
    // Try RFID UID
    staff = this.resolveByRfidUid(trimmed, staffList);
    if (staff) return staff;
    return null;
  }

  public static resolveById(id: number, staffList?: Staff[]): Staff | null {
    const list = staffList || this.getStaffList();
    return list.find(s => s.id === id) || null;
  }

  public static resolveByEmail(email: string, staffList?: Staff[]): Staff | null {
    if (!email) return null;
    const list = staffList || this.getStaffList();
    const cleanEmail = email.trim().toLowerCase();
    return list.find(s => s.is_active && s.email && s.email.trim().toLowerCase() === cleanEmail) || null;
  }

  public static resolveByUserId(userId: number, staffList?: Staff[]): Staff | null {
    if (!userId) return null;
    const list = staffList || this.getStaffList();
    return list.find(s => s.is_active && s.user_id === userId) || null;
  }

  public static generateOpaqueQrToken(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 10; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `STF-${rand}`;
  }

  public static regenerateQrToken(staffId: number, operatorName: string = 'System Admin'): { success: boolean; new_token?: string; message: string } {
    const list = this.getStaffList();
    const index = list.findIndex(s => s.id === staffId);
    if (index === -1) {
      return { success: false, message: 'Staff tidak ditemukan' };
    }

    const oldToken = list[index].qr_token;
    const newToken = this.generateOpaqueQrToken();
    list[index].qr_token = newToken;
    list[index].updated_at = new Date().toISOString();

    this.saveStaffList(list);

    AuditService.log({
      event: 'qr_regenerated',
      auditable_type: 'Staff',
      auditable_id: staffId,
      auditable_name: list[index].name,
      old_values: { qr_token: oldToken },
      new_values: { qr_token: newToken },
      reason: `QR Token di-generate ulang oleh ${operatorName}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, new_token: newToken, message: 'QR Token berhasil diperbarui' };
  }

  public static assignRfidUid(staffId: number, rfidUid: string, operatorName: string = 'System Admin'): { success: boolean; message: string } {
    const list = this.getStaffList();
    const normalized = this.normalizeRfidUid(rfidUid);

    // Check duplicate RFID
    const duplicate = list.find(s => s.id !== staffId && s.rfid_uid && this.normalizeRfidUid(s.rfid_uid) === normalized);
    if (duplicate) {
      return { success: false, message: `Kartu RFID sudah terdaftar atas nama ${duplicate.name} (${duplicate.staff_number})` };
    }

    const index = list.findIndex(s => s.id === staffId);
    if (index === -1) {
      return { success: false, message: 'Staff tidak ditemukan' };
    }

    const oldUid = list[index].rfid_uid;
    list[index].rfid_uid = normalized;
    list[index].updated_at = new Date().toISOString();

    this.saveStaffList(list);

    AuditService.log({
      event: 'rfid_assigned',
      auditable_type: 'Staff',
      auditable_id: staffId,
      auditable_name: list[index].name,
      old_values: { rfid_uid: oldUid },
      new_values: { rfid_uid: normalized },
      reason: `UID RFID ${normalized} di-assign untuk ${list[index].name}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, message: 'Kartu RFID berhasil ditugaskan' };
  }

  public static removeRfidUid(staffId: number, operatorName: string = 'System Admin'): { success: boolean; message: string } {
    const list = this.getStaffList();
    const index = list.findIndex(s => s.id === staffId);
    if (index === -1) {
      return { success: false, message: 'Staff tidak ditemukan' };
    }

    const oldUid = list[index].rfid_uid;
    list[index].rfid_uid = null;
    list[index].updated_at = new Date().toISOString();

    this.saveStaffList(list);

    AuditService.log({
      event: 'rfid_removed',
      auditable_type: 'Staff',
      auditable_id: staffId,
      auditable_name: list[index].name,
      old_values: { rfid_uid: oldUid },
      new_values: { rfid_uid: null },
      reason: `UID RFID dihapus untuk ${list[index].name}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, message: 'Kartu RFID berhasil dilepas' };
  }

  public static isStaffEligibleOnDate(staff: Staff, targetDate: string): boolean {
    if (!staff.is_active) return false;
    if (staff.requires_daily_attendance === false) return false;

    if (staff.join_date && staff.join_date > targetDate) {
      return false;
    }

    if (staff.leave_date && staff.leave_date < targetDate) {
      return false;
    }

    return true;
  }

  public static createStaff(
    data: Omit<Staff, 'id' | 'qr_token'> & { qr_token?: string }, 
    operatorName: string = 'System Admin'
  ): { success: boolean; staff?: Staff; message: string } {
    const list = this.getStaffList();

    // Check unique staff_number
    if (list.some(s => s.staff_number.toUpperCase() === data.staff_number.trim().toUpperCase())) {
      return { success: false, message: `Nomor Induk SDM / NIP ${data.staff_number} sudah digunakan` };
    }

    // Check unique user_id if set
    if (data.user_id && list.some(s => s.user_id === data.user_id && s.is_active)) {
      return { success: false, message: `Akun pengguna login sudah terhubung ke staf lain yang aktif` };
    }

    const token = data.qr_token || this.generateOpaqueQrToken();
    const normalizedRfid = data.rfid_uid ? this.normalizeRfidUid(data.rfid_uid) : null;

    if (normalizedRfid && list.some(s => s.rfid_uid && this.normalizeRfidUid(s.rfid_uid) === normalizedRfid)) {
      return { success: false, message: `Kartu RFID ${normalizedRfid} sudah terdaftar pada staf lain` };
    }

    const nextId = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newStaff: Staff = {
      ...data,
      id: nextId,
      staff_number: data.staff_number.trim().toUpperCase(),
      name: data.name.trim(),
      qr_token: token,
      rfid_uid: normalizedRfid,
      requires_daily_attendance: data.requires_daily_attendance !== false,
      is_active: data.is_active !== false,
      created_at: now,
      updated_at: now,
    };

    list.push(newStaff);
    this.saveStaffList(list);

    AuditService.log({
      event: 'staff_created',
      auditable_type: 'Staff',
      auditable_id: newStaff.id,
      auditable_name: newStaff.name,
      new_values: newStaff,
      reason: `Penambahan data master SDM baru (${newStaff.staff_number} - ${newStaff.name})`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, staff: newStaff, message: 'Data staf berhasil ditambahkan' };
  }

  public static updateStaff(
    staffId: number, 
    data: Partial<Staff>, 
    operatorName: string = 'System Admin'
  ): { success: boolean; staff?: Staff; message: string } {
    const list = this.getStaffList();
    const index = list.findIndex(s => s.id === staffId);
    if (index === -1) {
      return { success: false, message: 'Staff tidak ditemukan' };
    }

    const oldStaff = { ...list[index] };

    // Validate staff number uniqueness if changed
    if (data.staff_number && data.staff_number.toUpperCase() !== oldStaff.staff_number.toUpperCase()) {
      if (list.some(s => s.id !== staffId && s.staff_number.toUpperCase() === data.staff_number!.trim().toUpperCase())) {
        return { success: false, message: `Nomor Induk SDM ${data.staff_number} sudah digunakan` };
      }
    }

    // Validate RFID uniqueness if changed
    if (data.rfid_uid) {
      const norm = this.normalizeRfidUid(data.rfid_uid);
      if (list.some(s => s.id !== staffId && s.rfid_uid && this.normalizeRfidUid(s.rfid_uid) === norm)) {
        return { success: false, message: `Kartu RFID ${norm} sudah terdaftar pada staf lain` };
      }
      data.rfid_uid = norm;
    }

    // Validate user_id uniqueness if changed
    if (data.user_id && data.user_id !== oldStaff.user_id) {
      if (list.some(s => s.id !== staffId && s.user_id === data.user_id && s.is_active)) {
        return { success: false, message: `Akun pengguna login sudah terhubung ke staf lain yang aktif` };
      }
    }

    const updated: Staff = {
      ...oldStaff,
      ...data,
      updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    this.saveStaffList(list);

    AuditService.log({
      event: 'staff_updated',
      auditable_type: 'Staff',
      auditable_id: staffId,
      auditable_name: updated.name,
      old_values: oldStaff,
      new_values: updated,
      reason: `Pembaruan data master SDM oleh ${operatorName}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, staff: updated, message: 'Data staf berhasil diperbarui' };
  }

  public static deactivateStaff(
    staffId: number, 
    operatorName: string = 'System Admin', 
    reason: string = 'Non-aktif pegawai'
  ): { success: boolean; message: string } {
    const list = this.getStaffList();
    const index = list.findIndex(s => s.id === staffId);
    if (index === -1) {
      return { success: false, message: 'Staff tidak ditemukan' };
    }

    const oldStaff = { ...list[index] };
    const today = new Date().toISOString().substring(0, 10);
    
    list[index].is_active = false;
    list[index].leave_date = list[index].leave_date || today;
    list[index].updated_at = new Date().toISOString();

    this.saveStaffList(list);

    AuditService.log({
      event: 'staff_deactivated',
      auditable_type: 'Staff',
      auditable_id: staffId,
      auditable_name: oldStaff.name,
      old_values: oldStaff,
      new_values: list[index],
      reason: `Deaktivasi SDM: ${reason} oleh ${operatorName}`,
      user: { id: 1, name: operatorName, role: 'Admin' }
    });

    return { success: true, message: `Pegawai ${oldStaff.name} berhasil dinonaktifkan` };
  }
}
