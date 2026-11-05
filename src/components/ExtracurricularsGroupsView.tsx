import React, { useState } from 'react';
import { 
  Award, 
  BookOpen, 
  Plus, 
  Search, 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  Layers,
  ChevronRight,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { 
  Extracurricular, 
  ExtracurricularMember, 
  Student, 
  StudentGroup, 
  StudentGroupMember 
} from '../types';

interface ExtracurricularsGroupsViewProps {
  extracurriculars?: Extracurricular[];
  extracurricularMembers?: ExtracurricularMember[];
  studentGroups?: StudentGroup[];
  studentGroupMembers?: StudentGroupMember[];
  students?: Student[];
  onAddExtracurricular: (ekskul: Partial<Extracurricular>) => void;
  onAddExtracurricularMember: (ekskulId: number, studentId: number) => void;
  onRemoveExtracurricularMember: (memberId: number) => void;
  onAddStudentGroup: (group: Partial<StudentGroup>) => void;
  onAddStudentGroupMember: (groupId: number, studentId: number) => void;
  onRemoveStudentGroupMember: (memberId: number) => void;
}

export const ExtracurricularsGroupsView: React.FC<ExtracurricularsGroupsViewProps> = ({
  extracurriculars = [],
  extracurricularMembers = [],
  studentGroups = [],
  studentGroupMembers = [],
  students = [],
  onAddExtracurricular,
  onAddExtracurricularMember,
  onRemoveExtracurricularMember,
  onAddStudentGroup,
  onAddStudentGroupMember,
  onRemoveStudentGroupMember,
}) => {
  const safeExtracurriculars = extracurriculars || [];
  const safeExtracurricularMembers = extracurricularMembers || [];
  const safeStudentGroups = studentGroups || [];
  const safeStudentGroupMembers = studentGroupMembers || [];
  const safeStudents = students || [];

  const [activeTab, setActiveTab] = useState<'extracurriculars' | 'groups'>('extracurriculars');
  const [selectedEkskulId, setSelectedEkskulId] = useState<number>(safeExtracurriculars[0]?.id || 1);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(safeStudentGroups[0]?.id || 1);
  
  const [showAddEkskulModal, setShowAddEkskulModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Form states
  const [newEkskulCode, setNewEkskulCode] = useState('');
  const [newEkskulName, setNewEkskulName] = useState('');
  const [newEkskulDesc, setNewEkskulDesc] = useState('');
  const [newEkskulCoach, setNewEkskulCoach] = useState('');
  const [newEkskulLocation, setNewEkskulLocation] = useState('');

  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Active selected entities
  const selectedEkskul = safeExtracurriculars.find((e) => e && e.id === selectedEkskulId) || safeExtracurriculars[0];
  const selectedGroup = safeStudentGroups.find((g) => g && g.id === selectedGroupId) || safeStudentGroups[0];

  // Members of selected entity
  const currentEkskulMembers = safeExtracurricularMembers.filter(
    (m) => m && m.extracurricular_id === selectedEkskul?.id && m.is_active
  );

  const activeMembers = currentEkskulMembers.filter((m) => m && (m.membership_status === 'active' || !m.membership_status));
  const pendingMembers = currentEkskulMembers.filter((m) => m && m.membership_status === 'pending');
  const waitlistedMembers = currentEkskulMembers.filter((m) => m && m.membership_status === 'waitlisted');

  const currentGroupMembers = safeStudentGroupMembers.filter(
    (m) => m && m.student_group_id === selectedGroup?.id
  );

  // Eligible students for adding (not yet members)
  const availableStudentsForEkskul = safeStudents.filter(
    (s) => s && s.is_active && !currentEkskulMembers.some((m) => m && m.student_id === s.id)
  );

  const availableStudentsForGroup = safeStudents.filter(
    (s) => s && s.is_active && !currentGroupMembers.some((m) => m && m.student_id === s.id)
  );

  const filteredAvailableStudents = (activeTab === 'extracurriculars' ? availableStudentsForEkskul : availableStudentsForGroup).filter((s) => {
    if (!s) return false;
    const q = studentSearchTerm.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.student_number || '').includes(q) || (s.classroom_name && s.classroom_name.toLowerCase().includes(q));
  });

  const handleCreateEkskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEkskulName.trim()) return;
    onAddExtracurricular({
      code: newEkskulCode.trim() || `EKS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: newEkskulName.trim(),
      description: newEkskulDesc.trim() || 'Kegiatan ekstrakurikuler minat & bakat santri.',
      coach_name: newEkskulCoach.trim() || 'Ustadz Pembina',
      location: newEkskulLocation.trim() || 'Area Pesantren',
      is_active: true,
    });
    setNewEkskulCode('');
    setNewEkskulName('');
    setNewEkskulDesc('');
    setNewEkskulCoach('');
    setNewEkskulLocation('');
    setShowAddEkskulModal(false);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onAddStudentGroup({
      code: newGroupCode.trim() || `GRP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Kelompok khusus santri untuk tugas atau pembinaan.',
      is_active: true,
    });
    setNewGroupCode('');
    setNewGroupName('');
    setNewGroupDesc('');
    setShowAddGroupModal(false);
  };

  // Calculations for KPI Cards
  const totalActiveEkskulMembers = safeExtracurricularMembers.filter((m) => m && m.is_active).length;
  const totalGroupMembers = safeStudentGroupMembers.length;

  return (
    <div id="extracurriculars-groups-view" className="space-y-6 pb-12">
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
                Master Peserta & Kelompok Khusus
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ekstrakurikuler & Kelompok Khusus
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola keanggotaan santri dalam kegiatan minat bakat ekstrakurikuler dan kelompok tugas khusus yang terhubung otomatis dengan filter presensi.
            </p>
          </div>

          {/* Sub-Tab Switcher in Header */}
          <div className="flex items-center bg-black/30 p-1 rounded-2xl border border-white/15 backdrop-blur-xs self-start md:self-auto shadow-inner">
            <button
              onClick={() => setActiveTab('extracurriculars')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'extracurriculars'
                  ? 'bg-white text-[#12372A] shadow-md'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Ekstrakurikuler ({safeExtracurriculars.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'groups'
                  ? 'bg-white text-[#12372A] shadow-md'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Kelompok Khusus ({safeStudentGroups.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Ekskul</div>
            <div className="text-2xl font-black text-slate-900">{safeExtracurriculars.length} <span className="text-xs font-semibold text-slate-400">Cabang</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kelompok Khusus</div>
            <div className="text-2xl font-black text-sky-700">{safeStudentGroups.length} <span className="text-xs font-semibold text-slate-400">Grup</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Anggota Ekskul Aktif</div>
            <div className="text-2xl font-black text-indigo-700">{totalActiveEkskulMembers} <span className="text-xs font-semibold text-slate-400">Santri</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Santri di Kelompok</div>
            <div className="text-2xl font-black text-amber-700">{totalGroupMembers} <span className="text-xs font-semibold text-slate-400">Santri</span></div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {activeTab === 'extracurriculars' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of Extracurriculars */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#1F5C45]" />
                Daftar Ekstrakurikuler ({safeExtracurriculars.length})
              </h3>
              <button
                onClick={() => setShowAddEkskulModal(true)}
                className="px-3.5 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Ekskul
              </button>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {safeExtracurriculars.map((ekskul) => {
                const count = safeExtracurricularMembers.filter(
                  (m) => m && m.extracurricular_id === ekskul.id && m.is_active
                ).length;
                const isSelected = selectedEkskul?.id === ekskul.id;

                return (
                  <div
                    key={ekskul.id}
                    onClick={() => setSelectedEkskulId(ekskul.id)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/50 border-[#1F5C45] ring-2 ring-[#1F5C45]/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                            {ekskul.code}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">{ekskul.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{ekskul.description}</p>
                        
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            {ekskul.coach_name || 'Pembina Umum'}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {ekskul.location || 'Area Pondok'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {count} Santri
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {safeExtracurriculars.length === 0 && (
                <div className="text-center py-10 bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  Belum ada ekstrakurikuler terdaftar.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Roster of Members */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">{selectedEkskul?.name}</h3>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {selectedEkskul?.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Daftar anggota aktif yang otomatis eligible saat sesi absensi ekskul ini dibuka.
                </p>
              </div>

              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-white" />
                Tambah Anggota
              </button>
            </div>

            {/* Member List Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Nama Santri</th>
                    <th className="px-4 py-3">Kelas & Kamar</th>
                    <th className="px-4 py-3">Bergabung Sejak</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentEkskulMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-medium">
                        Belum ada anggota terdaftar dalam ekstrakurikuler ini.
                      </td>
                    </tr>
                  ) : (
                    currentEkskulMembers.map((member, idx) => {
                      const studentObj = students.find((s) => s.id === member.student_id);
                      return (
                        <tr key={member.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{studentObj?.name || member.student_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">NIS: {studentObj?.student_number || member.student_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{studentObj?.classroom_name || '-'}</p>
                            <p className="text-[10px] text-slate-400">{studentObj?.dormitory_room_name || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-mono text-slate-600 font-medium">
                            {member.joined_at}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => onRemoveExtracurricularMember(member.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-200 cursor-pointer"
                              title="Keluarkan dari ekstrakurikuler"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Groups Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of Groups */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                Daftar Kelompok Khusus ({safeStudentGroups.length})
              </h3>
              <button
                onClick={() => setShowAddGroupModal(true)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Kelompok
              </button>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {safeStudentGroups.map((group) => {
                const count = safeStudentGroupMembers.filter(
                  (m) => m && m.student_group_id === group.id
                ).length;
                const isSelected = selectedGroup?.id === group.id;

                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200">
                            {group.code}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">{group.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{group.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                          {count} Santri
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {safeStudentGroups.length === 0 && (
                <div className="text-center py-10 bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  Belum ada kelompok khusus terdaftar.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Roster of Members */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">{selectedGroup?.name}</h3>
                  <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    {selectedGroup?.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Santri dalam kelompok ini otomatis menjadi target peserta absensi bertipe Custom Group.
                </p>
              </div>

              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-white" />
                Tambah Anggota
              </button>
            </div>

            {/* Member List Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Nama Santri</th>
                    <th className="px-4 py-3">Kelas & Kamar</th>
                    <th className="px-4 py-3">Tanggal Penugasan</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentGroupMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-medium">
                        Belum ada santri ditugaskan pada kelompok ini.
                      </td>
                    </tr>
                  ) : (
                    currentGroupMembers.map((member, idx) => {
                      const studentObj = students.find((s) => s.id === member.student_id);
                      return (
                        <tr key={member.id} className="hover:bg-sky-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{studentObj?.name || member.student_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">NIS: {studentObj?.student_number || member.student_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{studentObj?.classroom_name || '-'}</p>
                            <p className="text-[10px] text-slate-400">{studentObj?.dormitory_room_name || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-mono text-slate-600 font-medium">
                            {member.joined_at}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => onRemoveStudentGroupMember(member.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-200 cursor-pointer"
                              title="Hapus dari kelompok"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Extracurricular */}
      {showAddEkskulModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight">Tambah Ekstrakurikuler Baru</h3>
            <form onSubmit={handleCreateEkskul} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode Ekskul *</label>
                <input
                  type="text"
                  value={newEkskulCode}
                  onChange={(e) => setNewEkskulCode(e.target.value)}
                  placeholder="Contoh: EKS-FUTSAL"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Ekstrakurikuler *</label>
                <input
                  type="text"
                  value={newEkskulName}
                  onChange={(e) => setNewEkskulName(e.target.value)}
                  placeholder="Contoh: Futsal & Sepak Bola Islami"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pelatih / Pembina</label>
                <input
                  type="text"
                  value={newEkskulCoach}
                  onChange={(e) => setNewEkskulCoach(e.target.value)}
                  placeholder="Contoh: Ustadz Ridwan Robbani"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Latihan</label>
                <input
                  type="text"
                  value={newEkskulLocation}
                  onChange={(e) => setNewEkskulLocation(e.target.value)}
                  placeholder="Contoh: Lapangan Utama Pesantren"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  value={newEkskulDesc}
                  onChange={(e) => setNewEkskulDesc(e.target.value)}
                  rows={2}
                  placeholder="Deskripsi kegiatan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEkskulModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  Simpan Ekskul
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Student Group */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight">Tambah Kelompok Khusus Baru</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode Kelompok *</label>
                <input
                  type="text"
                  value={newGroupCode}
                  onChange={(e) => setNewGroupCode(e.target.value)}
                  placeholder="Contoh: GRP-KULTUM"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kelompok *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Contoh: Tim Kultum & Da'i Muda"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Tugas / Fungsi</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3}
                  placeholder="Deskripsi peran kelompok..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  Simpan Kelompok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Member to Active Ekskul / Group */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Tambah Santri ke {activeTab === 'extracurriculars' ? selectedEkskul?.name : selectedGroup?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cari santri aktif yang ingin dimasukkan ke dalam daftar anggota.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Ketik nama atau NIS santri..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-slate-200 p-2 rounded-2xl bg-slate-50">
              {filteredAvailableStudents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Tidak ada santri yang tersedia atau sesuai pencarian.
                </p>
              ) : (
                filteredAvailableStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 bg-white hover:bg-emerald-50/50 rounded-xl border border-slate-200 flex items-center justify-between transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{st.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        NIS: {st.student_number} &bull; {st.classroom_name || 'Tanpa Kelas'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (activeTab === 'extracurriculars' && selectedEkskul) {
                          onAddExtracurricularMember(selectedEkskul.id, st.id);
                        } else if (activeTab === 'groups' && selectedGroup) {
                          onAddStudentGroupMember(selectedGroup.id, st.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
                    >
                      + Tambah
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setStudentSearchTerm('');
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
