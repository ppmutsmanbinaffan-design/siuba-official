import { Student, RfidAuditLog } from '../types';

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
   * Normalize RFID UID
   * Input e.g. "04 a8-7f:12 b9" -> Stored "04A87F12B9"
   */
  static normalizeRfid(rawUid: string | null | undefined): string | null {
    if (!rawUid || typeof rawUid !== 'string') return null;
    const cleaned = rawUid.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
    return cleaned.length > 0 ? cleaned : null;
  }




}
