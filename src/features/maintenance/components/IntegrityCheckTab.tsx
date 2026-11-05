import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  Wrench, 
  XCircle, 
  Info,
  Clock,
  Layers,
  Database
} from 'lucide-react';
import { IntegrityAuditResult, IntegrityIssueItem, IntegritySeverityLevel } from '../types';
import { MaintenanceService } from '../services/maintenanceService';
import { User } from '../../../types';

interface IntegrityCheckTabProps {
  currentUser: User;
  fullDataset: Record<string, any>;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onUpdateDataset?: (newDataset: Record<string, any>) => void;
}

export const IntegrityCheckTab: React.FC<IntegrityCheckTabProps> = ({
  currentUser,
  fullDataset,
  onShowToast,
  onUpdateDataset
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<IntegrityAuditResult | null>(() => 
    MaintenanceService.getLastIntegrityResult() || MaintenanceService.runIntegrityAudit(fullDataset)
  );
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | IntegritySeverityLevel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleRunAudit = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = MaintenanceService.runIntegrityAudit(fullDataset);
      setAuditResult(res);
      setIsRunning(false);
      onShowToast(`Audit Integritas Selesai. Skor Kesehatan: ${res.health_score_percent}%`, 'success');
    }, 600);
  };

  const handleRepairIssue = (issue: IntegrityIssueItem) => {
    if (!issue.can_auto_repair) return;

    if (issue.code === 'ATTENDANCE_ORPHAN_SESSION' || issue.code === 'STAFF_RECORD_ORPHAN') {
      // Remove orphan record
      if (onUpdateDataset && fullDataset.records) {
        const updatedRecords = (fullDataset.records as any[]).filter(r => r.id !== issue.affected_entity_id);
        onUpdateDataset({ ...fullDataset, records: updatedRecords });
        onShowToast(`Record #${issue.affected_entity_id} berhasil dibersihkan.`, 'success');
        // Re-run audit
        setTimeout(() => {
          const fresh = MaintenanceService.runIntegrityAudit({ ...fullDataset, records: updatedRecords });
          setAuditResult(fresh);
        }, 100);
      }
    } else if (issue.code === 'ATTENDANCE_DOUBLE_RECORD') {
      // Dedup attendance record
      if (onUpdateDataset && fullDataset.records) {
        const updatedRecords = (fullDataset.records as any[]).filter(r => r.id !== issue.affected_entity_id);
        onUpdateDataset({ ...fullDataset, records: updatedRecords });
        onShowToast(`Duplikasi record presensi berhasil diselesaikan.`, 'success');
        setTimeout(() => {
          const fresh = MaintenanceService.runIntegrityAudit({ ...fullDataset, records: updatedRecords });
          setAuditResult(fresh);
        }, 100);
      }
    } else if (issue.code === 'RFID_CARD_DUPLICATE') {
      // Release RFID card
      if (onUpdateDataset && fullDataset.students) {
        const updatedStudents = (fullDataset.students as any[]).map(s => 
          s.id === issue.affected_entity_id ? { ...s, rfid_card_id: undefined } : s
        );
        onUpdateDataset({ ...fullDataset, students: updatedStudents });
        onShowToast(`Tautan kartu RFID berhasil dilepaskan.`, 'success');
        setTimeout(() => {
          const fresh = MaintenanceService.runIntegrityAudit({ ...fullDataset, students: updatedStudents });
          setAuditResult(fresh);
        }, 100);
      }
    }
  };

  const filteredIssues = (auditResult?.issues || []).filter(issue => {
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div id="maintenance-integrity-tab" className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-500/20 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Pemeriksaan Integritas & Kesehatan Relasi Database
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Deteksi otomatis orphan record, duplikasi UID RFID/QR, dan inkonsistensi struktur master pesantren.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunAudit}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[40px] active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Memindai Relasi...' : 'Jalankan Audit Integritas'}</span>
          </button>
        </div>
      </div>

      {/* Summary Score & Metrics Bar Bento */}
      {auditResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Health Score */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition group">
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Skor Kesehatan</span>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 my-1 font-mono">
              {auditResult.health_score_percent}%
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {auditResult.health_score_percent === 100 ? 'Sangat Sehat' : 'Perlu Perhatian'}
            </span>
          </div>

          {/* Passed Checks */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition group">
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Uji Relasi Lolos</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white my-1 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{auditResult.passed_checks_count} / {auditResult.total_checks_run}</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">Kategori Valid</span>
          </div>

          {/* Critical Issues */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition group">
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Isu Kritis</span>
            <div className={`text-2xl font-black my-1 font-mono ${
              auditResult.critical_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
            }`}>
              {auditResult.critical_count}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">Wajib Diperbaiki</span>
          </div>

          {/* Warnings */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition group">
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Peringatan</span>
            <div className={`text-2xl font-black my-1 font-mono ${
              auditResult.warning_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
            }`}>
              {auditResult.warning_count}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">Anomali Non-Fatal</span>
          </div>

          {/* Scan Time */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between col-span-2 lg:col-span-1 shadow-sm hover:shadow-md transition group">
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Waktu Pemindaian</span>
            <div className="text-sm font-black text-slate-800 dark:text-zinc-200 my-1 truncate font-mono">
              {new Date(auditResult.scanned_at).toLocaleTimeString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">Durasi: {auditResult.duration_ms}ms</span>
          </div>
        </div>
      )}

      {/* Filter and Issue List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Semua Isu' },
              { id: 'critical', label: 'Kritis' },
              { id: 'warning', label: 'Peringatan' },
              { id: 'info', label: 'Informasi' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedSeverity(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                  selectedSeverity === f.id
                    ? 'bg-[#1F5C45] text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode isu, nama entitas..."
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-2xs"
            />
          </div>
        </div>

        {/* Issue Items List */}
        {filteredIssues.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">Database Berada Dalam Kondisi Prima</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Tidak ditemukan adanya orphan record, duplikasi kunci unik, atau anomali relasi data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all border-l-4 ${
                  issue.severity === 'critical'
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 border-l-rose-500'
                    : issue.severity === 'warning'
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 border-l-amber-500'
                    : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 border-l-sky-500'
                }`}
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      issue.severity === 'critical'
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                        : issue.severity === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                        : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                    }`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {issue.code}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">
                      Domain: {issue.domain}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{issue.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">{issue.description}</p>

                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1 font-sans">
                    <strong className="text-slate-800 dark:text-zinc-200 font-bold">Saran Perbaikan:</strong> {issue.suggested_fix}
                  </div>
                </div>

                {issue.can_auto_repair && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleRepairIssue(issue)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-zinc-600 transition-all cursor-pointer min-h-[38px] shadow-2xs active:scale-95"
                    >
                      <Wrench className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" />
                      <span>{issue.repair_action_label || 'Perbaiki Isu'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
