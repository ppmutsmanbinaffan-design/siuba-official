import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  User, 
  Sparkles,
  Building,
  School,
  QrCode as QrIcon
} from 'lucide-react';
import { Student, User as UserType } from '../types';
import { StudentIdentityService } from '../services/studentIdentityService';

interface QrCardModalProps {
  student: Student;
  allStudents: Student[];
  currentUser: UserType;
  onClose: () => void;
  onUpdateStudent: (studentId: number, updateData: Partial<Student>) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const QrCardModal: React.FC<QrCardModalProps> = ({
  student,
  allStudents,
  currentUser,
  onClose,
  onUpdateStudent,
  onShowToast,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState<boolean>(false);
  const [regenReason, setRegenReason] = useState<string>('Kartu santri hilang / cetak ulang fisik');

  // Generate QR Code data URL using pure local canvas
  useEffect(() => {
    if (student.qr_token) {
      QRCode.toDataURL(student.qr_token, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR', err));
    }
  }, [student.qr_token]);

  const handlePrint = () => {
    window.print();
  };

  const handleExecuteRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      const res = StudentIdentityService.regenerateQrToken({
        student,
        allStudents,
        operatorName: currentUser.name,
        reason: regenReason,
      });

      onUpdateStudent(student.id, {
        qr_token: res.newToken,
      });

      setIsRegenerating(false);
      setShowRegenConfirm(false);
      onShowToast(
        `Token QR santri '${student.name}' berhasil diganti ke ${res.newToken}. Token lama langsung dicabut (revoked).`,
        'success'
      );
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1F5C45]/20 border border-[#1F5C45]/40 flex items-center justify-center text-[#2F7D5A]">
              <QrIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Kartu Identitas Presensi QR Santri</h3>
              <p className="text-[11px] text-slate-500">Pondok Pesantren Islam Ibnu Abbas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Printable Card Container */}
          <div 
            id="printable-student-card"
            className="mx-auto w-full max-w-[360px] bg-white text-zinc-900 rounded-2xl p-5 shadow-xl border border-zinc-300 relative overflow-hidden flex flex-col items-center text-center print:shadow-none print:border print:m-0"
          >
            {/* Green Islamic Header Banner */}
            <div className="w-full pb-3 border-b-2 border-emerald-800 mb-4">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-[13px] tracking-wide uppercase">
                <span>Pondok Pesantren Islam</span>
              </div>
              <h2 className="text-base font-black text-emerald-950 tracking-wider uppercase">
                IBNU ABBAS
              </h2>
              <p className="text-[9px] text-zinc-600 font-semibold tracking-wider uppercase">
                KARTU IDENTITAS DIGITAL SANTRI
              </p>
            </div>

            {/* Student Photo and Info */}
            <div className="flex items-center gap-3.5 w-full text-left mb-3">
              <div className="w-14 h-16 rounded-xl bg-zinc-100 border border-zinc-300 flex items-center justify-center text-slate-500 flex-shrink-0 overflow-hidden">
                {student.photo ? (
                  <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm text-zinc-900 leading-snug line-clamp-1">
                  {student.name}
                </h4>
                <p className="text-[11px] font-mono font-bold text-emerald-800">
                  NIS: {student.student_number}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-semibold mt-0.5">
                  <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                    {student.classroom_name || 'Kelas -'}
                  </span>
                  <span>•</span>
                  <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                    {student.dormitory_room_name || 'Asrama -'}
                  </span>
                </div>
              </div>
            </div>

            {/* Crisp QR Code Box */}
            <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl my-2 flex flex-col items-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR Code ${student.name}`} 
                  className="w-44 h-44 object-contain image-rendering-pixelated" 
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-500 text-xs font-mono">
                  Memuat QR...
                </div>
              )}
              <span className="font-mono text-[11px] font-bold text-zinc-700 mt-1">
                {student.qr_token}
              </span>
            </div>

            {/* Footer Notice */}
            <div className="w-full pt-2 border-t border-zinc-200 text-[8px] text-zinc-500 font-medium">
              Gunakan saat absensi Shalat, KBM, dan Asrama • Hak Milik SIUBA Santri
            </div>
          </div>

          {/* Regenerate Confirmation Drawer */}
          {showRegenConfirm ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-amber-300">Konfirmasi Regenerasi Token QR</h4>
                  <p className="text-[11px] text-slate-700 mt-0.5">
                    Token QR lama (<span className="font-mono text-white font-bold">{student.qr_token}</span>) akan <strong className="text-rose-400">segera dicabut dan tidak dapat digunakan lagi</strong>. Lanjutkan?
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Alasan Regenerasi:
                </label>
                <input
                  type="text"
                  value={regenReason}
                  onChange={(e) => setRegenReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-white rounded-xl text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  placeholder="Misal: Kartu fisik hilang / rusak"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-white rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRegenerate}
                  disabled={isRegenerating}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Memproses...' : 'Ya, Regenerasi & Cabut QR Lama'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-500/40 text-slate-700 hover:text-amber-300 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerasi Token QR
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                Cetak Kartu QR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
