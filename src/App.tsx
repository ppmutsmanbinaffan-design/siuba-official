import { useState, useEffect, useRef } from 'react';
import { startAutoQueueSync } from './services/offlineQueueSync';
import { loadInstitution } from './services/institutionService';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LoginPage, AuthLoadingScreen, GuestRoute, ProtectedRoute, Forbidden403, NotFound404 } from './components/auth';
import { authService, AuthStatus } from './services/authService';
import { getTabFromPath, getPathFromTab } from './utils/router';
import { hasPermission, getTabRequiredPermission, getFirstAccessibleRoute } from './config/navigationRegistry';
import { DashboardView } from './components/DashboardView';
import { ExcuseManagerView } from './components/ExcuseManagerView';
import { ActivitiesView } from './components/ActivitiesView';
import { ExtracurricularsGroupsView } from './components/ExtracurricularsGroupsView';
import { ClassroomsDormitoriesView } from './components/ClassroomsDormitoriesView';
import { DevicesView } from './components/DevicesView';
import { RfidSimulatorView } from './components/RfidSimulatorView';
import { QrBulkPrintView } from './components/QrBulkPrintView';
import { InteractiveScannerSimulator } from './components/InteractiveScannerSimulator';
import { HistoryView } from './components/HistoryView';
import { SystemReadinessView } from './features/golive/SystemReadinessPanel';
import { AccessControlView } from './components/AccessControlView';
import { Profile360View } from './components/Profile360View';
import { SettingsView } from './components/SettingsView';
import { AcademicMasterView } from './components/AcademicMasterView';
import { TimetableManagerView } from './components/TimetableManagerView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { KbmMonitoringView } from './components/KbmMonitoringView';
import { AcademicReportsView } from './components/AcademicReportsView';
import { TodayTimelineView } from './components/TodayTimelineView';
import { PrayerMonitoringView } from './components/PrayerMonitoringView';
import { DormitoryMonitoringView } from './components/DormitoryMonitoringView';
import { HalaqahManagerView } from './components/HalaqahManagerView';
import { RoutineScheduleManagerView } from './components/RoutineScheduleManagerView';
import { DutyRosterManagerView } from './components/DutyRosterManagerView';
import { EventsManagerView } from './components/EventsManagerView';
import { ExecutiveDashboardView } from './components/ExecutiveDashboardView';
import { SyncCenterView } from './components/SyncCenterView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { GoLiveQAPage } from './features/golive/GoLiveQAPage';
import { StaffAttendanceView } from './components/StaffAttendanceView';
import { TrainerAttendanceView } from './components/TrainerAttendanceView';
import { IntegratedDashboardPage } from './features/dashboard';
import { IntegratedReportCenterPage } from './features/reports';
import { MaintenanceHubPage } from './features/maintenance';
import { StudentCardDesignerView } from './components/StudentCardDesignerView';
import { apiClient, isOfflineError } from './services/apiClient';
import { loadServerSnapshot, persistSnapshotToCache } from './services/serverHydrationService';
import { hasPendingLegacyMigration } from './services/localDataGuard';
import { 
  StudentListPage, 
  StudentDetailPage, 
  StudentCreatePage, 
  StudentEditPage 
} from './features/students';
import { 
  StaffListPage, 
  StaffDetailPage, 
  StaffCreatePage, 
  StaffEditPage 
} from './features/staff';
import { 
  AttendanceDashboardPage,
  SessionListPage,
  SessionDetailPage,
  ManualAttendancePage,
  QrScannerPage,
  RfidMonitoringPage,
  AttendanceMonitoringPage
} from './features/attendance';
import { INITIAL_CATEGORIES } from './data/initialData';
import { 
  AcademicCalendarEvent,
  AcademicSchedule,
  AcademicSessionContext,
  AcademicSubstitution,
  AcademicYear,
  Activity, 
  ActivityParticipant, 
  ActivitySupervisor,
  AttendanceDevice, 
  AttendanceDeviceLog,
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceRecordHistory,
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  DutyRoster,
  Extracurricular, 
  ExtracurricularMember, 
  Halaqah,
  HalaqahMember,
  LessonPeriod,
  PrayerTimeCalendar,
  RoutineSchedule,
  RoutineScheduleOverride,
  Semester,
  SessionStatus, 
  Student, 
  StudentClassHistory, 
  StudentExcusal,
  StudentGroup, 
  StudentGroupMember, 
  StudentRoomHistory, 
  Subject,
  Teacher,
  TeachingAssignment,
  User,
  SpecialEvent,
  EventSession,
  EventRegistration,
  EventOrganizer,
  ActivityParticipantRule,
  WalkInAuditLog
} from './types';
import { AttendanceEngine } from './services/attendanceEngine';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { todayLocalDate } from './utils/today';

export function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(1);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Subview states for Master Santri & Master SDM
  const [studentSubView, setStudentSubView] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
  const [selectedStudentDetailId, setSelectedStudentDetailId] = useState<number | null>(null);
  const [staffSubView, setStaffSubView] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
  const [selectedStaffDetailId, setSelectedStaffDetailId] = useState<number | null>(null);

  // Integrated Report Suite State (v1.0.5)
  const [reportCategory, setReportCategory] = useState<any>('hub');
  const [reportFilters, setReportFilters] = useState<Record<string, any>>({});

  // Subview states for Attendance (v1.0.3)
  const [attendanceSubView, setAttendanceSubView] = useState<'dashboard' | 'sessions' | 'detail' | 'manual' | 'qr' | 'rfid' | 'monitoring'>('dashboard');
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState<number | null>(null);

  // Core Master & Transaction State (with persistent custom users — passwords excluded from storage)
  const stripPasswordsForStorage = (userList: User[]): User[] =>
    userList.map(({ password, ...rest }) => ({ ...rest, password: '••••••' }) as User);

  const loadPersistentCollection = <T,>(key: string, initial: T): T => {
    if (typeof window === 'undefined') return initial;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed as unknown as T;
        }
      }
    } catch (e) {
      console.error(`Failed to load persistent collection for ${key}:`, e);
    }
    return initial;
  };

  const [users, setUsers] = useState<User[]>(() => {
    // Daftar pengguna berasal dari server (cache terakhir); tidak lagi dicampur akun contoh.
    try {
      const saved = localStorage.getItem('siuba_custom_users_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Daftar pengguna kini dimuat dari server setelah login (lihat efek hidrasi server di bawah)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>(() => loadPersistentCollection('siuba_master_students', []));
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => loadPersistentCollection('siuba_master_classrooms', []));
  const [dormitories, setDormitories] = useState<Dormitory[]>(() => loadPersistentCollection('siuba_master_dormitories', []));
  const [dormitoryRooms, setDormitoryRooms] = useState<DormitoryRoom[]>(() => loadPersistentCollection('siuba_master_dormitory_rooms', []));
  const [categories, setCategories] = useState(() => loadPersistentCollection('siuba_activity_categories', INITIAL_CATEGORIES));
  const [activities, setActivities] = useState<Activity[]>(() => loadPersistentCollection('siuba_master_activities', []));
  const [sessions, setSessions] = useState<AttendanceSession[]>(() => loadPersistentCollection('siuba_attendance_sessions_cache', []));

  useEffect(() => {
    const handleCacheUpdate = (e: any) => {
      const key = e.detail?.key;
      const data = e.detail?.data;
      if (!key || !Array.isArray(data)) return;

      if (key === 'siuba_attendance_sessions_cache') setSessions(data);
      else if (key === 'siuba_master_students') setStudents(data);
      else if (key === 'siuba_attendance_records_cache') setRecords(data);
      else if (key === 'siuba_session_participants_cache') setSessionParticipants(data);
      else if (key === 'siuba_master_activities') setActivities(data);
      else if (key === 'siuba_student_excusals_v1') setExcusals(data);
      else if (key === 'siuba_master_classrooms') setClassrooms(data);
      else if (key === 'siuba_master_dormitories') setDormitories(data);
      else if (key === 'siuba_master_dormitory_rooms') setDormitoryRooms(data);
    };
    window.addEventListener('siuba:cache-updated', handleCacheUpdate);
    return () => window.removeEventListener('siuba:cache-updated', handleCacheUpdate);
  }, []);
  const [records, setRecords] = useState<AttendanceRecord[]>(() => loadPersistentCollection('siuba_attendance_records_cache', []));
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<AttendanceDeviceLog[]>([]);
  
  // Sprint 2 State
  const [extracurriculars, setExtracurriculars] = useState<Extracurricular[]>([]);
  const [extracurricularMembers, setExtracurricularMembers] = useState<ExtracurricularMember[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [studentGroupMembers, setStudentGroupMembers] = useState<StudentGroupMember[]>([]);
  const [classHistories, setClassHistories] = useState<StudentClassHistory[]>([]);
  const [roomHistories, setRoomHistories] = useState<StudentRoomHistory[]>([]);
  const [sessionParticipants, setSessionParticipants] = useState<AttendanceSessionParticipant[]>(() => loadPersistentCollection('siuba_session_participants_cache', []));
  const [activityParticipants, setActivityParticipants] = useState<ActivityParticipant[]>([]);

  // Sprint 3 State: Excusals & Record Audit Histories
  const [excusals, setExcusals] = useState<StudentExcusal[]>(() => loadPersistentCollection('siuba_student_excusals_v1', []));

  useEffect(() => {
    try {
      localStorage.setItem('siuba_student_excusals_v1', JSON.stringify(excusals));
    } catch {
      // ignore
    }
  }, [excusals]);
  const [recordHistories, setRecordHistories] = useState<AttendanceRecordHistory[]>([]);

  // Sprint 6 State: Academic / KBM Domain
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [lessonPeriods, setLessonPeriods] = useState<LessonPeriod[]>([]);
  const [academicSchedules, setAcademicSchedules] = useState<AcademicSchedule[]>([]);
  const [academicSubstitutions, setAcademicSubstitutions] = useState<AcademicSubstitution[]>([]);
  const [academicCalendarEvents, setAcademicCalendarEvents] = useState<AcademicCalendarEvent[]>([]);
  const [academicSessionContexts, setAcademicSessionContexts] = useState<AcademicSessionContext[]>([]);

  // Sprint 7 State: Routine Activities, Prayers, Dormitory, Halaqah
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [halaqahMembers, setHalaqahMembers] = useState<HalaqahMember[]>([]);
  const [dutyRosters, setDutyRosters] = useState<DutyRoster[]>([]);
  const [routineSchedules, setRoutineSchedules] = useState<RoutineSchedule[]>([]);
  const [routineOverrides, setRoutineOverrides] = useState<RoutineScheduleOverride[]>([]);
  const [prayerCalendars, setPrayerCalendars] = useState<PrayerTimeCalendar[]>([]);
  const [activitySupervisors, setActivitySupervisors] = useState<ActivitySupervisor[]>([]);

  // Sprint 8 State: Events, Participant Rules, Walk-In Audit
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [eventSessions, setEventSessions] = useState<EventSession[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [eventOrganizers, setEventOrganizers] = useState<EventOrganizer[]>([]);
  const [participantRules, setParticipantRules] = useState<ActivityParticipantRule[]>([]);
  const [serverActivities, setServerActivities] = useState<Activity[]>([]);
  const halaqahDirty = useRef(false);
  const routineDirty = useRef(false);
  const dutyDirty = useRef(false);
  const [walkInAuditLogs, setWalkInAuditLogs] = useState<WalkInAuditLog[]>([]);

  // ===================================================================
  // HIDRASI DARI SERVER: setelah login, isi state dengan data MySQL (Laravel)
  // menggantikan data contoh / localStorage. Offline -> tetap pakai data lokal.
  // ===================================================================
  const [serverSyncInfo, setServerSyncInfo] = useState<{ at: string | null; errors: string[] }>({ at: null, errors: [] });

  const applyServerSnapshot = (snap: Awaited<ReturnType<typeof loadServerSnapshot>>) => {
    if (snap.students) setStudents(snap.students);
    if (snap.classrooms) setClassrooms(snap.classrooms);
    if (snap.dormitories) setDormitories(snap.dormitories);
    if (snap.dormitoryRooms) setDormitoryRooms(snap.dormitoryRooms);
    if (snap.sessions) setSessions(snap.sessions);
    if (snap.participants) setSessionParticipants(snap.participants);
    if (snap.records) setRecords(snap.records);
    if (snap.devices) setDevices(snap.devices);
    if (snap.deviceLogs) setDeviceLogs(snap.deviceLogs);
    if (snap.recordHistories) setRecordHistories(snap.recordHistories);
    if (snap.excusals) setExcusals(snap.excusals);
    if (snap.academic) {
      const a = snap.academic;
      setAcademicYears(a.academic_years);
      setSemesters(a.semesters);
      setSubjects(a.subjects);
      setLessonPeriods(a.lesson_periods);
      setTeachers(a.teachers);
      setTeachingAssignments(a.teaching_assignments);
      setAcademicSchedules(a.academic_schedules);
      setAcademicCalendarEvents(a.calendar_events);
      setAcademicSessionContexts(a.session_contexts);
      setAcademicSubstitutions(a.substitutions);
    }
    if (snap.routine) {
      const r = snap.routine;
      if (r.categories?.length) setCategories(r.categories);
      setActivities(r.activities);
      setServerActivities(r.activities);
      if (!routineDirty.current) {
        setRoutineSchedules(r.routine_schedules);
        setRoutineOverrides(r.routine_overrides);
        setPrayerCalendars(r.prayer_calendars);
        setActivitySupervisors(r.supervisors);
      }
    }
    if (snap.community) {
      const c = snap.community;
      if (!snap.routine) setServerActivities(c.activities);
      setExtracurriculars(c.extracurriculars);
      setExtracurricularMembers(c.extracurricular_members);
      if (!halaqahDirty.current) {
        setHalaqahs(c.halaqahs);
        setHalaqahMembers(c.halaqah_members);
      }
      if (!dutyDirty.current) setDutyRosters(c.duty_rosters);
      setSpecialEvents(c.events);
      setEventSessions(c.event_sessions);
      setEventRegistrations(c.event_registrations);
      setEventOrganizers(c.event_organizers);
      setParticipantRules(c.participant_rules);
      if (c.student_groups) setStudentGroups(c.student_groups);
      if (c.student_group_members) setStudentGroupMembers(c.student_group_members);
    }
    if (snap.users && snap.users.length > 0) {
      // Password tidak pernah disimpan / ditampilkan di browser
      const serverUsers = snap.users.map((u: User) => ({ ...u, password: '' }) as User);
      setUsers(serverUsers);
      try {
        localStorage.setItem('siuba_custom_users_v1', JSON.stringify(stripPasswordsForStorage(serverUsers)));
      } catch {
        // ignore
      }
    }
    persistSnapshotToCache(snap);
    setServerSyncInfo({ at: new Date().toISOString(), errors: snap.errors });
    if (snap.errors.length > 0) {
      console.warn('SIUBA: sebagian data gagal dimuat dari server:', snap.errors);
    }
  };

  /** Muat ulang data dari server setelah perubahan (absensi/KBM saja agar cepat). */
  const refreshServerData = async (attendanceOnly = true) => {
    if (!attendanceOnly) void loadInstitution(true); // identitas lembaga untuk menu/kop laporan
    try {
      applyServerSnapshot(await loadServerSnapshot({ attendanceOnly }));
    } catch (e) {
      console.warn('SIUBA: gagal memuat ulang data server', e);
    }
  };

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let cancelled = false;
    let firstRun = true;

    const hydrate = async () => {
      const snap = await loadServerSnapshot({ attendanceOnly: !firstRun });
      if (cancelled) return;
      applyServerSnapshot(snap);
      if (firstRun && hasPendingLegacyMigration()) {
        showToast('Ada data lama di browser ini yang belum dipindahkan ke server. Buka menu /migrasi-data (Super Admin).', 'info');
      }
      firstRun = false;
    };

    hydrate();
    // Segarkan data absensi, KBM & perangkat secara berkala (tiap 60 detik) selama aplikasi terbuka
    const timer = window.setInterval(hydrate, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Authentication & URL Synchronization Lifecycle
  useEffect(() => {
    // Initial router setup based on URL pathname
    const pathname = window.location.pathname;
    const initialTab = getTabFromPath(pathname);

    // Parse redirect query param if present
    const searchParams = new URLSearchParams(window.location.search);
    const queryRedirect = searchParams.get('redirect');
    if (queryRedirect) {
      setRedirectPath(queryRedirect);
    }

    const unsubscribe = authService.subscribe((state) => {
      setAuthStatus(state.status);
      setCurrentUser(state.user);
      if (state.error) {
        setAuthError(state.error);
      }
    });

    if (initialTab === 'login') {
      setActiveTab('login');
    } else if (initialTab === '404' || initialTab === '403') {
      setActiveTab(initialTab);
    } else {
      // Validate permission against current auth user if available
      const authedUser = authService.getState().user;
      if (authedUser) {
        const reqPerm = getTabRequiredPermission(initialTab);
        if (reqPerm && !hasPermission(authedUser.role, reqPerm, authedUser.permissions)) {
          setActiveTab('403');
        } else {
          setActiveTab(initialTab);
        }
      } else {
        setActiveTab(initialTab);
      }
    }

    const handlePopState = () => {
      const currentTab = getTabFromPath(window.location.pathname);
      const authedUser = authService.getState().user;
      if (authedUser && currentTab !== 'login' && currentTab !== '404' && currentTab !== '403') {
        const reqPerm = getTabRequiredPermission(currentTab);
        if (reqPerm && !hasPermission(authedUser.role, reqPerm, authedUser.permissions)) {
          setActiveTab('403');
          return;
        }
      }
      setActiveTab(currentTab);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sprint 8 Handlers
  // ===== Event khusus: disimpan di server =====
  const handleAddEvent = (evt: Partial<SpecialEvent>) =>
    kbmCall(() => apiClient.post('/community/events', evt), `Event "${evt.name || ''}" berhasil dibuat.`);
  const handleUpdateEventStatus = (eventId: number, status: SpecialEvent['status']) =>
    kbmCall(() => apiClient.post(`/community/events/${eventId}/status`, { status }), 'Status event diperbarui.');
  const handleAddEventSession = (session: Partial<EventSession>) =>
    kbmCall(() => apiClient.post(`/community/events/${session.event_id}/sessions`, session), `Sesi "${session.name || ''}" ditambahkan.`);
  const handleAddEventRegistration = (reg: Partial<EventRegistration>) =>
    kbmCall(() => apiClient.post(`/community/events/${reg.event_id}/registrations`, { student_id: reg.student_id, status: reg.status, notes: reg.notes }), 'Santri terdaftar di event.');
  const handleUpdateRegistrationStatus = (registrationId: number, status: EventRegistration['status']) =>
    kbmCall(() => apiClient.post(`/community/event-registrations/${registrationId}/status`, { status }), 'Status registrasi diperbarui.');
  const handleAddParticipantRule = (rule: Partial<ActivityParticipantRule>) => {
    const ev = specialEvents.find((e) => e.activity_id === rule.activity_id || e.name === rule.activity_name);
    if (!ev) {
      showToast('Event untuk rule ini tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'error');
      return;
    }
    return kbmCall(() => apiClient.post(`/community/events/${ev.id}/rules`, rule), 'Rule peserta ditambahkan.');
  };
  const handleRemoveParticipantRule = (ruleId: number) =>
    kbmCall(() => apiClient.delete(`/community/event-rules/${ruleId}`), 'Rule peserta dihapus.');

  // Dispensasi peserta event disimpan ke server (dulu hanya di layar dan hilang saat data dimuat ulang)
  const handleCreateEventDispensations = async (updatedExcusals: StudentExcusal[]): Promise<boolean> => {
    const known = new Set(excusals.map((e) => e.id));
    const fresh = updatedExcusals.filter((e) => !known.has(e.id));
    if (fresh.length === 0) return true;
    const first = fresh[0];
    try {
      const res: any = await apiClient.post('/student-excusals/bulk', {
        student_ids: fresh.map((e) => e.student_id),
        type: first.type,
        start_at: first.start_at,
        end_at: first.end_at,
        reason: first.reason,
        notes: first.notes,
      });
      showToast(res?.message || `${fresh.length} dispensasi disimpan.`, 'success');
      await refreshServerData(true);
      return true;
    } catch (err: any) {
      showToast(
        isOfflineError(err) ? 'Server offline: dispensasi belum bisa disimpan. Coba lagi saat tersambung.' : err?.message || 'Gagal menyimpan dispensasi.',
        'error'
      );
      return false;
    }
  };

  // ===== KBM: semua perubahan master data disimpan di server lalu dimuat ulang =====
  const kbmCall = async (fn: () => Promise<any>, successMsg: string) => {
    try {
      const res: any = await fn();
      showToast(res?.message || successMsg, 'success');
      await refreshServerData(true);
      return res;
    } catch (err: any) {
      const fieldMsg = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
      showToast(isOfflineError(err) ? 'Server offline: perubahan KBM belum bisa disimpan.' : fieldMsg || err?.message || 'Gagal menyimpan.', 'error');
      return null;
    }
  };

  const handleAddSubject = (subj: Subject) =>
    kbmCall(() => apiClient.post('/academic/subjects', subj), `Mata pelajaran '${subj.name}' ditambahkan.`);
  const handleUpdateSubject = (id: number, subj: Partial<Subject>) =>
    kbmCall(() => apiClient.put(`/academic/subjects/${id}`, subj), 'Mata pelajaran berhasil diperbarui.');
  const handleDeleteSubject = (id: number) =>
    kbmCall(() => apiClient.delete(`/academic/subjects/${id}`), 'Mata pelajaran berhasil dihapus.');

  const handleAddTeacher = (tch: Teacher) =>
    kbmCall(() => apiClient.post('/academic/teachers', tch), `Guru '${tch.name}' ditambahkan.`);
  const handleUpdateTeacher = (id: number, tch: Partial<Teacher>) =>
    kbmCall(() => apiClient.put(`/academic/teachers/${id}`, tch), 'Data guru berhasil diperbarui.');
  const handleDeleteTeacher = (id: number) =>
    kbmCall(() => apiClient.delete(`/academic/teachers/${id}`), 'Guru dinonaktifkan.');

  const handleAddAssignment = (ta: TeachingAssignment) =>
    kbmCall(() => apiClient.post('/academic/assignments', ta), 'Penugasan mengajar ditambahkan.');
  const handleDeleteAssignment = (id: number) =>
    kbmCall(() => apiClient.delete(`/academic/assignments/${id}`), 'Penugasan mengajar berhasil dihapus.');

  const handleAddCalendarEvent = (ev: AcademicCalendarEvent) =>
    kbmCall(() => apiClient.post('/academic/calendar-events', ev), `Agenda '${ev.name}' ditambahkan.`);
  const handleDeleteCalendarEvent = (id: number) =>
    kbmCall(() => apiClient.delete(`/academic/calendar-events/${id}`), 'Agenda kalender berhasil dihapus.');

  const handleAddSchedule = (sched: AcademicSchedule) =>
    kbmCall(() => apiClient.post('/academic/schedules', sched), 'Jadwal pelajaran ditambahkan.');
  const handleDeleteSchedule = (id: number) =>
    kbmCall(() => apiClient.delete(`/academic/schedules/${id}`), 'Jadwal pelajaran dihapus.');

  // User & Access Control Handlers with Instant Backend & Local Sync
  const handleAddUser = (newUser: User, plainPassword?: string) => {
    setUsers((prev) => {
      const next = [newUser, ...prev];
      try {
        localStorage.setItem('siuba_custom_users_v1', JSON.stringify(stripPasswordsForStorage(next)));
      } catch {
        // ignore
      }
      return next;
    });

    // Sync to backend database
    fetch('/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authService.getState().token || ''}`,
      },
      body: JSON.stringify({
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        roles: newUser.roles || [newUser.role],
        password: plainPassword || newUser.password || 'password',
        is_active: newUser.is_active,
      }),
    }).catch(() => {});
  };

  const handleUpdateUser = (userId: number, updatedData: Partial<User>) => {
    let targetUser: User | undefined;

    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          const merged = { ...u, ...updatedData };
          targetUser = merged;
          if (currentUser && currentUser.id === userId) {
            setCurrentUser(merged);
            authService.setAuthenticatedUser(merged, authService.getState().token || `token_${userId}`, true);
          }
          return merged;
        }
        return u;
      });

      try {
        localStorage.setItem('siuba_custom_users_v1', JSON.stringify(stripPasswordsForStorage(next)));
      } catch {
        // ignore
      }
      return next;
    });

    // If password was modified, sync immediately to backend database
    if (updatedData.password) {
      fetch(`/api/v1/users/${userId}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authService.getState().token || ''}`,
        },
        body: JSON.stringify({
          password: updatedData.password,
          username: targetUser?.username,
        }),
      }).catch(() => {});
    }

    // Also sync general profile attributes to backend
    fetch(`/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authService.getState().token || ''}`,
      },
      body: JSON.stringify({
        ...updatedData,
        username: targetUser?.username,
      }),
    }).catch(() => {});
  };

  const handleDeleteUser = (userId: number) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      try {
        localStorage.setItem('siuba_custom_users_v1', JSON.stringify(stripPasswordsForStorage(next)));
      } catch {
        // ignore
      }
      return next;
    });

    fetch(`/api/v1/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authService.getState().token || ''}`,
      },
    }).catch(() => {});
  };

  const handleUpdateRolePermissions = (roleName: string, permissions: string[]) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.role === roleName) {
          const updated = { ...u, permissions };
          if (currentUser && currentUser.id === u.id) {
            setCurrentUser(updated);
            authService.setAuthenticatedUser(updated, authService.getState().token || `token_${u.id}`, true);
          }
          return updated;
        }
        return u;
      })
    );
  };

  // ===== Halaqah & piket: tampilan mengubah daftar lengkap, lalu disinkronkan ke server =====
  const updateHalaqahs = (next: Halaqah[]) => { halaqahDirty.current = true; setHalaqahs(next); };
  const updateHalaqahMembers = (next: HalaqahMember[]) => { halaqahDirty.current = true; setHalaqahMembers(next); };
  const updateDutyRosters = (next: DutyRoster[]) => { dutyDirty.current = true; setDutyRosters(next); };

  useEffect(() => {
    if (!halaqahDirty.current) return;
    const t = setTimeout(async () => {
      try {
        await apiClient.put('/community/halaqahs', { halaqahs, members: halaqahMembers });
        halaqahDirty.current = false;
        await refreshServerData(true);
      } catch (err: any) {
        halaqahDirty.current = false;
        const fieldMsg = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
        showToast(isOfflineError(err) ? 'Server offline: perubahan halaqah belum tersimpan.' : fieldMsg || err?.message || 'Gagal menyimpan halaqah.', 'error');
        await refreshServerData(true);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [halaqahs, halaqahMembers]);

  useEffect(() => {
    if (!dutyDirty.current) return;
    const t = setTimeout(async () => {
      try {
        const payload = dutyRosters.map((d) => ({ activity_id: d.activity_id, date: d.date, student_id: d.student_id, role: d.role, is_active: d.is_active }));
        await apiClient.put('/community/duty-rosters', { rosters: payload });
        dutyDirty.current = false;
        await refreshServerData(true);
      } catch (err: any) {
        dutyDirty.current = false;
        const fieldMsg = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
        showToast(isOfflineError(err) ? 'Server offline: jadwal piket belum tersimpan.' : fieldMsg || err?.message || 'Gagal menyimpan jadwal piket.', 'error');
        await refreshServerData(true);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [dutyRosters]);

  // ===== Jadwal rutin, pengecualian, kalender shalat, penanggung jawab: disinkronkan ke server =====
  const markRoutine = <T,>(setter: (v: T) => void) => (next: T) => { routineDirty.current = true; setter(next); };
  const updateRoutineSchedules = markRoutine(setRoutineSchedules);
  const updateRoutineOverrides = markRoutine(setRoutineOverrides);
  const updatePrayerCalendars = markRoutine(setPrayerCalendars);
  const updateSupervisors = markRoutine(setActivitySupervisors);

  useEffect(() => {
    if (!routineDirty.current) return;
    const t = setTimeout(async () => {
      try {
        await apiClient.put('/routine-schedules/sync', {
          schedules: routineSchedules,
          overrides: routineOverrides,
          prayer_calendars: prayerCalendars,
          supervisors: activitySupervisors,
        });
        routineDirty.current = false;
        await refreshServerData(true);
      } catch (err: any) {
        routineDirty.current = false;
        const fieldMsg = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
        showToast(isOfflineError(err) ? 'Server offline: jadwal rutin belum tersimpan.' : fieldMsg || err?.message || 'Gagal menyimpan jadwal rutin.', 'error');
        await refreshServerData(true);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [routineSchedules, routineOverrides, prayerCalendars, activitySupervisors]);

  const handleGenerateRoutineSessions = async (dateStr: string) => {
    try {
      const res: any = await apiClient.post('/routine-schedules/generate', { date: dateStr });
      const d = res?.data || {};
      showToast(
        d.created > 0
          ? `Berhasil membuat ${d.created} sesi kegiatan rutin untuk tanggal ${dateStr}.`
          : `Semua sesi kegiatan rutin untuk ${dateStr} sudah tersedia (${d.existing || 0} ada, 0 baru).`,
        d.created > 0 ? 'success' : 'info'
      );
      await refreshServerData(true);
    } catch (err: any) {
      showToast(isOfflineError(err) ? 'Server offline: sesi rutin belum bisa dibuat.' : err?.message || 'Gagal membuat sesi rutin.', 'error');
    }
  };

  // Antrean absensi offline dikirim otomatis ke server saat koneksi kembali
  useEffect(() => {
    if (!currentUser) return;
    return startAutoQueueSync((r) => {
      showToast(
        r.conflict > 0
          ? `${r.success} absensi offline terkirim ke server; ${r.conflict} konflik perlu ditinjau di Sync Center.`
          : `${r.success} absensi offline berhasil dikirim ke server.`,
        r.conflict > 0 || r.failed > 0 ? 'info' : 'success'
      );
      void refreshServerData(true);
    });
  }, [currentUser?.id]);

  // Berpindah akun tanpa login sungguhan dinonaktifkan: dulu menimpa token asli dengan token palsu
  // sehingga semua panggilan API gagal dan identitas pengguna menjadi rancu.
  const handleSelectUser = (_user: User) => {
    showToast('Untuk memakai akun lain, keluar lalu masuk dengan username akun tersebut.', 'info');
  };

  const handleGenerateAcademicSessions = async (dateStr: string) => {
    try {
      const res: any = await apiClient.post('/academic/generate', { date: dateStr });
      const d = res?.data || {};
      if (d.holidays?.length) {
        showToast(`Tanggal ${dateStr} libur di kalender akademik — sesi KBM tidak dibuat.`, 'error');
      } else if (d.created > 0) {
        showToast(`Berhasil membuat ${d.created} sesi KBM untuk tanggal ${dateStr}.`, 'success');
      } else if (d.messages?.length) {
        showToast(d.messages[0], 'error');
      } else {
        showToast(`Sesi KBM tanggal ${dateStr} sudah lengkap (${d.existing || 0} sesi).`, 'info');
      }
      await refreshServerData(true);
    } catch (err: any) {
      showToast(isOfflineError(err) ? 'Server offline: sesi KBM belum bisa dibuat.' : err?.message || 'Gagal membuat sesi KBM.', 'error');
    }
  };

  // Jam aplikasi = jam perangkat (dulu tertanam 23 Agustus 2026 04:25). Bisa diubah manual untuk simulasi.
  const nowLocalString = () => {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  };
  const [simulatedTime, setSimulatedTimeState] = useState<string>(nowLocalString);
  const manualClock = useRef(false);
  const setSimulatedTime = (v: string) => { manualClock.current = true; setSimulatedTimeState(v); };
  useEffect(() => {
    const t = setInterval(() => { if (!manualClock.current) setSimulatedTimeState(nowLocalString()); }, 30000);
    return () => clearInterval(t);
  }, []);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4000);
  };

  // Reset demo data
  // Dulu mengembalikan tampilan ke data contoh; kini cukup memuat ulang semua data dari server.
  const handleResetData = () => {
    void refreshServerData(false);
    showToast('Data dimuat ulang dari server.', 'info');
  };

  // ===== Perangkat: disimpan di server =====
  // Token alat dibuat di browser, server hanya menyimpan hash-nya; dipakai alat lewat header X-DEVICE-TOKEN.
  const handleAddDevice = (newDev: AttendanceDevice, plainSecret: string) =>
    kbmCall(() => apiClient.post('/devices', {
      device_code: newDev.device_code, device_name: newDev.device_name, device_type: newDev.device_type,
      location: newDev.location, device_token: plainSecret,
    }), `Perangkat ${newDev.device_code} berhasil didaftarkan.`);

  const handleUpdateDevice = (updatedDev: AttendanceDevice) => {
    setDevices((prev) => prev.map((d) => (d.id === updatedDev.id ? updatedDev : d)));
    return kbmCall(() => apiClient.patch(`/devices/${updatedDev.id}`, {
      device_name: updatedDev.device_name, location: updatedDev.location, is_active: updatedDev.is_active,
      mode: updatedDev.mode || 'attendance', current_session_id: updatedDev.current_session_id ?? null,
    }), `Perangkat ${updatedDev.device_code} diperbarui.`);
  };

  const handleRotateDeviceSecret = (deviceId: number) => {
    const device = devices.find((d) => d.id === deviceId) as AttendanceDevice;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const newSecret = 'dev_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    void kbmCall(() => apiClient.post(`/devices/${deviceId}/token`, { device_token: newSecret }), `Token perangkat ${device?.device_code || ''} diperbarui.`);
    return { newSecret, updatedDevice: { ...device, updated_at: new Date().toISOString() } };
  };

  // Record Attendance Handler (Engine Invocation with Session Participant Snapshot Verification)
  // Hasil simulator disimpan terpisah (hilang saat halaman dimuat ulang), tidak dicampur dengan presensi asli
  const [simulatedRecords, setSimulatedRecords] = useState<AttendanceRecord[]>([]);

  const handleRecordAttendance = (params: {
    sessionId: number;
    student: Student;
    method: AttendanceMethod;
    device?: AttendanceDevice;
    checkInTime?: string;
    overrideStatus?: AttendanceStatus;
    notes?: string;
    allowParticipantOverride?: boolean;
  }): AttendanceResult => {
    const session = sessions.find((s) => s.id === params.sessionId);
    if (!session) {
      const errRes: AttendanceResult = {
        success: false,
        code: 'SESSION_NOT_OPEN',
        message: 'Sesi absensi tidak ditemukan.',
      };
      showToast(errRes.message, 'error');
      return errRes;
    }

    const activity = activities.find((a) => a.id === session.activity_id) || activities[0];

    // Hanya dipakai halaman SIMULATOR (scanner & RFID): hasilnya tidak pernah masuk antrean offline
    // maupun daftar presensi sungguhan — dulu saat server offline simulasi ikut tersinkron sebagai presensi asli.
    const { result, newRecord } = AttendanceEngine.record({
      sessionId: session.id,
      sessionStatus: session.status,
      sessionStartAt: session.start_at,
      sessionPresentUntil: session.present_until,
      sessionLateUntil: session.late_until,
      sessionEndAt: session.end_at,
      activity,
      student: params.student,
      method: params.method,
      device: params.device,
      operator: currentUser,
      checkInTime: params.checkInTime || new Date().toISOString(),
      overrideStatus: params.overrideStatus,
      notes: params.notes,
      existingRecords: [...simulatedRecords, ...records],
      sessionParticipants,
      allowParticipantOverride: params.allowParticipantOverride,
    });

    if (result.success && newRecord) {
      setSimulatedRecords((prev) => [newRecord, ...prev]);
      showToast(`[SIMULASI] ${result.message}`, 'success');
    } else {
      showToast(result.message, 'error');
    }

    return result;
  };

  // Manual Sheet Status Click (Interactive Pill)

  // Bulk Mark All Present (Sprint 3 Engine)

  // Bulk Apply Status (e.g. mass Izin, Sakit, Dispensasi, Alpha)

  // Attendance Correction with Mandatory Reason (Sprint 3 Engine)

  // Buat sesi manual di server (peserta di-snapshot server sesuai aturan peserta kegiatan)

  // Open Session

  // Close Session with Auto Alpha & Active Excuse Processing (Sprint 3 Engine)
  // Buka/tutup/batal sesi lewat server (peserta yang belum tercatat otomatis difinalisasi saat ditutup)

  const handleUpdateSessionStatus = async (sessionId: number, newStatus: SessionStatus, cancelReason?: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    const action = newStatus === 'open' ? 'open' : newStatus === 'closed' ? 'close' : newStatus === 'cancelled' ? 'cancel' : null;
    if (!action) {
      showToast(`Perubahan status ke '${newStatus}' tidak didukung.`, 'error');
      return;
    }
    try {
      const res: any = await apiClient.post(`/attendance/sessions/${sessionId}/${action}`, action === 'cancel' ? { reason: cancelReason || 'Dibatalkan operator' } : {});
      showToast(res?.message || `Status sesi '${targetSession?.session_code || sessionId}' diubah menjadi ${newStatus.toUpperCase()}.`, 'success');
      await refreshServerData(true);
    } catch (err: any) {
      showToast(isOfflineError(err) ? 'Server offline: status sesi belum bisa diubah.' : err?.message || 'Gagal mengubah status sesi.', 'error');
    }
  };

  // Excusal Handlers — disimpan ke server (MySQL). Hanya saat server tidak terjangkau dicatat sementara di browser.
  const upsertExcusalState = (exc: StudentExcusal) =>
    setExcusals((prev) => [exc, ...prev.filter((e) => e.id !== exc.id)]);

  const handleAddExcusal = async (data: Partial<StudentExcusal>) => {
    const student = students.find((s) => s.id === data.student_id);
    if (!student || !currentUser) return;

    const today = todayLocalDate();
    const payload = {
      student_id: student.id,
      type: data.type || 'sick',
      reason: data.reason || 'Izin dari wali santri',
      start_at: data.start_at || `${today}T00:00:00`,
      end_at: data.end_at || `${today}T23:59:00`,
      notes: data.notes,
      status: data.status === 'pending' ? 'pending' : 'approved',
    };

    try {
      const res: any = await apiClient.post<StudentExcusal>('/student-excusals', payload);
      upsertExcusalState(res.data);
      showToast(
        res.data.status === 'approved'
          ? `Surat izin '${student.name}' tersimpan di server dan disetujui.`
          : `Surat izin '${student.name}' tersimpan, menunggu persetujuan.`,
        'success'
      );
    } catch (err: any) {
      if (!isOfflineError(err)) {
        showToast(err?.message || 'Surat izin gagal disimpan.', 'error');
        return;
      }
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      upsertExcusalState({
        id: Date.now(),
        student_id: student.id,
        student_name: student.name,
        student_number: student.student_number,
        classroom_name: student.classroom_name,
        dormitory_room_name: student.dormitory_room_name,
        ...payload,
        status: 'approved',
        approved_by: currentUser.name,
        approved_at: nowStr,
        created_by: currentUser.name,
        created_at: nowStr,
        updated_at: nowStr,
      } as StudentExcusal);
      showToast('Server offline: surat izin disimpan sementara di perangkat ini.', 'info');
    }
  };

  const changeExcusalStatus = async (id: number, action: 'approve' | 'reject' | 'cancel', reason = '') => {
    try {
      const res: any = await apiClient.post<StudentExcusal>(`/student-excusals/${id}/${action}`, action === 'reject' ? { reason } : {});
      upsertExcusalState(res.data);
      const label = action === 'approve' ? 'disetujui' : action === 'reject' ? 'ditolak' : 'dibatalkan';
      showToast(`Surat izin berhasil ${label}.`, action === 'reject' ? 'error' : 'success');
    } catch (err: any) {
      showToast(
        isOfflineError(err) ? 'Server offline: perubahan status izin belum bisa disimpan.' : err?.message || 'Gagal mengubah status izin.',
        'error'
      );
    }
  };

  const handleApproveExcusal = (id: number) => changeExcusalStatus(id, 'approve');
  const handleRejectExcusal = (id: number, reason: string = '') => changeExcusalStatus(id, 'reject', reason);
  const handleCancelExcusal = (id: number) => changeExcusalStatus(id, 'cancel');

  // Add Student

  // Update Student

  // Toggle Student Active

  // Extracurriculars Handlers
  // ===== Ekstrakurikuler: disimpan di server =====
  const handleAddExtracurricular = (ekskul: Partial<Extracurricular>) =>
    kbmCall(() => apiClient.post('/community/extracurriculars', ekskul), `Ekstrakurikuler '${ekskul.name || ''}' ditambahkan.`);
  const handleAddExtracurricularMember = (extracurricularId: number, studentId: number) =>
    kbmCall(() => apiClient.post(`/community/extracurriculars/${extracurricularId}/members`, { student_id: studentId }), 'Anggota ekstrakurikuler ditambahkan.');
  const handleRemoveExtracurricularMember = (memberId: number) =>
    kbmCall(() => apiClient.delete(`/community/extracurricular-members/${memberId}`), 'Anggota ekstrakurikuler dinonaktifkan.');

  // ===== Kelompok santri khusus: disimpan di server =====
  const handleAddStudentGroup = (grp: Partial<StudentGroup>) =>
    kbmCall(() => apiClient.post('/community/student-groups', grp), `Kelompok '${grp.name || ''}' berhasil dibuat.`);
  const handleAddStudentGroupMember = (groupId: number, studentId: number) =>
    kbmCall(() => apiClient.post(`/community/student-groups/${groupId}/members`, { student_id: studentId }), 'Santri berhasil didaftarkan ke kelompok.');
  const handleRemoveStudentGroupMember = (memberId: number) =>
    kbmCall(() => apiClient.delete(`/community/student-group-members/${memberId}`), 'Santri dikeluarkan dari kelompok.');

  // ===== Kelas, gedung asrama, kamar: disimpan di server (setelah berubah, data master dimuat ulang penuh) =====
  const masterCall = async (fn: () => Promise<any>, successMsg: string) => {
    try {
      const res: any = await fn();
      showToast(res?.message || successMsg, 'success');
      await refreshServerData(false);
      return res;
    } catch (err: any) {
      const fieldMsg = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
      showToast(isOfflineError(err) ? 'Server offline: perubahan belum bisa disimpan.' : fieldMsg || err?.message || 'Gagal menyimpan.', 'error');
      return null;
    }
  };

  const handleAddClassroom = (classroomData: Partial<Classroom>) =>
    masterCall(() => apiClient.post('/classrooms', classroomData), `Kelas '${classroomData.name || ''}' berhasil ditambahkan.`);
  const handleUpdateClassroom = (classroomId: number, updateData: Partial<Classroom>) =>
    masterCall(() => apiClient.put(`/classrooms/${classroomId}`, updateData), 'Data kelas berhasil diperbarui.');
  const handleDeleteClassroom = (classroomId: number) =>
    masterCall(() => apiClient.delete(`/classrooms/${classroomId}`), 'Kelas dihapus.');

  const handleAddDormitory = (dormData: Partial<Dormitory>) =>
    masterCall(() => apiClient.post('/dormitories', dormData), `Gedung asrama '${dormData.name || ''}' berhasil ditambahkan.`);
  const handleUpdateDormitory = (dormId: number, updateData: Partial<Dormitory>) =>
    masterCall(() => apiClient.put(`/dormitories/${dormId}`, updateData), 'Data gedung asrama berhasil diperbarui.');
  const handleDeleteDormitory = (dormId: number) =>
    masterCall(() => apiClient.delete(`/dormitories/${dormId}`), 'Gedung asrama dihapus.');

  const handleAddDormitoryRoom = (roomData: Partial<DormitoryRoom>) =>
    masterCall(() => apiClient.post('/dormitory-rooms', roomData), `Kamar '${roomData.name || ''}' berhasil ditambahkan.`);
  const handleUpdateDormitoryRoom = (roomId: number, updateData: Partial<DormitoryRoom>) =>
    masterCall(() => apiClient.put(`/dormitory-rooms/${roomId}`, updateData), 'Data kamar berhasil diperbarui.');
  const handleDeleteDormitoryRoom = (roomId: number) =>
    masterCall(() => apiClient.delete(`/dormitory-rooms/${roomId}`), 'Kamar dihapus.');

  // Activity Handlers
  // ===== Master kegiatan: disimpan di server =====
  const handleAddActivity = (act: Partial<Activity>) =>
    kbmCall(() => apiClient.post('/activities', act), `Kegiatan '${act.name || ''}' berhasil didaftarkan.`);
  const handleUpdateActivity = (actId: number, updateData: Partial<Activity>) =>
    kbmCall(() => apiClient.put(`/activities/${actId}`, updateData), 'Kegiatan berhasil diperbarui.');
  const handleDeleteActivity = (actId: number) =>
    kbmCall(() => apiClient.delete(`/activities/${actId}`), 'Kegiatan dihapus.');

  // Lesson Periods CRUD Handlers
  const handleAddLessonPeriod = (periodData: Partial<LessonPeriod>) =>
    kbmCall(() => apiClient.post('/academic/lesson-periods', periodData), `Jam Pelajaran '${periodData.name || ''}' ditambahkan.`);
  const handleUpdateLessonPeriod = (periodId: number, updateData: Partial<LessonPeriod>) =>
    kbmCall(() => apiClient.put(`/academic/lesson-periods/${periodId}`, updateData), 'Jam Pelajaran berhasil diperbarui.');
  const handleDeleteLessonPeriod = (periodId: number) =>
    kbmCall(() => apiClient.delete(`/academic/lesson-periods/${periodId}`), 'Jam Pelajaran berhasil dihapus.');

  const handleToggleActivityMethod = (activityId: number, method: 'manual' | 'qr' | 'rfid') => {
    const act = activities.find((a) => a.id === activityId);
    if (!act) return;
    const key = method === 'manual' ? 'allow_manual' : method === 'qr' ? 'allow_qr' : 'allow_rfid';
    const nextVal = !act[key];
    return kbmCall(
      () => apiClient.put(`/activities/${activityId}`, { [key]: nextVal }),
      `Izin metode ${method.toUpperCase()} pada '${act.name}' diubah menjadi ${nextVal ? 'AKTIF' : 'NONAKTIF'}.`
    );
  };

  const handleDatabaseResetCompleted = (newDataset: Record<string, any>) => {
    // 1. Update React memory states
    if (newDataset.records !== undefined) setRecords(newDataset.records);
    if (newDataset.sessions !== undefined) setSessions(newDataset.sessions);
    if (newDataset.sessionParticipants !== undefined) setSessionParticipants(newDataset.sessionParticipants);
    if (newDataset.recordHistories !== undefined) setRecordHistories(newDataset.recordHistories);
    if (newDataset.excusals !== undefined) setExcusals(newDataset.excusals);
    if (newDataset.deviceLogs !== undefined) setDeviceLogs(newDataset.deviceLogs);
    if (newDataset.eventRegistrations !== undefined) setEventRegistrations(newDataset.eventRegistrations);
    if (newDataset.students !== undefined) setStudents(newDataset.students);
    if (newDataset.classrooms !== undefined) setClassrooms(newDataset.classrooms);
    if (newDataset.dormitories !== undefined) setDormitories(newDataset.dormitories);
    if (newDataset.dormitoryRooms !== undefined) setDormitoryRooms(newDataset.dormitoryRooms);
    if (newDataset.activities !== undefined) setActivities(newDataset.activities);
    if (newDataset.users !== undefined) setUsers(newDataset.users);

    // 2. Persist reset datasets to localStorage so page refresh and re-login never restore deleted data
    try {
      if (newDataset.records !== undefined) {
        localStorage.setItem('siuba_attendance_records_cache', JSON.stringify(newDataset.records));
      }
      if (newDataset.sessions !== undefined) {
        localStorage.setItem('siuba_attendance_sessions_cache', JSON.stringify(newDataset.sessions));
      }
      if (newDataset.sessionParticipants !== undefined) {
        localStorage.setItem('siuba_session_participants_cache', JSON.stringify(newDataset.sessionParticipants));
      }
      if (newDataset.recordHistories !== undefined) {
        localStorage.setItem('siuba_record_histories_cache', JSON.stringify(newDataset.recordHistories));
      }
      if (newDataset.excusals !== undefined) {
        localStorage.setItem('siuba_student_excusals_v1', JSON.stringify(newDataset.excusals));
      }
      if (newDataset.students !== undefined) {
        localStorage.setItem('siuba_master_students', JSON.stringify(newDataset.students));
      }
      if (newDataset.classrooms !== undefined) {
        localStorage.setItem('siuba_master_classrooms', JSON.stringify(newDataset.classrooms));
      }
      if (newDataset.dormitories !== undefined) {
        localStorage.setItem('siuba_master_dormitories', JSON.stringify(newDataset.dormitories));
      }
      if (newDataset.dormitoryRooms !== undefined) {
        localStorage.setItem('siuba_master_dormitory_rooms', JSON.stringify(newDataset.dormitoryRooms));
      }
      if (newDataset.activities !== undefined) {
        localStorage.setItem('siuba_master_activities', JSON.stringify(newDataset.activities));
      }
      if (newDataset.staff !== undefined) {
        localStorage.setItem('siuba_master_staff', JSON.stringify(newDataset.staff));
      }
      if (newDataset.users !== undefined) {
        localStorage.setItem('siuba_custom_users_v1', JSON.stringify(stripPasswordsForStorage(newDataset.users)));
      }
    } catch (e) {
      console.warn('Failed to write reset dataset to localStorage:', e);
    }

    // 3. Trigger backend MySQL database reset via API
    apiClient.post('/maintenance/reset', {
      mode: newDataset.__mode || 'MODE_B_MASTERS_EXCEPT_CORE',
      confirmation_phrase: 'RESET DATABASE SIUBA'
    }).then(() => {
      console.log('MySQL Database Reset synced successfully with server.');
    }).catch((err) => {
      console.warn('MySQL Database Reset API warning:', err);
    });

    // 4. Notify open components
    window.dispatchEvent(new CustomEvent('siuba:cache-updated', {
      detail: { key: 'siuba_attendance_sessions_cache', data: newDataset.sessions || [] }
    }));
    window.dispatchEvent(new CustomEvent('siuba:cache-updated', {
      detail: { key: 'siuba_master_students', data: newDataset.students || [] }
    }));

    showToast('Reset database berhasil dieksekusi & diterapkan ke sistem (Browser & MySQL).', 'success');
  };

  const handleSetActiveTab = (rawTab: string) => {
    let tab = rawTab;
    if (tab === 'laporan' || tab === 'reports') tab = 'report-center';
    if (tab === 'sdm-presensi' || tab === 'presensi-sdm') tab = 'staff-attendance';
    if (tab === 'sdm-laporan' || tab === 'laporan-sdm') tab = 'staff-report-center';
    if (tab === 'kbm' || tab === 'jadwal-kbm') tab = 'kbm-monitoring';
    if (tab === 'ekskul') tab = 'trainer-attendance';

    if (tab === 'students' && activeTab !== 'students') {
      setStudentSubView('list');
    }
    if (tab === 'staff-master' && activeTab !== 'staff-master') {
      setStaffSubView('list');
    }
    if (tab === 'attendance-dashboard') {
      setAttendanceSubView('dashboard');
    }
    if (tab === 'sessions') {
      setAttendanceSubView('sessions');
    }
    if (tab === 'manual-attendance') {
      setAttendanceSubView('manual');
    }
    if (tab === 'qr-scanner') {
      setAttendanceSubView('qr');
    }
    if (tab === 'attendance-monitoring') {
      setAttendanceSubView('monitoring');
    }
    if (tab === 'rfid-monitoring') {
      setAttendanceSubView('rfid');
    }

    // Permission enforcement
    if (tab !== 'login' && tab !== '403' && tab !== '404' && currentUser) {
      const reqPerm = getTabRequiredPermission(tab);
      if (reqPerm && !hasPermission(currentUser.role, reqPerm, currentUser.permissions)) {
        setActiveTab('403');
        if (window.location.pathname !== '/403') {
          window.history.pushState(null, '', '/403');
        }
        return;
      }
    }

    setActiveTab(tab);

    const path = getPathFromTab(tab);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  const handleLogin = async (
    username: string,
    password: string,
    rememberMe: boolean
  ) => {
    setAuthError(null);
    const res = await authService.login(username, password, rememberMe);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      showToast(`Selamat datang kembali, ${res.user.name}!`, 'success');
      
      let targetTab = 'dashboard';
      if (redirectPath) {
        targetTab = getTabFromPath(redirectPath);
        setRedirectPath(null);
      } else {
        const firstRoute = getFirstAccessibleRoute(res.user);
        if (firstRoute) {
          targetTab = firstRoute;
        }
      }
      handleSetActiveTab(targetTab);
    } else {
      setAuthError(res.message || 'Username atau password tidak sesuai.');
    }
    return res;
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveTab('login');
    window.history.pushState(null, '', '/login');
    showToast('Anda telah berhasil keluar dari sistem SIUBA.', 'info');
  };

  const handleRedirectToLogin = (currentPath?: string) => {
    const targetRedirect = currentPath || window.location.pathname;
    const loginUrl = targetRedirect && targetRedirect !== '/' && targetRedirect !== '/dashboard' && targetRedirect !== '/login'
      ? `/login?redirect=${encodeURIComponent(targetRedirect)}`
      : '/login';
    setRedirectPath(targetRedirect);
    setActiveTab('login');
    window.history.pushState(null, '', loginUrl);
  };

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'staff-integrated-dashboard': return 'Dashboard SDM';
      case 'staff-attendance': return 'Presensi Terpadu SDM & Guru';
      case 'staff-master': return 'Master Data SDM & Pengajar';
      case 'staff-report-center': return 'Laporan Presensi SDM';
      case 'dashboard': return 'Dashboard Operasional';
      case 'integrated-dashboard': return 'Dashboard Terpadu';
      case 'attendance-dashboard': return 'Pusat Absensi Santri';
      case 'attendance-monitoring': return 'Live Monitoring Sesi Absensi';
      case 'executive-dashboard': return 'Dashboard Eksekutif';
      case 'report-center': return 'Pusat Laporan';
      case 'security-audit': return 'Keamanan & Audit Trail';
      case 'sync-center': return 'Pusat Sinkronisasi & PWA';
      case 'qr-scanner': return 'Terminal Scanner QR';
      case 'qr-bulk-print': return 'Cetak Kartu & Label QR';
      case 'students': return 'Master Data Santri';
      case 'student-card-designer': return 'Desain & Cetak Kartu Santri';
      case 'maintenance': return 'Maintenance Hub';
      case 'database-reset': return 'Maintenance Hub';
      case 'database-backup': return 'Backup & Restore Database';
      case 'events-manager': return 'Manajemen Event & Kegiatan Khusus';
      case 'extracurriculars-groups': return 'Ekstrakurikuler & Kelompok Khusus';
      case 'classrooms': return 'Kelas & Tingkat';
      case 'dormitories': return 'Asrama & Kamar';
      case 'activities': return 'Master Kegiatan';
      case 'sessions': return 'Manajemen Sesi Absensi';
      case 'manual-attendance': return 'Lembar Absensi Manual Santri';
      case 'excuses': return 'Manajemen Izin & Dispensasi Santri';
      case 'scanner-simulator': return 'Simulator Pemindai QR';
      case 'history': return 'Riwayat & Log Transaksi Presensi';
      case 'devices': return 'Manajemen Perangkat Terminal';
      case 'acceptance-tests': return 'Uji Kesiapan Sistem';
      case 'access': return 'Role & Permission';
      case 'psb-management': return 'Pusat Manajemen PSB';
      case 'settings': return 'Pengaturan Sistem & Lingkungan';
      case 'today-timeline': return 'Timeline Rutin & Ibadah';
      case 'prayer-monitoring': return 'Monitoring Shalat 5 Waktu';
      case 'dormitory-monitoring': return 'Monitoring Asrama Santri';
      case 'halaqah-manager': return 'Halaqah Tahfidz & Quran';
      case 'duty-roster-manager': return 'Duty Roster & Piket Asrama';
      case 'routine-schedule-manager': return 'Jadwal Rutinitas Santri';
      case 'teacher-dashboard': return 'Dashboard Guru KBM';
      case 'trainer-attendance': return 'Presensi Pembina Ekskul';
      case 'kbm-monitoring': return 'Monitoring KBM';
      case 'timetable': return 'Jadwal Pelajaran KBM';
      case 'academic-master': return 'Master Akademik';
      case 'academic-reports': return 'Laporan Akademik KBM';
      case 'go-live-qa': return 'Go-Live & QA';
      case '403': return 'Akses Ditolak (403)';
      case '404': return 'Halaman Tidak Ditemukan (404)';
      default: return 'Presensi Terpadu SDM & Guru';
    }
  };

  const openSessionCount = (sessions || []).filter((s) => s && s.status === 'open').length;
  const pendingExcuseCount = (excusals || []).filter((e) => e && e.status === 'pending').length;

  if (authStatus === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'unauthenticated' || activeTab === 'login') {
    return (
      <GuestRoute
        status={authStatus}
        onRedirectToApp={() => handleSetActiveTab('dashboard')}
      >
        <LoginPage
          onLogin={handleLogin}
          errorMessage={authError}
        />
      </GuestRoute>
    );
  }

  return (
    <ProtectedRoute
      status={authStatus}
      user={currentUser}
      onRedirectToLogin={handleRedirectToLogin}
      onBackToDashboard={() => handleSetActiveTab('dashboard')}
    >
      <div className="flex h-screen h-[100dvh] w-full min-h-0 min-w-0 overflow-hidden bg-[#F7F8F7] font-sans text-slate-900 antialiased selection:bg-[#1F5C45] selection:text-white">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          currentUser={currentUser}
          setCurrentUser={(user) => {
            setCurrentUser(user);
            // Re-validate current active tab for the new user
            const reqPerm = getTabRequiredPermission(activeTab);
            if (reqPerm && !hasPermission(user.role, reqPerm, user.permissions)) {
              handleSetActiveTab('dashboard');
            }
          }}
          allUsers={users}
          openSessionCount={openSessionCount}
          pendingExcuseCount={pendingExcuseCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onLogout={handleLogout}
          isLoadingAuth={false}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F8F7]">
          {/* Top Header */}
          <TopHeader
            activeTabTitle={getActiveTabTitle()}
            currentUser={currentUser}
            simulatedTime={simulatedTime}
            setSimulatedTime={setSimulatedTime}
            onResetData={handleResetData}
            onOpenSyncCenter={() => setActiveTab('sync-center')}
            onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
            onLogout={handleLogout}
          />

          {/* Content View Body with Bento Padding */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 md:p-6 lg:p-7 space-y-6 max-w-full">
            <div className="w-full max-w-[1600px] mx-auto min-w-0 space-y-6">
            {activeTab === '403' && (
              <Forbidden403
                onBackToDashboard={() => handleSetActiveTab('dashboard')}
              />
            )}

            {activeTab === '404' && (
              <NotFound404
                onBackToDashboard={() => handleSetActiveTab('dashboard')}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                students={students}
                activities={activities}
                sessions={sessions}
                records={records}
                sessionParticipants={sessionParticipants}
                excusals={excusals}
                onNavigateTab={(tab, sessionId) => {
                  if (sessionId) setSelectedSessionId(sessionId);
                  setActiveTab(tab);
                }}
            />
          )}

          {activeTab === 'profile-360' && (
            <Profile360View
              currentUser={currentUser}
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              records={records}
              excusals={excusals}
              halaqahs={halaqahs}
              halaqahMembers={halaqahMembers}
              dutyRosters={dutyRosters}
              activities={activities}
              sessions={sessions}
              teachers={teachers}
            />
          )}

          {activeTab === 'executive-dashboard' && (
            <ExecutiveDashboardView
              sessions={sessions}
              participants={sessionParticipants}
              records={records}
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              categories={categories}
              activities={activities}
              excusals={excusals}
              devices={devices}
              currentUser={currentUser}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'report-center' && (
            <IntegratedReportCenterPage
              currentUser={currentUser}
              initialCategory={reportCategory || 'hub'}
              initialFilters={reportFilters}
              sessions={sessions}
              participants={sessionParticipants}
              records={records}
              students={students}
              classrooms={classrooms}
              categories={categories}
              activities={activities}
              devices={devices}
              deviceLogs={deviceLogs}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'attendance-dashboard' && (
            <AttendanceDashboardPage
              onNavigateToManual={(sId) => {
                if (sId) setSelectedAttendanceSessionId(sId);
                setActiveTab('manual-attendance');
              }}
              onNavigateToQr={(sId) => {
                if (sId) setSelectedAttendanceSessionId(sId);
                setActiveTab('qr-scanner');
              }}
              onNavigateToSessions={() => {
                setAttendanceSubView('sessions');
                setActiveTab('sessions');
              }}
              onNavigateToSessionDetail={(sId) => {
                setSelectedAttendanceSessionId(sId);
                setAttendanceSubView('detail');
                setActiveTab('sessions');
              }}
              onNavigateToRfid={() => {
                setActiveTab('rfid-monitoring');
              }}
              onNavigateToMonitoring={() => {
                setActiveTab('attendance-monitoring');
              }}
            />
          )}

          {activeTab === 'attendance-monitoring' && (
            <AttendanceMonitoringPage
              onBack={() => setActiveTab('attendance-dashboard')}
              onNavigateToDetail={(sId) => {
                setSelectedAttendanceSessionId(sId);
                setAttendanceSubView('detail');
                setActiveTab('sessions');
              }}
              onNavigateToManual={(sId) => {
                setSelectedAttendanceSessionId(sId);
                setActiveTab('manual-attendance');
              }}
              onNavigateToQr={(sId) => {
                setSelectedAttendanceSessionId(sId);
                setActiveTab('qr-scanner');
              }}
            />
          )}

          {activeTab === 'rfid-monitoring' && (
            <RfidMonitoringPage
              onBack={() => setActiveTab('attendance-dashboard')}
            />
          )}

          {activeTab === 'manual-attendance' && (
            <ManualAttendancePage
              initialSessionId={selectedAttendanceSessionId || selectedSessionId || undefined}
              currentUser={currentUser}
              onBack={() => setActiveTab('attendance-dashboard')}
              onNavigateToDetail={(sId) => {
                setSelectedAttendanceSessionId(sId);
                setAttendanceSubView('detail');
                setActiveTab('sessions');
              }}
            />
          )}

          {activeTab === 'excuses' && (
            <ExcuseManagerView
              excusals={excusals}
              students={students}
              sessions={sessions}
              currentUser={currentUser!}
              onAddExcuse={handleAddExcusal}
              onUpdateExcuseStatus={(id, status, approvedBy) => {
                if (status === 'approved') handleApproveExcusal(id);
                else if (status === 'rejected') handleRejectExcusal(id, '');
                else if (status === 'cancelled') handleCancelExcusal(id);
              }}
              onAddExcusal={handleAddExcusal}
              onApproveExcusal={handleApproveExcusal}
              onRejectExcusal={handleRejectExcusal}
              onCancelExcusal={handleCancelExcusal}
            />
          )}

          {activeTab === 'sessions' && (
            attendanceSubView === 'detail' && selectedAttendanceSessionId ? (
              <SessionDetailPage
                sessionId={selectedAttendanceSessionId}
                onBack={() => setAttendanceSubView('sessions')}
                currentUser={currentUser}
                onNavigateToManual={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setActiveTab('manual-attendance');
                }}
                onNavigateToQr={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setActiveTab('qr-scanner');
                }}
              />
            ) : (
              <SessionListPage
                userRole={currentUser.role}
                onNavigateDetail={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setAttendanceSubView('detail');
                }}
                onNavigateManual={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setActiveTab('manual-attendance');
                }}
                onNavigateQr={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setActiveTab('qr-scanner');
                }}
                onShowToast={showToast}
              />
            )
          )}

          {activeTab === 'students' && studentSubView === 'list' && (
            <StudentListPage
              userRole={currentUser.role}
              onNavigateCreate={() => setStudentSubView('create')}
              onNavigateDetail={(id) => {
                setSelectedStudentDetailId(id);
                setStudentSubView('detail');
              }}
              onNavigateEdit={(id) => {
                setSelectedStudentDetailId(id);
                setStudentSubView('edit');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'students' && studentSubView === 'detail' && selectedStudentDetailId && (
            <StudentDetailPage
              studentId={selectedStudentDetailId}
              userRole={currentUser.role}
              onNavigateBack={() => setStudentSubView('list')}
              onNavigateEdit={(id) => {
                setSelectedStudentDetailId(id);
                setStudentSubView('edit');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'students' && studentSubView === 'create' && (
            <StudentCreatePage
              onNavigateBack={() => setStudentSubView('list')}
              onSuccess={(newId) => {
                setSelectedStudentDetailId(newId);
                setStudentSubView('detail');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'students' && studentSubView === 'edit' && selectedStudentDetailId && (
            <StudentEditPage
              studentId={selectedStudentDetailId}
              onNavigateBack={() => setStudentSubView('detail')}
              onSuccess={(updatedId) => {
                setSelectedStudentDetailId(updatedId);
                setStudentSubView('detail');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'student-card-designer' && (
            <StudentCardDesignerView
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'extracurriculars-groups' && (
            <ExtracurricularsGroupsView
              extracurriculars={extracurriculars}
              extracurricularMembers={extracurricularMembers}
              studentGroups={studentGroups}
              studentGroupMembers={studentGroupMembers}
              students={students}
              onAddExtracurricular={handleAddExtracurricular}
              onAddExtracurricularMember={handleAddExtracurricularMember}
              onRemoveExtracurricularMember={handleRemoveExtracurricularMember}
              onAddStudentGroup={handleAddStudentGroup}
              onAddStudentGroupMember={handleAddStudentGroupMember}
              onRemoveStudentGroupMember={handleRemoveStudentGroupMember}
            />
          )}

          {activeTab === 'events-manager' && (
            <EventsManagerView
              events={specialEvents}
              eventSessions={eventSessions}
              eventRegistrations={eventRegistrations}
              eventOrganizers={eventOrganizers}
              activities={serverActivities.length ? serverActivities : activities}
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              extracurriculars={extracurriculars}
              extracurricularMembers={extracurricularMembers}
              studentGroups={studentGroups}
              studentGroupMembers={studentGroupMembers}
              halaqahs={halaqahs}
              halaqahMembers={halaqahMembers}
              dutyRosters={dutyRosters}
              participantRules={participantRules}
              walkInAuditLogs={walkInAuditLogs}
              excusals={excusals}
              currentUser={currentUser}
              onAddEvent={handleAddEvent}
              onUpdateEventStatus={handleUpdateEventStatus}
              onAddEventSession={handleAddEventSession}
              onAddEventRegistration={handleAddEventRegistration}
              onUpdateRegistrationStatus={handleUpdateRegistrationStatus}
              onAddParticipantRule={handleAddParticipantRule}
              onRemoveParticipantRule={handleRemoveParticipantRule}
              onCreateEventDispensations={handleCreateEventDispensations}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesView
              activities={activities}
              categories={categories}
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              extracurriculars={extracurriculars}
              extracurricularMembers={extracurricularMembers}
              studentGroups={studentGroups}
              studentGroupMembers={studentGroupMembers}
              activityParticipants={activityParticipants}
              onToggleMethod={handleToggleActivityMethod}
              onAddActivity={handleAddActivity}
              onUpdateActivity={handleUpdateActivity}
              onDeleteActivity={handleDeleteActivity}
            />
          )}

          {activeTab === 'classrooms' && (
            <ClassroomsDormitoriesView
              mode="classrooms"
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              students={students}
              onAddClassroom={handleAddClassroom}
              onUpdateClassroom={handleUpdateClassroom}
              onDeleteClassroom={handleDeleteClassroom}
            />
          )}

          {activeTab === 'dormitories' && (
            <ClassroomsDormitoriesView
              mode="dormitories"
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              students={students}
              onAddDormitory={handleAddDormitory}
              onUpdateDormitory={handleUpdateDormitory}
              onDeleteDormitory={handleDeleteDormitory}
              onAddDormitoryRoom={handleAddDormitoryRoom}
              onUpdateDormitoryRoom={handleUpdateDormitoryRoom}
              onDeleteDormitoryRoom={handleDeleteDormitoryRoom}
            />
          )}

          {activeTab === 'qr-scanner' && (
            <QrScannerPage
              initialSessionId={selectedAttendanceSessionId || selectedSessionId || undefined}
              currentUser={currentUser}
              onBack={() => setActiveTab('attendance-dashboard')}
              onNavigateToDetail={(sId) => {
                setSelectedAttendanceSessionId(sId);
                setAttendanceSubView('detail');
                setActiveTab('sessions');
              }}
            />
          )}

          {activeTab === 'qr-bulk-print' && (
            <QrBulkPrintView
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
            />
          )}

          {activeTab === 'scanner-simulator' && (
            <>
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                Mode simulasi: hasil di halaman ini hanya untuk latihan/uji coba dan <b>tidak disimpan ke server</b>. Untuk absensi sungguhan gunakan Scan QR, Absensi Manual, atau alat RFID.
              </div>
                          <InteractiveScannerSimulator
                sessions={sessions}
                students={students}
                activities={activities}
                devices={devices}
                records={[...simulatedRecords, ...records]}
                currentUser={currentUser}
                sessionParticipants={sessionParticipants}
                onRecordAttendance={handleRecordAttendance}
              />
            </>
          )}

          {activeTab === 'rfid-simulator' && (
            <>
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                Mode simulasi: hasil di halaman ini hanya untuk latihan/uji coba dan <b>tidak disimpan ke server</b>. Untuk absensi sungguhan gunakan Scan QR, Absensi Manual, atau alat RFID.
              </div>
                          <RfidSimulatorView
                sessions={sessions}
                students={students}
                activities={activities}
                devices={devices}
                records={[...simulatedRecords, ...records]}
                sessionParticipants={sessionParticipants}
                currentUser={currentUser}
                onRecordAttendance={handleRecordAttendance}
                onShowToast={showToast}
              />
            </>
          )}

          {activeTab === 'history' && (
            <HistoryView
              records={records}
              sessions={sessions}
              recordHistories={recordHistories}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesView
              devices={devices}
              sessions={sessions}
              activities={activities}
              deviceLogs={deviceLogs}
              currentUser={currentUser}
              onAddDevice={handleAddDevice}
              onUpdateDevice={handleUpdateDevice}
              onRotateSecret={handleRotateDeviceSecret}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'acceptance-tests' && (
            <SystemReadinessView onShowToast={showToast} />
          )}

          {activeTab === 'access' && (
            <AccessControlView
              currentUser={currentUser}
              allUsers={users}
              onSelectUser={handleSelectUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onUpdateRolePermissions={handleUpdateRolePermissions}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'psb-management' && (
            <div className="space-y-4 pb-8">
              <div className="bg-gradient-to-r from-[#12372A] to-[#1F5C45] text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-lime-400 text-lime-950 uppercase tracking-wider">
                      Modul PSB SIUBA
                    </span>
                    <span className="text-xs text-emerald-200">Portal Verifikasi & Seleksi</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">Pusat Manajemen Penerimaan Santri Baru (PSB)</h2>
                  <p className="text-xs text-white/80 mt-0.5">Kelola formulir pendaftar, nilai tes Al-Qur'an & akademik, status kelulusan, dan export data calon santri.</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <a
                    href="/manajemen-psb"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/20"
                  >
                    <span>Buka Layar Penuh</span>
                    <span className="material-symbols-rounded text-[16px]">open_in_new</span>
                  </a>
                </div>
              </div>
              <div className="w-full h-[calc(100vh-14rem)] min-h-[620px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <iframe
                  src="/manajemen-psb"
                  title="Pusat Manajemen PSB"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {activeTab === 'staff-integrated-dashboard' && (
            <IntegratedDashboardPage
              currentUser={currentUser}
              sessions={sessions}
              participants={sessionParticipants}
              records={records}
              students={students}
              classrooms={classrooms}
              dormitories={dormitories}
              categories={categories}
              activities={activities}
              excusals={excusals}
              devices={devices}
              onNavigateTab={(t, params) => {
                if (params?.category) setReportCategory(params.category);
                if (params?.filters) setReportFilters(params.filters);
                else if (params) setReportFilters(params);
                handleSetActiveTab(t);
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'staff-master' && staffSubView === 'list' && (
            <StaffListPage
              userRole={currentUser.role}
              onNavigateCreate={() => setStaffSubView('create')}
              onNavigateDetail={(id) => {
                setSelectedStaffDetailId(id);
                setStaffSubView('detail');
              }}
              onNavigateEdit={(id) => {
                setSelectedStaffDetailId(id);
                setStaffSubView('edit');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'staff-master' && staffSubView === 'detail' && selectedStaffDetailId && (
            <StaffDetailPage
              staffId={selectedStaffDetailId}
              userRole={currentUser.role}
              onNavigateBack={() => setStaffSubView('list')}
              onNavigateEdit={(id) => {
                setSelectedStaffDetailId(id);
                setStaffSubView('edit');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'staff-master' && staffSubView === 'create' && (
            <StaffCreatePage
              onNavigateBack={() => setStaffSubView('list')}
              onSuccess={(newId) => {
                setSelectedStaffDetailId(newId);
                setStaffSubView('detail');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'staff-master' && staffSubView === 'edit' && selectedStaffDetailId && (
            <StaffEditPage
              staffId={selectedStaffDetailId}
              onNavigateBack={() => setStaffSubView('detail')}
              onSuccess={(updatedId) => {
                setSelectedStaffDetailId(updatedId);
                setStaffSubView('detail');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'staff-attendance' && (
            <StaffAttendanceView
              currentUser={currentUser}
              sessions={sessions}
            />
          )}

          {activeTab === 'trainer-attendance' && (
            <TrainerAttendanceView
              currentUser={currentUser}
            />
          )}

          {activeTab === 'staff-report-center' && (
            <IntegratedReportCenterPage
              currentUser={currentUser}
              initialCategory={reportCategory || 'hub'}
              initialFilters={reportFilters}
              sessions={sessions}
              participants={sessionParticipants}
              records={records}
              students={students}
              classrooms={classrooms}
              categories={categories}
              activities={activities}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onResetData={handleResetData}
              onNavigateToReset={() => setActiveTab('maintenance')}
              onNavigateToCardDesigner={() => setActiveTab('student-card-designer')}
              onNavigateTab={(t) => setActiveTab(t)}
              onShowToast={showToast}
            />
          )}

          {(activeTab === 'maintenance' || activeTab === 'database-reset') && (
            <MaintenanceHubPage
              currentUser={currentUser}
              fullDataset={{
                students,
                sessions,
                records,
                sessionParticipants,
                recordHistories,
                excusals,
                activities,
                classrooms,
                dormitories,
                dormitoryRooms,
                extracurriculars,
                extracurricularMembers,
                studentGroups,
                studentGroupMembers,
                specialEvents,
                eventSessions,
                eventRegistrations,
                eventOrganizers,
                routineSchedules,
                routineOverrides,
                prayerCalendars,
                dutyRosters,
                teachingAssignments,
                teachers,
                subjects,
                academicSchedules,
                devices,
                deviceLogs,
                users,
              }}
              onResetCompleted={handleDatabaseResetCompleted}
              onShowToast={showToast}
              onUpdateDataset={(newDataset) => {
                if (newDataset.records) setRecords(newDataset.records);
                if (newDataset.students) setStudents(newDataset.students);
              }}
              initialTab={activeTab === 'database-reset' ? 'reset' : 'status'}
            />
          )}

          {activeTab === 'go-live-qa' && (
            <GoLiveQAPage onShowToast={showToast} />
          )}

          {activeTab === 'security-audit' && (
            <SecurityAuditView
              sessions={sessions}
              sessionParticipants={sessionParticipants}
              records={records}
              students={students}
              devices={devices}
              users={users}
              currentUser={currentUser}
              onUpdateRecords={(newRecords) => setRecords(newRecords)}
              onUpdateParticipants={(newParts) => setSessionParticipants(newParts)}
              onUpdateStudents={(newStudents) => setStudents(newStudents)}
              onUpdateDevices={(newDevices) => setDevices(newDevices)}
              onRestoreDatabase={(dump) => {
                if (dump.students) setStudents(dump.students);
                if (dump.sessions) setSessions(dump.sessions);
                if (dump.records) setRecords(dump.records);
                if (dump.activities) setActivities(dump.activities);
                if (dump.classrooms) setClassrooms(dump.classrooms);
                if (dump.dormitories) setDormitories(dump.dormitories);
                if (dump.dormitoryRooms) setDormitoryRooms(dump.dormitoryRooms);
                if (dump.excusals) setExcusals(dump.excusals);
                showToast(`Database berhasil di-restore dari snapshot terverifikasi.`, 'success');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'sync-center' && (
            <SyncCenterView
              sessions={sessions}
              participants={sessionParticipants}
              sessionParticipants={sessionParticipants}
              students={students}
              activities={activities}
              records={records}
              recordHistories={recordHistories}
              excusals={excusals}
              devices={devices}
              currentUser={currentUser}
              onUpdateRecords={(newRecords) => setRecords(newRecords)}
              onUpdateRecordHistories={(newHistories) => setRecordHistories(newHistories)}
              onUpdateParticipants={(newParts) => setSessionParticipants(newParts)}
              onApplySyncedRecords={(newRecords) => {
                if (newRecords.length) setRecords((prev) => [...newRecords, ...prev]);
                void refreshServerData(true); // ambil data terbaru setelah antrean offline terkirim
                showToast(`Berhasil menambahkan ${newRecords.length} record dari antrean offline ke server.`, 'success');
              }}
              onRestoreDatabase={(dump) => {
                if (dump.students) setStudents(dump.students);
                if (dump.sessions) setSessions(dump.sessions);
                if (dump.records) setRecords(dump.records);
                if (dump.activities) setActivities(dump.activities);
                if (dump.classrooms) setClassrooms(dump.classrooms);
                if (dump.dormitories) setDormitories(dump.dormitories);
                if (dump.dormitoryRooms) setDormitoryRooms(dump.dormitoryRooms);
                if (dump.excusals) setExcusals(dump.excusals);
                showToast(`Database berhasil di-restore dari backup ${dump.meta.version} (${dump.meta.createdAt}).`, 'success');
              }}
              onShowToast={showToast}
              onNavigateToTab={(t) => setActiveTab(t as any)}
            />
          )}

          {activeTab === 'academic-master' && (
            <AcademicMasterView
              academicYears={academicYears}
              semesters={semesters}
              onAcademicPeriodsChanged={(y, sm) => { setAcademicYears(y); setSemesters(sm); }}
              subjects={subjects}
              teachers={teachers}
              teachingAssignments={teachingAssignments}
              classrooms={classrooms}
              lessonPeriods={lessonPeriods}
              calendarEvents={academicCalendarEvents}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onAddAssignment={handleAddAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onAddCalendarEvent={handleAddCalendarEvent}
              onDeleteCalendarEvent={handleDeleteCalendarEvent}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableManagerView
              academicSchedules={academicSchedules}
              classrooms={classrooms}
              subjects={subjects}
              teachers={teachers}
              lessonPeriods={lessonPeriods}
              onAddSchedule={handleAddSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onGenerateSessions={handleGenerateAcademicSessions}
              onAddLessonPeriod={handleAddLessonPeriod}
              onUpdateLessonPeriod={handleUpdateLessonPeriod}
              onDeleteLessonPeriod={handleDeleteLessonPeriod}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'teacher-dashboard' && (
            <TeacherDashboardView
              currentUser={currentUser}
              sessions={sessions}
              contexts={academicSessionContexts}
              records={records}
              participants={sessionParticipants}
              teachers={teachers}
              substitutions={academicSubstitutions}
              classrooms={classrooms}
              lessonPeriods={lessonPeriods}
              onOpenSession={(sId) => handleUpdateSessionStatus(sId, 'open')}
              onCloseSession={(sId) => handleUpdateSessionStatus(sId, 'closed')}
              onNavigateToManual={(sId) => {
                setSelectedSessionId(sId);
                setActiveTab('manual-attendance');
              }}
              onNavigateToQr={(sId) => {
                setSelectedSessionId(sId);
                setActiveTab('qr-scanner');
              }}
              onNavigateToRfid={(sId) => {
                setSelectedSessionId(sId);
                setActiveTab('rfid-simulator');
              }}
              onRecordCopied={(newRecs, msg) => {
                setRecords((prev) => [...newRecs, ...prev]);
                showToast(msg, 'success');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'kbm-monitoring' && (
            <KbmMonitoringView
              sessions={sessions}
              contexts={academicSessionContexts}
              records={records}
              students={students}
              classrooms={classrooms}
              subjects={subjects}
              teachers={teachers}
              lessonPeriods={lessonPeriods}
            />
          )}

          {activeTab === 'academic-reports' && (
            <AcademicReportsView
              sessions={sessions}
              contexts={academicSessionContexts}
              records={records}
              students={students}
              classrooms={classrooms}
              subjects={subjects}
              lessonPeriods={lessonPeriods}
              onShowToast={showToast}
            />
          )}

          {/* Sprint 7 Views */}
          {activeTab === 'today-timeline' && (
            <TodayTimelineView
              simulatedTime={simulatedTime}
              sessions={sessions}
              activities={activities}
              categories={categories}
              records={records}
              participants={sessionParticipants}
              students={students}
              dormitoryRooms={dormitoryRooms}
              halaqahMembers={halaqahMembers}
              dutyRosters={dutyRosters}
              routineSchedules={routineSchedules}
              routineOverrides={routineOverrides}
              prayerCalendars={prayerCalendars}
              currentUser={currentUser}
              onUpdateSessions={setSessions}
              onUpdateRecords={setRecords}
              onUpdateParticipants={setSessionParticipants}
              onOpenSession={(sId) => handleUpdateSessionStatus(sId, 'open')}
              onCloseSession={(sId) => handleUpdateSessionStatus(sId, 'closed')}
              onShowToast={showToast}
              onGenerateSessions={handleGenerateRoutineSessions}
            />
          )}

          {activeTab === 'prayer-monitoring' && (
            <PrayerMonitoringView
              simulatedTime={simulatedTime}
              sessions={sessions}
              records={records}
              students={students}
            />
          )}

          {activeTab === 'dormitory-monitoring' && (
            <DormitoryMonitoringView
              simulatedTime={simulatedTime}
              dormitories={dormitories}
              dormitoryRooms={dormitoryRooms}
              students={students}
              sessions={sessions}
              records={records}
              participants={sessionParticipants}
            />
          )}

          {activeTab === 'halaqah-manager' && (
            <HalaqahManagerView
              halaqahs={halaqahs}
              halaqahMembers={halaqahMembers}
              students={students}
              users={users}
              onUpdateHalaqahs={updateHalaqahs}
              onUpdateHalaqahMembers={updateHalaqahMembers}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'duty-roster-manager' && (
            <DutyRosterManagerView
              activities={serverActivities.length ? serverActivities : activities}
              dutyRosters={dutyRosters}
              students={students}
              currentUser={currentUser}
              onUpdateDutyRosters={updateDutyRosters}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'routine-schedule-manager' && (
            <RoutineScheduleManagerView
              activities={activities}
              routineSchedules={routineSchedules}
              routineOverrides={routineOverrides}
              prayerCalendars={prayerCalendars}
              activitySupervisors={activitySupervisors}
              users={users}
              onUpdateRoutineSchedules={updateRoutineSchedules}
              onUpdateRoutineOverrides={updateRoutineOverrides}
              onUpdatePrayerCalendars={updatePrayerCalendars}
              onUpdateSupervisors={updateSupervisors}
              onShowToast={showToast}
            />
          )}
            </div>
          </main>
        </div>

      {/* Floating Toast Notification Bento Styled */}
      {toast && (
        <div
          id="global-toast"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3.5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold max-w-md border bg-white transition-all ${
            toast.type === 'success'
              ? 'text-zinc-900 border-emerald-200 shadow-emerald-950/5'
              : toast.type === 'error'
              ? 'text-zinc-900 border-rose-200 shadow-rose-950/5'
              : 'text-zinc-900 border-sky-200 shadow-sky-950/5'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1 text-zinc-800">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}

export default App;
