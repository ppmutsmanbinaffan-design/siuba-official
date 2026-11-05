import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Briefcase, 
  BookOpen, 
  Award, 
  ArrowRight, 
  Download, 
  FileText, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  CalendarDays, 
  ShieldAlert, 
  TrendingUp, 
  ChevronRight, 
  Eye, 
  Search, 
  ExternalLink,
  ChevronDown,
  Upload
} from 'lucide-react';
import { StaffIntegratedDashboardData, Staff, User, StaffType } from '../types';
import { StaffAnalyticsQueryService } from '../services/staffAnalyticsQueryService';
import { DataImportModal } from './common/DataImportModal';

interface StaffIntegratedDashboardViewProps {
  currentUser: User;
  onNavigateTab: (tabId: string, params?: any) => void;
}

export const StaffIntegratedDashboardView: React.FC<StaffIntegratedDashboardViewProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [activeOperationalTab, setActiveOperationalTab] = useState<'not_checked_in' | 'not_checked_out' | 'late' | 'absence' | 'teaching_review' | 'training_review'>('not_checked_in');
  const [drilldownModal, setDrilldownModal] = useState<{ title: string; type: string; data: any[] } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch integrated metrics
  const dashboardData = useMemo<StaffIntegratedDashboardData>(() => {
    return StaffAnalyticsQueryService.getIntegratedDashboardData(selectedDate, currentUser);
  }, [selectedDate, currentUser]);

  const { daily, teaching, training, operational_lists, trends, data_quality } = dashboardData;

  // Filter operational list by search
  const filteredNotCheckedIn = useMemo(() => {
    return operational_lists.not_checked_in.filter(item => 
      item.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.staff.staff_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.schedule_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operational_lists.not_checked_in, searchTerm]);

  const filteredNotCheckedOut = useMemo(() => {
    return operational_lists.not_checked_out.filter(item => 
      item.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.staff.staff_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operational_lists.not_checked_out, searchTerm]);

  const filteredLate = useMemo(() => {
    return operational_lists.late_today.filter(item => 
      item.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.staff.staff_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operational_lists.late_today, searchTerm]);

  return (
    <div id="staff-integrated-dashboard" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 rounded-3xl border border-[#164735] shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-[#C9A227] backdrop-blur-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Dashboard & Analytics SDM Terpadu
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 font-semibold border border-white/20 backdrop-blur-xs">
                  SIUBA v1.1.4
                </span>
              </h1>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Monitoring kehadiran harian pegawai, guru KBM, dan pelatih ekskul berbasis 3 domain terpisah.
              </p>
            </div>
          </div>
        </div>

        {/* Date Controls & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-black/25 p-1 rounded-2xl border border-white/15 backdrop-blur-xs">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().substring(0, 10)
                  ? 'bg-white text-[#12372A] font-bold shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700/60 hover:bg-emerald-600/80 text-white rounded-2xl text-xs font-bold border border-emerald-400/30 shadow-xs transition-all cursor-pointer"
            title="Import data guru, pelatih, musyrif, dan SDM dari file CSV/Excel"
          >
            <Upload className="w-4 h-4 text-emerald-300" />
            Import Data SDM
          </button>

          <button
            onClick={() => onNavigateTab('staff-report-center')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#12372A] rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#1F5C45]" />
            Pusat Laporan SDM
          </button>
        </div>
      </div>

      {/* DOMAIN 1: KEHADIRAN HARIAN PEGAWAI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              1. Kehadiran Harian Pegawai & Guru (Hari Kerja)
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              (Denominator: {daily.expected_today} Pegawai Terjadwal)
            </span>
          </div>
          <button 
            onClick={() => onNavigateTab('staff-attendance')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            Kelola Presensi Harian <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card: Expected Today */}
          <div 
            onClick={() => setDrilldownModal({ title: 'Pegawai Wajib Hadir Hari Ini', type: 'expected', data: [] })}
            className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Wajib Hadir</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{daily.expected_today}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Total Aktif: {daily.total_staff_active}</div>
          </div>

          {/* Card: Present (On-time) */}
          <div 
            onClick={() => setDrilldownModal({ title: 'Pegawai Hadir Tepat Waktu', type: 'present', data: [] })}
            className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
              <span>Hadir (Tepat)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{daily.present}</div>
            <div className="text-[11px] text-emerald-600 mt-1">
              {daily.expected_today > 0 ? `${Math.round((daily.present / daily.expected_today) * 100)}% dari target` : '-'}
            </div>
          </div>

          {/* Card: Late */}
          <div 
            onClick={() => setActiveOperationalTab('late')}
            className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center justify-between">
              <span>Terlambat</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{daily.late}</div>
            <div className="text-[11px] text-amber-600 mt-1">Total {daily.total_late_minutes} mnt telat</div>
          </div>

          {/* Card: Excuses / Izin */}
          <div 
            onClick={() => setActiveOperationalTab('absence')}
            className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs hover:border-purple-300 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider flex items-center justify-between">
              <span>Izin / Cuti / Sakit</span>
              <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-1">
              {daily.permission + daily.sick + daily.leave + daily.official_duty}
            </div>
            <div className="text-[11px] text-purple-600 mt-1">
              I:{daily.permission} S:{daily.sick} C:{daily.leave} D:{daily.official_duty}
            </div>
          </div>

          {/* Card: Not Checked In */}
          <div 
            onClick={() => setActiveOperationalTab('not_checked_in')}
            className={`p-4 rounded-2xl border shadow-xs transition-all cursor-pointer ${
              daily.not_checked_in > 0 ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300' : 'bg-white border-zinc-200/80'
            }`}
          >
            <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center justify-between">
              <span>Belum Check-In</span>
              <UserX className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1">{daily.not_checked_in}</div>
            <div className="text-[11px] text-rose-600 mt-1">Perlu konfirmasi</div>
          </div>

          {/* Card: Presence Rate */}
          <div className="p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 shadow-xs">
            <div className="text-[11px] font-semibold text-lime-400 uppercase tracking-wider">Tingkat Hadir Harian</div>
            <div className="text-2xl font-bold text-white mt-1">
              {daily.presence_rate !== null ? `${daily.presence_rate}%` : 'N/A'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Alpha: {daily.alpha_rate !== null ? `${daily.alpha_rate}%` : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* DOMAIN 2 & DOMAIN 3: TEACHING & TRAINING SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DOMAIN 2: TEACHING SESSIONS (KBM) */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">2. Kehadiran Mengajar Guru (KBM)</h3>
                <p className="text-xs text-zinc-500">Denominator: Sesi KBM Terjadwal (Non-Batal)</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg">
              {teaching.teaching_attendance_rate !== null ? `${teaching.teaching_attendance_rate}% Terealisasi` : 'Tidak Ada Sesi'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase">Sesi Terjadwal</div>
              <div className="text-lg font-bold text-zinc-900 mt-0.5">{teaching.scheduled_sessions}</div>
              <div className="text-[10px] text-zinc-500">Batal: {teaching.cancelled_sessions}</div>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div className="text-[10px] font-semibold text-indigo-700 uppercase">Guru Hadir</div>
              <div className="text-lg font-bold text-indigo-700 mt-0.5">{teaching.attended_sessions}</div>
              <div className="text-[10px] text-indigo-600">Tepat: {teaching.on_time_sessions} | Late: {teaching.late_sessions}</div>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="text-[10px] font-semibold text-amber-700 uppercase">Perlu Review</div>
              <div className="text-lg font-bold text-amber-700 mt-0.5">{teaching.needs_review_sessions}</div>
              <div className="text-[10px] text-amber-600">Inval: {teaching.substituted_sessions}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className="text-zinc-500">Ketepatan Waktu Guru KBM:</span>
            <span className="font-bold text-zinc-900">
              {teaching.on_time_rate !== null ? `${teaching.on_time_rate}%` : '-'}
            </span>
          </div>
        </div>

        {/* DOMAIN 3: TRAINING SESSIONS (EKSTRAKURIKULER) */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">3. Kehadiran Pelatih Ekstrakurikuler</h3>
                <p className="text-xs text-zinc-500">Denominator: Sesi Ekskul Terjadwal (Non-Batal)</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg">
              {training.training_attendance_rate !== null ? `${training.training_attendance_rate}% Hadir` : 'Tidak Ada Sesi'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase">Sesi Ekskul</div>
              <div className="text-lg font-bold text-zinc-900 mt-0.5">{training.total_sessions}</div>
              <div className="text-[10px] text-zinc-500">Batal: {training.cancelled_sessions}</div>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="text-[10px] font-semibold text-emerald-700 uppercase">Pelatih Hadir</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">{training.trainer_attended}</div>
              <div className="text-[10px] text-emerald-600">Tepat: {training.trainer_on_time} | Late: {training.trainer_late}</div>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="text-[10px] font-semibold text-amber-700 uppercase">Jurnal Belum Diisi</div>
              <div className="text-lg font-bold text-amber-700 mt-0.5">{training.needs_review_count}</div>
              <div className="text-[10px] text-amber-600">Inval: {training.trainer_substituted}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className="text-zinc-500">Tingkat Realisasi Jurnal & Materi:</span>
            <span className="font-bold text-zinc-900">
              {training.realization_rate !== null ? `${training.realization_rate}%` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* TREND CHART: 7-DAY ROLLING ATTENDANCE */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-lime-600" />
              Tren Kehadiran 7 Hari Terakhir
            </h3>
            <p className="text-xs text-zinc-500">Grafik pergerakan kehadiran pegawai harian dan sesi KBM</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-zinc-600">Pegawai Hadir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-zinc-600">Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-zinc-600">Izin/Sakit/Cuti</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="grid grid-cols-7 gap-2">
            {trends.daily.map((item, idx) => {
              const total = (item.present || 0) + (item.late || 0) + (item.excused || 0) + (item.absent || 0);
              const maxScale = Math.max(...trends.daily.map(d => (d.present || 0) + (d.late || 0) + (d.excused || 0) + (d.absent || 0)), 1);
              const heightPercent = Math.max((total / maxScale) * 100, 15);
              const isToday = item.date === selectedDate;

              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isToday ? 'bg-lime-50/60 border-lime-300 shadow-xs' : 'bg-zinc-50/60 border-zinc-200/80 hover:bg-zinc-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-mono font-semibold ${isToday ? 'text-lime-900' : 'text-zinc-700'}`}>
                      {item.date.substring(5)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                    </span>
                  </div>

                  {/* Stacked Visual Bar */}
                  <div className="my-3 h-28 flex items-end justify-center">
                    <div className="w-full max-w-[28px] h-full flex flex-col-reverse bg-zinc-200/60 rounded-md overflow-hidden p-0.5">
                      {item.present > 0 && (
                        <div 
                          style={{ height: `${(item.present / (total || 1)) * 100}%` }} 
                          className="w-full bg-blue-500 rounded-xs transition-all"
                          title={`Hadir Tepat: ${item.present}`}
                        />
                      )}
                      {item.late > 0 && (
                        <div 
                          style={{ height: `${(item.late / (total || 1)) * 100}%` }} 
                          className="w-full bg-amber-500 rounded-xs transition-all"
                          title={`Terlambat: ${item.late}`}
                        />
                      )}
                      {item.excused > 0 && (
                        <div 
                          style={{ height: `${(item.excused / (total || 1)) * 100}%` }} 
                          className="w-full bg-purple-500 rounded-xs transition-all"
                          title={`Izin/Cuti: ${item.excused}`}
                        />
                      )}
                      {item.absent > 0 && (
                        <div 
                          style={{ height: `${(item.absent / (total || 1)) * 100}%` }} 
                          className="w-full bg-rose-400 rounded-xs transition-all"
                          title={`Alpha: ${item.absent}`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5 text-center text-[10px]">
                    <div className="font-bold text-zinc-900">{total} Staf</div>
                    <div className="text-[9px] text-emerald-700 font-semibold font-mono">
                      {total > 0 ? Math.round(((item.present + item.late) / total) * 100) : 0}% Hadir
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* OPERATIONAL LIVE ACTION WORKLISTS (HARI INI) */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Daftar Tindak Lanjut Operasional ({selectedDate})
            </h3>
            <p className="text-xs text-zinc-500">Daftar staf dan sesi yang memerlukan perhatian atau verifikasi petugas</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari nama / NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 w-48"
              />
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex border-b border-zinc-100 bg-zinc-50/70 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveOperationalTab('not_checked_in')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeOperationalTab === 'not_checked_in'
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Belum Check-In</span>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">
              {operational_lists.not_checked_in.length}
            </span>
          </button>

          <button
            onClick={() => setActiveOperationalTab('not_checked_out')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeOperationalTab === 'not_checked_out'
                ? 'border-amber-600 text-amber-600 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Belum Check-Out</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">
              {operational_lists.not_checked_out.length}
            </span>
          </button>

          <button
            onClick={() => setActiveOperationalTab('late')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeOperationalTab === 'late'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Terlambat Hari Ini</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">
              {operational_lists.late_today.length}
            </span>
          </button>

          <button
            onClick={() => setActiveOperationalTab('absence')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeOperationalTab === 'absence'
                ? 'border-purple-600 text-purple-600 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Izin / Cuti Aktif</span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px]">
              {operational_lists.approved_absences.length}
            </span>
          </button>

          <button
            onClick={() => setActiveOperationalTab('teaching_review')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeOperationalTab === 'teaching_review'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>KBM Perlu Review</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
              {operational_lists.teaching_needs_review.length}
            </span>
          </button>

          <button
            onClick={() => setActiveOperationalTab('training_review')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeOperationalTab === 'training_review'
                ? 'border-emerald-600 text-emerald-600 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Ekskul Perlu Review</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
              {operational_lists.training_needs_review.length}
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4">
          {activeOperationalTab === 'not_checked_in' && (
            <div className="overflow-x-auto">
              {filteredNotCheckedIn.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Semua pegawai terjadwal telah melakukan check-in hari ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                      <th className="py-2.5 px-3">Pegawai / Guru</th>
                      <th className="py-2.5 px-3">Peran / Jabatan</th>
                      <th className="py-2.5 px-3">Jadwal Kerja</th>
                      <th className="py-2.5 px-3">Target Masuk</th>
                      <th className="py-2.5 px-3 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredNotCheckedIn.map(({ staff, expected_start, schedule_name }) => (
                      <tr key={staff.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">
                          {staff.name}
                          <span className="block text-[10px] text-zinc-400 font-normal">NIP: {staff.staff_number || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-zinc-600">{staff.staff_type}</td>
                        <td className="py-2.5 px-3 text-zinc-600">{schedule_name}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-rose-600">{expected_start}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigateTab('staff-attendance')}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Catat Manual
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeOperationalTab === 'not_checked_out' && (
            <div className="overflow-x-auto">
              {filteredNotCheckedOut.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Tidak ada pegawai yang tertunda check-out.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                      <th className="py-2.5 px-3">Pegawai / Guru</th>
                      <th className="py-2.5 px-3">Waktu Masuk</th>
                      <th className="py-2.5 px-3">Jadwal Pulang</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredNotCheckedOut.map(({ staff, check_in_at, expected_end }) => (
                      <tr key={staff.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">
                          {staff.name}
                          <span className="block text-[10px] text-zinc-400 font-normal">NIP: {staff.staff_number || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 font-medium">{check_in_at}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-600">{expected_end}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                            Belum Tap Out
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigateTab('staff-attendance')}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Check-Outkan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeOperationalTab === 'late' && (
            <div className="overflow-x-auto">
              {filteredLate.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Nihil keterlambatan pada tanggal ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                      <th className="py-2.5 px-3">Pegawai / Guru</th>
                      <th className="py-2.5 px-3">Target Masuk</th>
                      <th className="py-2.5 px-3">Jam Masuk Riil</th>
                      <th className="py-2.5 px-3">Keterlambatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredLate.map(({ staff, check_in_at, expected_start, late_minutes }) => (
                      <tr key={staff.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">
                          {staff.name}
                          <span className="block text-[10px] text-zinc-400 font-normal">NIP: {staff.staff_number || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-600">{expected_start}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-700 font-bold">{check_in_at}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-semibold text-[10px]">
                            +{late_minutes} Menit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeOperationalTab === 'absence' && (
            <div className="overflow-x-auto">
              {operational_lists.approved_absences.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Tidak ada izin/cuti aktif pada tanggal ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                      <th className="py-2.5 px-3">Pegawai</th>
                      <th className="py-2.5 px-3">Jenis Izin</th>
                      <th className="py-2.5 px-3">Periode</th>
                      <th className="py-2.5 px-3">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {operational_lists.approved_absences.map(({ staff, type, start_at, end_at, reason }) => (
                      <tr key={staff.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">{staff.name}</td>
                        <td className="py-2.5 px-3 uppercase font-semibold text-purple-700">{type}</td>
                        <td className="py-2.5 px-3 text-zinc-600 font-mono">{start_at} s/d {end_at}</td>
                        <td className="py-2.5 px-3 text-zinc-600 italic">{reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeOperationalTab === 'teaching_review' && (
            <div className="overflow-x-auto">
              {operational_lists.teaching_needs_review.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Semua sesi KBM tercatat rapi tanpa anomali.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                      <th className="py-2.5 px-3">Kelas & Mapel</th>
                      <th className="py-2.5 px-3">Waktu Sesi</th>
                      <th className="py-2.5 px-3">Guru Terjadwal</th>
                      <th className="py-2.5 px-3">Catatan / Issue</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {operational_lists.teaching_needs_review.map(({ session, issue }, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">
                          {session.classroom_name} - {session.subject_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-600">{session.time_slot_start} - {session.time_slot_end}</td>
                        <td className="py-2.5 px-3 text-zinc-700">{session.scheduled_teacher_name}</td>
                        <td className="py-2.5 px-3 text-amber-700 font-medium">{issue}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigateTab('kbm-monitoring')}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Review KBM
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeOperationalTab === 'training_review' && (
            <div className="overflow-x-auto">
              {operational_lists.training_needs_review.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Semua sesi ekskul telah melengkapi jurnal realisasi.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                      <th className="py-2.5 px-3">Ekstrakurikuler</th>
                      <th className="py-2.5 px-3">Waktu Sesi</th>
                      <th className="py-2.5 px-3">Pelatih</th>
                      <th className="py-2.5 px-3">Catatan / Issue</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {operational_lists.training_needs_review.map(({ session, issue }, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">{session.extracurricular_name}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-600">{session.scheduled_start_at} - {session.scheduled_end_at}</td>
                        <td className="py-2.5 px-3 text-zinc-700">{session.primary_staff_name || 'Belum Ditugaskan'}</td>
                        <td className="py-2.5 px-3 text-amber-700 font-medium">{issue}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigateTab('trainer-attendance')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Isi Jurnal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DATA QUALITY AUDIT (ADMINISTRATIVE OVERSIGHT) */}
      {['admin', 'superadmin'].includes(currentUser.role) && (
        <div className="bg-zinc-900 text-white p-5 rounded-2xl border border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1F5C45]/20 text-[#2F7D5A] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Data Quality & System Health Audit</h3>
                <p className="text-xs text-zinc-400">Pemeriksaan integritas master data pegawai & konfigurasi perangkat</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 bg-[#1F5C45]/20 text-[#2F7D5A] font-semibold border border-[#1F5C45]/40 rounded-full">
              Automated Integrity Guard
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/60">
              <div className="text-zinc-400 text-[10px]">Staf Tanpa Jadwal Kerja</div>
              <div className="text-lg font-bold text-white mt-0.5">{data_quality.staff_without_schedule}</div>
              <div className="text-[10px] text-zinc-500">Perlu di-assign shift</div>
            </div>
            <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/60">
              <div className="text-zinc-400 text-[10px]">Staf Tanpa QR Card</div>
              <div className="text-lg font-bold text-white mt-0.5">{data_quality.staff_without_qr}</div>
              <div className="text-[10px] text-zinc-500">Belum generate token</div>
            </div>
            <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/60">
              <div className="text-zinc-400 text-[10px]">Staf Tanpa Kartu RFID</div>
              <div className="text-lg font-bold text-white mt-0.5">{data_quality.staff_without_rfid}</div>
              <div className="text-[10px] text-zinc-500">Belum tapping kartu</div>
            </div>
            <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/60">
              <div className="text-zinc-400 text-[10px]">Anomali Check-Out</div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">{data_quality.missing_checkout_count}</div>
              <div className="text-[10px] text-zinc-500">Belum tap pulang</div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Staff Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        type="staff"
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          onNavigateTab('staff-list');
        }}
      />
    </div>
  );
};
