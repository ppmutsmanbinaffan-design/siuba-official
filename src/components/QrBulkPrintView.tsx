import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Filter, 
  Grid, 
  CreditCard, 
  Tag, 
  Layers, 
  School, 
  Building, 
  User, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Classroom, Dormitory, DormitoryRoom, Student } from '../types';

interface QrBulkPrintViewProps {
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
}

export const QrBulkPrintView: React.FC<QrBulkPrintViewProps> = ({
  students,
  classrooms,
  dormitories,
  dormitoryRooms,
}) => {
  const [printFormat, setPrintFormat] = useState<'id_card' | 'label_sticker'>('id_card');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [selectedDormitoryId, setSelectedDormitoryId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedGenYear, setSelectedGenYear] = useState<string>('all');

  // Precomputed QR data URLs
  const [qrMap, setQrMap] = useState<Record<number, string>>({});

  // Filter eligible active students
  const filteredStudents = students.filter((s) => {
    if (s.status !== 'active' || !s.is_active) return false;
    if (selectedClassroomId !== 'all' && s.classroom_id !== Number(selectedClassroomId)) return false;
    if (selectedDormitoryId !== 'all') {
      const room = dormitoryRooms.find((r) => r.id === s.dormitory_room_id);
      if (!room || room.dormitory_id !== Number(selectedDormitoryId)) return false;
    }
    if (selectedRoomId !== 'all' && s.dormitory_room_id !== Number(selectedRoomId)) return false;
    if (selectedGenYear !== 'all' && s.generation_year !== Number(selectedGenYear)) return false;
    return true;
  });

  // Generate QR codes for all filtered students
  useEffect(() => {
    let isMounted = true;
    const generateAllQrs = async () => {
      const newMap: Record<number, string> = {};
      for (const student of filteredStudents) {
        if (student.qr_token) {
          try {
            const url = await QRCode.toDataURL(student.qr_token, {
              width: printFormat === 'id_card' ? 240 : 160,
              margin: 1,
              errorCorrectionLevel: 'M',
            });
            newMap[student.id] = url;
          } catch (e) {
            console.error('Failed QR generation for student', student.name, e);
          }
        }
      }
      if (isMounted) {
        setQrMap(newMap);
      }
    };

    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [filteredStudents.length, selectedClassroomId, selectedDormitoryId, selectedRoomId, selectedGenYear, printFormat]);

  const handlePrint = () => {
    window.print();
  };

  const generationYears = Array.from(new Set(students.map((s) => s.generation_year))).sort();

  return (
    <div className="space-y-6">
      {/* Screen Control Panel (Hidden on Print) */}
      <div className="print:hidden space-y-4">
        <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl border border-[#164735] p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 text-emerald-100 border border-white/20 backdrop-blur-xs">
                Sprint 4 • QR Generator & Printing
              </span>
              <span className="text-xs text-emerald-100/80">Local Vector Rendering</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Cetak Massal Kartu & Label QR Presensi Santri
            </h2>
            <p className="text-xs text-emerald-100/90 mt-1">
              Cetak kartu identitas atau stiker barcode QR santri berdasarkan kelas, asrama, atau angkatan santri dengan resolusi tinggi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={filteredStudents.length === 0}
              className="px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 disabled:opacity-50 text-[#12372A] font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-[#1F5C45]" />
              Cetak {filteredStudents.length} Kartu / Label
            </button>
          </div>
        </div>

        {/* Filter & Layout Selection Bento */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            {/* Format Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800">Format Cetak:</span>
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintFormat('id_card')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[36px] ${
                    printFormat === 'id_card'
                      ? 'bg-[#1F5C45] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Format ID Card (Standar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('label_sticker')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[36px] ${
                    printFormat === 'label_sticker'
                      ? 'bg-[#1F5C45] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>Format Stiker Label QR</span>
                </button>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-600 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <span>Total Siap Cetak:</span>
              <strong className="text-emerald-800 font-extrabold text-sm">{filteredStudents.length}</strong>
              <span>Santri Aktif</span>
            </div>
          </div>

          {/* Filter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Filter Kelas:
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none shadow-2xs hover:border-slate-400 cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Tingkat {c.grade_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Filter Gedung Asrama:
              </label>
              <select
                value={selectedDormitoryId}
                onChange={(e) => {
                  setSelectedDormitoryId(e.target.value);
                  setSelectedRoomId('all');
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none shadow-2xs hover:border-slate-400 cursor-pointer"
              >
                <option value="all">Semua Gedung Asrama</option>
                {dormitories.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.gender === 'male' || d.gender === 'L' ? 'Putra' : 'Putri'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Filter Kamar Asrama:
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none shadow-2xs hover:border-slate-400 cursor-pointer"
              >
                <option value="all">Semua Kamar</option>
                {dormitoryRooms
                  .filter((r) => selectedDormitoryId === 'all' || r.dormitory_id === Number(selectedDormitoryId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.dormitory_name} - {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Filter Angkatan (Tahun Masuk):
              </label>
              <select
                value={selectedGenYear}
                onChange={(e) => setSelectedGenYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1F5C45] focus:border-[#1F5C45] focus:outline-none shadow-2xs hover:border-slate-400 cursor-pointer"
              >
                <option value="all">Semua Angkatan</option>
                {generationYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Angkatan {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area */}
      <div id="bulk-qr-print-container" className="bg-white text-zinc-900 p-6 rounded-3xl print:p-0 print:m-0 print:rounded-none print:shadow-none min-h-[400px]">
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <School className="w-12 h-12 mx-auto mb-3 text-slate-700" />
            <p className="font-bold text-sm">Tidak ada data santri yang memenuhi kriteria filter.</p>
            <p className="text-xs text-slate-500 mt-1">Ubah filter kelas atau asrama di atas untuk memuat santri.</p>
          </div>
        ) : printFormat === 'id_card' ? (
          /* ID Card Layout: 2 or 3 cards per row */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-2">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="border-2 border-emerald-800/80 rounded-2xl p-4 bg-white shadow-md print:shadow-none print:border-emerald-800 flex flex-col justify-between items-center text-center break-inside-avoid"
              >
                {/* Header Pesantren */}
                <div className="w-full border-b-2 border-emerald-800 pb-2 mb-2.5">
                  <p className="text-[10px] font-black text-emerald-800 tracking-wider uppercase">
                    Pondok Pesantren Islam
                  </p>
                  <h3 className="text-sm font-black text-emerald-950 tracking-wider uppercase">
                    IBNU ABBAS
                  </h3>
                  <p className="text-[8px] font-bold text-zinc-600 uppercase">
                    KARTU IDENTITAS DIGITAL SANTRI
                  </p>
                </div>

                {/* Body Content */}
                <div className="w-full flex items-center gap-3 text-left mb-2">
                  <div className="w-12 h-14 bg-zinc-100 border border-zinc-300 rounded-lg flex items-center justify-center text-slate-500 flex-shrink-0 overflow-hidden">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xs text-zinc-900 truncate">{student.name}</h4>
                    <p className="text-[10px] font-mono font-bold text-emerald-800">NIS: {student.student_number}</p>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-600 font-semibold mt-0.5">
                      <span>{student.classroom_name || 'Kelas -'}</span>
                      <span>•</span>
                      <span>{student.dormitory_room_name || 'Asrama -'}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-xl my-1 flex flex-col items-center">
                  {qrMap[student.id] ? (
                    <img
                      src={qrMap[student.id]}
                      alt={`QR ${student.name}`}
                      className="w-32 h-32 object-contain image-rendering-pixelated"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                      Memuat QR...
                    </div>
                  )}
                  <span className="font-mono text-[9px] font-bold text-zinc-700 mt-1">
                    {student.qr_token}
                  </span>
                </div>

                {/* Footer */}
                <div className="w-full pt-1.5 border-t border-zinc-200 text-[7px] text-zinc-500 font-medium">
                  SIUBA Absensi Santri • Harap dibawa setiap sesi kegiatan
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Label Sticker Grid Layout: 3 or 4 columns compact sticker */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2 print:p-1">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="border border-zinc-400 rounded-xl p-2.5 bg-white text-center flex flex-col items-center justify-between break-inside-avoid print:border-zinc-500"
              >
                <div className="w-full text-center">
                  <p className="text-[8px] font-black text-emerald-800 uppercase truncate">
                    PP. Islam Ibnu Abbas
                  </p>
                  <h4 className="font-black text-[11px] text-zinc-900 leading-tight truncate">
                    {student.name}
                  </h4>
                  <p className="text-[9px] font-mono font-bold text-zinc-700">
                    {student.student_number} • {student.classroom_name || '-'}
                  </p>
                </div>

                <div className="my-1">
                  {qrMap[student.id] ? (
                    <img
                      src={qrMap[student.id]}
                      alt={`QR ${student.name}`}
                      className="w-24 h-24 object-contain image-rendering-pixelated mx-auto"
                    />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center text-[9px] text-slate-500 font-mono">
                      Memuat...
                    </div>
                  )}
                </div>

                <span className="font-mono text-[8px] font-bold text-zinc-600">
                  {student.qr_token}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
