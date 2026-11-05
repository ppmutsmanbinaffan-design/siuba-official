import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  BookOpen, 
  Award, 
  QrCode, 
  Radio, 
  FileText, 
  Download, 
  Plus, 
  Edit3, 
  Search, 
  Filter, 
  CheckSquare, 
  XSquare, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  LogOut,
  LogIn,
  Layers,
  ChevronRight,
  Briefcase,
  History,
  Trash2,
  Lock,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { 
  Staff, 
  StaffAttendanceRecord, 
  StaffType, 
  StaffEmploymentStatus,
  StaffAttendanceStatus, 
  StaffAbsenceRequest, 
  StaffWorkSchedule, 
  StaffAttendanceRecordHistory,
  User, 
  AttendanceSession,
  Gender
} from '../types';
import { StaffIdentityResolver } from '../services/staffIdentityResolver';
import { StaffAttendanceService } from '../services/staffAttendanceService';
import { StaffAttendanceMetricService } from '../services/staffAttendanceMetricService';
import { StaffWorkScheduleResolver } from '../services/staffWorkScheduleResolver';
import { AudioFeedbackService } from '../services/audioFeedbackService';

interface StaffAttendanceViewProps {
  currentUser?: User;
  sessions?: AttendanceSession[];
}

type TabType = 'DASHBOARD' | 'DAILY' | 'LEAVE' | 'SCHEDULES' | 'MASTER' | 'REPORTS' | 'ROADMAP';

export const StaffAttendanceView: React.FC<StaffAttendanceViewProps> = ({
  currentUser = { id: 1, name: 'Admin', role: 'admin', email: 'admin@pesantren.id', username: 'admin', is_active: true },
  sessions = []
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [records, setRecords] = useState<StaffAttendanceRecord[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<StaffAbsenceRequest[]>([]);
  const [schedules, setSchedules] = useState<StaffWorkSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Scanner & Modal States
  const [scannerInput, setScannerInput] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<{ success: boolean; message: string; mode?: string } | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);

  // Manual Attendance Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualStaffId, setManualStaffId] = useState<number>(1);
  const [manualAction, setManualAction] = useState<'check_in' | 'check_out' | 'both'>('both');
  const [manualCheckInTime, setManualCheckInTime] = useState<string>('06:55');
  const [manualCheckOutTime, setManualCheckOutTime] = useState<string>('16:05');
  const [manualStatus, setManualStatus] = useState<StaffAttendanceStatus>('present');
  const [manualReason, setManualReason] = useState<string>('');

  // Correction Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<StaffAttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<StaffAttendanceStatus>('present');
  const [correctionCheckIn, setCorrectionCheckIn] = useState<string>('');
  const [correctionCheckOut, setCorrectionCheckOut] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // History Audit Modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedRecordForHistory, setSelectedRecordForHistory] = useState<StaffAttendanceRecord | null>(null);
  const [recordHistories, setRecordHistories] = useState<StaffAttendanceRecordHistory[]>([]);

  // Staff Master Modals
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffFormName, setStaffFormName] = useState<string>('');
  const [staffFormNumber, setStaffFormNumber] = useState<string>('');
  const [staffFormGender, setStaffFormGender] = useState<Gender>('male');
  const [staffFormType, setStaffFormType] = useState<StaffType>('teacher');
  const [staffFormEmpStatus, setStaffFormEmpStatus] = useState<StaffEmploymentStatus>('permanent');
  const [staffFormDepartment, setStaffFormDepartment] = useState<string>('');
  const [staffFormPosition, setStaffFormPosition] = useState<string>('');
  const [staffFormPhone, setStaffFormPhone] = useState<string>('');
  const [staffFormEmail, setStaffFormEmail] = useState<string>('');
  const [staffFormRfid, setStaffFormRfid] = useState<string>('');
  const [staffFormRequiresDaily, setStaffFormRequiresDaily] = useState<boolean>(true);

  // Assign RFID Modal
  const [showAssignRfidModal, setShowAssignRfidModal] = useState<boolean>(false);
  const [targetStaffForRfid, setTargetStaffForRfid] = useState<Staff | null>(null);
  const [rfidInputValue, setRfidInputValue] = useState<string>('');

  // Absence Requests Modal
  const [showAbsenceModal, setShowAbsenceModal] = useState<boolean>(false);
  const [absenceStaffId, setAbsenceStaffId] = useState<number>(1);
  const [absenceType, setAbsenceType] = useState<'permission' | 'sick' | 'leave' | 'official_duty'>('permission');
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [absenceStartDate, setAbsenceStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [absenceEndDate, setAbsenceEndDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [absenceAutoApprove, setAbsenceAutoApprove] = useState<boolean>(true);

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<StaffWorkSchedule | null>(null);
  const [scheduleCheckInOpen, setScheduleCheckInOpen] = useState<string>('06:00');
  const [scheduleStartAt, setScheduleStartAt] = useState<string>('07:00');
  const [scheduleLateAfter, setScheduleLateAfter] = useState<string>('07:15');
  const [scheduleCheckOutOpen, setScheduleCheckOutOpen] = useState<string>('15:30');
  const [scheduleEndAt, setScheduleEndAt] = useState<string>('16:00');
  const [scheduleIsWorkDay, setScheduleIsWorkDay] = useState<boolean>(true);

  // Load Data
  const refreshData = () => {
    setStaffList(StaffIdentityResolver.getStaffList());
    setRecords(StaffAttendanceService.getRecords());
    setAbsenceRequests(StaffAttendanceService.getAbsenceRequests());
    setSchedules(StaffWorkScheduleResolver.getSchedules());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Metrics Calculation
  const dailySummary = useMemo(() => {
    return StaffAttendanceMetricService.calculateDailySummary(selectedDate);
  }, [selectedDate, records, staffList]);

  // Filtered Staff & Daily Records
  const filteredDailyRecords = useMemo(() => {
    const daily = records.filter(r => r.attendance_date === selectedDate && r.attendance_type === 'daily');
    return staffList.filter(s => {
      if (filterType !== 'ALL' && s.staff_type !== filterType) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.staff_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).map(s => {
      const record = daily.find(r => r.staff_id === s.id);
      const isWorkDay = StaffWorkScheduleResolver.isWorkingDay(s, selectedDate);
      const scheduleDetail = StaffWorkScheduleResolver.resolveScheduleDetail(s, selectedDate);
      return { staff: s, record, isWorkDay, scheduleDetail };
    });
  }, [records, staffList, selectedDate, filterType, searchQuery]);

  // Handle Fast Scan Terminal (QR / RFID / NIP)
  const handleProcessScan = (method: 'qr' | 'rfid' | 'manual', overrideInput?: string) => {
    const input = overrideInput || scannerInput;
    if (!input.trim()) return;

    setIsProcessingScan(true);
    setScanFeedback(null);

    try {
      const res = StaffAttendanceService.recordDailyScan({
        identifier: input.trim(),
        method,
        operatorName: currentUser?.name || 'Admin',
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
    } catch (err: any) {
      AudioFeedbackService.playError();
      setScanFeedback({ success: false, message: `Terjadi kesalahan: ${err.message || err}` });
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Quick Action: Tapping Staff
  const handleQuickTap = (staff: Staff) => {
    handleProcessScan('manual', staff.staff_number);
  };

  // Open Manual Entry Modal
  const handleOpenManualModal = (staff?: Staff) => {
    if (staff) setManualStaffId(staff.id);
    else if (staffList.length > 0) setManualStaffId(staffList[0].id);
    setManualAction('both');
    setManualCheckInTime('06:55');
    setManualCheckOutTime('16:05');
    setManualStatus('present');
    setManualReason('');
    setShowManualModal(true);
  };

  // Save Manual Attendance
  const handleSaveManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReason.trim()) {
      alert('Alasan pencatatan manual wajib diisi.');
      return;
    }

    const res = StaffAttendanceService.recordManualAttendance({
      staffId: manualStaffId,
      attendanceDate: selectedDate,
      action: manualAction,
      checkInTime: manualAction === 'check_in' || manualAction === 'both' ? manualCheckInTime : undefined,
      checkOutTime: manualAction === 'check_out' || manualAction === 'both' ? manualCheckOutTime : undefined,
      status: manualStatus,
      reason: manualReason,
      operatorName: currentUser?.name || 'Admin'
    });

    if (res.success) {
      setShowManualModal(false);
      refreshData();
      alert(res.message);
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Open Correction Modal
  const handleOpenCorrection = (record: StaffAttendanceRecord) => {
    setSelectedRecord(record);
    setCorrectionStatus(record.status);
    setCorrectionCheckIn(record.check_in_at ? record.check_in_at.substring(11, 16) : '');
    setCorrectionCheckOut(record.check_out_at ? record.check_out_at.substring(11, 16) : '');
    setCorrectionReason('');
    setShowCorrectionModal(true);
  };

  // Submit Correction
  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !correctionReason.trim()) {
      alert('Alasan koreksi wajib diisi.');
      return;
    }

    const newCheckIn = correctionCheckIn ? `${selectedRecord.attendance_date}T${correctionCheckIn}:00+07:00` : selectedRecord.check_in_at || undefined;
    const newCheckOut = correctionCheckOut ? `${selectedRecord.attendance_date}T${correctionCheckOut}:00+07:00` : selectedRecord.check_out_at || undefined;

    const res = StaffAttendanceService.correctRecord({
      recordId: selectedRecord.id,
      newStatus: correctionStatus,
      newCheckIn,
      newCheckOut,
      reason: correctionReason,
      operatorName: currentUser?.name || 'Admin'
    });

    if (res.success) {
      setShowCorrectionModal(false);
      setSelectedRecord(null);
      setCorrectionReason('');
      refreshData();
      alert('Koreksi presensi berhasil disimpan ke dalam audit trail.');
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Open History Audit Modal
  const handleOpenHistory = (record: StaffAttendanceRecord) => {
    setSelectedRecordForHistory(record);
    const list = StaffAttendanceService.getHistories(record.id);
    setRecordHistories(list);
    setShowHistoryModal(true);
  };

  // Open Add/Edit Staff Modal
  const handleOpenStaffModal = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setStaffFormName(staff.name);
      setStaffFormNumber(staff.staff_number);
      setStaffFormGender(staff.gender);
      setStaffFormType(staff.staff_type);
      setStaffFormEmpStatus(staff.employment_status);
      setStaffFormDepartment(staff.department || '');
      setStaffFormPosition(staff.position || '');
      setStaffFormPhone(staff.phone || '');
      setStaffFormEmail(staff.email || '');
      setStaffFormRfid(staff.rfid_uid || '');
      setStaffFormRequiresDaily(staff.requires_daily_attendance !== false);
    } else {
      setEditingStaff(null);
      const nextNum = `STF26${String(staffList.length + 1).padStart(4, '0')}`;
      setStaffFormName('');
      setStaffFormNumber(nextNum);
      setStaffFormGender('male');
      setStaffFormType('teacher');
      setStaffFormEmpStatus('permanent');
      setStaffFormDepartment('');
      setStaffFormPosition('');
      setStaffFormPhone('');
      setStaffFormEmail('');
      setStaffFormRfid('');
      setStaffFormRequiresDaily(true);
    }
    setShowStaffModal(true);
  };

  // Save Staff (Create or Update)
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormName.trim() || !staffFormNumber.trim()) {
      alert('Nama SDM dan Nomor Induk/NIP wajib diisi.');
      return;
    }

    const operator = currentUser?.name || 'Admin';

    if (editingStaff) {
      const res = StaffIdentityResolver.updateStaff(editingStaff.id, {
        name: staffFormName.trim(),
        gender: staffFormGender,
        staff_type: staffFormType,
        employment_status: staffFormEmpStatus,
        department: staffFormDepartment.trim() || undefined,
        position: staffFormPosition.trim() || undefined,
        phone: staffFormPhone.trim() || undefined,
        email: staffFormEmail.trim() || undefined,
        rfid_uid: staffFormRfid.trim() || null,
        requires_daily_attendance: staffFormRequiresDaily,
      }, operator);

      if (res.success) {
        setShowStaffModal(false);
        refreshData();
        alert('Data SDM berhasil diperbarui.');
      } else {
        alert(`Gagal: ${res.message}`);
      }
    } else {
      const res = StaffIdentityResolver.createStaff({
        staff_number: staffFormNumber.trim().toUpperCase(),
        name: staffFormName.trim(),
        gender: staffFormGender,
        staff_type: staffFormType,
        employment_status: staffFormEmpStatus,
        department: staffFormDepartment.trim() || undefined,
        position: staffFormPosition.trim() || undefined,
        phone: staffFormPhone.trim() || undefined,
        email: staffFormEmail.trim() || undefined,
        rfid_uid: staffFormRfid.trim() || null,
        requires_daily_attendance: staffFormRequiresDaily,
        is_active: true,
        join_date: selectedDate
      }, operator);

      if (res.success) {
        setShowStaffModal(false);
        refreshData();
        alert(`SDM baru ${res.staff?.name} berhasil didaftarkan.`);
      } else {
        alert(`Gagal: ${res.message}`);
      }
    }
  };

  // Deactivate Staff
  const handleDeactivateStaff = (staff: Staff) => {
    const reason = prompt(`Masukkan alasan penonaktifan untuk ${staff.name}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Alasan penonaktifan wajib diisi.');
      return;
    }

    const res = StaffIdentityResolver.deactivateStaff(staff.id, reason, currentUser?.name || 'Admin');
    if (res.success) {
      refreshData();
      alert(`Staff ${staff.name} berhasil dinonaktifkan.`);
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Open Assign RFID Modal
  const handleOpenAssignRfid = (staff: Staff) => {
    setTargetStaffForRfid(staff);
    setRfidInputValue(staff.rfid_uid || '');
    setShowAssignRfidModal(true);
  };

  // Save Assign RFID
  const handleSaveAssignRfid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaffForRfid) return;

    if (!rfidInputValue.trim()) {
      const res = StaffIdentityResolver.removeRfidUid(targetStaffForRfid.id, currentUser?.name || 'Admin');
      if (res.success) {
        setShowAssignRfidModal(false);
        refreshData();
        alert('Kartu RFID berhasil dilepas.');
      } else {
        alert(res.message);
      }
      return;
    }

    const res = StaffIdentityResolver.assignRfidUid(targetStaffForRfid.id, rfidInputValue.trim(), currentUser?.name || 'Admin');
    if (res.success) {
      setShowAssignRfidModal(false);
      refreshData();
      alert(`Kartu RFID berhasil ditugaskan ke ${targetStaffForRfid.name}.`);
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Submit Absence Request
  const handleSubmitAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceReason.trim()) {
      alert('Alasan permohonan izin/cuti wajib diisi.');
      return;
    }

    const res = StaffAttendanceService.createAbsenceRequest({
      staffId: absenceStaffId,
      type: absenceType,
      startAt: `${absenceStartDate}T07:00:00+07:00`,
      endAt: `${absenceEndDate}T16:00:00+07:00`,
      reason: absenceReason,
      operatorName: currentUser?.name || 'Admin',
      autoApprove: absenceAutoApprove
    });

    if (res.success) {
      setShowAbsenceModal(false);
      setAbsenceReason('');
      refreshData();
      alert(`Permohonan ${absenceType.toUpperCase()} berhasil dicatat dan disinkronkan ke presensi harian.`);
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Approve Absence
  const handleApproveAbsence = (req: StaffAbsenceRequest) => {
    const notes = prompt('Catatan persetujuan (opsional):', 'Disetujui');
    if (notes === null) return;

    const res = StaffAttendanceService.approveAbsenceRequest(req.id, currentUser?.name || 'Admin', notes);
    if (res.success) {
      refreshData();
      alert(res.message);
    } else {
      alert(res.message);
    }
  };

  // Reject Absence
  const handleRejectAbsence = (req: StaffAbsenceRequest) => {
    const notes = prompt('Alasan penolakan (wajib):', 'Tidak memenuhi kriteria');
    if (notes === null) return;
    if (!notes.trim()) {
      alert('Alasan penolakan wajib diisi.');
      return;
    }

    const res = StaffAttendanceService.rejectAbsenceRequest(req.id, currentUser?.name || 'Admin', notes);
    if (res.success) {
      refreshData();
      alert(res.message);
    } else {
      alert(res.message);
    }
  };

  // Open Schedule Modal
  const handleOpenScheduleModal = (sch: StaffWorkSchedule) => {
    setEditingSchedule(sch);
    setScheduleCheckInOpen(sch.check_in_open_at);
    setScheduleStartAt(sch.scheduled_start_at);
    setScheduleLateAfter(sch.late_after);
    setScheduleCheckOutOpen(sch.check_out_open_at);
    setScheduleEndAt(sch.scheduled_end_at);
    setScheduleIsWorkDay(sch.is_working_day);
    setShowScheduleModal(true);
  };

  // Save Schedule
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    const res = StaffWorkScheduleResolver.updateSchedule(editingSchedule.id, {
      check_in_open_at: scheduleCheckInOpen,
      scheduled_start_at: scheduleStartAt,
      late_after: scheduleLateAfter,
      check_out_open_at: scheduleCheckOutOpen,
      scheduled_end_at: scheduleEndAt,
      is_working_day: scheduleIsWorkDay
    }, currentUser?.name || 'Admin');

    if (res.success) {
      setShowScheduleModal(false);
      refreshData();
      alert(`Jadwal kerja hari ${editingSchedule.day_of_week.toUpperCase()} berhasil diperbarui.`);
    } else {
      alert(`Gagal: ${res.message}`);
    }
  };

  // Idempotent Daily Finalization
  const handleFinalizeDaily = () => {
    if (confirm(`Apakah Anda yakin ingin memfinalisasi kehadiran SDM tanggal ${selectedDate}? Staff yang belum hadir dan tidak memiliki izin resmi akan otomatis ditandai Alpha.`)) {
      const res = StaffAttendanceService.finalizeDailyAttendance(selectedDate, currentUser?.name || 'Admin');
      alert(res.message);
      refreshData();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/15 border border-white/20 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
              SIUBA v1.1.1 Production
            </span>
            <span className="text-xs text-emerald-100/90 font-medium">Master SDM & Presensi Harian Pegawai/Guru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Presensi Terpadu SDM & Ketenagaan</h1>
          <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Otoritas tunggal presensi gerbang harian (Check-in/Check-out), master data SDM, toleransi keterlambatan, jadwal kerja & manajemen cuti/izin resmi.
          </p>
        </div>

        {/* Attractive Dropdown Module Selector & Date Action Bar (Sejajar) */}
        {(() => {
          const STAFF_TABS = [
            { id: 'DASHBOARD' as TabType, label: 'Dashboard & Scanner', desc: 'Ringkasan presensi harian & fast scanning RFID/QR', icon: Layers, badge: 'Live Fast-Tap' },
            { id: 'DAILY' as TabType, label: 'Kehadiran Hari Ini', desc: 'Daftar absensi pegawai, log tap, jam masuk & pulang', icon: UserCheck, badge: `${dailySummary.present + dailySummary.late}/${dailySummary.total_staff} Hadir` },
            { id: 'LEAVE' as TabType, label: 'Izin, Sakit & Cuti', desc: 'Pengajuan & verifikasi dispensasi kerja SDM', icon: FileText, badge: `${absenceRequests.length} Pengajuan` },
            { id: 'SCHEDULES' as TabType, label: 'Jadwal Kerja', desc: 'Pengaturan shift reguler, piket & asrama', icon: Clock, badge: '5 Shift Kerja' },
            { id: 'MASTER' as TabType, label: 'Master SDM & Kartu', desc: 'Database profil ustadz, guru & cetak kartu RFID/QR', icon: Users, badge: `${staffList.length} Pegawai` },
            { id: 'REPORTS' as TabType, label: 'Rekap & Laporan', desc: 'Rekapitulasi bulanan, ekspor Excel & cetak PDF', icon: Download, badge: 'Laporan Resmi' },
            { id: 'ROADMAP' as TabType, label: 'Roadmap v1.1.2 & v1.1.3', desc: 'Fitur baru & peningkatan modul presensi SDM', icon: Sparkles, badge: 'Pembaruan' },
          ];
          const currentTabInfo = STAFF_TABS.find(t => t.id === activeTab) || STAFF_TABS[0];
          const CurrentTabIcon = currentTabInfo.icon;

          return (
            <div className="mt-5 pt-4 border-t border-white/15">
              {/* Single Unified White Toolbar Bar (Side-by-Side) */}
              <div className="bg-white rounded-2xl p-2 shadow-lg border border-white/30 flex flex-row items-center justify-between gap-3 relative flex-wrap sm:flex-nowrap">
                {/* Left: Dropdown Selector */}
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
                    <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 shrink-0 ml-2 ${isTabDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Floating Menu */}
                  {isTabDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsTabDropdownOpen(false)} 
                      />
                      <div className="absolute left-0 top-full mt-2 w-full sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pilih Sub-Modul SDM</span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">7 Menu Aktif</span>
                        </div>
                        <div className="max-h-[380px] overflow-y-auto space-y-1 py-1">
                          {STAFF_TABS.map((tab) => {
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

                {/* Right: Quick Date Selector & Live Sync inside the same bar on the right */}
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

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD & FAST SCAN TERMINAL */}
      {/* ========================================================================= */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Daily KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs transition hover:shadow-sm">
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">Total Staff</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{dailySummary.total_staff}</div>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">Terdaftar Aktif</span>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs transition hover:shadow-sm">
              <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider block">Hadir Tepat Waktu</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{dailySummary.present}</div>
              <span className="text-xs text-emerald-800 font-bold mt-0.5 block">{dailySummary.punctuality_rate}% Ketepatan</span>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs transition hover:shadow-sm">
              <span className="text-[11px] text-amber-800 font-bold uppercase tracking-wider block">Terlambat</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{dailySummary.late}</div>
              <span className="text-xs text-amber-800 font-medium mt-0.5 block">Melewati Batas</span>
            </div>

            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 shadow-2xs transition hover:shadow-sm">
              <span className="text-[11px] text-sky-800 font-bold uppercase tracking-wider block">Izin / Sakit / Cuti</span>
              <div className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">
                {dailySummary.permission + dailySummary.sick + dailySummary.leave + dailySummary.official_duty}
              </div>
              <span className="text-xs text-sky-800 font-medium mt-0.5 block">Disetujui Resmi</span>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-2xs transition hover:shadow-sm">
              <span className="text-[11px] text-rose-800 font-bold uppercase tracking-wider block">Tanpa Keterangan</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{dailySummary.absent}</div>
              <span className="text-xs text-rose-800 font-medium mt-0.5 block">Alpha Terdata</span>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 shadow-2xs transition hover:shadow-sm">
              <span className="text-[11px] text-purple-800 font-bold uppercase tracking-wider block">Tingkat Kehadiran</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-1">{dailySummary.attendance_rate}%</div>
              <span className="text-xs text-purple-800 font-bold mt-0.5 block">Dari {dailySummary.expected_today} Wajib Hadir</span>
            </div>
          </div>

          {/* Fast Scan Terminal Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Terminal Presensi Cepat Gerbang SDM (Scan Check-in / Check-out)</h3>
                  <p className="text-xs text-slate-700">Sistem otomatis mendeteksi status Check-In (pagi) atau Check-Out (sore) secara cerdas.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenManualModal()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Entri Manual Khusus
                </button>
              </div>
            </div>

            {/* Terminal Input */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleProcessScan('manual'); }}
                  placeholder="Tap RFID / Scan Token QR (STF-...) / Ketik NIP Staff..."
                  className="w-full pl-3 pr-24 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-700 font-medium">Tekan Enter</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleProcessScan('qr')}
                  disabled={isProcessingScan || !scannerInput.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <QrCode className="w-4 h-4" />
                  Scan QR
                </button>
                <button
                  onClick={() => handleProcessScan('rfid')}
                  disabled={isProcessingScan || !scannerInput.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Radio className="w-4 h-4" />
                  Tap RFID
                </button>
              </div>
            </div>

            {/* Scan Feedback Banner */}
            {scanFeedback && (
              <div className={`mt-4 p-3.5 rounded-lg text-xs font-medium flex items-center gap-2.5 ${
                scanFeedback.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {scanFeedback.success ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <XSquare className="w-5 h-5 text-rose-600 flex-shrink-0" />}
                <div className="flex-1">
                  <span className="font-semibold">{scanFeedback.mode ? `[${scanFeedback.mode}] ` : ''}</span>
                  {scanFeedback.message}
                </div>
              </div>
            )}
          </div>

          {/* Quick Staff Tapping Grid */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Simulasi Tapping Cepat SDM</h3>
              <span className="text-xs text-slate-700">Klik tombol untuk simulasi presensi langsung</span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {staffList.slice(0, 8).map(s => {
                const todayRec = records.find(r => r.staff_id === s.id && r.attendance_date === selectedDate && r.attendance_type === 'daily');
                const hasIn = !!todayRec?.check_in_at;
                const hasOut = !!todayRec?.check_out_at;

                return (
                  <div key={s.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-xs truncate">{s.name}</div>
                      <div className="text-[11px] text-slate-700 font-mono">{s.staff_number} • <span className="capitalize">{s.staff_type}</span></div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-700">
                        {hasOut ? 'Selesai' : hasIn ? 'Telah Masuk' : 'Belum'}
                      </span>
                      <button
                        onClick={() => handleQuickTap(s)}
                        className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition"
                      >
                        {!hasIn ? <LogIn className="w-3 h-3" /> : !hasOut ? <LogOut className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                        {!hasIn ? 'Check-in' : !hasOut ? 'Check-out' : 'Tap Ulang'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KEHADIRAN HARIAN HARI INI (DAILY ATTENDANCE TABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'DAILY' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
                <Search className="w-4 h-4 text-slate-700" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama SDM atau NIP..."
                  className="text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-700 w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-700" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none"
                >
                  <option value="ALL">Semua Peran SDM</option>
                  <option value="teacher">Guru / Pengajar</option>
                  <option value="trainer">Pelatih Ekskul</option>
                  <option value="musyrif">Musyrif Asrama</option>
                  <option value="administration">Administrasi / TU</option>
                  <option value="employee">Pegawai / Umum</option>
                  <option value="management">Manajemen / Mudir</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => handleOpenManualModal()}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Entri Manual
              </button>
              <button
                onClick={handleFinalizeDaily}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Finalisasi Alpha
              </button>
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4">SDM / NIP</th>
                    <th className="py-3 px-3">Peran & Bagian</th>
                    <th className="py-3 px-3">Jadwal Kerja</th>
                    <th className="py-3 px-3">Jam Masuk (In)</th>
                    <th className="py-3 px-3">Jam Pulang (Out)</th>
                    <th className="py-3 px-3">Status Presensi</th>
                    <th className="py-3 px-3">Keterangan</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDailyRecords.map(({ staff, record, isWorkDay, scheduleDetail }) => {
                    const status = record?.status;
                    const hasCheckedIn = !!record?.check_in_at;
                    const hasCheckedOut = !!record?.check_out_at;

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{staff.name}</div>
                          <div className="text-[11px] text-teal-700 font-mono font-bold">{staff.staff_number}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {staff.staff_type}
                          </span>
                          <div className="text-[10px] text-slate-700 mt-0.5">{staff.position || staff.department || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {isWorkDay && scheduleDetail.schedule ? (
                            <span className="font-mono">{scheduleDetail.schedule.scheduled_start_at} - {scheduleDetail.schedule.scheduled_end_at}</span>
                          ) : (
                            <span className="text-slate-700 italic">{scheduleDetail.holiday_name || 'Libur'}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {hasCheckedIn ? (
                            <div>
                              <span className="font-mono font-medium text-slate-800">
                                {record.check_in_at?.substring(11, 16)}
                              </span>
                              <span className="block text-[10px] text-slate-700 font-mono">
                                via {record.check_in_method || 'manual'}
                              </span>
                              {record.late_minutes > 0 && (
                                <span className="block text-[10px] text-amber-600 font-bold">
                                  +{record.late_minutes}m telat
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {hasCheckedOut ? (
                            <div>
                              <span className="font-mono font-medium text-slate-800">
                                {record.check_out_at?.substring(11, 16)}
                              </span>
                              <span className="block text-[10px] text-slate-700 font-mono">
                                via {record.check_out_method || 'manual'}
                              </span>
                              {record.early_leave_minutes > 0 && (
                                <span className="block text-[10px] text-amber-600 font-medium">
                                  -{record.early_leave_minutes}m cepat
                                </span>
                              )}
                            </div>
                          ) : hasCheckedIn ? (
                            <span className="text-amber-600 font-medium text-[11px]">Belum Check-out</span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {status === 'present' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                              Hadir
                            </span>
                          )}
                          {status === 'late' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[11px]">
                              Terlambat
                            </span>
                          )}
                          {status === 'permission' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[11px]">
                              Izin
                            </span>
                          )}
                          {status === 'sick' && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium text-[11px]">
                              Sakit
                            </span>
                          )}
                          {status === 'leave' && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-[11px]">
                              Cuti
                            </span>
                          )}
                          {status === 'official_duty' && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium text-[11px]">
                              Dinas Luar
                            </span>
                          )}
                          {status === 'absent' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[11px]">
                              Alpha
                            </span>
                          )}
                          {!status && (
                            <span className="text-slate-700 text-[11px] italic">Belum Presensi</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                          {record?.notes || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!hasCheckedIn && (
                              <button
                                onClick={() => handleQuickTap(staff)}
                                title="Quick Check-in Masuk"
                                className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <LogIn className="w-3 h-3" /> Check-in
                              </button>
                            )}
                            {hasCheckedIn && !hasCheckedOut && (
                              <button
                                onClick={() => handleQuickTap(staff)}
                                title="Quick Check-out Pulang"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <LogOut className="w-3 h-3" /> Check-out
                              </button>
                            )}
                            {record && (
                              <>
                                <button
                                  onClick={() => handleOpenCorrection(record)}
                                  title="Koreksi Presensi"
                                  className="p-1 hover:bg-slate-100 text-slate-700 hover:text-teal-700 rounded"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenHistory(record)}
                                  title="Lihat Riwayat Perubahan"
                                  className="p-1 hover:bg-slate-100 text-slate-700 hover:text-indigo-700 rounded"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IZIN, SAKIT, CUTI & DINAS SDM */}
      {/* ========================================================================= */}
      {activeTab === 'LEAVE' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Manajemen Izin, Sakit, Cuti & Dinas SDM</h3>
                <p className="text-xs text-slate-700">Pengajuan dan persetujuan resmi dengan sinkronisasi langsung ke presensi harian</p>
              </div>

              <button
                onClick={() => setShowAbsenceModal(true)}
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Izin / Cuti Baru
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Nama Staff</th>
                    <th className="py-2.5 px-3">Jenis Pengajuan</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3">Alasan / Catatan</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Persetujuan</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absenceRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{req.staff_name}</div>
                        <div className="text-[10px] text-slate-700 font-mono">{req.staff_number}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize font-semibold text-slate-800">{req.type.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-mono">
                        {req.start_at.substring(0, 10)} s.d {req.end_at.substring(0, 10)}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{req.reason}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                          req.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : req.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {req.approved_by ? `${req.approved_by} (${req.approved_at?.substring(0, 10)})` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveAbsence(req)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-semibold"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleRejectAbsence(req)}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[11px] font-semibold"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {absenceRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-700 text-xs">
                        Belum ada data pengajuan izin/cuti staff yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MASTER JADWAL KERJA SDM */}
      {/* ========================================================================= */}
      {activeTab === 'SCHEDULES' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Master Jadwal Kerja SDM & Batas Toleransi Masuk</h3>
              <p className="text-xs text-slate-700">Konfigurasi batas waktu jam masuk, toleransi keterlambatan (Grace Period), dan jam buka check-out</p>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map(sch => (
                <div key={sch.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-teal-300 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 capitalize">{sch.day_of_week}</span>
                      {sch.is_working_day ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          Hari Kerja
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                          Libur
                        </span>
                      )}
                    </div>

                    {sch.is_working_day ? (
                      <div className="text-xs space-y-1.5 text-slate-700 mt-2">
                        <div className="flex justify-between">
                          <span>Buka Check-in:</span>
                          <span className="font-mono font-medium">{sch.check_in_open_at}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jam Masuk Standar:</span>
                          <span className="font-mono font-semibold text-slate-800">{sch.scheduled_start_at}</span>
                        </div>
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>Batas Terlambat (Late After):</span>
                          <span className="font-mono font-bold">{sch.late_after}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Buka Check-out:</span>
                          <span className="font-mono font-medium">{sch.check_out_open_at}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jam Pulang Standar:</span>
                          <span className="font-mono font-semibold text-slate-800">{sch.scheduled_end_at}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-700 italic py-4">
                        Tidak ada jam kerja terjadwal.
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => handleOpenScheduleModal(sch)}
                      className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Ubah Jadwal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MASTER DATA SDM & KREDENSIAL */}
      {/* ========================================================================= */}
      {activeTab === 'MASTER' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Master Data SDM & Kredensial (QR Token & RFID)</h3>
                <p className="text-xs text-slate-700">Daftar staf aktif, penugasan kartu fisik RFID, dan regenerasi token QR opaque</p>
              </div>

              <button
                onClick={() => handleOpenStaffModal()}
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah SDM Baru
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">NIP / ID</th>
                    <th className="py-2.5 px-3">Nama Lengkap</th>
                    <th className="py-2.5 px-3">Peran & Bagian</th>
                    <th className="py-2.5 px-3">QR Token (Opaque)</th>
                    <th className="py-2.5 px-3">Kartu RFID UID</th>
                    <th className="py-2.5 px-3">Presensi Harian</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-mono font-bold text-teal-800">{s.staff_number}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{s.name}</div>
                        <div className="text-[10px] text-slate-700">{s.email || s.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                          {s.staff_type}
                        </span>
                        <div className="text-[10px] text-slate-700 mt-0.5">{s.position || s.department || '—'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-medium">{s.qr_token}</td>
                      <td className="py-3 px-3 font-mono">
                        {s.rfid_uid ? (
                          <span className="text-indigo-700 font-semibold">{s.rfid_uid}</span>
                        ) : (
                          <span className="text-slate-700 italic">Belum di-assign</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {s.requires_daily_attendance !== false ? (
                          <span className="text-emerald-700 font-medium">Wajib</span>
                        ) : (
                          <span className="text-slate-700">Opsional/Khusus</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {s.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            Non-Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenStaffModal(s)}
                            title="Edit Data SDM"
                            className="p-1 hover:bg-slate-100 text-slate-700 hover:text-teal-700 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenAssignRfid(s)}
                            title="Assign / Ubah RFID"
                            className="p-1 hover:bg-slate-100 text-slate-700 hover:text-indigo-700 rounded"
                          >
                            <Radio className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const res = StaffIdentityResolver.regenerateQrToken(s.id, currentUser?.name || 'Admin');
                              if (res.success) {
                                alert(`QR Token baru untuk ${s.name}: ${res.new_token}`);
                                refreshData();
                              }
                            }}
                            title="Regenerate QR Token"
                            className="p-1 hover:bg-slate-100 text-slate-700 hover:text-amber-700 rounded"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          {s.is_active && (
                            <button
                              onClick={() => handleDeactivateStaff(s)}
                              title="Nonaktifkan SDM"
                              className="p-1 hover:bg-slate-100 text-slate-700 hover:text-rose-700 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REKAP & LAPORAN KEHADIRAN SDM */}
      {/* ========================================================================= */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Laporan Rekapitulasi Presensi Harian SDM</h3>
                <p className="text-xs text-slate-700">Ekspor berkas laporan presensi harian, jam keterlambatan, dan status kehadiran</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + 
                      "ID,NIP,Nama,Tipe,Tanggal,CheckIn,CheckOut,Status,Terlambat(Mnt),PulangAwal(Mnt),Catatan\n" +
                      records.filter(r => r.attendance_type === 'daily').map(r => 
                        `${r.id},${r.staff_number},"${r.staff_name}",${r.staff_type},${r.attendance_date},${r.check_in_at || ''},${r.check_out_at || ''},${r.status},${r.late_minutes},${r.early_leave_minutes},"${r.notes || ''}"`
                      ).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `Laporan_Presensi_SDM_${selectedDate}.csv`);
                    document.body.appendChild(link);
                    link.click();
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ekspor CSV Laporan
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 text-xs text-slate-700 leading-relaxed border border-slate-200">
              <p className="font-bold text-slate-800 mb-1.5">Standar Metrik Kehadiran SDM (SIUBA v1.1.1):</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>Daily Attendance Rate</strong> = (Hadir Tepat Waktu + Terlambat) / Total SDM Wajib Hadir × 100%</li>
                <li><strong>Punctuality Rate</strong> = Hadir Tepat Waktu / (Hadir Tepat Waktu + Terlambat) × 100%</li>
                <li><strong>Absence Reconciliation</strong> = Pengajuan Izin/Sakit/Cuti/Dinas yang disetujui otomatis disinkronkan ke status harian.</li>
                <li><strong>Security & Privacy</strong> = Kredensial sensitif seperti QR Token Opaque dan RFID UID dilindungi dan tidak dicetak pada rekap publik.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ROADMAP ARCHITECTURE NOTICE */}
      {/* ========================================================================= */}
      {activeTab === 'ROADMAP' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                Arsitektur & Phasing Rilis SIUBA SDM
              </span>
              <h3 className="text-xl font-bold text-slate-800 mt-2">Pemisahan Domain: Kehadiran Harian ≠ Mengajar (KBM) ≠ Pelatih Ekskul</h3>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Untuk menjamin stabilitas, integritas data, dan ketaatan arsitektural rilis, SIUBA memisahkan domain kehadiran SDM menjadi fase berjenjang:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border-2 border-teal-600 bg-teal-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-teal-700 text-white font-bold text-[10px]">
                    v1.1.1 — PRODUCTION
                  </span>
                  <CheckCircle className="w-4 h-4 text-teal-700" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Master SDM & Presensi Harian</h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  Fokus pada kehadiran gerbang harian, check-in, check-out, jadwal kerja per hari, grace period toleransi keterlambatan, cuti/izin, serta audit trail riwayat koreksi.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold text-[10px]">
                    v1.1.2 — PLANNED
                  </span>
                  <BookOpen className="w-4 h-4 text-slate-700" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Presensi Mengajar Guru (KBM)</h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  Pencatatan jam mengajar riil guru di kelas per jadwal sesi mata pelajaran, validasi guru pengganti (inval), dan integrasi ke buku nilai/jurnal kelas.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold text-[10px]">
                    v1.1.3 — PLANNED
                  </span>
                  <Award className="w-4 h-4 text-slate-700" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Presensi Pelatih Ekstrakurikuler</h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  Pencatatan kehadiran pelatih/pembina ekstrakurikuler berbasis sesi latihan, penugasan khusus, dan rekonsiliasi honorarium pelatih eksternal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL ATTENDANCE ENTRY */}
      {/* ========================================================================= */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Entri Presensi Manual SDM</h3>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Pilih SDM</label>
                <select
                  value={manualStaffId}
                  onChange={(e) => setManualStaffId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.staff_number} - {s.staff_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Jenis Aksi Presensi</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'check_in', label: 'Check-in Saja' },
                    { id: 'check_out', label: 'Check-out Saja' },
                    { id: 'both', label: 'In & Out Lengkap' },
                  ].map(act => (
                    <button
                      type="button"
                      key={act.id}
                      onClick={() => setManualAction(act.id as any)}
                      className={`py-1.5 px-2 rounded text-center border font-medium transition ${
                        manualAction === act.id 
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(manualAction === 'check_in' || manualAction === 'both') && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Jam Check-In</label>
                    <input
                      type="time"
                      value={manualCheckInTime}
                      onChange={(e) => setManualCheckInTime(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                    />
                  </div>
                )}
                {(manualAction === 'check_out' || manualAction === 'both') && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Jam Check-Out</label>
                    <input
                      type="time"
                      value={manualCheckOutTime}
                      onChange={(e) => setManualCheckOutTime(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as StaffAttendanceStatus)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                >
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="permission">Izin</option>
                  <option value="sick">Sakit</option>
                  <option value="leave">Cuti</option>
                  <option value="official_duty">Dinas Luar</option>
                  <option value="absent">Alpha</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Alasan Pencatatan Manual (Wajib Diisi)</label>
                <textarea
                  rows={2}
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Contoh: Lupa membawa kartu RFID gerbang, diverifikasi hadir oleh petugas piket"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CORRECTION */}
      {/* ========================================================================= */}
      {showCorrectionModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Koreksi Presensi SDM & Audit Trail</h3>
              <button 
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama SDM</label>
                <input 
                  type="text" 
                  disabled 
                  value={`${selectedRecord.staff_name} (${selectedRecord.staff_number})`} 
                  className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Status Baru</label>
                <select 
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value as StaffAttendanceStatus)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                >
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="permission">Izin</option>
                  <option value="sick">Sakit</option>
                  <option value="leave">Cuti</option>
                  <option value="official_duty">Dinas Luar</option>
                  <option value="absent">Alpha</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Koreksi Jam Masuk</label>
                  <input
                    type="time"
                    value={correctionCheckIn}
                    onChange={(e) => setCorrectionCheckIn(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Koreksi Jam Pulang</label>
                  <input
                    type="time"
                    value={correctionCheckOut}
                    onChange={(e) => setCorrectionCheckOut(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Alasan Koreksi (Wajib Diisi)</label>
                <textarea 
                  rows={2}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Kesalahan scan gate, telah diverifikasi oleh koordinator keamanan"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDIT HISTORY VIEWER */}
      {/* ========================================================================= */}
      {showHistoryModal && selectedRecordForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Riwayat Perubahan & Audit Trail</h3>
                <p className="text-[11px] text-slate-700">{selectedRecordForHistory.staff_name} • {selectedRecordForHistory.attendance_date}</p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recordHistories.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-700 bg-slate-50 rounded-lg">
                  Belum ada riwayat koreksi manual untuk record presensi ini.
                </div>
              ) : (
                recordHistories.map(h => (
                  <div key={h.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-800">Oleh: {h.changed_by}</span>
                      <span className="font-mono text-[10px]">{h.changed_at.substring(0, 16).replace('T', ' ')}</span>
                    </div>
                    <div className="text-slate-700">
                      <strong>Alasan:</strong> {h.reason}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-slate-200/60">
                      <div>
                        <span className="text-slate-700 block">Status Lama:</span>
                        <span className="font-medium text-rose-700">{h.old_values.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-700 block">Status Baru:</span>
                        <span className="font-medium text-emerald-700">{h.new_values.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT STAFF */}
      {/* ========================================================================= */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingStaff ? `Edit Data SDM (${editingStaff.staff_number})` : 'Pendaftaran SDM Baru'}
              </h3>
              <button 
                onClick={() => setShowStaffModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nomor Induk SDM / NIP</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaff}
                    value={staffFormNumber}
                    onChange={(e) => setStaffFormNumber(e.target.value)}
                    placeholder="Contoh: STF260010"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono font-bold uppercase disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Jenis Kelamin</label>
                  <select
                    value={staffFormGender}
                    onChange={(e) => setStaffFormGender(e.target.value as Gender)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  >
                    <option value="male">Laki-laki (Ikhwan)</option>
                    <option value="female">Perempuan (Akhwat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={staffFormName}
                  onChange={(e) => setStaffFormName(e.target.value)}
                  placeholder="Contoh: Ust. Abdullah S.Pd.I"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Peran / Profesi SDM</label>
                  <select
                    value={staffFormType}
                    onChange={(e) => setStaffFormType(e.target.value as StaffType)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  >
                    <option value="teacher">Guru / Tenaga Pendidik</option>
                    <option value="trainer">Pelatih / Pembina Ekskul</option>
                    <option value="musyrif">Musyrif Asrama</option>
                    <option value="administration">Administrasi / TU</option>
                    <option value="employee">Pegawai / Karyawan Umum</option>
                    <option value="management">Manajemen / Pimpinan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Status Kepegawaian</label>
                  <select
                    value={staffFormEmpStatus}
                    onChange={(e) => setStaffFormEmpStatus(e.target.value as StaffEmploymentStatus)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  >
                    <option value="permanent">Pegawai Tetap</option>
                    <option value="contract">Kontrak</option>
                    <option value="honorary">Guru Honorer</option>
                    <option value="part_time">Paruh Waktu</option>
                    <option value="volunteer">Pengabdian / Relawan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Departemen / Bagian</label>
                  <input
                    type="text"
                    value={staffFormDepartment}
                    onChange={(e) => setStaffFormDepartment(e.target.value)}
                    placeholder="Contoh: Kepesantrenan"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Jabatan / Posisi</label>
                  <input
                    type="text"
                    value={staffFormPosition}
                    onChange={(e) => setStaffFormPosition(e.target.value)}
                    placeholder="Contoh: Guru Fiqih & Musyrif"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    value={staffFormPhone}
                    onChange={(e) => setStaffFormPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={staffFormEmail}
                    onChange={(e) => setStaffFormEmail(e.target.value)}
                    placeholder="nama@pesantren.id"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Kartu Fisik RFID UID (Opsional)</label>
                <input
                  type="text"
                  value={staffFormRfid}
                  onChange={(e) => setStaffFormRfid(e.target.value)}
                  placeholder="Contoh: STF-E20019 atau tempelkan kartu"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiresDaily"
                  checked={staffFormRequiresDaily}
                  onChange={(e) => setStaffFormRequiresDaily(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-500"
                />
                <label htmlFor="requiresDaily" className="text-slate-700 font-medium">
                  Wajibkan Presensi Harian (Check-in/Check-out Gerbang)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  {editingStaff ? 'Simpan Perubahan' : 'Daftarkan SDM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN RFID */}
      {/* ========================================================================= */}
      {showAssignRfidModal && targetStaffForRfid && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Penugasan Kartu RFID SDM</h3>
              <button 
                onClick={() => setShowAssignRfidModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAssignRfid} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama SDM</label>
                <input 
                  type="text" 
                  disabled 
                  value={`${targetStaffForRfid.name} (${targetStaffForRfid.staff_number})`} 
                  className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">RFID UID Baru (Tempelkan kartu atau ketik UID)</label>
                <input
                  type="text"
                  autoFocus
                  value={rfidInputValue}
                  onChange={(e) => setRfidInputValue(e.target.value)}
                  placeholder="Kosongkan untuk melepas kartu..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignRfidModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-semibold"
                >
                  Simpan Kartu RFID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW ABSENCE REQUEST */}
      {/* ========================================================================= */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Catat Izin / Sakit / Cuti / Dinas SDM</h3>
              <button 
                onClick={() => setShowAbsenceModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Pilih SDM</label>
                <select
                  value={absenceStaffId}
                  onChange={(e) => setAbsenceStaffId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.staff_number} - {s.staff_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Jenis Ketidakhadiran</label>
                <select
                  value={absenceType}
                  onChange={(e) => setAbsenceType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium"
                >
                  <option value="permission">Izin Tidak Masuk</option>
                  <option value="sick">Sakit</option>
                  <option value="leave">Cuti Tahunan / Melahirkan</option>
                  <option value="official_duty">Dinas Luar Pesantren</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mulai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={absenceStartDate}
                    onChange={(e) => setAbsenceStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={absenceEndDate}
                    onChange={(e) => setAbsenceEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Alasan / Catatan Disetujui (Wajib Diisi)</label>
                <textarea
                  rows={2}
                  required
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Contoh: Menghadiri undangan pelatihan kurikulum dinas pendidikan"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={absenceAutoApprove}
                  onChange={(e) => setAbsenceAutoApprove(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-500"
                />
                <label htmlFor="autoApprove" className="text-slate-700 font-medium">
                  Langsung Setujui & Sinkronkan ke Presensi Harian
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Simpan Izin/Cuti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT WORK SCHEDULE */}
      {/* ========================================================================= */}
      {showScheduleModal && editingSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Ubah Jadwal Kerja SDM — Hari {editingSchedule.day_of_week.toUpperCase()}
              </h3>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-700 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <input
                  type="checkbox"
                  id="isWorkDay"
                  checked={scheduleIsWorkDay}
                  onChange={(e) => setScheduleIsWorkDay(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-500"
                />
                <label htmlFor="isWorkDay" className="text-slate-800 font-bold">
                  Hari Kerja Aktif
                </label>
              </div>

              {scheduleIsWorkDay && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Jam Buka Check-In</label>
                      <input
                        type="time"
                        value={scheduleCheckInOpen}
                        onChange={(e) => setScheduleCheckInOpen(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Jam Masuk Standar</label>
                      <input
                        type="time"
                        value={scheduleStartAt}
                        onChange={(e) => setScheduleStartAt(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-amber-800 font-medium mb-1">Batas Waktu Terlambat (Late After / Grace Period)</label>
                    <input
                      type="time"
                      value={scheduleLateAfter}
                      onChange={(e) => setScheduleLateAfter(e.target.value)}
                      className="w-full border border-amber-300 rounded px-2.5 py-1.5 font-mono font-bold text-amber-800 bg-amber-50/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Jam Buka Check-Out</label>
                      <input
                        type="time"
                        value={scheduleCheckOutOpen}
                        onChange={(e) => setScheduleCheckOutOpen(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Jam Pulang Standar</label>
                      <input
                        type="time"
                        value={scheduleEndAt}
                        onChange={(e) => setScheduleEndAt(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
