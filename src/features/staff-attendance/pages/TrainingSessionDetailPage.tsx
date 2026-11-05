import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Users, 
  QrCode, 
  CheckCircle2, 
  FileCheck, 
  AlertTriangle, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { User, Staff, TrainingSession } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { StaffAttendanceStatusBadge } from '../components/StaffAttendanceStatusBadge';
import { TrainingManualAttendanceModal } from '../components/TrainingManualAttendanceModal';
import { TrainerSubstitutionModal } from '../components/TrainerSubstitutionModal';
import { TrainingRealizationModal } from '../components/TrainingRealizationModal';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatRealizationStatus, formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TrainingSessionDetailPageProps {
  sessionId: number;
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TrainingSessionDetailPage: React.FC<TrainingSessionDetailPageProps> = ({
  sessionId,
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState<boolean>(false);
  const [isRealizationModalOpen, setIsRealizationModalOpen] = useState<boolean>(false);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StaffAttendanceApi.getTrainingSessionDetail(sessionId);
      if (res.data) {
        setSession(res.data);
      } else {
        showToast('Sesi ekstrakurikuler tidak ditemukan.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal memuat detail sesi ekskul: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (isLoading) {
    return <LoadingState text="Memuat detail sesi ekstrakurikuler..." />;
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-zinc-400 space-y-4">
        <p>Sesi latihan tidak ditemukan.</p>
        <Button variant="secondary" onClick={() => onNavigate('training-attendance')}>
          Kembali ke Daftar Ekskul
        </Button>
      </div>
    );
  }

  const realizationInfo = formatRealizationStatus(session.realization_status);
  const isSubstituted = Boolean(session.is_substituted || session.substitute_coach_staff_id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('training-attendance')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-9 w-9 p-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${realizationInfo.badgeClass}`}>
                JURNAL: {realizationInfo.label}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {formatDateIndonesian(session.session_date)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight mt-1">
              {session.extracurricular_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {session.status !== 'cancelled' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSubstitutionModalOpen(true)}
                className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Users className="w-3.5 h-3.5 mr-1" />
                Pelatih Pengganti
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate('training-qr-scanner', { sessionId: session.id })}
                className="text-xs border-[#1F5C45]/40 text-[#1F5C45] dark:text-[#2F7D5A] hover:bg-[#1F5C45]/10 font-bold"
              >
                <QrCode className="w-3.5 h-3.5 mr-1" />
                Scan QR
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRealizationModalOpen(true)}
                className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-bold"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1" />
                Isi Jurnal
              </Button>

              <Button
                size="sm"
                variant="default"
                onClick={() => setIsManualModalOpen(true)}
                className="text-xs bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Presensi Pelatih
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Waktu Latihan
          </span>
          <div className="text-lg font-bold font-mono text-zinc-100">
            {session.scheduled_start_at} – {session.scheduled_end_at} WIB
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{session.location}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" /> Presensi Santri Terdaftar
          </span>
          <div className="text-lg font-bold font-mono text-zinc-100">
            {session.student_present_count ?? 0} <span className="text-zinc-500 text-sm">/ {session.student_eligible_count ?? '—'} Santri</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Daftar presensi santri terpisah dari presensi instruktur
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Status Presensi Pelatih
          </span>
          <div className="pt-0.5">
            <StaffAttendanceStatusBadge status={session.trainer_attendance_status} />
          </div>
          {session.late_minutes && session.late_minutes > 0 ? (
            <p className="text-[11px] text-amber-400">
              Terlambat {session.late_minutes} menit
            </p>
          ) : null}
        </div>
      </div>

      {/* Coaches Comparison */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Pelatih / Pembina Bertugas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Coach */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Pelatih Utama (Terjadwal)
            </span>

            <div className="flex items-center gap-3">
              <PersonAvatar name={session.coach_name} className="w-10 h-10 rounded-xl" />
              <div>
                <h4 className="text-sm font-bold text-zinc-100">{session.coach_name}</h4>
                <p className="text-xs text-zinc-400 font-mono">ID Staf: #{session.coach_staff_id}</p>
              </div>
            </div>

            {isSubstituted && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Didelegasikan Resmi
                </span>
                <p className="text-[11px] text-cyan-400/90">
                  Pelatih utama digantikan oleh pelatih pengganti untuk sesi ini.
                </p>
              </div>
            )}
          </div>

          {/* Actual Coach */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              Pelatih yang Hadir
            </span>

            <div className="flex items-center gap-3">
              <PersonAvatar
                name={session.actual_coach_name || session.coach_name}
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h4 className="text-sm font-bold text-zinc-100">
                  {session.actual_coach_name || session.coach_name}
                </h4>
                <p className="text-xs text-zinc-400 font-mono">
                  {isSubstituted ? `Pelatih Pengganti (ID #${session.substitute_coach_staff_id})` : 'Pelatih Utama'}
                </p>
              </div>
            </div>

            {session.trainer_check_in_at ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                <span>Check-in Lapangan: </span>
                <span className="font-mono font-bold">{session.trainer_check_in_at.substring(11, 16)} WIB</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                Belum ada presensi check-in pelatih pada sesi ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jurnal Realisasi Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-400" />
            Jurnal Materi & Realisasi Lapangan
          </h3>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRealizationModalOpen(true)}
            className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
          >
            {session.realization_status === 'submitted' ? 'Edit Jurnal' : 'Isi Jurnal'}
          </Button>
        </div>

        {session.realization_status === 'submitted' ? (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 font-medium block">Topik / Materi yang Disampaikan:</span>
              <h4 className="text-sm font-bold text-purple-300 mt-0.5">{session.topic}</h4>
            </div>

            {session.activity_notes && (
              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 font-medium block">Uraian Pelaksanaan Kegiatan:</span>
                <p className="text-zinc-300 mt-0.5 leading-relaxed">{session.activity_notes}</p>
              </div>
            )}

            {session.obstacles && (
              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-500 font-medium block">Kendala / Sarpras:</span>
                <p className="text-amber-400/90 mt-0.5">{session.obstacles}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-2">
            <p className="text-xs text-zinc-400">Jurnal realisasi materi latihan belum diisi oleh pelatih.</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsRealizationModalOpen(true)}
              className="text-xs bg-zinc-800 text-zinc-200"
            >
              Isi Jurnal Sekarang
            </Button>
          </div>
        )}
      </div>

      {/* Manual Modal */}
      {isManualModalOpen && (
        <TrainingManualAttendanceModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          session={session}
          staffList={staffList}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setIsManualModalOpen(false);
            loadSession();
          }}
        />
      )}

      {/* Substitution Modal */}
      {isSubstitutionModalOpen && (
        <TrainerSubstitutionModal
          isOpen={isSubstitutionModalOpen}
          onClose={() => setIsSubstitutionModalOpen(false)}
          sessions={[session]}
          staffList={staffList}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setIsSubstitutionModalOpen(false);
            loadSession();
          }}
        />
      )}

      {/* Realization Modal */}
      {isRealizationModalOpen && (
        <TrainingRealizationModal
          isOpen={isRealizationModalOpen}
          onClose={() => setIsRealizationModalOpen(false)}
          session={session}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setIsRealizationModalOpen(false);
            loadSession();
          }}
        />
      )}
    </div>
  );
};
