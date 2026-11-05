import React, { useState } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  ShieldCheck,
  QrCode,
  Radio,
  ClipboardCheck,
  Sparkles,
  Users,
  Award,
  BookOpen,
  Home,
  GraduationCap,
  Eye,
  Settings2,
  Filter,
  Search,
  Trash2,
  Layers,
  Activity as ActivityIcon,
  MoonStar
} from 'lucide-react';
import { 
  Activity, 
  ActivityCategory, 
  ActivityParticipant, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  Extracurricular, 
  ExtracurricularMember, 
  ParticipantType, 
  Student, 
  StudentGroup, 
  StudentGroupMember 
} from '../types';
import { ActivityParticipantService } from '../services/activityParticipantService';

interface ActivitiesViewProps {
  activities: Activity[];
  categories: ActivityCategory[];
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  extracurriculars?: Extracurricular[];
  extracurricularMembers?: ExtracurricularMember[];
  studentGroups?: StudentGroup[];
  studentGroupMembers?: StudentGroupMember[];
  activityParticipants?: ActivityParticipant[];
  onToggleMethod: (activityId: number, method: 'manual' | 'qr' | 'rfid') => void;
  onAddActivity: (activity: Partial<Activity>) => void;
  onUpdateActivity: (activityId: number, activity: Partial<Activity>) => void;
  onDeleteActivity?: (activityId: number) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  activities = [],
  categories = [],
  students = [],
  classrooms = [],
  dormitories = [],
  dormitoryRooms = [],
  extracurriculars = [],
  extracurricularMembers = [],
  studentGroups = [],
  studentGroupMembers = [],
  activityParticipants = [],
  onToggleMethod,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}) => {
  const safeActivities = activities || [];
  const safeCategories = categories || [];
  const safeClassrooms = classrooms || [];
  const safeDormitories = dormitories || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeExtracurriculars = extracurriculars || [];
  const safeStudentGroups = studentGroups || [];

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('all');
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [viewParticipantsActivity, setViewParticipantsActivity] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [participantSearchTerm, setParticipantSearchTerm] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<{
    activity_category_id: number;
    code: string;
    name: string;
    description: string;
    location: string;
    participant_type: ParticipantType;
    participant_gender: 'all' | 'male' | 'female';
    classroom_id: number | null;
    dormitory_id: number | null;
    dormitory_room_id: number | null;
    extracurricular_id: number | null;
    student_group_id: number | null;
    attendance_enabled: boolean;
    allow_manual: boolean;
    allow_qr: boolean;
    allow_rfid: boolean;
    late_tolerance_minutes: number;
    default_start_time: string;
    default_present_until: string;
    default_late_until: string;
    default_end_time: string;
  }>({
    activity_category_id: safeCategories[0]?.id || 1,
    code: '',
    name: '',
    description: '',
    location: '',
    participant_type: 'all_students',
    participant_gender: 'all',
    classroom_id: safeClassrooms[0]?.id || null,
    dormitory_id: safeDormitories[0]?.id || null,
    dormitory_room_id: safeDormitoryRooms[0]?.id || null,
    extracurricular_id: safeExtracurriculars[0]?.id || null,
    student_group_id: safeStudentGroups[0]?.id || null,
    attendance_enabled: true,
    allow_manual: true,
    allow_qr: true,
    allow_rfid: true,
    late_tolerance_minutes: 15,
    default_start_time: '07:30',
    default_present_until: '07:45',
    default_late_until: '08:00',
    default_end_time: '09:00',
  });

  // KPI Calculations
  const totalActivities = safeActivities.length;
  const prayerActivities = safeActivities.filter((a) => {
    const cat = safeCategories.find((c) => c.id === a.activity_category_id);
    return cat?.code === 'prayer' || a.name.toLowerCase().includes('shalat') || a.name.toLowerCase().includes('sholat');
  }).length;
  const academicActivities = safeActivities.filter((a) => {
    const cat = safeCategories.find((c) => c.id === a.activity_category_id);
    return cat?.code === 'kbm' || cat?.code === 'halaqah' || a.name.toLowerCase().includes('kbm') || a.name.toLowerCase().includes('tahfidz');
  }).length;
  const extraActivities = safeActivities.filter((a) => {
    const cat = safeCategories.find((c) => c.id === a.activity_category_id);
    return cat?.code === 'extracurricular' || a.participant_type === 'extracurricular' || a.participant_type === 'custom_group';
  }).length;

  const filteredActivities = safeActivities.filter((a) => {
    if (!a) return false;
    const matchesSearch = (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryCode === 'all' || 
      safeCategories.find((c) => c && c.id === a.activity_category_id)?.code === selectedCategoryCode;
    const matchesParticipant = selectedParticipantType === 'all' || a.participant_type === selectedParticipantType;
    return matchesSearch && matchesCategory && matchesParticipant;
  });

  const handleOpenAdd = () => {
    setFormData({
      activity_category_id: safeCategories[0]?.id || 1,
      code: `ACT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: '',
      description: '',
      location: 'Masjid Utama & Komplek Pesantren',
      participant_type: 'all_students',
      participant_gender: 'all',
      classroom_id: safeClassrooms[0]?.id || null,
      dormitory_id: safeDormitories[0]?.id || null,
      dormitory_room_id: safeDormitoryRooms[0]?.id || null,
      extracurricular_id: safeExtracurriculars[0]?.id || null,
      student_group_id: safeStudentGroups[0]?.id || null,
      attendance_enabled: true,
      allow_manual: true,
      allow_qr: true,
      allow_rfid: true,
      late_tolerance_minutes: 15,
      default_start_time: '04:15',
      default_present_until: '04:30',
      default_late_until: '04:45',
      default_end_time: '05:15',
    });
    setActivityToEdit(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setFormData({
      activity_category_id: act.activity_category_id,
      code: act.code,
      name: act.name,
      description: act.description || '',
      location: act.location || '',
      participant_type: act.participant_type,
      participant_gender: act.participant_gender || 'all',
      classroom_id: act.classroom_id || safeClassrooms[0]?.id || null,
      dormitory_id: act.dormitory_id || safeDormitories[0]?.id || null,
      dormitory_room_id: act.dormitory_room_id || safeDormitoryRooms[0]?.id || null,
      extracurricular_id: act.extracurricular_id || safeExtracurriculars[0]?.id || null,
      student_group_id: act.student_group_id || safeStudentGroups[0]?.id || null,
      attendance_enabled: act.attendance_enabled,
      allow_manual: act.allow_manual,
      allow_qr: act.allow_qr,
      allow_rfid: act.allow_rfid,
      late_tolerance_minutes: act.late_tolerance_minutes || 15,
      default_start_time: act.default_start_time || '07:00',
      default_present_until: act.default_present_until || '07:15',
      default_late_until: act.default_late_until || '07:30',
      default_end_time: act.default_end_time || '08:00',
    });
    setActivityToEdit(act);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    const cat = safeCategories.find((c) => c.id === Number(formData.activity_category_id));

    const payload: Partial<Activity> = {
      activity_category_id: Number(formData.activity_category_id),
      category_name: cat?.name || 'Ibadah',
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      location: formData.location.trim() || 'Pesantren Utsman Bin Affan',
      participant_type: formData.participant_type,
      participant_gender: formData.participant_gender,
      classroom_id: formData.participant_type === 'classroom' ? Number(formData.classroom_id) : null,
      dormitory_id: formData.participant_type === 'dormitory' ? Number(formData.dormitory_id) : null,
      dormitory_room_id: formData.participant_type === 'room' ? Number(formData.dormitory_room_id) : null,
      extracurricular_id: formData.participant_type === 'extracurricular' ? Number(formData.extracurricular_id) : null,
      student_group_id: formData.participant_type === 'custom_group' ? Number(formData.student_group_id) : null,
      attendance_enabled: formData.attendance_enabled,
      allow_manual: formData.allow_manual,
      allow_qr: formData.allow_qr,
      allow_rfid: formData.allow_rfid,
      late_tolerance_minutes: Number(formData.late_tolerance_minutes),
      default_start_time: formData.default_start_time,
      default_present_until: formData.default_present_until,
      default_late_until: formData.default_late_until,
      default_end_time: formData.default_end_time,
      is_active: true,
    };

    if (activityToEdit) {
      onUpdateActivity(activityToEdit.id, payload);
      setActivityToEdit(null);
      setShowAddModal(false);
    } else {
      onAddActivity(payload);
      setShowAddModal(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!activityToDelete) return;
    if (onDeleteActivity) {
      onDeleteActivity(activityToDelete.id);
    }
    setActivityToDelete(null);
  };

  const getParticipantTypeLabel = (act: Activity) => {
    switch (act.participant_type) {
      case 'all_students':
        return act.participant_gender === 'male' ? 'Semua Santriwan (L)' :
               act.participant_gender === 'female' ? 'Semua Santriwati (P)' : 'Semua Santri';
      case 'classroom': {
        const c = classrooms.find((cls) => cls.id === act.classroom_id);
        return `Kelas ${c?.name || act.classroom_id}`;
      }
      case 'dormitory': {
        const d = dormitories.find((dm) => dm.id === act.dormitory_id);
        return d?.name || `Asrama ID ${act.dormitory_id}`;
      }
      case 'room': {
        const r = dormitoryRooms.find((rm) => rm.id === act.dormitory_room_id);
        return r?.name || `Kamar ID ${act.dormitory_room_id}`;
      }
      case 'extracurricular': {
        const e = extracurriculars.find((ek) => ek.id === act.extracurricular_id);
        return `Ekskul: ${e?.name || act.extracurricular_id}`;
      }
      case 'custom_group': {
        const g = studentGroups.find((grp) => grp.id === act.student_group_id);
        return `Grup: ${g?.name || act.student_group_id}`;
      }
      case 'individual':
        return 'Penugasan Perorangan';
      default:
        return 'Semua Santri';
    }
  };

  const getCategoryBadgeClass = (categoryName?: string) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('shalat') || name.includes('ibadah')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (name.includes('kbm') || name.includes('belajar') || name.includes('sekolah')) {
      return 'bg-sky-100 text-sky-800 border-sky-200';
    }
    if (name.includes('asrama') || name.includes('kamar')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    if (name.includes('ekskul') || name.includes('olahraga')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <div id="activities-view-container" className="space-y-6 pb-12">
      {/* SIUBA Emerald Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Award className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Master Jadwal & Aturan Presensi
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Master Kegiatan & Ruang Lingkup Peserta
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Atur definisi aktivitas pesantren, jadwal standar toleransi presensi, izin metode scan (Manual / QR / RFID), serta filter peserta santri.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#1F5C45]" />
              <span>Tambah Kegiatan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Kegiatan</div>
            <div className="text-2xl font-black text-slate-900">{totalActivities} <span className="text-xs font-semibold text-slate-400">Aktivitas</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <MoonStar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ibadah & Rutin</div>
            <div className="text-2xl font-black text-sky-700">{prayerActivities} <span className="text-xs font-semibold text-slate-400">Kegiatan</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">KBM & Halaqah</div>
            <div className="text-2xl font-black text-indigo-700">{academicActivities} <span className="text-xs font-semibold text-slate-400">Kegiatan</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ekskul & Khusus</div>
            <div className="text-2xl font-black text-amber-700">{extraActivities} <span className="text-xs font-semibold text-slate-400">Kegiatan</span></div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama kegiatan, kode, lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Participant Type Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedParticipantType}
              onChange={(e) => setSelectedParticipantType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 w-full md:w-auto"
            >
              <option value="all">Semua Cakupan Peserta</option>
              <option value="all_students">Semua Santri</option>
              <option value="classroom">Per Kelas Formal</option>
              <option value="dormitory">Per Gedung Asrama</option>
              <option value="room">Per Kamar Asrama</option>
              <option value="extracurricular">Ekstrakurikuler</option>
              <option value="custom_group">Kelompok Khusus</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryCode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategoryCode === 'all'
                ? 'bg-[#1F5C45] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua Kategori ({safeActivities.length})
          </button>
          {safeCategories.map((c) => {
            const isSelected = selectedCategoryCode === c.code;
            const count = safeActivities.filter((a) => a && a.activity_category_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryCode(c.code)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1F5C45] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredActivities.map((act) => {
          const resolved = ActivityParticipantService.resolveParticipants({
            activity: act,
            students,
            dormitoryRooms,
            activityParticipants,
            extracurricularMembers,
            studentGroupMembers,
          });

          return (
            <div
              key={act.id}
              id={`activity-card-${act.id}`}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all p-6 flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeClass(act.category_name)}`}>
                    {act.category_name}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {act.code}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#1F5C45] transition-colors leading-snug">
                    {act.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {act.description || 'Tidak ada catatan tambahan untuk kegiatan ini.'}
                  </p>
                </div>

                {/* Target Peserta Bento Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Peserta:</span>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                      {getParticipantTypeLabel(act)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/70">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-[#1F5C45]" />
                      <span className="font-bold">{resolved.students.length} Santri Eligible</span>
                    </div>
                    <button
                      onClick={() => {
                        setViewParticipantsActivity(act);
                        setParticipantSearchTerm('');
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Lihat Daftar
                    </button>
                  </div>
                </div>

                {/* Location & Timing */}
                <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate font-medium">{act.location || 'Area Pesantren'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Jadwal Standard:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {act.default_start_time} - {act.default_end_time} WIB
                    </span>
                  </div>
                </div>
              </div>

              {/* Method Allowances Toggles & Actions */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Izin Metode Absensi:
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Klik untuk On/Off</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Manual */}
                  <button
                    onClick={() => onToggleMethod(act.id, 'manual')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      act.allow_manual
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="text-[10px]">Manual {act.allow_manual ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* QR */}
                  <button
                    onClick={() => onToggleMethod(act.id, 'qr')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      act.allow_qr
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="text-[10px]">QR {act.allow_qr ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* RFID */}
                  <button
                    onClick={() => onToggleMethod(act.id, 'rfid')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      act.allow_rfid
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span className="text-[10px]">RFID {act.allow_rfid ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(act)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Ubah Detail</span>
                  </button>
                  <button
                    onClick={() => setActivityToDelete(act)}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-rose-200 cursor-pointer"
                    title="Hapus Kegiatan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredActivities.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            Tidak ada kegiatan yang sesuai dengan pencarian atau filter kategori.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: LIHAT SANTRI ELIGIBLE                                              */}
      {/* ========================================================================= */}
      {viewParticipantsActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{viewParticipantsActivity.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cakupan: <strong>{getParticipantTypeLabel(viewParticipantsActivity)}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewParticipantsActivity(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search within participants */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari santri eligible..."
                value={participantSearchTerm}
                onChange={(e) => setParticipantSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const resolved = ActivityParticipantService.resolveParticipants({
                  activity: viewParticipantsActivity,
                  students,
                  dormitoryRooms,
                  activityParticipants,
                  extracurricularMembers,
                  studentGroupMembers,
                });

                const filteredStudents = resolved.students.filter((st) => 
                  st.name.toLowerCase().includes(participantSearchTerm.toLowerCase()) ||
                  (st.student_number || '').toLowerCase().includes(participantSearchTerm.toLowerCase())
                );

                if (filteredStudents.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada santri yang sesuai dengan filter atau kriteria kegiatan.
                    </div>
                  );
                }

                return filteredStudents.map((st, idx) => (
                  <div
                    key={st.id}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-slate-400 w-5">{idx + 1}.</span>
                      <div>
                        <p className="font-bold text-slate-900">{st.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          NIS: {st.student_number} &bull; {st.classroom_name || 'Tanpa Kelas'} &bull; {st.dormitory_room_name || 'Non-Asrama'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-200">
                      Eligible
                    </span>
                  </div>
                ));
              })()}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewParticipantsActivity(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / UBAH KEGIATAN                                             */}
      {/* ========================================================================= */}
      {(showAddModal || activityToEdit) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {activityToEdit ? 'Ubah Konfigurasi Kegiatan' : 'Tambah Kegiatan Baru'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tentukan kategori, jadwal standar, aturan toleransi, dan cakupan peserta santri.
              </p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Kegiatan *</label>
                  <select
                    value={formData.activity_category_id}
                    onChange={(e) => setFormData({ ...formData, activity_category_id: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Kegiatan *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: KBM-PAGI, SHALAT-DZH"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Shalat Dzuhur Berjamaah"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Kegiatan</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Penjelasan singkat mengenai kegiatan ini..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Kegiatan</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Contoh: Masjid Utama / Aula"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Toleransi Terlambat (Menit)</label>
                  <input
                    type="number"
                    value={formData.late_tolerance_minutes}
                    onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Default Timetable */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900">Jadwal Waktu Standar</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Mulai Presensi</label>
                    <input
                      type="time"
                      value={formData.default_start_time}
                      onChange={(e) => setFormData({ ...formData, default_start_time: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 text-slate-900 rounded-lg font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Hadir Tepat</label>
                    <input
                      type="time"
                      value={formData.default_present_until}
                      onChange={(e) => setFormData({ ...formData, default_present_until: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 text-slate-900 rounded-lg font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Batas Terlambat</label>
                    <input
                      type="time"
                      value={formData.default_late_until}
                      onChange={(e) => setFormData({ ...formData, default_late_until: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 text-slate-900 rounded-lg font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Sesi Selesai</label>
                    <input
                      type="time"
                      value={formData.default_end_time}
                      onChange={(e) => setFormData({ ...formData, default_end_time: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 text-slate-900 rounded-lg font-mono text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Participant Type Scope Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <p className="font-bold text-[#1F5C45]">Aturan Peserta Santri (Participant Scope)</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipe Peserta *</label>
                    <select
                      value={formData.participant_type}
                      onChange={(e) => setFormData({ ...formData, participant_type: e.target.value as ParticipantType })}
                      className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="all_students">Semua Santri Aktif</option>
                      <option value="classroom">Berdasarkan Kelas Formal</option>
                      <option value="dormitory">Berdasarkan Asrama</option>
                      <option value="room">Berdasarkan Kamar Asrama</option>
                      <option value="extracurricular">Anggota Ekstrakurikuler</option>
                      <option value="custom_group">Anggota Kelompok Khusus</option>
                    </select>
                  </div>

                  {formData.participant_type === 'all_students' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Filter Gender</label>
                      <select
                        value={formData.participant_gender}
                        onChange={(e) => setFormData({ ...formData, participant_gender: e.target.value as any })}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        <option value="all">Semua (Putra & Putri)</option>
                        <option value="male">Khusus Santriwan (Putra)</option>
                        <option value="female">Khusus Santriwati (Putri)</option>
                      </select>
                    </div>
                  )}

                  {formData.participant_type === 'classroom' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pilih Kelas</label>
                      <select
                        value={formData.classroom_id || ''}
                        onChange={(e) => setFormData({ ...formData, classroom_id: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            Kelas {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.participant_type === 'dormitory' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pilih Asrama</label>
                      <select
                        value={formData.dormitory_id || ''}
                        onChange={(e) => setFormData({ ...formData, dormitory_id: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        {dormitories.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.participant_type === 'room' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pilih Kamar</label>
                      <select
                        value={formData.dormitory_room_id || ''}
                        onChange={(e) => setFormData({ ...formData, dormitory_room_id: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        {dormitoryRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.dormitory_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.participant_type === 'extracurricular' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pilih Ekstrakurikuler</label>
                      <select
                        value={formData.extracurricular_id || ''}
                        onChange={(e) => setFormData({ ...formData, extracurricular_id: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        {extracurriculars.map((ek) => (
                          <option key={ek.id} value={ek.id}>
                            {ek.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.participant_type === 'custom_group' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pilih Kelompok Khusus</label>
                      <select
                        value={formData.student_group_id || ''}
                        onChange={(e) => setFormData({ ...formData, student_group_id: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        {studentGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Method Allowances checkboxes */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="font-bold text-slate-900 mb-2">Metode Absensi yang Diizinkan</p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.allow_manual}
                      onChange={(e) => setFormData({ ...formData, allow_manual: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Manual</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.allow_qr}
                      onChange={(e) => setFormData({ ...formData, allow_qr: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>QR Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.allow_rfid}
                      onChange={(e) => setFormData({ ...formData, allow_rfid: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>RFID Card</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setActivityToEdit(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  {activityToEdit ? 'Simpan Perubahan' : 'Buat Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS KEGIATAN                                          */}
      {/* ========================================================================= */}
      {activityToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-black text-rose-700 tracking-tight">Hapus Master Kegiatan?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus kegiatan <strong>{activityToDelete.name} ({activityToDelete.code})</strong>?
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800">
              ⚠️ Sesi presensi aktif atau riwayat kehadiran yang telah tercatat sebelumnya tetap tersimpan di arsip database.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Ya, Hapus Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
