import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  User, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  IdCard, 
  QrCode, 
  Printer, 
  BookOpen, 
  Sparkles, 
  Home, 
  GraduationCap, 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Search, 
  Check, 
  X, 
  MoonStar, 
  Layers, 
  CalendarDays, 
  Briefcase,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  Student, 
  Staff, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  AttendanceRecord, 
  StudentExcusal, 
  Halaqah, 
  HalaqahMember, 
  DutyRoster, 
  Activity, 
  AttendanceSession, 
  Teacher, 
  User as UserType,
  Staff360ProfileData
} from '../types';
import { StaffIdentityResolver } from '../services/staffIdentityResolver';
import { StaffReportQueryService } from '../services/staffReportQueryService';

interface Profile360ViewProps {
  currentUser: UserType | null;
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  records: AttendanceRecord[];
  excusals: StudentExcusal[];
  halaqahs: Halaqah[];
  halaqahMembers: HalaqahMember[];
  dutyRosters: DutyRoster[];
  activities: Activity[];
  sessions: AttendanceSession[];
  teachers: Teacher[];
}

type EntityType = 'student' | 'staff';
type ProfileTab = 'bio' | 'attendance' | 'excuses' | 'routine_academic' | 'card';

export const Profile360View: React.FC<Profile360ViewProps> = ({
  currentUser,
  students,
  classrooms,
  dormitories,
  dormitoryRooms,
  records,
  excusals,
  halaqahs,
  halaqahMembers,
  dutyRosters,
  activities,
  sessions,
  teachers,
}) => {
  // 1. Staff List from resolver
  const staffList = useMemo(() => StaffIdentityResolver.getStaffList(), []);

  // 2. Determine initial entity type and ID based on currentUser
  const { initialEntityType, initialEntityId } = useMemo(() => {
    if (!currentUser) {
      return { initialEntityType: 'student' as EntityType, initialEntityId: students[0]?.id || 1 };
    }

    // Check if user is staff (teacher, musyrif, admin, etc.)
    const matchedStaff = staffList.find(
      (s) =>
        s.user_id === currentUser.id ||
        (s.email && s.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
        s.name.toLowerCase().includes(currentUser.name.toLowerCase())
    );

    if (matchedStaff) {
      return { initialEntityType: 'staff' as EntityType, initialEntityId: matchedStaff.id };
    }

    // Check if user is student
    const matchedStudent = students.find(
      (s) =>
        s.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
        s.nis === currentUser.username
    );

    if (matchedStudent) {
      return { initialEntityType: 'student' as EntityType, initialEntityId: matchedStudent.id };
    }

    // Default fallback: student 1
    return { initialEntityType: 'student' as EntityType, initialEntityId: students[0]?.id || 1 };
  }, [currentUser, students, staffList]);

  const [entityType, setEntityType] = useState<EntityType>(initialEntityType);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(
    initialEntityType === 'student' ? initialEntityId : students[0]?.id || 1
  );
  const [selectedStaffId, setSelectedStaffId] = useState<number>(
    initialEntityType === 'staff' ? initialEntityId : staffList[0]?.id || 1
  );

  const [activeSubTab, setActiveSubTab] = useState<ProfileTab>('bio');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterClassOrDept, setFilterClassOrDept] = useState<string>('ALL');

  // QR Code URL state for digital card
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Resolving active student
  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Resolving active staff 360 data
  const activeStaff360 = useMemo<Staff360ProfileData | null>(() => {
    if (entityType !== 'staff') return null;
    return StaffReportQueryService.getStaff360Profile(selectedStaffId);
  }, [entityType, selectedStaffId]);

  const activeStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || staffList[0] || null;
  }, [staffList, selectedStaffId]);

  // Generate QR Code data URL whenever active student or staff changes
  useEffect(() => {
    const token = entityType === 'student' ? activeStudent?.qr_token : activeStaff?.qr_token;
    const fallback = entityType === 'student' ? `SAN-${activeStudent?.nis}` : `STF-${activeStaff?.staff_number}`;
    const code = token || fallback;

    if (code) {
      QRCode.toDataURL(code, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR Code:', err));
    }
  }, [entityType, activeStudent, activeStaff]);

  // Classroom lookup
  const studentClassroom = useMemo(() => {
    if (!activeStudent) return null;
    return classrooms.find((c) => c.id === activeStudent.classroom_id) || null;
  }, [activeStudent, classrooms]);

  // Dormitory Room lookup
  const studentRoom = useMemo(() => {
    if (!activeStudent?.dormitory_room_id) return null;
    return dormitoryRooms.find((r) => r.id === activeStudent.dormitory_room_id) || null;
  }, [activeStudent, dormitoryRooms]);

  const studentDormitory = useMemo(() => {
    if (!studentRoom) return null;
    return dormitories.find((d) => d.id === studentRoom.dormitory_id) || null;
  }, [studentRoom, dormitories]);

  // Halaqah lookup
  const studentHalaqahInfo = useMemo(() => {
    if (!activeStudent) return null;
    const member = halaqahMembers.find((hm) => hm.student_id === activeStudent.id && hm.status === 'active');
    if (!member) return null;
    const halaqah = halaqahs.find((h) => h.id === member.halaqah_id);
    const teacher = halaqah ? teachers.find((t) => t.id === halaqah.teacher_id) : null;
    return { member, halaqah, teacher };
  }, [activeStudent, halaqahMembers, halaqahs, teachers]);

  // Duty Roster lookup
  const studentDutyRosters = useMemo(() => {
    if (!activeStudent) return [];
    return dutyRosters.filter((dr) => dr.student_id === activeStudent.id);
  }, [activeStudent, dutyRosters]);

  // Student Attendance Records
  const studentRecords = useMemo(() => {
    if (!activeStudent) return [];
    return records
      .filter((r) => r.student_id === activeStudent.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activeStudent, records]);

  // Student Excusals
  const studentExcusals = useMemo(() => {
    if (!activeStudent) return [];
    return excusals
      .filter((e) => e.student_id === activeStudent.id)
      .sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime());
  }, [activeStudent, excusals]);

  // Student Attendance Summary
  const studentSummary = useMemo(() => {
    const total = studentRecords.length;
    if (total === 0) {
      return { total: 0, present: 0, late: 0, excused: 0, sick: 0, absent: 0, rate: 100 };
    }
    const present = studentRecords.filter((r) => r.status === 'present').length;
    const late = studentRecords.filter((r) => r.status === 'late').length;
    const excused = studentRecords.filter((r) => r.status === 'excused').length;
    const sick = studentRecords.filter((r) => r.status === 'sick').length;
    const absent = studentRecords.filter((r) => r.status === 'absent').length;
    const rate = Math.round(((present + late) / total) * 100);
    return { total, present, late, excused, sick, absent, rate };
  }, [studentRecords]);

  // Filtered person list for selector
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass =
        filterClassOrDept === 'ALL' || String(s.classroom_id) === filterClassOrDept;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, filterClassOrDept]);

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.staff_number && s.staff_number.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchDept =
        filterClassOrDept === 'ALL' || s.staff_type === filterClassOrDept;
      return matchSearch && matchDept;
    });
  }, [staffList, searchQuery, filterClassOrDept]);

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER & PERSON PICKER */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                  Profil & Dossier 360°
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Laporan pribadi holistik: presensi, akademik, ibadah, perizinan, dan kartu identitas digital
                </p>
              </div>
            </div>
          </div>

          {/* Type Toggle (Santri vs SDM) */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-zinc-100 p-1.5 rounded-xl border border-zinc-200">
            <button
              onClick={() => {
                setEntityType('student');
                setFilterClassOrDept('ALL');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                entityType === 'student'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Santri / Siswa</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {students.length}
              </span>
            </button>
            <button
              onClick={() => {
                setEntityType('staff');
                setFilterClassOrDept('ALL');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                entityType === 'staff'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>SDM & Asatidz</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {staffList.length}
              </span>
            </button>
          </div>
        </div>

        {/* SEARCH & SELECTOR BAR */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-center">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                entityType === 'student'
                  ? 'Cari nama santri atau NIS...'
                  : 'Cari nama pegawai atau NIP...'
              }
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={filterClassOrDept}
              onChange={(e) => setFilterClassOrDept(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-700"
            >
              {entityType === 'student' ? (
                <>
                  <option value="ALL">Semua Kelas</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="ALL">Semua Tipe SDM</option>
                  <option value="teacher">Guru / Pengajar</option>
                  <option value="musyrif">Musyrif Asrama</option>
                  <option value="staff">Tenaga Kependidikan</option>
                  <option value="trainer">Pelatih Ekskul</option>
                </>
              )}
            </select>
          </div>

          <div>
            <select
              value={entityType === 'student' ? selectedStudentId : selectedStaffId}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (entityType === 'student') setSelectedStudentId(val);
                else setSelectedStaffId(val);
              }}
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-medium text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {entityType === 'student' ? (
                filteredStudents.length === 0 ? (
                  <option value="">Belum Ada Data Santri</option>
                ) : (
                  filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.nis})
                    </option>
                  ))
                )
              ) : (
                filteredStaff.length === 0 ? (
                  <option value="">Belum Ada Data SDM</option>
                ) : (
                  filteredStaff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.staff_type})
                    </option>
                  ))
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 2. HERO PROFILE CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar Profile */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-lg shadow-emerald-900/40">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-bold text-3xl sm:text-4xl text-emerald-400">
                  {entityType === 'student'
                    ? (activeStudent?.name?.substring(0, 2).toUpperCase() || 'ST')
                    : (activeStaff?.name?.substring(0, 2).toUpperCase() || 'SD')}
                </div>
              </div>
              <span className="absolute -bottom-2 -right-1 px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-full shadow-md">
                AKTIF
              </span>
            </div>

            {/* Core Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {entityType === 'student' ? (activeStudent?.name || 'Belum Ada Santri Terpilih') : (activeStaff?.name || 'Belum Ada SDM Terpilih')}
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-300">
                <span>
                  {entityType === 'student'
                    ? `NIS: ${activeStudent?.nis || '-'}`
                    : `NIP: ${activeStaff?.staff_number || '-'}`}
                </span>
                <span className="text-slate-500">•</span>
                <span className="capitalize text-emerald-400 font-semibold">
                  {entityType === 'student'
                    ? studentClassroom?.name || 'Kelas Belum Ditentukan'
                    : `${activeStaff?.position || activeStaff?.staff_type} (${activeStaff?.department || 'Umum'})`}
                </span>
                {entityType === 'student' && studentDormitory && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span>
                      {studentDormitory.name} ({studentRoom?.name || 'Kamar -'})
                    </span>
                  </>
                )}
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {entityType === 'student' ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Tingkat: {studentClassroom?.level || 'MA/SMA'}
                    </span>
                    {studentHalaqahInfo?.halaqah && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/30">
                        <BookOpen className="w-3.5 h-3.5" />
                        Halaqah: {studentHalaqahInfo.halaqah.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      RFID: {activeStudent?.rfid_uid || 'Unregistered'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
                      <Briefcase className="w-3.5 h-3.5" />
                      Status: {activeStaff?.employment_status || 'Tetap'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" />
                      Shift: {activeStaff360?.work_schedule_info.standard_in || '07:00'} - {activeStaff360?.work_schedule_info.standard_out || '16:00'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      RFID: {activeStaff?.rfid_uid || 'Belum Registrasi'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch md:items-end gap-2.5">
            <button
              onClick={() => setActiveSubTab('card')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25"
            >
              <IdCard className="w-4 h-4" />
              <span>Kartu Digital</span>
            </button>
            <button
              onClick={handlePrintDossier}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm border border-slate-700 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. KPI METRIC SUMMARY ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {entityType === 'student' ? (
          <>
            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Tingkat Hadir</span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-zinc-900">{studentSummary.rate}%</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {studentSummary.present + studentSummary.late} dari {studentSummary.total} sesi tercatat
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Shalat 5 Waktu</span>
                <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                  <MoonStar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-teal-900">
                  {studentRecords.filter((r) => r.status === 'present').length} Sesi
                </div>
                <div className="text-xs text-zinc-500 mt-1">Kepatuhan shalat berjamaah di masjid</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Izin & Dispensasi</span>
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-amber-900">{studentExcusals.length} Kali</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {studentExcusals.filter((e) => e.status === 'approved').length} Disetujui musyrif
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Tahfidz Quran</span>
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-900">
                  {studentHalaqahInfo?.halaqah?.name || 'Reguler'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Pembimbing: {studentHalaqahInfo?.teacher?.name || 'Ust. Pembina'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Presensi Harian</span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-zinc-900">
                  {activeStaff360?.daily_summary.presence_rate !== null
                    ? `${activeStaff360?.daily_summary.presence_rate}%`
                    : '100%'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Hadir: {activeStaff360?.daily_summary.present || 0} | Terlambat: {activeStaff360?.daily_summary.late || 0}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">KBM Mengajar</span>
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-blue-900">
                  {activeStaff360?.teaching_summary
                    ? `${activeStaff360.teaching_summary.teaching_rate || 0}%`
                    : 'Non-Guru'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {activeStaff360?.teaching_summary
                    ? `${activeStaff360.teaching_summary.attended}/${activeStaff360.teaching_summary.eligible} Sesi Terealisasi`
                    : 'Bukan Tenaga Pengajar'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Izin & Cuti</span>
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-amber-900">
                  {(activeStaff360?.daily_summary.permission || 0) + (activeStaff360?.daily_summary.leave || 0)} Hari
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Sakit: {activeStaff360?.daily_summary.sick || 0} | Dinas Luar: {activeStaff360?.daily_summary.official_duty || 0}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Kepatuhan Waktu</span>
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-indigo-900">
                  {activeStaff360?.daily_summary.total_late_minutes || 0} Menit
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Akumulasi telat bulan berjalan
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. SUB-TAB NAVIGATION */}
      <div className="flex border-b border-zinc-200 bg-white rounded-t-2xl px-6 pt-3 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('bio')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'bio'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Biodata & Profil</span>
        </button>

        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'attendance'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Kehadiran 360°</span>
        </button>

        <button
          onClick={() => setActiveSubTab('excuses')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'excuses'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Izin & Dispensasi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('routine_academic')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'routine_academic'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {entityType === 'student' ? (
            <>
              <Home className="w-4 h-4" />
              <span>Tahfidz & Asrama</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4" />
              <span>KBM & Jadwal Kerja</span>
            </>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('card')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'card'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <IdCard className="w-4 h-4" />
          <span>Kartu Digital (CR80)</span>
        </button>
      </div>

      {/* 5. TAB CONTENT CONTAINER */}
      <div className="bg-white rounded-b-2xl p-6 shadow-sm border border-zinc-200/80 min-h-[400px]">
        {/* TAB 1: BIODATA & PROFIL LENGKAP */}
        {activeSubTab === 'bio' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <span>Identitas & Informasi Pribadi Lengkap</span>
            </h3>

            {entityType === 'student' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200/70 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">
                    Data Kependudukan & Akademik
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-zinc-500">Nama Lengkap</span>
                    <span className="font-semibold text-zinc-900">{activeStudent?.name}</span>

                    <span className="text-zinc-500">NIS</span>
                    <span className="font-semibold text-zinc-900">{activeStudent?.nis}</span>

                    <span className="text-zinc-500">NISN</span>
                    <span className="font-semibold text-zinc-900">{activeStudent?.nisn || '-'}</span>

                    <span className="text-zinc-500">Jenis Kelamin</span>
                    <span className="font-semibold text-zinc-900">
                      {activeStudent?.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                    </span>

                    <span className="text-zinc-500">Tahun Masuk</span>
                    <span className="font-semibold text-zinc-900">{activeStudent?.entry_year || '2024'}</span>

                    <span className="text-zinc-500">Status Keaktifan</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 w-fit">
                      {activeStudent?.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200/70 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">
                    Penempatan & Kontak Wali
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-zinc-500">Kelas / Rombel</span>
                    <span className="font-semibold text-zinc-900">{studentClassroom?.name || '-'}</span>

                    <span className="text-zinc-500">Gedung Asrama</span>
                    <span className="font-semibold text-zinc-900">{studentDormitory?.name || '-'}</span>

                    <span className="text-zinc-500">Kamar Asrama</span>
                    <span className="font-semibold text-zinc-900">{studentRoom?.name || '-'}</span>

                    <span className="text-zinc-500">Nama Wali / Orang Tua</span>
                    <span className="font-semibold text-zinc-900">{activeStudent?.parent_name || 'H. Abdullah'}</span>

                    <span className="text-zinc-500">Nomor Telepon Wali</span>
                    <span className="font-semibold text-zinc-900 flex items-center gap-1 text-emerald-700">
                      <Phone className="w-3.5 h-3.5" />
                      {activeStudent?.parent_phone || '0812-9876-5432'}
                    </span>

                    <span className="text-zinc-500">Alamat Rumah</span>
                    <span className="font-semibold text-zinc-900">{activeStudent?.address || 'Jl. Raya Pesantren No. 12, Jawa Timur'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200/70 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">
                    Data Kepegawaian & Jabatan
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-zinc-500">Nama Lengkap & Gelar</span>
                    <span className="font-semibold text-zinc-900">{activeStaff?.name}</span>

                    <span className="text-zinc-500">NIP / ID Staff</span>
                    <span className="font-semibold text-zinc-900">{activeStaff?.staff_number || '-'}</span>

                    <span className="text-zinc-500">Jenis Pegawai</span>
                    <span className="capitalize font-semibold text-zinc-900">{activeStaff?.staff_type}</span>

                    <span className="text-zinc-500">Jabatan Struktural</span>
                    <span className="font-semibold text-zinc-900">{activeStaff?.position || '-'}</span>

                    <span className="text-zinc-500">Departemen / Bidang</span>
                    <span className="font-semibold text-zinc-900">{activeStaff?.department || 'Umum'}</span>

                    <span className="text-zinc-500">Status Kepegawaian</span>
                    <span className="capitalize font-semibold text-zinc-900">{activeStaff?.employment_status}</span>

                    <span className="text-zinc-500">Mulai Bergabung</span>
                    <span className="font-semibold text-zinc-900">{activeStaff?.join_date || '2021-08-01'}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200/70 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">
                    Kontak & Kredensial Presensi
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-zinc-500">Email Resmi</span>
                    <span className="font-semibold text-zinc-900 flex items-center gap-1 text-blue-700">
                      <Mail className="w-3.5 h-3.5" />
                      {activeStaff?.email || '-'}
                    </span>

                    <span className="text-zinc-500">Nomor Telepon / WA</span>
                    <span className="font-semibold text-zinc-900 flex items-center gap-1 text-emerald-700">
                      <Phone className="w-3.5 h-3.5" />
                      {activeStaff?.phone || '-'}
                    </span>

                    <span className="text-zinc-500">Kewajiban Presensi</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 w-fit">
                      {activeStaff?.requires_daily_attendance ? 'Presensi Harian Aktif' : 'Khusus Jam Mengajar'}
                    </span>

                    <span className="text-zinc-500">RFID Card UID</span>
                    <span className="font-mono text-zinc-900 font-semibold">{activeStaff?.rfid_uid || 'Belum Terdaftar'}</span>

                    <span className="text-zinc-500">Token QR Code</span>
                    <span className="font-mono text-xs text-zinc-600 bg-white px-2 py-1 rounded border border-zinc-200">
                      {activeStaff?.qr_token || 'STF-TOKEN'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KEHADIRAN 360° */}
        {activeSubTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Matriks & Riwayat Presensi 360°</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Rekapitulasi log presensi harian, shalat berjamaah, dan kegiatan terjadwal
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Hadir
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Terlambat
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Izin/Dispensasi
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Alpha
                </span>
              </div>
            </div>

            {/* Table of Records */}
            {entityType === 'student' ? (
              studentRecords.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-600">Belum ada riwayat absensi tercatat untuk santri ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-100/70 text-zinc-600 font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Waktu Presensi</th>
                        <th className="py-3 px-4">Nama Sesi / Kegiatan</th>
                        <th className="py-3 px-4">Metode</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {studentRecords.slice(0, 15).map((rec) => {
                        const session = sessions.find((s) => s.id === rec.session_id);
                        return (
                          <tr key={rec.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs text-zinc-700">
                              {rec.timestamp ? new Date(rec.timestamp).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-3 px-4 font-medium text-zinc-900">
                              {session?.name || `Sesi #${rec.session_id}`}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-700">
                                {rec.method === 'qr' && <QrCode className="w-3 h-3" />}
                                {rec.method?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {rec.status === 'present' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                                  Hadir Tepat Waktu
                                </span>
                              )}
                              {rec.status === 'late' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                  Terlambat
                                </span>
                              )}
                              {rec.status === 'excused' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                  Izin Resmi
                                </span>
                              )}
                              {rec.status === 'sick' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                  Sakit
                                </span>
                              )}
                              {rec.status === 'absent' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                                  Alpha
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-zinc-500">
                              {rec.notes || 'Terverifikasi sistem'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Staff records
              activeStaff360?.recent_records.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-600">Belum ada riwayat absensi untuk staf ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-100/70 text-zinc-600 font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Domain Presensi</th>
                        <th className="py-3 px-4">Jam Masuk</th>
                        <th className="py-3 px-4">Jam Keluar</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Keterlambatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {activeStaff360?.recent_records.map((rec) => (
                        <tr key={rec.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-zinc-700">
                            {rec.attendance_date}
                          </td>
                          <td className="py-3 px-4 font-medium text-zinc-900 capitalize">
                            {rec.attendance_type === 'daily'
                              ? 'Presensi Harian SDM'
                              : rec.attendance_type === 'teaching'
                              ? 'KBM Mengajar'
                              : 'Pelatih Ekskul'}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-zinc-800">
                            {rec.check_in_time || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-zinc-800">
                            {rec.check_out_time || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                rec.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rec.status === 'permission'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {rec.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-zinc-600">
                            {rec.late_minutes && rec.late_minutes > 0 ? `${rec.late_minutes} mnt` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 3: IZIN & DISPENSASI */}
        {activeSubTab === 'excuses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>Dossier Izin, Sakit & Dispensasi</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Daftar riwayat perizinan santri dan pengajuan cuti pegawai yang telah diajukan
                </p>
              </div>
            </div>

            {entityType === 'student' ? (
              studentExcusals.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-700">Tidak ada catatan pelanggaran atau izin tertunda.</p>
                  <p className="text-xs text-zinc-400 mt-1">Santri selalu hadir dan taat jadwal rutinitas pesantren.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-100/70 text-zinc-600 font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Rentang Tanggal</th>
                        <th className="py-3 px-4">Kategori Izin</th>
                        <th className="py-3 px-4">Alasan / Keperluan</th>
                        <th className="py-3 px-4">Status Pengajuan</th>
                        <th className="py-3 px-4">Persetujuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {studentExcusals.map((exc) => (
                        <tr key={exc.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-zinc-700">
                            {exc.start_date} s/d {exc.end_date}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900 capitalize">
                            {exc.category}
                          </td>
                          <td className="py-3 px-4 text-zinc-700 text-xs max-w-xs truncate">
                            {exc.reason}
                          </td>
                          <td className="py-3 px-4">
                            {exc.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                Disetujui
                              </span>
                            )}
                            {exc.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" />
                                Menunggu
                              </span>
                            )}
                            {exc.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                                <X className="w-3 h-3" />
                                Ditolak
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-500">
                            {exc.approved_by || 'Musyrif Kesantrian'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Staff Absence history
              activeStaff360?.absence_history.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-700">Tidak ada pengajuan cuti atau dispensasi dinas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-100/70 text-zinc-600 font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Rentang Tanggal</th>
                        <th className="py-3 px-4">Tipe Cuti</th>
                        <th className="py-3 px-4">Alasan</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {activeStaff360?.absence_history.map((ab) => (
                        <tr key={ab.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-zinc-700">
                            {ab.start_date} s/d {ab.end_date}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900 capitalize">
                            {ab.request_type}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-700">
                            {ab.reason}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 capitalize">
                              {ab.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 4: TAHFIDZ & ASRAMA (SANTRI) / KBM & JADWAL (STAFF) */}
        {activeSubTab === 'routine_academic' && (
          <div className="space-y-6">
            {entityType === 'student' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tahfidz Card */}
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Halaqah Tahfidz Al-Quran</h4>
                      <p className="text-xs text-zinc-500">Kelompok hafalan dan bimbingan al-Quran harian</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-zinc-200/80 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Kelompok Halaqah</span>
                      <span className="font-bold text-purple-900">
                        {studentHalaqahInfo?.halaqah?.name || 'Halaqah Al-Fatihah'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Musyrif Pengampu</span>
                      <span className="font-semibold text-zinc-800">
                        {studentHalaqahInfo?.teacher?.name || 'Ust. Ahmad Fauzi, S.Kom'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Target Semester</span>
                      <span className="font-semibold text-zinc-800">Juz 30 (Mutqin)</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Lokasi Halaqah</span>
                      <span className="font-semibold text-zinc-800">Masjid Utama - Sayap Kanan</span>
                    </div>
                  </div>
                </div>

                {/* Duty Roster / Piket */}
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Jadwal Piket Asrama (Duty Roster)</h4>
                      <p className="text-xs text-zinc-500">Tanggung jawab kebersihan kamar dan lingkungan</p>
                    </div>
                  </div>

                  {studentDutyRosters.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-zinc-200/80 text-center text-xs text-zinc-500">
                      Jadwal piket reguler: Setiap hari Senin & Kamis (Kebersihan Kamar).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {studentDutyRosters.map((dr) => (
                        <div
                          key={dr.id}
                          className="p-3 bg-white rounded-xl border border-zinc-200/80 flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-bold text-zinc-900 capitalize">{dr.day_of_week}</span>
                            <p className="text-xs text-zinc-500 capitalize">{dr.duty_type}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Aktif
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Staff Work Schedule & KBM
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Shift & Jadwal Kerja Standar</h4>
                      <p className="text-xs text-zinc-500">Aturan jam kerja wajib presensi fingerprint/RFID</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-zinc-200/80 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Pola Jadwal</span>
                      <span className="font-bold text-zinc-900">
                        {activeStaff360?.work_schedule_info.schedule_name || 'Reguler Shift'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Jam Masuk Standar</span>
                      <span className="font-semibold text-emerald-700">
                        {activeStaff360?.work_schedule_info.standard_in || '07:00'} WIB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Jam Pulang Standar</span>
                      <span className="font-semibold text-emerald-700">
                        {activeStaff360?.work_schedule_info.standard_out || '16:00'} WIB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Hari Kerja Efektif</span>
                      <span className="font-semibold text-zinc-800">Senin - Sabtu (6 Hari)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Beban Mengajar & Realisasi KBM</h4>
                      <p className="text-xs text-zinc-500">Statistik mengajar tatap muka di kelas</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-zinc-200/80 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Mata Pelajaran Diampu</span>
                      <span className="font-bold text-zinc-900">
                        {activeStaff?.department || 'Pendidikan Agama Islam'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Tingkat Pengajaran</span>
                      <span className="font-semibold text-zinc-800">Kelas VII - IX MTs & MA</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Sesi Terlaksana</span>
                      <span className="font-bold text-emerald-700">
                        {activeStaff360?.teaching_summary?.attended || 18} Sesi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: KARTU IDENTITAS DIGITAL (CR80) */}
        {activeSubTab === 'card' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <IdCard className="w-5 h-5 text-emerald-600" />
                  <span>Kartu Identitas Digital Santri & SDM (CR80)</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Kartu pintar resmi terintegrasi RFID dan QR Code untuk absensi otomatis
                </p>
              </div>

              <button
                onClick={handlePrintDossier}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-600/30"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu CR80</span>
              </button>
            </div>

            {/* Visual CR80 Card Front & Back */}
            <div className="flex flex-wrap items-center justify-center gap-8 py-6">
              {/* Card Front */}
              <div className="w-[340px] h-[215px] bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 rounded-2xl p-5 shadow-2xl text-white relative overflow-hidden flex flex-col justify-between border border-emerald-500/30">
                {/* Decorative Pattern */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

                {/* Top bar */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs text-amber-300">
                      SB
                    </div>
                    <div>
                      <div className="text-[11px] font-black tracking-wider uppercase">SIUBA PESANTREN</div>
                      <div className="text-[8px] text-emerald-200 tracking-tight">KARTU IDENTITAS RESMI</div>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded">
                    {entityType === 'student' ? 'SANTRI' : 'PEGAWAI'}
                  </span>
                </div>

                {/* Center Content */}
                <div className="relative z-10 flex items-center gap-4">
                  {/* Avatar / Photo */}
                  <div className="w-16 h-20 bg-slate-900/80 rounded-xl border border-white/30 flex items-center justify-center font-bold text-2xl text-emerald-400 shadow-inner">
                    {entityType === 'student'
                      ? activeStudent?.name?.substring(0, 2).toUpperCase()
                      : activeStaff?.name?.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold leading-tight line-clamp-2">
                      {entityType === 'student' ? activeStudent?.name : activeStaff?.name}
                    </h4>
                    <p className="text-[11px] font-mono text-amber-300 font-bold">
                      {entityType === 'student'
                        ? `NIS: ${activeStudent?.nis}`
                        : `NIP: ${activeStaff?.staff_number || '-'}`}
                    </p>
                    <p className="text-[10px] text-emerald-100">
                      {entityType === 'student'
                        ? studentClassroom?.name || 'Kelas Santri'
                        : activeStaff?.position || activeStaff?.staff_type}
                    </p>
                  </div>
                </div>

                {/* Bottom Bar with RFID chip icon */}
                <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[9px] text-emerald-200">
                  <span className="font-mono">
                    RFID: {entityType === 'student' ? activeStudent?.rfid_uid || 'ST-UID' : activeStaff?.rfid_uid || 'SF-UID'}
                  </span>
                  <span>Berlaku s/d Lulus</span>
                </div>
              </div>

              {/* Card Back (with QR Code) */}
              <div className="w-[340px] h-[215px] bg-slate-900 rounded-2xl p-5 shadow-2xl text-white relative overflow-hidden flex flex-col justify-between border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    KODE SCANNER PRESENSI
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400">
                    {entityType === 'student' ? activeStudent?.qr_token : activeStaff?.qr_token}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-5">
                  <div className="p-2 bg-white rounded-xl shadow-lg">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
                    ) : (
                      <div className="w-24 h-24 flex items-center justify-center text-xs text-zinc-400">
                        Memuat...
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 space-y-1.5 max-w-[140px]">
                    <p className="font-semibold text-slate-300">Instruksi Penggunaan:</p>
                    <p>1. Tempelkan kartu pada terminal RFID saat apel shalat.</p>
                    <p>2. Atau arahkan QR Code pada kamera scanner presensi.</p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 text-[8px] text-slate-500 text-center">
                  Kartu ini adalah milik Pesantren. Jika menemukan hubungi Bagian Kesantrian.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
