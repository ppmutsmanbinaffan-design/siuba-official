import React, { useState } from 'react';
import { 
  AcademicCalendarEvent, 
  AcademicYear, 
  LessonPeriod, 
  Semester, 
  Subject, 
  SubjectCategory,
  Teacher, 
  TeachingAssignment 
} from '../types';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  GraduationCap, 
  Layers, 
  Plus, 
  Sparkles, 
  Trash2, 
  UserCheck, 
  Users,
  Award,
  Search,
  Filter,
  Edit2,
  Phone,
  X,
  Check,
  Building,
  CalendarDays,
  FileText
} from 'lucide-react';

interface Props {
  academicYears?: AcademicYear[];
  semesters?: Semester[];
  subjects?: Subject[];
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  lessonPeriods?: LessonPeriod[];
  calendarEvents?: AcademicCalendarEvent[];
  classrooms?: any[];
  onAddSubject: (subj: Subject) => void;
  onUpdateSubject?: (id: number, subj: Partial<Subject>) => void;
  onDeleteSubject?: (id: number) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher?: (id: number, teacher: Partial<Teacher>) => void;
  onDeleteTeacher?: (id: number) => void;
  onAddAssignment: (assignment: TeachingAssignment) => void;
  onDeleteAssignment?: (id: number) => void;
  onAddCalendarEvent: (event: AcademicCalendarEvent) => void;
  onDeleteCalendarEvent?: (id: number) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AcademicMasterView: React.FC<Props> = ({
  academicYears = [],
  semesters = [],
  subjects = [],
  teachers = [],
  teachingAssignments = [],
  lessonPeriods = [],
  calendarEvents = [],
  classrooms = [],
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onAddAssignment,
  onDeleteAssignment,
  onAddCalendarEvent,
  onDeleteCalendarEvent,
  onShowToast,
}) => {
  const safeSubjects = subjects || [];
  const safeTeachers = teachers || [];
  const safeAssignments = teachingAssignments || [];
  const safeLessonPeriods = lessonPeriods || [];
  const safeCalendarEvents = calendarEvents || [];
  const safeClassrooms = classrooms || [];

  const [activeTab, setActiveTab] = useState<'subjects' | 'teachers' | 'assignments' | 'calendar'>('subjects');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCategory, setNewSubjCategory] = useState<SubjectCategory>('DINYYAH');

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [newTeacherNip, setNewTeacherNip] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignClassroomId, setAssignClassroomId] = useState<number>(safeClassrooms[0]?.id || 1);
  const [assignSubjectId, setAssignSubjectId] = useState<number>(safeSubjects[0]?.id || 1);
  const [assignTeacherId, setAssignTeacherId] = useState<number>(safeTeachers[0]?.id || 1);
  const [assignPeriods, setAssignPeriods] = useState<number>(3);

  const [showCalModal, setShowCalModal] = useState(false);
  const [calName, setCalName] = useState('');
  const [calStartDate, setCalStartDate] = useState('2026-08-25');
  const [calEndDate, setCalEndDate] = useState('2026-08-25');
  const [calType, setCalType] = useState<'holiday' | 'exam' | 'school_event' | 'pesantren_event'>('holiday');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'teacher' | 'assignment' | 'calendar';
    id: number;
    name: string;
  } | null>(null);

  // Subject Handlers
  const handleOpenAddSubject = () => {
    setSubjectToEdit(null);
    setNewSubjCode('');
    setNewSubjName('');
    setNewSubjCategory('DINYYAH');
    setShowSubjectModal(true);
  };

  const handleOpenEditSubject = (subj: Subject) => {
    setSubjectToEdit(subj);
    setNewSubjCode(subj.code);
    setNewSubjName(subj.name);
    setNewSubjCategory(subj.category);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjCode.trim() || !newSubjName.trim()) {
      onShowToast('Mohon lengkapi kode dan nama mata pelajaran.', 'error');
      return;
    }

    if (subjectToEdit && onUpdateSubject) {
      onUpdateSubject(subjectToEdit.id, {
        code: newSubjCode.trim().toUpperCase(),
        name: newSubjName.trim(),
        short_name: newSubjName.trim().slice(0, 12),
        category: newSubjCategory,
      });
      setShowSubjectModal(false);
    } else {
      const subj: Subject = {
        id: Date.now(),
        code: newSubjCode.trim().toUpperCase(),
        name: newSubjName.trim(),
        short_name: newSubjName.trim().slice(0, 12),
        category: newSubjCategory,
        is_active: true,
      };
      onAddSubject(subj);
      setShowSubjectModal(false);
      onShowToast(`Mata pelajaran '${subj.name}' berhasil ditambahkan.`, 'success');
    }
  };

  // Teacher Handlers
  const handleOpenAddTeacher = () => {
    setTeacherToEdit(null);
    setNewTeacherNip('');
    setNewTeacherName('');
    setNewTeacherPhone('');
    setShowTeacherModal(true);
  };

  const handleOpenEditTeacher = (tch: Teacher) => {
    setTeacherToEdit(tch);
    setNewTeacherNip(tch.employee_number || '');
    setNewTeacherName(tch.name);
    setNewTeacherPhone(tch.phone || '');
    setShowTeacherModal(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) {
      onShowToast('Mohon isi nama guru.', 'error');
      return;
    }

    if (teacherToEdit && onUpdateTeacher) {
      onUpdateTeacher(teacherToEdit.id, {
        employee_number: newTeacherNip.trim() || teacherToEdit.employee_number,
        name: newTeacherName.trim(),
        phone: newTeacherPhone.trim(),
      });
      setShowTeacherModal(false);
    } else {
      const teacher: Teacher = {
        id: Date.now(),
        employee_number: newTeacherNip.trim() || `NIPY${Math.floor(Math.random() * 90000 + 10000)}`,
        name: newTeacherName.trim(),
        phone: newTeacherPhone.trim(),
        gender: 'male',
        is_active: true,
      };
      onAddTeacher(teacher);
      setShowTeacherModal(false);
      onShowToast(`Guru '${teacher.name}' berhasil didaftarkan.`, 'success');
    }
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const assignment: TeachingAssignment = {
      id: Date.now(),
      academic_year_id: 1,
      semester_id: 1,
      classroom_id: assignClassroomId,
      subject_id: assignSubjectId,
      teacher_id: assignTeacherId,
      weekly_periods: assignPeriods,
      is_active: true,
    };
    onAddAssignment(assignment);
    setShowAssignModal(false);
    onShowToast('Penugasan pengampu mata pelajaran berhasil disimpan.', 'success');
  };

  const handleSaveCalEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calName.trim()) return;
    const ev: AcademicCalendarEvent = {
      id: Date.now(),
      academic_year_id: 1,
      date_start: calStartDate,
      date_end: calEndDate,
      type: calType,
      name: calName.trim(),
      affects_academic_schedule: calType === 'holiday',
    };
    onAddCalendarEvent(ev);
    setShowCalModal(false);
    setCalName('');
    onShowToast(`Agenda kalender '${ev.name}' berhasil disimpan.`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'subject' && onDeleteSubject) {
      onDeleteSubject(deleteTarget.id);
    } else if (deleteTarget.type === 'teacher' && onDeleteTeacher) {
      onDeleteTeacher(deleteTarget.id);
    } else if (deleteTarget.type === 'assignment' && onDeleteAssignment) {
      onDeleteAssignment(deleteTarget.id);
    } else if (deleteTarget.type === 'calendar' && onDeleteCalendarEvent) {
      onDeleteCalendarEvent(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const getCategoryColor = (cat: SubjectCategory) => {
    switch (cat) {
      case 'DINYYAH':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UMUM':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'BAHASA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TAHFIDZ':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const filteredSubjects = safeSubjects.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategoryFilter === 'all' || s.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredTeachers = safeTeachers.filter((t) => {
    return t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (t.employee_number || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div id="academic-master-container" className="space-y-6 pb-12">
      {/* SIUBA Emerald Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
              Fondasi Kurikulum & Master Akademik
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Master Data Akademik & Kurikulum KBM
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Kelola data pokok mata pelajaran, profil dewan asatidz/guru, plotting penugasan mengajar per kelas, serta kalender akademik pondok.
          </p>
        </div>

        {/* Tab Navigation Pill in Header */}
        <div className="flex flex-wrap bg-black/30 p-1.5 rounded-2xl border border-white/20 text-xs font-bold gap-1 backdrop-blur-xs shadow-inner self-start lg:self-auto">
          <button
            onClick={() => {
              setActiveTab('subjects');
              setSearchTerm('');
            }}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'subjects' ? 'bg-white text-[#12372A] font-black shadow-xs' : 'text-emerald-100 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mapel ({safeSubjects.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('teachers');
              setSearchTerm('');
            }}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'teachers' ? 'bg-white text-[#12372A] font-black shadow-xs' : 'text-emerald-100 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guru ({safeTeachers.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('assignments');
              setSearchTerm('');
            }}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'assignments' ? 'bg-white text-[#12372A] font-black shadow-xs' : 'text-emerald-100 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Penugasan ({safeAssignments.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('calendar');
              setSearchTerm('');
            }}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'calendar' ? 'bg-white text-[#12372A] font-black shadow-xs' : 'text-emerald-100 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalender ({safeCalendarEvents.length})</span>
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mata Pelajaran</div>
            <div className="text-2xl font-black text-slate-900 font-mono">{safeSubjects.length} <span className="text-xs font-semibold text-slate-400">Mapel</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dewan Guru</div>
            <div className="text-2xl font-black text-sky-700 font-mono">{safeTeachers.length} <span className="text-xs font-semibold text-slate-400">Asatidz</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Penugasan Mengajar</div>
            <div className="text-2xl font-black text-indigo-700 font-mono">{safeAssignments.length} <span className="text-xs font-semibold text-slate-400">Alokasi</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kalender Agenda</div>
            <div className="text-2xl font-black text-amber-700 font-mono">{safeCalendarEvents.length} <span className="text-xs font-semibold text-slate-400">Kegiatan</span></div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MATA PELAJARAN                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama atau kode mapel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="DINYYAH">Diniyyah (Pondok)</option>
                <option value="UMUM">Umum (Sekolah)</option>
                <option value="BAHASA">Bahasa</option>
                <option value="TAHFIDZ">Tahfidz</option>
                <option value="LOKAL">Muatan Lokal</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddSubject}
              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mata Pelajaran</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subj) => (
              <div key={subj.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between group">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                      {subj.code}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${getCategoryColor(subj.category)}`}>
                      {subj.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-[#1F5C45] transition-colors leading-snug">
                      {subj.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Nama Singkat: <strong>{subj.short_name || subj.name}</strong></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Kurikulum Aktif
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditSubject(subj)}
                      className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg transition cursor-pointer"
                      title="Ubah Mapel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteSubject && (
                      <button
                        onClick={() => setDeleteTarget({ type: 'subject', id: subj.id, name: subj.name })}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        title="Hapus Mapel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredSubjects.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Tidak ada mata pelajaran yang sesuai dengan pencarian atau filter kategori.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GURU & PENGAJAR                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama guru atau NIPY..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleOpenAddTeacher}
              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">NIPY / Kode</th>
                  <th className="p-3.5">Nama Lengkap Guru</th>
                  <th className="p-3.5">No. Telepon / WhatsApp</th>
                  <th className="p-3.5">Akun Login</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3.5 text-[#1F5C45] font-mono font-bold">{t.employee_number || `-`}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {t.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono">
                      {t.phone ? (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {t.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {t.user_id ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          Terhubung Login (ID #{t.user_id})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                          Staff Offline
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        Aktif
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditTeacher(t)}
                          className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg transition cursor-pointer"
                          title="Ubah Data Guru"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteTeacher && (
                          <button
                            onClick={() => setDeleteTarget({ type: 'teacher', id: t.id, name: t.name })}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada guru yang sesuai dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENUGASAN MENGAJAR                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Alokasi Pengampu Mata Pelajaran Per Kelas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemetaan beban ajar ustadz/guru dan target jam pelajaran per pekan.
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tugaskan Guru</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Rombel Kelas</th>
                  <th className="p-3.5">Mata Pelajaran</th>
                  <th className="p-3.5">Guru Pengampu</th>
                  <th className="p-3.5">Beban Target JP</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {safeAssignments.map((ta) => {
                  const cls = safeClassrooms.find((c) => c.id === ta.classroom_id);
                  const sub = safeSubjects.find((s) => s.id === ta.subject_id);
                  const tch = safeTeachers.find((t) => t.id === ta.teacher_id);
                  return (
                    <tr key={ta.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3.5 font-black text-[#1F5C45] text-sm">
                        Kelas {cls?.name || `#${ta.classroom_id}`}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div>{sub?.name || `Mapel #${ta.subject_id}`}</div>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {sub?.code}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{tch?.name || `Guru #${ta.teacher_id}`}</td>
                      <td className="p-3.5 font-mono text-slate-600 font-bold">{ta.weekly_periods} JP / Minggu</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          Aktif
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {onDeleteAssignment && (
                          <button
                            onClick={() => setDeleteTarget({ type: 'assignment', id: ta.id, name: `Penugasan ${sub?.name || ''} - ${cls?.name || ''}` })}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            title="Hapus Penugasan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {safeAssignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      Belum ada penugasan guru pengampu yang diatur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KALENDER AKADEMIK                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Kalender Akademik & Agenda Libur Pondok
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jadwal agenda kegiatan pesantren, ujian semester, serta libur resmi yang menangguhkan presensi.
              </p>
            </div>
            <button
              onClick={() => setShowCalModal(true)}
              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Agenda</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeCalendarEvents.map((ev) => (
              <div key={ev.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                        ev.type === 'holiday'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : ev.type === 'exam'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {ev.type === 'holiday' ? 'LIBUR RESMI' : ev.type === 'exam' ? 'UJIAN' : 'EVENT PONDOK'}
                    </span>
                    <h4 className="text-base font-black text-slate-900">{ev.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500">{ev.description || 'Tidak ada catatan tambahan.'}</p>
                  <div className="text-xs font-mono text-[#1F5C45] font-bold pt-1">
                    📅 {ev.date_start} s/d {ev.date_end}
                  </div>
                </div>

                {onDeleteCalendarEvent && (
                  <button
                    onClick={() => setDeleteTarget({ type: 'calendar', id: ev.id, name: ev.name })}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer shrink-0"
                    title="Hapus Agenda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {safeCalendarEvents.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Belum ada agenda kalender akademik yang ditambahkan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / UBAH MATA PELAJARAN                                       */}
      {/* ========================================================================= */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveSubject} className="bg-white p-6 rounded-3xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {subjectToEdit ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Master kurikulum mata pelajaran KBM</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kode Mapel (Singkat) *</label>
              <input
                type="text"
                placeholder="contoh: FIQIH / MTK / ARB"
                value={newSubjCode}
                onChange={(e) => setNewSubjCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap Mata Pelajaran *</label>
              <input
                type="text"
                placeholder="contoh: Fiqih Wadhil / Matematika Terpadu"
                value={newSubjName}
                onChange={(e) => setNewSubjName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kategori Kurikulum</label>
              <select
                value={newSubjCategory}
                onChange={(e: any) => setNewSubjCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DINYYAH">DINYYAH (Pondok)</option>
                <option value="UMUM">UMUM (Sekolah)</option>
                <option value="BAHASA">BAHASA</option>
                <option value="TAHFIDZ">TAHFIDZ</option>
                <option value="LOKAL">LOKAL</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                {subjectToEdit ? 'Simpan Perubahan' : 'Simpan Mapel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / UBAH GURU                                                 */}
      {/* ========================================================================= */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveTeacher} className="bg-white p-6 rounded-3xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {teacherToEdit ? 'Ubah Data Guru' : 'Tambah Master Guru Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Profil asatidz dan pengajar pondok</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">NIPY / Nomor Pegawai</label>
              <input
                type="text"
                placeholder="contoh: NIPY202601"
                value={newTeacherNip}
                onChange={(e) => setNewTeacherNip(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap Guru (dengan Gelar) *</label>
              <input
                type="text"
                placeholder="contoh: Ustadz Ahmad Dahlan, M.Pd"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                placeholder="contoh: 081234567890"
                value={newTeacherPhone}
                onChange={(e) => setNewTeacherPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                {teacherToEdit ? 'Simpan Perubahan' : 'Daftarkan Guru'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PENUGASAN GURU PENGIKUT KELAS                                      */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveAssignment} className="bg-white p-6 rounded-3xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Tugaskan Guru Pengampu Kelas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Plotting guru dan mata pelajaran per rombel</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rombel Kelas</label>
              <select
                value={assignClassroomId}
                onChange={(e) => setAssignClassroomId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {safeClassrooms.map((c) => (
                  <option key={c.id} value={c.id}>Kelas {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
              <select
                value={assignSubjectId}
                onChange={(e) => setAssignSubjectId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {safeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Guru Pengampu</label>
              <select
                value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {safeTeachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target JP Per Minggu</label>
              <input
                type="number"
                min="1"
                max="20"
                value={assignPeriods}
                onChange={(e) => setAssignPeriods(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Simpan Penugasan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH AGENDA KALENDER                                             */}
      {/* ========================================================================= */}
      {showCalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCalEvent} className="bg-white p-6 rounded-3xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Tambah Agenda Kalender Akademik</h3>
                <p className="text-xs text-slate-500 mt-0.5">Penjadwalan kegiatan pondok & hari libur</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Agenda Kegiatan *</label>
              <input
                type="text"
                placeholder="contoh: Libur Awal Ramadhan / UTS Semester 1"
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={calStartDate}
                  onChange={(e) => setCalStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  value={calEndDate}
                  onChange={(e) => setCalEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Agenda</label>
              <select
                value={calType}
                onChange={(e: any) => setCalType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="holiday">Hari Libur Resmi (Presensi Libur)</option>
                <option value="exam">Pekan Ujian (UTS / UAS)</option>
                <option value="pesantren_event">Event Khusus Pesantren</option>
                <option value="school_event">Event Khusus Sekolah</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCalModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Simpan Agenda
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS DATA                                              */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-black text-rose-700 tracking-tight">Hapus Data Master?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong>?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 text-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
