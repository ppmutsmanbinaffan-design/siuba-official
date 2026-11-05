import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Cpu, 
  Terminal, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wifi, 
  ShieldAlert, 
  Clock, 
  Layers, 
  Sparkles, 
  User, 
  Check, 
  Zap, 
  Volume2,
  VolumeX,
  Server,
  Award,
  Activity,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { 
  Activity as ActivityType, 
  AttendanceDevice, 
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  RfidAttendanceResponse, 
  Student, 
  User as UserType 
} from '../types';
import { RfidAttendanceService } from '../services/rfidAttendanceService';
import { AudioFeedbackService } from '../services/audioFeedbackService';
import { StudentIdentityService } from '../services/studentIdentityService';

interface Props {
  sessions: AttendanceSession[];
  students: Student[];
  activities: ActivityType[];
  devices: AttendanceDevice[];
  records: AttendanceRecord[];
  sessionParticipants?: AttendanceSessionParticipant[];
  currentUser: UserType;
  onRecordAttendance: (params: {
    sessionId: number;
    student: Student;
    method: AttendanceMethod;
    device?: AttendanceDevice;
    checkInTime?: string;
    allowParticipantOverride?: boolean;
  }) => AttendanceResult;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RfidSimulatorView: React.FC<Props> = ({
  sessions,
  students,
  activities,
  devices,
  records,
  sessionParticipants = [],
  currentUser,
  onRecordAttendance,
  onShowToast,
}) => {
  // Simulator State
  const rfidDevices = devices.filter((d) => d.device_type === 'rfid_reader');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(rfidDevices[0]?.id || 1);
  const [customRfidInput, setCustomRfidInput] = useState<string>('04 A8 7F 12');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [deviceMode, setDeviceMode] = useState<'attendance' | 'enrollment'>('attendance');
  const [isCopiedLog, setIsCopiedLog] = useState(false);

  // Simulated Hardware State
  const [ledColor, setLedColor] = useState<'blue' | 'green' | 'red' | 'amber'>('blue');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [oledScreen, setOledScreen] = useState<{
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    type: 'standby' | 'success' | 'warning' | 'error' | 'reading';
  }>({
    line1: 'SIUBA ABSENSI',
    line2: 'GATE MASJID 01',
    line3: 'TEMPEL KARTU',
    line4: 'READY (192.168.1.101)',
    type: 'standby',
  });

  // Recent Tap Stream & Serial Monitor
  const [serialLogs, setSerialLogs] = useState<string[]>([
    `[00:00:01] [BOOT] ESP32 DevKit v1 booting... Flash: 4MB, Dual-Core 240MHz`,
    `[00:00:02] [SPI] MFRC522 RFID Reader initialized on SS:5, RST:22 (Firmware v1.2.0)`,
    `[00:00:03] [WIFI] Connecting to SSID 'SIUBA-PESANTREN-LAN'... Connected! IP: 192.168.1.101`,
    `[00:00:04] [AUTH] POST /api/v1/device/heartbeat HTTP/1.1 -> 200 OK (Device MSJ-RFID-01 Authenticated)`,
    `[00:00:05] [READY] Attendance engine waiting for RFID 13.56MHz cards...`,
  ]);

  const [lastResponse, setLastResponse] = useState<RfidAttendanceResponse | null>(null);
  const [recentTaps, setRecentTaps] = useState<Array<{
    time: string;
    studentName: string;
    status: string;
    method: string;
    code: string;
    deviceCode: string;
    uid: string;
  }>>([]);

  const currentDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || {
    id: 1,
    device_code: 'MSJ-RFID-01',
    device_name: 'RFID Gerbang Utama',
    location: 'Masjid Utama Kampus 1',
    plain_secret_preview: 'sec_live_msj01_dev',
    ip_address: '192.168.1.101'
  };
  const activeSession = sessions.find((s) => s.id === currentDevice?.current_session_id) || sessions.find((s) => s.status === 'open') || sessions[0];

  const serialBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    serialBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialLogs]);

  const addSerialLog = (msg: string) => {
    const timeStr = new Date().toTimeString().slice(0, 8);
    setSerialLogs((prev) => [...prev.slice(-100), `[${timeStr}] ${msg}`]);
  };

  // Trigger Hardware Tap
  const triggerCardTap = (rawUid: string, label?: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const normalized = StudentIdentityService.normalizeRfid(rawUid) || rawUid.toUpperCase();
    const timeStr = new Date().toTimeString().slice(0, 8);

    addSerialLog(`[CARD_DETECT] PICC Type: MIFARE 1KB, Raw UID: '${rawUid}' -> Normalized: '${normalized}'`);
    
    setOledScreen({
      line1: 'MEMBACA KARTU...',
      line2: `UID: ${normalized}`,
      line3: 'MENGHUBUNGI SERVER',
      line4: 'MOHON TUNGGU',
      type: 'reading',
    });

    const startTime = performance.now();

    setTimeout(() => {
      const res = RfidAttendanceService.recordRfidAttendance({
        rawRfidUid: rawUid,
        deviceCode: currentDevice.device_code,
        deviceSecret: currentDevice.plain_secret_preview,
        devices,
        allStudents: students,
        sessions,
        activities,
        existingRecords: records,
        sessionParticipants,
      });

      const latency = Math.round(performance.now() - startTime);
      setLastResponse(res.response);

      if (res.response.success && res.newRecord) {
        const rec = res.newRecord;
        const isLate = rec.status === 'late';

        setLedColor(isLate ? 'amber' : 'green');
        if (soundEnabled) isLate ? AudioFeedbackService.playLate() : AudioFeedbackService.playSuccess();

        setOledScreen({
          line1: (res.response.display_name || 'SANTRI').toUpperCase().slice(0, 16),
          line2: isLate ? `TERLAMBAT ${rec.late_minutes}M` : 'HADIR TEPAT WAKTU',
          line3: `JAM: ${rec.check_in_at.slice(11, 19)}`,
          line4: 'STATUS: TERCATAT',
          type: 'success',
        });

        addSerialLog(`[HTTP_POST] 200 OK -> SUCCESS | ${rec.student_name} (${rec.status.toUpperCase()}) | Latency: ${latency}ms`);

        setRecentTaps((prev) => [
          {
            time: timeStr,
            studentName: rec.student_name,
            status: rec.status,
            method: 'RFID (ESP32)',
            code: 'SUCCESS',
            deviceCode: currentDevice.device_code,
            uid: normalized,
          },
          ...prev.slice(0, 9),
        ]);

        onShowToast(`Tap Sukses: ${rec.student_name} (${isLate ? `Terlambat ${rec.late_minutes}m` : 'Hadir Tepat Waktu'})`, 'success');
      } else {
        const code = res.response.code;
        const isDuplicate = code === 'ALREADY_RECORDED';

        setLedColor(isDuplicate ? 'amber' : 'red');
        if (soundEnabled) isDuplicate ? AudioFeedbackService.playDuplicate() : AudioFeedbackService.playError();

        let oledL1 = 'GAGAL ABSEN', oledL2 = String(code);
        if (code === 'ALREADY_RECORDED') {
          oledL1 = (res.response.display_name || 'SANTRI').toUpperCase().slice(0, 16);
          oledL2 = 'SUDAH ABSEN';
        } else if (code === 'RFID_NOT_REGISTERED') {
          oledL1 = 'KARTU TIDAK';
          oledL2 = 'TERDAFTAR';
        }

        setOledScreen({
          line1: oledL1,
          line2: oledL2,
          line3: `ERR: ${code}`,
          line4: `UID: ${normalized.slice(0, 8)}`,
          type: isDuplicate ? 'warning' : 'error',
        });

        addSerialLog(`[HTTP_POST] Response: ${code} - ${res.response.message} | Latency: ${latency}ms`);

        setRecentTaps((prev) => [
          {
            time: timeStr,
            studentName: res.response.display_name || `Card: ${normalized}`,
            status: isDuplicate ? 'duplicate' : 'error',
            method: 'RFID (ESP32)',
            code: code,
            deviceCode: currentDevice.device_code,
            uid: normalized,
          },
          ...prev.slice(0, 9),
        ]);

        onShowToast(res.response.message, 'error');
      }

      setIsProcessing(false);

      setTimeout(() => {
        setLedColor('blue');
        setOledScreen({
          line1: 'SIUBA ABSENSI',
          line2: currentDevice.device_code,
          line3: activeSession ? activeSession.activity_name.slice(0, 16) : 'STANDBY',
          line4: 'TEMPEL KARTU',
          type: 'standby',
        });
      }, 3500);
    }, 450);
  };

  const handleHoldCardDebounceTest = (rawUid: string) => {
    addSerialLog(`[DEBOUNCE_TEST] Santri menempelkan kartu dan menahannya selama 3 detik...`);
    triggerCardTap(rawUid);
    addSerialLog(`[DEBOUNCE_GUARD] Card still present in RF field. Debounce locked for 2500ms. No spam duplicate requests.`);
  };

  const handleRapidSequentialTap = () => {
    addSerialLog(`[STRESS_TEST] Memulai rapid tap antrean 4 santri berurutan...`);
    const testCards = [
      { uid: '04A87F12', name: 'Ahmad Fauzan' },
      { uid: '04A87F13', name: 'Muhammad Yusuf' },
      { uid: '04A87F14', name: 'Abdul Aziz' },
      { uid: '04A87F15', name: 'Hasan Al-Bashri' },
    ];

    testCards.forEach((c, idx) => {
      setTimeout(() => {
        addSerialLog(`[QUEUE_TAP #${idx + 1}] Menempelkan kartu ${c.name} (UID: ${c.uid})`);
        triggerCardTap(c.uid);
      }, idx * 1800);
    });
  };

  const handleCopySerialLogs = () => {
    navigator.clipboard.writeText(serialLogs.join('\n'));
    setIsCopiedLog(true);
    setTimeout(() => setIsCopiedLog(false), 2000);
    onShowToast('Log Serial Monitor berhasil disalin ke clipboard.', 'success');
  };

  return (
    <div id="rfid-simulator-container" className="space-y-6 pb-12">
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white p-6 sm:p-7 rounded-3xl border border-[#164735] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Award className="w-3 h-3 text-[#C9A227]" />
              SIUBA v1.1.3 PRODUCTION
            </span>
            <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-[#C9A227]" />
              Hardware Workbench & ESP32 Emulator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Simulator Terminal RFID & Mikrokontroler ESP32
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Simulasi interaktif perangkat keras RFID, visualisasi display OLED SSD1306 (128x64), LED RGB multi-status, audio buzzer piezoelektrik, dan monitor komunikasi serial LAN REST API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 self-start lg:self-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all cursor-pointer min-h-[36px] active:scale-95 shadow-xs ${
              soundEnabled
                ? 'bg-white text-[#12372A] border-white hover:bg-emerald-50'
                : 'bg-black/30 border-white/20 text-emerald-200 hover:bg-black/40'
            }`}
            title="Toggle Suara Buzzer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#1F5C45]" /> : <VolumeX className="w-4 h-4 text-emerald-300" />}
            <span>Buzzer Audio {soundEnabled ? 'Aktif' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setSerialLogs([`[RESET] Serial Monitor log dibersihkan pada ${new Date().toLocaleTimeString()} WIB.`])}
            className="px-3.5 py-2.5 bg-black/30 hover:bg-black/40 text-white rounded-2xl border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[36px] transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Log</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mikrokontroler</div>
            <div className="text-lg font-black text-slate-900 font-mono flex items-center gap-2">ESP32 DevKit v1</div>
            <div className="text-[11px] text-emerald-700 font-semibold font-mono">240MHz &bull; 4MB Flash</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shadow-xs">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Modul Reader</div>
            <div className="text-lg font-black text-sky-900 font-mono">RC522 SPI</div>
            <div className="text-[11px] text-sky-700 font-semibold font-mono">13.56 MHz MIFARE</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kecepatan Respon</div>
            <div className="text-lg font-black text-indigo-900 font-mono">~28 ms</div>
            <div className="text-[11px] text-indigo-700 font-semibold">Latency Sangat Cepat</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Protokol Jaringan</div>
            <div className="text-lg font-black text-amber-900 font-mono">REST LAN</div>
            <div className="text-[11px] text-amber-700 font-semibold font-mono">HTTP POST :8000</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-gradient-to-b from-[#181a20] to-[#0f1115] p-6 rounded-3xl border-2 border-slate-800 shadow-2xl space-y-6 relative overflow-hidden text-white">
            <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600 shadow-inner"></div>
            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600 shadow-inner"></div>
            <div className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600 shadow-inner"></div>
            <div className="absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600 shadow-inner"></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-mono text-xs font-black tracking-wider text-slate-300">SIUBA-RFID-GATEWAY</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-700 shadow-inner">
                <span className="text-[10px] font-mono text-slate-400 font-bold">STATUS LED:</span>
                <span className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${ledColor === 'green' ? 'bg-emerald-400 shadow-lg shadow-emerald-400 animate-pulse ring-2 ring-emerald-300' : ledColor === 'red' ? 'bg-rose-500 shadow-lg shadow-rose-500 animate-pulse ring-2 ring-rose-300' : ledColor === 'amber' ? 'bg-amber-400 shadow-lg shadow-amber-400 animate-pulse ring-2 ring-amber-300' : 'bg-sky-500 shadow-sm shadow-sky-500 ring-2 ring-sky-400/40'}`}></span>
              </div>
            </div>

            <div className="bg-[#040810] border-4 border-slate-900 rounded-2xl p-4 shadow-2xl text-cyan-300 font-mono tracking-wider space-y-1 select-none min-h-[140px] flex flex-col justify-between relative overflow-hidden ring-1 ring-cyan-500/20">
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none opacity-40"></div>
              <div className="flex justify-between items-center text-[10px] text-cyan-400/90 border-b border-cyan-950/80 pb-1">
                <span className="font-bold">[SIUBA OS v1.2]</span>
                <span className="bg-cyan-950/60 px-1.5 py-0.2 rounded text-[9px] text-cyan-300 border border-cyan-800/40">LAN: CONNECTED</span>
              </div>
              <div className="py-2 text-center space-y-1 relative z-10">
                <div className="text-sm font-black text-cyan-100 uppercase truncate drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{oledScreen.line1}</div>
                <div className="text-xs font-bold text-cyan-300 truncate drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]">{oledScreen.line2}</div>
                <div className="text-[11px] text-cyan-400/80 truncate">{oledScreen.line3}</div>
              </div>
              <div className="text-[10px] text-cyan-500 text-center border-t border-cyan-950/80 pt-1 flex justify-between">
                <span>{oledScreen.line4}</span>
                <span className="font-bold">13.56MHz</span>
              </div>
            </div>

            <div onClick={() => triggerCardTap(customRfidInput)} className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2 select-none group relative overflow-hidden ${isProcessing ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/60 hover:border-emerald-500 hover:bg-slate-900'}`}>
              <div className="w-14 h-14 rounded-full bg-slate-800 group-hover:bg-emerald-900/40 mx-auto flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-all border border-slate-700 group-hover:border-emerald-500/50 shadow-inner">
                <Radio className={`w-7 h-7 ${isProcessing ? 'animate-spin text-emerald-400' : ''}`} />
              </div>
              <div className="font-black text-sm text-white group-hover:text-emerald-300 transition-all tracking-wide">
                {isProcessing ? 'MEMINDAI KARTU RFID...' : 'TEMPELKAN KARTU RFID DI SINI'}
              </div>
              <div className="text-[11px] font-mono text-slate-400">MFRC522 SPI 13.56MHz &bull; Jarak Efektif: ~3 cm</div>
            </div>

            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <label className="block text-slate-400 font-bold text-[11px]">Pilih Terminal Pembaca (Reader):</label>
              <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(Number(e.target.value))} className="w-full bg-slate-800 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                {rfidDevices.map((d) => <option key={d.id} value={d.id}>{d.device_code} - {d.device_name} ({d.location})</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1F5C45]" />
                Uji Coba Kartu Santri & Skenario Presensi
              </h3>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">1-Click Tap Simulation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => triggerCardTap('04A87F12', 'Ahmad Fauzan')} className="p-4 bg-slate-50 hover:bg-emerald-50/70 rounded-2xl border border-slate-200 hover:border-emerald-300 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">UID: 04A87F12</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">Kelas 7A</span>
                </div>
                <div className="font-black text-slate-900 text-xs mt-2 group-hover:text-emerald-800">Ahmad Fauzan</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">NIS: UBA260001 &bull; Status: Aktif</div>
              </button>
              <button onClick={() => triggerCardTap('04A87F13', 'Yusuf')} className="p-4 bg-slate-50 hover:bg-emerald-50/70 rounded-2xl border border-slate-200 hover:border-emerald-300 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">UID: 04A87F13</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">Kelas 7A</span>
                </div>
                <div className="font-black text-slate-900 text-xs mt-2 group-hover:text-emerald-800">Muhammad Yusuf</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">NIS: UBA260002 &bull; Status: Aktif</div>
              </button>
              <button onClick={() => triggerCardTap('FFFFFFFF', 'Unknown')} className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl border border-rose-200 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">UID: FFFFFFFF</span>
                  <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">UNREGISTERED</span>
                </div>
                <div className="font-black text-slate-900 text-xs mt-2 group-hover:text-rose-800">Kartu Tidak Terdaftar</div>
                <div className="text-[10px] text-rose-600 font-mono mt-0.5">Simulasi Penolakan Kartu Asing</div>
              </button>
              <button onClick={() => triggerCardTap('04A87F16', 'Bilal')} className="p-4 bg-slate-50 hover:bg-amber-50 rounded-2xl border border-amber-200 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">UID: 04A87F16</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Kelas 7B</span>
                </div>
                <div className="font-black text-slate-900 text-xs mt-2 group-hover:text-amber-800">Bilal Habasyi</div>
                <div className="text-[10px] text-amber-700 font-mono mt-0.5">NIS: UBA260005 &bull; Santri Asrama</div>
              </button>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <input type="text" placeholder="Masukkan custom UID misal: 04 A8 7F 12..." value={customRfidInput} onChange={(e) => setCustomRfidInput(e.target.value)} className="flex-1 bg-slate-50 text-slate-900 font-mono font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => triggerCardTap(customRfidInput)} className="px-5 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[36px] active:scale-95 whitespace-nowrap">Tap UID Manual</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button onClick={() => handleHoldCardDebounceTest('04A87F12')} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[36px] active:scale-95">
                <Clock className="w-4 h-4 text-amber-600" /><span>Uji Tahan Kartu 3s (Anti-Spam)</span>
              </button>
              <button onClick={handleRapidSequentialTap} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[36px] active:scale-95">
                <Zap className="w-4 h-4 text-[#1F5C45]" /><span>Rapid Antrean (4 Santri)</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#1F5C45]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">ESP32 Serial Monitor Output (115200 Baud)</h3>
              </div>
              <button onClick={handleCopySerialLogs} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition">
                {isCopiedLog ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{isCopiedLog ? 'Tersalin' : 'Copy Log'}</span>
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 h-52 overflow-y-auto space-y-1.5 leading-relaxed shadow-inner">
              {serialLogs.map((log, idx) => (
                <div key={idx} className={`${log.includes('200 OK') || log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('ERROR') || log.includes('GAGAL') ? 'text-rose-400 font-bold' : log.includes('DEBOUNCE') || log.includes('AUTH') ? 'text-amber-300' : log.includes('CARD_DETECT') ? 'text-sky-300' : 'text-slate-400'}`}>
                  {log}
                </div>
              ))}
              <div ref={serialBottomRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1F5C45]" />
            Riwayat Stream Tap RFID Realtime
          </h3>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">{recentTaps.length} transaksi terakhir</span>
        </div>
        {recentTaps.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
            Belum ada tap kartu RFID yang dilakukan pada sesi ini. Silakan tempelkan kartu santri di panel atas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Waktu Tap</th>
                  <th className="p-3.5">UID Kartu</th>
                  <th className="p-3.5">Identitas Santri</th>
                  <th className="p-3.5">Terminal Gateway</th>
                  <th className="p-3.5 text-center">Status Presensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentTaps.map((tap, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">{tap.time} WIB</td>
                    <td className="p-3.5">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {tap.uid}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans font-bold text-slate-900">{tap.studentName}</td>
                    <td className="p-3.5 text-slate-600">{tap.deviceCode}</td>
                    <td className="p-3.5 text-center font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          tap.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : tap.status === 'late'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : tap.status === 'duplicate'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {tap.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
