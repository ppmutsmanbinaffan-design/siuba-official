import { Student, QrAuditLog, RfidAuditLog } from '../types';

export class StudentIdentityService {
  /**
   * Resolve a student by RFID UID (Server-side lookup)
   * Normalized: removes spaces, dashes, colons, converted to uppercase
   * e.g. "04 a8-7f:12" -> "04A87F12"
   */
  static resolveByRfidUid(rawUid: string | null | undefined, allStudents: Student[]): Student | null {
    const normalized = this.normalizeRfid(rawUid);
    if (!normalized) return null;

    return allStudents.find((s) => {
      if (!s.rfid_uid) return false;
      const sNorm = this.normalizeRfid(s.rfid_uid);
      return sNorm === normalized;
    }) || null;
  }

  /**
   * Resolve a student by QR Token (Server-side lookup)
   * Normalized: trims whitespace. Case-sensitive/exact match as standard tokens are uppercase alphanumeric.
   */
  static resolveByQrToken(token: string | null | undefined, allStudents: Student[]): Student | null {
    if (!token || typeof token !== 'string') return null;
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    // Search by exact match or normalized uppercase token
    return allStudents.find(
      (s) => s.qr_token && (s.qr_token === cleanToken || s.qr_token.toUpperCase() === cleanToken.toUpperCase())
    ) || null;
  }

  /**
   * Generate a secure, unique, and unpredictable QR Token
   * Format: STU-XXXXXXXX (10-char alphanumeric base32 hash)
   */
  static generateQrToken(existingTokens: string[] = []): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 alphabet without confusing 0/O, 1/I
    let token = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      token = 'STU-';
      for (let i = 0; i < 10; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!existingTokens.includes(token)) {
        isUnique = true;
      }
      attempts++;
    }

    return token;
  }

  /**
   * Regenerate QR Token for student with immediate revocation of old token and audit trail
   */
  static regenerateQrToken(params: {
    student: Student;
    allStudents: Student[];
    operatorName: string;
    reason?: string;
  }): { updatedStudent: Student; oldToken: string; newToken: string; auditLog: QrAuditLog } {
    const { student, allStudents, operatorName, reason } = params;
    const existingTokens = allStudents.map((s) => s.qr_token).filter(Boolean);
    const oldToken = student.qr_token;
    const newToken = this.generateQrToken(existingTokens);

    const updatedStudent: Student = {
      ...student,
      qr_token: newToken,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    const auditLog: QrAuditLog = {
      id: Date.now(),
      student_id: student.id,
      student_name: student.name,
      action: 'regenerated',
      old_token_hash: oldToken ? `***${oldToken.slice(-4)}` : undefined,
      new_token: newToken,
      operator_name: operatorName,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      notes: reason || 'Permintaan cetak ulang kartu / kartu hilang',
    };

    return {
      updatedStudent,
      oldToken,
      newToken,
      auditLog,
    };
  }

  /**
   * Generate missing QR tokens for legacy/new students where qr_token is null or empty
   */
  static generateMissingStudentQrTokens(allStudents: Student[]): {
    updatedStudents: Student[];
    count: number;
  } {
    const existingTokens = allStudents.map((s) => s.qr_token).filter(Boolean);
    let count = 0;

    const updatedStudents = allStudents.map((student) => {
      if (!student.qr_token || student.qr_token.trim() === '') {
        const newToken = this.generateQrToken(existingTokens);
        existingTokens.push(newToken);
        count++;
        return {
          ...student,
          qr_token: newToken,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        };
      }
      return student;
    });

    return { updatedStudents, count };
  }

  /**
   * Collision testing utility for QR token generator (e.g. 5,000 dummy tokens)
   */
  static testQrCollision(count: number = 5000): {
    generated: number;
    unique: number;
    collisions: number;
    timeMs: number;
  } {
    const start = performance.now();
    const set = new Set<string>();
    let collisions = 0;

    for (let i = 0; i < count; i++) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let token = 'STU-';
      for (let j = 0; j < 10; j++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (set.has(token)) {
        collisions++;
      } else {
        set.add(token);
      }
    }
    const end = performance.now();

    return {
      generated: count,
      unique: set.size,
      collisions,
      timeMs: Math.round((end - start) * 100) / 100,
    };
  }

  /**
   * Normalize RFID UID
   * Input e.g. "04 a8-7f:12 b9" -> Stored "04A87F12B9"
   */
  static normalizeRfid(rawUid: string | null | undefined): string | null {
    if (!rawUid || typeof rawUid !== 'string') return null;
    const cleaned = rawUid.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  /**
   * Validate RFID uniqueness
   */
  static validateRfidUnique(
    rfid: string | null | undefined,
    currentStudentId: number | null,
    allStudents: Student[]
  ): { valid: boolean; message?: string; conflictStudent?: Student } {
    const normalized = this.normalizeRfid(rfid);
    if (!normalized) return { valid: true };

    const conflict = allStudents.find(
      (s) => s.id !== currentStudentId && this.normalizeRfid(s.rfid_uid) === normalized && s.deleted_at === null
    );

    if (conflict) {
      return {
        valid: false,
        message: `RFID UID '${normalized}' sudah terdaftar pada santri ${conflict.name} (NIS: ${conflict.student_number}).`,
        conflictStudent: conflict,
      };
    }

    return { valid: true };
  }

  /**
   * Validate Student Number (NIS) uniqueness
   */
  static validateStudentNumberUnique(
    studentNumber: string,
    currentStudentId: number | null,
    allStudents: Student[]
  ): { valid: boolean; message?: string; conflictStudent?: Student } {
    const cleaned = studentNumber.trim();
    if (!cleaned) {
      return { valid: false, message: 'Nomor Induk Santri (NIS) wajib diisi.' };
    }

    const conflict = allStudents.find(
      (s) => s.id !== currentStudentId && s.student_number.toLowerCase() === cleaned.toLowerCase()
    );

    if (conflict) {
      return {
        valid: false,
        message: `NIS '${cleaned}' sudah digunakan oleh santri ${conflict.name}.`,
        conflictStudent: conflict,
      };
    }

    return { valid: true };
  }

  /**
   * Assign or replace RFID card for a student with validation and audit trail
   */
  static assignRfidCard(params: {
    student: Student;
    newRawUid: string;
    allStudents: Student[];
    operatorName: string;
    deviceCode?: string;
    reason?: string;
  }): { success: boolean; message: string; updatedStudent?: Student; auditLog?: RfidAuditLog } {
    const { student, newRawUid, allStudents, operatorName, deviceCode, reason } = params;
    const normalized = this.normalizeRfid(newRawUid);

    if (!normalized) {
      return { success: false, message: 'Format RFID UID tidak valid atau kosong.' };
    }

    const validation = this.validateRfidUnique(normalized, student.id, allStudents);
    if (!validation.valid) {
      return { success: false, message: validation.message || 'RFID UID sudah digunakan.' };
    }

    const oldUid = student.rfid_uid;
    const action: RfidAuditLog['action'] = oldUid ? 'replaced' : 'assigned';

    const updatedStudent: Student = {
      ...student,
      rfid_uid: normalized,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    const auditLog: RfidAuditLog = {
      id: Date.now(),
      student_id: student.id,
      student_name: student.name,
      action,
      old_rfid_uid: oldUid || undefined,
      new_rfid_uid: normalized,
      operator_name: operatorName,
      device_code: deviceCode,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      notes: reason || (oldUid ? 'Penggantian kartu RFID lama' : 'Pendaftaran kartu RFID baru'),
    };

    return {
      success: true,
      message: `Kartu RFID UID '${normalized}' berhasil dihubungkan ke santri ${student.name}.`,
      updatedStudent,
      auditLog,
    };
  }

  /**
   * Unassign RFID card from a student with audit trail
   */
  static unassignRfidCard(params: {
    student: Student;
    operatorName: string;
    reason?: string;
  }): { success: boolean; message: string; updatedStudent: Student; auditLog: RfidAuditLog } {
    const { student, operatorName, reason } = params;
    const oldUid = student.rfid_uid;

    const updatedStudent: Student = {
      ...student,
      rfid_uid: null,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    const auditLog: RfidAuditLog = {
      id: Date.now(),
      student_id: student.id,
      student_name: student.name,
      action: 'unassigned',
      old_rfid_uid: oldUid || undefined,
      operator_name: operatorName,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      notes: reason || 'Pelepasan kartu RFID (kartu hilang/rusak)',
    };

    return {
      success: true,
      message: `Kartu RFID berhasil dilepas dari santri ${student.name}.`,
      updatedStudent,
      auditLog,
    };
  }
}
