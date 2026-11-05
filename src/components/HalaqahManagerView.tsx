import React, { useState } from 'react';
import { 
  Halaqah, 
  HalaqahMember, 
  Student, 
  User 
} from '../types';
import { 
  BookmarkCheck, 
  Plus, 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Edit, 
  MapPin, 
  UserCheck,
  ChevronDown,
  Check,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';

interface HalaqahManagerViewProps {
  halaqahs?: Halaqah[];
  halaqahMembers?: HalaqahMember[];
  students?: Student[];
  users?: User[];
  onUpdateHalaqahs: (newHalaqahs: Halaqah[]) => void;
  onUpdateHalaqahMembers: (newMembers: HalaqahMember[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HalaqahManagerView: React.FC<HalaqahManagerViewProps> = ({
  halaqahs = [],
  halaqahMembers = [],
  students = [],
  users = [],
  onUpdateHalaqahs,
  onUpdateHalaqahMembers,
  onShowToast,
}) => {
  const safeHalaqahs = halaqahs || [];
  const safeHalaqahMembers = halaqahMembers || [];
  const safeStudents = students || [];
  const safeUsers = users || [];

  const [selectedHalaqahId, setSelectedHalaqahId] = useState<number>(safeHalaqahs[0]?.id || 1);
  const [isHalaqahDropdownOpen, setIsHalaqahDropdownOpen] = useState<boolean>(false);
  const [halaqahSearchQuery, setHalaqahSearchQuery] = useState<string>('');
  const [showAddHalaqahModal, setShowAddHalaqahModal] = useState<boolean>(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');

  // New Halaqah Form
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newSupervisorId, setNewSupervisorId] = useState<number>(safeUsers[0]?.id || 1);
  const [newLocation, setNewLocation] = useState<string>('Masjid Utama');

  // New Member Student Selector
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<number | null>(null);

  const selectedHalaqah = safeHalaqahs.find((h) => h && h.id === selectedHalaqahId);

  // Active members for selected halaqah
  const currentMembers = safeHalaqahMembers.filter((m) => m && m.halaqah_id === selectedHalaqahId && m.is_active);

  // Non-member students eligible to add
  const currentMemberStudentIds = currentMembers.map((m) => m.student_id);
  let availableStudents = safeStudents.filter((s) => s && s.is_active && !currentMemberStudentIds.includes(s.id));

  if (searchMemberQuery.trim()) {
    const q = searchMemberQuery.toLowerCase();
    availableStudents = availableStudents.filter(
      (s) => s && ((s.name || '').toLowerCase().includes(q) || (s.student_number || '').toLowerCase().includes(q))
    );
  }

  // Create Halaqah
  const handleCreateHalaqah = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      onShowToast('Nama dan Kode Halaqah wajib diisi.', 'error');
      return;
    }

    const supervisorObj = users.find((u) => u.id === newSupervisorId);

    const newHalaqahItem: Halaqah = {
      id: Date.now(),
      code: newCode.trim(),
      name: newName.trim(),
      supervisor_id: newSupervisorId,
      supervisor_name: supervisorObj?.name || 'Ustadz Pembina',
      location: newLocation.trim(),
      is_active: true,
      student_count: 0,
    };

    onUpdateHalaqahs([...halaqahs, newHalaqahItem]);
    setSelectedHalaqahId(newHalaqahItem.id);
    setShowAddHalaqahModal(false);
    setNewCode('');
    setNewName('');
    onShowToast(`Halaqah ${newHalaqahItem.name} berhasil dibuat!`, 'success');
  };

  // Add Member
  const handleAddMember = () => {
    if (!selectedStudentToAdd) {
      onShowToast('Pilih santri terlebih dahulu.', 'error');
      return;
    }

    const st = students.find((s) => s.id === selectedStudentToAdd);
    if (!st) return;

    const newMember: HalaqahMember = {
      id: Date.now(),
      halaqah_id: selectedHalaqahId,
      student_id: st.id,
      student_name: st.name,
      student_number: st.student_number,
      joined_at: new Date().toISOString().slice(0, 10),
      is_active: true,
    };

    const updatedMembers = [...halaqahMembers, newMember];
    onUpdateHalaqahMembers(updatedMembers);

    // Update student count in halaqah
    const updatedHalaqahs = halaqahs.map((h) => {
      if (h.id === selectedHalaqahId) {
        return { ...h, student_count: (h.student_count || 0) + 1 };
      }
      return h;
    });
    onUpdateHalaqahs(updatedHalaqahs);

    setSelectedStudentToAdd(null);
    setShowAddMemberModal(false);
    onShowToast(`Santri ${st.name} berhasil ditambahkan ke ${selectedHalaqah?.name}!`, 'success');
  };

  // Remove Member
  const handleRemoveMember = (memberId: number) => {
    const updatedMembers = halaqahMembers.map((m) => {
      if (m.id === memberId) {
        return { ...m, is_active: false, left_at: new Date().toISOString().slice(0, 10) };
      }
      return m;
    });
    onUpdateHalaqahMembers(updatedMembers);

    // Update student count in halaqah
    const updatedHalaqahs = halaqahs.map((h) => {
      if (h.id === selectedHalaqahId) {
        return { ...h, student_count: Math.max(0, (h.student_count || 1) - 1) };
      }
      return h;
    });
    onUpdateHalaqahs(updatedHalaqahs);

    onShowToast('Anggota halaqah berhasil dihapus.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <BookmarkCheck className="w-4 h-4 text-[#C9A227]" /> 
              <span>Tahfidz Al-Qur'an Engine • SIUBA v1.1.3</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Kelola Kelompok Halaqah Tahfidz</h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Manajemen dan pengelompokan santri per-musyrif pembina untuk otomatisasi absensi Tahfidz Al-Qur'an Pagi & Malam.
            </p>
          </div>
        </div>

        {/* Unified Dropdown Selector Toolbar */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-white/30 flex flex-row items-center justify-between gap-3 relative flex-wrap sm:flex-nowrap">
            {/* Left: Dropdown Selector Trigger */}
            <div className="relative inline-block flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setIsHalaqahDropdownOpen(prev => !prev)}
                className="w-full flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs sm:text-sm cursor-pointer active:scale-98 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#1F5C45]/15 text-[#1F5C45] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 truncate">
                        {selectedHalaqah?.name || 'Pilih Halaqah'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        {currentMembers.length} Santri
                      </span>
                      {selectedHalaqah?.code && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {selectedHalaqah.code}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal truncate max-w-[280px] sm:max-w-[420px]">
                      Pembina: {selectedHalaqah?.supervisor_name || '-'} • Lokasi: {selectedHalaqah?.location || '-'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform shrink-0 ml-2 ${isHalaqahDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Popover Menu */}
              {isHalaqahDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsHalaqahDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Pilih Kelompok Halaqah
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {safeHalaqahs.length} Halaqah
                      </span>
                    </div>

                    {/* Search inside dropdown */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cari halaqah atau pembina..."
                          value={halaqahSearchQuery}
                          onChange={(e) => setHalaqahSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="p-1.5 space-y-1 max-h-[320px] overflow-y-auto">
                      {safeHalaqahs
                        .filter(h => {
                          if (!halaqahSearchQuery.trim()) return true;
                          const q = halaqahSearchQuery.toLowerCase();
                          return (h.name || '').toLowerCase().includes(q) || 
                                 (h.supervisor_name || '').toLowerCase().includes(q) ||
                                 (h.code || '').toLowerCase().includes(q);
                        })
                        .map((h) => {
                          const count = safeHalaqahMembers.filter((m) => m.halaqah_id === h.id && m.is_active).length;
                          const isSelected = selectedHalaqahId === h.id;
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => {
                                setSelectedHalaqahId(h.id);
                                setIsHalaqahDropdownOpen(false);
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
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs ${isSelected ? 'font-black text-emerald-900' : 'font-bold text-slate-800'}`}>
                                    {h.name}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {count} Santri
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  Pembina: {h.supervisor_name}
                                </p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {h.location}
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

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#EADAA2]" />
                <span>Tambah Santri</span>
              </button>
              <button
                onClick={() => setShowAddHalaqahModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#1F5C45]" />
                <span>Buat Halaqah</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Halaqah Overview Bento Cards */}
      {selectedHalaqah && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Santri Aktif</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{currentMembers.length} Santri</div>
            <span className="text-xs text-emerald-800 font-medium mt-0.5 block">Kelompok {selectedHalaqah.name}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Musyrif Pembina</span>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">{selectedHalaqah.supervisor_name}</div>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">Penanggung Jawab Absensi</span>
          </div>

          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 shadow-2xs">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Lokasi Halaqah</span>
            <div className="text-base sm:text-lg font-black text-indigo-900 mt-1 truncate">{selectedHalaqah.location}</div>
            <span className="text-xs text-indigo-800 font-medium mt-0.5 block">Area Tahfidz</span>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Kode Identifikasi</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-1 font-mono">{selectedHalaqah.code}</div>
            <span className="text-xs text-amber-800 font-medium mt-0.5 block">Status: Aktif</span>
          </div>
        </div>
      )}

      {/* Full Width Members Detail Table */}
      {selectedHalaqah ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-800" />
                Daftar Anggota Santri Halaqah: {selectedHalaqah.name} ({currentMembers.length} Santri)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar santri yang terhubung pada jadwal setoran & absensi halaqah ini.
              </p>
            </div>

            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer self-start sm:self-auto active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#EADAA2]" />
              Tambah Anggota Santri
            </button>
          </div>

          {currentMembers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-700">Belum ada santri terdaftar pada halaqah ini.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol "Tambah Anggota Santri" di atas untuk memasukkan santri ke kelompok halaqah ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Santri</th>
                    <th className="py-3 px-4">Kelas / Rombel</th>
                    <th className="py-3 px-4">Bergabung Sejak</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMembers.map((m, idx) => {
                    const st = students.find((s) => s.id === m.student_id);
                    return (
                      <tr key={m.id} className="hover:bg-emerald-50/40 transition">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">{m.student_number}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{m.student_name}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            {st?.classroom_name || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{m.joined_at}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer active:scale-95"
                            title="Keluarkan dari Halaqah"
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
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Pilih halaqah dari dropdown di atas.
        </div>
      )}

      {/* Modal Add Halaqah */}
      {showAddHalaqahModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Buat Halaqah Tahfidz Baru</h3>

            <form onSubmit={handleCreateHalaqah} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Halaqah</label>
                <input
                  type="text"
                  placeholder="e.g. HLQ-04"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Halaqah</label>
                <input
                  type="text"
                  placeholder="e.g. Halaqah Ar-Rahman"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Musyrif Pembina</label>
                <select
                  value={newSupervisorId}
                  onChange={(e) => setNewSupervisorId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lokasi Halaqah</label>
                <input
                  type="text"
                  placeholder="e.g. Serambi Masjid Timur"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHalaqahModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow"
                >
                  Simpan Halaqah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Tambah Anggota ke {selectedHalaqah?.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cari Santri</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ketik nama atau NIS santri..."
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Santri Terdaftar</label>
                <select
                  size={6}
                  value={selectedStudentToAdd || ''}
                  onChange={(e) => setSelectedStudentToAdd(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 overflow-y-auto"
                >
                  {availableStudents.map((st) => (
                    <option key={st.id} value={st.id} className="p-1.5 hover:bg-emerald-50">
                      {st.name} ({st.student_number}) - {st.classroom_name || 'Tanpa Kelas'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow"
                >
                  Tambahkan Anggota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
