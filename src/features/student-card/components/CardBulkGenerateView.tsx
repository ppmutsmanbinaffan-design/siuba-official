import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  CreditCard, 
  Printer, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Layers, 
  Sparkles, 
  Download, 
  Eye, 
  CheckCircle2, 
  FileText,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { 
  Student, 
  Classroom, 
  Dormitory, 
  DormitoryRoom, 
  StudentCardTemplate, 
  CardSide 
} from '../../../types';
import { CR80_SPECS } from '../../../services/studentCardTemplateService';
import { StudentCardRenderer } from './StudentCardRenderer';
import { exportStudentCardToCanvas, downloadCanvasAsPng } from '../utils/cardCanvasExporter';

export interface CardBulkGenerateViewProps {
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  templates: StudentCardTemplate[];
  activeTemplateId?: string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenDesigner?: (template: StudentCardTemplate) => void;
}

export const CardBulkGenerateView: React.FC<CardBulkGenerateViewProps> = ({
  students,
  classrooms,
  dormitories,
  dormitoryRooms,
  templates,
  activeTemplateId,
  onShowToast,
  onOpenDesigner
}) => {
  // Active Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    activeTemplateId || templates[0]?.id || 'tmpl-reguler-green'
  );
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Filters
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dormFilter, setDormFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [genYearFilter, setGenYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Students
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Print Mode ('a4_sheet' | 'single_cards')
  const [printLayout, setPrintLayout] = useState<'a4_sheet' | 'single_cards'>('a4_sheet');
  const [printSide, setPrintSide] = useState<CardSide>('front');

  // Pre-rendered QRs Map
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [qrProgress, setQrProgress] = useState<number>(0);

  // Filtered Students Calculation
  const filteredStudents = students.filter((s) => {
    if (s.status !== 'active' || !s.is_active) return false;
    if (classFilter !== 'all' && s.classroom_id !== Number(classFilter)) return false;
    if (dormFilter !== 'all') {
      const room = dormitoryRooms.find((r) => r.id === s.dormitory_room_id);
      if (!room || room.dormitory_id !== Number(dormFilter)) return false;
    }
    if (roomFilter !== 'all' && s.dormitory_room_id !== Number(roomFilter)) return false;
    if (genYearFilter !== 'all' && s.generation_year !== Number(genYearFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchNis = s.student_number.toLowerCase().includes(q);
      if (!matchName && !matchNis) return false;
    }
    return true;
  });

  // Effective Target Students for Printing/Exporting
  const targetStudents = selectedStudentIds.length > 0
    ? filteredStudents.filter((s) => selectedStudentIds.includes(s.id))
    : filteredStudents;

  // Batch QR Generation Effect
  useEffect(() => {
    let isCancelled = false;
    const generateQrs = async () => {
      if (targetStudents.length === 0) return;
      setIsGeneratingQr(true);
      setQrProgress(0);

      const newMap: Record<number, string> = { ...qrMap };
      const missing = targetStudents.filter((s) => !newMap[s.id]);

      for (let i = 0; i < missing.length; i++) {
        if (isCancelled) break;
        const st = missing[i];
        const token = st.qr_token || `STU-${st.student_number}-TOKEN`;
        try {
          newMap[st.id] = await QRCode.toDataURL(token, {
            width: 240,
            margin: 1,
            errorCorrectionLevel: 'H'
          });
        } catch (e) {
          console.error(`Failed to generate QR for student ${st.id}`, e);
        }
        setQrProgress(Math.round(((i + 1) / missing.length) * 100));
      }

      if (!isCancelled) {
        setQrMap(newMap);
        setIsGeneratingQr(false);
      }
    };

    generateQrs();
    return () => { isCancelled = true; };
  }, [targetStudents.length, selectedStudentIds.length, classFilter, dormFilter]);

  // Toggle Single Student
  const handleToggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle All Filtered
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Direct Browser Print (Applies Print Styles)
  const handlePrint = () => {
    if (targetStudents.length === 0) {
      if (onShowToast) onShowToast('Tidak ada santri yang dipilih untuk dicetak', 'error');
      return;
    }
    window.print();
  };

  // Batch Export PNGs
  const handleBatchExportPng = async () => {
    if (targetStudents.length === 0) return;
    if (onShowToast) onShowToast(`Memulai ekspor ${targetStudents.length} kartu...`, 'info');

    for (const student of targetStudents) {
      try {
        const canvas = await exportStudentCardToCanvas({
          template: activeTemplate,
          student,
          side: printSide,
          qrDataUrl: qrMap[student.id],
          dpi: 300
        });
        const filename = `KARTU_${student.student_number}_${student.name.replace(/\s+/g, '_')}_${printSide}`;
        downloadCanvasAsPng(canvas, filename);
        // Small async delay between downloads to prevent browser throttling
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        console.error('Error exporting card', e);
      }
    }

    if (onShowToast) onShowToast(`Berhasil mengekspor ${targetStudents.length} kartu santri!`, 'success');
  };

  const isLandscape = activeTemplate?.orientation === 'landscape';

  return (
    <div id="card-bulk-generate-view" className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#1F5C45] dark:text-[#2F7D5A]" />
            Cetak Massal & Generate Kartu Santri
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Pilih template, filter santri berdasarkan kelas/asrama, dan cetak pada lembar A4 atau format kartu fisik.
          </p>
        </div>

        {/* Template Selector */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-100 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/40"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.orientation === 'landscape' ? 'Landscape' : 'Portrait'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          <button
            onClick={handlePrint}
            disabled={targetStudents.length === 0}
            className="px-5 py-2 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak ({targetStudents.length} Santri)
          </button>
        </div>
      </div>

      {/* Filter & Selection Bar */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Kelas</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Kelas ({students.length})</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id} className="text-zinc-900 bg-white font-medium">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dorm Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Gedung Asrama</label>
            <select
              value={dormFilter}
              onChange={(e) => { setDormFilter(e.target.value); setRoomFilter('all'); }}
              className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Asrama</option>
              {dormitories.map((d) => (
                <option key={d.id} value={d.id} className="text-zinc-900 bg-white font-medium">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Kamar Asrama</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Kamar</option>
              {dormitoryRooms
                .filter((r) => dormFilter === 'all' || r.dormitory_id === Number(dormFilter))
                .map((r) => (
                  <option key={r.id} value={r.id} className="text-zinc-900 bg-white font-medium">
                    {r.room_number} ({r.name})
                  </option>
                ))}
            </select>
          </div>

          {/* Generation Year Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Tahun Angkatan</label>
            <select
              value={genYearFilter}
              onChange={(e) => setGenYearFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100"
            >
              <option value="all" className="text-zinc-900 bg-white font-medium">Semua Angkatan</option>
              <option value="2026" className="text-zinc-900 bg-white font-medium">Angkatan 2026</option>
              <option value="2025" className="text-zinc-900 bg-white font-medium">Angkatan 2025</option>
              <option value="2024" className="text-zinc-900 bg-white font-medium">Angkatan 2024</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Pencarian</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama / NIS..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>
          </div>
        </div>

        {/* Selection Status & Print Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold text-[#1F5C45] dark:text-[#2F7D5A] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0
                ? 'Batalkan Pilih Semua'
                : `Pilih Semua Terfilter (${filteredStudents.length})`}
            </button>

            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              • <strong className="text-zinc-900 dark:text-white">{targetStudents.length}</strong> kartu siap dicetak
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Side Switch */}
            <div className="flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setPrintSide('front')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                  printSide === 'front' ? 'bg-[#1F5C45] text-white' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Sisi Depan
              </button>
              <button
                onClick={() => setPrintSide('back')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                  printSide === 'back' ? 'bg-[#1F5C45] text-white' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Sisi Belakang
              </button>
            </div>

            {/* Layout Switch */}
            <div className="flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setPrintLayout('a4_sheet')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                  printLayout === 'a4_sheet' ? 'bg-[#1F5C45] text-white' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Lembar A4
              </button>
              <button
                onClick={() => setPrintLayout('single_cards')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                  printLayout === 'single_cards' ? 'bg-[#1F5C45] text-white' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Kartu Satuan
              </button>
            </div>

            {/* Batch PNG Export */}
            <button
              onClick={handleBatchExportPng}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700"
            >
              <Download className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" />
              Export Batch PNG
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar when rendering QR codes */}
      {isGeneratingQr && (
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#1F5C45] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1">
              <span>Memproses QR Code Token Verifikasi SIUBA...</span>
              <span>{qrProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1F5C45] transition-all duration-200"
                style={{ width: `${qrProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Print Sheet Stage Container */}
      <div id="print-sheet-preview-stage" className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
            <h3 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Preview Layout Cetak {printLayout === 'a4_sheet' ? 'Lembar A4 (Grid)' : 'Kartu Satuan CR80'}
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            Orientasi: {isLandscape ? 'Landscape (85.5 × 54 mm)' : 'Portrait (54 × 85.5 mm)'}
          </span>
        </div>

        {targetStudents.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <CreditCard className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Tidak ada santri yang sesuai filter</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Sesuaikan filter di atas untuk menampilkan santri.</p>
          </div>
        ) : (
          /* Grid of Student Cards */
          <div
            id="printable-cards-grid"
            className={`grid gap-4 ${
              isLandscape
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            }`}
          >
            {targetStudents.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);

              return (
                <div
                  key={student.id}
                  className="relative bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col items-center group shadow-sm"
                >
                  {/* Select Checkbox on Card */}
                  <div
                    onClick={() => handleToggleStudent(student.id)}
                    className="absolute top-3 left-3 z-30 cursor-pointer bg-white/80 dark:bg-black/60 p-1 rounded-lg shadow-sm"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>

                  {/* Render Student Card Component */}
                  <div className="w-full flex items-center justify-center">
                    <StudentCardRenderer
                      template={activeTemplate}
                      side={printSide}
                      student={student}
                      qrDataUrl={qrMap[student.id]}
                      showGuides={false}
                    />
                  </div>

                  {/* Card Sub-Info */}
                  <div className="w-full mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span className="font-mono">{student.student_number}</span>
                    <span className="truncate max-w-[120px] text-right">{student.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
