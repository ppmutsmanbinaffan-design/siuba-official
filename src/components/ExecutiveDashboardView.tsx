import React, { useState } from 'react';
import { 
  Activity, 
  ActivityCategory, 
  AttendanceDevice, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  EventRegistration, 
  Extracurricular, 
  ExtracurricularMember, 
  SpecialEvent, 
  Student, 
  StudentExcusal, 
  User 
} from '../types';
import { AttendanceMetricService, FilterCriteria } from '../services/attendanceMetricService';
import { AttendanceSummaryService } from '../services/attendanceSummaryService';
import { 
  Activity as ActivityIcon, 
  AlertCircle, 
  AlertTriangle, 
  Award, 
  BarChart3, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Eye, 
  Filter, 
  GraduationCap, 
  Home, 
  Layers, 
  PieChart, 
  QrCode, 
  RefreshCw, 
  ShieldAlert, 
  Smartphone, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  Users, 
  Zap 
} from 'lucide-react';

interface Props {
  sessions: AttendanceSession[];
  participants: AttendanceSessionParticipant[];
  records: AttendanceRecord[];
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  categories: ActivityCategory[];
  activities: Activity[];
  excusals: StudentExcusal[];
  devices: AttendanceDevice[];
  currentUser: User;
  onNavigateToTab: (tabId: string) => void;
}

export const ExecutiveDashboardView: React.FC<Props> = ({
  sessions = [],
  participants = [],
  records = [],
  students = [],
  classrooms = [],
  dormitories = [],
  dormitoryRooms = [],
  categories = [],
  activities = [],
  excusals = [],
  devices = [],
  currentUser,
  onNavigateToTab,
}) => {
  const safeSessions = sessions || [];
  const safeParticipants = participants || [];
  const safeRecords = records || [];
  const safeStudents = students || [];
  const safeClassrooms = classrooms || [];
  const safeDormitories = dormitories || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeCategories = categories || [];
  const safeActivities = activities || [];
  const safeExcusals = excusals || [];
  const safeDevices = devices || [];

  const [selectedRoleScope, setSelectedRoleScope] = useState<string>('executive'); // 'executive' | 'academic' | 'boarding' | 'homeroom'
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('today'); // 'today' | '7days' | '30days'
  const [selectedClassFilter, setSelectedClassFilter] = useState<number | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'all'>('all');

  // Date Range calculation based on preset
  const todayStr = '2026-08-23';
  let startDate = todayStr;
  let endDate = todayStr;

  if (selectedDatePreset === '7days') {
    startDate = '2026-08-16';
  } else if (selectedDatePreset === '30days') {
    startDate = '2026-07-24';
  }

  // Active Metric Criteria
  const activeFilters: FilterCriteria = {
    startDate,
    endDate,
    classroomId: selectedClassFilter,
    activityCategoryId: selectedCategoryFilter,
    sessionStatus: 'all',
  };

  // Core Aggregated Metrics
  const metrics = AttendanceMetricService.calculateMetrics(safeSessions, safeParticipants, safeRecords, activeFilters);

  // Today Operational Summary
  const todaySummary = AttendanceSummaryService.calculateTodaySummary(safeSessions, safeParticipants, safeRecords, todayStr);

  // Attention Items
  const attentionItems = AttendanceSummaryService.getAttentionItems(safeSessions, safeExcusals, safeRecords, safeParticipants);

  // High Alpha Alert Santri (Alpha >= 2)
  const highAlphaStudents = safeStudents.filter((st) => {
    if (!st) return false;
    const stRecords = safeRecords.filter((r) => r && r.student_id === st.id && r.status === 'absent');
    return stRecords.length >= 2;
  });

  // Prayer Metrics Breakdown
  const prayerMetrics = AttendanceMetricService.getPrayerMetrics(safeSessions, safeParticipants, safeRecords, todayStr);

  // Category Breakdown Metrics
  const categoryBreakdowns = AttendanceMetricService.getCategoryBreakdown(safeSessions, safeParticipants, safeRecords, safeCategories);

  // Method Breakdown
  const methodBreakdown = AttendanceMetricService.getMethodBreakdown(safeRecords);

  // Devices Status Summary
  const onlineDevices = safeDevices.filter((d) => d && d.status === 'online');
  const offlineDevices = safeDevices.filter((d) => d && d.status === 'offline');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] rounded-3xl p-6 text-white shadow-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border border-[#164735]">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            <span>Sprint 9 — Analytics & Executive Dashboard Engine</span>
          </div>
          <h1 className="text-2xl font-black">Executive & Multi-Scope Attendance Analytics</h1>
          <p className="text-emerald-100/90 text-xs mt-1 max-w-2xl">
            Pusat analitik eksekutif terpusat dengan denominator penyebut akurat dari populasi santri eligible, pemantauan realtime, dan panel aksi operasional.
          </p>
        </div>

        {/* Filter Presets Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-black/25 p-2 rounded-2xl border border-white/15 backdrop-blur-xs text-xs">
          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/20 rounded-xl border border-white/15">
            <Eye className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-emerald-200 font-medium">Scope:</span>
            <select
              value={selectedRoleScope}
              onChange={(e) => setSelectedRoleScope(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="executive" className="bg-[#12382A]">Pimpinan / Executive</option>
              <option value="academic" className="bg-[#12382A]">Kepala Sekolah (KBM)</option>
              <option value="boarding" className="bg-[#12382A]">Kepala Asrama & Ibadah</option>
              <option value="homeroom" className="bg-[#12382A]">Wali Kelas / Guru</option>
            </select>
          </div>

          {/* Date Preset Selector */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/15 font-medium">
            <button
              onClick={() => setSelectedDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg ${selectedDatePreset === 'today' ? 'bg-white text-[#12372A] font-bold shadow-xs' : 'text-emerald-200 hover:text-white'}`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setSelectedDatePreset('7days')}
              className={`px-2.5 py-1 rounded-lg ${selectedDatePreset === '7days' ? 'bg-white text-[#12372A] font-bold shadow-xs' : 'text-emerald-200 hover:text-white'}`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setSelectedDatePreset('30days')}
              className={`px-2.5 py-1 rounded-lg ${selectedDatePreset === '30days' ? 'bg-white text-[#12372A] font-bold shadow-xs' : 'text-emerald-200 hover:text-white'}`}
            >
              30 Hari
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Kehadiran Overall</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900">{metrics.attendanceRate}%</div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {metrics.present + metrics.late} Hadir
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Denominator Eligible:</span>
            <span className="font-bold text-slate-800">{metrics.totalEligible} Kesempatan</span>
          </div>
        </div>

        {/* Card 2: On-Time Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Tepat Waktu (On-Time)</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900">{metrics.onTimeRate}%</div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {metrics.present} Santri
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Terlambat Rate:</span>
            <span className="font-bold text-amber-600">{metrics.lateRate}% ({metrics.late})</span>
          </div>
        </div>

        {/* Card 3: Alpha / Absent Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Alpha / Absent Rate</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-rose-600">{metrics.absentRate}%</div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {metrics.absent} Alpha
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Izin / Sakit / Disp:</span>
            <span className="font-bold text-indigo-600">{metrics.excusedRate}% ({metrics.permission + metrics.sick + metrics.dispensation})</span>
          </div>
        </div>

        {/* Card 4: Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Kelengkapan Rekam (Completion)</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900">{metrics.completionRate}%</div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {metrics.totalRecorded} / {metrics.totalEligible}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Belum Absen (Unrecorded):</span>
            <span className="font-bold text-slate-700">{metrics.unrecorded} Santri</span>
          </div>
        </div>
      </div>

      {/* Row 2: Action Required Panel ("BUTUH PERHATIAN") */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-950 text-base">Panel Aksional — Butuh Perhatian Segera</h2>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
            {attentionItems.length + (highAlphaStudents.length > 0 ? 1 : 0)} Item Perhatian
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {attentionItems.map((item) => (
            <div key={item.id} className="p-3.5 bg-white border border-amber-200 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span>{item.title}</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">{item.count}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">{item.description}</p>
              <button
                onClick={() => onNavigateToTab(item.actionTab)}
                className="mt-2 text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Buka Panel Tinjauan →</span>
              </button>
            </div>
          ))}

          {highAlphaStudents.length > 0 && (
            <div className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-rose-900">
                <span>Santri Berisiko Alpha Tinggi</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono">{highAlphaStudents.length} Santri</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {highAlphaStudents.length} santri tercatat Alpha ≥ 2x dalam periode aktif ini. Diperlukan tindak lanjut pembinaan.
              </p>
              <button
                onClick={() => onNavigateToTab('students')}
                className="mt-2 text-rose-600 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Lihat Profil Santri →</span>
              </button>
            </div>
          )}

          {attentionItems.length === 0 && highAlphaStudents.length === 0 && (
            <div className="col-span-3 p-4 bg-white text-center rounded-xl text-slate-500 font-medium">
              Semua operasional presensi berjalan lancar. Tidak ada item darurat yang butuh perhatian saat ini.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Activity Category Breakdown Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span>Analitik Berdasarkan Kategori Kegiatan</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryBreakdowns.map(({ category, sessionsCount, metrics: catMetrics }) => (
            <div key={category.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{category.name}</span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {sessionsCount} Sesi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Attendance Rate</div>
                  <div className="text-xl font-black text-slate-800">{catMetrics.attendanceRate}%</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Completion Rate</div>
                  <div className="text-xl font-black text-indigo-600">{catMetrics.completionRate}%</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
                <div className="p-1.5 bg-emerald-50 rounded text-emerald-800">
                  <div className="font-bold">{catMetrics.present}</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">Hadir</div>
                </div>
                <div className="p-1.5 bg-amber-50 rounded text-amber-800">
                  <div className="font-bold">{catMetrics.late}</div>
                  <div className="text-[9px] text-amber-600 font-semibold">Late</div>
                </div>
                <div className="p-1.5 bg-blue-50 rounded text-blue-800">
                  <div className="font-bold">{catMetrics.permission + catMetrics.sick + catMetrics.dispensation}</div>
                  <div className="text-[9px] text-blue-600 font-semibold">Izin</div>
                </div>
                <div className="p-1.5 bg-rose-50 rounded text-rose-800">
                  <div className="font-bold">{catMetrics.absent}</div>
                  <div className="text-[9px] text-rose-600 font-semibold">Alpha</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Shalat Berjamaah Breakdown & Method/Device Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Shalat Berjamaah Analytics */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Monitoring Kehadiran Shalat 5 Waktu Hari Ini</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{todayStr}</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Object.entries(prayerMetrics).map(([prayerName, pMetric]) => (
              <div key={prayerName} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <div className="text-xs font-bold text-slate-700">{prayerName}</div>
                <div className="text-lg font-black text-slate-900">{pMetric.attendanceRate}%</div>
                <div className="text-[10px] text-slate-500">
                  {pMetric.present + pMetric.late} / {pMetric.totalEligible}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Method & Device Analytics */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <span>Distribusi Metode & Perangkat RFID</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Method Breakdown Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-slate-600 font-semibold mb-1">
                <span>Penggunaan Metode Scan:</span>
                <span>{methodBreakdown.total} Presensi</span>
              </div>

              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${methodBreakdown.rfidPct}%` }} className="bg-indigo-600 h-full" title="RFID" />
                <div style={{ width: `${methodBreakdown.qrPct}%` }} className="bg-emerald-500 h-full" title="QR Code" />
                <div style={{ width: `${methodBreakdown.manualPct}%` }} className="bg-amber-500 h-full" title="Manual" />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" /> RFID: {methodBreakdown.rfidPct}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> QR: {methodBreakdown.qrPct}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Manual: {methodBreakdown.manualPct}%
                </span>
              </div>
            </div>

            {/* Device Health Status */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Status Hardware RFID ESP32:</span>
                <span className="text-slate-500 text-[11px]">{devices.length} Perangkat Terdaftar</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                  {onlineDevices.length} Online
                </span>
                {offlineDevices.length > 0 && (
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                    {offlineDevices.length} Offline
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
