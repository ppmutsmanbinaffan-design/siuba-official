import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  RefreshCw,
  HelpCircle,
  Users,
  Briefcase
} from 'lucide-react';
import { dataImportService, ImportPreviewResult, ImportExecutionResult } from '../../services/dataImportService';

export interface DataImportModalProps {
  isOpen: boolean;
  type: 'students' | 'staff';
  onClose: () => void;
  onSuccess: (result: ImportExecutionResult) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  type,
  onClose,
  onSuccess,
  onShowToast = () => {},
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'upsert' | 'skip'>('upsert');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isStudent = type === 'students';
  const title = isStudent ? 'Import Massal Data Santri' : 'Import Massal Guru, SDM & Pelatih';
  const subtitle = isStudent 
    ? 'Unggah file CSV/Excel data santri untuk pendaftaran masal, penugasan kelas, kamar asrama, dan RFID.'
    : 'Unggah file CSV/Excel data guru, musyrif, pelatih dan staf untuk pembuatan akun user dan penugasan peran.';

  const handleDownloadTemplate = async () => {
    try {
      if (isStudent) {
        await dataImportService.downloadStudentTemplate();
      } else {
        await dataImportService.downloadStaffTemplate();
      }
      onShowToast('Template CSV berhasil diunduh.', 'success');
    } catch {
      onShowToast('Gagal mengunduh template.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      onShowToast('Silakan pilih file terlebih dahulu.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      let preview: ImportPreviewResult;
      if (isStudent) {
        preview = await dataImportService.previewStudents(selectedFile, importMode);
      } else {
        preview = await dataImportService.previewStaff(selectedFile, importMode);
      }
      setPreviewData(preview);
      setStep('preview');
      onShowToast(`Analisis selesai: ${preview.total} baris ditemukan.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses file.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      let result: ImportExecutionResult;
      if (isStudent) {
        result = await dataImportService.importStudents(selectedFile, importMode);
      } else {
        result = await dataImportService.importStaff(selectedFile, importMode);
      }

      setExecutionResult(result);
      setStep('result');
      onSuccess(result);
      onShowToast(result.message, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal melakukan import.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setExecutionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredPreviewRows = previewData ? previewData.rows.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {isStudent ? <Users className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Template Download Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-300">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-200">Unduh Format Template CSV</h4>
                    <p className="text-xs text-emerald-400/80 mt-0.5">
                      Gunakan template resmi SIUBA agar kolom data terbaca otomatis dan bebas error.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download Template .CSV
                </button>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : selectedFile
                    ? 'border-emerald-500/40 bg-slate-800/60'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-inner">
                  {selectedFile ? (
                    <FileText className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <Upload className="w-7 h-7 text-slate-400" />
                  )}
                </div>

                {selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-emerald-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Siap dianalisis
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-white">Tarik & Lepas File CSV ke Sini</p>
                    <p className="text-xs text-slate-400 mt-1">
                      atau <span className="text-emerald-400 underline font-semibold">klik untuk memilih file</span> dari komputer Anda (Format .csv / .txt)
                    </p>
                  </div>
                )}
              </div>

              {/* Import Mode Radio Options */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Metode Penanganan Duplikat</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'upsert'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="upsert"
                      checked={importMode === 'upsert'}
                      onChange={() => setImportMode('upsert')}
                      className="mt-0.5 text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">Perbarui Data yang Ada (Upsert)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Jika {isStudent ? 'NIS' : 'Username'} sudah ada, data profil, kelas & RFID akan diperbarui.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'skip'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="skip"
                      checked={importMode === 'skip'}
                      onChange={() => setImportMode('skip')}
                      className="mt-0.5 text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">Lewati Duplikat (Skip)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hanya tambahkan data baru. Data lama yang sudah terdaftar tidak akan diubah.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {step === 'preview' && previewData && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Baris</p>
                  <p className="text-xl font-bold text-white mt-0.5">{previewData.total}</p>
                </div>
                <div className="bg-emerald-950/20 p-3 rounded-2xl border border-emerald-500/30">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Valid (Baru)</p>
                  <p className="text-xl font-bold text-emerald-300 mt-0.5">{previewData.valid_count}</p>
                </div>
                <div className="bg-amber-950/20 p-3 rounded-2xl border border-amber-500/30">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Peringatan</p>
                  <p className="text-xl font-bold text-amber-300 mt-0.5">{previewData.warning_count}</p>
                </div>
                <div className="bg-rose-950/20 p-3 rounded-2xl border border-rose-500/30">
                  <p className="text-[10px] font-bold text-rose-400 uppercase">Error (Gagal)</p>
                  <p className="text-xl font-bold text-rose-300 mt-0.5">{previewData.error_count}</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({previewData.total})
                  </button>
                  <button
                    onClick={() => setStatusFilter('valid')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    Valid ({previewData.valid_count})
                  </button>
                  <button
                    onClick={() => setStatusFilter('warning')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'warning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    Peringatan ({previewData.warning_count})
                  </button>
                  <button
                    onClick={() => setStatusFilter('error')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'error' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
                    }`}
                  >
                    Error ({previewData.error_count})
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Mode: <span className="font-semibold text-emerald-400">{importMode === 'upsert' ? 'Perbarui Data (Upsert)' : 'Lewati Duplikat (Skip)'}</span>
                </p>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-2xl overflow-x-auto max-h-[320px] bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-28">Status</th>
                      <th className="p-3">{isStudent ? 'NIS' : 'Username'}</th>
                      <th className="p-3">Nama Lengkap</th>
                      <th className="p-3">{isStudent ? 'Kelas' : 'Role / Peran'}</th>
                      <th className="p-3">{isStudent ? 'Kamar' : 'No. HP'}</th>
                      <th className="p-3">RFID</th>
                      <th className="p-3">Keterangan / Pesan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          Tidak ada baris pada filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row) => (
                        <tr 
                          key={row.index}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            row.status === 'error' ? 'bg-rose-950/10' : row.status === 'warning' ? 'bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="p-3 text-center text-slate-500 font-mono">{row.index}</td>
                          <td className="p-3">
                            {row.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            )}
                            {row.status === 'warning' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" /> Warning
                              </span>
                            )}
                            {row.status === 'error' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <XCircle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-white">
                            {isStudent ? row.data.student_number : row.data.username}
                          </td>
                          <td className="p-3 font-medium text-slate-200">{row.data.name}</td>
                          <td className="p-3 text-slate-300">
                            {isStudent ? row.data.classroom_name : row.data.role_label || row.data.role}
                          </td>
                          <td className="p-3 text-slate-300">
                            {isStudent ? row.data.dormitory_room_name : row.data.phone || '-'}
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {row.data.rfid_uid || '-'}
                          </td>
                          <td className="p-3 text-xs">
                            {row.messages.length > 0 ? (
                              <div className="space-y-0.5">
                                {row.messages.map((m, mi) => (
                                  <p 
                                    key={mi} 
                                    className={`text-[11px] ${
                                      row.status === 'error' 
                                        ? 'text-rose-400' 
                                        : row.status === 'warning' 
                                        ? 'text-amber-400' 
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    &bull; {m}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-400 text-[11px]">Siap diimpor</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && executionResult && (
            <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl font-black text-white">Import Data Berhasil!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {executionResult.message}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Data</p>
                  <p className="text-xl font-bold text-white mt-0.5">{executionResult.stats.total}</p>
                </div>
                <div className="bg-emerald-950/30 p-3 rounded-2xl border border-emerald-500/30">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Baru Dibuat</p>
                  <p className="text-xl font-bold text-emerald-300 mt-0.5">+{executionResult.stats.created}</p>
                </div>
                <div className="bg-amber-950/30 p-3 rounded-2xl border border-amber-500/30">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Diperbarui</p>
                  <p className="text-xl font-bold text-amber-300 mt-0.5">{executionResult.stats.updated}</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Dilewati / Gagal</p>
                  <p className="text-xl font-bold text-slate-400 mt-0.5">
                    {executionResult.stats.skipped + executionResult.stats.failed}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-800 bg-slate-950/60">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedFile || isLoading}
                onClick={handleAnalyze}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menganalisis File...
                  </>
                ) : (
                  <>
                    Analisis & Pratinjau
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 flex items-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Pilih File Lain
              </button>

              <button
                type="button"
                disabled={!previewData?.can_import || isLoading}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan ke Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Eksekusi Import ({previewData ? previewData.valid_count + previewData.warning_count : 0} Baris)
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
