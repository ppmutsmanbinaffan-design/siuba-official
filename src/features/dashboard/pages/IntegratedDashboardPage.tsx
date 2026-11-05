import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  Filter, 
  Layers, 
  Users, 
  Briefcase, 
  BookOpen, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { 
  User, 
  Student, 
  Staff, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceRecord, 
  AttendanceDevice, 
  Classroom, 
  Dormitory, 
  ActivityCategory,
  Activity,
  StudentExcusal
} from '../../../types';
import { AttendanceMetricService } from '../../../services/attendanceMetricService';
import { StaffAnalyticsQueryService } from '../../../services/staffAnalyticsQueryService';
import { StaffIdentityResolver } from '../../../services/staffIdentityResolver';

import { TopSummaryCards } from '../components/TopSummaryCards';
import { StudentDashboardSection } from '../components/StudentDashboardSection';
import { StaffDailyDashboardSection } from '../components/StaffDailyDashboardSection';
import { TeachingDashboardSection } from '../components/TeachingDashboardSection';
import { TrainingDashboardSection } from '../components/TrainingDashboardSection';
import { AttentionItemsSection } from '../components/AttentionItemsSection';
import { QuickActionsSection } from '../components/QuickActionsSection';
import { StudentTrendChart } from '../components/StudentTrendChart';
import { StaffTrendChart } from '../components/StaffTrendChart';
import { TeachingTrendChart } from '../components/TeachingTrendChart';
import { TrainingTrendChart } from '../components/TrainingTrendChart';

import { DashboardActiveDomain, DashboardAttentionItem, DashboardTopSummary, StudentTrendPoint } from '../types';
import { hasPermission } from '../../../config/navigationRegistry';

interface Props {
  currentUser: User;
  sessions: AttendanceSession[];
  participants: AttendanceSessionParticipant[];
  records: AttendanceRecord[];
  students: Student[];
  classrooms?: Classroom[];
  dormitories?: Dormitory[];
  categories?: ActivityCategory[];
  activities?: Activity[];
  excusals?: StudentExcusal[];
  devices?: AttendanceDevice[];
  onNavigateTab: (tabId: string, params?: any) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const IntegratedDashboardPage: React.FC<Props> = ({
  currentUser,
  sessions = [],
  participants = [],
  records = [],
  students = [],
  classrooms = [],
  dormitories = [],
  categories = [],
  activities = [],
  excusals = [],
  devices = [],
  onNavigateTab,
  onShowToast,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().substring(0, 10)
  );
  const [activeDomain, setActiveDomain] = useState<DashboardActiveDomain>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canViewSantri = hasPermission(currentUser?.role, 'students.view', currentUser?.permissions) || hasPermission(currentUser?.role, 'attendance.view', currentUser?.permissions);
  const canViewStaff = hasPermission(currentUser?.role, 'staff.view', currentUser?.permissions) || hasPermission(currentUser?.role, 'staff_attendance.view', currentUser?.permissions);
  const canViewTeaching = hasPermission(currentUser?.role, 'academic.view', currentUser?.permissions) || currentUser?.role === 'teacher' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'pimpinan';
  const canViewTraining = hasPermission(currentUser?.role, 'extracurricular.view', currentUser?.permissions) || currentUser?.role === 'trainer' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'pimpinan';

  // 1. Fetch Staff Integrated Metrics (Daily, Teaching, Training, Operational Lists)
  const staffDashboardData = useMemo(() => {
    return StaffAnalyticsQueryService.getIntegratedDashboardData(selectedDate, currentUser);
  }, [selectedDate, currentUser]);

  // 2. Fetch Student Authoritative Metrics for Selected Date
  const studentMetrics = useMemo(() => {
    const todaySessions = sessions.filter(
      (s) => (s.session_date || s.start_at.slice(0, 10)) === selectedDate && s.status !== 'cancelled'
    );
    const sessionIds = new Set(todaySessions.map((s) => s.id));
    const todayParticipants = participants.filter((p) => sessionIds.has(p.attendance_session_id));

    return AttendanceMetricService.calculateMetrics(
      todaySessions,
      todayParticipants,
      records,
      { startDate: selectedDate, endDate: selectedDate }
    );
  }, [selectedDate, sessions, participants, records]);

  // 3. Compute 7-day Student Trends
  const studentTrends = useMemo<StudentTrendPoint[]>(() => {
    const points: StudentTrendPoint[] = [];
    const baseDate = new Date(selectedDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

      const daySessions = sessions.filter(
        (s) => (s.session_date || s.start_at.slice(0, 10)) === dateStr && s.status !== 'cancelled'
      );
      const sessionIds = new Set(daySessions.map((s) => s.id));
      const dayParticipants = participants.filter((p) => sessionIds.has(p.attendance_session_id));

      const m = AttendanceMetricService.calculateMetrics(
        daySessions,
        dayParticipants,
        records,
        { startDate: dateStr, endDate: dateStr }
      );

      points.push({
        date: dateStr,
        label: dayLabel,
        present: m.present,
        late: m.late,
        absent: m.absent,
        excused: m.permission + m.sick + m.dispensation,
        rate: m.attendanceRate,
      });
    }

    return points;
  }, [selectedDate, sessions, participants, records]);

  // 4. Compute Top Summary KPIs
  const topSummary = useMemo<DashboardTopSummary>(() => {
    const activeSt = students.filter((s) => s.status === 'active' || s.is_active !== false).length;
    const activeSf = StaffIdentityResolver.getStaffList().filter((s) => s.is_active).length;
    const todaySessionsCount = sessions.filter(
      (s) => (s.session_date || s.start_at.slice(0, 10)) === selectedDate && s.status !== 'cancelled'
    ).length;

    return {
      activeStudents: activeSt,
      activeStaff: activeSf,
      todayStudentSessions: todaySessionsCount,
      staffPresenceRate: staffDashboardData.daily.presence_rate,
      studentAttendanceRate: studentMetrics.attendanceRate,
    };
  }, [students, sessions, selectedDate, staffDashboardData.daily.presence_rate, studentMetrics.attendanceRate]);

  // 5. Gather Attention Items from Student & Staff Domains
  const attentionItems = useMemo<DashboardAttentionItem[]>(() => {
    const list: DashboardAttentionItem[] = [];

    // Check offline devices
    const offlineDevs = devices.filter((d) => d.status === 'offline' || d.status === 'error');
    if (offlineDevs.length > 0) {
      list.push({
        id: 'att-devices-offline',
        category: 'device',
        title: `${offlineDevs.length} Perangkat Presensi Offline`,
        description: `Perangkat ${offlineDevs.map((d) => d.device_name).join(', ')} tidak tersambung ke jaringan.`,
        severity: 'urgent',
        actionLabel: 'Cek Status Device',
        targetTab: 'devices',
      });
    }

    // Check open student sessions with high unrecorded count
    if (studentMetrics.unrecorded > 0) {
      list.push({
        id: 'att-student-unrecorded',
        category: 'santri',
        title: `${studentMetrics.unrecorded} Presensi Santri Belum Tercatat`,
        description: 'Terdapat santri terjadwal yang belum memiliki catatan presensi pada sesi hari ini.',
        severity: 'warning',
        actionLabel: 'Lihat Data Santri',
        targetTab: 'report-center',
        targetParams: { reportType: 'student', date_from: selectedDate, date_to: selectedDate, status: 'unrecorded' },
      });
    }

    // Check staff not checked in
    if (staffDashboardData.daily.not_checked_in > 0) {
      list.push({
        id: 'att-staff-not-in',
        category: 'sdm_daily',
        title: `${staffDashboardData.daily.not_checked_in} SDM Belum Check-in Masuk`,
        description: 'Pegawai atau guru yang terjadwal kerja hari ini belum melakukan presensi masuk.',
        severity: 'warning',
        actionLabel: 'Rekap SDM',
        targetTab: 'staff-attendance',
        targetParams: { reportType: 'sdm_daily', date_from: selectedDate, date_to: selectedDate, attendance_status: 'not_checked_in' },
      });
    }

    // Check teaching sessions needs review or unrecorded
    if (staffDashboardData.teaching.unrecorded_sessions > 0 || staffDashboardData.teaching.needs_review_sessions > 0) {
      const cnt = staffDashboardData.teaching.unrecorded_sessions + staffDashboardData.teaching.needs_review_sessions;
      list.push({
        id: 'att-teaching-review',
        category: 'teaching',
        title: `${cnt} Sesi KBM Perlu Verifikasi Guru`,
        description: 'Terdapat jam pelajaran yang belum diverifikasi atau belum tercatat kehadirannya.',
        severity: 'warning',
        actionLabel: 'Periksa KBM',
        targetTab: 'kbm-monitoring',
        targetParams: { reportType: 'teaching', date_from: selectedDate, date_to: selectedDate },
      });
    }

    // Check training realization missing
    if (staffDashboardData.training.needs_review_count > 0) {
      list.push({
        id: 'att-training-journal',
        category: 'training',
        title: `${staffDashboardData.training.needs_review_count} Sesi Ekskul Belum Lengkap Jurnal`,
        description: 'Pelatih telah hadir namun jurnal materi realisasi ekstrakurikuler belum diverifikasi.',
        severity: 'info',
        actionLabel: 'Buka Jurnal',
        targetTab: 'trainer-attendance',
        targetParams: { reportType: 'training', date_from: selectedDate, date_to: selectedDate, review_status: 'needs_review' },
      });
    }

    return list;
  }, [devices, studentMetrics.unrecorded, staffDashboardData, selectedDate]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      onShowToast?.('Data dashboard berhasil diperbarui.', 'success');
    }, 400);
  };

  const handleDatePreset = (preset: 'today' | 'yesterday') => {
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d.toISOString().substring(0, 10));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="integrated-dashboard-page">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-5 sm:p-6 rounded-3xl border border-[#164735] shadow-md relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Dashboard Terpadu SIUBA
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 font-bold border border-white/20 backdrop-blur-xs">
              v1.0.5 Terpadu
            </span>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90">
            Ringkasan operasional kegiatan dan presensi Pondok Pesantren Utsman Bin Affan.
          </p>
        </div>

        {/* Date Controls & Live Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          {/* Quick Presets */}
          <div className="flex items-center bg-black/25 p-1 rounded-xl border border-white/15 backdrop-blur-xs">
            <button
              onClick={() => handleDatePreset('today')}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDate === new Date().toISOString().substring(0, 10)
                  ? 'bg-white text-[#12372A] shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleDatePreset('yesterday')}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDate !== new Date().toISOString().substring(0, 10)
                  ? 'bg-white text-[#12372A] shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Kemarin
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2 bg-black/25 border border-white/15 px-3 py-1.5 rounded-xl shadow-2xs backdrop-blur-xs">
            <Calendar className="w-4 h-4 text-emerald-200" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-transparent text-white outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            type="button"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-xs backdrop-blur-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-200' : ''}`} />
          </button>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" id="dashboard-domain-tabs">
        <button
          onClick={() => setActiveDomain('all')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeDomain === 'all'
              ? 'bg-[#12372A] text-white shadow-xs'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Semua Domain
        </button>

        {canViewSantri && (
          <button
            onClick={() => setActiveDomain('santri')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeDomain === 'santri'
                ? 'bg-[#1F5C45] text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Kehadiran Santri
          </button>
        )}

        {canViewStaff && (
          <button
            onClick={() => setActiveDomain('sdm_daily')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeDomain === 'sdm_daily'
                ? 'bg-[#2F7D5A] text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            SDM Harian
          </button>
        )}

        {canViewTeaching && (
          <button
            onClick={() => setActiveDomain('teaching')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeDomain === 'teaching'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Mengajar (KBM)
          </button>
        )}

        {canViewTraining && (
          <button
            onClick={() => setActiveDomain('training')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeDomain === 'training'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Melatih (Ekskul)
          </button>
        )}
      </div>

      {/* Top 4 Summary Cards */}
      <TopSummaryCards
        data={topSummary}
        onDrilldown={onNavigateTab}
      />

      {/* Attention Items ("Perlu Perhatian") */}
      <AttentionItemsSection
        items={attentionItems}
        onAction={onNavigateTab}
      />

      {/* Quick Actions Bar */}
      <QuickActionsSection
        currentUser={currentUser}
        onNavigate={onNavigateTab}
      />

      {/* Domain Sections */}
      {canViewSantri && (activeDomain === 'all' || activeDomain === 'santri') && (
        <StudentDashboardSection
          metrics={studentMetrics}
          dateStr={selectedDate}
          onDrilldown={onNavigateTab}
        />
      )}

      {canViewStaff && (activeDomain === 'all' || activeDomain === 'sdm_daily') && (
        <StaffDailyDashboardSection
          data={staffDashboardData.daily}
          dateStr={selectedDate}
          onDrilldown={onNavigateTab}
        />
      )}

      {canViewTeaching && (activeDomain === 'all' || activeDomain === 'teaching') && (
        <TeachingDashboardSection
          data={staffDashboardData.teaching}
          dateStr={selectedDate}
          onDrilldown={onNavigateTab}
        />
      )}

      {canViewTraining && (activeDomain === 'all' || activeDomain === 'training') && (
        <TrainingDashboardSection
          data={staffDashboardData.training}
          dateStr={selectedDate}
          onDrilldown={onNavigateTab}
        />
      )}

      {/* Trend & Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-trend-charts">
        {canViewSantri && (activeDomain === 'all' || activeDomain === 'santri') && (
          <StudentTrendChart
            trends={studentTrends}
            onSelectDate={(d) => setSelectedDate(d)}
          />
        )}

        {canViewStaff && (activeDomain === 'all' || activeDomain === 'sdm_daily') && (
          <StaffTrendChart
            trends={staffDashboardData.trends.daily_presence_trend}
            onSelectDate={(d) => setSelectedDate(d)}
          />
        )}

        {canViewTeaching && (activeDomain === 'all' || activeDomain === 'teaching') && (
          <TeachingTrendChart
            trends={staffDashboardData.trends.teaching_trend}
            onSelectDate={(d) => setSelectedDate(d)}
          />
        )}

        {(activeDomain === 'all' || activeDomain === 'training') && (
          <TrainingTrendChart
            trends={staffDashboardData.trends.training_trend}
            onSelectDate={(d) => setSelectedDate(d)}
          />
        )}
      </div>
    </div>
  );
};
