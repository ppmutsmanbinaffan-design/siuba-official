import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  QrCode, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Flashlight, 
  Clock, 
  Users, 
  Sparkles, 
  Radio, 
  Keyboard, 
  ShieldCheck, 
  UserCheck, 
  X,
  Smartphone,
  ChevronRight,
  Info,
  Check,
  User as UserIcon,
  Wifi,
  Upload,
  HelpCircle
} from 'lucide-react';
import { 
  Activity, 
  AttendanceDevice, 
  AttendanceRecord, 
  AttendanceResult, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceStatus, 
  Classroom, 
  QrAttendanceResponse, 
  Student, 
  User 
} from '../types';
import { QrAttendanceService } from '../services/qrAttendanceService';
import { AudioFeedbackService } from '../services/audioFeedbackService';
import { StudentIdentityService } from '../services/studentIdentityService';

interface QrScannerViewProps {
  sessions: AttendanceSession[];
  activities: Activity[];
  students: Student[];
  devices: AttendanceDevice[];
  records: AttendanceRecord[];
  sessionParticipants: AttendanceSessionParticipant[];
  currentUser: User;
  onRecordAttendance: (newRecord: AttendanceRecord) => void;
  onNavigateToSessions?: () => void;
  onNavigateToManual?: (sessionId: number) => void;
}

interface ScanHistoryItem {
  id: string;
  studentName: string;
  studentNumber: string;
  classroom: string;
  status: AttendanceStatus;
  method: string;
  checkInTime: string;
  isLate: boolean;
  lateMinutes: number;
  resultCode: string;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({
  sessions,
  activities,
  students,
  devices,
  records,
  sessionParticipants,
  currentUser,
  onRecordAttendance,
  onNavigateToSessions,
  onNavigateToManual,
}) => {
  // Session selection (default to first open session allowing QR)
  const openQrSessions = sessions.filter((s) => {
    const act = activities.find((a) => a.id === s.activity_id);
    return s.status === 'open' && (act?.allow_qr ?? true);
  });

  const [selectedSessionId, setSelectedSessionId] = useState<number>(
    openQrSessions[0]?.id || sessions[0]?.id || 1
  );

  const selectedSession = (selectedSessionId ? sessions.find((s) => s.id === selectedSessionId) : null) || sessions[0] || null;
  const selectedActivity = (selectedSession ? activities.find((a) => a.id === selectedSession.activity_id) : null) || activities[0] || null;

  // Device selection
  const qrDevices = devices.filter((d) => d.device_type === 'qr_scanner' || d.device_type === 'kiosk');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(qrDevices[0]?.id || null);

  // Scanner state
  const [scannerMode, setScannerMode] = useState<'camera' | 'usb'>('camera');
  const [continuousScan, setContinuousScan] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

  // Camera Management
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const activeCameraIdRef = useRef<string>('');
  const cameraSeqRef = useRef<number>(0);

  // Scan Cooldown and History state
  const isProcessingRef = useRef<boolean>(false);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  
  // Feedback Overlay state
  const [scanResult, setScanResult] = useState<QrAttendanceResponse | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState<boolean>(false);
  const overlayTimerRef = useRef<any>(null);

  // Scanner Session Statistics & History
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [stats, setStats] = useState({ success: 0, duplicate: 0, error: 0 });

  // USB Scanner Input & Fallback Manual Search Modal
  const [usbInput, setUsbInput] = useState<string>('');
  const [showManualFallback, setShowManualFallback] = useState<boolean>(false);
  const [fallbackSearch, setFallbackSearch] = useState<string>('');
  const [fallbackNote, setFallbackNote] = useState<string>('QR tidak terbaca / rusak');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDecodingFile, setIsDecodingFile] = useState<boolean>(false);
  const [showHttpsGuide, setShowHttpsGuide] = useState<boolean>(false);

  // Enumerate video devices
  const updateCameraList = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      if (videoInputs.length > 0 && !selectedCameraId) {
        const currentTrack = mediaStreamRef.current?.getVideoTracks()[0];
        const currentSettings = currentTrack?.getSettings ? currentTrack.getSettings() : null;
        const currentDeviceId = currentSettings?.deviceId;

        if (currentDeviceId && videoInputs.some((d) => d.deviceId === currentDeviceId)) {
          activeCameraIdRef.current = currentDeviceId;
          setSelectedCameraId(currentDeviceId);
        } else {
          const backCam = videoInputs.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          const chosen = backCam ? backCam.deviceId : videoInputs[0].deviceId;
          activeCameraIdRef.current = chosen;
          setSelectedCameraId(chosen);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate cameras', err);
    }
  }, [selectedCameraId]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Kamera tidak didukung pada browser ini.');
      return;
    }

    const currentSeq = ++cameraSeqRef.current;

    // If stream is active and running on requested camera, skip unnecessary stream restart
    if (
      isCameraActive &&
      mediaStreamRef.current &&
      mediaStreamRef.current.active &&
      selectedCameraId &&
      selectedCameraId === activeCameraIdRef.current
    ) {
      return;
    }

    // Stop existing stream first
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setCameraError(null);
    setIsCameraActive(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // If a newer startCamera or stopCamera was issued while awaiting stream, discard this superseded stream
      if (currentSeq !== cameraSeqRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr: any) {
          const errName = playErr?.name || '';
          const errMsg = playErr?.message || '';
          if (
            errName === 'AbortError' ||
            errName === 'NotAllowedError' ||
            errMsg.includes('interrupted') ||
            errMsg.includes('load request')
          ) {
            // Expected interruption when play request is superseded or paused by browser
          } else {
            console.warn('Camera video play notice:', playErr);
          }
        }

        if (currentSeq === cameraSeqRef.current) {
          setIsCameraActive(true);
          const track = stream.getVideoTracks()[0];
          const settings = track?.getSettings ? track.getSettings() : null;
          if (settings?.deviceId) {
            activeCameraIdRef.current = settings.deviceId;
          }
        }
      }

      if (currentSeq === cameraSeqRef.current) {
        await updateCameraList();
      }
    } catch (err: any) {
      if (currentSeq !== cameraSeqRef.current) {
        return;
      }
      const errName = err?.name || '';
      const errMsg = err?.message || '';
      if (errName === 'AbortError' || errMsg.includes('interrupted') || errMsg.includes('load request')) {
        return;
      }

      console.error('Camera init error', err);
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Akses kamera ditolak. Berikan izin akses kamera pada browser untuk melakukan scan QR.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('Tidak ditemukan perangkat kamera yang tersedia.');
      } else {
        setCameraError('Kamera tidak dapat diakses (sedang digunakan aplikasi lain atau format tidak didukung).');
      }
    }
  }, [selectedCameraId, isCameraActive, updateCameraList]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    cameraSeqRef.current++;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Request Wake Lock to prevent screen timeout
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsWakeLockActive(true);
        } catch {
          setIsWakeLockActive(false);
        }
      }
    };

    requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Sync sound service toggle
  useEffect(() => {
    AudioFeedbackService.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
      if (capabilities.torch) {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
        setIsTorchOn(nextTorch);
      }
    } catch {
      // Ignore unsupported torch
    }
  };

  // Process Scanned QR Token (Core Flow)
  const processQrToken = useCallback(
    (rawToken: string) => {
      if (!rawToken || isProcessingRef.current) return;

      const cleanToken = rawToken.trim();
      if (!cleanToken) return;

      const now = Date.now();
      // Duplicate protection cooldown: prevent scanning the same token within 1500ms
      if (cleanToken === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 1500) {
        return;
      }

      isProcessingRef.current = true;
      lastScannedTokenRef.current = cleanToken;
      lastScannedTimeRef.current = now;

      // Invoke backend Action simulator
      const { response, newRecord } = QrAttendanceService.recordQrAttendance({
        sessionId: selectedSessionId,
        qrToken: cleanToken,
        deviceId: selectedDeviceId,
        operator: currentUser,
        checkInTime: new Date().toISOString(),
        allStudents: students,
        sessions,
        activities,
        devices,
        existingRecords: records,
        sessionParticipants,
      });

      // Trigger Audio & Haptic Feedback
      if (response.success) {
        if (response.attendance?.status === 'late') {
          AudioFeedbackService.playLate();
        } else {
          AudioFeedbackService.playSuccess();
        }
        setStats((prev) => ({ ...prev, success: prev.success + 1 }));

        // Append to App state
        if (newRecord) {
          onRecordAttendance(newRecord);
        }
      } else if (response.code === 'ALREADY_RECORDED') {
        AudioFeedbackService.playDuplicate();
        setStats((prev) => ({ ...prev, duplicate: prev.duplicate + 1 }));
      } else {
        AudioFeedbackService.playError();
        setStats((prev) => ({ ...prev, error: prev.error + 1 }));
      }

      // Add to Session Scan History
      const histItem: ScanHistoryItem = {
        id: `${now}-${Math.random()}`,
        studentName: response.student?.name || `Token: ${cleanToken}`,
        studentNumber: response.student?.student_number || '-',
        classroom: response.student?.classroom || '-',
        status: response.attendance?.status || (response.code === 'ALREADY_RECORDED' ? 'present' : 'absent'),
        method: 'QR Code',
        checkInTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isLate: response.attendance?.status === 'late',
        lateMinutes: response.attendance?.late_minutes || 0,
        resultCode: response.code,
      };

      setScanHistory((prev) => [histItem, ...prev.slice(0, 19)]);
      setScanResult(response);
      setShowResultOverlay(true);

      // Dismiss overlay after 1.8s and resume
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = setTimeout(() => {
        setShowResultOverlay(false);
        isProcessingRef.current = false;
      }, 1800);
    },
    [selectedSessionId, selectedDeviceId, currentUser, students, sessions, activities, devices, records, sessionParticipants, onRecordAttendance]
  );

  // Handle Photo Capture / File Upload for QR decoding
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            processQrToken(code.data);
          } else {
            alert('Kode QR tidak terdeteksi pada foto. Pastikan foto kartu santri jelas, tegak, dan tidak silau.');
          }
        }
        setIsDecodingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      img.onerror = () => {
        setIsDecodingFile(false);
        alert('Gagal memuat gambar dari kamera.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Frame Decoding Loop (Pure Local jsQR Decoding)
  useEffect(() => {
    if (scannerMode !== 'camera' || !isCameraActive) return;

    let isActiveLoop = true;

    const scanFrame = () => {
      if (!isActiveLoop) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingRef.current) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            processQrToken(qrCode.data);
          }
        }
      }

      // Schedule next frame check (approx 15-20 FPS for battery friendliness)
      animFrameIdRef.current = window.setTimeout(scanFrame, 60) as any;
    };

    scanFrame();

    return () => {
      isActiveLoop = false;
      if (animFrameIdRef.current) {
        clearTimeout(animFrameIdRef.current);
      }
    };
  }, [scannerMode, isCameraActive, processQrToken]);

  // Camera start on mount / camera change
  useEffect(() => {
    if (scannerMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scannerMode, selectedCameraId, startCamera, stopCamera]);

  // USB Barcode Scanner Keyboard Listener
  useEffect(() => {
    if (scannerMode !== 'usb') return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in standard inputs
      if (
        (e.target as HTMLElement)?.tagName === 'INPUT' &&
        (e.target as HTMLElement)?.id !== 'usb-scanner-input'
      ) {
        return;
      }

      const currentTime = Date.now();
      // If typing speed is rapid (<100ms between keys), it's a barcode scanner
      if (currentTime - lastKeyTime > 200) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 3) {
          processQrToken(buffer.trim());
          buffer = '';
          setUsbInput('');
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        setUsbInput(buffer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scannerMode, processQrToken]);

  // Manual Fallback Action
  const handleRecordManualFallback = (student: Student) => {
    const { response, newRecord } = QrAttendanceService.recordQrAttendance({
      sessionId: selectedSessionId,
      qrToken: student.qr_token,
      deviceId: selectedDeviceId,
      operator: currentUser,
      checkInTime: new Date().toISOString(),
      allStudents: students,
      sessions,
      activities,
      devices,
      existingRecords: records,
      sessionParticipants,
    });

    if (newRecord) {
      newRecord.method = 'manual';
      newRecord.notes = fallbackNote;
      onRecordAttendance(newRecord);
      AudioFeedbackService.playSuccess();
    }

    setShowManualFallback(false);
    setFallbackSearch('');
  };

  // Metrics for Current Selected Session
  const sessionRecords = selectedSession ? records.filter((r) => r.attendance_session_id === selectedSession.id) : [];
  const sessionParticipantsList = selectedSession ? sessionParticipants.filter(
    (p) => p.attendance_session_id === selectedSession.id && p.eligibility_status !== 'ineligible'
  ) : [];
  const totalEligible = sessionParticipantsList.length || students.length;
  const recordedCount = sessionRecords.length;
  const unrecordedCount = Math.max(0, totalEligible - recordedCount);
  const presentCount = sessionRecords.filter((r) => r.status === 'present').length;
  const lateCount = sessionRecords.filter((r) => r.status === 'late').length;

  // Filtered students for manual search fallback
  const filteredFallbackStudents = students.filter(
    (s) =>
      s.is_active &&
      (s.name.toLowerCase().includes(fallbackSearch.toLowerCase()) ||
        s.student_number.toLowerCase().includes(fallbackSearch.toLowerCase()) ||
        (s.classroom_name && s.classroom_name.toLowerCase().includes(fallbackSearch.toLowerCase())))
  );

  if (!selectedSession || !selectedActivity) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm max-w-xl mx-auto my-8">
        <div className="w-16 h-16 bg-emerald-50 text-[#1F5C45] rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
          <QrCode className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Belum Ada Sesi Presensi Aktif</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Kios Pemindai QR membutuhkan sesi presensi yang aktif untuk memproses absensi santri. Silakan buat atau buka sesi presensi terlebih dahulu.
        </p>
        {onNavigateToSessions && (
          <button
            onClick={onNavigateToSessions}
            className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Buka Manajemen Sesi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Session & Live Status Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#1F5C45]/20 border border-[#1F5C45]/40 flex items-center justify-center text-[#2F7D5A] flex-shrink-0 shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1F5C45]/20 text-[#2F7D5A] border border-[#1F5C45]/40">
                  Sprint 4 • QR Attendance Engine
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  LAN Server Ready
                </span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedActivity.name}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-xl font-bold uppercase ${
                    selectedSession.status === 'open'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-slate-500'
                  }`}
                >
                  {selectedSession.status}
                </span>
              </h2>
            </div>
          </div>

          {/* Session Selector & Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Session Select */}
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 text-white rounded-2xl text-xs font-bold focus:ring-1 focus:ring-[#1F5C45] focus:outline-none"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.activity_name} ({s.session_code}) - [{s.status.toUpperCase()}]
                </option>
              ))}
            </select>

            {/* Input Mode Toggle (Camera vs USB) */}
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setScannerMode('camera')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  scannerMode === 'camera'
                    ? 'bg-[#1F5C45] text-white shadow-sm'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Kamera
              </button>
              <button
                type="button"
                onClick={() => setScannerMode('usb')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  scannerMode === 'usb'
                    ? 'bg-[#1F5C45] text-white shadow-sm'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                USB Scanner
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
              className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#1F5C45]/20 border-[#1F5C45]/40 text-[#2F7D5A]'
                  : 'bg-slate-50 border-slate-200 text-zinc-500 hover:text-slate-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Layar Penuh (Kiosk Mode)"
              className="p-2 bg-slate-50 border border-slate-200 text-slate-700 hover:text-white rounded-2xl cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Metrics Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4 pt-4 border-t border-slate-200">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Peserta</span>
            <p className="text-base font-bold text-white">{totalEligible}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Tercatat</span>
            <p className="text-base font-bold text-emerald-400">{recordedCount}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Belum Absen</span>
            <p className="text-base font-black text-rose-400">{unrecordedCount}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Hadir Tepat</span>
            <p className="text-base font-black text-emerald-400">{presentCount}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Terlambat</span>
            <p className="text-base font-black text-amber-400">{lateCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Camera Viewfinder on Left, Live Scan Stream on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Viewfinder & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xl relative overflow-hidden flex flex-col items-center">
            {/* Viewfinder Container */}
            <div className="relative w-full aspect-[4/3] max-h-[420px] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
              {scannerMode === 'camera' ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Visual QR Scanning Reticle Frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-56 h-56 border-2 border-dashed border-[#1F5C45]/80 rounded-3xl flex items-center justify-center shadow-xs">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                      {/* Moving laser scanline */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-xs animate-pulse" />
                    </div>
                  </div>

                  {/* Camera Error Message Overlay */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20 overflow-y-auto">
                      <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                      <h4 className="text-sm font-bold text-white">Live Streaming Kamera Terblokir</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-sm">
                        Browser HP membatasi streaming kamera langsung pada jaringan lokal (HTTP). Anda tetap dapat memindai dengan tombol kamera di bawah:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full max-w-xs">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isDecodingFile}
                          className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                        >
                          {isDecodingFile ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Menganalisis Foto...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4" />
                              <span>Ambil Foto QR (Kamera HP)</span>
                            </>
                          )}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowHttpsGuide(!showHttpsGuide)}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mt-3 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{showHttpsGuide ? 'Tutup Panduan' : 'Cara Mengaktifkan Live Stream di Chrome HP'}</span>
                      </button>
                      {showHttpsGuide && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-left text-[11px] text-slate-200 space-y-1.5 max-w-sm mt-2">
                          <p className="font-bold text-white">Langkah Buka Live Stream Chrome Android:</p>
                          <p>1. Buka tab baru di Chrome HP, ketik: <span className="font-mono text-amber-300">chrome://flags/#unsafely-treat-insecure-origin-as-secure</span></p>
                          <p>2. Ubah status menjadi <span className="font-bold text-emerald-400">Enabled</span>.</p>
                          <p>3. Masukkan alamat IP: <span className="font-mono text-amber-300">{typeof window !== 'undefined' ? window.location.origin : 'http://192.168.57.251:8000'}</span></p>
                          <p>4. Tekan tombol <span className="font-bold text-white">Relaunch</span> di kanan bawah.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* USB Hardware Scanner Mode Screen */
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#1F5C45]/20 border border-[#1F5C45]/40 flex items-center justify-center text-[#2F7D5A]">
                    <Keyboard className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Mode Scanner Barcode/QR USB</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Hubungkan scanner USB eksternal. Arahkan scanner ke kartu santri, token akan otomatis diinput.
                    </p>
                  </div>
                  <input
                    id="usb-scanner-input"
                    type="text"
                    value={usbInput}
                    onChange={(e) => setUsbInput(e.target.value)}
                    placeholder="Menunggu input scanner USB..."
                    autoFocus
                    className="w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-300 text-white rounded-2xl text-xs font-mono text-center focus:ring-1 focus:ring-[#1F5C45] focus:outline-none"
                  />
                </div>
              )}

              {/* Instant Visual Result Overlay */}
              {showResultOverlay && scanResult && (
                <div
                  className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md transition-all animate-in zoom-in-95 duration-150 ${
                    scanResult.success
                      ? scanResult.attendance?.status === 'late'
                        ? 'bg-amber-950/90 text-amber-200 border-2 border-amber-400'
                        : 'bg-emerald-950/90 text-emerald-200 border-2 border-emerald-500'
                      : scanResult.code === 'ALREADY_RECORDED'
                      ? 'bg-slate-100/95 text-slate-800 border-2 border-amber-500'
                      : 'bg-rose-950/90 text-rose-200 border-2 border-rose-500'
                  }`}
                >
                  {scanResult.success ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-[#1F5C45]/30 border border-emerald-400 flex items-center justify-center text-emerald-400 mb-2">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                        {scanResult.attendance?.status === 'late' ? '⚠ TERLAMBAT' : '✓ ABSENSI BERHASIL'}
                      </span>
                      <h3 className="text-xl font-black text-white mt-1">
                        {scanResult.student?.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-700 mt-0.5">
                        NIS: {scanResult.student?.student_number} • {scanResult.student?.classroom || 'Santri'}
                      </p>
                      {scanResult.attendance?.late_minutes ? (
                        <span className="mt-2 text-xs font-black bg-amber-400 text-zinc-950 px-3 py-1 rounded-full">
                          Terlambat {scanResult.attendance.late_minutes} Menit
                        </span>
                      ) : (
                        <span className="mt-2 text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-0.5 rounded-full">
                          Hadir Tepat Waktu • {scanResult.attendance?.check_in_at}
                        </span>
                      )}
                    </>
                  ) : scanResult.code === 'ALREADY_RECORDED' ? (
                    <>
                      <AlertTriangle className="w-12 h-12 text-amber-400 mb-2" />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                        ⚠ SUDAH ABSEN
                      </span>
                      <h3 className="text-lg font-black text-white mt-1">
                        {scanResult.student?.name}
                      </h3>
                      <p className="text-xs text-slate-700 mt-1 max-w-xs">{scanResult.message}</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-12 h-12 text-rose-400 mb-2" />
                      <span className="text-xs font-black uppercase tracking-widest text-rose-300">
                        ✕ DITOLAK ENGINE
                      </span>
                      <h3 className="text-lg font-black text-white mt-1">
                        {scanResult.student?.name || 'Gagal Memproses'}
                      </h3>
                      <p className="text-xs text-rose-200 mt-1 max-w-xs">{scanResult.message}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Hidden File Input for Native Camera Capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Viewfinder Controls & Selectors Bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200">
              {/* Camera Capture Option */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDecodingFile}
                className="px-3.5 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
              >
                {isDecodingFile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Foto...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ambil Foto QR (Kamera HP)</span>
                  </>
                )}
              </button>

              {/* Camera Switcher */}
              {scannerMode === 'camera' && videoDevices.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Kamera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-white rounded-xl text-xs font-bold focus:outline-none"
                  >
                    {videoDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Kamera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Torch Flashlight Toggle */}
              {scannerMode === 'camera' && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isTorchOn
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-white'
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                  {isTorchOn ? 'Lampu ON' : 'Lampu'}
                </button>
              )}

              {/* Continuous Scan Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={continuousScan}
                  onChange={(e) => setContinuousScan(e.target.checked)}
                  className="rounded border-slate-300 text-[#1F5C45] focus:ring-[#1F5C45] bg-slate-50"
                />
                <span className="font-bold text-[11px]">Continuous Scan</span>
              </label>

              {/* Manual Search Fallback Trigger */}
              <button
                type="button"
                onClick={() => setShowManualFallback(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#2F7D5A]" />
                Cari Manual (QR Rusak)
              </button>
            </div>
          </div>

          {/* Quick Token Simulator Tester Bar for Instant Testing */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Quick Test Token Santri (Simulasi Cepat):
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">1-Click Scan</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {students.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => processQrToken(s.qr_token)}
                  className="p-2 bg-slate-50 border border-slate-200 hover:border-[#1F5C45]/60 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-bold text-xs text-white truncate">{s.name}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">{s.qr_token}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Scan History & Operational Stream (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scanner Session Stats */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#2F7D5A]" />
                Statistik Scanner Sesi Ini
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Live Counter</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold">Berhasil</span>
                <p className="text-base font-bold text-emerald-400">{stats.success}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold">Duplikat</span>
                <p className="text-base font-bold text-amber-400">{stats.duplicate}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold">Ditolak</span>
                <p className="text-base font-bold text-rose-400">{stats.error}</p>
              </div>
            </div>
          </div>

          {/* Recent Scans List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xl flex flex-col h-[380px]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2F7D5A]" />
                Riwayat Pemindaian Terakhir
              </h3>
              <span className="text-[10px] text-slate-500">
                {scanHistory.length} Scan
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {scanHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <QrCode className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Belum ada santri yang di-scan.</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Arahkan kartu QR santri ke kamera untuk memulai absensi.
                  </p>
                </div>
              ) : (
                scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs transition-all hover:border-slate-300"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{item.studentName}</span>
                        <span className="text-[10px] font-mono text-slate-500">{item.studentNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{item.classroom}</span>
                        <span>•</span>
                        <span className="font-mono">{item.checkInTime}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{item.method}</span>
                      </div>
                    </div>

                    <div>
                      {item.resultCode === 'SUCCESS' ? (
                        item.isLate ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Terlambat +{item.lateMinutes}m
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ Hadir
                          </span>
                        )
                      ) : item.resultCode === 'ALREADY_RECORDED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Sudah Absen
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ✕ {item.resultCode}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Search Fallback Drawer Modal */}
      {showManualFallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#2F7D5A]" />
                <h3 className="text-sm font-bold text-white">Cari Santri Manual (QR Rusak)</h3>
              </div>
              <button
                onClick={() => setShowManualFallback(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <input
                  type="text"
                  value={fallbackSearch}
                  onChange={(e) => setFallbackSearch(e.target.value)}
                  placeholder="Ketik Nama, NIS, atau Kelas..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-white rounded-xl text-xs focus:ring-1 focus:ring-[#1F5C45] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Catatan Manual:
                </label>
                <input
                  type="text"
                  value={fallbackNote}
                  onChange={(e) => setFallbackNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-white rounded-xl text-xs focus:ring-1 focus:ring-[#1F5C45] focus:outline-none"
                />
              </div>

              {/* Student Results */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar">
                {filteredFallbackStudents.length === 0 ? (
                  <p className="text-xs text-center py-6 text-zinc-500">
                    Tidak ditemukan santri yang cocok.
                  </p>
                ) : (
                  filteredFallbackStudents.slice(0, 10).map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-[#1F5C45]/40 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          NIS: {s.student_number} • {s.classroom_name || '-'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRecordManualFallback(s)}
                        className="px-3 py-1.5 bg-[#1F5C45] hover:bg-[#12372A] text-white font-bold text-[11px] rounded-lg cursor-pointer"
                      >
                        Absen Hadir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
