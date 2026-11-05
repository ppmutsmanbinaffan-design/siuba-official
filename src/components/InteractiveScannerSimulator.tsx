import React, { useState } from 'react';
import { 
  Radio, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Send, 
  Scan, 
  RefreshCw,
  Cpu,
  User,
  ShieldAlert
} from 'lucide-react';
import { 
  Activity, 
  AttendanceDevice, 
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant,
  Student, 
  User as UserType 
} from '../types';
import { AttendanceEngine } from '../services/attendanceEngine';
import { RfidAttendanceService } from '../services/rfidAttendanceService';
import { StudentIdentityService } from '../services/studentIdentityService';

interface ScannerSimulatorProps {
  sessions: AttendanceSession[];
  students: Student[];
  activities: Activity[];
  devices: AttendanceDevice[];
  records: AttendanceRecord[];
  currentUser: UserType;
  sessionParticipants?: AttendanceSessionParticipant[];
  onRecordAttendance: (params: {
    sessionId: number;
    student: Student;
    method: AttendanceMethod;
    device?: AttendanceDevice;
    checkInTime?: string;
    allowParticipantOverride?: boolean;
  }) => AttendanceResult;
}

export const InteractiveScannerSimulator: React.FC<ScannerSimulatorProps> = ({
  sessions,
  students,
  activities,
  devices,
  records,
  currentUser,
  sessionParticipants = [],
  onRecordAttendance,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'rfid' | 'timemachine'>('qr');
  const [selectedSessionId, setSelectedSessionId] = useState<number>(sessions.find(s => s.status === 'open')?.id || sessions[0]?.id || 1);

  // QR state
  const [qrInput, setQrInput] = useState<string>('STU-X7AK29PQ');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // RFID state
  const [rawRfidInput, setRawRfidInput] = useState<string>('04 a8 7f 12');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(devices[0]?.id || 1);

  // Time Machine state
  const [simulatedTimeStr, setSimulatedTimeStr] = useState<string>('2026-08-23 04:25:00');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 1);
  const [selectedMethod, setSelectedMethod] = useState<AttendanceMethod>('rfid');

  // Result output feedback
  const [lastResult, setLastResult] = useState<AttendanceResult | null>(null);

  const activeSession = (selectedSessionId ? sessions.find((s) => s.id === selectedSessionId) : null) || sessions[0] || null;
  const activeActivity = (activeSession ? activities.find((a) => a.id === activeSession.activity_id) : null) || activities[0] || null;
  const normalizedRfid = AttendanceEngine.normalizeRfid(rawRfidInput);

  // Handle QR Scan
  const handleScanQr = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const student = students.find((s) => s.qr_token.toUpperCase() === qrInput.trim().toUpperCase());
      if (!student) {
        setLastResult({
          success: false,
          code: 'STUDENT_NOT_FOUND',
          message: `QR Token '${qrInput}' tidak ditemukan dalam basis data santri.`,
        });
        return;
      }

      const qrDevice = devices.find((d) => d.device_type === 'qr_scanner');
      const res = onRecordAttendance({
        sessionId: selectedSessionId,
        student,
        method: 'qr',
        device: qrDevice,
        checkInTime: new Date().toISOString(),
      });
      setLastResult(res);
    }, 400);
  };

  // Handle RFID Tap
  const handleTapRfid = () => {
    const device = devices.find((d) => d.id === selectedDeviceId) || devices[0];
    const res = RfidAttendanceService.recordRfidAttendance({
      rawRfidUid: rawRfidInput,
      deviceCode: device.device_code,
      deviceSecret: device.plain_secret_preview,
      explicitSessionId: selectedSessionId,
      devices,
      allStudents: students,
      sessions,
      activities,
      existingRecords: records,
      sessionParticipants,
    });

    if (res.response.success && res.newRecord && res.response.student) {
      const studentObj = students.find((s) => s.id === res.response.student?.id);
      if (studentObj) {
        onRecordAttendance({
          sessionId: selectedSessionId,
          student: studentObj,
          method: 'rfid',
          device,
          checkInTime: new Date().toISOString(),
        });
      }
      setLastResult({
        success: true,
        code: res.response.code as any,
        message: res.response.message,
        record: res.newRecord,
      });
    } else {
      setLastResult({
        success: false,
        code: res.response.code as any,
        message: res.response.message,
      });
    }
  };

  // Handle Time Machine Test
  const handleTimeMachineTest = () => {
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const device = devices.find((d) => d.id === selectedDeviceId);
    const res = onRecordAttendance({
      sessionId: selectedSessionId,
      student,
      method: selectedMethod,
      device,
      checkInTime: simulatedTimeStr,
    });
    setLastResult(res);
  };

  return (
    <div id="scanner-simulator-container" className="space-y-6 pb-12">
      {/* SIUBA Emerald Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white border border-[#164735] rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-[#C9A227]" />
                SIUBA v1.1.3 PRODUCTION
              </span>
              <span className="text-[11px] text-emerald-100 font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                Hardware Emulation & Testing Node
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Simulator Pemindai QR Code
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Simulasikan pemindaian QR Code santri secara langsung ke Attendance Engine.
            </p>
          </div>

          {/* Session Selector in Header */}
          <div className="self-start md:self-auto min-w-[280px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-100/90 mb-1.5">
              Target Sesi Absensi:
            </label>
            <select
              id="simulator-session-select"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              className="w-full text-xs font-bold bg-white text-slate-900 rounded-xl px-3.5 py-2.5 border border-white/30 shadow-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
            >
              {sessions.length === 0 ? (
                <option value="">Belum Ada Sesi Tersedia</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900 font-bold">
                    {s.activity_name} ({s.session_code}) - [{s.status.toUpperCase()}]
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/15 overflow-x-auto">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[38px] active:scale-95 whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-white text-[#12372A] shadow-md font-black'
                : 'bg-black/25 text-emerald-100/80 border border-white/15 hover:bg-black/35 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#1F5C45]" />
            <span>Pemindai QR Code</span>
          </button>
          <button
            onClick={() => setActiveTab('timemachine')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[38px] active:scale-95 whitespace-nowrap ${
              activeTab === 'timemachine'
                ? 'bg-white text-[#12372A] shadow-md font-black'
                : 'bg-black/25 text-emerald-100/80 border border-white/15 hover:bg-black/35 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-[#1F5C45]" />
            <span>Mesin Waktu</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Simulator on Left, Engine Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Bento Card: Simulator Controls */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          {/* TAB 1: QR Scanner */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-700" />
                  <span>Kios Pemindai QR Santri</span>
                </h3>
                <span className="text-xs text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Device: KBM-QR-01</span>
              </div>

              {/* Viewfinder Graphic */}
              <div className="relative w-full h-44 bg-[#09090b] rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/50 shadow-inner">
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse"></div>
                  </div>
                )}
                <QrCode className={`w-16 h-16 ${isScanning ? 'text-emerald-400 animate-bounce' : 'text-zinc-600'}`} />
                <p className="text-white text-xs font-mono font-bold mt-2">
                  {isScanning ? 'Memproses Token QR...' : 'Arahkan Token QR ke Kamera'}
                </p>
                <p className="text-emerald-400 text-[11px] font-mono mt-0.5 font-bold">
                  Format: STU-XXXXXX
                </p>
              </div>

              {/* Quick Student Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Pilih Token Santri Cepat:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {students.slice(0, 4).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setQrInput(s.qr_token)}
                      className={`p-3 rounded-2xl text-left text-xs border transition-all cursor-pointer ${
                        qrInput === s.qr_token
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-200 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <p className="truncate font-black text-slate-900">{s.name}</p>
                      <p className="text-[11px] text-emerald-800 font-mono font-bold mt-0.5">{s.qr_token}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Input Field */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Masukkan QR Token (misal: STU-X7AK29PQ)"
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                />
                <button
                  id="btn-trigger-qr-scan"
                  onClick={handleScanQr}
                  disabled={isScanning}
                  className="px-5 py-3 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer min-h-[44px] active:scale-95 shrink-0"
                >
                  <Scan className="w-4 h-4 text-[#EADAA2]" />
                  <span>Scan Token</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Time Machine */}
          {activeTab === 'timemachine' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-700" />
                  <span>Mesin Waktu (Time Machine Engine Test)</span>
                </h3>
                <span className="text-xs text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  Rule Testing
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Uji ambang batas waktu (Hadir tepat waktu vs Terlambat menit per menit vs Luar waktu).
              </p>

              {/* Preset Scenarios */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Pilih Skenario Waktu:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setSimulatedTimeStr('2026-08-23 04:25:00')}
                    className="p-3 text-left rounded-2xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    <p className="font-black text-emerald-800">04:25:00 WIB</p>
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Tepat Waktu (Hadir)</p>
                  </button>
                  <button
                    onClick={() => setSimulatedTimeStr('2026-08-23 04:38:00')}
                    className="p-3 text-left rounded-2xl bg-amber-50 border border-amber-200 hover:border-amber-400 text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    <p className="font-black text-amber-800">04:38:00 WIB</p>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">Terlambat +8 Menit</p>
                  </button>
                  <button
                    onClick={() => setSimulatedTimeStr('2026-08-23 05:10:00')}
                    className="p-3 text-left rounded-2xl bg-rose-50 border border-rose-200 hover:border-rose-400 text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    <p className="font-black text-rose-800">05:10:00 WIB</p>
                    <p className="text-[10px] text-rose-700 font-medium mt-0.5">Luar Waktu (Tutup)</p>
                  </button>
                </div>
              </div>

              {/* Student & Method Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Santri:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="text-slate-900 font-bold">
                        {s.name} {!s.is_active ? '(Non-Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode:</label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value as AttendanceMethod)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-bold uppercase focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="rfid">RFID</option>
                    <option value="qr">QR Code</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>

              {/* Custom Time Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Waktu Check-in Custom (YYYY-MM-DD HH:MM:SS):</label>
                <input
                  type="text"
                  value={simulatedTimeStr}
                  onChange={(e) => setSimulatedTimeStr(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                />
              </div>

              <button
                id="btn-run-timemachine"
                onClick={handleTimeMachineTest}
                className="w-full py-3.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-2xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] active:scale-95"
              >
                <Send className="w-4 h-4 text-[#EADAA2]" />
                <span>Eksekusi Check-in Mesin Waktu</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Bento Card: Attendance Engine Real-Time Response Payload */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <span>Hasil Respon Attendance Engine</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                AttendanceResult DTO
              </span>
            </div>

            {lastResult ? (
              <div className="space-y-4">
                {/* Status Box */}
                <div
                  className={`p-5 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${
                    lastResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  {lastResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        lastResult.success ? 'bg-emerald-200/60 text-emerald-900 border border-emerald-300' : 'bg-rose-200/60 text-rose-900 border border-rose-300'
                      }`}>
                        {lastResult.code}
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                        {lastResult.success ? 'BERHASIL' : 'DITOLAK ENGINE'}
                      </span>
                    </div>
                    <p className="text-sm font-black mt-2 text-slate-900 leading-relaxed">{lastResult.message}</p>
                  </div>
                </div>

                {/* Details Breakdown if Available */}
                {lastResult.record && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                    <p className="font-black text-slate-900 border-b border-slate-200 pb-2">
                      Data Transaksi Kehadiran:
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-medium">Santri:</span>
                        <p className="font-black text-slate-900">{lastResult.record.student_name}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">NIS:</span>
                        <p className="font-mono font-bold text-emerald-800">{lastResult.record.student_number}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Status Akhir:</span>
                        <p className="font-black uppercase text-emerald-700">{lastResult.record.status}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Keterlambatan:</span>
                        <p className="font-bold text-amber-700">{lastResult.record.late_minutes} Menit</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Metode & Perangkat:</span>
                        <p className="font-bold text-slate-800">
                          {lastResult.record.method.toUpperCase()} ({lastResult.record.attendance_device_name || 'Manual'})
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Waktu Tercatat:</span>
                        <p className="font-mono font-semibold text-slate-700">{lastResult.record.check_in_at} WIB</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Radio className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-xs font-black text-slate-800">Belum Ada Event Pemindaian</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Gunakan tombol "Scan Token", "Tap Kartu", atau "Mesin Waktu" di sebelah kiri untuk melihat reaksi Attendance Engine.
                </p>
              </div>
            )}
          </div>

          {/* Quick Engine Rule Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> DB Lock Duplicate Protection
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Auto Late Calculator
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

