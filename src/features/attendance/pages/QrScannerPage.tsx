import React, { useEffect, useState, useCallback } from 'react';
import { 
  QrCode, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  Sparkles,
  Play,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { QrScannerPanel } from '../components/QrScannerPanel';
import { ScanResultCard } from '../components/ScanResultCard';
import { SessionStatusBadge } from '../components/SessionStatusBadge';
import { AttendanceMethodBadge } from '../components/AttendanceMethodBadge';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { attendanceApi } from '../api/attendanceApi';
import { 
  AttendanceSession, 
  QrScanHistoryItem, 
  User 
} from '../types';
import { AudioFeedbackService } from '../../../services/audioFeedbackService';
import { INITIAL_USERS } from '../../../data/initialData';
import { formatAttendanceTime, getAttendanceErrorMessage } from '../utils/attendanceUtils';

interface QrScannerPageProps {
  initialSessionId?: number;
  currentUser?: User;
  onBack?: () => void;
  onNavigateToDetail?: (sessionId: number) => void;
}

export const QrScannerPage: React.FC<QrScannerPageProps> = ({
  initialSessionId,
  currentUser,
  onBack,
  onNavigateToDetail,
}) => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId || null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [cooldownActive, setCooldownActive] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<QrScanHistoryItem | null>(null);
  const [scanHistory, setScanHistory] = useState<QrScanHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load Sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await attendanceApi.getSessions();
      setSessions(data);
      if (!selectedSessionId && data.length > 0) {
        // Default to first open session or first session
        const open = data.find((s) => s.status === 'open');
        setSelectedSessionId(open ? open.id : data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions for QR scanner:', err);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const isSessionOpen = currentSession?.status === 'open';

  // Toggle Sound feedback
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    AudioFeedbackService.setSoundEnabled(next);
    if (next) AudioFeedbackService.playSuccess();
  };

  // QR Scan Handler
  const handleScan = async (qrToken: string) => {
    if (!selectedSessionId || isLocked || cooldownActive) return;

    setIsLocked(true);

    try {
      const response = await attendanceApi.submitQr({
        sessionId: selectedSessionId,
        qrToken,
        operator: currentUser,
        checkInTime: new Date().toISOString(),
      });

      const studentObj = response.student;
      const attObj = response.attendance || response.newRecord;
      const historyItem: QrScanHistoryItem = {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: studentObj?.id || 0,
        studentName: studentObj?.name || 'Santri',
        studentNumber: studentObj?.student_number || qrToken,
        classroomName: studentObj?.classroom || 'Santri',
        status: attObj?.status || 'present',
        method: 'qr',
        checkInAt: attObj?.check_in_at || new Date().toISOString(),
        lateMinutes: attObj?.late_minutes || 0,
        resultCode: response.code,
        message: getAttendanceErrorMessage(response.code, response.message),
        photoPath: studentObj?.photo_path,
        originalMethod: response.existingAttendance?.method,
        originalTime: response.existingAttendance?.check_in_at,
      };

      setLastResult(historyItem);
      setScanHistory((prev) => [historyItem, ...prev.slice(0, 19)]); // Keep last 20

      // Trigger 1.8 second cooldown before next scan
      setIsLocked(false);
      setCooldownActive(true);
      setTimeout(() => {
        setCooldownActive(false);
      }, 1800);
    } catch (err: any) {
      console.error('Error submitting QR scan:', err);
      const errorItem: QrScanHistoryItem = {
        id: `scan-${Date.now()}`,
        studentId: 0,
        studentName: 'Gagal Memproses',
        studentNumber: qrToken,
        classroomName: '—',
        status: 'absent',
        method: 'qr',
        checkInAt: new Date().toISOString(),
        lateMinutes: 0,
        resultCode: 'SERVER_ERROR',
        message: err.message || 'Terjadi kesalahan sistem saat memproses absensi.',
      };

      setLastResult(errorItem);
      setIsLocked(false);
      setCooldownActive(true);
      setTimeout(() => {
        setCooldownActive(false);
      }, 2000);
    }
  };

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
                Live Scanner Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Terminal Scanner QR Absensi
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
              Pindai barcode atau QR kartu santri dengan kamera perangkat atau barcode gun scanner untuk presensi berkecepatan tinggi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer active:scale-95 ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-black/30 text-slate-300 border-white/15 hover:bg-black/40'
              }`}
              title={soundEnabled ? 'Suara & Chime Aktif' : 'Suara Dimatikan'}
              aria-label="Toggle Suara Feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>{soundEnabled ? 'Audio Aktif' : 'Audio Bisu'}</span>
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-white/15 transition backdrop-blur-xs cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session Context Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sesi Absensi Aktif:</span>
            </label>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              aria-label="Pilih Sesi Absensi Aktif"
              className="w-full bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none min-h-[44px] transition cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.status.toUpperCase()}] {s.activity_name} ({s.session_code}) — {formatAttendanceTime(s.start_at)} WIB
                </option>
              ))}
            </select>
          </div>

          {currentSession && (
            <div className="flex items-center gap-2 self-start md:self-end pt-1">
              <SessionStatusBadge status={currentSession.status} size="lg" />
              {currentSession.status === 'draft' && (
                <button
                  onClick={async () => {
                    await attendanceApi.openSession(currentSession.id);
                    await loadSessions();
                  }}
                  className="flex items-center gap-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 text-[#EADAA2]" />
                  <span>Buka Sesi Ini</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!isSessionOpen && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sesi saat ini berstatus <strong className="uppercase font-bold text-amber-800">{currentSession?.status || 'DRAF'}</strong>. Kamera tetap dapat memindai kartu santri untuk uji coba validasi.
            </span>
          </div>
        )}
      </div>

      {/* Main Dual-Column Workspace: Left = Scanner, Right = Live Feedback & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Camera Scanner & Viewfinder (7 Columns on Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <QrScannerPanel
            onScan={handleScan}
            isLocked={isLocked}
            cooldownActive={cooldownActive}
            cooldownSeconds={2}
            disabled={false}
          />
        </div>

        {/* Right Column: Instant Feedback & Stream (5 Columns on Desktop) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Visual Scan Result Card */}
          <ScanResultCard
            lastResult={lastResult}
            onClear={() => setLastResult(null)}
          />

          {/* Recent Scans Live Stream */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-700" />
                <span>Riwayat Scan Terakhir ({scanHistory.length})</span>
              </h4>
              {scanHistory.length > 0 && (
                <button
                  onClick={() => setScanHistory([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Belum Ada Kartu yang Dipindai</p>
                <p className="text-[11px] text-slate-400">Riwayat kartu santri yang berhasil tercatat akan tampil langsung di sini.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 flex items-center justify-between gap-2 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900 truncate block">
                          {item.studentName}
                        </strong>
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                          {item.studentNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.classroomName} • {item.message}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <AttendanceStatusBadge
                        status={item.resultCode === 'SUCCESS' ? item.status : 'unrecorded'}
                        size="sm"
                      />
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {formatAttendanceTime(item.checkInAt)} WIB
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
