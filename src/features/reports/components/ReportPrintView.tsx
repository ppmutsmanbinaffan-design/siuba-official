import React from 'react';
import { Printer, X } from 'lucide-react';

interface ColumnDef {
  header: string;
  accessor: (row: any, idx: number) => React.ReactNode;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  periodText: string;
  columns: ColumnDef[];
  data: any[];
}

export const ReportPrintView: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  periodText,
  columns,
  data,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white text-zinc-900 p-6 md:p-12 print:p-0 print:m-0" id="report-print-view">
      {/* Control Bar (hidden in print) */}
      <div className="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200 print:hidden max-w-5xl mx-auto">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Pratinjau Cetak Laporan Resmi</h2>
          <p className="text-xs text-zinc-500">Gunakan dialog cetak browser untuk menyimpan ke PDF atau cetak ke printer fisik.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Sekarang / PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Official Print Layout */}
      <div className="max-w-5xl mx-auto space-y-6 text-zinc-900 font-sans">
        {/* Letterhead (KOP SURAT) */}
        <div className="text-center border-b-2 border-zinc-900 pb-4">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-zinc-600">
            Yayasan Pendidikan Islam Utsman Bin Affan
          </h2>
          <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900 mt-0.5">
            Pondok Pesantren Utsman Bin Affan
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Sistem Informasi Unit & Bimbingan Akademik (SIUBA) Terpadu &bull; Laporan Presensi Otentik
          </p>
        </div>

        {/* Report Meta Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
          </div>
          <div className="text-right text-xs text-zinc-600">
            <div><strong>Periode:</strong> {periodText}</div>
            <div><strong>Waktu Cetak:</strong> {new Date().toLocaleString('id-ID')}</div>
            <div><strong>Total Data:</strong> {data.length} baris</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 font-bold border-b border-zinc-300">
                <th className="p-2 border border-zinc-300 w-10 text-center">No</th>
                {columns.map((col, idx) => (
                  <th key={idx} className="p-2 border border-zinc-300">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="p-2 border border-zinc-300 text-center font-semibold text-zinc-500">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="p-2 border border-zinc-300">
                      {col.accessor(row, rowIdx)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="p-4 text-center text-zinc-400">
                    Tidak ada data untuk periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 pt-12 text-center text-xs">
          <div>
            <p className="text-zinc-600">Mengetahui,</p>
            <p className="font-bold text-zinc-900 mt-0.5">Kepala Bagian Terkait</p>
            <div className="h-16" />
            <p className="font-bold underline text-zinc-900">( ........................................ )</p>
          </div>
          <div>
            <p className="text-zinc-600">Dicetak Oleh,</p>
            <p className="font-bold text-zinc-900 mt-0.5">Petugas Administrasi SIUBA</p>
            <div className="h-16" />
            <p className="font-bold underline text-zinc-900">( ........................................ )</p>
          </div>
        </div>
      </div>
    </div>
  );
};
