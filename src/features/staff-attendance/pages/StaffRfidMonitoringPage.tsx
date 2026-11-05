import React, { useState, useEffect, useCallback } from 'react';
import { 
  Radio, 
  ArrowLeft, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Send,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { User, Staff } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { maskCardUid, formatTimeWib } from '../utils/staffAttendanceUtils';

interface StaffRfidMonitoringPageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface RfidTerminal {
  id: string;
  name: string;
  location: string;
  purpose: string;
  status: 'online' | 'offline' | 'warning';
  lastPing: string;
  ipAddress: string;
}

export const StaffRfidMonitoringPage: React.FC<StaffRfidMonitoringPageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [terminals] = useState<RfidTerminal[]>([
    {
      id: 'TERM-01',
      name: 'Terminal Gerbang Utama (SDM & Tamu)',
      location: 'Gerbang Pos Depan',
      purpose: 'Check-in Gerbang & Presensi Pagi',
      status: 'online',
      lastPing: '10 detik yang lalu',
      ipAddress: '192.168.1.101',
    },
    {
      id: 'TERM-02',
      name: 'Terminal Lobi Gedung Administrasi',
      location: 'Lobi Kantor TU Lantai 1',
      purpose: 'Check-in & Check-out Pegawai Kantor',
      status: 'online',
      lastPing: '25 detik yang lalu',
      ipAddress: '192.168.1.102',
    },
    {
      id: 'TERM-03',
      name: 'Terminal Kantor Asatidz & Guru',
      location: 'Ruang Guru Gedung KBM',
      purpose: 'Presensi Masuk Piket & KBM Guru',
      status: 'online',
      lastPing: '1 menit yang lalu',
      ipAddress: '192.168.1.103',
    },
  ]);

  const [rfidTaps, setRfidTaps] = useState<any[]>([]);
  const [selectedStaffForSim, setSelectedStaffForSim] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const simulateTap = async (staffId?: number) => {
    setIsSimulating(true);
    try {
      const targetStaff = staffId ? staffList.find((s) => s.id === staffId) : staffList[0];
      if (!targetStaff) {
        showToast('Pilih staf untuk pengujian simulasi tap RFID.', 'error');
        return;
      }

      const res = await StaffAttendanceApi.recordDailyScan({
        identifier: targetStaff.rfid_card_id || `RFID-${targetStaff.staff_number}`,
        method: 'rfid',
        operatorName: 'Terminal Gerbang RFID-01',
      });

      const newTap = {
        id: Date.now().toString(),
        terminal: 'Terminal Gerbang Pos Depan',
        staffName: res.staffName || targetStaff.name,
        staffNumber: res.staffNumber || targetStaff.staff_number,
        cardUid: maskCardUid(targetStaff.rfid_card_id || '9A-4B-C2-88'),
        time: new Date().toLocaleTimeString('id-ID'),
        status: res.status || 'present',
        success: res.success,
        message: res.message,
      };

      setRfidTaps((prev) => [newTap, ...prev.slice(0, 14)]);

      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast('Gagal memproses tap RFID: ' + err.message, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                HARDWARE & GATEWAY MONITORING
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight mt-1">
              Monitoring Terminal RFID SDM
            </h1>
            <p className="text-xs text-zinc-400">
              Status gateway perangkat scanner RFID di pos gerbang dan lobi gedung pesantren.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Terminal Gateway Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {terminals.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 text-cyan-400 border border-zinc-800">
                  {t.id}
                </span>
                <h4 className="text-sm font-bold text-zinc-100 mt-1">{t.name}</h4>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">Lokasi:</span>
                <span>{t.location}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">Peruntukan:</span>
                <span className="truncate max-w-[150px]">{t.purpose}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">IP Gateway:</span>
                <span className="font-mono text-zinc-300">{t.ipAddress}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
              <span>Heartbeat: {t.lastPing}</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Simulator Card & Recent Taps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Simulator Panel (lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Simulasi Tap Kartu RFID SDM</h3>
                <p className="text-xs text-zinc-400">Uji coba interaksi gateway hardware ke server</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">Pilih Pegawai / Guru</label>
                <Select
                  value={selectedStaffForSim}
                  onChange={(e) => setSelectedStaffForSim(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">-- Pilih Staf Untuk Disimulasikan --</option>
                  {staffList
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.staff_number})
                      </option>
                    ))}
                </Select>
              </div>

              <Button
                variant="default"
                disabled={isSimulating || !selectedStaffForSim}
                onClick={() => simulateTap(Number(selectedStaffForSim))}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                <Radio className={`w-4 h-4 mr-1.5 ${isSimulating ? 'animate-ping' : ''}`} />
                {isSimulating ? 'Memproses Gateway...' : 'Simulasikan Tempel Kartu (Tap)'}
              </Button>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="font-bold text-zinc-300 block">Kepatuhan Keamanan & Privasi:</span>
              <p>
                Nomor UID kartu fisik yang terekam dimasking pada tampilan publik/monitoring untuk menjaga privasi kredensial fisik pegawai.
              </p>
            </div>
          </div>
        </div>

        {/* Live Tap Stream (lg: 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Live Feed Aktivitas Tap RFID ({rfidTaps.length})</span>
              </div>
              {rfidTaps.length > 0 && (
                <button
                  onClick={() => setRfidTaps([])}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium"
                >
                  Bersihkan Feed
                </button>
              )}
            </div>

            {rfidTaps.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                <Radio className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
                <p>Menunggu aktivitas tap pada gateway RFID...</p>
                <p className="text-[11px] text-zinc-600">Gunakan simulator di sebelah kiri untuk menguji alur.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {rfidTaps.map((tap) => (
                  <div
                    key={tap.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      tap.success ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-rose-500/10 border-rose-500/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{tap.staffName}</span>
                        <span className="text-[10px] font-mono text-zinc-500">[{tap.cardUid}]</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        {tap.message}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tap.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {tap.success ? 'BERHASIL' : 'GAGAL'}
                      </span>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">{tap.time} WIB</div>
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
