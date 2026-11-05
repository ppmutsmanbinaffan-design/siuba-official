import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  UserCheck, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Check, 
  X, 
  Sparkles,
  Info,
  CalendarCheck,
  Building,
  Home
} from 'lucide-react';
import { 
  AttendanceSession, 
  ExcusalStatus, 
  ExcusalType, 
  Student, 
  StudentExcusal, 
  User 
} from '../types';
import { ExcuseService } from '../services/excuseService';

interface ExcuseManagerViewProps {
  excusals?: StudentExcusal[];
  students?: Student[];
  sessions?: AttendanceSession[];
  currentUser: User;
  onAddExcuse?: (newExcuse: StudentExcusal) => void;
  onUpdateExcuseStatus?: (excuseId: number, status: ExcusalStatus, approvedBy?: string) => void;
  onAddExcusal?: (newExcuse: StudentExcusal) => void;
  onApproveExcusal?: (excuseId: number) => void;
  onRejectExcusal?: (excuseId: number, reason?: string) => void;
  onCancelExcusal?: (excuseId: number) => void;
}

export const ExcuseManagerView: React.FC<ExcuseManagerViewProps> = ({
  excusals = [],
  students = [],
  sessions = [],
  currentUser,
  onAddExcuse,
  onUpdateExcuseStatus,
  onAddExcusal,
  onApproveExcusal,
  onRejectExcusal,
  onCancelExcusal,
}) => {
  const safeExcusals = excusals || [];
  const safeStudents = students || [];
  const safeSessions = sessions || [];

  const handleUpdateStatus = (excuseId: number, status: ExcusalStatus, approvedBy?: string) => {
    if (onUpdateExcuseStatus) {
      onUpdateExcuseStatus(excuseId, status, approvedBy);
    }
    if (status === 'approved' && onApproveExcusal) {
      onApproveExcusal(excuseId);
    } else if (status === 'rejected' && onRejectExcusal) {
      onRejectExcusal(excuseId, '');
    } else if (status === 'cancelled' && onCancelExcusal) {
      onCancelExcusal(excuseId);
    }
  };

  const handleAdd = (newExcuse: StudentExcusal) => {
    if (onAddExcuse) {
      onAddExcuse(newExcuse);
    } else if (onAddExcusal) {
      onAddExcusal(newExcuse);
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'pending' | 'approved'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedExcuseForDetail, setSelectedExcuseForDetail] = useState<StudentExcusal | null>(null);

  // New Excuse Form State
  const [formStudentId, setFormStudentId] = useState<number>(safeStudents[0]?.id || 1);
  const [formType, setFormType] = useState<ExcusalType>('sick');
  const [formStartAt, setFormStartAt] = useState<string>('2026-08-23T04:00');
  const [formEndAt, setFormEndAt] = useState<string>('2026-08-23T18:00');
  const [formReason, setFormReason] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formAutoApprove, setFormAutoApprove] = useState<boolean>(true);

  const canApprove =
    !currentUser ||
    currentUser.role === 'super-admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'musyrif' ||
    currentUser.role === 'guru' ||
    currentUser.role === 'kepala-asrama' ||
    currentUser.role === 'kepala-sekolah' ||
    (currentUser.permissions &&
      (currentUser.permissions.includes('*') ||
        currentUser.permissions.includes('attendance.excuses')));

  // Filter Excusals
  const todayStr = '2026-08-23';
  const filteredExcusals = safeExcusals.filter((excuse) => {
    if (!excuse) return false;
    // Tab filter
    if (activeTab === 'today') {
      const eStart = new Date(excuse.start_at).getTime();
      const eEnd = new Date(excuse.end_at).getTime();
      const tStart = new Date(`${todayStr}T00:00:00`).getTime();
      const tEnd = new Date(`${todayStr}T23:59:59`).getTime();
      if (!(eStart <= tEnd && eEnd >= tStart)) return false;
    } else if (activeTab === 'pending') {
      if (excuse.status !== 'pending') return false;
    } else if (activeTab === 'approved') {
      if (excuse.status !== 'approved') return false;
    }

    // Type filter
    if (typeFilter !== 'all' && excuse.type !== typeFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (excuse.student_name || '').toLowerCase().includes(q);
      const matchNis = (excuse.student_number || '').toLowerCase().includes(q);
      const matchReason = (excuse.reason || '').toLowerCase().includes(q);
      const matchClass = excuse.classroom_name?.toLowerCase().includes(q) || false;
      if (!matchName && !matchNis && !matchReason && !matchClass) return false;
    }

    return true;
  });

  const pendingCount = safeExcusals.filter((e) => e && e.status === 'pending').length;
  const approvedCount = safeExcusals.filter((e) => e && e.status === 'approved').length;
  const todayCount = ExcuseService.getTodayExcusals(safeExcusals, todayStr).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = safeStudents.find((s) => s && s.id === Number(formStudentId));
    if (!student || !formReason.trim()) return;

    const newExcuse: StudentExcusal = {
      id: Date.now(),
      student_id: student.id,
      student_name: student.name,
      student_number: student.student_number,
      classroom_name: student.classroom_name,
      dormitory_room_name: student.dormitory_room_name,
      type: formType,
      start_at: formStartAt.includes('T') ? formStartAt : `${formStartAt}T00:00:00`,
      end_at: formEndAt.includes('T') ? formEndAt : `${formEndAt}T23:59:59`,
      reason: formReason.trim(),
      status: formAutoApprove && canApprove ? 'approved' : 'pending',
      notes: formNotes.trim() || undefined,
      approved_by: formAutoApprove && canApprove ? currentUser.name : undefined,
      approved_at: formAutoApprove && canApprove ? new Date().toISOString().replace('T', ' ').slice(0, 19) : undefined,
      created_by: currentUser.name,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    handleAdd(newExcuse);
    setIsCreateModalOpen(false);
    setFormReason('');
    setFormNotes('');
  };

  return (
    <div className="space-y-6 pb-12" id="excuse-manager-view">
      {/* Header Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Manajemen Perizinan Santri
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Izin, Sakit & Dispensasi Santri</h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Pencatatan surat izin keluarga, santri sakit di UKS, dan dispensasi tugas/lomba. Izin yang disetujui otomatis diintegrasikan sebelum penutupan sesi absensi.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 whitespace-nowrap"
              id="btn-create-excuse"
            >
              <Plus className="w-4 h-4 text-[#1F5C45]" />
              <span>Input Izin / Sakit Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 relative z-10">
          <div className="bg-black/25 border border-white/15 backdrop-blur-xs rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 text-amber-300 border border-white/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{pendingCount}</div>
              <div className="text-xs text-emerald-100/80 font-medium">Menunggu Persetujuan</div>
            </div>
          </div>

          <div className="bg-black/25 border border-white/15 backdrop-blur-xs rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 text-emerald-300 border border-white/20">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{approvedCount}</div>
              <div className="text-xs text-emerald-100/80 font-medium">Disetujui Aktif</div>
            </div>
          </div>

          <div className="bg-black/25 border border-white/15 backdrop-blur-xs rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 text-sky-300 border border-white/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{todayCount}</div>
              <div className="text-xs text-emerald-100/80 font-medium">Berlaku Hari Ini</div>
            </div>
          </div>

          <div className="bg-black/25 border border-white/15 backdrop-blur-xs rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 text-purple-300 border border-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{excusals.length}</div>
              <div className="text-xs text-emerald-100/80 font-medium">Total Terdaftar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({excusals.length})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-sky-100 text-sky-900 shadow-xs border border-sky-300 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Hari Ini ({todayCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-100 text-amber-900 shadow-xs border border-amber-300 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu ({pendingCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-emerald-100 text-emerald-900 shadow-xs border border-emerald-300 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Disetujui ({approvedCount})</span>
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-2.5">
          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3.5 py-2.5 appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="all">Semua Jenis Izin</option>
              <option value="sick">Sakit (UKS / Rawat)</option>
              <option value="permission">Izin (Keluarga)</option>
              <option value="dispensation">Dispensasi (Lomba)</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari santri, NIS, alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 font-medium text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Excusals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExcusals.length === 0 ? (
          <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-2xs">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Tidak Ada Data Izin Sesuai Filter</h3>
            <p className="text-xs text-slate-500 mt-1">Coba sesuaikan tab atau kata kunci pencarian di atas.</p>
          </div>
        ) : (
          filteredExcusals.map((excuse) => {
            let statusBadge = { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Disetujui' };
            if (excuse.status === 'pending') {
              statusBadge = { bg: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Menunggu Persetujuan' };
            } else if (excuse.status === 'rejected' || excuse.status === 'cancelled') {
              statusBadge = { bg: 'bg-rose-50 text-rose-800 border-rose-200', label: excuse.status === 'rejected' ? 'Ditolak' : 'Dibatalkan' };
            }

            // Find overlapping sessions for today
            const overlappingSessions = sessions.filter((s) => 
              ExcuseService.isExcuseActiveForSession(excuse, s)
            );

            return (
              <div
                key={excuse.id}
                className={`bg-white border ${
                  excuse.status === 'pending'
                    ? 'border-amber-300 ring-2 ring-amber-100 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                } rounded-2xl p-5 flex flex-col justify-between transition shadow-sm hover:shadow-md`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        excuse.type === 'sick'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : excuse.type === 'permission'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {excuse.type === 'sick' ? '🩺 Sakit (UKS)' : excuse.type === 'permission' ? '📝 Izin Keluarga' : '🏆 Dispensasi'}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Student Info */}
                  <div className="mb-3">
                    <h3 className="text-base font-black text-slate-900 leading-snug">{excuse.student_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {excuse.student_number}
                      </span>
                      {excuse.classroom_name && (
                        <span className="flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Building className="w-3 h-3 text-slate-400" />
                          {excuse.classroom_name}
                        </span>
                      )}
                      {excuse.dormitory_room_name && (
                        <span className="flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Home className="w-3 h-3 text-slate-400" />
                          {excuse.dormitory_room_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reason Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alasan:</div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">{excuse.reason}</p>
                    {excuse.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic border-t border-slate-200 pt-1">
                        Catatan: {excuse.notes}
                      </p>
                    )}
                  </div>

                  {/* Time Scope */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mulai:</span>
                      <span className="font-mono font-bold text-slate-800">{excuse.start_at.replace('T', ' ').slice(0, 16)} WIB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Sampai:</span>
                      <span className="font-mono font-bold text-slate-800">{excuse.end_at.replace('T', ' ').slice(0, 16)} WIB</span>
                    </div>
                  </div>

                  {/* Affected Sessions */}
                  {overlappingSessions.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Mencakup {overlappingSessions.length} Sesi Aktif:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {overlappingSessions.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md"
                          >
                            {s.activity_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Dibuat oleh: <span className="text-slate-700 font-bold">{excuse.created_by}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {excuse.status === 'pending' && canApprove && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(excuse.id, 'approved', currentUser?.name || 'Musyrif')}
                          className="px-3 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                          title="Setujui Izin"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(excuse.id, 'rejected')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                          title="Tolak Izin"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </>
                    )}

                    {excuse.status === 'approved' && canApprove && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(excuse.id, 'cancelled')}
                        className="px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                        title="Batalkan Izin yang sudah disetujui"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Excuse Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-[#1F5C45] border border-emerald-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Input Izin / Sakit / Dispensasi</h3>
                  <p className="text-xs text-slate-500">Pencatatan perizinan santri untuk integrasi absensi otomatis</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Santri <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {students.filter(s => s.is_active).map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} (NIS: {st.student_number}) — {st.classroom_name || 'Tanpa Kelas'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jenis Perizinan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('sick')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                      formType === 'sick'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>🩺 Sakit</span>
                    <span className="text-[10px] font-normal text-slate-500">UKS / Rawat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('permission')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                      formType === 'permission'
                        ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>📝 Izin</span>
                    <span className="text-[10px] font-normal text-slate-500">Keluarga</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('dispensation')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                      formType === 'dispensation'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏆 Dispensasi</span>
                    <span className="text-[10px] font-normal text-slate-500">Lomba / Tugas</span>
                  </button>
                </div>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Waktu Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Waktu Berakhir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alasan Perizinan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Contoh: Sakit demam tinggi di UKS / Izin walimah pernikahan keluarga..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Tambahan / Dokumen Keterangan
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="No surat dokter / nama wali / keterangan pengasuh"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Auto approve checkbox */}
              {canApprove && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <input
                    type="checkbox"
                    id="chk-auto-approve"
                    checked={formAutoApprove}
                    onChange={(e) => setFormAutoApprove(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1F5C45] focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="chk-auto-approve" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Langsung Setujui (Status <span className="text-emerald-800 font-bold">Disetujui / Approved</span>) sebagai {currentUser.role}
                  </label>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4 text-[#EADAA2]" />
                  <span>Simpan Perizinan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
