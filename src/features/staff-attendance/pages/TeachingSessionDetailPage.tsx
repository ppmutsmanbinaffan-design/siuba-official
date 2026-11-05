import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Users, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText,
  UserCheck
} from 'lucide-react';
import { User, Staff, TeachingSession } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { StaffAttendanceStatusBadge } from '../components/StaffAttendanceStatusBadge';
import { TeachingManualAttendanceModal } from '../components/TeachingManualAttendanceModal';
import { TeacherSubstitutionModal } from '../components/TeacherSubstitutionModal';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatTeachingSessionStatus, formatDateIndonesian, formatTimeWib } from '../utils/staffAttendanceUtils';

interface TeachingSessionDetailPageProps {
  sessionId: number;
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeachingSessionDetailPage: React.FC<TeachingSessionDetailPageProps> = ({
  sessionId,
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [session, setSession] = useState<TeachingSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState<boolean>(false);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StaffAttendanceApi.getTeachingSessionDetail(sessionId);
      if (res.data) {
        setSession(res.data);
      } else {
        showToast('Sesi mengajar tidak ditemukan.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal memuat detail sesi mengajar: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (isLoading) {
    return <LoadingState text="Memuat detail sesi mengajar..." />;
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-zinc-400 space-y-4">
        <p>Sesi mengajar tidak ditemukan.</p>
        <Button variant="secondary" onClick={() => onNavigate('teaching-attendance')}>
          Kembali ke Daftar Mengajar
        </Button>
      </div>
    );
  }

  const sessionStatus = formatTeachingSessionStatus(session.status);
  const isSubstituted = Boolean(session.is_substituted || session.substitute_teacher_id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('teaching-attendance')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-9 w-9 p-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sessionStatus.badgeClass}`}>
                {sessionStatus.label}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {formatDateIndonesian(session.session_date)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight mt-1">
              {session.subject_name} — {session.classroom_name}
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
                Guru Pengganti
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate('teaching-qr-scanner', { sessionId: session.id })}
                className="text-xs border-[#1F5C45]/40 text-[#1F5C45] dark:text-[#2F7D5A] hover:bg-[#1F5C45]/10 font-bold"
              >
                <QrCode className="w-3.5 h-3.5 mr-1" />
                Scan QR Sesi Ini
              </Button>

              <Button
                size="sm"
                variant="default"
                onClick={() => setIsManualModalOpen(true)}
                className="text-xs bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Presensi Manual
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" /> Jam Tatap Muka
          </span>
          <div className="text-lg font-bold font-mono text-zinc-100">
            {session.start_time} – {session.end_time} WIB
          </div>
          <p className="text-[11px] text-zinc-500">
            Alokasi jam pelajaran kurikulum pesantren
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Kelas & Ruangan
          </span>
          <div className="text-lg font-bold text-zinc-100">
            {session.classroom_name}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">
            ID Jadwal: #{session.academic_schedule_id}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Status Presensi Guru
          </span>
          <div className="pt-0.5">
            <StaffAttendanceStatusBadge status={session.teacher_attendance_status} />
          </div>
          {session.late_minutes && session.late_minutes > 0 ? (
            <p className="text-[11px] text-amber-400">
              Terlambat masuk kelas {session.late_minutes} menit
            </p>
          ) : null}
        </div>
      </div>

      {/* Teachers Assignment Comparison */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Penugasan & Pelaksanaan Guru
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Teacher Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Guru Terjadwal (Original)
            </span>

            <div className="flex items-center gap-3">
              <PersonAvatar name={session.teacher_name} className="w-10 h-10 rounded-xl" />
              <div>
                <h4 className="text-sm font-bold text-zinc-100">{session.teacher_name}</h4>
                <p className="text-xs text-zinc-400 font-mono">ID Staf: #{session.teacher_staff_id}</p>
              </div>
            </div>

            {isSubstituted && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sesi Didelegasikan Resmi
                </span>
                <p className="text-[11px] text-cyan-400/90">
                  Guru utama sedang digantikan secara resmi untuk jadwal jam mengajar ini.
                </p>
              </div>
            )}
          </div>

          {/* Actual / Substitute Teacher Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              Guru yang Mengajar / Pengganti
            </span>

            <div className="flex items-center gap-3">
              <PersonAvatar
                name={session.actual_teacher_name || session.teacher_name}
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h4 className="text-sm font-bold text-zinc-100">
                  {session.actual_teacher_name || session.teacher_name}
                </h4>
                <p className="text-xs text-zinc-400 font-mono">
                  {isSubstituted ? `Guru Pengganti (ID #${session.substitute_teacher_id})` : 'Guru Utama'}
                </p>
              </div>
            </div>

            {session.teacher_check_in_at ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Waktu Masuk Kelas:</span>
                  <span className="font-mono">{session.teacher_check_in_at.substring(11, 16)} WIB</span>
                </div>
                {session.teacher_check_in_method && (
                  <div className="text-[11px] text-emerald-400/80">
                    Metode Presensi: <span className="uppercase font-mono">{session.teacher_check_in_method}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                Belum ada catatan presensi masuk kelas untuk sesi ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Modal */}
      {isManualModalOpen && (
        <TeachingManualAttendanceModal
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
        <TeacherSubstitutionModal
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
    </div>
  );
};
