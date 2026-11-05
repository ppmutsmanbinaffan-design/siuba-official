import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, SwitchCamera, Flashlight, AlertTriangle, Maximize, Minimize, QrCode, Sparkles, CheckCircle2, ShieldAlert, Upload, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { AudioFeedbackService } from '../../../services/audioFeedbackService';
import { Button } from '../../../components/ui/Button';

interface QrScannerPanelProps {
  onScan: (qrToken: string) => Promise<void>;
  isLocked: boolean;
  cooldownActive: boolean;
  cooldownSeconds?: number;
  disabled?: boolean;
}

export const QrScannerPanel: React.FC<QrScannerPanelProps> = ({
  onScan,
  isLocked,
  cooldownActive,
  cooldownSeconds = 2,
  disabled = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [isProcessingCode, setIsProcessingCode] = useState<boolean>(false);
  const [isDecodingFile, setIsDecodingFile] = useState<boolean>(false);
  const [showHttpsGuide, setShowHttpsGuide] = useState<boolean>(false);

  // Scan cooldown local timer
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage('');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Stop any active streams first
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
          await videoRef.current.play();
        }

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && (videoTrack.getCapabilities as any)?.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        setHasCamera(true);
        setCameraPermission('granted');
        setIsInitializing(false);
      } catch (err: any) {
        console.warn('Camera initialization failed:', err);
        setIsInitializing(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraPermission('denied');
          setErrorMessage('Akses kamera tidak diberikan. Izinkan akses kamera pada browser untuk menggunakan scanner.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraPermission('unavailable');
          setErrorMessage('Tidak ditemukan perangkat kamera yang terhubung pada sistem.');
        } else {
          setCameraPermission('unavailable');
          setErrorMessage(`Gagal mengakses kamera: ${err.message || 'Error tidak diketahui'}`);
        }
        setHasCamera(false);
      }
    } else {
      setIsInitializing(false);
      setCameraPermission('unavailable');
      setErrorMessage('Browser tidak mendukung akses kamera (MediaDevices API).');
      setHasCamera(false);
    }
  }, [facingMode]);

  // Stop camera when unmounting
  useEffect(() => {
    startCamera();
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Frame processing loop for QR decoding
  const processFrame = useCallback(() => {
    if (disabled || isLocked || cooldownActive || isProcessingCode) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim()) {
          const rawToken = code.data.trim();
          const now = Date.now();

          // Prevent rapid duplicate trigger of the exact same string within 2.5 seconds locally
          if (rawToken === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 2500) {
            // skip redundant frame
          } else {
            lastScannedTokenRef.current = rawToken;
            lastScannedTimeRef.current = now;
            setIsProcessingCode(true);

            // Execute scan callback (API request)
            onScan(rawToken).finally(() => {
              setIsProcessingCode(false);
            });
          }
        }
      }
    }

    requestRef.current = requestAnimationFrame(processFrame);
  }, [disabled, isLocked, cooldownActive, isProcessingCode, onScan]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [processFrame]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (track && (track.applyConstraints as any)) {
        try {
          const newTorchState = !torchOn;
          await (track as any).applyConstraints({
            advanced: [{ torch: newTorchState }],
          });
          setTorchOn(newTorchState);
        } catch {
          // torch not supported
        }
      }
    }
  };

  // Toggle Front / Rear Camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Manual token submit helper
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim() || isLocked || disabled) return;
    const token = manualTokenInput.trim();
    setManualTokenInput('');
    setIsProcessingCode(true);
    onScan(token).finally(() => {
      setIsProcessingCode(false);
    });
  };

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
            onScan(code.data);
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

  return (
    <div className="w-full max-w-full space-y-3">
      {/* Hidden File Input for Native Camera Capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Viewport Frame with Scanner Overlay */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center">
        {/* Hidden Canvas for QR Analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraPermission === 'granted' ? 'opacity-100' : 'opacity-20'
          } ${isLocked || cooldownActive ? 'filter brightness-75' : ''}`}
        />

        {/* Targeting Grid / Viewfinder Box */}
        {cameraPermission === 'granted' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 border-2 border-[#1F5C45]/80 dark:border-[#2F7D5A]/80 rounded-3xl shadow-[0_0_20px_rgba(31,92,69,0.25)] flex items-center justify-center overflow-hidden">
              {/* Corner Targets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C9A227] rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C9A227] rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C9A227] rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C9A227] rounded-br-xl" />

              {/* Scanning Laser Animation Bar */}
              {!isLocked && !cooldownActive && !disabled && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#2F7D5A] to-transparent animate-pulse transform translate-y-24 shadow-[0_0_12px_#1F5C45]" />
              )}

              {/* Status indicator inside box */}
              {isLocked && (
                <div className="bg-zinc-950/90 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg border border-[#1F5C45]/40 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Memproses...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-zinc-300">
            <RefreshCw className="w-8 h-8 text-[#2F7D5A] animate-spin" />
            <p className="text-xs font-bold">Menyiapkan Kamera Terminal...</p>
          </div>
        )}

        {/* Camera Permission Denied / Error State */}
        {cameraPermission === 'denied' && (
          <div className="absolute inset-0 bg-zinc-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-100">Akses Kamera Ditolak</h4>
            <p className="text-xs text-zinc-400 max-w-xs">{errorMessage}</p>
            <Button variant="primary" size="sm" onClick={startCamera}>
              Coba Izinkan Ulang
            </Button>
          </div>
        )}

        {/* Camera Unavailable State */}
        {cameraPermission === 'unavailable' && (
          <div className="absolute inset-0 bg-zinc-950/95 p-5 flex flex-col items-center justify-center text-center space-y-3 z-20 overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-100">Live Streaming Kamera Terblokir Browser</h4>
            <p className="text-xs text-zinc-300 max-w-sm">
              Browser HP membatasi live webcam stream pada koneksi HTTP (Wi-Fi lokal). Anda dapat memindai dengan tombol kamera di bawah:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1 w-full max-w-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDecodingFile}
                className="w-full px-4 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
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
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHttpsGuide ? 'Tutup Panduan' : 'Cara Mengaktifkan Live Stream di Chrome HP'}</span>
            </button>
            {showHttpsGuide && (
              <div className="bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 text-left text-[11px] text-zinc-300 space-y-1.5 max-w-sm">
                <p className="font-bold text-white">Langkah Buka Live Stream Chrome Android:</p>
                <p>1. Buka tab baru di Chrome HP, ketik: <span className="font-mono text-amber-300">chrome://flags/#unsafely-treat-insecure-origin-as-secure</span></p>
                <p>2. Ubah menjadi <span className="font-bold text-emerald-400">Enabled</span>.</p>
                <p>3. Masukkan alamat IP: <span className="font-mono text-amber-300">{typeof window !== 'undefined' ? window.location.origin : 'http://192.168.57.251:8000'}</span></p>
                <p>4. Tekan tombol <span className="font-bold text-white">Relaunch</span> di kanan bawah.</p>
              </div>
            )}
          </div>
        )}

        {/* Camera Controls Overlay (Top Right) */}
        {cameraPermission === 'granted' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label="Senter Kamera"
                className={`p-2 rounded-xl backdrop-blur-md transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
                  torchOn ? 'bg-[#1F5C45] text-white shadow-md' : 'bg-black/60 text-zinc-300 hover:bg-black/80'
                }`}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleCamera}
              aria-label="Ganti Kamera Depan/Belakang"
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-zinc-300 backdrop-blur-md transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cooldown Pill Overlay */}
        {cooldownActive && (
          <div className="absolute bottom-3 inset-x-0 mx-auto w-max px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-xs font-semibold text-zinc-300 backdrop-blur-md flex items-center gap-2 shadow-lg z-10">
            <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-ping" />
            <span>Scan berikutnya dalam {cooldownSeconds} dtk...</span>
          </div>
        )}
      </div>

      {/* Quick Photo Capture Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <Camera className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">Opsi Kamera HP: Ambil foto langsung kartu santri / QR</span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDecodingFile || disabled || isLocked}
          className="w-full sm:w-auto px-4 py-2 bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition active:scale-95"
        >
          {isDecodingFile ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memindai Foto...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Ambil Foto / Unggah QR</span>
            </>
          )}
        </button>
      </div>

      {/* Simulator / Manual Token Input fallback */}
      <form onSubmit={handleManualSubmit} className="flex items-center gap-2.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            value={manualTokenInput}
            onChange={(e) => setManualTokenInput(e.target.value)}
            placeholder="Input kode QR / Barcode / Token santri (e.g. UBA-QR-2026-0001)..."
            disabled={disabled || isLocked}
            className="w-full bg-slate-50 hover:bg-slate-100/80 text-xs sm:text-sm font-semibold text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:border-[#1F5C45] focus:ring-2 focus:ring-emerald-500/20 px-3.5 py-2.5 min-h-[44px] placeholder:text-slate-400 focus:outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={!manualTokenInput.trim() || disabled || isLocked || isProcessingCode}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs min-h-[44px] cursor-pointer active:scale-95 whitespace-nowrap ${
            !manualTokenInput.trim() || disabled || isLocked
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-[#1F5C45] hover:bg-[#12372A] text-white'
          }`}
        >
          {isProcessingCode ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Proses Scan</span>
          )}
        </button>
      </form>
    </div>
  );
};
