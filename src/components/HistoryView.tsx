import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  ArrowUpDown,
  RotateCcw,
  ShieldCheck, 
  X, 
  ArrowRight, 
  UserCheck, 
  Radio, 
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { AttendanceRecord, AttendanceRecordHistory, AttendanceSession } from '../types';

interface HistoryViewProps {
  records?: AttendanceRecord[];
  sessions?: AttendanceSession[];
  recordHistories?: AttendanceRecordHistory[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ 
  records = [], 
  sessions = [],
  recordHistories = []
}) => {
  const safeRecords = records || [];
  const safeSessions = sessions || [];
  const safeRecordHistories = recordHistories || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedRecordForAudit, setSelectedRecordForAudit] = useState<AttendanceRecord | null>(null);

  const filtered = safeRecords.filter((r) => {
    if (!r) return false;
    const matchesSearch =
      (r.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.student_number || '').includes(searchTerm) ||
      (r.classroom_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || r.method === methodFilter;
    const matchesSource = sourceFilter === 'all' || r.record_source === sourceFilter;

    return matchesSearch && matchesStatus && matchesMethod && matchesSource;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">HADIR</span>;
      case 'late':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">TERLAMBAT</span>;
      case 'permission':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-sky-100 text-sky-800 border border-sky-300">IZIN</span>;
      case 'sick':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-purple-100 text-purple-800 border border-purple-300">SAKIT</span>;
      case 'dispensation':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-teal-100 text-teal-800 border border-teal-300">DISPENSASI</span>;
      case 'absent':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">ALPHA</span>;
      default:
        return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'rfid':
        return <span className="font-mono uppercase font-bold text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">RFID</span>;
      case 'qr':
        return <span className="font-mono uppercase font-bold text-[10px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200">QR</span>;
      case 'manual':
        return <span className="font-mono uppercase font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">MANUAL</span>;
      default:
        return <span className="font-mono uppercase font-bold text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">{method}</span>;
    }
  };

  return (
    <div id="history-view-container" className="space-y-6 pb-12">
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
                Audit Trail & Riwayat Lengkap
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Riwayat & Log Transaksi Presensi
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Audit trail pencatatan kehadiran santri lengkap dengan metode input (Manual / QR / RFID), sumber rekaman, riwayat koreksi status, dan operator pencatat.
            </p>
          </div>

          <div className="self-start md:self-auto">
            <div className="text-xs font-black text-white bg-black/25 px-4 py-2.5 rounded-2xl border border-white/20 backdrop-blur-xs shadow-xs flex items-center gap-2">
              <History className="w-4 h-4 text-[#EADAA2]" />
              <span>Total Transaksi: {records.length} Record</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Filter Toolbar Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari santri, NIS, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status"
              className="text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold cursor-pointer shadow-2xs min-h-[38px]"
            >
              <option value="all">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="dispensation">Dispensasi</option>
              <option value="absent">Alpha</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              aria-label="Filter Metode"
              className="text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold cursor-pointer shadow-2xs min-h-[38px]"
            >
              <option value="all">Semua Metode</option>
              <option value="manual">Manual</option>
              <option value="qr">QR Code</option>
              <option value="rfid">RFID Card</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Filter Sumber"
              className="text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold cursor-pointer shadow-2xs min-h-[38px]"
            >
              <option value="all">Semua Sumber</option>
              <option value="operator_manual">Operator Manual</option>
              <option value="operator_bulk">Operator Bulk</option>
              <option value="scanner_device">Scanner Device</option>
              <option value="system_auto_alpha">System Auto Alpha</option>
              <option value="system_auto_excused">System Auto Excused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table Bento Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-5 py-4">Waktu Log</th>
                <th className="px-5 py-4">Santri</th>
                <th className="px-5 py-4">Kelas & Kamar</th>
                <th className="px-5 py-4">Status Presensi</th>
                <th className="px-5 py-4">Keterlambatan</th>
                <th className="px-5 py-4">Metode / Sumber</th>
                <th className="px-5 py-4">Dicatat Oleh</th>
                <th className="px-5 py-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    Tidak ada riwayat kehadiran yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => {
                  const studentHistories = safeRecordHistories.filter(h => h && h.student_id === record.student_id);
                  const hasAuditChanges = studentHistories.length > 0;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap font-semibold">
                        {record.check_in_at.replace('T', ' ').slice(0, 19)} WIB
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900 text-sm leading-snug">{record.student_name}</div>
                        <div className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-0.5 border border-emerald-200">
                          {record.student_number}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="font-bold text-slate-800">{record.classroom_name}</div>
                        <div className="text-[11px] text-slate-400">{record.dormitory_room_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {record.late_minutes > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            +{record.late_minutes} Menit
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0 Menit</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getMethodBadge(record.method)}
                          {record.record_source && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 font-medium">
                              {record.record_source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-800">
                        <div className="font-bold text-slate-900">{record.recorded_by || 'Sistem'}</div>
                        {record.notes && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{record.notes}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {hasAuditChanges ? (
                          <button
                            onClick={() => setSelectedRecordForAudit(record)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 mx-auto transition cursor-pointer shadow-2xs active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>{studentHistories.length} Koreksi</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-300 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedRecordForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Audit Koreksi</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedRecordForAudit.student_name} ({selectedRecordForAudit.student_number})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForAudit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {safeRecordHistories
                .filter(h => h && h.student_id === selectedRecordForAudit.student_id)
                .map((hist) => (
                  <div key={hist.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase font-mono text-[10px] font-bold">
                          {hist.old_status}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                          {hist.new_status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{hist.changed_at}</span>
                    </div>

                    <div className="text-slate-800">
                      <strong className="text-slate-500">Alasan:</strong> {hist.reason}
                    </div>

                    <div className="text-[10px] text-slate-500 border-t border-slate-200/80 pt-1">
                      Operator: <span className="text-slate-800 font-bold">{hist.changed_by}</span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecordForAudit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
