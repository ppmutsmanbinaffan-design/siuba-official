import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  QrCode, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Filter,
  GraduationCap,
  Home,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Phone,
  MapPin,
  UserCheck,
  Download,
  IdCard,
  Printer,
  Sparkles,
  Upload
} from 'lucide-react';
import { 
  Classroom, 
  DormitoryRoom, 
  Extracurricular, 
  ExtracurricularMember, 
  Student, 
  StudentClassHistory, 
  StudentGroup, 
  StudentGroupMember, 
  StudentRoomHistory, 
  StudentStatus, 
  User 
} from '../types';
import { StudentIdentityService } from '../services/studentIdentityService';
import { QrCardModal } from './QrCardModal';
import { DataImportModal } from './common/DataImportModal';

interface StudentsViewProps {
  students?: Student[];
  classrooms?: Classroom[];
  dormitoryRooms?: DormitoryRoom[];
  extracurriculars?: Extracurricular[];
  extracurricularMembers?: ExtracurricularMember[];
  studentGroups?: StudentGroup[];
  studentGroupMembers?: StudentGroupMember[];
  classHistories?: StudentClassHistory[];
  roomHistories?: StudentRoomHistory[];
  currentUser?: User;
  onAddStudent: (student: Partial<Student>) => void;
  onUpdateStudent: (studentId: number, student: Partial<Student>) => void;
  onToggleStudentActive: (studentId: number) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
  onNavigateToBulkPrint?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students = [],
  classrooms = [],
  dormitoryRooms = [],
  extracurriculars = [],
  extracurricularMembers = [],
  studentGroups = [],
  studentGroupMembers = [],
  classHistories = [],
  roomHistories = [],
  currentUser = { id: 1, name: 'Ustadz Ahmad Fauzi', username: 'ahmad.fauzi', role: 'admin' },
  onAddStudent,
  onUpdateStudent,
  onToggleStudentActive,
  onShowToast = (_message: string, _type?: 'success' | 'error') => {},
  onNavigateToBulkPrint,
}) => {
  const safeStudents = students || [];
  const safeClassrooms = classrooms || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeExtracurriculars = extracurriculars || [];
  const safeExtracurricularMembers = extracurricularMembers || [];
  const safeStudentGroups = studentGroups || [];
  const safeStudentGroupMembers = studentGroupMembers || [];
  const safeClassHistories = classHistories || [];
  const safeRoomHistories = roomHistories || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedRfidFilter, setSelectedRfidFilter] = useState<'all' | 'with_rfid' | 'without_rfid'>('all');
  const [selectedQrFilter, setSelectedQrFilter] = useState<'all' | 'with_qr' | 'without_qr'>('all');
  const [maskTokens, setMaskTokens] = useState<boolean>(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'profil' | 'akademik' | 'asrama' | 'absensi' | 'kartu'>('profil');
  const [selectedStudentForQrCard, setSelectedStudentForQrCard] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state for Add/Edit
  const [formData, setFormData] = useState<{
    student_number: string;
    nisn: string;
    name: string;
    nickname: string;
    gender: 'male' | 'female';
    birth_place: string;
    birth_date: string;
    classroom_id: number | null;
    dormitory_room_id: number | null;
    generation_year: number;
    entry_year: number;
    rfid_uid: string;
    guardian_name: string;
    guardian_phone: string;
    address: string;
    status: StudentStatus;
    qr_token: string;
  }>({
    student_number: '',
    nisn: '',
    name: '',
    nickname: '',
    gender: 'male',
    birth_place: '',
    birth_date: '',
    classroom_id: safeClassrooms[0]?.id || null,
    dormitory_room_id: safeDormitoryRooms[0]?.id || null,
    generation_year: 2026,
    entry_year: 2026,
    rfid_uid: '',
    guardian_name: '',
    guardian_phone: '',
    address: '',
    status: 'active',
    qr_token: '',
  });

  // Filter logic
  const filteredStudents = useMemo(() => {
    return safeStudents.filter((s) => {
      if (!s) return false;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (s.name || '').toLowerCase().includes(q) ||
        (s.student_number || '').toLowerCase().includes(q) ||
        (s.nisn || '').toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        (s.rfid_uid && s.rfid_uid.toLowerCase().includes(q));

      const matchesClass = selectedClassId === 'all' || s.classroom_id === Number(selectedClassId);
      const matchesRoom = selectedRoomId === 'all' || s.dormitory_room_id === Number(selectedRoomId);
      
      const sGender = s.gender === 'male' || s.gender === 'L' ? 'male' : 'female';
      const matchesGender = selectedGender === 'all' || sGender === selectedGender;

      const sStatus = s.status || (s.is_active ? 'active' : 'inactive');
      const matchesStatus = selectedStatus === 'all' || sStatus === selectedStatus;

      const matchesRfid = 
        selectedRfidFilter === 'all' ? true :
        selectedRfidFilter === 'with_rfid' ? !!s.rfid_uid :
        !s.rfid_uid;

      const matchesQr =
        selectedQrFilter === 'all' ? true :
        selectedQrFilter === 'with_qr' ? !!(s.qr_token && s.qr_token.trim() !== '') :
        !(s.qr_token && s.qr_token.trim() !== '');

      return matchesSearch && matchesClass && matchesRoom && matchesGender && matchesStatus && matchesRfid && matchesQr;
    });
  }, [safeStudents, searchTerm, selectedClassId, selectedRoomId, selectedGender, selectedStatus, selectedRfidFilter, selectedQrFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = safeStudents.length;
    const active = safeStudents.filter((s) => s && s.is_active && (s.status === 'active' || !s.status)).length;
    const withRfid = safeStudents.filter((s) => s && !!s.rfid_uid).length;
    const withQr = safeStudents.filter((s) => s && !!s.qr_token).length;
    const male = safeStudents.filter((s) => s && (s.gender === 'male' || s.gender === 'L')).length;
    const female = safeStudents.filter((s) => s && (s.gender === 'female' || s.gender === 'P')).length;
    const unassignedClass = safeStudents.filter((s) => s && !s.classroom_id).length;
    return { total, active, withRfid, withQr, male, female, unassignedClass };
  }, [safeStudents]);

  const handleBulkGenerateMissingQr = () => {
    const res = StudentIdentityService.generateMissingStudentQrTokens(safeStudents);
    if (res.count === 0) {
      onShowToast('Semua santri sudah memiliki QR Token aktif yang unik.', 'success');
      return;
    }

    res.updatedStudents.forEach((st) => {
      if (st.qr_token) {
        onUpdateStudent(st.id, { qr_token: st.qr_token });
      }
    });

    onShowToast(`Berhasil men-generate ${res.count} QR Token baru untuk santri yang belum memiliki token.`, 'success');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleOpenAdd = () => {
    const existingTokens = students.map((s) => s.qr_token);
    const newQr = StudentIdentityService.generateQrToken(existingTokens);
    setFormData({
      student_number: `UBA2600${(students.length + 1).toString().padStart(2, '0')}`,
      nisn: `00891234${(students.length + 10).toString().padStart(2, '0')}`,
      name: '',
      nickname: '',
      gender: 'male',
      birth_place: 'Surabaya',
      birth_date: '2013-01-01',
      classroom_id: classrooms[0]?.id || null,
      dormitory_room_id: dormitoryRooms[0]?.id || null,
      generation_year: 2026,
      entry_year: 2026,
      rfid_uid: '',
      guardian_name: '',
      guardian_phone: '',
      address: '',
      status: 'active',
      qr_token: newQr,
    });
    setValidationError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    const sGender = student.gender === 'male' || student.gender === 'L' ? 'male' : 'female';
    setFormData({
      student_number: student.student_number,
      nisn: student.nisn,
      name: student.name,
      nickname: student.nickname || '',
      gender: sGender,
      birth_place: student.birth_place || '',
      birth_date: student.birth_date || '',
      classroom_id: student.classroom_id || null,
      dormitory_room_id: student.dormitory_room_id || null,
      generation_year: student.generation_year,
      entry_year: student.entry_year || student.generation_year,
      rfid_uid: student.rfid_uid || '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      address: student.address || '',
      status: student.status || (student.is_active ? 'active' : 'inactive'),
      qr_token: student.qr_token,
    });
    setValidationError(null);
  };

  const handleRegenerateQr = () => {
    const existingTokens = students.map((s) => s.qr_token);
    const newQr = StudentIdentityService.generateQrToken(existingTokens);
    setFormData((prev) => ({ ...prev, qr_token: newQr }));
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate NIS Uniqueness
    const nisVal = StudentIdentityService.validateStudentNumberUnique(formData.student_number, null, students);
    if (!nisVal.valid) {
      setValidationError(nisVal.message || 'NIS tidak valid');
      return;
    }

    // Validate RFID Uniqueness
    if (formData.rfid_uid) {
      const rfidVal = StudentIdentityService.validateRfidUnique(formData.rfid_uid, null, students);
      if (!rfidVal.valid) {
        setValidationError(rfidVal.message || 'RFID UID tidak valid');
        return;
      }
    }

    const cls = classrooms.find((c) => c.id === Number(formData.classroom_id));
    const rm = dormitoryRooms.find((r) => r.id === Number(formData.dormitory_room_id));
    const cleanRfid = StudentIdentityService.normalizeRfid(formData.rfid_uid);

    onAddStudent({
      student_number: formData.student_number.trim(),
      nisn: formData.nisn.trim(),
      name: formData.name.trim(),
      nickname: formData.nickname.trim() || undefined,
      gender: formData.gender,
      birth_place: formData.birth_place.trim() || undefined,
      birth_date: formData.birth_date || undefined,
      classroom_id: formData.classroom_id ? Number(formData.classroom_id) : null,
      classroom_name: cls?.name,
      dormitory_room_id: formData.dormitory_room_id ? Number(formData.dormitory_room_id) : null,
      dormitory_room_name: rm?.name,
      generation_year: Number(formData.generation_year),
      entry_year: Number(formData.entry_year),
      qr_token: formData.qr_token,
      rfid_uid: cleanRfid,
      guardian_name: formData.guardian_name.trim() || undefined,
      guardian_phone: formData.guardian_phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      status: formData.status,
      is_active: formData.status === 'active',
    });

    setShowAddModal(false);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    setValidationError(null);

    // Validate NIS Uniqueness
    const nisVal = StudentIdentityService.validateStudentNumberUnique(formData.student_number, studentToEdit.id, students);
    if (!nisVal.valid) {
      setValidationError(nisVal.message || 'NIS tidak valid');
      return;
    }

    // Validate RFID Uniqueness
    if (formData.rfid_uid) {
      const rfidVal = StudentIdentityService.validateRfidUnique(formData.rfid_uid, studentToEdit.id, students);
      if (!rfidVal.valid) {
        setValidationError(rfidVal.message || 'RFID UID tidak valid');
        return;
      }
    }

    const cls = classrooms.find((c) => c.id === Number(formData.classroom_id));
    const rm = dormitoryRooms.find((r) => r.id === Number(formData.dormitory_room_id));
    const cleanRfid = StudentIdentityService.normalizeRfid(formData.rfid_uid);

    onUpdateStudent(studentToEdit.id, {
      student_number: formData.student_number.trim(),
      nisn: formData.nisn.trim(),
      name: formData.name.trim(),
      nickname: formData.nickname.trim() || undefined,
      gender: formData.gender,
      birth_place: formData.birth_place.trim() || undefined,
      birth_date: formData.birth_date || undefined,
      classroom_id: formData.classroom_id ? Number(formData.classroom_id) : null,
      classroom_name: cls?.name || undefined,
      dormitory_room_id: formData.dormitory_room_id ? Number(formData.dormitory_room_id) : null,
      dormitory_room_name: rm?.name || undefined,
      generation_year: Number(formData.generation_year),
      entry_year: Number(formData.entry_year),
      qr_token: formData.qr_token,
      rfid_uid: cleanRfid,
      guardian_name: formData.guardian_name.trim() || undefined,
      guardian_phone: formData.guardian_phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      status: formData.status,
      is_active: formData.status === 'active',
    });

    setStudentToEdit(null);
  };

  const exportCsv = () => {
    const headers = ['No', 'NIS', 'NISN', 'Nama Santri', 'Panggilan', 'Gender', 'Kelas', 'Kamar', 'Status', 'QR Token', 'RFID UID', 'Wali', 'No Telp'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.student_number,
      s.nisn,
      `"${s.name}"`,
      `"${s.nickname || ''}"`,
      s.gender === 'male' || s.gender === 'L' ? 'L' : 'P',
      `"${s.classroom_name || '-'}"`,
      `"${s.dormitory_room_name || '-'}"`,
      s.status || (s.is_active ? 'active' : 'inactive'),
      s.qr_token,
      s.rfid_uid || '-',
      `"${s.guardian_name || '-'}"`,
      `"${s.guardian_phone || '-'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SIUBA_Master_Santri_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="students-view-container" className="space-y-6">
      {/* Top Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#2F7D5A] bg-[#1F5C45]/20 px-2.5 py-0.5 rounded-full border border-[#1F5C45]/40">
              Database Santri &bull; Sprint 2
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-slate-300">
              {stats.total} Total Santri
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Master Data Santri & Identitas Digital</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen identitas santri, penugasan RFID/QR Token unik, riwayat kelas & asrama, serta status santri.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {onNavigateToBulkPrint && (
            <button
              onClick={onNavigateToBulkPrint}
              className="px-3.5 py-2 bg-[#1F5C45]/20 hover:bg-[#1F5C45]/30 text-emerald-300 text-xs font-bold rounded-2xl border border-[#1F5C45]/40 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Buka Halaman Cetak Massal Kartu & Stiker QR"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Cetak Massal QR
            </button>
          )}

          <button
            onClick={handleBulkGenerateMissingQr}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-emerald-300 text-xs font-bold rounded-2xl border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generate QR token baru untuk semua santri yang belum memiliki token"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Generate Missing QR ({students.filter((s) => !s.qr_token).length})
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold rounded-2xl border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Import data santri masal dari file CSV/Excel"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Import Santri
          </button>

          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-white text-xs font-bold rounded-2xl border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export CSV data santri terfilter"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            id="btn-add-student-modal"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Tambah Santri Baru
          </button>
        </div>
      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Santri</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Terdaftar di DB</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Santri Aktif</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Status aktif absensi</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Santri Cuti / Non</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.total - stats.active}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Cuti / Pindah / Lulus</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">RFID Terdaftar</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">{stats.withRfid}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{Math.round((stats.withRfid / (stats.total || 1)) * 100)}% kepemilikan kartu</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">QR Code Siap</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{stats.withQr}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{Math.round((stats.withQr / (stats.total || 1)) * 100)}% token unik</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Santriwati (P)</p>
          <p className="text-2xl font-black text-pink-300 mt-1">{stats.female}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Asrama Putri</p>
        </div>
      </div>

      {/* Filter Bento Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="relative sm:col-span-3 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari santri, NIS, NISN, atau RFID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#1F5C45] placeholder:text-zinc-500"
            />
          </div>

          {/* Class Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1F5C45]"
            >
              <option value="all">Semua Kelas</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1F5C45]"
            >
              <option value="all">Semua Kamar</option>
              {dormitoryRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1F5C45]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="leave">Cuti</option>
              <option value="transferred">Pindah</option>
              <option value="graduated">Lulus</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>

          {/* QR Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedQrFilter}
              onChange={(e) => setSelectedQrFilter(e.target.value as any)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1F5C45]"
            >
              <option value="all">Semua QR</option>
              <option value="with_qr">Ada QR Token</option>
              <option value="without_qr">Belum Ada QR</option>
            </select>
          </div>

          {/* RFID Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedRfidFilter}
              onChange={(e) => setSelectedRfidFilter(e.target.value as any)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1F5C45]"
            >
              <option value="all">Semua RFID</option>
              <option value="with_rfid">Ada RFID</option>
              <option value="without_rfid">Belum Ada RFID</option>
            </select>
          </div>

          {/* Mask Token Toggle */}
          <div className="sm:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => setMaskTokens(!maskTokens)}
              className={`p-2 rounded-2xl border text-xs flex items-center justify-center transition-all cursor-pointer ${
                maskTokens 
                  ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-white' 
                  : 'bg-[#1F5C45]/20 border-[#1F5C45]/40 text-[#2F7D5A]'
              }`}
              title={maskTokens ? 'Tampilkan QR Token Lengkap' : 'Sensor / Masking QR Token'}
            >
              {maskTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Active Filter Badges */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex-wrap">
          <span className="font-semibold text-zinc-500">Filter Aktif:</span>
          <span className="px-2 py-0.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
            Menampilkan <strong className="text-emerald-400">{filteredStudents.length}</strong> dari {students.length} santri
          </span>
          {selectedClassId !== 'all' && (
            <span className="px-2 py-0.5 bg-[#1F5C45]/20 text-[#2F7D5A] rounded-lg border border-[#1F5C45]/40">
              Kelas: {classrooms.find((c) => c.id === Number(selectedClassId))?.name}
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="px-2 py-0.5 bg-cyan-400/10 text-cyan-300 rounded-lg border border-cyan-400/20">
              Status: {selectedStatus.toUpperCase()}
            </span>
          )}
          {selectedRfidFilter !== 'all' && (
            <span className="px-2 py-0.5 bg-purple-400/10 text-purple-300 rounded-lg border border-purple-400/20">
              {selectedRfidFilter === 'with_rfid' ? 'Dengan Kartu RFID' : 'Tanpa Kartu RFID'}
            </span>
          )}
        </div>
      </div>

      {/* Students Data Display: Desktop Table + Mobile Cards */}
      {/* 1. Desktop Table (Hidden on Mobile) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-5 py-3.5">No</th>
                <th className="px-5 py-3.5">Santri & NIS</th>
                <th className="px-5 py-3.5">Kelas & Kamar</th>
                <th className="px-5 py-3.5">QR Token Unik</th>
                <th className="px-5 py-3.5">RFID UID</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <p className="font-bold text-slate-500">Tidak ada santri yang sesuai kriteria filter.</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Coba ubah kata kunci pencarian atau reset filter.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const sStatus = student.status || (student.is_active ? 'active' : 'inactive');
                  const sGender = student.gender === 'male' || student.gender === 'L' ? 'male' : 'female';
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black border ${
                            sGender === 'male' 
                              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50' 
                              : 'bg-pink-950/60 text-pink-300 border-pink-700/50'
                          }`}>
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{student.name}</p>
                              {student.nickname && (
                                <span className="text-[10px] text-slate-500 font-normal">({student.nickname})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>NIS: {student.student_number}</span>
                              <span>&bull;</span>
                              <span>NISN: {student.nisn}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{student.classroom_name || <span className="text-zinc-500 italic">Belum diset</span>}</p>
                        <p className="text-[11px] text-slate-500">{student.dormitory_room_name || <span className="text-zinc-500 italic">Non-Asrama</span>}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-emerald-400 bg-[#1F5C45]/20 px-2.5 py-1 rounded-xl border border-[#1F5C45]/40">
                            {student.qr_token ? (
                              maskTokens ? `${student.qr_token.slice(0, 5)}•••••` : student.qr_token
                            ) : (
                              <span className="text-zinc-500 italic">Belum Ada</span>
                            )}
                          </span>
                          {student.qr_token && (
                            <button
                              onClick={() => handleCopy(student.qr_token)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                              title="Salin QR Token"
                            >
                              {copiedToken === student.qr_token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {student.rfid_uid ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-xl border border-cyan-800/40">
                              {student.rfid_uid}
                            </span>
                            <button
                              onClick={() => handleCopy(student.rfid_uid!)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                              title="Salin RFID UID"
                            >
                              {copiedToken === student.rfid_uid ? (
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                            Belum Ada RFID
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => onToggleStudentActive(student.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all min-h-[32px] cursor-pointer ${
                            sStatus === 'active'
                              ? 'bg-[#1F5C45]/20 text-emerald-400 border-[#1F5C45]/40 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400/30'
                              : sStatus === 'leave'
                              ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                              : sStatus === 'transferred'
                              ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                              : 'bg-rose-400/10 text-rose-400 border-rose-400/30 hover:bg-[#1F5C45]/20 hover:text-emerald-400 hover:border-[#1F5C45]/40'
                          }`}
                          title="Klik untuk toggle status santri"
                        >
                          {sStatus.toUpperCase()}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedStudentForQrCard(student)}
                            className="p-2 bg-[#1F5C45]/20 hover:bg-[#1F5C45]/30 text-emerald-400 hover:text-emerald-200 rounded-xl border border-[#1F5C45]/40 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Cetak / Preview Kartu QR Santri"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudentForDetail(student);
                              setDetailActiveTab('profil');
                            }}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-slate-700 hover:text-white rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                            title="Lihat Profil & Detail Santri"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-2 bg-zinc-800 hover:bg-[#1F5C45] text-slate-700 hover:text-white rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                            title="Edit Data Santri"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile Card List (Visible only on mobile screens < 768px) */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-zinc-500 shadow-xl">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="font-bold text-slate-500">Tidak ada santri yang sesuai kriteria filter.</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Coba ubah kata kunci pencarian atau reset filter.</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const sStatus = student.status || (student.is_active ? 'active' : 'inactive');
            const sGender = student.gender === 'male' || student.gender === 'L' ? 'male' : 'female';

            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xl space-y-3.5"
              >
                {/* Header: Avatar, Name, Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black border flex-shrink-0 ${
                      sGender === 'male'
                        ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50'
                        : 'bg-pink-950/60 text-pink-300 border-pink-700/50'
                    }`}>
                      {student.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-sm text-slate-900">{student.name}</h4>
                        {student.nickname && (
                          <span className="text-[10px] text-slate-500 font-normal">({student.nickname})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>NIS: {student.student_number}</span>
                        <span>&bull;</span>
                        <span>NISN: {student.nisn}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleStudentActive(student.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all min-h-[32px] flex items-center cursor-pointer ${
                      sStatus === 'active'
                        ? 'bg-[#1F5C45]/20 text-emerald-400 border-[#1F5C45]/40'
                        : sStatus === 'leave'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                        : sStatus === 'transferred'
                        ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                        : 'bg-rose-400/10 text-rose-400 border-rose-400/30'
                    }`}
                  >
                    {sStatus.toUpperCase()}
                  </button>
                </div>

                {/* Class & Dormitory Tags */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Kelas</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {student.classroom_name || 'Belum diset'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Kamar Asrama</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {student.dormitory_room_name || 'Non-Asrama'}
                    </span>
                  </div>
                </div>

                {/* Identity Tokens: QR & RFID */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-mono">
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-700">
                      {student.qr_token ? (maskTokens ? `${student.qr_token.slice(0, 5)}•••` : student.qr_token) : 'Tanpa QR'}
                    </span>
                  </div>

                  {student.rfid_uid && (
                    <div className="flex items-center gap-1 bg-cyan-950/40 px-2.5 py-1.5 rounded-xl border border-cyan-800/40 text-[11px] font-mono text-cyan-300">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{student.rfid_uid}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons (Min 44px touch targets) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setSelectedStudentForDetail(student);
                      setDetailActiveTab('profil');
                    }}
                    className="py-2.5 px-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>Detail</span>
                  </button>

                  <button
                    onClick={() => setSelectedStudentForQrCard(student)}
                    className="py-2.5 px-3 rounded-2xl bg-[#1F5C45]/20 hover:bg-[#1F5C45]/30 border border-[#1F5C45]/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    <IdCard className="w-4 h-4 text-emerald-400" />
                    <span>Kartu</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(student)}
                    className="py-2.5 px-3 rounded-2xl bg-zinc-800 hover:bg-[#1F5C45] text-slate-800 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-slate-500" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Student Profile / Detail Modal (5 Tabs: Profil, Akademik, Asrama, Absensi, Kartu Santri) */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1F5C45] text-white font-bold flex items-center justify-center text-base shadow-xs">
                  {selectedStudentForDetail.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedStudentForDetail.name}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-[#2F7D5A] border border-slate-300">
                      {selectedStudentForDetail.status?.toUpperCase() || 'AKTIF'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    NIS: {selectedStudentForDetail.student_number} &bull; NISN: {selectedStudentForDetail.nisn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white rounded-xl hover:bg-slate-100 min-h-[44px] min-w-[44px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 5 Tab Navigation Buttons (Mobile-friendly touch targets) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
              {[
                { id: 'profil', label: 'Profil', icon: Users },
                { id: 'akademik', label: 'Akademik', icon: GraduationCap },
                { id: 'asrama', label: 'Asrama', icon: Home },
                { id: 'absensi', label: 'Absensi', icon: CheckCircle2 },
                { id: 'kartu', label: 'Kartu Santri', icon: IdCard },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                    detailActiveTab === tab.id
                      ? 'bg-[#1F5C45] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: PROFIL */}
            {detailActiveTab === 'profil' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Nama Lengkap & Panggilan</p>
                    <p className="font-black text-sm text-slate-900">{selectedStudentForDetail.name}</p>
                    {selectedStudentForDetail.nickname && (
                      <p className="text-xs text-slate-500">Panggilan: {selectedStudentForDetail.nickname}</p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Jenis Kelamin</p>
                    <p className="font-bold text-xs text-slate-800">
                      {selectedStudentForDetail.gender === 'male' || selectedStudentForDetail.gender === 'L' ? 'Santriwan (Laki-laki)' : 'Santriwati (Perempuan)'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Tempat, Tanggal Lahir</p>
                    <p className="font-semibold text-xs text-slate-800">
                      {selectedStudentForDetail.birth_place || '-'}, {selectedStudentForDetail.birth_date || '-'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Angkatan & Tahun Masuk</p>
                    <p className="font-semibold text-xs text-slate-800">
                      Angkatan {selectedStudentForDetail.generation_year || '-'} &bull; Masuk {selectedStudentForDetail.entry_year || '-'}
                    </p>
                  </div>
                </div>

                {/* Wali & Domisili */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <p className="font-bold text-slate-700">Informasi Wali & Kontak</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Nama Wali:</span>
                      <span className="font-semibold text-slate-800">{selectedStudentForDetail.guardian_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">No. Telepon / WA:</span>
                      <span className="font-semibold text-slate-800">{selectedStudentForDetail.guardian_phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Alamat Domisili:</span>
                      <span className="font-semibold text-slate-800">{selectedStudentForDetail.address || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: AKADEMIK */}
            {detailActiveTab === 'akademik' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Kelas Saat Ini</p>
                      <p className="text-base font-bold text-emerald-400">{selectedStudentForDetail.classroom_name || 'Belum Ditentukan'}</p>
                    </div>
                    <GraduationCap className="w-8 h-8 text-[#1F5C45]/40" />
                  </div>
                </div>

                {/* Ekstrakurikuler */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Ekstrakurikuler Terdaftar
                  </div>
                  {extracurricularMembers.filter((m) => m.student_id === selectedStudentForDetail.id && m.is_active).length > 0 ? (
                    <div className="space-y-1.5">
                      {extracurricularMembers
                        .filter((m) => m.student_id === selectedStudentForDetail.id && m.is_active)
                        .map((m) => {
                          const ekskul = extracurriculars.find((e) => e.id === m.extracurricular_id);
                          return (
                            <div key={m.id} className="text-[11px] bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{ekskul?.name || `Ekskul ID ${m.extracurricular_id}`}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">Sejak {m.joined_at}</span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic">Belum terdaftar di ekstrakurikuler manapun.</p>
                  )}
                </div>

                {/* Kelompok Santri */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    Kelompok & Kepengurusan Khusus
                  </div>
                  {studentGroupMembers.filter((m) => m.student_id === selectedStudentForDetail.id).length > 0 ? (
                    <div className="space-y-1.5">
                      {studentGroupMembers
                        .filter((m) => m.student_id === selectedStudentForDetail.id)
                        .map((m) => {
                          const grp = studentGroups.find((g) => g.id === m.student_group_id);
                          return (
                            <div key={m.id} className="text-[11px] bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{grp?.name || `Kelompok ID ${m.student_group_id}`}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{m.joined_at}</span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic">Tidak ada penugasan kelompok khusus.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ASRAMA */}
            {detailActiveTab === 'asrama' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Kamar Asrama</p>
                      <p className="text-base font-black text-white">{selectedStudentForDetail.dormitory_room_name || 'Non-Asrama / Pulang Pergi'}</p>
                    </div>
                    <Home className="w-8 h-8 text-[#1F5C45]/40" />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Riwayat Penempatan Kamar</p>
                  {safeRoomHistories.filter(r => r.student_id === selectedStudentForDetail.id).length > 0 ? (
                    <div className="space-y-2">
                      {safeRoomHistories.filter(r => r.student_id === selectedStudentForDetail.id).map((rh) => (
                        <div key={rh.id} className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex justify-between text-[11px]">
                          <span className="text-slate-800 font-semibold">{rh.room_name}</span>
                          <span className="text-zinc-500 font-mono">{rh.academic_year || 'Tahun Ajaran Aktif'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic">Belum ada riwayat rotasi kamar.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: ABSENSI */}
            {detailActiveTab === 'absensi' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#1F5C45]/20 border border-[#1F5C45]/40 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase">Hadir</p>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">96.8%</p>
                  </div>
                  <div className="bg-blue-400/10 border border-blue-400/20 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">Izin</p>
                    <p className="text-xl font-black text-blue-300 mt-0.5">2</p>
                  </div>
                  <div className="bg-amber-400/10 border border-amber-400/20 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-amber-400 font-bold uppercase">Sakit</p>
                    <p className="text-xl font-black text-amber-300 mt-0.5">1</p>
                  </div>
                  <div className="bg-rose-400/10 border border-rose-400/20 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-rose-400 font-bold uppercase">Alpa</p>
                    <p className="text-xl font-black text-rose-300 mt-0.5">0</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <p className="font-bold text-slate-700">Identitas Scanner Terdaftar</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <span className="text-zinc-500 block">QR Token:</span>
                      <span className="font-mono text-emerald-400 font-bold">{selectedStudentForDetail.qr_token || 'Belum ada token'}</span>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <span className="text-zinc-500 block">RFID UID:</span>
                      <span className="font-mono text-cyan-300 font-bold">{selectedStudentForDetail.rfid_uid || 'Belum terdaftar'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: KARTU SANTRI */}
            {detailActiveTab === 'kartu' && (
              <div className="space-y-4">
                {/* Digital Santri Card Preview */}
                <div className="p-5 rounded-3xl bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-slate-300/80 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1F5C45]/20 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#1F5C45] text-white flex items-center justify-center font-bold text-[10px]">
                        UB
                      </div>
                      <span className="text-xs font-bold text-white tracking-wider">KARTU SANTRI DIGITAL SIUBA</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#2F7D5A] bg-[#1F5C45]/20 px-2 py-0.5 rounded-md border border-[#1F5C45]/40">
                      ANGKATAN {selectedStudentForDetail.generation_year}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="sm:col-span-2 space-y-2 text-xs">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Nama Lengkap</p>
                        <p className="text-sm font-bold text-white">{selectedStudentForDetail.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Kelas</p>
                          <p className="font-semibold text-slate-800">{selectedStudentForDetail.classroom_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Kamar Asrama</p>
                          <p className="font-semibold text-slate-800">{selectedStudentForDetail.dormitory_room_name || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">RFID Card UID</p>
                          <p className="font-mono text-cyan-300 font-bold">{selectedStudentForDetail.rfid_uid || 'Belum Terdaftar'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Jenis Kelamin</p>
                          <p className="font-semibold text-slate-800">{selectedStudentForDetail.gender === 'male' || selectedStudentForDetail.gender === 'L' ? 'Santriwan (L)' : 'Santriwati (P)'}</p>
                        </div>
                      </div>
                    </div>

                    {/* QR Visual Box */}
                    <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                      <QrCode className="w-16 h-16 text-emerald-400 p-1" />
                      <p className="text-[10px] font-mono text-slate-500 mt-1 font-bold">{selectedStudentForDetail.qr_token}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          onClick={() => handleCopy(selectedStudentForDetail.qr_token)}
                          className="px-2 py-1 text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1 min-h-[36px] cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" /> Salin
                        </button>
                        <button
                          onClick={() => setSelectedStudentForQrCard(selectedStudentForDetail)}
                          className="px-2.5 py-1 text-[10px] bg-[#1F5C45]/20 hover:bg-[#1F5C45]/30 text-emerald-300 font-bold rounded-lg border border-[#1F5C45]/40 flex items-center gap-1 cursor-pointer min-h-[36px]"
                        >
                          <Printer className="w-2.5 h-2.5 text-emerald-400" /> Cetak
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  const st = selectedStudentForDetail;
                  setSelectedStudentForDetail(null);
                  handleOpenEdit(st);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-2xl shadow-xs transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Edit Data Santri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal Bento */}
      {(showAddModal || studentToEdit) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-white">
                {studentToEdit ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pastikan NIS dan RFID Card UID unik dan belum digunakan santri lain.
              </p>
            </div>

            {validationError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={studentToEdit ? handleSubmitEdit : handleSubmitAdd} className="space-y-4 text-xs">
              {/* NIS & NISN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Induk Santri (NIS) *</label>
                  <input
                    type="text"
                    value={formData.student_number}
                    onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                    placeholder="Contoh: UBA260015"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#1F5C45] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NISN *</label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0089123470"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#1F5C45] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Name & Nickname */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Santri *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama lengkap santri..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#1F5C45]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Panggilan</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="Nama panggilan..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Gender & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none"
                  >
                    <option value="male">Laki-laki (Santriwan)</option>
                    <option value="female">Perempuan (Santriwati)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Santri *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none"
                  >
                    <option value="active">Aktif (Mengikuti KBM & Ibadah)</option>
                    <option value="leave">Cuti (Izin Pulang/Sakit Panjang)</option>
                    <option value="transferred">Pindah Pondok / Sekolah</option>
                    <option value="graduated">Lulus / Alumni</option>
                    <option value="inactive">Non-Aktif (Keluar/DO)</option>
                  </select>
                </div>
              </div>

              {/* Class & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas Formal</label>
                  <select
                    value={formData.classroom_id || ''}
                    onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none"
                  >
                    <option value="">-- Belum Ditetapkan --</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kamar Asrama</label>
                  <select
                    value={formData.dormitory_room_id || ''}
                    onChange={(e) => setFormData({ ...formData, dormitory_room_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none"
                  >
                    <option value="">-- Non Asrama / Belum Ditetapkan --</option>
                    {dormitoryRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RFID UID & QR Token */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RFID UID (Mifare/NFC)</label>
                  <input
                    type="text"
                    value={formData.rfid_uid}
                    onChange={(e) => setFormData({ ...formData, rfid_uid: e.target.value })}
                    placeholder="Contoh: 04A87F25"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none font-mono uppercase"
                  />
                  <p className="text-[10px] text-zinc-500 mt-0.5">Spasi & simbol otomatis dinormalisasi.</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">QR Token Unik *</label>
                    <button
                      type="button"
                      onClick={handleRegenerateQr}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.qr_token}
                    onChange={(e) => setFormData({ ...formData, qr_token: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-emerald-400 font-mono font-bold rounded-2xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Guardian Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Wali Santri</label>
                  <input
                    type="text"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                    placeholder="Nama bapak / ibu wali..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp Wali</label>
                  <input
                    type="text"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setStudentToEdit(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-white hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {studentToEdit ? 'Simpan Perubahan' : 'Daftarkan Santri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual QR Card Modal */}
      {selectedStudentForQrCard && (
        <QrCardModal
          student={selectedStudentForQrCard}
          allStudents={students}
          currentUser={currentUser}
          onClose={() => setSelectedStudentForQrCard(null)}
          onUpdateStudent={(updated) => {
            onUpdateStudent(updated.id, updated);
            setSelectedStudentForQrCard(updated);
            onShowToast(`QR Token santri ${updated.name} berhasil diperbarui.`, 'success');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Bulk Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        type="students"
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(res) => {
          if (res.records && res.records.length > 0) {
            res.records.forEach((record) => {
              const existingIdx = safeStudents.findIndex((s) => s.student_number === record.student_number);
              if (existingIdx !== -1) {
                onUpdateStudent(safeStudents[existingIdx].id, record);
              } else {
                onAddStudent(record);
              }
            });
          }
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
