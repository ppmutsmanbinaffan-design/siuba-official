import React, { useState } from 'react';
import { 
  AcademicSchedule, 
  AcademicScheduleConflictError, 
  Classroom, 
  DayOfWeek, 
  LessonPeriod, 
  Subject, 
  Teacher 
} from '../types';
import { AcademicScheduleService } from '../services/academicScheduleService';
import { 
  AlertTriangle, 
  CalendarCheck, 
  Clock, 
  Copy, 
  Download, 
  Filter, 
  Grid, 
  List, 
  Plus, 
  Sparkles, 
  Trash2, 
  Upload,
  Award,
  Calendar,
  BookOpen,
  Users,
  GraduationCap,
  MapPin,
  X,
  Layers,
  CheckCircle2,
  Settings,
  Edit2,
  Coffee,
  Check
} from 'lucide-react';

interface Props {
  academicSchedules?: AcademicSchedule[];
  classrooms?: Classroom[];
  subjects?: Subject[];
  teachers?: Teacher[];
  lessonPeriods?: LessonPeriod[];
  onAddSchedule: (sched: AcademicSchedule) => void;
  onDeleteSchedule: (id: number) => void;
  onGenerateSessions: (date: string) => void;
  onAddLessonPeriod?: (period: Partial<LessonPeriod>) => void;
  onUpdateLessonPeriod?: (id: number, period: Partial<LessonPeriod>) => void;
  onDeleteLessonPeriod?: (id: number) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TimetableManagerView: React.FC<Props> = ({
  academicSchedules = [],
  classrooms = [],
  subjects = [],
  teachers = [],
  lessonPeriods = [],
  onAddSchedule,
  onDeleteSchedule,
  onGenerateSessions,
  onAddLessonPeriod,
  onUpdateLessonPeriod,
  onDeleteLessonPeriod,
  onShowToast,
}) => {
  const safeAcademicSchedules = academicSchedules || [];
  const safeClassrooms = classrooms || [];
  const safeSubjects = subjects || [];
  const safeTeachers = teachers || [];
  const safeLessonPeriods = lessonPeriods || [];

  const allAvailableDays: { key: DayOfWeek; label: string }[] = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: "Jum'at" },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Ahad / Minggu' },
  ];

  // Active Days State (Default: Senin - Sabtu)
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]);

  const [selectedClassroom, setSelectedClassroom] = useState<number>(safeClassrooms[0]?.id || 1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [targetDate, setTargetDate] = useState<string>('2026-08-24'); // Monday

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDaysConfigModal, setShowDaysConfigModal] = useState(false);
  const [showPeriodsConfigModal, setShowPeriodsConfigModal] = useState(false);
  
  // Period Form State for add/edit in Period Modal
  const [periodToEdit, setPeriodToEdit] = useState<LessonPeriod | null>(null);
  const [periodFormData, setPeriodFormData] = useState<{
    code: string;
    name: string;
    period_number: number;
    start_time: string;
    end_time: string;
    is_break: boolean;
  }>({
    code: 'JP-01',
    name: 'JP 1',
    period_number: 1,
    start_time: '07:00',
    end_time: '07:45',
    is_break: false,
  });

  // Schedule Add/Edit State
  const [modalDay, setModalDay] = useState<DayOfWeek>('monday');
  const [modalPeriodId, setModalPeriodId] = useState<number>(safeLessonPeriods.find((lp) => lp && !lp.is_break)?.id || 1);
  const [modalSubjectId, setModalSubjectId] = useState<number>(safeSubjects[0]?.id || 1);
  const [modalTeacherId, setModalTeacherId] = useState<number>(safeTeachers[0]?.id || 1);
  const [modalRoomLocation, setModalRoomLocation] = useState<string>('Gedung Umar R.101');
  const [conflictError, setConflictError] = useState<AcademicScheduleConflictError | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<AcademicSchedule | null>(null);

  const activePeriods = safeLessonPeriods.filter((lp) => lp && lp.is_active);

  // Filter schedules for active classroom
  const filteredSchedules = safeAcademicSchedules.filter((s) => s && s.classroom_id === selectedClassroom && s.is_active);
  const currentClassroom = safeClassrooms.find((c) => c.id === selectedClassroom);

  // KPI Calculations
  const totalWeeklySlots = filteredSchedules.length;
  const uniqueSubjectsCount = new Set(filteredSchedules.map((s) => s.subject_id)).size;
  const uniqueTeachersCount = new Set(filteredSchedules.map((s) => s.teacher_id)).size;

  const handleOpenAddModal = (day?: DayOfWeek, periodId?: number) => {
    if (day) setModalDay(day);
    if (periodId) setModalPeriodId(periodId);
    setConflictError(null);
    setShowAddModal(true);
  };

  const handleToggleDay = (dayKey: DayOfWeek) => {
    if (activeDays.includes(dayKey)) {
      if (activeDays.length === 1) {
        onShowToast('Minimal harus ada 1 hari aktif untuk KBM.', 'error');
        return;
      }
      setActiveDays(activeDays.filter((d) => d !== dayKey));
    } else {
      setActiveDays([...activeDays, dayKey]);
    }
  };

  const handleValidateAndSave = (e: React.FormEvent) => {
    e.preventDefault();

    const newSched: Partial<AcademicSchedule> = {
      academic_year_id: 1,
      semester_id: 1,
      day_of_week: modalDay,
      classroom_id: selectedClassroom,
      subject_id: modalSubjectId,
      teacher_id: modalTeacherId,
      lesson_period_id: modalPeriodId,
      room_location: modalRoomLocation,
      is_active: true,
    };

    // Conflict Check
    const err = AcademicScheduleService.validateScheduleConflict(
      newSched,
      academicSchedules,
      teachers,
      subjects,
      lessonPeriods
    );

    if (err) {
      setConflictError(err);
      onShowToast(err.message, 'error');
      return;
    }

    const created: AcademicSchedule = {
      id: Date.now(),
      academic_year_id: 1,
      semester_id: 1,
      day_of_week: modalDay,
      classroom_id: selectedClassroom,
      subject_id: modalSubjectId,
      teacher_id: modalTeacherId,
      lesson_period_id: modalPeriodId,
      room_location: modalRoomLocation,
      is_active: true,
    };

    onAddSchedule(created);
    setShowAddModal(false);
    onShowToast('Jadwal KBM berhasil ditambahkan tanpa bentrok!', 'success');
  };

  const handleConfirmDelete = () => {
    if (!scheduleToDelete) return;
    onDeleteSchedule(scheduleToDelete.id);
    setScheduleToDelete(null);
    onShowToast('Sesi jadwal berhasil dihapus.', 'info');
  };

  // Period Save (Create / Update)
  const handleSavePeriodForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodFormData.name.trim()) return;

    if (periodToEdit && onUpdateLessonPeriod) {
      onUpdateLessonPeriod(periodToEdit.id, {
        code: periodFormData.code.trim().toUpperCase(),
        name: periodFormData.name.trim(),
        period_number: Number(periodFormData.period_number),
        start_time: periodFormData.start_time,
        end_time: periodFormData.end_time,
        is_break: periodFormData.is_break,
      });
      setPeriodToEdit(null);
    } else if (onAddLessonPeriod) {
      onAddLessonPeriod({
        code: periodFormData.code.trim().toUpperCase(),
        name: periodFormData.name.trim(),
        period_number: Number(periodFormData.period_number),
        start_time: periodFormData.start_time,
        end_time: periodFormData.end_time,
        is_break: periodFormData.is_break,
        is_active: true,
      });
    }

    // Reset period form
    const nextNum = safeLessonPeriods.length + 1;
    setPeriodFormData({
      code: `JP-${nextNum.toString().padStart(2, '0')}`,
      name: `JP ${nextNum}`,
      period_number: nextNum,
      start_time: '08:00',
      end_time: '08:45',
      is_break: false,
    });
  };

  const handleOpenEditPeriod = (lp: LessonPeriod) => {
    setPeriodToEdit(lp);
    setPeriodFormData({
      code: lp.code,
      name: lp.name,
      period_number: lp.period_number || 1,
      start_time: lp.start_time,
      end_time: lp.end_time,
      is_break: Boolean(lp.is_break),
    });
  };

  return (
    <div id="timetable-manager-container" className="space-y-6 pb-12">
      {/* Top SIUBA Emerald Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
              Jadwal Pelajaran KBM & Generator Sesi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Jadwal Pelajaran & Generator Sesi KBM
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Kelola plotting jadwal mata pelajaran mingguan per rombel kelas, atur hari belajar aktif, dan konfigurasi jam pelajaran (JP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 self-start lg:self-auto">
          {/* Classroom Selector */}
          <div className="flex items-center gap-2 bg-black/30 px-3.5 py-2 rounded-2xl border border-white/20 backdrop-blur-xs shadow-inner">
            <Filter className="w-4 h-4 text-[#C9A227]" />
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-100/80 font-bold uppercase">Pilih Rombel:</span>
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    Kelas {c.name} (Tingkat {c.grade_level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generator Input */}
          <div className="flex items-center gap-2 bg-black/30 px-3.5 py-2 rounded-2xl border border-white/20 backdrop-blur-xs shadow-inner">
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-100/80 font-bold uppercase">Tanggal KBM:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
            <button
              onClick={() => onGenerateSessions(targetDate)}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1F5C45]" />
              <span>Generate Sesi</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-black/30 p-1 rounded-2xl border border-white/20 backdrop-blur-xs text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#12372A] font-bold shadow-xs' : 'text-emerald-100 hover:text-white'
              }`}
              title="Tampilan Matriks Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#12372A] font-bold shadow-xs' : 'text-emerald-100 hover:text-white'
              }`}
              title="Tampilan Tabel List"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Quick Bar: Atur Hari KBM & Atur Jam Pelajaran (JP) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Pengaturan Jadwal:
          </span>
          <button
            onClick={() => setShowDaysConfigModal(true)}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#1F5C45]" />
            <span>Hari Belajar ({activeDays.length} Hari Aktif)</span>
          </button>
          <button
            onClick={() => setShowPeriodsConfigModal(true)}
            className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-sky-700" />
            <span>Jam Pelajaran ({safeLessonPeriods.length} Slot JP)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal(activeDays[0] || 'monday')}
            className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Plotting Jadwal</span>
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Slot Jadwal</div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalWeeklySlots} <span className="text-xs font-semibold text-slate-400">Jam/Minggu</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mata Pelajaran</div>
            <div className="text-2xl font-black text-sky-700 font-mono">{uniqueSubjectsCount} <span className="text-xs font-semibold text-slate-400">Mapel Aktif</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Guru Pengampu</div>
            <div className="text-2xl font-black text-indigo-700 font-mono">{uniqueTeachersCount} <span className="text-xs font-semibold text-slate-400">Asatidz</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kelas Terpilih</div>
            <div className="text-xl font-black text-amber-800 truncate">Kelas {currentClassroom?.name || '-'}</div>
          </div>
        </div>
      </div>

      {/* Grid Timetable Display */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Matriks Jadwal Mingguan: Kelas {currentClassroom?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik tombol <strong>+ Isi Slot</strong> pada slot kosong untuk menambahkan jadwal belajar.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-bold">
              {activeDays.length} Hari Aktif &bull; {activePeriods.length} Jam Pelajaran
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-center border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3.5 text-left text-xs font-black text-slate-500 uppercase w-32 border-r border-slate-200">
                    Jam / JP
                  </th>
                  {activeDays.map((day) => (
                    <th key={day} className="p-3.5 text-xs font-black text-[#1F5C45] uppercase tracking-wider">
                      {AcademicScheduleService.getDayLabel(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePeriods.map((period) => (
                  <tr key={period.id} className={period.is_break ? 'bg-amber-50/50' : 'hover:bg-slate-50/40 transition-colors'}>
                    <td className="p-3.5 text-left font-mono text-xs border-r border-slate-100 bg-slate-50/70">
                      <div className="font-black text-slate-900 text-sm">{period.name}</div>
                      <div className="text-[11px] text-slate-500 font-bold mt-0.5">{period.start_time}–{period.end_time}</div>
                    </td>

                    {activeDays.map((day) => {
                      if (period.is_break) {
                        return (
                          <td key={day} className="p-3 text-[11px] font-black text-amber-700 italic bg-amber-50/70 border border-amber-100">
                            ☕ ISTIRAHAT
                          </td>
                        );
                      }

                      const sched = filteredSchedules.find(
                        (s) => s.day_of_week === day && s.lesson_period_id === period.id
                      );

                      const sub = sched ? safeSubjects.find((s) => s.id === sched.subject_id) : null;
                      const tch = sched ? safeTeachers.find((t) => t.id === sched.teacher_id) : null;

                      return (
                        <td key={day} className="p-2 align-top">
                          {sched ? (
                            <div className="bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-2xl border border-slate-200 text-left space-y-1.5 group relative transition shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-black text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200">
                                  {sub?.code || 'MAPEL'}
                                </span>
                                <button
                                  onClick={() => setScheduleToDelete(sched)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 text-rose-500 rounded-lg transition-all cursor-pointer"
                                  title="Hapus Sesi Jadwal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-xs font-black text-slate-900 leading-tight line-clamp-2">
                                {sub?.short_name || sub?.name}
                              </div>
                              <div className="text-[11px] text-slate-600 font-medium truncate">
                                {tch?.name || 'Ustadz Pengampu'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{sched.room_location || 'Ruang Kelas'}</span>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenAddModal(day, period.id)}
                              className="w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#1F5C45] hover:bg-emerald-50/40 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-[#1F5C45] text-xs font-bold gap-1 cursor-pointer group"
                            >
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px]">Isi Slot</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* List Timetable Display */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">
              Daftar Jadwal Kelas: {currentClassroom?.name}
            </h3>
            <button
              onClick={() => handleOpenAddModal(activeDays[0] || 'monday')}
              className="px-3.5 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jadwal</span>
            </button>
          </div>
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Hari Belajar</th>
                <th className="p-3.5">Jam / JP</th>
                <th className="p-3.5">Mata Pelajaran</th>
                <th className="p-3.5">Guru Pengampu</th>
                <th className="p-3.5">Lokasi Ruangan</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredSchedules.map((s) => {
                const sub = safeSubjects.find((sub) => sub.id === s.subject_id);
                const tch = safeTeachers.find((t) => t.id === s.teacher_id);
                const period = safeLessonPeriods.find((lp) => lp.id === s.lesson_period_id);
                return (
                  <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3.5 font-black text-[#1F5C45] uppercase">
                      <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                        {AcademicScheduleService.getDayLabel(s.day_of_week)}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-900 font-bold">
                      {period?.name} ({period?.start_time}–{period?.end_time})
                    </td>
                    <td className="p-3.5 font-black text-slate-900">
                      <div>{sub?.name}</div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {sub?.code}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{tch?.name || 'Ustadz Pengampu'}</td>
                    <td className="p-3.5 font-mono text-slate-500">{s.room_location || 'Ruang Kelas'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setScheduleToDelete(s)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer border border-rose-200"
                        title="Hapus Sesi Jadwal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Belum ada jadwal KBM yang diatur untuk kelas ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PENGATURAN HARI BELAJAR KBM                                        */}
      {/* ========================================================================= */}
      {showDaysConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1F5C45]" />
                  Pengaturan Hari Belajar KBM Aktif
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan hari-hari dalam sepekan yang dipakai untuk KBM dan jadwal pelajaran.
                </p>
              </div>
              <button
                onClick={() => setShowDaysConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold">Preset Cepat:</span>
              <button
                onClick={() => setActiveDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Senin - Sabtu (Standard)
              </button>
              <button
                onClick={() => setActiveDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Senin - Jum'at (5 Hari)
              </button>
              <button
                onClick={() => setActiveDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Semua Hari (7 Hari)
              </button>
            </div>

            {/* Day Checkbox List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {allAvailableDays.map((d) => {
                const isChecked = activeDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleToggleDay(d.key)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="text-xs">{d.label}</span>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                        isChecked ? 'bg-[#1F5C45] text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowDaysConfigModal(false);
                  onShowToast(`Hari belajar KBM diperbarui (${activeDays.length} hari aktif).`, 'success');
                }}
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Simpan Hari Belajar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PENGATURAN JAM PELAJARAN (JP) & WAKTU BELAJAR                      */}
      {/* ========================================================================= */}
      {showPeriodsConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-700" />
                  Pengaturan Jam Pelajaran (JP) & Waktu
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur daftar jam pelajaran harian, durasi waktu mulai/selesai, serta slot istirahat.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPeriodsConfigModal(false);
                  setPeriodToEdit(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add / Edit Form */}
            <form onSubmit={handleSavePeriodForm} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {periodToEdit ? 'Ubah Jam Pelajaran' : '+ Tambah Jam Pelajaran Baru'}
                </span>
                {periodToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodToEdit(null);
                      const nextNum = safeLessonPeriods.length + 1;
                      setPeriodFormData({
                        code: `JP-${nextNum.toString().padStart(2, '0')}`,
                        name: `JP ${nextNum}`,
                        period_number: nextNum,
                        start_time: '08:00',
                        end_time: '08:45',
                        is_break: false,
                      });
                    }}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                  >
                    Batal Ubah
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Kode JP *</label>
                  <input
                    type="text"
                    value={periodFormData.code}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, code: e.target.value })}
                    placeholder="JP-01"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Nama JP *</label>
                  <input
                    type="text"
                    value={periodFormData.name}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, name: e.target.value })}
                    placeholder="JP 1 / Istirahat"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={periodFormData.start_time}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, start_time: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-center font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={periodFormData.end_time}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, end_time: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-center font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={periodFormData.is_break}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, is_break: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Tandai sebagai Slot Istirahat / Ishoma</span>
                </label>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  {periodToEdit ? 'Perbarui JP' : 'Tambahkan JP'}
                </button>
              </div>
            </form>

            {/* List Existing Periods */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">
                Daftar Jam Pelajaran Terdaftar ({safeLessonPeriods.length})
              </span>
              {safeLessonPeriods.map((lp, idx) => (
                <div
                  key={lp.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                    lp.is_break
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400 w-5">{idx + 1}.</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{lp.name}</span>
                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                          {lp.code}
                        </span>
                        {lp.is_break && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase border border-amber-200">
                            ☕ Istirahat
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {lp.start_time} - {lp.end_time} WIB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPeriod(lp)}
                      className="p-1.5 bg-white hover:bg-sky-50 text-sky-700 rounded-lg border border-slate-200 transition cursor-pointer"
                      title="Ubah Jam"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteLessonPeriod && (
                      <button
                        type="button"
                        onClick={() => onDeleteLessonPeriod(lp.id)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 transition cursor-pointer"
                        title="Hapus JP"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowPeriodsConfigModal(false);
                  setPeriodToEdit(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH JADWAL KBM DENGAN VALIDASI BENTROK                           */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleValidateAndSave} className="bg-white p-6 rounded-3xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Tambah Jadwal KBM</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kelas {currentClassroom?.name} &bull; Validasi bentrok otomatis</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflictError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-rose-700 font-black">Terdeteksi Bentrok Jadwal!</strong>
                  <span className="mt-0.5 block leading-relaxed">{conflictError.message}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Hari Belajar</label>
              <select
                value={modalDay}
                onChange={(e: any) => setModalDay(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {activeDays.map((d) => (
                  <option key={d} value={d}>{AcademicScheduleService.getDayLabel(d)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Jam Pelajaran (JP)</label>
              <select
                value={modalPeriodId}
                onChange={(e) => setModalPeriodId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {activePeriods.filter((lp) => !lp.is_break).map((lp) => (
                  <option key={lp.id} value={lp.id}>
                    {lp.name} ({lp.start_time}–{lp.end_time})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
              <select
                value={modalSubjectId}
                onChange={(e) => setModalSubjectId(Number(e.target.value))}
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
                value={modalTeacherId}
                onChange={(e) => setModalTeacherId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {safeTeachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Lokasi Ruangan</label>
              <input
                type="text"
                placeholder="contoh: Gedung Umar R.101 / Laboratorium"
                value={modalRoomLocation}
                onChange={(e) => setModalRoomLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Simpan Jadwal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS JADWAL                                            */}
      {/* ========================================================================= */}
      {scheduleToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-black text-rose-700 tracking-tight">Hapus Sesi Jadwal KBM?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus jadwal <strong>{safeSubjects.find((s) => s.id === scheduleToDelete.subject_id)?.name}</strong> pada hari <strong>{AcademicScheduleService.getDayLabel(scheduleToDelete.day_of_week)}</strong>?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 text-xs"
              >
                Ya, Hapus Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


