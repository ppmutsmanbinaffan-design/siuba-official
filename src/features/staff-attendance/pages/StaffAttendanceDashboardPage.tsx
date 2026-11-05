import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, 
  BookOpen, 
  Award, 
  QrCode, 
  Radio, 
  Plus, 
  CalendarDays, 
  RefreshCw, 
  ArrowRight, 
  AlertTriangle, 
  FileText,
  Users,
  CheckCircle2
} from 'lucide-react';
import { User, Staff } from '../../../types';
import { StaffDailySummary, TeachingAttendanceSummary, TrainingAttendanceSummary } from '../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { StaffDailySummaryKpi } from '../components/StaffDailySummaryKpi';
import { TeachingSummaryKpi } from '../components/TeachingSummaryKpi';
import { TrainingSummaryKpi } from '../components/TrainingSummaryKpi';
import { StaffNeedsReviewCard } from '../components/StaffNeedsReviewCard';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface StaffAttendanceDashboardPageProps {
  currentUser: User;
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffAttendanceDashboardPage: React.FC<StaffAttendanceDashboardPageProps> = ({
  currentUser,
  onNavigate,
  showToast,
}) => {
  const today = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dailySummary, setDailySummary] = useState<StaffDailySummary | null>(null);
  const [teachingSummary, setTeachingSummary] = useState<TeachingAttendanceSummary | null>(null);
  const [trainingSummary, setTrainingSummary] = useState<TrainingAttendanceSummary | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dailyRes, teachingRes, trainingRes] = await Promise.all([
        StaffAttendanceApi.getDailySummary(selectedDate),
        StaffAttendanceApi.getTeachingSummary(selectedDate),
        StaffAttendanceApi.getTrainingSummary(selectedDate),
      ]);

      if (dailyRes.data) setDailySummary(dailyRes.data);
      if (teachingRes.data) setTeachingSummary(teachingRes.data);
      if (trainingRes.data) setTrainingSummary(trainingRes.data);
    } catch (err: any) {
      showToast('Gagal memuat ringkasan dashboard SDM: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-[#1F5C45]/15 text-[#1F5C45] dark:text-[#2F7D5A]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Pusat Presensi SDM & Pengajar (v1.0.4)
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Monitoring terpadu Kehadiran Harian, KBM Guru Mengajar, dan Pelatih Ekstrakurikuler.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
          />

          <Button
            size="sm"
            variant="secondary"
            onClick={loadDashboardData}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={() => onNavigate('staff-daily-qr')}
            className="bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold shadow-sm"
          >
            <QrCode className="w-4 h-4 mr-1.5" />
            Scan QR Harian
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState text="Memuat ringkasan data presensi SDM..." />
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: KEHADIRAN HARIAN SDM */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">1. Kehadiran Harian Pegawai & Staf</h2>
                  <p className="text-xs text-zinc-400">
                    Rekapitulasi masuk/pulang gerbang & kantor untuk {formatDateIndonesian(selectedDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('staff-rfid-monitoring')}
                  className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Radio className="w-3.5 h-3.5 mr-1" />
                  Terminal RFID
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigate('staff-daily-attendance')}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  Buka Lembar Harian
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {dailySummary && (
              <StaffDailySummaryKpi
                summary={dailySummary}
                onFilterClick={(status) => onNavigate('staff-daily-attendance', { filterStatus: status })}
              />
            )}
          </div>

          {/* SECTION 2: KEHADIRAN MENGAJAR GURU (KBM) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">2. Kehadiran Guru Mengajar (KBM)</h2>
                  <p className="text-xs text-zinc-400">
                    Pemantauan kehadiran jam tatap muka kelas pelajaran & delegasi guru pengganti
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('teacher-substitution')}
                  className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Guru Pengganti
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigate('teaching-attendance')}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  Daftar Sesi Mengajar
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {teachingSummary && (
              <TeachingSummaryKpi
                summary={teachingSummary}
                onFilterClick={(status) => onNavigate('teaching-attendance', { filterStatus: status })}
              />
            )}
          </div>

          {/* SECTION 3: KEHADIRAN MELATIH & REALISASI EKSTRAKURIKULER */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">3. Kehadiran Pelatih & Realisasi Ekstrakurikuler</h2>
                  <p className="text-xs text-zinc-400">
                    Presensi pelatih/pembina di lapangan dan verifikasi pengisian jurnal kegiatan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('training-realization')}
                  className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Jurnal Realisasi
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigate('training-attendance')}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  Daftar Sesi Ekskul
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {trainingSummary && (
              <TrainingSummaryKpi
                summary={trainingSummary}
                onFilterClick={(status) => onNavigate('training-attendance', { filterStatus: status })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
