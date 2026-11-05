import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Users, 
  UserCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  QrCode, 
  Radio, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Check, 
  X, 
  Play, 
  CheckSquare, 
  Sparkles, 
  UserPlus, 
  ArrowRightLeft, 
  BookOpen, 
  Info,
  ChevronRight,
  ChevronDown,
  Printer,
  Trash2,
  Edit3
} from 'lucide-react';
import { 
  User, 
  Staff, 
  Extracurricular, 
  TrainingSession, 
  ExtracurricularStaffAssignment, 
  ExtracurricularStaffRole,
  TrainerSubstitution, 
  StaffAttendanceRecord,
  TrainingContextResolution,
  TrainingReconciliationItem
} from '../types';
import { StaffIdentityResolver } from '../services/staffIdentityResolver';
import { StaffAttendanceService } from '../services/staffAttendanceService';
import { TrainingSessionService } from '../services/trainingSessionService';
import { ExtracurricularStaffAssignmentService } from '../services/extracurricularStaffAssignmentService';
import { TrainerSubstitutionService } from '../services/trainerSubstitutionService';
import { TrainingAttendanceContextResolver } from '../services/trainingAttendanceContextResolver';
import { TrainingRealizationService } from '../services/trainingRealizationService';
import { TrainingAttendanceMetricService } from '../services/trainingAttendanceMetricService';
import { AudioFeedbackService } from '../services/audioFeedbackService';
import { TrainingJournalService } from '../services/trainingJournalService';
import { PersonAvatar } from './common/PersonAvatar';

interface TrainerAttendanceViewProps {
  currentUser?: User;
}

type TabType = 'MONITORING' | 'ASSIGNMENTS' | 'SUBSTITUTIONS' | 'JOURNAL' | 'SCANNER' | 'RECONCILIATION';

export const TrainerAttendanceView: React.FC<TrainerAttendanceViewProps> = ({
  currentUser = { id: 1, name: 'Pembina Ekskul', role: 'admin', email: 'pembina@pesantren.id', username: 'pembina', is_active: true }
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('MONITORING');
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  
  // Data States
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [assignments, setAssignments] = useState<ExtracurricularStaffAssignment[]>([]);
  const [substitutions, setSubstitutions] = useState<TrainerSubstitution[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  
  // Filter States
  const [filterEkskul, setFilterEkskul] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scanner Terminal States
  const [scannerInput, setScannerInput] = useState<string>('');
  const [selectedSessionForScan, setSelectedSessionForScan] = useState<number | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ success: boolean; message: string; mode?: string } | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);

  // Modal States
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignEkskulId, setAssignEkskulId] = useState<number>(1);
  const [assignStaffId, setAssignStaffId] = useState<number>(1);
  const [assignRole, setAssignRole] = useState<ExtracurricularStaffRole>('coach');
  const [assignIsPrimary, setAssignIsPrimary] = useState<boolean>(true);

  // Substitution Modal
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [subEkskulId, setSubEkskulId] = useState<number>(1);
  const [subOriginalStaffId, setSubOriginalStaffId] = useState<number>(1);
  const [subSubstituteStaffId, setSubSubstituteStaffId] = useState<number>(2);
  const [subDate, setSubDate] = useState<string>(selectedDate);
  const [subReason, setSubReason] = useState<string>('Tugas dinas luar pesantren');

  // Journal Modal
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);
  const [selectedSessionForJournal, setSelectedSessionForJournal] = useState<TrainingSession | null>(null);
  const [journalTopic, setJournalTopic] = useState<string>('');
  const [journalStudentCount, setJournalStudentCount] = useState<number>(20);
  const [journalNotes, setJournalNotes] = useState<string>('');

  // Refresh All Data
  const refreshData = () => {
    setStaffList(StaffIdentityResolver.getStaffList());
    setTrainingSessions(TrainingSessionService.getTrainingSessions(selectedDate));
    setAssignments(ExtracurricularStaffAssignmentService.getAssignments());
    setSubstitutions(TrainerSubstitutionService.getSubstitutions());
    setAttendanceRecords(StaffAttendanceService.getRecords());
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate]);

  // Daily Summary Metric
  const summary = useMemo(() => {
    return TrainingAttendanceMetricService.calculateSummary({ date: selectedDate });
  }, [selectedDate, trainingSessions, attendanceRecords]);

  // Reconciliation items
  const reconciliationItems = useMemo(() => {
    return TrainingRealizationService.getReconciliationList(selectedDate);
  }, [selectedDate, trainingSessions, attendanceRecords]);

  // Unique Extracurricular List
  const extracurriculars = useMemo(() => {
    const map = new Map<number, string>();
    trainingSessions.forEach(s => map.set(s.extracurricular_id, s.extracurricular_name));
    assignments.forEach(a => map.set(a.extracurricular_id, a.extracurricular_name || `Ekskul #${a.extracurricular_id}`));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [trainingSessions, assignments]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return trainingSessions.filter(s => {
      if (filterEkskul !== 'ALL' && s.extracurricular_id.toString() !== filterEkskul) return false;
      if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = s.extracurricular_name.toLowerCase().includes(query);
        const matchCoach = s.primary_staff_name?.toLowerCase().includes(query) || false;
        const matchLoc = s.location?.toLowerCase().includes(query) || false;
        if (!matchName && !matchCoach && !matchLoc) return false;
      }
      return true;
    });
  }, [trainingSessions, filterEkskul, filterStatus, searchQuery]);

  // Handle Generate Daily Sessions
  const handleGenerateSessions = () => {
    const result = TrainingSessionService.generateSessionsForDate({ 
      date: selectedDate, 
      operatorName: currentUser?.name || 'Pembina' 
    });
    alert(`Hasil Sinkronisasi Sesi Latihan:\n- Jadwal Terdeteksi: ${result.schedules_found}\n- Sesi Dibuat: ${result.sessions_created}\n- Sesi Sudah Ada: ${result.sessions_existing}\n- Substitusi Diterapkan: ${result.substitutions_applied}`);
    refreshData();
  };

  // Handle Fast Scan Terminal
  const handleProcessScan = (method: 'qr' | 'rfid', overrideStaffId?: number) => {
    let targetStaff: Staff | undefined;
    if (overrideStaffId) {
      targetStaff = staffList.find(s => s.id === overrideStaffId);
    } else if (scannerInput.trim()) {
      targetStaff = StaffIdentityResolver.resolveByIdentifier(scannerInput.trim()) || undefined;
    }

    if (!targetStaff) {
      AudioFeedbackService.playError();
      setScanFeedback({ success: false, message: 'Data staf/pelatih tidak ditemukan dengan identitas tersebut.' });
      return;
    }

    // Determine target session
    let targetSessionId = selectedSessionForScan;
    if (!targetSessionId) {
      // Find open or nearest session for this coach today
      const todaySessions = trainingSessions.filter(s => s.status !== 'cancelled');
      const coachSession = todaySessions.find(s => 
        s.primary_staff_id === targetStaff!.id || 
        s.actual_primary_staff_id === targetStaff!.id ||
        assignments.some(a => a.extracurricular_id === s.extracurricular_id && a.staff_id === targetStaff!.id && a.is_active)
      );
      if (coachSession) {
        targetSessionId = coachSession.id;
      } else if (todaySessions.length > 0) {
        targetSessionId = todaySessions[0].id;
      }
    }

    if (!targetSessionId) {
      AudioFeedbackService.playError();
      setScanFeedback({ success: false, message: 'Tidak ada sesi latihan aktif yang cocok untuk presensi pelatih ini.' });
      return;
    }

    setIsProcessingScan(true);
    setScanFeedback(null);

    try {
      const res = StaffAttendanceService.recordTrainingAttendanceScan({
        staffId: targetStaff.id,
        sessionId: targetSessionId,
        method,
        operatorName: currentUser?.name || 'Gate Terminal'
      });

      if (res.success) {
        AudioFeedbackService.playSuccess();
        setScanFeedback({ success: true, message: res.message, mode: res.mode });
        setScannerInput('');
        refreshData();
      } else {
        AudioFeedbackService.playError();
        setScanFeedback({ success: false, message: res.message });
      }
    } catch (e: any) {
      AudioFeedbackService.playError();
      setScanFeedback({ success: false, message: `Error: ${e.message || e}` });
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Handle Save Staff Assignment
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStaff = staffList.find(s => s.id === assignStaffId);
    const targetEkskul = extracurriculars.find(e => e.id === assignEkskulId);

    if (!targetStaff || !targetEkskul) {
      alert('Pilih data staf dan ekstrakurikuler yang valid.');
      return;
    }

    const res = ExtracurricularStaffAssignmentService.assignStaff({
      extracurricularId: assignEkskulId,
      extracurricularName: targetEkskul.name,
      staffId: targetStaff.id,
      role: assignRole,
      startDate: '2026-07-01',
      isPrimary: assignIsPrimary,
      operatorName: currentUser?.name || 'Admin'
    });

    if (res.success) {
      setShowAssignModal(false);
      refreshData();
      alert('Penugasan pelatih ekstrakurikuler berhasil disimpan.');
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Handle Save Substitution
  const handleSaveSubstitution = (e: React.FormEvent) => {
    e.preventDefault();
    const origStaff = staffList.find(s => s.id === subOriginalStaffId);
    const subStaff = staffList.find(s => s.id === subSubstituteStaffId);
    const targetEkskul = extracurriculars.find(e => e.id === subEkskulId);

    if (!origStaff || !subStaff || !targetEkskul) {
      alert('Pilih data staf asal, staf pengganti, dan ekstrakurikuler yang valid.');
      return;
    }

    const res = TrainerSubstitutionService.assignSubstitution({
      extracurricularId: subEkskulId,
      extracurricularName: targetEkskul.name,
      originalStaffId: origStaff.id,
      substituteStaffId: subStaff.id,
      date: subDate,
      reason: subReason,
      assignedBy: currentUser?.name || 'Pembina'
    });

    if (res.success) {
      setShowSubModal(false);
      refreshData();
      alert('Penggantian pelatih (Inval/Substitusi) berhasil didaftarkan dan diaplikasikan ke sesi terkait.');
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Handle Save Journal
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForJournal) return;

    const res = TrainingRealizationService.submitRealization({
      sessionId: selectedSessionForJournal.id,
      topic: journalTopic,
      studentPresentCount: Number(journalStudentCount),
      activityNotes: journalNotes,
      operatorName: currentUser?.name || 'Pelatih'
    });

    if (res.success) {
      setShowJournalModal(false);
      refreshData();
      alert('Jurnal latihan dan realisasi materi berhasil disimpan.');
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Handle Finalize Attendance
  const handleFinalizeAttendance = () => {
    if (confirm(`Apakah Anda yakin ingin memfinalisasi presensi pelatih/pembina untuk tanggal ${selectedDate}? Sesi yang belum terisi presensi akan otomatis ditandai Alpha.`)) {
      const res = StaffAttendanceService.finalizeTrainingAttendance(selectedDate, currentUser?.name || 'Pembina Ekskul');
      alert(res.message);
      refreshData();
    }
  };

  return (
    <div id="trainer-attendance-container" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735]">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-white/15 border border-white/20 text-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
              Presensi & Inval Pelatih Ekstrakurikuler
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Presensi Pelatih & Pembina Ekstrakurikuler
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-3xl leading-relaxed">
            Manajemen komprehensif kehadiran pelatih, asisten pembina, pergantian pelatih (inval/substitusi), jurnal realisasi materi, verifikasi RFID/QR scanner, dan rekonsiliasi honorarium.
          </p>
        </div>

        {/* Attractive Dropdown Module Selector & Date Action Bar (Disatukan dalam 1 Bar) */}
        {(() => {
          const TRAINER_TABS = [
            { id: 'MONITORING' as TabType, label: 'Monitoring Sesi Latihan', desc: 'Pantau status sesi, jam masuk pelatih & absensi santri', icon: Clock, badge: `${summary.total_sessions} Sesi` },
            { id: 'ASSIGNMENTS' as TabType, label: 'Penugasan Pelatih & Pembina', desc: 'Matriks penugasan pelatih utama, asisten & jenis ekskul', icon: Users, badge: `${assignments.length} Penugasan` },
            { id: 'SUBSTITUTIONS' as TabType, label: 'Inval / Pengganti Pelatih', desc: 'Penggantian pelatih berhalangan & pelimpahan wewenang', icon: ArrowRightLeft, badge: `${substitutions.length} Inval` },
            { id: 'JOURNAL' as TabType, label: 'Jurnal Realisasi Materi', desc: 'Catatan materi latihan, foto dokumentasi & verifikasi', icon: BookOpen, badge: `${summary.realized_sessions} Jurnal` },
            { id: 'SCANNER' as TabType, label: 'Terminal Scan Cepat (QR/RFID)', desc: 'Terminal pemindai presensi cepat pelatih di lapangan', icon: QrCode, badge: 'Fast-Tap' },
            { id: 'RECONCILIATION' as TabType, label: 'Rekonsiliasi & Audit Honor', desc: 'Audit jam melatih, validasi honorarium & ekspor rekap', icon: ShieldCheck, badge: 'Audit Valid' },
          ];
          const currentTabInfo = TRAINER_TABS.find(t => t.id === activeTab) || TRAINER_TABS[0];
          const CurrentTabIcon = currentTabInfo.icon;

          return (
            <div className="mt-5 pt-4 border-t border-white/15">
              {/* Single Unified White Toolbar Bar (Side-by-Side) */}
              <div className="bg-white rounded-2xl p-2 shadow-lg border border-white/30 flex flex-row items-center justify-between gap-3 relative flex-wrap sm:flex-nowrap">
                {/* Left: Dropdown Selector Trigger */}
                <div className="relative inline-block flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsTabDropdownOpen(prev => !prev)}
                    className="w-full flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs sm:text-sm cursor-pointer active:scale-98 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#1F5C45]/15 text-[#1F5C45] flex items-center justify-center shrink-0">
                        <CurrentTabIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 truncate">{currentTabInfo.label}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#8c6d12] border border-[#C9A227]/30 shrink-0">
                            {currentTabInfo.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal truncate max-w-[280px] sm:max-w-[420px]">
                          {currentTabInfo.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform shrink-0 ml-2 ${isTabDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Floating Popover Menu */}
                  {isTabDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsTabDropdownOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Pilih Modul Presensi Pelatih
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            6 Sub-Modul
                          </span>
                        </div>

                        <div className="p-1.5 space-y-1 max-h-[380px] overflow-y-auto">
                          {TRAINER_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab(tab.id);
                                  setIsTabDropdownOpen(false);
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
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs ${isSelected ? 'font-black text-emerald-900' : 'font-bold text-slate-800'}`}>
                                      {tab.label}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                      isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {tab.badge}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {tab.desc}
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

                {/* Right: Date Selector & Fast Actions inside the same bar on the right */}
                <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-200 rounded-xl shrink-0 ml-auto">
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
                    onClick={handleGenerateSessions}
                    title="Generate / Sinkronkan Sesi Latihan Hari Ini"
                    className="px-3.5 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[32px] active:scale-95 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#EADAA2]" />
                    <span>Generate Sesi</span>
                  </button>
                  <button 
                    onClick={refreshData}
                    title="Refresh Data"
                    className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Daily KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs transition hover:shadow-sm">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Total Sesi Latihan</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{summary.total_sessions}</div>
          <span className="text-xs text-slate-500 font-medium mt-0.5 block">Terjadwal Hari Ini</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs transition hover:shadow-sm">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Hadir Tepat Waktu</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{summary.present_count}</div>
          <span className="text-xs text-emerald-800 font-bold mt-0.5 block">{Math.round(summary.punctuality_rate)}% Ketepatan</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs transition hover:shadow-sm">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Terlambat Melatih</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{summary.late_count}</div>
          <span className="text-xs text-amber-800 font-medium mt-0.5 block">Lewat Batas Waktu</span>
        </div>

        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 shadow-2xs transition hover:shadow-sm">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Pelatih Pengganti (Inval)</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">{summary.substituted_count}</div>
          <span className="text-xs text-indigo-800 font-medium mt-0.5 block">Substitusi Resmi</span>
        </div>

        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 shadow-2xs transition hover:shadow-sm">
          <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">Jurnal Terisi</span>
          <div className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">{summary.realized_sessions}</div>
          <span className="text-xs text-sky-800 font-medium mt-0.5 block">{Math.round(summary.realization_rate)}% Keterisian</span>
        </div>

        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-2xs transition hover:shadow-sm">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Alpha / Belum Hadir</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{summary.absent_count}</div>
          <span className="text-xs text-rose-800 font-medium mt-0.5 block">Perlu Tindak Lanjut</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MONITORING SESI LATIHAN */}
      {/* ========================================================================= */}
      {activeTab === 'MONITORING' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Cari ekskul, pelatih, lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition"
                />
              </div>

              <select
                value={filterEkskul}
                onChange={(e) => setFilterEkskul(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Ekstrakurikuler</option>
                {extracurriculars.map(e => (
                  <option key={e.id} value={e.id.toString()}>{e.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Status Sesi</option>
                <option value="scheduled">Terjadwal</option>
                <option value="open">Sedang Berlangsung (Open)</option>
                <option value="completed">Selesai (Completed)</option>
                <option value="substituted">Disubstitusi (Inval)</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleFinalizeAttendance}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-rose-600" />
                <span>Finalisasi Presensi Latihan</span>
              </button>
              <button
                onClick={() => {
                  setSubDate(selectedDate);
                  setShowSubModal(true);
                }}
                className="px-3.5 py-2 bg-[#12372A] hover:bg-[#1a4a39] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#C9A227]" />
                <span>Tambah Inval Pelatih</span>
              </button>
            </div>
          </div>

          {/* Training Sessions Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Daftar Sesi Latihan Ekstrakurikuler ({filteredSessions.length})
              </h3>
              <span className="text-xs text-zinc-500 font-medium">Tanggal: {selectedDate}</span>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Award className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="font-bold text-sm text-zinc-700">Tidak ada sesi latihan terjadwal untuk kriteria ini.</p>
                <p className="text-xs text-zinc-400 mt-1">Klik tombol "Generate Sesi" di kanan atas untuk membuat sesi dari jadwal rutin ekstrakurikuler.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Ekstrakurikuler & Lokasi</th>
                      <th className="py-3 px-4">Jadwal Jam</th>
                      <th className="py-3 px-4">Pelatih Utama / Pengganti</th>
                      <th className="py-3 px-4">Presensi Melatih</th>
                      <th className="py-3 px-4">Jurnal & Materi</th>
                      <th className="py-3 px-4">Status Sesi</th>
                      <th className="py-3 px-4 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredSessions.map(session => {
                      const trainerRecord = attendanceRecords.find(
                        r => r.attendance_type === 'training' && r.context_id === session.id
                      );
                      const isSub = Boolean(session.substitution_id || (session.actual_primary_staff_id && session.actual_primary_staff_id !== session.primary_staff_id));

                      return (
                        <tr key={session.id} className="hover:bg-indigo-50/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                              <span>{session.extracurricular_name}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-medium">
                              Lokasi: <span className="font-semibold text-zinc-700">{session.location || 'Lapangan Utama'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-zinc-800">
                              {session.scheduled_start_at} - {session.scheduled_end_at}
                            </div>
                            <span className="text-[10px] text-zinc-400">Toleransi +15 menit</span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-900">
                              {session.actual_primary_staff_name || session.primary_staff_name || 'Belum Ditugaskan'}
                            </div>
                            {isSub ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mt-0.5">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                Pengganti (Asli: {session.primary_staff_name})
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-medium">Pelatih Resmi</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {trainerRecord ? (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    trainerRecord.status === 'present' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : trainerRecord.status === 'late'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    <Check className="w-3 h-3" />
                                    {trainerRecord.status === 'present' ? 'Hadir Tepat' : trainerRecord.status === 'late' ? `Terlambat ${trainerRecord.late_minutes}m` : trainerRecord.status.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-500 mt-1">
                                  In: {trainerRecord.check_in_at ? trainerRecord.check_in_at.substring(11, 16) : '-'} | 
                                  Out: {trainerRecord.check_out_at ? trainerRecord.check_out_at.substring(11, 16) : '-'}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600">
                                <Clock className="w-2.5 h-2.5" />
                                Belum Scan
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {session.realization_status === 'realized' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  <BookOpen className="w-2.5 h-2.5" />
                                  Terisi ({session.student_present_count || 0} Santri)
                                </span>
                                <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                  {session.topic || 'Materi tercatat'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-medium italic">
                                Belum Mengisi Jurnal
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              session.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : session.status === 'open'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : session.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800 line-through'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}>
                              {session.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedSessionForScan(session.id);
                                  setActiveTab('SCANNER');
                                }}
                                title="Presensi Pelatih Sesi Ini"
                                className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSessionForJournal(session);
                                  setJournalTopic(session.topic || '');
                                  setJournalStudentCount(session.student_present_count || 20);
                                  setJournalNotes(session.activity_notes || '');
                                  setShowJournalModal(true);
                                }}
                                title="Isi Jurnal Materi & Absensi Santri"
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENUGASAN PELATIH & PEMBINA EKSKUL */}
      {/* ========================================================================= */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Matriks Penugasan Pelatih & Pembina Resmi
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Pemetaan resmi SDM pelatih utama, instruktur luar, asisten pembina, dan pembina pendamping per ekstrakurikuler.
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[36px]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah Penugasan Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ekstrakurikuler</th>
                  <th className="py-3 px-4">Nama Pelatih / Pembina</th>
                  <th className="py-3 px-4">NIP / Identitas</th>
                  <th className="py-3 px-4">Peran & Tanggung Jawab</th>
                  <th className="py-3 px-4">Status Penugasan</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {assignments.map(a => (
                  <tr key={a.id} className="hover:bg-zinc-50/80 transition">
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {a.extracurricular_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {a.staff_name.charAt(0)}
                      </div>
                      {a.staff_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600">
                      {a.staff_number || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        a.is_primary 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {a.role_label || a.role} {a.is_primary && '★ (Utama)'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {a.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                      {a.start_date} s.d {a.end_date || 'Aktif'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVAL / PENGGANTI PELATIH */}
      {/* ========================================================================= */}
      {activeTab === 'SUBSTITUTIONS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                Manajemen Pergantian Pelatih (Inval / Substitusi)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Pengalihan hak presensi dan honorarium mengajar kepada pelatih pengganti saat pelatih utama berhalangan hadir.
              </p>
            </div>
            <button
              onClick={() => setShowSubModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Daftarkan Inval Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            {substitutions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Belum ada substitusi pelatih aktif.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ekstrakurikuler</th>
                    <th className="py-3 px-4">Pelatih Utama (Berhalangan)</th>
                    <th className="py-3 px-4">Pelatih Pengganti (Inval)</th>
                    <th className="py-3 px-4">Tanggal Inval</th>
                    <th className="py-3 px-4">Alasan</th>
                    <th className="py-3 px-4">Status Inval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {substitutions.map(sub => (
                    <tr key={sub.id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        {sub.extracurricular_name}
                      </td>
                      <td className="py-3 px-4 text-zinc-800 font-medium">
                        {sub.original_staff_name}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-700 flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {sub.substitute_staff_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 text-[11px]">
                        {sub.date}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 italic">
                        {sub.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {sub.status === 'active' ? 'Aktif Berlaku' : 'Selesai / Non-Aktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: JURNAL REALISASI MATERI */}
      {/* ========================================================================= */}
      {activeTab === 'JOURNAL' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm">
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Jurnal Realisasi Materi & Absensi Santri Ekstrakurikuler
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dokumentasi kurikulum latihan yang disampaikan pelatih, ringkasan santri hadir, serta catatan evaluasi perkembangan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainingSessions.map(session => (
              <div key={session.id} className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm text-zinc-900">{session.extracurricular_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      session.realization_status === 'realized' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {session.realization_status === 'realized' ? 'Jurnal Terisi' : 'Belum Terisi'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Pelatih: <span className="font-bold text-zinc-800">{session.actual_primary_staff_name || session.primary_staff_name}</span>
                  </p>
                  <p className="text-xs font-mono text-zinc-600 mt-0.5">
                    {session.scheduled_start_at} - {session.scheduled_end_at} | {session.location || 'Lapangan Utama'}
                  </p>

                  {session.realization_status === 'realized' ? (
                    <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 text-xs space-y-1">
                      <div className="font-bold text-zinc-800">Materi Terlaksana:</div>
                      <div className="text-zinc-600">{session.topic}</div>
                      <div className="text-zinc-500 font-semibold pt-1">
                        Santri Hadir: <span className="text-indigo-600 font-bold">{session.student_present_count || 0} Orang</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/40 text-xs text-amber-800">
                      Pelatih belum memasukkan materi dan catatan latihan hari ini.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedSessionForJournal(session);
                    setJournalTopic(session.topic || '');
                    setJournalStudentCount(session.student_present_count || 20);
                    setJournalNotes(session.activity_notes || '');
                    setShowJournalModal(true);
                  }}
                  className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {session.realization_status === 'realized' ? 'Ubah / Lengkapi Jurnal' : 'Entri Jurnal Latihan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SCANNER TERMINAL */}
      {/* ========================================================================= */}
      {activeTab === 'SCANNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-600" />
                    Terminal Scan Presensi Pelatih / Pembina (QR & RFID)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Scan kartu RFID atau QR barcode pelatih saat datang dan pulang melatih ekstrakurikuler.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black rounded-xl">
                  Gerbang Ekskul #1
                </span>
              </div>

              {/* Target Session Selection */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Sesi Latihan Sasaran:
                </label>
                <select
                  value={selectedSessionForScan || ''}
                  onChange={(e) => setSelectedSessionForScan(Number(e.target.value) || null)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Auto Resolve (Otomatis deteksi sesi pelatih hari ini) --</option>
                  {trainingSessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.extracurricular_name} ({s.scheduled_start_at} - {s.scheduled_end_at}) | Pelatih: {s.actual_primary_staff_name || s.primary_staff_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scan Bar Input */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <QrCode className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3" />
                  <input 
                    type="text"
                    placeholder="Tempelkan Kartu RFID atau Masukkan NIP Pelatih..."
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleProcessScan('rfid');
                    }}
                    className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border-2 border-indigo-300 rounded-2xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
                <button
                  onClick={() => handleProcessScan('rfid')}
                  disabled={isProcessingScan}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  <Radio className="w-4 h-4" />
                  Scan Masuk / Keluar
                </button>
              </div>

              {/* Scan Feedback Alert */}
              {scanFeedback && (
                <div className={`mt-4 p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
                  scanFeedback.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  {scanFeedback.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
                  <div>
                    <div>{scanFeedback.message}</div>
                    {scanFeedback.mode && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md mt-1 inline-block">
                        Mode: {scanFeedback.mode}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tap Simulator */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-md">
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider mb-3">
                Simulasi Tap Cepat Pelatih Ekstrakurikuler
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {staffList.filter(s => s.staff_type === 'trainer' || s.staff_type === 'teacher').slice(0, 6).map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => handleProcessScan('rfid', staff.id)}
                    className="p-3 bg-zinc-50 hover:bg-indigo-50/60 border border-zinc-200/80 rounded-2xl text-left transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-zinc-900 group-hover:text-indigo-700">{staff.name}</div>
                      <div className="text-[10px] font-mono text-zinc-500">NIP: {staff.staff_number} | {staff.staff_type.toUpperCase()}</div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">
                      Tap Kartu
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Trainer Attendance Stream */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-md flex flex-col h-[520px]">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Aktivitas Presensi Melatih Hari Ini
            </h4>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {attendanceRecords.filter(r => r.attendance_type === 'training' && r.attendance_date === selectedDate).length === 0 ? (
                <div className="text-center py-16 text-zinc-400 text-xs">
                  Belum ada presensi pelatih masuk hari ini.
                </div>
              ) : (
                attendanceRecords
                  .filter(r => r.attendance_type === 'training' && r.attendance_date === selectedDate)
                  .map(record => (
                    <div key={record.id} className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 text-xs">
                      <div className="flex items-center justify-between font-bold text-zinc-900">
                        <span>{record.staff_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          record.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {record.status === 'present' ? 'Tepat Waktu' : `Terlambat ${record.late_minutes}m`}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        {record.context_name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                        <span>In: {record.check_in_at ? record.check_in_at.substring(11, 16) : '-'}</span>
                        <span>Out: {record.check_out_at ? record.check_out_at.substring(11, 16) : 'Sedang Melatih'}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REKONSILIASI & AUDIT HONOR */}
      {/* ========================================================================= */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Rekonsiliasi Realisasi Latihan vs Presensi Pelatih
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Audit otomatis untuk memastikan kesesuaian antara kehadiran fisik pelatih, keterisian jurnal, dan kelayakan honorarium.
              </p>
            </div>
            <button
              onClick={() => alert('Laporan rekonsiliasi siap diexport ke format Excel/PDF.')}
              className="px-3.5 py-1.5 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-900 transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Export Laporan
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ekstrakurikuler</th>
                  <th className="py-3 px-4">Pelatih Bertugas</th>
                  <th className="py-3 px-4">Presensi Fisik (Tap)</th>
                  <th className="py-3 px-4">Santri Hadir</th>
                  <th className="py-3 px-4">Status Realisasi</th>
                  <th className="py-3 px-4">Status Audit Rekonsiliasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {reconciliationItems.map(item => (
                  <tr key={item.session_id} className="hover:bg-zinc-50/80 transition">
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {item.extracurricular_name}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800">
                      {item.trainer_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.trainer_attended ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.trainer_attended ? '✓ Tercatat' : '✗ Tidak Ada'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {item.students_present} / {item.students_eligible} Santri
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                        item.realization_status === 'realized'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.realization_status === 'realized' ? 'Terlaksana' : item.realization_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.needs_review ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {item.review_reason || 'Perlu Review'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Valid & Layak Honor
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH PENUGASAN PELATIH */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-base font-black text-zinc-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Tambah Penugasan Pelatih Ekstrakurikuler
            </h3>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Ekstrakurikuler:</label>
                <select
                  value={assignEkskulId}
                  onChange={(e) => setAssignEkskulId(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                >
                  {extracurriculars.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Staf / Pelatih:</label>
                <select
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.staff_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Peran:</label>
                <select
                  value={assignRole}
                  onChange={(e: any) => setAssignRole(e.target.value)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="coach">Pelatih Utama (Head Coach)</option>
                  <option value="assistant_coach">Asisten Pelatih</option>
                  <option value="supervisor">Pembina Pendamping (Ustadz)</option>
                  <option value="guest_trainer">Instruktur Tamu / Kejuruan Luar</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_primary_check" 
                  checked={assignIsPrimary} 
                  onChange={(e) => setAssignIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="is_primary_check" className="text-xs font-bold text-zinc-700 cursor-pointer">
                  Jadikan Pelatih Utama Default Sesi
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INVAL / PENGGANTI PELATIH */}
      {/* ========================================================================= */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-base font-black text-zinc-900 mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              Daftarkan Pelatih Pengganti (Inval)
            </h3>

            <form onSubmit={handleSaveSubstitution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Ekstrakurikuler:</label>
                <select
                  value={subEkskulId}
                  onChange={(e) => setSubEkskulId(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                >
                  {extracurriculars.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Pelatih Utama (Berhalangan):</label>
                <select
                  value={subOriginalStaffId}
                  onChange={(e) => setSubOriginalStaffId(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.staff_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Pelatih Pengganti (Inval):</label>
                <select
                  value={subSubstituteStaffId}
                  onChange={(e) => setSubSubstituteStaffId(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.staff_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Tanggal Inval:</label>
                <input 
                  type="date" 
                  value={subDate} 
                  onChange={(e) => setSubDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Alasan Penggantian:</label>
                <input 
                  type="text" 
                  value={subReason} 
                  onChange={(e) => setSubReason(e.target.value)}
                  placeholder="Misal: Sakit, Tugas Luar, Izin Cuti..."
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  Simpan Inval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ENTRI JURNAL MATERI */}
      {/* ========================================================================= */}
      {showJournalModal && selectedSessionForJournal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-base font-black text-zinc-900 mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Entri Jurnal Materi & Realisasi Latihan
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {selectedSessionForJournal.extracurricular_name} ({selectedSessionForJournal.scheduled_start_at} - {selectedSessionForJournal.scheduled_end_at})
            </p>

            <form onSubmit={handleSaveJournal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Materi / Kurikulum Latihan yang Disampaikan:</label>
                <textarea 
                  rows={3}
                  value={journalTopic}
                  onChange={(e) => setJournalTopic(e.target.value)}
                  placeholder="Misal: Teknik dasar passing & shooting, latihan fisik kardio 30 menit..."
                  required
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl p-3 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Jumlah Santri yang Hadir:</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={journalStudentCount}
                  onChange={(e) => setJournalStudentCount(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Catatan Evaluasi / Hambatan (Opsional):</label>
                <input 
                  type="text"
                  value={journalNotes}
                  onChange={(e) => setJournalNotes(e.target.value)}
                  placeholder="Misal: Lapangan sedikit basah karena hujan..."
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  Simpan Jurnal Latihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
