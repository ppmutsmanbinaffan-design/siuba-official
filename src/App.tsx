import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LoginPage, AuthLoadingScreen, GuestRoute, ProtectedRoute, Forbidden403, NotFound404 } from './components/auth';
import { authService, AuthStatus } from './services/authService';
import { getTabFromPath, getPathFromTab } from './utils/router';
import { hasPermission, getTabRequiredPermission, getFirstAccessibleRoute, can } from './config/navigationRegistry';
import { AccessScopeService } from './services/accessScopeService';
import { DashboardView } from './components/DashboardView';
import { ManualAttendanceView } from './components/ManualAttendanceView';
import { ExcuseManagerView } from './components/ExcuseManagerView';
import { SessionsView } from './components/SessionsView';
import { StudentsView } from './components/StudentsView';
import { ActivitiesView } from './components/ActivitiesView';
import { ExtracurricularsGroupsView } from './components/ExtracurricularsGroupsView';
import { ClassroomsDormitoriesView } from './components/ClassroomsDormitoriesView';
import { DevicesView } from './components/DevicesView';
import { RfidSimulatorView } from './components/RfidSimulatorView';
import { QrScannerView } from './components/QrScannerView';
import { QrBulkPrintView } from './components/QrBulkPrintView';
import { InteractiveScannerSimulator } from './components/InteractiveScannerSimulator';
import { HistoryView } from './components/HistoryView';
import { AcceptanceTestView } from './components/AcceptanceTestView';
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
import { ReportCenterView } from './components/ReportCenterView';
import { SyncCenterView } from './components/SyncCenterView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { GoLiveQAView } from './components/GoLiveQAView';
import { StaffAttendanceView } from './components/StaffAttendanceView';
import { TrainerAttendanceView } from './components/TrainerAttendanceView';
import { StaffIntegratedDashboardView } from './components/StaffIntegratedDashboardView';
import { StaffReportCenterView } from './components/StaffReportCenterView';
import { IntegratedDashboardPage } from './features/dashboard';
import { IntegratedReportCenterPage } from './features/reports';
import { MaintenanceHubPage } from './features/maintenance';
import { StudentCardDesignerView } from './components/StudentCardDesignerView';
import { ServerConnectivityService } from './services/serverConnectivityService';
import { OfflineStorageService } from './services/offlineStorageService';
import { AcademicSessionGenerator } from './services/academicSessionGenerator';
import { apiClient } from './services/apiClient';
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
import { 
  INITIAL_ACADEMIC_CALENDAR_EVENTS,
  INITIAL_ACADEMIC_SCHEDULES,
  INITIAL_ACADEMIC_SESSION_CONTEXTS,
  INITIAL_ACADEMIC_SUBSTITUTIONS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_ACTIVITIES, 
  INITIAL_ACTIVITY_PARTICIPANTS, 
  INITIAL_ACTIVITY_SUPERVISORS,
  INITIAL_ACTIVITY_PARTICIPANT_RULES,
  INITIAL_CATEGORIES, 
  INITIAL_CLASSROOMS, 
  INITIAL_CLASS_HISTORIES, 
  INITIAL_DEVICES, 
  INITIAL_DEVICE_LOGS,
  INITIAL_DORMITORIES, 
  INITIAL_DORMITORY_ROOMS, 
  INITIAL_DUTY_ROSTERS,
  INITIAL_EVENT_ORGANIZERS,
  INITIAL_EVENT_REGISTRATIONS,
  INITIAL_EVENT_SESSIONS,
  INITIAL_EXTRACURRICULARS, 
  INITIAL_EXTRACURRICULAR_MEMBERS, 
  INITIAL_HALAQAHS,
  INITIAL_HALAQAH_MEMBERS,
  INITIAL_LESSON_PERIODS,
  INITIAL_PRAYER_CALENDARS,
  INITIAL_RECORDS, 
  INITIAL_RECORD_HISTORIES,
  INITIAL_ROOM_HISTORIES, 
  INITIAL_ROUTINE_OVERRIDES,
  INITIAL_ROUTINE_SCHEDULES,
  INITIAL_SPECIAL_EVENTS,
  INITIAL_WALK_IN_AUDIT_LOGS,
  INITIAL_SEMESTERS,
  INITIAL_SESSIONS, 
  INITIAL_SESSION_PARTICIPANTS, 
  INITIAL_STUDENTS, 
  INITIAL_STUDENT_EXCUSALS,
  INITIAL_STUDENT_GROUPS, 
  INITIAL_STUDENT_GROUP_MEMBERS, 
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
  INITIAL_TEACHING_ASSIGNMENTS,
  INITIAL_USERS 
} from './data/initialData';
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
  UserRole,
  SpecialEvent,
  EventSession,
  EventRegistration,
  EventOrganizer,
  ActivityParticipantRule,
  WalkInAuditLog
} from './types';
import { AttendanceEngine } from './services/attendanceEngine';
import { RfidAttendanceService } from './services/rfidAttendanceService';
import { ActivityParticipantService } from './services/activityParticipantService';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

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
    try {
      const saved = localStorage.getItem('siuba_custom_users_v1');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with INITIAL_USERS to ensure any newly added default accounts (such as panitia.psb) are always present
          const merged = [...parsed];
          for (const iu of INITIAL_USERS) {
            const idx = merged.findIndex((u) => u.username === iu.username || u.id === iu.id);
            if (idx === -1) {
              merged.push(iu);
            } else if (iu.roles && (!merged[idx].roles || merged[idx].roles.length === 0)) {
              merged[idx] = { ...merged[idx], roles: iu.roles };
            }
          }
          return merged;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  });

  // Sync users list from backend database on startup
  useEffect(() => {
    fetch('/api/v1/users', {
      headers: { 'Accept': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          setUsers((prev) => {
            const next = data.users.map((dbUser: User) => {
              const localMatch = prev.find((p) => p.id === dbUser.id || p.username === dbUser.username);
              return {
                ...dbUser,
                password: localMatch?.password || 'password',
              };
            });
            try {
              localStorage.setItem('siuba_custom_users_v1', JSON.stringify(stripPasswordsForStorage(next)));
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>(() => loadPersistentCollection('siuba_master_students', INITIAL_STUDENTS));
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => loadPersistentCollection('siuba_master_classrooms', INITIAL_CLASSROOMS));
  const [dormitories, setDormitories] = useState<Dormitory[]>(() => loadPersistentCollection('siuba_master_dormitories', INITIAL_DORMITORIES));
  const [dormitoryRooms, setDormitoryRooms] = useState<DormitoryRoom[]>(() => loadPersistentCollection('siuba_master_dormitory_rooms', INITIAL_DORMITORY_ROOMS));
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [activities, setActivities] = useState<Activity[]>(() => loadPersistentCollection('siuba_master_activities', INITIAL_ACTIVITIES));
  const [sessions, setSessions] = useState<AttendanceSession[]>(() => loadPersistentCollection('siuba_attendance_sessions_cache', INITIAL_SESSIONS));

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
  const [records, setRecords] = useState<AttendanceRecord[]>(() => loadPersistentCollection('siuba_attendance_records_cache', INITIAL_RECORDS));
  const [devices, setDevices] = useState<AttendanceDevice[]>(INITIAL_DEVICES);
  const [deviceLogs, setDeviceLogs] = useState<AttendanceDeviceLog[]>(INITIAL_DEVICE_LOGS);
  
  // Sprint 2 State
  const [extracurriculars, setExtracurriculars] = useState<Extracurricular[]>(INITIAL_EXTRACURRICULARS);
  const [extracurricularMembers, setExtracurricularMembers] = useState<ExtracurricularMember[]>(INITIAL_EXTRACURRICULAR_MEMBERS);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(INITIAL_STUDENT_GROUPS);
  const [studentGroupMembers, setStudentGroupMembers] = useState<StudentGroupMember[]>(INITIAL_STUDENT_GROUP_MEMBERS);
  const [classHistories, setClassHistories] = useState<StudentClassHistory[]>(INITIAL_CLASS_HISTORIES);
  const [roomHistories, setRoomHistories] = useState<StudentRoomHistory[]>(INITIAL_ROOM_HISTORIES);
  const [sessionParticipants, setSessionParticipants] = useState<AttendanceSessionParticipant[]>(() => loadPersistentCollection('siuba_session_participants_cache', INITIAL_SESSION_PARTICIPANTS));
  const [activityParticipants, setActivityParticipants] = useState<ActivityParticipant[]>(INITIAL_ACTIVITY_PARTICIPANTS);

  // Sprint 3 State: Excusals & Record Audit Histories
  const [excusals, setExcusals] = useState<StudentExcusal[]>(() => loadPersistentCollection('siuba_student_excusals_v1', INITIAL_STUDENT_EXCUSALS));

  useEffect(() => {
    try {
      localStorage.setItem('siuba_student_excusals_v1', JSON.stringify(excusals));
    } catch {
      // ignore
    }
  }, [excusals]);
  const [recordHistories, setRecordHistories] = useState<AttendanceRecordHistory[]>(INITIAL_RECORD_HISTORIES);

  // Sprint 6 State: Academic / KBM Domain
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(INITIAL_ACADEMIC_YEARS);
  const [semesters, setSemesters] = useState<Semester[]>(INITIAL_SEMESTERS);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>(INITIAL_TEACHING_ASSIGNMENTS);
  const [lessonPeriods, setLessonPeriods] = useState<LessonPeriod[]>(INITIAL_LESSON_PERIODS);
  const [academicSchedules, setAcademicSchedules] = useState<AcademicSchedule[]>(INITIAL_ACADEMIC_SCHEDULES);
  const [academicSubstitutions, setAcademicSubstitutions] = useState<AcademicSubstitution[]>(INITIAL_ACADEMIC_SUBSTITUTIONS);
  const [academicCalendarEvents, setAcademicCalendarEvents] = useState<AcademicCalendarEvent[]>(INITIAL_ACADEMIC_CALENDAR_EVENTS);
  const [academicSessionContexts, setAcademicSessionContexts] = useState<AcademicSessionContext[]>(INITIAL_ACADEMIC_SESSION_CONTEXTS);

  // Sprint 7 State: Routine Activities, Prayers, Dormitory, Halaqah
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>(INITIAL_HALAQAHS);
  const [halaqahMembers, setHalaqahMembers] = useState<HalaqahMember[]>(INITIAL_HALAQAH_MEMBERS);
  const [dutyRosters, setDutyRosters] = useState<DutyRoster[]>(INITIAL_DUTY_ROSTERS);
  const [routineSchedules, setRoutineSchedules] = useState<RoutineSchedule[]>(INITIAL_ROUTINE_SCHEDULES);
  const [routineOverrides, setRoutineOverrides] = useState<RoutineScheduleOverride[]>(INITIAL_ROUTINE_OVERRIDES);
  const [prayerCalendars, setPrayerCalendars] = useState<PrayerTimeCalendar[]>(INITIAL_PRAYER_CALENDARS);
  const [activitySupervisors, setActivitySupervisors] = useState<ActivitySupervisor[]>(INITIAL_ACTIVITY_SUPERVISORS);

  // Sprint 8 State: Events, Participant Rules, Walk-In Audit
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>(INITIAL_SPECIAL_EVENTS);
  const [eventSessions, setEventSessions] = useState<EventSession[]>(INITIAL_EVENT_SESSIONS);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>(INITIAL_EVENT_REGISTRATIONS);
  const [eventOrganizers, setEventOrganizers] = useState<EventOrganizer[]>(INITIAL_EVENT_ORGANIZERS);
  const [participantRules, setParticipantRules] = useState<ActivityParticipantRule[]>(INITIAL_ACTIVITY_PARTICIPANT_RULES);
  const [walkInAuditLogs, setWalkInAuditLogs] = useState<WalkInAuditLog[]>(INITIAL_WALK_IN_AUDIT_LOGS);

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
  const handleAddEvent = (evt: Partial<SpecialEvent>) => {
    const newId = specialEvents.length ? Math.max(...specialEvents.map((e) => e.id)) + 1 : 1;
    const newEvent: SpecialEvent = {
      id: newId,
      code: evt.code || `EVT-${newId}`,
      name: evt.name || 'Event Baru',
      description: evt.description || '',
      event_type: evt.event_type || 'seminar',
      start_at: evt.start_at || '2026-08-25 08:00',
      end_at: evt.end_at || '2026-08-25 12:00',
      location: evt.location || 'Aula Utama',
      capacity: evt.capacity,
      participant_mode: evt.participant_mode || 'registration',
      attendance_enabled: true,
      allow_manual: true,
      allow_qr: true,
      allow_rfid: true,
      status: evt.status || 'published',
      finalization_policy: 'required',
      activity_id: evt.activity_id || 10,
      created_by: evt.created_by || currentUser.name,
      created_at: new Date().toISOString().slice(0, 10),
    };
    setSpecialEvents((prev) => [newEvent, ...prev]);
    showToast(`Event "${newEvent.name}" berhasil dibuat.`, 'success');
  };

  const handleUpdateEventStatus = (eventId: number, status: SpecialEvent['status']) => {
    setSpecialEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status } : e))
    );
    showToast(`Status event berhasil diperbarui menjadi ${status.toUpperCase()}.`, 'info');
  };

  const handleAddEventSession = (session: Partial<EventSession>) => {
    const newId = eventSessions.length ? Math.max(...eventSessions.map((s) => s.id)) + 1 : 1;
    const newSession: EventSession = {
      id: newId,
      event_id: session.event_id || 1,
      name: session.name || 'Sesi Baru',
      start_at: session.start_at || '2026-08-25 08:00',
      present_until: session.present_until || '08:15',
      late_until: session.late_until || '08:30',
      end_at: session.end_at || '2026-08-25 10:00',
      attendance_required: true,
      sort_order: session.sort_order || 1,
    };
    setEventSessions((prev) => [...prev, newSession]);
    showToast(`Sesi "${newSession.name}" berhasil ditambahkan.`, 'success');
  };

  const handleAddEventRegistration = (reg: Partial<EventRegistration>) => {
    const newId = eventRegistrations.length ? Math.max(...eventRegistrations.map((r) => r.id)) + 1 : 1;
    const newReg: EventRegistration = {
      id: newId,
      event_id: reg.event_id || 1,
      student_id: reg.student_id || 1,
      student_name: reg.student_name || 'Santri',
      student_number: reg.student_number || 'UBA260001',
      classroom_name: reg.classroom_name || '-',
      status: reg.status || 'approved',
      registered_at: reg.registered_at || new Date().toISOString().slice(0, 10),
      registration_source: reg.registration_source || 'student_registration',
      approved_by: reg.approved_by,
      approved_at: reg.approved_at,
    };
    setEventRegistrations((prev) => [...prev, newReg]);
    showToast(`Santri "${newReg.student_name}" berhasil terdaftar di event.`, 'success');
  };

  const handleUpdateRegistrationStatus = (registrationId: number, status: EventRegistration['status']) => {
    setEventRegistrations((prev) =>
      prev.map((r) => (r.id === registrationId ? { ...r, status } : r))
    );
    showToast(`Status registrasi berhasil diubah menjadi ${status.toUpperCase()}.`, 'info');
  };

  const handleAddParticipantRule = (rule: Partial<ActivityParticipantRule>) => {
    const newId = participantRules.length ? Math.max(...participantRules.map((r) => r.id)) + 1 : 1;
    const newRule: ActivityParticipantRule = {
      id: newId,
      activity_id: rule.activity_id || 10,
      activity_name: rule.activity_name || 'Kegiatan',
      rule_type: rule.rule_type || 'classroom',
      rule_operator: rule.rule_operator || 'include',
      rule_value: rule.rule_value || 'VII A',
      rule_description: rule.rule_description || '',
      is_active: true,
      created_by: rule.created_by || currentUser.name,
    };
    setParticipantRules((prev) => [...prev, newRule]);
    showToast(`Rule peserta "${newRule.rule_operator.toUpperCase()} ${newRule.rule_type}" berhasil ditambahkan.`, 'success');
  };

  const handleRemoveParticipantRule = (ruleId: number) => {
    setParticipantRules((prev) => prev.filter((r) => r.id !== ruleId));
    showToast('Rule peserta berhasil dihapus.', 'info');
  };

  const handleCreateEventDispensations = (updatedExcusals: StudentExcusal[]) => {
    setExcusals(updatedExcusals);
  };

  const handleAddSubject = (subj: Subject) => setSubjects((prev) => [...prev, subj]);
  const handleUpdateSubject = (id: number, subj: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...subj } : s)));
    showToast('Mata pelajaran berhasil diperbarui.', 'success');
  };
  const handleDeleteSubject = (id: number) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    showToast('Mata pelajaran berhasil dihapus.', 'info');
  };

  const handleAddTeacher = (tch: Teacher) => setTeachers((prev) => [...prev, tch]);
  const handleUpdateTeacher = (id: number, tch: Partial<Teacher>) => {
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...tch } : t)));
    showToast('Data guru berhasil diperbarui.', 'success');
  };
  const handleDeleteTeacher = (id: number) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    showToast('Data guru berhasil dihapus.', 'info');
  };

  const handleAddAssignment = (ta: TeachingAssignment) => setTeachingAssignments((prev) => [...prev, ta]);
  const handleDeleteAssignment = (id: number) => {
    setTeachingAssignments((prev) => prev.filter((ta) => ta.id !== id));
    showToast('Penugasan mengajar berhasil dihapus.', 'info');
  };

  const handleAddCalendarEvent = (ev: AcademicCalendarEvent) => setAcademicCalendarEvents((prev) => [...prev, ev]);
  const handleDeleteCalendarEvent = (id: number) => {
    setAcademicCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
    showToast('Agenda kalender berhasil dihapus.', 'info');
  };

  const handleAddSchedule = (sched: AcademicSchedule) => setAcademicSchedules((prev) => [...prev, sched]);
  const handleDeleteSchedule = (id: number) => setAcademicSchedules((prev) => prev.filter((s) => s.id !== id));

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

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    authService.setAuthenticatedUser(user, `token_${user.id}`, true);
  };

  const handleGenerateAcademicSessions = (dateStr: string) => {
    const res = AcademicSessionGenerator.generateSessionsForDate({
      date: dateStr,
      academicYearId: 1,
      semesterId: 1,
      academicSchedules,
      lessonPeriods,
      calendarEvents: academicCalendarEvents,
      classrooms,
      subjects,
      teachers,
      students,
      activities,
      existingSessions: sessions,
      existingContexts: academicSessionContexts,
      existingParticipants: sessionParticipants,
      currentUser,
    });

    if (res.result.is_holiday) {
      showToast(res.result.errors[0] || 'Tanggal libur.', 'error');
      return;
    }

    if (res.result.sessions_created > 0) {
      setSessions((prev) => [...res.newSessions, ...prev]);
      setAcademicSessionContexts((prev) => [...res.newContexts, ...prev]);
      setSessionParticipants((prev) => [...res.newParticipants, ...prev]);
      if (res.newActivities.length > 0) {
        setActivities((prev) => [...prev, ...res.newActivities]);
      }
      showToast(`Berhasil menggenerate ${res.result.sessions_created} sesi KBM untuk tanggal ${dateStr}.`, 'success');
    } else {
      showToast(`Sesi KBM tanggal ${dateStr} sudah lengkap (${res.result.sessions_existing} sesi terverifikasi).`, 'info');
    }
  };

  const [simulatedTime, setSimulatedTime] = useState<string>('2026-08-23 04:25:00');

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
  const handleResetData = () => {
    setStudents(INITIAL_STUDENTS);
    setActivities(INITIAL_ACTIVITIES);
    setSessions(INITIAL_SESSIONS);
    setRecords(INITIAL_RECORDS);
    setDevices(INITIAL_DEVICES);
    setDeviceLogs(INITIAL_DEVICE_LOGS);
    setExtracurriculars(INITIAL_EXTRACURRICULARS);
    setExtracurricularMembers(INITIAL_EXTRACURRICULAR_MEMBERS);
    setStudentGroups(INITIAL_STUDENT_GROUPS);
    setStudentGroupMembers(INITIAL_STUDENT_GROUP_MEMBERS);
    setClassHistories(INITIAL_CLASS_HISTORIES);
    setRoomHistories(INITIAL_ROOM_HISTORIES);
    setSessionParticipants(INITIAL_SESSION_PARTICIPANTS);
    setActivityParticipants(INITIAL_ACTIVITY_PARTICIPANTS);
    setExcusals(INITIAL_STUDENT_EXCUSALS);
    setRecordHistories(INITIAL_RECORD_HISTORIES);
    showToast('Data database simulasi berhasil direset ke initial seed Sprint 5.', 'success');
  };

  // Device Management Handlers (Sprint 5)
  const handleAddDevice = (newDev: AttendanceDevice, plainSecret: string) => {
    setDevices((prev) => [...prev, newDev]);
    const log: AttendanceDeviceLog = {
      id: Date.now(),
      attendance_device_id: newDev.id,
      device_code: newDev.device_code,
      event_type: 'FIRMWARE_BOOT',
      level: 'info',
      message: `Perangkat baru '${newDev.device_name}' didaftarkan oleh ${currentUser.name} (IP: ${newDev.ip_address}).`,
      created_at: newDev.created_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    setDeviceLogs((prev) => [log, ...prev]);
  };

  const handleUpdateDevice = (updatedDev: AttendanceDevice) => {
    setDevices((prev) => prev.map((d) => (d.id === updatedDev.id ? updatedDev : d)));
  };

  const handleRotateDeviceSecret = (deviceId: number) => {
    const { newPlainSecret, updatedDevice, deviceLog } = RfidAttendanceService.rotateDeviceSecret({
      deviceId,
      devices,
      operator: currentUser,
    });
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? updatedDevice : d)));
    setDeviceLogs((prev) => [deviceLog, ...prev]);
    return { newSecret: newPlainSecret, updatedDevice };
  };

  // Record Attendance Handler (Engine Invocation with Session Participant Snapshot Verification)
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

    // SPRINT 10: Check if Server LAN is Offline
    if (ServerConnectivityService.getState() === 'SERVER_OFFLINE') {
      const offlineRes = OfflineStorageService.addPendingAttendance({
        sessionId: session.id,
        sessionCode: session.session_code,
        activityName: session.activity_name,
        studentId: params.student.id,
        studentNumber: params.student.student_number,
        studentName: params.student.name,
        classroomName: params.student.classroom_name,
        dormitoryRoomName: params.student.dormitory_room_name,
        method: params.method,
        status: params.overrideStatus || 'present',
        notes: params.notes,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });

      if (offlineRes.success) {
        showToast(`✓ [MODE OFFLINE] Absensi ${params.student.name} tersimpan di antrean perangkat (PENDING SYNC).`, 'info');
        return {
          success: true,
          code: 'SUCCESS',
          message: 'Absensi tersimpan sementara di antrean perangkat (Menunggu Sinkronisasi LAN).',
        };
      } else {
        showToast(offlineRes.message || 'Gagal menyimpan antrean offline', 'error');
        return {
          success: false,
          code: 'ALREADY_RECORDED',
          message: offlineRes.message || 'Gagal menyimpan antrean offline',
        };
      }
    }

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
      existingRecords: records,
      sessionParticipants,
      allowParticipantOverride: params.allowParticipantOverride,
    });

    if (result.success && newRecord) {
      setRecords((prev) => [newRecord, ...prev]);
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }

    return result;
  };

  // Manual Sheet Status Click (Interactive Pill)
  const handleRecordManualStatus = (params: {
    sessionId: number;
    student: Student;
    status: AttendanceStatus;
    notes?: string;
  }) => {
    const session = sessions.find((s) => s.id === params.sessionId);
    if (!session) return;

    // Check if record exists already for this student & session
    const existingRecord = records.find(
      (r) => r.attendance_session_id === session.id && r.student_id === params.student.id
    );

    if (existingRecord) {
      // Prompt correction if already exists
      handleCorrectStatus(existingRecord, params.status, 'Penyesuaian langsung operator pada lembar manual');
    } else {
      // Create fresh record
      handleRecordAttendance({
        sessionId: params.sessionId,
        student: params.student,
        method: 'manual',
        overrideStatus: params.status,
        notes: params.notes,
        allowParticipantOverride: true, // Manual admin override
      });
    }
  };

  // Bulk Mark All Present (Sprint 3 Engine)
  const handleBulkMarkPresent = (sessionId: number) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      showToast('Sesi tidak ditemukan.', 'error');
      return;
    }

    const activity = activities.find((a) => a.id === session.activity_id) || activities[0];

    const bulkResult = AttendanceEngine.markAllPresent({
      session,
      activity,
      allStudents: students,
      existingRecords: records,
      sessionParticipants,
      operator: currentUser,
    });

    if (bulkResult.success > 0) {
      setRecords((prev) => [...bulkResult.newRecords, ...prev]);
      showToast(`Berhasil menandai ${bulkResult.success} santri sebagai Hadir (Dilewati: ${bulkResult.skipped}).`, 'success');
    } else {
      showToast(`Semua peserta sudah tercatat (${bulkResult.skipped} santri dilewati).`, 'success');
    }
  };

  // Bulk Apply Status (e.g. mass Izin, Sakit, Dispensasi, Alpha)
  const handleBulkApplyStatus = (sessionId: number, targetStudentIds: number[], status: AttendanceStatus, notes?: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const activity = activities.find((a) => a.id === session.activity_id) || activities[0];
    const targetStudents = students.filter((s) => targetStudentIds.includes(s.id));

    const bulkResult = AttendanceEngine.bulkRecord({
      session,
      activity,
      students: targetStudents,
      status,
      notes,
      operator: currentUser,
      existingRecords: records,
      sessionParticipants,
    });

    if (bulkResult.success > 0) {
      setRecords((prev) => [...bulkResult.newRecords, ...prev]);
      showToast(`Berhasil memperbarui ${bulkResult.success} santri menjadi status ${status.toUpperCase()}.`, 'success');
    } else {
      showToast('Tidak ada data yang diproses.', 'error');
    }
  };

  // Attendance Correction with Mandatory Reason (Sprint 3 Engine)
  const handleCorrectStatus = (record: AttendanceRecord, newStatus: AttendanceStatus, reason: string) => {
    const corrResult = AttendanceEngine.correctAttendance({
      record,
      newStatus,
      reason,
      operator: currentUser,
    });

    if (corrResult.success && corrResult.updatedRecord && corrResult.historyEntry) {
      setRecords((prev) => prev.map((r) => (r.id === corrResult.updatedRecord!.id ? corrResult.updatedRecord! : r)));
      setRecordHistories((prev) => [corrResult.historyEntry!, ...prev]);
      showToast(corrResult.message, 'success');
    } else {
      showToast(corrResult.message, 'error');
    }
  };

  // Create Session (with Auto Snapshot of Session Participants)
  const handleCreateSession = (sessionData: Partial<AttendanceSession>) => {
    const newSessionId = Date.now();
    const act = activities.find((a) => a.id === sessionData.activity_id) || activities[0];

    const newSession: AttendanceSession = {
      id: newSessionId,
      activity_id: act.id,
      activity_name: act.name,
      activity_code: act.code,
      session_code: sessionData.session_code || `ATT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${act.code}-${Math.floor(100 + Math.random() * 900)}`,
      session_date: sessionData.session_date || new Date().toISOString().slice(0, 10),
      start_at: sessionData.start_at || `${new Date().toISOString().slice(0, 10)} ${act.default_start_time}:00`,
      present_until: sessionData.present_until || `${new Date().toISOString().slice(0, 10)} ${act.default_present_until}:00`,
      late_until: sessionData.late_until || `${new Date().toISOString().slice(0, 10)} ${act.default_late_until}:00`,
      end_at: sessionData.end_at || `${new Date().toISOString().slice(0, 10)} ${act.default_end_time}:00`,
      status: sessionData.status || 'draft',
      location: sessionData.location || act.location,
      participant_count: 0,
      notes: sessionData.notes,
    };

    // Generate snapshot of eligible participants
    const snapshot = ActivityParticipantService.generateSessionParticipantsSnapshot({
      session: newSession,
      activity: act,
      students,
      dormitoryRooms,
      activityParticipants,
      extracurricularMembers,
      studentGroupMembers,
    });

    newSession.participant_count = snapshot.length;

    setSessions((prev) => [newSession, ...prev]);
    setSessionParticipants((prev) => [...prev, ...snapshot]);

    showToast(`Sesi '${newSession.session_code}' berhasil dibuat dengan ${snapshot.length} santri peserta terdaftar snapshot.`, 'success');
  };

  // Open Session
  const handleOpenSession = (sessionId: number) => {
    handleUpdateSessionStatus(sessionId, 'open');
  };

  // Close Session with Auto Alpha & Active Excuse Processing (Sprint 3 Engine)
  const handleCloseSession = (sessionId: number) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const closeResult = AttendanceEngine.finalizeSessionAttendance({
      session,
      allStudents: students,
      excusals,
      existingRecords: records,
      sessionParticipants,
      operator: currentUser,
    });

    if (closeResult.success) {
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? closeResult.closedSession : s)));
      if (closeResult.autoRecords.length > 0) {
        setRecords((prev) => [...closeResult.autoRecords, ...prev]);
      }
      showToast(closeResult.message, 'success');
    } else {
      showToast(closeResult.message, 'error');
    }
  };

  // Update Session Status with strict transition validation
  const handleUpdateSessionStatus = (sessionId: number, newStatus: SessionStatus, cancelReason?: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    if (newStatus === 'closed') {
      handleCloseSession(sessionId);
      return;
    }

    if (!AttendanceEngine.canTransition(targetSession.status, newStatus)) {
      showToast(`Transisi status dari '${targetSession.status.toUpperCase()}' ke '${newStatus.toUpperCase()}' tidak diperbolehkan.`, 'error');
      return;
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const nowStr = new Date().toISOString();
          return {
            ...s,
            status: newStatus,
            opened_by: newStatus === 'open' ? currentUser.name : s.opened_by,
            opened_at: newStatus === 'open' ? nowStr : s.opened_at,
            closed_by: s.closed_by,
            closed_at: s.closed_at,
            notes: cancelReason ? `${s.notes || ''} [BATAL: ${cancelReason}]` : s.notes,
          };
        }
        return s;
      })
    );

    showToast(`Status sesi '${targetSession.session_code}' berhasil diubah menjadi ${newStatus.toUpperCase()}.`, 'success');
  };

  // Excusal Handlers (Sprint 3)
  const handleAddExcusal = (data: Partial<StudentExcusal>) => {
    const student = students.find((s) => s.id === data.student_id);
    if (!student) return;

    const newExcusal: StudentExcusal = {
      id: Date.now(),
      student_id: student.id,
      student_name: student.name,
      student_number: student.student_number,
      classroom_name: student.classroom_name,
      dormitory_room_name: student.dormitory_room_name,
      type: data.type || 'sick',
      reason: data.reason || 'Izin dari wali santri',
      start_at: data.start_at || '2026-08-23T04:00:00',
      end_at: data.end_at || '2026-08-23T20:00:00',
      status: 'approved', // Auto-approved when entered by authorized staff
      approved_by: currentUser.name,
      approved_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      notes: data.notes,
      created_by: currentUser.name,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    setExcusals((prev) => [newExcusal, ...prev]);
    showToast(`Surat izin/dispensasi '${student.name}' berhasil disimpan dan disetujui.`, 'success');
  };

  const handleApproveExcusal = (id: number) => {
    setExcusals((prev) =>
      prev.map((exc) =>
        exc.id === id
          ? {
              ...exc,
              status: 'approved',
              approved_by: currentUser?.name || 'Musyrif / Super Admin',
              approved_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            }
          : exc
      )
    );
    showToast('Surat izin berhasil disetujui.', 'success');
  };

  const handleRejectExcusal = (id: number, reason: string = '') => {
    setExcusals((prev) =>
      prev.map((exc) =>
        exc.id === id
          ? {
              ...exc,
              status: 'rejected',
              notes: reason ? `Ditolak: ${reason}` : (exc.notes || 'Ditolak oleh Musyrif/Admin'),
            }
          : exc
      )
    );
    showToast('Surat izin ditolak.', 'error');
  };

  const handleCancelExcusal = (id: number) => {
    setExcusals((prev) =>
      prev.map((exc) =>
        exc.id === id
          ? {
              ...exc,
              status: 'cancelled',
            }
          : exc
      )
    );
    showToast('Surat izin dibatalkan.', 'success');
  };

  // Add Student
  const handleAddStudent = (studentData: Partial<Student>) => {
    const newStudent: Student = {
      id: Date.now(),
      student_number: studentData.student_number || `UBA2600${Math.floor(10 + Math.random() * 89)}`,
      nisn: studentData.nisn || `0089${Math.floor(100000 + Math.random() * 900000)}`,
      name: studentData.name || 'Santri Baru',
      nickname: studentData.nickname,
      gender: studentData.gender || 'male',
      birth_place: studentData.birth_place,
      birth_date: studentData.birth_date,
      classroom_id: studentData.classroom_id || null,
      classroom_name: studentData.classroom_name,
      dormitory_room_id: studentData.dormitory_room_id || null,
      dormitory_room_name: studentData.dormitory_room_name,
      generation_year: studentData.generation_year || 2026,
      entry_year: studentData.entry_year || 2026,
      qr_token: studentData.qr_token || `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      rfid_uid: studentData.rfid_uid || undefined,
      guardian_name: studentData.guardian_name,
      guardian_phone: studentData.guardian_phone,
      address: studentData.address,
      status: studentData.status || 'active',
      is_active: studentData.is_active !== undefined ? studentData.is_active : true,
    };

    setStudents((prev) => [...prev, newStudent]);
    showToast(`Santri '${newStudent.name}' (NIS: ${newStudent.student_number}) berhasil didaftarkan.`, 'success');
  };

  // Update Student
  const handleUpdateStudent = (studentId: number, updateData: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...updateData } : s))
    );
    showToast(`Data santri berhasil diperbarui.`, 'success');
  };

  // Toggle Student Active
  const handleToggleStudentActive = (studentId: number) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const nextState = !s.is_active;
          const nextStatus = nextState ? 'active' : 'inactive';
          showToast(`Status santri '${s.name}' diubah menjadi ${nextState ? 'AKTIF' : 'NON-AKTIF'}.`, 'success');
          return { ...s, is_active: nextState, status: nextStatus };
        }
        return s;
      })
    );
  };

  // Extracurriculars Handlers
  const handleAddExtracurricular = (ekskul: Partial<Extracurricular>) => {
    const newEks: Extracurricular = {
      id: Date.now(),
      code: ekskul.code || `EKS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: ekskul.name || 'Ekstrakurikuler Baru',
      description: ekskul.description || '',
      coach_name: ekskul.coach_name || 'Pembina Umum',
      location: ekskul.location || 'Area Pesantren',
      is_active: true,
    };
    setExtracurriculars((prev) => [...prev, newEks]);
    showToast(`Ekstrakurikuler '${newEks.name}' berhasil ditambahkan.`, 'success');
  };

  const handleAddExtracurricularMember = (member: Partial<ExtracurricularMember>) => {
    const newMem: ExtracurricularMember = {
      id: Date.now(),
      extracurricular_id: member.extracurricular_id || 1,
      student_id: member.student_id || 1,
      membership_status: member.membership_status || 'active',
      registration_source: member.registration_source || 'admin_assignment',
      joined_at: '2026-08-23',
      is_active: true,
    };
    setExtracurricularMembers((prev) => [...prev, newMem]);
    showToast('Anggota ekstrakurikuler berhasil ditambahkan.', 'success');
  };

  const handleRemoveExtracurricularMember = (memberId: number) => {
    setExtracurricularMembers((prev) => prev.filter((m) => m.id !== memberId));
    showToast('Anggota ekstrakurikuler dinonaktifkan.', 'success');
  };

  // Student Group Handlers
  const handleAddStudentGroup = (grp: Partial<StudentGroup>) => {
    const newGrp: StudentGroup = {
      id: Date.now(),
      code: grp.code || `GRP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: grp.name || 'Kelompok Santri Baru',
      description: grp.description || '',
      is_active: true,
    };
    setStudentGroups((prev) => [...prev, newGrp]);
    showToast(`Kelompok '${newGrp.name}' berhasil dibuat.`, 'success');
  };

  const handleAddStudentGroupMember = (member: Partial<StudentGroupMember>) => {
    const newMem: StudentGroupMember = {
      id: Date.now(),
      student_group_id: member.student_group_id || 1,
      student_id: member.student_id || 1,
      joined_at: '2026-08-23',
    };
    setStudentGroupMembers((prev) => [...prev, newMem]);
    showToast('Santri berhasil didaftarkan ke kelompok.', 'success');
  };

  const handleRemoveStudentGroupMember = (memberId: number) => {
    setStudentGroupMembers((prev) => prev.filter((m) => m.id !== memberId));
    showToast('Santri dikeluarkan dari kelompok.', 'success');
  };

  // Classroom CRUD Handlers
  const handleAddClassroom = (classroomData: Partial<Classroom>) => {
    const newClassroom: Classroom = {
      id: Date.now(),
      code: classroomData.code || `CLS-${classroomData.grade_level || 7}-${classroomData.name || 'NEW'}`,
      name: classroomData.name || 'Kelas Baru',
      grade_level: classroomData.grade_level || 7,
      academic_year: classroomData.academic_year || '2025/2026',
      homeroom_teacher: classroomData.homeroom_teacher || 'Ustadz Pengampu',
      capacity: classroomData.capacity || 30,
      student_count: 0,
      is_active: true,
    };
    setClassrooms((prev) => [...prev, newClassroom]);
    showToast(`Kelas '${newClassroom.name}' (Tingkat ${newClassroom.grade_level}) berhasil ditambahkan.`, 'success');
  };

  const handleUpdateClassroom = (classroomId: number, updateData: Partial<Classroom>) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.id === classroomId ? { ...c, ...updateData } : c))
    );
    showToast(`Data kelas berhasil diperbarui.`, 'success');
  };

  const handleDeleteClassroom = (classroomId: number) => {
    const target = classrooms.find((c) => c.id === classroomId);
    setClassrooms((prev) => prev.filter((c) => c.id !== classroomId));
    setStudents((prev) =>
      prev.map((s) => (s.classroom_id === classroomId ? { ...s, classroom_id: null, classroom_name: undefined } : s))
    );
    showToast(`Kelas '${target?.name || ''}' berhasil dihapus.`, 'info');
  };

  // Dormitory & Room CRUD Handlers
  const handleAddDormitory = (dormData: Partial<Dormitory>) => {
    const newDorm: Dormitory = {
      id: Date.now(),
      name: dormData.name || 'Gedung Asrama Baru',
      gender: dormData.gender || 'L',
      is_active: true,
    };
    setDormitories((prev) => [...prev, newDorm]);
    showToast(`Gedung asrama '${newDorm.name}' berhasil ditambahkan.`, 'success');
  };

  const handleUpdateDormitory = (dormId: number, updateData: Partial<Dormitory>) => {
    setDormitories((prev) =>
      prev.map((d) => (d.id === dormId ? { ...d, ...updateData } : d))
    );
    showToast(`Data gedung asrama berhasil diperbarui.`, 'success');
  };

  const handleDeleteDormitory = (dormId: number) => {
    const target = dormitories.find((d) => d.id === dormId);
    setDormitories((prev) => prev.filter((d) => d.id !== dormId));
    // Also remove associated rooms and unassign students
    const roomIdsToDelete = dormitoryRooms.filter((r) => r.dormitory_id === dormId).map((r) => r.id);
    setDormitoryRooms((prev) => prev.filter((r) => r.dormitory_id !== dormId));
    setStudents((prev) =>
      prev.map((s) => (s.dormitory_room_id && roomIdsToDelete.includes(s.dormitory_room_id) ? { ...s, dormitory_room_id: null, dormitory_room_name: undefined } : s))
    );
    showToast(`Gedung asrama '${target?.name || ''}' dan kamarnya berhasil dihapus.`, 'info');
  };

  const handleAddDormitoryRoom = (roomData: Partial<DormitoryRoom>) => {
    const dorm = dormitories.find((d) => d.id === roomData.dormitory_id);
    const newRoom: DormitoryRoom = {
      id: Date.now(),
      dormitory_id: roomData.dormitory_id || 1,
      dormitory_name: dorm?.name || roomData.dormitory_name || 'Asrama',
      code: roomData.code || `RM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: roomData.name || 'Kamar Baru',
      capacity: roomData.capacity || 8,
      supervisor: roomData.supervisor || 'Ustadz Pembina',
      is_active: true,
    };
    setDormitoryRooms((prev) => [...prev, newRoom]);
    showToast(`Kamar '${newRoom.name}' berhasil ditambahkan ke ${newRoom.dormitory_name}.`, 'success');
  };

  const handleUpdateDormitoryRoom = (roomId: number, updateData: Partial<DormitoryRoom>) => {
    setDormitoryRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updateData } : r))
    );
    showToast(`Data kamar berhasil diperbarui.`, 'success');
  };

  const handleDeleteDormitoryRoom = (roomId: number) => {
    const target = dormitoryRooms.find((r) => r.id === roomId);
    setDormitoryRooms((prev) => prev.filter((r) => r.id !== roomId));
    setStudents((prev) =>
      prev.map((s) => (s.dormitory_room_id === roomId ? { ...s, dormitory_room_id: null, dormitory_room_name: undefined } : s))
    );
    showToast(`Kamar '${target?.name || ''}' berhasil dihapus.`, 'info');
  };

  // Activity Handlers
  const handleAddActivity = (act: Partial<Activity>) => {
    const newAct: Activity = {
      id: Date.now(),
      activity_category_id: act.activity_category_id || 1,
      category_name: act.category_name || 'Shalat Berjamaah',
      code: act.code || `ACT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: act.name || 'Kegiatan Baru',
      description: act.description || '',
      participant_type: act.participant_type || 'all_students',
      default_start_time: act.default_start_time || '04:15',
      default_present_until: act.default_present_until || '04:30',
      default_late_until: act.default_late_until || '04:45',
      default_end_time: act.default_end_time || '05:00',
      location: act.location || 'Masjid Utama Kampus 1',
      attendance_enabled: true,
      allow_manual: act.allow_manual !== undefined ? act.allow_manual : true,
      allow_qr: act.allow_qr !== undefined ? act.allow_qr : true,
      allow_rfid: act.allow_rfid !== undefined ? act.allow_rfid : true,
      late_tolerance_minutes: act.late_tolerance_minutes || 15,
      is_active: true,
    };
    setActivities((prev) => [...prev, newAct]);
    showToast(`Kegiatan '${newAct.name}' berhasil didaftarkan.`, 'success');
  };

  const handleUpdateActivity = (actId: number, updateData: Partial<Activity>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, ...updateData } : a))
    );
    showToast(`Kegiatan berhasil diperbarui.`, 'success');
  };

  const handleDeleteActivity = (actId: number) => {
    const target = activities.find((a) => a.id === actId);
    setActivities((prev) => prev.filter((a) => a.id !== actId));
    showToast(`Kegiatan '${target?.name || ''}' berhasil dihapus.`, 'info');
  };

  // Lesson Periods CRUD Handlers
  const handleAddLessonPeriod = (periodData: Partial<LessonPeriod>) => {
    const nextSort = lessonPeriods.length > 0 ? Math.max(...lessonPeriods.map((lp) => lp.sort_order || 0)) + 1 : 1;
    const nextNum = lessonPeriods.length > 0 ? Math.max(...lessonPeriods.map((lp) => lp.period_number || 0)) + 1 : 1;
    const newPeriod: LessonPeriod = {
      id: Date.now(),
      code: periodData.code || `JP-${nextNum.toString().padStart(2, '0')}`,
      name: periodData.name || `JP ${nextNum}`,
      period_number: periodData.period_number || nextNum,
      start_time: periodData.start_time || '07:00',
      end_time: periodData.end_time || '07:45',
      is_break: Boolean(periodData.is_break),
      is_active: true,
      sort_order: periodData.sort_order || nextSort,
    };
    setLessonPeriods((prev) => [...prev, newPeriod].sort((a, b) => a.sort_order - b.sort_order));
    showToast(`Jam Pelajaran '${newPeriod.name}' berhasil ditambahkan.`, 'success');
  };

  const handleUpdateLessonPeriod = (periodId: number, updateData: Partial<LessonPeriod>) => {
    setLessonPeriods((prev) =>
      prev.map((lp) => (lp.id === periodId ? { ...lp, ...updateData } : lp)).sort((a, b) => a.sort_order - b.sort_order)
    );
    showToast('Jam Pelajaran berhasil diperbarui.', 'success');
  };

  const handleDeleteLessonPeriod = (periodId: number) => {
    const target = lessonPeriods.find((lp) => lp.id === periodId);
    setLessonPeriods((prev) => prev.filter((lp) => lp.id !== periodId));
    showToast(`Jam Pelajaran '${target?.name || ''}' berhasil dihapus.`, 'info');
  };

  const handleToggleActivityMethod = (activityId: number, method: 'manual' | 'qr' | 'rfid') => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id === activityId) {
          const key = method === 'manual' ? 'allow_manual' : method === 'qr' ? 'allow_qr' : 'allow_rfid';
          const nextVal = !a[key];
          showToast(`Izin metode ${method.toUpperCase()} pada '${a.name}' diubah menjadi ${nextVal ? 'AKTIF' : 'NONAKTIF'}.`, 'success');
          return { ...a, [key]: nextVal };
        }
        return a;
      })
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
      case 'acceptance-tests': return 'Acceptance Tests';
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
      case 'go-live-qa': return 'Go-Live & QA Master';
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
          isLoadingAuth={authStatus === 'loading'}
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
                onLoginAsDifferentUser={handleLogout}
              />
            )}

            {activeTab === '404' && (
              <NotFound404
                onBackToDashboard={() => handleSetActiveTab('dashboard')}
                requestedPath={window.location.pathname}
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
              userRole={currentUser.role}
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
              onNavigateToRfidMonitoring={() => {
                setActiveTab('rfid-monitoring');
              }}
              onNavigateToLiveMonitoring={() => {
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
                userRole={currentUser.role}
                onNavigateBack={() => setAttendanceSubView('sessions')}
                onNavigateToManual={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setActiveTab('manual-attendance');
                }}
                onNavigateToQr={(sId) => {
                  setSelectedAttendanceSessionId(sId);
                  setActiveTab('qr-scanner');
                }}
                onShowToast={showToast}
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
              activities={activities}
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
            <InteractiveScannerSimulator
              sessions={sessions}
              students={students}
              activities={activities}
              devices={devices}
              records={records}
              currentUser={currentUser}
              sessionParticipants={sessionParticipants}
              onRecordAttendance={handleRecordAttendance}
            />
          )}

          {activeTab === 'rfid-simulator' && (
            <RfidSimulatorView
              sessions={sessions}
              students={students}
              activities={activities}
              devices={devices}
              records={records}
              sessionParticipants={sessionParticipants}
              currentUser={currentUser}
              onRecordAttendance={handleRecordAttendance}
              onShowToast={showToast}
            />
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
            <AcceptanceTestView
              students={students}
              activities={activities}
              sessions={sessions}
              records={records}
              devices={devices}
              currentUser={currentUser}
              extracurriculars={extracurriculars}
              extracurricularMembers={extracurricularMembers}
              studentGroups={studentGroups}
              studentGroupMembers={studentGroupMembers}
              sessionParticipants={sessionParticipants}
              excusals={excusals}
              recordHistories={recordHistories}
            />
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
            <GoLiveQAView
              sessions={sessions}
              records={records}
              students={students}
              devices={devices}
              currentUser={currentUser}
            />
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
                setRecords((prev) => [...newRecords, ...prev]);
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
              onUpdateHalaqahs={setHalaqahs}
              onUpdateHalaqahMembers={setHalaqahMembers}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'duty-roster-manager' && (
            <DutyRosterManagerView
              activities={activities}
              dutyRosters={dutyRosters}
              students={students}
              currentUser={currentUser}
              onUpdateDutyRosters={setDutyRosters}
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
              onUpdateRoutineSchedules={setRoutineSchedules}
              onUpdateRoutineOverrides={setRoutineOverrides}
              onUpdatePrayerCalendars={setPrayerCalendars}
              onUpdateSupervisors={setActivitySupervisors}
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
