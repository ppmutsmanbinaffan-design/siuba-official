import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Eye, 
  X,
  HardDrive,
  Database,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { MaintenanceLogEntry } from '../types';
import { MaintenanceService } from '../services/maintenanceService';
import { User } from '../../../types';

interface MaintenanceLogsTabProps {
  currentUser: User;
  logs: MaintenanceLogEntry[];
  onRefreshLogs: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MaintenanceLogsTab: React.FC<MaintenanceLogsTabProps> = ({
  currentUser,
  logs,
  onRefreshLogs,
  onShowToast
}) => {
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<MaintenanceLogEntry | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesEvent = selectedEventType === 'all' || log.event_type.includes(selectedEventType);
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    const matchesSearch = log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.event_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvent && matchesStatus && matchesSearch;
  });

  const handleExportCsv = () => {
    try {
      const headers = ['ID', 'Waktu', 'Event', 'Status', 'Aktor', 'Role', 'Ringkasan'];
      const rows = filteredLogs.map(l => [
        l.id,
        l.timestamp,
        l.event_title,
        l.status,
        l.actor_name,
        l.actor_role,
        `"${l.summary.replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Log maintenance berhasil diekspor ke CSV.', 'success');
    } catch (e: any) {
      onShowToast(`Gagal mengekspor log: ${e.message}`, 'error');
    }
  };

  return (
    <div id="maintenance-logs-tab" className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-500/20 shadow-2xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Log Maintenance & Audit Trail Sistem
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Rekam jejak seluruh operasi backup, reset database, konfigurasi environment, dan audit integritas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer min-h-[40px] active:scale-95 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Event Filter */}
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer min-h-[38px] font-bold shadow-2xs"
          >
            <option value="all">Semua Tipe Event</option>
            <option value="backup">Backup Database</option>
            <option value="database_reset">Reset Database</option>
            <option value="integrity">Audit Integritas</option>
            <option value="config">Konfigurasi Environment</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer min-h-[38px] font-bold shadow-2xs"
          >
            <option value="all">Semua Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="FAILED">FAILED</option>
            <option value="INFO">INFO</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID, aktor, ringkasan..."
            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-2xs"
          />
        </div>
      </div>

      {/* Logs View (Desktop Table + Mobile Cards) */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-2 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-black text-slate-700 dark:text-zinc-300">Tidak Ditemukan Log yang Cocok</h3>
          <p className="text-xs text-slate-500">Sesuaikan filter atau kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-zinc-300">
              <thead className="bg-slate-50 dark:bg-zinc-900/90 text-slate-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-800 font-black">
                <tr>
                  <th className="px-5 py-3.5">Waktu & Log ID</th>
                  <th className="px-4 py-3.5">Event</th>
                  <th className="px-4 py-3.5">Aktor & Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Ringkasan Operasi</th>
                  <th className="px-5 py-3.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-sans">
                        {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">{log.id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800 dark:text-zinc-200 font-sans">{log.event_title}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{log.event_type}</div>
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <div className="font-bold text-slate-900 dark:text-white">{log.actor_name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-mono">{log.actor_role}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : log.status === 'BLOCKED'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          : log.status === 'FAILED'
                          ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-md font-sans">
                      <p className="text-slate-600 dark:text-zinc-300 truncate" title={log.summary}>
                        {log.summary}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] inline-flex items-center justify-center active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2.5 shadow-sm cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      : log.status === 'BLOCKED'
                      ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                  }`}>
                    {log.status}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>

                <div className="font-bold text-xs text-zinc-900 dark:text-white">{log.event_title}</div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">{log.summary}</p>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Aktor: {log.actor_name}</span>
                  <span className="text-[#1F5C45] dark:text-[#2F7D5A] font-bold">Detail →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Detail Log */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">Detail Log: {selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Event:</span>
                <div className="font-bold text-zinc-900 dark:text-white text-sm">{selectedLog.event_title}</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{selectedLog.event_type}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Status:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{selectedLog.status}</div>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Waktu:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{new Date(selectedLog.timestamp).toLocaleString('id-ID')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Aktor:</span>
                  <div className="font-bold text-zinc-900 dark:text-white">{selectedLog.actor_name} ({selectedLog.actor_role})</div>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Operation ID:</span>
                  <div className="font-bold text-[#1F5C45] dark:text-[#2F7D5A] font-mono">{selectedLog.operation_id}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500">Ringkasan:</span>
                <p className="text-zinc-700 dark:text-zinc-200 mt-1 leading-relaxed">{selectedLog.summary}</p>
              </div>

              {selectedLog.details && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 dark:text-zinc-500">Payload Metadata (Sanitized):</span>
                  <pre className="mt-1 p-2 bg-zinc-100 dark:bg-black/60 rounded-xl text-[10px] font-mono text-zinc-800 dark:text-zinc-300 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold min-h-[44px]"
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
