import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Play, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export interface SelfTestCheck {
  group: string;
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  fix?: string | null;
}
export interface SelfTestResult {
  ran_at: string;
  ran_by?: string;
  ready: boolean;
  summary: { pass: number; warn: number; fail: number };
  checks: SelfTestCheck[];
}

const ICON = {
  pass: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />,
};
const BOX = { pass: 'border-slate-200 bg-white', warn: 'border-amber-200 bg-amber-50/60', fail: 'border-rose-200 bg-rose-50/70' };

/**
 * Uji Kesiapan Sistem — pemeriksaan baca-saja di server atas konfigurasi & data sungguhan.
 * (Menggantikan "Acceptance Tests" lama yang menguji mesin di browser dengan data contoh dan selalu LULUS.)
 */
export const SystemReadinessPanel: React.FC<{
  initial?: SelfTestResult | null;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onDone?: (r: SelfTestResult) => void;
}> = ({ initial = null, onShowToast, onDone }) => {
  const [result, setResult] = useState<SelfTestResult | null>(initial);
  const [running, setRunning] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);

  React.useEffect(() => setResult(initial), [initial]);

  const run = async () => {
    setRunning(true);
    try {
      const res: any = await apiClient.post('/golive/self-test', {});
      setResult(res.data);
      onDone?.(res.data);
      onShowToast?.(res.message || 'Uji kesiapan selesai.', res.data?.ready ? 'success' : 'info');
    } catch (err: any) {
      onShowToast?.(err?.status === 403 ? 'Uji kesiapan hanya untuk admin (Pemeliharaan / Audit Keamanan).' : err?.message || 'Uji kesiapan gagal dijalankan.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const groups = result ? Array.from(new Set(result.checks.map((c) => c.group))) : [];

  return (
    <div id="system-readiness" className="space-y-4">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900 text-base">Uji Kesiapan Sistem</h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Server memeriksa konfigurasi, keamanan, backup, data master, dan operasional presensi memakai data sungguhan. Tidak ada data yang diubah.
          </p>
          {result && (
            <p className="text-[11px] text-slate-500 mt-1">
              Terakhir: {new Date(result.ran_at).toLocaleString('id-ID')}{result.ran_by ? ` oleh ${result.ran_by}` : ''}
            </p>
          )}
        </div>
        <button
          id="btn-run-self-test"
          onClick={run}
          disabled={running}
          className="px-4 py-2.5 bg-[#1F5C45] hover:bg-[#12372A] text-white rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Memeriksa…' : 'Jalankan Uji Kesiapan'}
        </button>
      </div>

      {!result ? (
        <div className="p-8 rounded-3xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          Belum pernah dijalankan. Tekan <b>Jalankan Uji Kesiapan</b>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {(['pass', 'warn', 'fail'] as const).map((k) => (
              <div key={k} className={`p-4 rounded-2xl border ${BOX[k]}`}>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{k === 'pass' ? 'Lulus' : k === 'warn' ? 'Perlu perhatian' : 'Gagal'}</div>
                <div className="text-2xl font-black text-slate-900">{result.summary[k]}</div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            Tampilkan yang bermasalah saja
          </label>
          {groups.map((g) => {
            const items = result.checks.filter((c) => c.group === g && (!onlyProblems || c.status !== 'pass'));
            if (!items.length) return null;
            return (
              <div key={g} className="space-y-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">{g}</h4>
                {items.map((c) => (
                  <div key={c.id} className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${BOX[c.status]}`}>
                    {ICON[c.status]}
                    <div>
                      <div className="font-bold text-slate-900">{c.label}</div>
                      <div className="text-slate-600 mt-0.5">{c.detail}</div>
                      {c.fix && <div className="text-slate-800 font-semibold mt-1">Perbaiki: {c.fix}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

/** Menu "Uji Kesiapan Sistem" (dulu Acceptance Tests). */
export const SystemReadinessView: React.FC<{ onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ onShowToast }) => {
  const [initial, setInitial] = useState<SelfTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  React.useEffect(() => {
    apiClient
      .get('/golive')
      .then((res: any) => setInitial(res?.data?.self_test || null))
      .catch((err: any) => setError(err?.status === 403 ? 'Menu ini hanya untuk admin (izin Pemeliharaan Sistem / Audit Keamanan).' : null));
  }, []);
  return error ? (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">{error}</div>
  ) : (
    <SystemReadinessPanel initial={initial} onShowToast={onShowToast} />
  );
};
