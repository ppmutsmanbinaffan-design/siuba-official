import React, { useState } from 'react';
import { 
  GraduationCap, 
  Home, 
  Users, 
  Building, 
  Plus, 
  Search, 
  Award, 
  UserCheck, 
  Bed, 
  ShieldCheck,
  Layers,
  MapPin,
  Calendar
} from 'lucide-react';
import { Classroom, Dormitory, DormitoryRoom, Student } from '../types';

interface Props {
  mode?: 'classrooms' | 'dormitories';
  classrooms?: Classroom[];
  dormitories?: Dormitory[];
  dormitoryRooms?: DormitoryRoom[];
  students?: Student[];
  onAddClassroom?: (classroom: Partial<Classroom>) => void;
  onUpdateClassroom?: (classroomId: number, classroom: Partial<Classroom>) => void;
  onDeleteClassroom?: (classroomId: number) => void;
  onAddDormitory?: (dormitory: Partial<Dormitory>) => void;
  onUpdateDormitory?: (dormitoryId: number, dormitory: Partial<Dormitory>) => void;
  onDeleteDormitory?: (dormitoryId: number) => void;
  onAddDormitoryRoom?: (room: Partial<DormitoryRoom>) => void;
  onUpdateDormitoryRoom?: (roomId: number, room: Partial<DormitoryRoom>) => void;
  onDeleteDormitoryRoom?: (roomId: number) => void;
}

export const ClassroomsDormitoriesView: React.FC<Props> = ({
  mode = 'classrooms',
  classrooms = [],
  dormitories = [],
  dormitoryRooms = [],
  students = [],
  onAddClassroom,
  onUpdateClassroom,
  onDeleteClassroom,
  onAddDormitory,
  onUpdateDormitory,
  onDeleteDormitory,
  onAddDormitoryRoom,
  onUpdateDormitoryRoom,
  onDeleteDormitoryRoom,
}) => {
  const safeClassrooms = classrooms || [];
  const safeDormitories = dormitories || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeStudents = students || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterGender, setFilterGender] = useState('all');

  // Modal States for Classrooms CRUD
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);
  const [deletingClass, setDeletingClass] = useState<Classroom | null>(null);

  // Form inputs for Classrooms
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState<number>(7);
  const [formAcademicYear, setFormAcademicYear] = useState('2025/2026');
  const [formTeacher, setFormTeacher] = useState('');
  const [formCapacity, setFormCapacity] = useState<number>(30);

  // Modal States for Dormitories CRUD
  const [showAddDormModal, setShowAddDormModal] = useState(false);
  const [showEditDormModal, setShowEditDormModal] = useState(false);
  const [showDeleteDormModal, setShowDeleteDormModal] = useState(false);
  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
  const [deletingDorm, setDeletingDorm] = useState<Dormitory | null>(null);

  // Form inputs for Dormitory
  const [formDormName, setFormDormName] = useState('');
  const [formDormGender, setFormDormGender] = useState<'L' | 'P'>('L');

  // Modal States for Rooms CRUD
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [targetDormForRoom, setTargetDormForRoom] = useState<Dormitory | null>(null);
  const [editingRoom, setEditingRoom] = useState<DormitoryRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<DormitoryRoom | null>(null);

  // Form inputs for Room
  const [formRoomDormId, setFormRoomDormId] = useState<number>(1);
  const [formRoomName, setFormRoomName] = useState('');
  const [formRoomSupervisor, setFormRoomSupervisor] = useState('');
  const [formRoomCapacity, setFormRoomCapacity] = useState<number>(8);

  // -------------------------------------------------------------
  // Classrooms Handlers
  // -------------------------------------------------------------
  const handleOpenEdit = (c: Classroom) => {
    setEditingClass(c);
    setFormName(c.name);
    setFormGrade(c.grade_level);
    setFormAcademicYear(c.academic_year || '2025/2026');
    setFormTeacher(c.homeroom_teacher || '');
    setFormCapacity(c.capacity || 30);
    setShowEditModal(true);
  };

  const handleOpenDelete = (c: Classroom) => {
    setDeletingClass(c);
    setShowDeleteModal(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (onAddClassroom) {
      onAddClassroom({
        code: `CLS-${formGrade}-${formName.trim().toUpperCase()}`,
        name: formName.trim(),
        grade_level: Number(formGrade),
        academic_year: formAcademicYear.trim() || '2025/2026',
        homeroom_teacher: formTeacher.trim() || 'Ustadz Pengampu',
        capacity: Number(formCapacity) || 30,
        student_count: 0,
        is_active: true,
      });
    }

    setShowAddModal(false);
    setFormName('');
    setFormTeacher('');
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !formName.trim()) return;

    if (onUpdateClassroom) {
      onUpdateClassroom(editingClass.id, {
        name: formName.trim(),
        grade_level: Number(formGrade),
        academic_year: formAcademicYear.trim() || '2025/2026',
        homeroom_teacher: formTeacher.trim() || 'Ustadz Pengampu',
        capacity: Number(formCapacity) || 30,
      });
    }

    setShowEditModal(false);
    setEditingClass(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingClass) return;
    if (onDeleteClassroom) {
      onDeleteClassroom(deletingClass.id);
    }
    setShowDeleteModal(false);
    setDeletingClass(null);
  };

  // -------------------------------------------------------------
  // Dormitory Handlers
  // -------------------------------------------------------------
  const handleOpenEditDorm = (d: Dormitory) => {
    setEditingDorm(d);
    setFormDormName(d.name);
    setFormDormGender(d.gender === 'P' || d.gender === 'female' ? 'P' : 'L');
    setShowEditDormModal(true);
  };

  const handleOpenDeleteDorm = (d: Dormitory) => {
    setDeletingDorm(d);
    setShowDeleteDormModal(true);
  };

  const handleSubmitAddDorm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDormName.trim()) return;

    if (onAddDormitory) {
      onAddDormitory({
        name: formDormName.trim(),
        gender: formDormGender,
        is_active: true,
      });
    }

    setShowAddDormModal(false);
    setFormDormName('');
  };

  const handleSubmitEditDorm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDorm || !formDormName.trim()) return;

    if (onUpdateDormitory) {
      onUpdateDormitory(editingDorm.id, {
        name: formDormName.trim(),
        gender: formDormGender,
      });
    }

    setShowEditDormModal(false);
    setEditingDorm(null);
  };

  const handleConfirmDeleteDorm = () => {
    if (!deletingDorm) return;
    if (onDeleteDormitory) {
      onDeleteDormitory(deletingDorm.id);
    }
    setShowDeleteDormModal(false);
    setDeletingDorm(null);
  };

  // -------------------------------------------------------------
  // Room Handlers
  // -------------------------------------------------------------
  const handleOpenAddRoom = (d: Dormitory) => {
    setTargetDormForRoom(d);
    setFormRoomDormId(d.id);
    setFormRoomName('');
    setFormRoomSupervisor('');
    setFormRoomCapacity(8);
    setShowAddRoomModal(true);
  };

  const handleOpenEditRoom = (r: DormitoryRoom) => {
    setEditingRoom(r);
    setFormRoomDormId(r.dormitory_id);
    setFormRoomName(r.name);
    setFormRoomSupervisor(r.supervisor || '');
    setFormRoomCapacity(r.capacity || 8);
    setShowEditRoomModal(true);
  };

  const handleOpenDeleteRoom = (r: DormitoryRoom) => {
    setDeletingRoom(r);
    setShowDeleteRoomModal(true);
  };

  const handleSubmitAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomName.trim()) return;

    if (onAddDormitoryRoom) {
      onAddDormitoryRoom({
        dormitory_id: formRoomDormId,
        dormitory_name: targetDormForRoom?.name || 'Asrama',
        name: formRoomName.trim(),
        capacity: Number(formRoomCapacity) || 8,
        supervisor: formRoomSupervisor.trim() || 'Ustadz Pembina',
        is_active: true,
      });
    }

    setShowAddRoomModal(false);
    setFormRoomName('');
    setFormRoomSupervisor('');
    setTargetDormForRoom(null);
  };

  const handleSubmitEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !formRoomName.trim()) return;

    if (onUpdateDormitoryRoom) {
      onUpdateDormitoryRoom(editingRoom.id, {
        dormitory_id: formRoomDormId,
        name: formRoomName.trim(),
        capacity: Number(formRoomCapacity) || 8,
        supervisor: formRoomSupervisor.trim() || 'Ustadz Pembina',
      });
    }

    setShowEditRoomModal(false);
    setEditingRoom(null);
  };

  const handleConfirmDeleteRoom = () => {
    if (!deletingRoom) return;
    if (onDeleteDormitoryRoom) {
      onDeleteDormitoryRoom(deletingRoom.id);
    }
    setShowDeleteRoomModal(false);
    setDeletingRoom(null);
  };

  // Calculations for Kelas KPI Metrics
  const totalClassrooms = safeClassrooms.length;
  const totalStudentsInClass = safeStudents.filter((s) => s && s.classroom_id).length;
  const gradeLevels = Array.from(new Set(safeClassrooms.map((c) => c.grade_level))).filter(Boolean);
  const avgStudentsPerClass = totalClassrooms > 0 ? Math.round(totalStudentsInClass / totalClassrooms) : 0;

  // Calculations for Asrama KPI Metrics
  const totalDormitories = safeDormitories.length;
  const totalRooms = safeDormitoryRooms.length;
  const totalCapacity = safeDormitoryRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalStudentsInDorm = safeStudents.filter((s) => s && s.dormitory_room_id).length;

  // Filtered Classrooms
  const filteredClassrooms = safeClassrooms.filter((c) => {
    if (!c) return false;
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.homeroom_teacher || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === 'all' || String(c.grade_level) === filterGrade;
    return matchesSearch && matchesGrade;
  });

  // Filtered Dormitories
  const filteredDormitories = safeDormitories.filter((d) => {
    if (!d) return false;
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isMale = d.gender === 'L' || d.gender === 'male';
    const matchesGender = filterGender === 'all' || (filterGender === 'L' ? isMale : !isMale);
    return matchesSearch && matchesGender;
  });

  return (
    <div id={mode === 'classrooms' ? 'classrooms-view' : 'dormitories-view'} className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* MODE 1: KELAS & TINGKAT                                                   */}
      {/* ========================================================================= */}
      {mode === 'classrooms' && (
        <>
          {/* SIUBA Emerald Header Card */}
          <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                    <Award className="w-3 h-3 text-[#C9A227]" />
                    SIUBA v1.1.3 PRODUCTION
                  </span>
                  <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                    Master Data Akademik
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Manajemen Kelas & Tingkat Formal
                </h1>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                  Tambah kelas baru, ubah wali kelas dan tingkat jenjang, atau hapus rombongan belajar madrasah/sekolah.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                <button
                  onClick={() => {
                    setFormName('');
                    setFormGrade(7);
                    setFormAcademicYear('2025/2026');
                    setFormTeacher('');
                    setFormCapacity(30);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 text-[#1F5C45]" />
                  <span>Tambah Kelas Baru</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Bento KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Rombel Kelas</div>
                <div className="text-2xl font-black text-slate-900">{totalClassrooms} <span className="text-xs font-semibold text-slate-400">Kelas</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Santri Terdaftar</div>
                <div className="text-2xl font-black text-sky-700">{totalStudentsInClass} <span className="text-xs font-semibold text-slate-400">Santri</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Jenjang Tingkat</div>
                <div className="text-2xl font-black text-indigo-700">{gradeLevels.length} <span className="text-xs font-semibold text-slate-400">Tingkat</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rata-rata Santri</div>
                <div className="text-2xl font-black text-amber-700">{avgStudentsPerClass} <span className="text-xs font-semibold text-slate-400">/ Kelas</span></div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama kelas atau wali kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Tingkat</option>
                {gradeLevels.map((g) => (
                  <option key={String(g)} value={String(g)}>
                    Tingkat {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Classrooms Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClassrooms.map((c) => {
              const count = safeStudents.filter((s) => s && s.classroom_id === c.id).length;
              return (
                <div 
                  key={c.id} 
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:border-emerald-400 hover:shadow-md transition-all group relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Tingkat {c.grade_level}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 font-bold font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        T.A. {c.academic_year || '2025/2026'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-[#1F5C45] transition-colors">
                      Kelas {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kapasitas Maksimal: <strong>{c.capacity || 30} Santri</strong>
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Wali Kelas:</span>
                      <strong className="text-slate-900 font-bold">{c.homeroom_teacher || 'Ustadz Pengampu'}</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Santri Terdaftar:</span>
                      <strong className="text-emerald-700 font-black text-sm">{count} Santri</strong>
                    </p>
                  </div>

                  {/* Action Buttons: Edit & Delete */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Ubah Kelas
                    </button>
                    <button
                      onClick={() => handleOpenDelete(c)}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-rose-200 cursor-pointer"
                      title="Hapus Kelas"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredClassrooms.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Tidak ada kelas yang sesuai dengan pencarian atau filter.
              </div>
            )}
          </div>

          {/* MODAL: TAMBAH KELAS BARU */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Tambah Rombel Kelas Baru</h3>
                  <p className="text-xs text-slate-500 mt-1">Masukkan parameter rombongan belajar kelas dan wali kelas pengampu.</p>
                </div>

                <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Kelas *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: 7-A, 8-B, 10-IPA 1"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tingkat Jenjang *</label>
                      <select
                        value={formGrade}
                        onChange={(e) => setFormGrade(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        <option value={7}>Tingkat 7 (1 MTs/SMP)</option>
                        <option value={8}>Tingkat 8 (2 MTs/SMP)</option>
                        <option value={9}>Tingkat 9 (3 MTs/SMP)</option>
                        <option value={10}>Tingkat 10 (1 MA/SMA)</option>
                        <option value={11}>Tingkat 11 (2 MA/SMA)</option>
                        <option value={12}>Tingkat 12 (3 MA/SMA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                      <input
                        type="text"
                        value={formAcademicYear}
                        onChange={(e) => setFormAcademicYear(e.target.value)}
                        placeholder="2025/2026"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Wali Kelas Pengampu</label>
                    <input
                      type="text"
                      value={formTeacher}
                      onChange={(e) => setFormTeacher(e.target.value)}
                      placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kapasitas Maksimal Santri</label>
                    <input
                      type="number"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(Number(e.target.value))}
                      placeholder="30"
                      min={1}
                      max={100}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Simpan Kelas
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: UBAH KELAS */}
          {showEditModal && editingClass && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Ubah Data Kelas</h3>
                  <p className="text-xs text-slate-500 mt-1">Perbarui nama kelas, tingkat jenjang, dan wali kelas pengampu.</p>
                </div>

                <form onSubmit={handleSubmitEdit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Kelas *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tingkat Jenjang *</label>
                      <select
                        value={formGrade}
                        onChange={(e) => setFormGrade(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        <option value={7}>Tingkat 7</option>
                        <option value={8}>Tingkat 8</option>
                        <option value={9}>Tingkat 9</option>
                        <option value={10}>Tingkat 10</option>
                        <option value={11}>Tingkat 11</option>
                        <option value={12}>Tingkat 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                      <input
                        type="text"
                        value={formAcademicYear}
                        onChange={(e) => setFormAcademicYear(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Wali Kelas Pengampu</label>
                    <input
                      type="text"
                      value={formTeacher}
                      onChange={(e) => setFormTeacher(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kapasitas Maksimal</label>
                    <input
                      type="number"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(Number(e.target.value))}
                      min={1}
                      max={100}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingClass(null);
                      }}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: KONFIRMASI HAPUS KELAS */}
          {showDeleteModal && deletingClass && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-rose-700 tracking-tight">Hapus Rombel Kelas?</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Apakah Anda yakin ingin menghapus <strong>Kelas {deletingClass.name} (Tingkat {deletingClass.grade_level})</strong>?
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800">
                  ⚠️ Santri yang saat ini terdaftar di kelas ini akan dipindahkan ke status belum memiliki rombel kelas.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingClass(null);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    Ya, Hapus Kelas
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ASRAMA & KAMAR                                                    */}
      {/* ========================================================================= */}
      {mode === 'dormitories' && (
        <>
          {/* SIUBA Emerald Header Card */}
          <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                    <Award className="w-3 h-3 text-[#C9A227]" />
                    SIUBA v1.1.3 PRODUCTION
                  </span>
                  <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                    Master Data Asrama & Tempat Tinggal
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Manajemen Asrama & Kamar Santri
                </h1>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                  Kelola struktur gedung asrama, tambah/edit kamar tidur, atur musyrif pembina, dan pantau okupansi santri mukim.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                <button
                  onClick={() => {
                    setFormDormName('');
                    setFormDormGender('L');
                    setShowAddDormModal(true);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 text-[#1F5C45]" />
                  <span>Tambah Gedung Asrama</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Bento KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gedung Asrama</div>
                <div className="text-2xl font-black text-slate-900">{totalDormitories} <span className="text-xs font-semibold text-slate-400">Gedung</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Kamar</div>
                <div className="text-2xl font-black text-sky-700">{totalRooms} <span className="text-xs font-semibold text-slate-400">Kamar</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
                <Bed className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kapasitas Ranjang</div>
                <div className="text-2xl font-black text-indigo-700">{totalCapacity} <span className="text-xs font-semibold text-slate-400">Ranjang</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Santri Terakomodasi</div>
                <div className="text-2xl font-black text-amber-700">{totalStudentsInDorm} <span className="text-xs font-semibold text-slate-400">Santri</span></div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari gedung asrama atau nama kamar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Komplek Asrama</option>
                <option value="L">Khusus Putra (Ikhwan)</option>
                <option value="P">Khusus Putri (Akhwat)</option>
              </select>
            </div>
          </div>

          {/* Dormitories List with Rooms */}
          <div className="space-y-6">
            {filteredDormitories.map((dorm) => {
              const rooms = safeDormitoryRooms.filter((r) => r && r.dormitory_id === dorm.id);
              const isMale = dorm.gender === 'L' || dorm.gender === 'male';

              return (
                <div key={dorm.id} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isMale 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-pink-100 text-pink-800 border border-pink-200'
                        }`}>
                          {isMale ? 'Putra (Ikhwan)' : 'Putri (Akhwat)'}
                        </span>
                        <h3 className="text-lg font-black text-slate-900">{dorm.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Gedung asrama santri mukim Pesantren Utsman Bin Affan
                      </p>
                    </div>

                    {/* Dormitory Level Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <button
                        onClick={() => handleOpenAddRoom(dorm)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Kamar</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditDorm(dorm)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Ubah Gedung
                      </button>
                      <button
                        onClick={() => handleOpenDeleteDorm(dorm)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Grid of Rooms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {rooms.map((room) => {
                      const studentCount = safeStudents.filter((s) => s && s.dormitory_room_id === room.id).length;
                      const capacity = room.capacity || 8;
                      const isFull = studentCount >= capacity;
                      const occupancyPercent = Math.min(100, Math.round((studentCount / capacity) * 100));

                      return (
                        <div 
                          key={room.id} 
                          className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-300 space-y-3 text-xs transition-all group flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <p className="font-black text-slate-900 text-sm group-hover:text-[#1F5C45] transition-colors">{room.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isFull ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isFull ? 'Penuh' : 'Tersedia'}
                              </span>
                            </div>

                            {/* Occupancy Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">Musyrif: <strong className="text-slate-800">{room.supervisor || 'Ustadz Pembina'}</strong></span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Okupansi Santri:</span>
                                <strong className="text-slate-800 font-mono font-bold">{studentCount} / {capacity} Santri</strong>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isFull ? 'bg-rose-500' : occupancyPercent > 75 ? 'bg-amber-500' : 'bg-[#1F5C45]'
                                  }`} 
                                  style={{ width: `${occupancyPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Room Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                            <button
                              onClick={() => handleOpenEditRoom(room)}
                              className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition text-center cursor-pointer"
                            >
                              Ubah Kamar
                            </button>
                            <button
                              onClick={() => handleOpenDeleteRoom(room)}
                              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              title="Hapus Kamar"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {rooms.length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                        <p>Belum ada kamar terdaftar pada gedung asrama ini.</p>
                        <button
                          onClick={() => handleOpenAddRoom(dorm)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                        >
                          + Tambah Kamar Pertama
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredDormitories.length === 0 && (
              <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Tidak ada asrama yang sesuai dengan pencarian atau filter.
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MODAL: TAMBAH GEDUNG ASRAMA                                               */}
          {/* ========================================================================= */}
          {showAddDormModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Tambah Gedung Asrama Baru</h3>
                  <p className="text-xs text-slate-500 mt-1">Masukkan nama gedung asrama dan peruntukan santri mukim.</p>
                </div>

                <form onSubmit={handleSubmitAddDorm} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Gedung Asrama *</label>
                    <input
                      type="text"
                      value={formDormName}
                      onChange={(e) => setFormDormName(e.target.value)}
                      placeholder="Contoh: Gedung Umar Bin Khattab"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Peruntukan Santri *</label>
                    <select
                      value={formDormGender}
                      onChange={(e) => setFormDormGender(e.target.value as 'L' | 'P')}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="L">Khusus Putra (Ikhwan)</option>
                      <option value="P">Khusus Putri (Akhwat)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddDormModal(false)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Simpan Gedung
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: UBAH GEDUNG ASRAMA                                                 */}
          {/* ========================================================================= */}
          {showEditDormModal && editingDorm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Ubah Data Gedung Asrama</h3>
                  <p className="text-xs text-slate-500 mt-1">Perbarui nama gedung asrama dan peruntukan santri.</p>
                </div>

                <form onSubmit={handleSubmitEditDorm} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Gedung Asrama *</label>
                    <input
                      type="text"
                      value={formDormName}
                      onChange={(e) => setFormDormName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Peruntukan Santri *</label>
                    <select
                      value={formDormGender}
                      onChange={(e) => setFormDormGender(e.target.value as 'L' | 'P')}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="L">Khusus Putra (Ikhwan)</option>
                      <option value="P">Khusus Putri (Akhwat)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditDormModal(false);
                        setEditingDorm(null);
                      }}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: KONFIRMASI HAPUS GEDUNG ASRAMA                                     */}
          {/* ========================================================================= */}
          {showDeleteDormModal && deletingDorm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-rose-700 tracking-tight">Hapus Gedung Asrama?</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Apakah Anda yakin ingin menghapus <strong>{deletingDorm.name}</strong>?
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800">
                  ⚠️ Seluruh kamar dan data penempatan santri mukim di gedung ini akan direset.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteDormModal(false);
                      setDeletingDorm(null);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteDorm}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    Ya, Hapus Gedung
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: TAMBAH KAMAR BARU                                                  */}
          {/* ========================================================================= */}
          {showAddRoomModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Tambah Kamar Asrama Baru</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Lokasi: <strong>{targetDormForRoom?.name || 'Gedung Asrama'}</strong>
                  </p>
                </div>

                <form onSubmit={handleSubmitAddRoom} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gedung Asrama *</label>
                    <select
                      value={formRoomDormId}
                      onChange={(e) => setFormRoomDormId(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      {safeDormitories.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.gender === 'L' || d.gender === 'male' ? 'Ikhwan' : 'Akhwat'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama / Nomor Kamar *</label>
                    <input
                      type="text"
                      value={formRoomName}
                      onChange={(e) => setFormRoomName(e.target.value)}
                      placeholder="Contoh: Kamar 101, Kamar A-1"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Musyrif / Pembina Kamar</label>
                    <input
                      type="text"
                      value={formRoomSupervisor}
                      onChange={(e) => setFormRoomSupervisor(e.target.value)}
                      placeholder="Contoh: Ustadz Hilman Faruq"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kapasitas Ranjang Santri</label>
                    <input
                      type="number"
                      value={formRoomCapacity}
                      onChange={(e) => setFormRoomCapacity(Number(e.target.value))}
                      placeholder="8"
                      min={1}
                      max={50}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRoomModal(false);
                        setTargetDormForRoom(null);
                      }}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Simpan Kamar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: UBAH KAMAR                                                         */}
          {/* ========================================================================= */}
          {showEditRoomModal && editingRoom && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Ubah Data Kamar</h3>
                  <p className="text-xs text-slate-500 mt-1">Perbarui nama kamar, gedung, musyrif, dan kapasitas ranjang.</p>
                </div>

                <form onSubmit={handleSubmitEditRoom} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gedung Asrama *</label>
                    <select
                      value={formRoomDormId}
                      onChange={(e) => setFormRoomDormId(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      {safeDormitories.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.gender === 'L' || d.gender === 'male' ? 'Ikhwan' : 'Akhwat'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama / Nomor Kamar *</label>
                    <input
                      type="text"
                      value={formRoomName}
                      onChange={(e) => setFormRoomName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Musyrif / Pembina Kamar</label>
                    <input
                      type="text"
                      value={formRoomSupervisor}
                      onChange={(e) => setFormRoomSupervisor(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kapasitas Ranjang</label>
                    <input
                      type="number"
                      value={formRoomCapacity}
                      onChange={(e) => setFormRoomCapacity(Number(e.target.value))}
                      min={1}
                      max={50}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditRoomModal(false);
                        setEditingRoom(null);
                      }}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: KONFIRMASI HAPUS KAMAR                                             */}
          {/* ========================================================================= */}
          {showDeleteRoomModal && deletingRoom && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-base font-black text-rose-700 tracking-tight">Hapus Kamar Asrama?</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Apakah Anda yakin ingin menghapus <strong>{deletingRoom.name}</strong>?
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800">
                  ⚠️ Santri yang saat ini menempati kamar ini akan dipindahkan ke status belum memiliki kamar asrama.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteRoomModal(false);
                      setDeletingRoom(null);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteRoom}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    Ya, Hapus Kamar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

