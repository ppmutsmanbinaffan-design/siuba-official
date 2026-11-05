import React, { useEffect, useState, useCallback } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  QrCode, 
  ClipboardCheck, 
  Radio, 
  RefreshCw, 
  Search, 
  Filter, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { attendanceApi } from '../api/attendanceApi';
import { AttendanceSession, AttendanceTodayKpi, OpenSessionMonitoringData } from '../types';
import { SessionSummaryKpi } from '../components/SessionSummaryKpi';
import { SessionCard } from '../components/SessionCard';
import { OpenSessionMonitoringCard } from '../components/OpenSessionMonitoringCard';
import { INITIAL_ACTIVITIES } from '../../../data/initialData';
import { formatIndonesianDate } from '../utils/attendanceUtils';

interface AttendanceDashboardPageProps {
  onNavigateToSessions: () => void;
  onNavigateToManual: (sessionId?: number) => void;
  onNavigateToQr: (sessionId?: number) => void;
  onNavigateToRfid: () => void;
  onNavigateToMonitoring: () => void;
  onNavigateToSessionDetail: (sessionId: number) => void;
}

export const AttendanceDashboardPage: React.FC<AttendanceDashboardPageProps> = ({
  onNavigateToSessions,
  onNavigateToManual,
  onNavigateToQr,
  onNavigateToRfid,
  onNavigateToMonitoring,
  onNavigateToSessionDetail,
}) => {
  const [kpi, setKpi] = useState<AttendanceTodayKpi | null>(null);
  const [openSessions, setOpenSessions] = useState<OpenSessionMonitoringData[]>([]);
  const [allTodaySessions, setAllTodaySessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [kpiData, monitoringData, sessionsData] = await Promise.all([
        attendanceApi.getTodayKpi(),
        attendanceApi.getOpenSessionsMonitoring(),
        attendanceApi.getSessions({ date: '2026-08-23' }),
      ]);
      setKpi(kpiData);
      setOpenSessions(monitoringData);
      setAllTodaySessions(sessionsData);
    } catch (err) {
      console.error('Failed to load attendance dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSessions = allTodaySessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.activity_name?.toLowerCase().includes(q) ||
      s.session_code?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* SIUBA Emerald Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 sm:p-7 shadow-md border border-[#164735]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/15 border border-white/20 text-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Pusat Kendali Presensi Santri
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pusat Absensi Santri Pesantren
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
              Pusat kendali dan rekapitulasi presensi harian santri untuk seluruh kegiatan ibadah fardhu, halaqah tahfidz Al-Qur'an, sekolah, dan asrama.
            </p>
          </div>

          {/* Quick Actions & Date Indicator */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-black/25 text-emerald-100 border border-white/15 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-xs">
              <Calendar className="w-4 h-4 text-[#EADAA2]" />
              <span>{formatIndonesianDate('2026-08-23')}</span>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-white/15 transition backdrop-blur-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <button
              onClick={() => onNavigateToQr()}
              className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black px-4 py-2 rounded-xl text-xs shadow-md transition cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4 text-[#1F5C45]" />
              <span>Buka Terminal QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      {kpi && (
        <Card className="p-5 sm:p-6 bg-white border border-slate-200 rounded-3xl shadow-xs">
          <SessionSummaryKpi
            title="Rekapitulasi Kehadiran Santri Hari Ini"
            totalEligible={kpi.totalEligibleParticipants}
            recordedCount={kpi.recordedCount}
            unrecordedCount={kpi.unrecordedCount}
            presentCount={kpi.presentCount}
            lateCount={kpi.lateCount}
            permissionCount={kpi.permissionCount}
            sickCount={kpi.sickCount}
            dispensationCount={kpi.dispensationCount}
            absentCount={kpi.absentCount}
            completionRate={kpi.completionRate}
          />
        </Card>
      )}

      {/* Quick Launch Cards (4 Columns on Desktop, 2 on Tablet, 1 on Mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* QR Scanner */}
        <button
          onClick={() => onNavigateToQr()}
          className="p-4 sm:p-5 rounded-3xl bg-white hover:bg-sky-50/50 border border-sky-200 hover:border-sky-400 transition-all text-left group flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md min-h-[145px] cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200 group-hover:scale-105 transition-transform shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              Kamera & Laser
            </span>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
              Scan QR Absensi
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              Pindai kartu identitas santri dengan kamera perangkat atau barcode gun.
            </p>
          </div>
        </button>

        {/* Manual Attendance */}
        <button
          onClick={() => onNavigateToManual()}
          className="p-4 sm:p-5 rounded-3xl bg-white hover:bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 transition-all text-left group flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md min-h-[145px] cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:scale-105 transition-transform shadow-2xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              1-Tap Presensi
            </span>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Absensi Manual
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              Checklist santri per kelas/halaqah, input izin, sakit, dan dispensasi.
            </p>
          </div>
        </button>

        {/* Live Monitoring */}
        <button
          onClick={onNavigateToMonitoring}
          className="p-4 sm:p-5 rounded-3xl bg-white hover:bg-amber-50/50 border border-amber-200 hover:border-amber-400 transition-all text-left group flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md min-h-[145px] cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 group-hover:scale-105 transition-transform shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Live Progress
            </span>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
              Monitoring Sesi Aktif
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              Pantau arus kehadiran santri di semua titik secara real-time.
            </p>
          </div>
        </button>

        {/* RFID Terminals */}
        <button
          onClick={onNavigateToRfid}
          className="p-4 sm:p-5 rounded-3xl bg-white hover:bg-purple-50/50 border border-purple-200 hover:border-purple-400 transition-all text-left group flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md min-h-[145px] cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200 group-hover:scale-105 transition-transform shadow-2xs">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Hardware ESP32
            </span>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
              Terminal RFID Gate
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              Status perangkat gate, log kartu santri, dan sinkronisasi hardware.
            </p>
          </div>
        </button>
      </div>

      {/* Sesi Sedang Berlangsung (Open Sessions Section) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
              Sesi Sedang Dibuka ({openSessions.length})
            </h3>
          </div>
          <button
            onClick={onNavigateToMonitoring}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Live Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {openSessions.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-dashed border-slate-300 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Tidak Ada Sesi yang Sedang Terbuka</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Semua sesi absensi hari ini berstatus draf atau sudah ditutup. Anda dapat membuka sesi baru melalui menu Sesi Hari Ini.
            </p>
            <Button variant="secondary" size="sm" onClick={onNavigateToSessions} className="mt-2">
              Lihat Semua Sesi Hari Ini
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openSessions.map((item) => (
              <OpenSessionMonitoringCard
                key={item.session.id}
                data={item}
                onNavigateDetail={onNavigateToSessionDetail}
                onNavigateManual={onNavigateToManual}
                onNavigateQr={onNavigateToQr}
              />
            ))}
          </div>
        )}
      </div>

      {/* All Today's Sessions List */}
      <div className="space-y-3.5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
              Jadwal Sesi Absensi Hari Ini
            </h3>
            <p className="text-xs text-slate-500">Daftar seluruh kegiatan yang terjadwal untuk hari ini.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sesi / lokasi..."
                className="w-full bg-white text-xs text-slate-900 pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none min-h-[38px]"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToSessions}
              className="flex items-center gap-1 whitespace-nowrap min-h-[38px]"
            >
              <span>Kelola Sesi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSessions.map((session) => {
            const act = INITIAL_ACTIVITIES.find((a) => a.id === session.activity_id);
            return (
              <SessionCard
                key={session.id}
                session={session}
                activity={act}
                totalEligible={session.total_participants || 40}
                recordedCount={session.total_present + session.total_late || 0}
                unrecordedCount={Math.max(0, (session.total_participants || 40) - (session.total_present + session.total_late || 0))}
                onViewDetail={onNavigateToSessionDetail}
                onNavigateManual={onNavigateToManual}
                onNavigateQr={onNavigateToQr}
                onOpenSession={async (sId) => {
                  await attendanceApi.openSession(sId);
                  loadData();
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
