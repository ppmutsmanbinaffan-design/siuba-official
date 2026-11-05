import React, { useState, useCallback, useRef } from 'react';
import { Briefcase, ArrowLeft, QrCode, Sparkles, RefreshCw, Volume2, ShieldCheck, History, Radio } from 'lucide-react';
import { User } from '../../../types';
import { StaffScanFeedbackItem } from '../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { QrScannerPanel } from '../../attendance/components/QrScannerPanel';
import { StaffScanResultCard } from '../components/StaffScanResultCard';
import { Button } from '../../../components/ui/Button';
import { formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface StaffDailyQrScannerPageProps {
  currentUser: User;
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffDailyQrScannerPage: React.FC<StaffDailyQrScannerPageProps> = ({
  currentUser,
  onNavigate,
  showToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [cooldownActive, setCooldownActive] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<StaffScanFeedbackItem | null>(null);
  const [scanHistory, setScanHistory] = useState<StaffScanFeedbackItem[]>([]);

  // Scan handler
  const handleScan = useCallback(async (qrToken: string) => {
    if (isLocked) return;
    setIsLocked(true);
    setCooldownActive(true);

    try {
      const result = await StaffAttendanceApi.recordDailyScan({
        identifier: qrToken,
        method: 'qr',
        operatorName: currentUser.name,
      });

      setLastResult(result);
      setScanHistory((prev) => [result, ...prev.slice(0, 19)]);

      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast('Gagal memproses kode QR: ' + err.message, 'error');
    } finally {
      // Cooldown debounce protection (2 seconds)
      setTimeout(() => {
        setIsLocked(false);
        setCooldownActive(false);
      }, 2000);
    }
  }, [isLocked, currentUser.name, showToast]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('staff-daily-attendance')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-9 w-9 p-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                MODE: KEHADIRAN HARIAN SDM
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight mt-1">
              Live QR Scanner Harian SDM
            </h1>
            <p className="text-xs text-zinc-400">
              {formatDateIndonesian(todayStr)} • Check-in otomatis & Check-out saat pulang
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
            Monitoring RFID
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('staff-daily-attendance')}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Tabel Presensi
          </Button>
        </div>
      </div>

      {/* Main Grid: Scanner (Left) & Result + History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Panel (lg: 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#1F5C45] dark:text-[#2F7D5A]" />
                <h3 className="text-sm font-bold text-zinc-200">Kamera Scanner Presensi</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Audio & Haptic Aktif</span>
              </div>
            </div>

            {/* Reusable Camera Panel */}
            <QrScannerPanel
              onScan={handleScan}
              isLocked={isLocked}
              cooldownActive={cooldownActive}
              cooldownSeconds={2}
            />

            {/* Context Note */}
            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
                <span>Aturan Check-in / Check-out Harian:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                • Scan pertama hari ini dicatat sebagai <strong>Check-in</strong> masuk kerja.<br />
                • Scan berikutnya pada jendela jam pulang dicatat sebagai <strong>Check-out</strong>.<br />
                • Token diverifikasi langsung oleh backend, status terlambat dihitung secara otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* Result & Recent Scans (lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Result Card */}
          <StaffScanResultCard
            lastResult={lastResult}
            onClear={() => setLastResult(null)}
          />

          {/* Recent Scans Feed */}
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <History className="w-4 h-4 text-zinc-400" />
                <span>Riwayat Scan Sesi Ini ({scanHistory.length})</span>
              </div>
              {scanHistory.length > 0 && (
                <button
                  onClick={() => setScanHistory([])}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Belum ada aktivitas scan pada sesi ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      item.success
                        ? 'bg-zinc-950/80 border-zinc-800/80'
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-200 truncate">
                        {item.staffName || 'Staf'}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {item.staffNumber || '—'} • {item.mode || 'SCAN'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.status === 'late'
                            ? 'bg-amber-500/10 text-amber-400'
                            : item.success
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {item.success ? (item.status === 'late' ? 'TERLAMBAT' : 'BERHASIL') : 'DITOLAK'}
                      </span>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {item.timestamp.substring(11, 19)}
                      </div>
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
