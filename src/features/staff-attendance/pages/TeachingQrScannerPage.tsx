import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, ArrowLeft, QrCode, Sparkles, Volume2, ShieldCheck, History, Users } from 'lucide-react';
import { User, TeachingSession } from '../../../types';
import { StaffScanFeedbackItem } from '../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { QrScannerPanel } from '../../attendance/components/QrScannerPanel';
import { StaffScanResultCard } from '../components/StaffScanResultCard';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TeachingQrScannerPageProps {
  sessionId: number;
  currentUser: User;
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeachingQrScannerPage: React.FC<TeachingQrScannerPageProps> = ({
  sessionId,
  currentUser,
  onNavigate,
  showToast,
}) => {
  const [session, setSession] = useState<TeachingSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [cooldownActive, setCooldownActive] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<StaffScanFeedbackItem | null>(null);
  const [scanHistory, setScanHistory] = useState<StaffScanFeedbackItem[]>([]);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StaffAttendanceApi.getTeachingSessionDetail(sessionId);
      if (res.data) setSession(res.data);
    } catch (err: any) {
      showToast('Gagal memuat detail sesi KBM: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleScan = useCallback(
    async (qrToken: string) => {
      if (isLocked || !session) return;
      setIsLocked(true);
      setCooldownActive(true);

      try {
        const result = await StaffAttendanceApi.recordTeachingAttendanceScan({
          sessionId: session.id,
          qrToken,
          operatorName: currentUser.name,
        });

        // Attach context info
        result.attendanceType = 'teaching';
        result.contextName = `${session.subject_name} (${session.classroom_name})`;

        setLastResult(result);
        setScanHistory((prev) => [result, ...prev.slice(0, 14)]);

        if (result.success) {
          showToast(result.message, 'success');
          loadSession();
        } else {
          showToast(result.message, 'error');
        }
      } catch (err: any) {
        showToast('Gagal memproses kode QR guru: ' + err.message, 'error');
      } finally {
        setTimeout(() => {
          setIsLocked(false);
          setCooldownActive(false);
        }, 2000);
      }
    },
    [isLocked, session, currentUser.name, showToast, loadSession]
  );

  if (isLoading) {
    return <LoadingState text="Menyiapkan scanner presensi mengajar..." />;
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-zinc-400 space-y-4">
        <p>Sesi KBM tidak ditemukan.</p>
        <Button variant="secondary" onClick={() => onNavigate('teaching-attendance')}>
          Kembali ke Daftar KBM
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('teaching-session-detail', { sessionId: session.id })}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-9 w-9 p-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                PRESENSI KBM GURU
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight mt-1">
              {session.subject_name} — {session.classroom_name}
            </h1>
            <p className="text-xs text-zinc-400">
              {session.start_time} – {session.end_time} WIB • Guru: {session.teacher_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('teaching-session-detail', { sessionId: session.id })}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Detail Sesi
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#1F5C45] dark:text-[#2F7D5A]" />
                <h3 className="text-sm font-bold text-zinc-200">Kamera Scanner Guru Kelas</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Audio Aktif</span>
              </div>
            </div>

            <QrScannerPanel
              onScan={handleScan}
              isLocked={isLocked}
              cooldownActive={cooldownActive}
              cooldownSeconds={2}
            />

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Validasi Guru Sesi Ini:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                • Pemindaian menerima kartu QR dari <strong>{session.teacher_name}</strong> atau guru pengganti resmi jika sudah didelegasikan.<br />
                • Guru lain yang memindai tanpa penugasan delegasi resmi akan ditolak sistem secara otomatis.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <StaffScanResultCard
            lastResult={lastResult}
            onClear={() => setLastResult(null)}
          />

          {/* History */}
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <History className="w-4 h-4 text-zinc-400" />
                <span>Riwayat Scan Sesi KBM ({scanHistory.length})</span>
              </div>
            </div>

            {scanHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                Belum ada aktivitas scan pada sesi KBM ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      item.success ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-rose-500/10 border-rose-500/30'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-zinc-200">{item.staffName}</div>
                      <div className="text-[10px] text-zinc-400">{item.message}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {item.success ? 'BERHASIL' : 'DITOLAK'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
