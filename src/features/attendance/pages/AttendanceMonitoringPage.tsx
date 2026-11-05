import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Sparkles,
  QrCode,
  ClipboardCheck,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { attendanceApi } from '../api/attendanceApi';
import { AttendanceTodayKpi, OpenSessionMonitoringData } from '../types';
import { OpenSessionMonitoringCard } from '../components/OpenSessionMonitoringCard';
import { SessionSummaryKpi } from '../components/SessionSummaryKpi';

interface AttendanceMonitoringPageProps {
  onBack?: () => void;
  onNavigateToDetail: (sessionId: number) => void;
  onNavigateToManual: (sessionId: number) => void;
  onNavigateToQr: (sessionId: number) => void;
}

export const AttendanceMonitoringPage: React.FC<AttendanceMonitoringPageProps> = ({
  onBack,
  onNavigateToDetail,
  onNavigateToManual,
  onNavigateToQr,
}) => {
  const [openSessions, setOpenSessions] = useState<OpenSessionMonitoringData[]>([]);
  const [kpi, setKpi] = useState<AttendanceTodayKpi | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const [sessionsData, kpiData] = await Promise.all([
        attendanceApi.getOpenSessionsMonitoring(),
        attendanceApi.getTodayKpi(),
      ]);
      setOpenSessions(sessionsData);
      setKpi(kpiData);
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time polling
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadData();
    }, 8000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

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
                Live Stream Presensi Santri
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Live Monitoring Sesi Absensi
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
              Pemantauan arus pencatatan kehadiran santri di seluruh titik lokasi kegiatan pesantren secara real-time dan transparan.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer active:scale-95 ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-black/30 text-slate-300 border-white/15 hover:bg-black/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? 'Live Polling (8s)' : 'Polling Dijeda'}</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition backdrop-blur-xs cursor-pointer active:scale-95 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-[#12372A] font-black px-4 py-2 rounded-xl text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#1F5C45]" />
                <span>Kembali</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Global Summary */}
      {kpi && (
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <SessionSummaryKpi
            title="Rekapitulasi Global Pesantren Hari Ini"
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
        </div>
      )}

      {/* Open Sessions Live Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
              Sesi Sedang Terbuka ({openSessions.length})
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">Sinkronisasi otomatis aktif</span>
        </div>

        {openSessions.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-300 shadow-2xs">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">Tidak Ada Sesi yang Sedang Dibuka</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Saat ini seluruh sesi absensi hari ini berstatus draf atau sudah ditutup. Buka sesi absensi baru melalui menu <strong>Kelola Sesi</strong>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openSessions.map((item) => (
              <OpenSessionMonitoringCard
                key={item.session.id}
                data={item}
                onNavigateDetail={onNavigateToDetail}
                onNavigateManual={onNavigateToManual}
                onNavigateQr={onNavigateToQr}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
