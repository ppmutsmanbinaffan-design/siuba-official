import { 
  Extracurricular, 
  ExtracurricularEligibilityCode, 
  ExtracurricularMember, 
  Student 
} from '../types';

export interface EligibilityResult {
  eligible: boolean;
  code: ExtracurricularEligibilityCode;
  message: string;
}

export class ExtracurricularEligibilityService {
  /**
   * Check if a student is eligible to register for an extracurricular
   */
  static checkEligibility(params: {
    student: Student;
    extracurricular: Extracurricular;
    allMembers: ExtracurricularMember[];
    maxActiveMemberships?: number;
    ignoreCapacityAndRegistrationPeriod?: boolean;
  }): EligibilityResult {
    const { 
      student, 
      extracurricular, 
      allMembers, 
      maxActiveMemberships = 2,
      ignoreCapacityAndRegistrationPeriod = false,
    } = params;

    // 1. Student Status Check
    if (!student.is_active || student.status !== 'active' || student.deleted_at) {
      return {
        eligible: false,
        code: 'STUDENT_INACTIVE',
        message: 'Santri dalam status tidak aktif atau telah keluar.',
      };
    }

    // 2. Already Registered Check
    const existingMember = allMembers.find(
      (m) =>
        m.extracurricular_id === extracurricular.id &&
        m.student_id === student.id &&
        ['pending', 'active', 'waitlisted'].includes(m.membership_status) &&
        m.is_active
    );

    if (existingMember) {
      return {
        eligible: false,
        code: 'ALREADY_REGISTERED',
        message: `Santri sudah terdaftar pada ekstrakurikuler ini dengan status: ${existingMember.membership_status.toUpperCase()}.`,
      };
    }

    // 3. Gender Restriction Check
    if (extracurricular.participant_gender && extracurricular.participant_gender !== 'all') {
      const studentGender = student.gender === 'male' || student.gender === 'L' ? 'male' : 'female';
      if (studentGender !== extracurricular.participant_gender) {
        const targetLabel = extracurricular.participant_gender === 'male' ? 'Putra (Laki-laki)' : 'Putri (Perempuan)';
        return {
          eligible: false,
          code: 'GENDER_NOT_ALLOWED',
          message: `Ekstrakurikuler ini khusus untuk santri ${targetLabel}.`,
        };
      }
    }

    // 4. Grade Restriction Check
    if (extracurricular.allowed_grade_levels && extracurricular.allowed_grade_levels.length > 0) {
      const studentClass = student.classroom_name || '';
      const matchesGrade = extracurricular.allowed_grade_levels.some((g) => studentClass.includes(g));
      if (!matchesGrade) {
        return {
          eligible: false,
          code: 'GRADE_NOT_ALLOWED',
          message: `Ekstrakurikuler ini dibatasi hanya untuk tingkatan kelas: ${extracurricular.allowed_grade_levels.join(', ')}.`,
        };
      }
    }

    // 5. Max Active Memberships Check
    const studentActiveCount = allMembers.filter(
      (m) => m.student_id === student.id && m.membership_status === 'active' && m.is_active
    ).length;

    if (studentActiveCount >= maxActiveMemberships) {
      return {
        eligible: false,
        code: 'MAX_MEMBERSHIP_REACHED',
        message: `Santri telah mencapai batas maksimal ${maxActiveMemberships} ekstrakurikuler aktif.`,
      };
    }

    if (!ignoreCapacityAndRegistrationPeriod) {
      // 6. Registration Period Check
      if (extracurricular.is_registration_open === false) {
        return {
          eligible: false,
          code: 'REGISTRATION_CLOSED',
          message: 'Pendaftaran ekstrakurikuler ini sedang ditutup.',
        };
      }

      // 7. Capacity Check & Waitlist Availability
      const activeMemberCount = allMembers.filter(
        (m) => m.extracurricular_id === extracurricular.id && m.membership_status === 'active' && m.is_active
      ).length;

      if (extracurricular.capacity && activeMemberCount >= extracurricular.capacity) {
        if (extracurricular.waitlist_enabled) {
          return {
            eligible: true, // Eligible for Waitlist
            code: 'WAITLIST_AVAILABLE',
            message: `Kuota penuh (${activeMemberCount}/${extracurricular.capacity}), santri akan masuk ke Daftar Tunggu (Waitlist).`,
          };
        }
        return {
          eligible: false,
          code: 'CAPACITY_FULL',
          message: `Kuota pendaftaran telah penuh (${activeMemberCount}/${extracurricular.capacity}).`,
        };
      }
    }

    return {
      eligible: true,
      code: 'ELIGIBLE',
      message: 'Santri memenuhi seluruh kriteria kelayakan pendaftaran.',
    };
  }

  /**
   * Automatically or manually promote waitlisted member when capacity opens
   */
  static promoteWaitlist(params: {
    extracurricularId: number;
    extracurriculars: Extracurricular[];
    allMembers: ExtracurricularMember[];
    operatorName?: string;
  }): {
    updatedMembers: ExtracurricularMember[];
    promotedMember: ExtracurricularMember | null;
  } {
    const { extracurricularId, extracurriculars, allMembers, operatorName = 'System Auto-Promote' } = params;

    const ekskul = extracurriculars.find((e) => e.id === extracurricularId);
    if (!ekskul) {
      return { updatedMembers: allMembers, promotedMember: null };
    }

    const activeCount = allMembers.filter(
      (m) => m.extracurricular_id === extracurricularId && m.membership_status === 'active' && m.is_active
    ).length;

    if (ekskul.capacity && activeCount >= ekskul.capacity) {
      return { updatedMembers: allMembers, promotedMember: null }; // No capacity available
    }

    // Find earliest waitlisted member
    const waitlistedMembers = allMembers
      .filter((m) => m.extracurricular_id === extracurricularId && m.membership_status === 'waitlisted' && m.is_active)
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

    if (waitlistedMembers.length === 0) {
      return { updatedMembers: allMembers, promotedMember: null };
    }

    const targetToPromote = waitlistedMembers[0];
    const nowStr = new Date().toISOString().slice(0, 10);

    let promotedMemberObj: ExtracurricularMember | null = null;

    const updatedMembers = allMembers.map((m) => {
      if (m.id === targetToPromote.id) {
        const updated: ExtracurricularMember = {
          ...m,
          membership_status: 'active',
          approved_by: operatorName,
          approved_at: nowStr,
          notes: (m.notes ? `${m.notes} | ` : '') + `Promoted from Waitlist by ${operatorName}`,
        };
        promotedMemberObj = updated;
        return updated;
      }
      return m;
    });

    return {
      updatedMembers,
      promotedMember: promotedMemberObj,
    };
  }
}
