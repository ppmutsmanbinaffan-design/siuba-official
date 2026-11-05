import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  UserCheck, 
  Users, 
  Copy, 
  Search, 
  Filter, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronDown,
  Check,
  Building,
  Clock,
  Shield,
  Layers,
  MapPin
} from 'lucide-react';
import { Activity, DutyRoster, Student, User } from '../types';

interface DutyRosterManagerViewProps {
  activities?: Activity[];
  dutyRosters?: DutyRoster[];
  students?: Student[];
  currentUser?: User;
  onUpdateDutyRosters: (rosters: DutyRoster[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DutyRosterManagerView: React.FC<DutyRosterManagerViewProps> = ({
  activities = [],
  dutyRosters = [],
  students = [],
  currentUser,
  onUpdateDutyRosters,
  onShowToast,
}) => {
  const safeActivities = activities || [];
  const safeDutyRosters = dutyRosters || [];
  const safeStudents = students || [];

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedActivityId, setSelectedActivityId] = useState<number | 'all'>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState<boolean>(false);

  // Form State
  const [isAddingModalOpen, setIsAddingModalOpen] = useState<boolean>(false);
  const [formActivityId, setFormActivityId] = useState<number>(safeActivities[0]?.id || 1);
  const [formDate, setFormDate] = useState<string>(selectedDate);
  const [formStudentIds, setFormStudentIds] = useState<number[]>([]);
  const [formRole, setFormRole] = useState<string>('Piket Kebersihan Masjid');
  const [modalStudentSearch, setModalStudentSearch] = useState<string>('');

  // Roster Activities (Activities with duty_roster participant_type or kebersihan/asrama category)
  const rosterActivities = safeActivities.filter(
    (a) => a && (a.participant_type === 'duty_roster' || a.category_code === 'KEBERSIHAN' || a.category_code === 'ASRAMA' || a.category_code === 'IBADAH' || a.name?.toLowerCase().includes('piket'))
  );

  const selectedActivityObj = safeActivities.find(a => a.id === selectedActivityId);

  // Filter Duty Rosters
  const filteredRosters = safeDutyRosters.filter((r) => {
    if (!r) return false;
    const matchesDate = !selectedDate || r.date === selectedDate;
    const matchesActivity = selectedActivityId === 'all' || r.activity_id === selectedActivityId;
    const matchesRole = selectedRoleFilter === 'ALL' || (r.role || '').toLowerCase().includes(selectedRoleFilter.toLowerCase());
    const matchesSearch = 
      !searchQuery ||
      (r.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.student_number || '').includes(searchQuery) ||
      (r.role || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesActivity && matchesRole && matchesSearch;
  });

  // Calculate statistics for selected date
  const totalAssignedDate = safeDutyRosters.filter((r) => r && r.date === selectedDate && r.is_active).length;
  const uniqueStudentsDate = new Set(safeDutyRosters.filter((r) => r && r.date === selectedDate && r.is_active).map((r) => r.student_id)).size;
  const activeActivitiesCount = new Set(safeDutyRosters.filter((r) => r && r.date === selectedDate && r.is_active).map((r) => r.activity_id)).size;

  const handleAddAssignments = () => {
    if (formStudentIds.length === 0) {
      if (onShowToast) onShowToast('Pilih minimal satu santri untuk ditugaskan', 'error');
      return;
    }

    const activityObj = safeActivities.find((a) => a && a.id === formActivityId);
    const newItems: DutyRoster[] = formStudentIds.map((stId, index) => {
      const st = safeStudents.find((s) => s && s.id === stId);
      return {
        id: Date.now() + index + Math.floor(Math.random() * 1000),
        activity_id: formActivityId,
        activity_name: activityObj?.name || 'Kegiatan Piket',
        date: formDate,
        student_id: stId,
        student_name: st?.name || `Santri ID ${stId}`,
        student_number: st?.student_number || '-',
        role: formRole,
        is_active: true,
        created_by: currentUser?.name || 'Musyrif Kebersihan',
        created_at: new Date().toISOString(),
      };
    });

    onUpdateDutyRosters([...safeDutyRosters, ...newItems]);
    setIsAddingModalOpen(false);
    setFormStudentIds([]);
    if (onShowToast) onShowToast(`Berhasil menambahkan ${newItems.length} petugas piket untuk ${formDate}`, 'success');
  };

  const handleToggleActive = (id: number) => {
    const updated = safeDutyRosters.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r));
    onUpdateDutyRosters(updated);
    if (onShowToast) onShowToast('Status tugas piket diperbarui', 'info');
  };

  const handleDeleteRoster = (id: number) => {
    if (window.confirm('Hapus penugasan piket ini?')) {
      const updated = dutyRosters.filter((r) => r.id !== id);
      onUpdateDutyRosters(updated);
      if (onShowToast) onShowToast('Penugasan piket dihapus', 'info');
    }
  };

  const handleCopyFromPreviousWeek = () => {
    const currentD = new Date(selectedDate);
    currentD.setDate(currentD.getDate() - 7);
    const prevDateStr = currentD.toISOString().slice(0, 10);

    const prevRosters = dutyRosters.filter((r) => r.date === prevDateStr && r.is_active);
    if (prevRosters.length === 0) {
      if (onShowToast) onShowToast(`Tidak ada penugasan piket ditemukan pada tanggal ${prevDateStr}`, 'error');
      return;
    }

    const cloned: DutyRoster[] = prevRosters.map((r, idx) => ({
      ...r,
      id: Date.now() + idx + Math.floor(Math.random() * 1000),
      date: selectedDate,
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || 'Auto Copy Service',
    }));

    onUpdateDutyRosters([...dutyRosters, ...cloned]);
    if (onShowToast) onShowToast(`Berhasil menyalin ${cloned.length} tugas piket dari tanggal ${prevDateStr}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-white/15 border border-white/20 text-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Award className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Duty Roster & Piket Asrama Santri
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Manajemen Duty Roster & Piket Santri
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
              Jadwal piket kebersihan masjid, asrama, peribadahan muadzin, dan tugas khusus santri. Peserta sesi absensi dibuat otomatis berdasarkan roster harian.
            </p>
          </div>
        </div>

        {/* Unified Toolbar Bar (Side-by-Side) */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-white/30 flex flex-row items-center justify-between gap-3 relative flex-wrap sm:flex-nowrap">
            {/* Left: Dropdown Selector Trigger */}
            <div className="relative inline-block flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setIsActivityDropdownOpen(prev => !prev)}
                className="w-full flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs sm:text-sm cursor-pointer active:scale-98 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#1F5C45]/15 text-[#1F5C45] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 truncate">
                        {selectedActivityId === 'all' ? 'Semua Activity Roster & Piket' : (selectedActivityObj?.name || 'Kegiatan Roster')}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#8c6d12] border border-[#C9A227]/30 shrink-0">
                        {filteredRosters.length} Petugas
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal truncate max-w-[280px] sm:max-w-[420px]">
                      Filter kegiatan piket kebersihan, asrama, ibadah & muadzin santri
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform shrink-0 ml-2 ${isActivityDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Popover Menu */}
              {isActivityDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsActivityDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Pilih Kategori Kegiatan Roster
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {rosterActivities.length + 1} Pilihan
                      </span>
                    </div>

                    <div className="p-1.5 space-y-1 max-h-[320px] overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedActivityId('all');
                          setIsActivityDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                          selectedActivityId === 'all'
                            ? 'bg-emerald-50 border border-emerald-300/80 shadow-2xs'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedActivityId === 'all' ? 'bg-[#1F5C45] text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs ${selectedActivityId === 'all' ? 'font-black text-emerald-900' : 'font-bold text-slate-800'}`}>
                              Semua Activity Roster
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              Semua
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Menampilkan semua jadwal piket pada tanggal terpilih
                          </p>
                        </div>
                        {selectedActivityId === 'all' && (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                        )}
                      </button>

                      {rosterActivities.map((act) => {
                        const isSelected = selectedActivityId === act.id;
                        const countForAct = safeDutyRosters.filter(r => r.activity_id === act.id && r.date === selectedDate).length;
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => {
                              setSelectedActivityId(act.id);
                              setIsActivityDropdownOpen(false);
                            }}
                            className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                              isSelected 
                                ? 'bg-emerald-50 border border-emerald-300/80 shadow-2xs' 
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? 'bg-[#1F5C45] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Building className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs ${isSelected ? 'font-black text-emerald-900' : 'font-bold text-slate-800'}`}>
                                  {act.name}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {countForAct} Petugas
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                Kategori: {act.category_code || 'KEBERSIHAN'} • Peserta Roster
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Date Selector & Action Buttons inside the same bar */}
            <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-200 rounded-xl shrink-0 ml-auto flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 text-xs text-slate-700 px-2 py-1">
                <Calendar className="w-4 h-4 text-[#1F5C45]" />
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold text-xs focus:outline-none cursor-pointer"
                />
              </div>
              <button 
                onClick={() => {
                  setFormDate(selectedDate);
                  setIsAddingModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[32px] active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#EADAA2]" />
                <span>Assign Petugas</span>
              </button>
              <button 
                onClick={handleCopyFromPreviousWeek}
                title="Salin tugas piket dari pekan lalu"
                className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Bento Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Total Tugas Terjadwal</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalAssignedDate}</div>
          <span className="text-xs text-slate-500 font-medium mt-0.5 block">Penugasan Piket Hari Ini</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Santri Bertugas Unik</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{uniqueStudentsDate} Santri</div>
          <span className="text-xs text-emerald-800 font-bold mt-0.5 block">Individu Santri Terdaftar</span>
        </div>

        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Kegiatan Roster Aktif</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">{activeActivitiesCount} Kegiatan</div>
          <span className="text-xs text-indigo-800 font-medium mt-0.5 block">Posisi Piket Asrama / Ibadah</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Tanggal Roster</span>
          <div className="text-base sm:text-xl font-black text-amber-800 mt-1 font-mono">{selectedDate}</div>
          <span className="text-xs text-amber-800 font-medium mt-0.5 block">Periode Jadwal Harian</span>
        </div>
      </div>

      {/* Controls & Filter Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama santri, NIS, peran piket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Semua Peran / Tugas</option>
              <option value="Kebersihan">Piket Kebersihan</option>
              <option value="Asrama">Piket Asrama</option>
              <option value="Muadzin">Muadzin & Ibadah</option>
              <option value="Makan">Piket Makan / Dapur</option>
              <option value="Keamanan">Keamanan & Piket Khusus</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
          <span>Menampilkan: <strong className="text-slate-900">{filteredRosters.length}</strong> penugasan</span>
        </div>
      </div>

      {/* Duty Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            Daftar Penugasan Petugas Roster ({filteredRosters.length} Tugas)
          </h3>
          <span className="text-xs text-slate-500 font-medium font-mono">Periode: {selectedDate}</span>
        </div>

        {filteredRosters.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Belum ada penugasan roster pada filter ini</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Klik tombol <strong>&quot;Assign Petugas&quot;</strong> di atas untuk menambahkan jadwal piket kebersihan masjid, asrama, atau muadzin santri.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Nama Santri & NIS</th>
                  <th className="py-3 px-4">Kegiatan / Activity</th>
                  <th className="py-3 px-4">Tanggal Roster</th>
                  <th className="py-3 px-4">Peran / Tugas Khusus</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRosters.map((item, idx) => {
                  const actObj = activities.find((a) => a.id === item.activity_id);
                  const roleLower = (item.role || '').toLowerCase();
                  let roleBadgeStyle = 'bg-slate-100 text-slate-800 border-slate-200';
                  if (roleLower.includes('kebersihan')) roleBadgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  else if (roleLower.includes('muadzin') || roleLower.includes('ibadah')) roleBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                  else if (roleLower.includes('asrama')) roleBadgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                  else if (roleLower.includes('makan') || roleLower.includes('dapur')) roleBadgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';

                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/30 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.student_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{item.student_name}</div>
                            <div className="text-[10px] text-emerald-800 font-mono font-bold">{item.student_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{actObj?.name || item.activity_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{actObj?.category_code || 'KEBERSIHAN'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px] font-semibold">{item.date}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-bold px-2.5 py-1 rounded-lg text-[11px] border ${roleBadgeStyle}`}>
                          {item.role || 'Piket Routine'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(item.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer active:scale-95 ${
                            item.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/80'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.is_active ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteRoster(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer active:scale-95"
                          title="Hapus penugasan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Roster Modal */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Penugasan Roster / Piket Santri Baru
              </h3>
              <button
                onClick={() => setIsAddingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Kegiatan Piket / Activity</label>
                <select
                  value={formActivityId}
                  onChange={(e) => setFormActivityId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  {rosterActivities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.name} ({act.category_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tanggal Tugas</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Peran / Deskripsi Tugas</label>
                <input
                  type="text"
                  placeholder="e.g. Piket Kebersihan Masjid, Muadzin Subuh"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Piket Kebersihan Masjid', 'Muadzin Subuh', 'Piket Asrama Putra', 'Piket Makan & Dapur', 'Keamanan Santri'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormRole(preset)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        formRole === preset 
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">Pilih Santri Bertugas ({formStudentIds.length} Dipilih)</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (formStudentIds.length === safeStudents.length) setFormStudentIds([]);
                      else setFormStudentIds(safeStudents.map(s => s.id));
                    }}
                    className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {formStudentIds.length === safeStudents.length ? 'Batalkan Semua' : 'Pilih Semua'}
                  </button>
                </div>

                {/* Filter Search inside Modal */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari santri berdasarkan nama / NIS..."
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                  {safeStudents
                    .filter(st => {
                      if (!modalStudentSearch.trim()) return true;
                      const q = modalStudentSearch.toLowerCase();
                      return (st.name || '').toLowerCase().includes(q) || (st.student_number || '').includes(q);
                    })
                    .map((st) => {
                      const isChecked = formStudentIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                            isChecked ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200' : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormStudentIds([...formStudentIds, st.id]);
                                } else {
                                  setFormStudentIds(formStudentIds.filter((id) => id !== st.id));
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>{st.name} ({st.student_number})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{st.classroom_name || st.dormitory_room_name || '-'}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddAssignments}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1F5C45] hover:bg-[#12372A] rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                Simpan Penugasan Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
