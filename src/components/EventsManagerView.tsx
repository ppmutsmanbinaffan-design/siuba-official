import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Layers, 
  FileText, 
  ShieldCheck, 
  UserPlus, 
  ArrowRight, 
  Check, 
  X, 
  RefreshCw, 
  UserCheck, 
  Award, 
  ExternalLink,
  ShieldAlert,
  Tag
} from 'lucide-react';
import { 
  Activity, 
  ActivityParticipantRule, 
  ActivityParticipantRuleType,
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  DutyRoster, 
  EventOrganizer, 
  EventRegistration, 
  EventSession, 
  EventType, 
  Extracurricular, 
  ExtracurricularMember, 
  Halaqah, 
  HalaqahMember, 
  SpecialEvent, 
  Student, 
  StudentExcusal, 
  StudentGroup, 
  StudentGroupMember, 
  User, 
  WalkInAuditLog 
} from '../types';
import { ActivityParticipantService } from '../services/activityParticipantService';
import { EventDispensationService } from '../services/eventDispensationService';

interface EventsManagerViewProps {
  events?: SpecialEvent[];
  eventSessions?: EventSession[];
  eventRegistrations?: EventRegistration[];
  eventOrganizers?: EventOrganizer[];
  activities?: Activity[];
  students?: Student[];
  classrooms?: Classroom[];
  dormitories?: Dormitory[];
  dormitoryRooms?: DormitoryRoom[];
  extracurriculars?: Extracurricular[];
  extracurricularMembers?: ExtracurricularMember[];
  studentGroups?: StudentGroup[];
  studentGroupMembers?: StudentGroupMember[];
  halaqahs?: Halaqah[];
  halaqahMembers?: HalaqahMember[];
  dutyRosters?: DutyRoster[];
  participantRules?: ActivityParticipantRule[];
  walkInAuditLogs?: WalkInAuditLog[];
  excusals?: StudentExcusal[];
  currentUser: User;
  onAddEvent: (event: Partial<SpecialEvent>) => void;
  onUpdateEventStatus: (eventId: number, status: SpecialEvent['status']) => void;
  onAddEventSession: (session: Partial<EventSession>) => void;
  onAddEventRegistration: (registration: Partial<EventRegistration>) => void;
  onUpdateRegistrationStatus: (registrationId: number, status: EventRegistration['status']) => void;
  onAddParticipantRule: (rule: Partial<ActivityParticipantRule>) => void;
  onRemoveParticipantRule: (ruleId: number) => void;
  onCreateEventDispensations: (updatedExcusals: StudentExcusal[]) => void;
}

export const EventsManagerView: React.FC<EventsManagerViewProps> = ({
  events = [],
  eventSessions = [],
  eventRegistrations = [],
  eventOrganizers = [],
  activities = [],
  students = [],
  classrooms = [],
  dormitories = [],
  dormitoryRooms = [],
  extracurriculars = [],
  extracurricularMembers = [],
  studentGroups = [],
  studentGroupMembers = [],
  halaqahs = [],
  halaqahMembers = [],
  dutyRosters = [],
  participantRules = [],
  walkInAuditLogs = [],
  excusals = [],
  currentUser,
  onAddEvent,
  onUpdateEventStatus,
  onAddEventSession,
  onAddEventRegistration,
  onUpdateRegistrationStatus,
  onAddParticipantRule,
  onRemoveParticipantRule,
  onCreateEventDispensations,
}) => {
  const safeEvents = events || [];
  const safeEventSessions = eventSessions || [];
  const safeEventRegistrations = eventRegistrations || [];
  const safeEventOrganizers = eventOrganizers || [];
  const safeActivities = activities || [];
  const safeStudents = students || [];
  const safeClassrooms = classrooms || [];
  const safeDormitories = dormitories || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeExtracurriculars = extracurriculars || [];
  const safeExtracurricularMembers = extracurricularMembers || [];
  const safeStudentGroups = studentGroups || [];
  const safeStudentGroupMembers = studentGroupMembers || [];
  const safeHalaqahs = halaqahs || [];
  const safeHalaqahMembers = halaqahMembers || [];
  const safeDutyRosters = dutyRosters || [];
  const safeParticipantRules = participantRules || [];
  const safeWalkInAuditLogs = walkInAuditLogs || [];
  const safeExcusals = excusals || [];

  const [selectedEventId, setSelectedEventId] = useState<number>(safeEvents[0]?.id || 1);
  const [activeTab, setActiveTab] = useState<'info' | 'sessions' | 'registrations' | 'rules' | 'walkin' | 'dispensation'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showAddRegistrationModal, setShowAddRegistrationModal] = useState(false);

  // New Event Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<EventType>('seminar');
  const [newStartAt, setNewStartAt] = useState('2026-08-25 08:00');
  const [newEndAt, setNewEndAt] = useState('2026-08-25 12:00');
  const [newLocation, setNewLocation] = useState('Aula Utama Pesantren');
  const [newCapacity, setNewCapacity] = useState<number>(100);

  // New Session Form State
  const [sessionName, setSessionName] = useState('');
  const [sessionStartAt, setSessionStartAt] = useState('2026-08-25 08:00');
  const [sessionPresentUntil, setSessionPresentUntil] = useState('08:15');
  const [sessionLateUntil, setSessionLateUntil] = useState('08:30');
  const [sessionEndAt, setSessionEndAt] = useState('2026-08-25 10:00');

  // New Rule Form State
  const [ruleType, setRuleType] = useState<ActivityParticipantRuleType>('classroom');
  const [ruleOperator, setRuleOperator] = useState<'include' | 'exclude'>('include');
  const [ruleValue, setRuleValue] = useState('VII A');
  const [ruleDesc, setRuleDesc] = useState('');

  // Selected Student for Registration
  const [regStudentId, setRegStudentId] = useState<number>(safeStudents[0]?.id || 1);

  // Active selected Event
  const selectedEvent = safeEvents.find((e) => e && e.id === selectedEventId) || safeEvents[0];

  // Scoped Authorization Check for Organizers
  const isOrganizerOrAdmin = 
    currentUser.role === 'super_admin' || 
    currentUser.role === 'admin' || 
    safeEventOrganizers.some((o) => o && o.event_id === selectedEvent?.id && o.user_id === currentUser.id && o.is_active);

  // Filtered Events List
  const filteredEvents = safeEvents.filter((e) => {
    if (!e) return false;
    const matchesSearch = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (e.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || e.event_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Current Event Sessions
  const currentSessions = safeEventSessions.filter((s) => s && s.event_id === selectedEvent?.id);

  // Current Event Registrations
  const currentRegistrations = safeEventRegistrations.filter((r) => r && r.event_id === selectedEvent?.id);

  // Current Activity associated with event
  const currentActivity = safeActivities.find((a) => a && (a.id === selectedEvent?.activity_id || a.code === selectedEvent?.code)) || {
    id: selectedEvent?.activity_id || 10,
    activity_category_id: 10,
    category_name: 'Kegiatan Khusus',
    code: selectedEvent?.code || 'EVT-1',
    name: selectedEvent?.name || 'Event',
    description: selectedEvent?.description || '',
    participant_type: 'individual' as const,
    participant_gender: 'all' as const,
    is_active: true,
  };

  // Dynamic Rule Preview for Selected Event Activity
  const resolvedDynamic = ActivityParticipantService.resolveParticipants({
    activity: currentActivity,
    students: safeStudents,
    dormitoryRooms: safeDormitoryRooms,
    extracurricularMembers: safeExtracurricularMembers,
    studentGroupMembers: safeStudentGroupMembers,
    halaqahMembers: safeHalaqahMembers,
    dutyRosters: safeDutyRosters,
    eventRegistrations: currentRegistrations,
    participantRules: safeParticipantRules.filter((r) => r && r.activity_id === currentActivity.id),
  });

  // Walk-In Logs for Current Event Sessions
  const currentWalkInLogs = safeWalkInAuditLogs.filter((log) =>
    log && currentSessions.some((s) => s && s.id === log.session_id)
  );

  // Helper Labels
  const getEventTypeLabel = (type: EventType) => {
    const labels: Record<EventType, string> = {
      school_event: 'Kegiatan Sekolah',
      pesantren_event: 'Kegiatan Pesantren',
      seminar: 'Seminar & Workshop',
      competition: 'Perlombaan',
      training: 'Pelatihan / Diklat',
      outing: 'Outbound & Rihlah',
      study_tour: 'Study Tour',
      service: 'Bakti Sosial',
      ceremony: 'Upacara / Apel',
      special_activity: 'Kegiatan Khusus',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: SpecialEvent['status']) => {
    switch (status) {
      case 'published':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Published</span>;
      case 'registration_open':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Pendaftaran Buka</span>;
      case 'ongoing':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 animate-pulse">Sedang Berjalan</span>;
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Selesai</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Dibatalkan</span>;
      case 'draft':
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">Draft</span>;
    }
  };

  // Handle Event Creation
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddEvent({
      code: newCode || `EVT-${Date.now().toString().slice(-4)}`,
      name: newName,
      description: newDesc,
      event_type: newType,
      start_at: newStartAt,
      end_at: newEndAt,
      location: newLocation,
      capacity: newCapacity,
      participant_mode: 'registration',
      attendance_enabled: true,
      allow_manual: true,
      allow_qr: true,
      allow_rfid: true,
      status: 'published',
      finalization_policy: 'required',
      created_by: currentUser.name,
    });

    setShowAddEventModal(false);
    setNewName('');
    setNewCode('');
    setNewDesc('');
  };

  // Handle Session Creation
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim() || !selectedEvent) return;

    onAddEventSession({
      event_id: selectedEvent.id,
      name: sessionName,
      start_at: sessionStartAt,
      present_until: sessionPresentUntil,
      late_until: sessionLateUntil,
      end_at: sessionEndAt,
      attendance_required: true,
      sort_order: currentSessions.length + 1,
    });

    setShowAddSessionModal(false);
    setSessionName('');
  };

  // Handle Rule Creation
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    onAddParticipantRule({
      activity_id: currentActivity.id,
      activity_name: selectedEvent.name,
      rule_type: ruleType,
      rule_operator: ruleOperator,
      rule_value: ruleValue,
      rule_description: ruleDesc || `${ruleOperator.toUpperCase()} ${ruleType}: ${ruleValue}`,
      is_active: true,
      created_by: currentUser.name,
    });

    setShowAddRuleModal(false);
    setRuleDesc('');
  };

  // Handle Registration Creation
  const handleCreateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const st = students.find((s) => s.id === Number(regStudentId));
    if (!st) return;

    onAddEventRegistration({
      event_id: selectedEvent.id,
      student_id: st.id,
      student_name: st.name,
      student_number: st.student_number,
      classroom_name: st.classroom_name || '-',
      status: 'approved',
      registered_at: new Date().toISOString().slice(0, 10),
      registration_source: 'admin_assignment',
      approved_by: currentUser.name,
      approved_at: new Date().toISOString().slice(0, 10),
    });

    setShowAddRegistrationModal(false);
  };

  // Handle Event Dispensation Creation
  const handleGenerateDispensations = () => {
    if (!selectedEvent) return;

    const confirmedParticipants = resolvedDynamic.students;
    if (confirmedParticipants.length === 0) {
      alert('Tidak ada peserta terkonfirmasi untuk dibuatkan dispensasi.');
      return;
    }

    const { updatedExcusals, createdCount } = EventDispensationService.createEventDispensations({
      event: selectedEvent,
      participants: confirmedParticipants,
      operatorName: currentUser.name,
      existingExcusals: excusals,
    });

    onCreateEventDispensations(updatedExcusals);
    alert(`Berhasil membuat ${createdCount} dispensasi resmi untuk peserta event "${selectedEvent.name}". Presensi KBM santri tidak akan tercatat Alpha!`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SIUBA Emerald Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Award className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Manajemen Event & Kegiatan Khusus
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Manajemen Event & Peserta Dinamis
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola seminar, perlombaan, outbound, dan kegiatan khusus pesantren dengan aturan peserta dinamis, check-in walk-in, dan dispensasi KBM otomatis.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => setShowAddEventModal(true)}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#1F5C45]" />
              <span>Tambah Event Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Bento KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Event</div>
            <div className="text-2xl font-black text-slate-900">{events.length} <span className="text-xs font-semibold text-slate-400">Agenda</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Terdaftar Event Ini</div>
            <div className="text-2xl font-black text-emerald-700">{currentRegistrations.length} <span className="text-xs font-semibold text-slate-400">Santri</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Peserta Dinamis (Rule)</div>
            <div className="text-2xl font-black text-sky-700">{resolvedDynamic.students.length} <span className="text-xs font-semibold text-slate-400">Santri</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Walk-In Presensi</div>
            <div className="text-2xl font-black text-amber-700">{currentWalkInLogs.length} <span className="text-xs font-semibold text-slate-400">Catatan</span></div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Event List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="font-black text-slate-900 text-base">Daftar Event</h2>
            <span className="text-xs font-extrabold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {filteredEvents.length} Item
            </span>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama event / kode..."
                className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              >
                <option value="all">Semua Tipe</option>
                <option value="seminar">Seminar</option>
                <option value="competition">Perlombaan</option>
                <option value="outing">Outbound</option>
                <option value="school_event">Sekolah</option>
                <option value="pesantren_event">Pesantren</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              >
                <option value="all">Semua Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="ongoing">Berjalan</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>

          {/* Event Items */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredEvents.map((evt) => {
              const isSelected = evt.id === selectedEventId;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50/50 border-[#1F5C45] ring-2 ring-[#1F5C45]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {evt.code}
                    </span>
                    {getStatusBadge(evt.status)}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2 line-clamp-1 leading-snug">{evt.name}</h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {evt.start_at.slice(0, 10)}
                    </span>
                    <span className="flex items-center gap-1 font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {evt.location || 'Lokasi TBA'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredEvents.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                Tidak ada event yang cocok dengan filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Event Detail Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {selectedEvent ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              {/* Event Header Detail */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {getEventTypeLabel(selectedEvent.event_type)}
                    </span>
                    {getStatusBadge(selectedEvent.status)}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedEvent.name}</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedEvent.description || 'Kegiatan resmi santri Pesantren Utsman Bin Affan.'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedEvent.status === 'draft' && (
                    <button
                      onClick={() => onUpdateEventStatus(selectedEvent.id, 'published')}
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      Publish Event
                    </button>
                  )}

                  {selectedEvent.status === 'published' && (
                    <button
                      onClick={() => onUpdateEventStatus(selectedEvent.id, 'ongoing')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      Mulai Event
                    </button>
                  )}

                  {selectedEvent.status === 'ongoing' && (
                    <button
                      onClick={() => onUpdateEventStatus(selectedEvent.id, 'completed')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      Selesaikan Event
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'info'
                      ? 'bg-[#1F5C45] text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100'
                  }`}
                >
                  Informasi Event
                </button>

                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'sessions'
                      ? 'bg-[#1F5C45] text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100'
                  }`}
                >
                  Sesi Event ({currentSessions.length})
                </button>

                <button
                  onClick={() => setActiveTab('registrations')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'registrations'
                      ? 'bg-[#1F5C45] text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100'
                  }`}
                >
                  Registrasi ({currentRegistrations.length})
                </button>

                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'rules'
                      ? 'bg-[#1F5C45] text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100'
                  }`}
                >
                  Peserta Dinamis ({resolvedDynamic.students.length})
                </button>

                <button
                  onClick={() => setActiveTab('walkin')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'walkin'
                      ? 'bg-[#1F5C45] text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100'
                  }`}
                >
                  Audit Walk-In ({currentWalkInLogs.length})
                </button>

                <button
                  onClick={() => setActiveTab('dispensation')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'dispensation'
                      ? 'bg-[#1F5C45] text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100'
                  }`}
                >
                  Dispensasi KBM
                </button>
              </div>

              {/* TAB 1: INFORMASI EVENT */}
              {activeTab === 'info' && (
                <div className="space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block font-medium">Waktu Pelaksanaan</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {selectedEvent.start_at} s/d {selectedEvent.end_at}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Lokasi</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {selectedEvent.location || 'Belum Ditentukan'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Kapasitas Maksimal</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {selectedEvent.capacity ? `${selectedEvent.capacity} Santri` : 'Tanpa Batas Kuota'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Kebijakan Presensi Akhir</span>
                      <span className="font-semibold text-slate-800 text-sm uppercase">
                        {selectedEvent.finalization_policy}
                      </span>
                    </div>
                  </div>

                  {/* Organizers List */}
                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">Panitia & Organizer Scoped</h3>
                    <div className="space-y-1.5">
                      {eventOrganizers
                        .filter((o) => o.event_id === selectedEvent.id)
                        .map((o) => (
                          <div key={o.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="font-medium text-slate-800">{o.user_name}</span>
                            <span className="text-indigo-700 font-semibold text-[11px] bg-indigo-50 px-2 py-0.5 rounded">
                              {o.role || 'Panitia'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SESI EVENT */}
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">Sesi Presensi Event</h3>
                    <button
                      onClick={() => setShowAddSessionModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Sesi</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentSessions.map((session) => (
                      <div key={session.id} className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{session.name}</span>
                            {session.attendance_required && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                Wajib Presensi
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {session.start_at} - {session.end_at}
                            </span>
                            <span>Hadir s/d: {session.present_until} | Terlambat s/d: {session.late_until}</span>
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          Sesi #{session.sort_order}
                        </span>
                      </div>
                    ))}

                    {currentSessions.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Belum ada sesi presensi untuk event ini.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: REGISTRASI & WAITLIST */}
              {activeTab === 'registrations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">Peserta Terdaftar / Undangan</h3>
                    <button
                      onClick={() => setShowAddRegistrationModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Tambah Pendaftaran Santri</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="p-3">NIS & Nama Santri</th>
                          <th className="p-3">Kelas</th>
                          <th className="p-3">Tgl Daftar</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {currentRegistrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{reg.student_name}</div>
                              <div className="text-[11px] text-slate-400">{reg.student_number}</div>
                            </td>
                            <td className="p-3 font-medium">{reg.classroom_name}</td>
                            <td className="p-3">{reg.registered_at}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                reg.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                reg.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                reg.status === 'waitlisted' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {reg.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {reg.status === 'pending' && (
                                <button
                                  onClick={() => onUpdateRegistrationStatus(reg.id, 'approved')}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {reg.status === 'pending' && (
                                <button
                                  onClick={() => onUpdateRegistrationStatus(reg.id, 'rejected')}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                  title="Tolak"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {currentRegistrations.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              Belum ada pendaftaran santri untuk event ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: DYNAMIC PARTICIPANT RULES */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Rule Engine Peserta Dinamis</h3>
                      <p className="text-xs text-slate-500">
                        Aturan Include (penggabungan) dan Exclude (pengecualian keras) peserta kegiatan.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddRuleModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Rule</span>
                    </button>
                  </div>

                  {/* Active Rules List */}
                  <div className="space-y-2">
                    {participantRules
                      .filter((r) => r.activity_id === currentActivity.id)
                      .map((rule) => (
                        <div key={rule.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 font-bold uppercase rounded text-[10px] ${
                              rule.rule_operator === 'include' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {rule.rule_operator}
                            </span>
                            <span className="font-bold text-slate-800">{rule.rule_type.toUpperCase()}: {rule.rule_value}</span>
                            <span className="text-slate-500">({rule.rule_description})</span>
                          </div>

                          <button
                            onClick={() => onRemoveParticipantRule(rule.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Resolved Preview Table */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800 text-xs">
                        Preview Hasil Peserta Terdeteksi ({resolvedDynamic.students.length} Santri)
                      </h4>
                      <span className="text-[11px] text-indigo-700 bg-indigo-50 font-medium px-2 py-0.5 rounded">
                        {resolvedDynamic.sourceDetails}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">NIS & Nama</th>
                            <th className="p-2.5">Kelas</th>
                            <th className="p-2.5">Sumber Rule Match</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {resolvedDynamic.students.map((st) => {
                            const sources = resolvedDynamic.ruleSourcesMap?.[st.id];
                            return (
                              <tr key={st.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-800">{st.name} ({st.student_number})</td>
                                <td className="p-2.5">{st.classroom_name || '-'}</td>
                                <td className="p-2.5 text-indigo-600 font-medium">
                                  {sources ? sources.join(' + ') : 'Direct Match'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT WALK-IN */}
              {activeTab === 'walkin' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm">Catatan Presensi Walk-In (Override)</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                          <th className="p-3">Waktu</th>
                          <th className="p-3">Santri</th>
                          <th className="p-3">Operator Penanggung Jawab</th>
                          <th className="p-3">Alasan Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentWalkInLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{log.student_name}</div>
                              <div className="text-[11px] text-slate-400">{log.student_number}</div>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">{log.operator_name}</td>
                            <td className="p-3 text-rose-700 font-medium">{log.reason}</td>
                          </tr>
                        ))}

                        {currentWalkInLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400">
                              Tidak ada riwayat walk-in override untuk event ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: DISPENSASI KBM */}
              {activeTab === 'dispensation' && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                    <h3 className="font-bold text-indigo-900 text-sm">Integrasi Dispensasi Resmi KBM</h3>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      Santri yang terdaftar dan menghadiri event resmi pada jam KBM/Akademik akan otomatis dibuatkan surat dispensasi sehingga tidak akan dihitung <strong>Alpha</strong> oleh Attendance Engine.
                    </p>
                    <button
                      onClick={handleGenerateDispensations}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Buat Dispensasi Massal untuk Peserta Event ({resolvedDynamic.students.length} Santri)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">
              Pilih event di sebelah kiri untuk mengelola.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Tambah Event */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Tambah Event Baru</h3>
              <button onClick={() => setShowAddEventModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Event</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. EVT-SEMINAR-2026"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Event / Kegiatan</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Seminar Kepemimpinan Santri"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Kegiatan</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Deskripsi singkat..."
                  className="w-full p-2 border border-slate-200 rounded-lg h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipe Event</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as EventType)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="seminar">Seminar / Workshop</option>
                    <option value="competition">Perlombaan</option>
                    <option value="outing">Outbound / Rihlah</option>
                    <option value="school_event">Kegiatan Sekolah</option>
                    <option value="pesantren_event">Kegiatan Pesantren</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu Mulai</label>
                  <input
                    type="text"
                    value={newStartAt}
                    onChange={(e) => setNewStartAt(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu Selesai</label>
                  <input
                    type="text"
                    value={newEndAt}
                    onChange={(e) => setNewEndAt(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                  Simpan Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Sesi */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Tambah Sesi Presensi Event</h3>
              <button onClick={() => setShowAddSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Sesi</label>
                <input
                  type="text"
                  required
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g. Sesi 1: Pembukaan & Pre-Test"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mulai</label>
                  <input
                    type="text"
                    value={sessionStartAt}
                    onChange={(e) => setSessionStartAt(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selesai</label>
                  <input
                    type="text"
                    value={sessionEndAt}
                    onChange={(e) => setSessionEndAt(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Tepat Waktu</label>
                  <input
                    type="text"
                    value={sessionPresentUntil}
                    onChange={(e) => setSessionPresentUntil(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Terlambat</label>
                  <input
                    type="text"
                    value={sessionLateUntil}
                    onChange={(e) => setSessionLateUntil(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Participant Rule */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Tambah Rule Peserta Dinamis</h3>
              <button onClick={() => setShowAddRuleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operator Rule</label>
                <select
                  value={ruleOperator}
                  onChange={(e) => setRuleOperator(e.target.value as 'include' | 'exclude')}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="include">INCLUDE (Sertakan Peserta)</option>
                  <option value="exclude">EXCLUDE (Pengecualian Keras)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe Rule Source</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as ActivityParticipantRuleType)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="classroom">Kelas (Classroom)</option>
                  <option value="extracurricular">Ekstrakurikuler</option>
                  <option value="grade_level">Tingkat Kelas (Grade)</option>
                  <option value="gender">Gender</option>
                  <option value="dormitory">Asrama</option>
                  <option value="individual">Perorangan (Santri)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nilai Parameter Rule</label>
                <input
                  type="text"
                  required
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder="e.g. VII A, male, 1, dll."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                  Tambahkan Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Registration */}
      {showAddRegistrationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Tambah Pendaftaran Santri</h3>
              <button onClick={() => setShowAddRegistrationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRegistration} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Santri</label>
                <select
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.student_number} - {st.classroom_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRegistrationModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                  Daftarkan Santri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
