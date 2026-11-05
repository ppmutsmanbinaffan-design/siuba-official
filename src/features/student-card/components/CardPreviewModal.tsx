import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Eye, 
  Download, 
  Printer, 
  Search, 
  RotateCw, 
  CheckCircle2, 
  User as UserIcon,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Student, StudentCardTemplate, CardSide } from '../../../types';
import { StudentCardRenderer } from './StudentCardRenderer';
import { exportStudentCardToCanvas, downloadCanvasAsPng } from '../utils/cardCanvasExporter';

export interface CardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: StudentCardTemplate;
  students: Student[];
  initialStudentId?: number;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CardPreviewModal: React.FC<CardPreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  students,
  initialStudentId,
  onShowToast
}) => {
  if (!isOpen) return null;

  const [selectedStudentId, setSelectedStudentId] = useState<number>(
    initialStudentId || students[0]?.id || 999999
  );
  const [activeSide, setActiveSide] = useState<CardSide>('front');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0] || {
    id: 999999,
    student_number: 'UBA260001',
    nisn: '0089123456',
    name: 'Muhammad Fatih Al-Faruq',
    gender: 'male',
    classroom_id: 1,
    classroom_name: 'Kelas 7-A (Madrasah Tsanawiyah)',
    dormitory_room_id: 1,
    dormitory_room_name: 'Asrama Abu Bakar - Kamar 101',
    generation_year: 2026,
    qr_token: 'STU-UBA260001-TOKEN-VERIFIED-2026',
    status: 'active',
    is_active: true,
    photo_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face'
  };

  // Pre-render QR Code for student
  useEffect(() => {
    let isMounted = true;
    const token = currentStudent.qr_token || `STU-${currentStudent.student_number}-TOKEN`;
    QRCode.toDataURL(token, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'H'
    }).then((url) => {
      if (isMounted) setQrDataUrl(url);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [currentStudent.qr_token, currentStudent.id]);

  // Export 300 DPI PNG
  const handleExportPng = async () => {
    try {
      setIsExporting(true);
      const canvas = await exportStudentCardToCanvas({
        template,
        student: currentStudent,
        side: activeSide,
        qrDataUrl,
        dpi: 300
      });
      const filename = `KARTU_${currentStudent.student_number}_${template.orientation.toUpperCase()}_${activeSide.toUpperCase()}`;
      downloadCanvasAsPng(canvas, filename);
      if (onShowToast) onShowToast(`Kartu ${currentStudent.name} (${activeSide}) berhasil diexport 300 DPI!`, 'success');
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'Gagal export gambar kartu', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Single Card Browser Print (Exact CR80 CSS print)
  const handlePrintSingle = () => {
    window.print();
  };

  // Filter student list for selector
  const filteredStudents = students.filter((s) => {
    if (!searchStudent) return true;
    const q = searchStudent.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.student_number.toLowerCase().includes(q) ||
      s.classroom_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: Real Student Selector & Info */}
        <div className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Pilih Data Santri Real
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Cari nama / NIS..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
              />
            </div>

            {/* Student List */}
            <div className="space-y-1.5 max-h-56 md:max-h-72 overflow-y-auto pr-1">
              {filteredStudents.map((st) => {
                const isSelected = st.id === selectedStudentId;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudentId(st.id)}
                    className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1F5C45] text-white font-bold shadow-sm'
                        : 'bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate">{st.name}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-zinc-500'}`}>
                        {st.student_number} • {st.classroom_name || 'Santri'}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-[#C9A227]" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Badge */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
              <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold">
                <span>QR Token Absensi:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Valid</span>
              </div>
              <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 truncate">
                {currentStudent.qr_token || 'TOKEN-GENERATED'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Card Stage & Actions */}
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-between bg-white dark:bg-zinc-900">
          {/* Top Controls: Sisi Depan / Belakang & Close */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setActiveSide('front')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeSide === 'front' ? 'bg-[#1F5C45] text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Sisi Depan
                </button>
                <button
                  onClick={() => setActiveSide('back')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeSide === 'back' ? 'bg-[#1F5C45] text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Sisi Belakang
                </button>
              </div>

              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline font-mono">
                {template.orientation === 'landscape' ? '85.5 × 54 mm' : '54 × 85.5 mm'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Card Stage */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[380px] shadow-xl transition-transform hover:scale-102">
              <StudentCardRenderer
                template={template}
                side={activeSide}
                student={currentStudent}
                qrDataUrl={qrDataUrl}
                showGuides={false}
              />
            </div>
          </div>

          {/* Bottom Export & Print Actions */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Santri Aktif: <strong className="text-zinc-900 dark:text-white">{currentStudent.name}</strong> ({currentStudent.student_number})
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                <Download className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" />
                {isExporting ? 'Mengexport...' : 'Export PNG (300 DPI)'}
              </button>

              <button
                onClick={handlePrintSingle}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Kartu (100%)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
