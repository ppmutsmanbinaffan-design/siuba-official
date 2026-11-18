import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ClipboardCheck, Bug, PenLine, BookOpen, Rocket, Plus, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { SystemReadinessPanel, SelfTestResult } from './SystemReadinessPanel';
import { SOPS, ERROR_CODES } from './sopContent';

type Toast = (msg: string, type: 'success' | 'error' | 'info') => void;

interface UatCase {
  id: string; module: string; role: string; scenario: string; preconditions: string; steps: string[]; expected_result: string;
  status: 'NOT_TESTED' | 'PASS' | 'PASS_WITH_NOTE' | 'FAIL'; actual_result?: string; notes?: string; tester_name?: string; tested_at?: string;
}
interface SignOff {
  role: string; module: string; status: 'WAITING' | 'ACCEPTED' | 'ACCEPTED_WITH_NOTES' | 'REJECTED';
  representative_name?: string; representative_title?: string; notes?: string; recorded_by?: string; signed_at?: string;
}
interface BugItem {
  id: string; title: string; module: string; severity: string; status: string; repro_steps?: string; expected?: string; actual?: string;
  owner?: string; created_by?: string; created_at: string; resolved_at?: string | null; notes?: string;
}
interface Gate { id: string; label: string; passed: boolean; detail: string }
interface GoLiveState { self_test: SelfTestResult | null; cases: UatCase[]; signoffs: SignOff[]; bugs: BugItem[]; gates: Gate[]; ready: boolean }

type Tab = 'READINESS' | 'UAT' | 'SIGNOFF' | 'BUGS' | 'SOP';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
const errMsg = (err: any, fb: string) => (err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string) : err?.message) || fb;

const STATUS_LABEL: Record<string, string> = {
  NOT_TESTED: 'Belum diuji', PASS: 'Lulus', PASS_WITH_NOTE: 'Lulus dg catatan', FAIL: 'Gagal',
  WAITING: 'Menunggu', ACCEPTED: 'Disetujui', ACCEPTED_WITH_NOTES: 'Disetujui dg catatan', REJECTED: 'Ditolak',
};
const STATUS_CLS: Record<string, string> = {
  NOT_TESTED: 'bg-slate-100 text-slate-600', WAITING: 'bg-slate-100 text-slate-600',
  PASS: 'bg-emerald-100 text-emerald-800', ACCEPTED: 'bg-emerald-100 text-emerald-800',
  PASS_WITH_NOTE: 'bg-amber-100 text-amber-800', ACCEPTED_WITH_NOTES: 'bg-amber-100 text-amber-800',
  FAIL: 'bg-rose-100 text-rose-800', REJECTED: 'bg-rose-100 text-rose-800',
};
const SEV_CLS: Record<string, string> = {
  BLOCKER: 'bg-rose-600 text-white', CRITICAL: 'bg-rose-100 text-rose-800', HIGH: 'bg-amber-100 text-amber-800',
  MEDIUM: 'bg-sky-100 text-sky-800', LOW: 'bg-slate-100 text-slate-600',
};
const BUG_STATUSES = ['OPEN', 'IN_PROGRESS', 'FIXED', 'RETEST', 'CLOSED', 'DEFERRED'];
const BUG_STATUS_LABEL: Record<string, string> = { OPEN: 'Terbuka', IN_PROGRESS: 'Dikerjakan', FIXED: 'Diperbaiki', RETEST: 'Uji ulang', CLOSED: 'Selesai', DEFERRED: 'Ditunda' };

/**
 * Go-Live & QA. Semua isi dari server: uji kesiapan sistem, hasil UAT per peran, persetujuan, catatan bug.
 * (Versi lama berisi hasil uji, nama penguji, tanda tangan, uji beban & bug rekaan yang tersimpan di browser.)
 */
export const GoLiveQAPage: React.FC<{ onShowToast?: Toast }> = ({ onShowToast }) => {
  const toast: Toast = onShowToast || ((m) => alert(m));
  const [tab, setTab] = useState<Tab>('READINESS');
  const [state, setState] = useState<GoLiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [editCase, setEditCase] = useState<UatCase | null>(null);
  const [caseForm, setCaseForm] = useState({ status: 'PASS', actual_result: '', notes: '' });
  const [editSign, setEditSign] = useState<SignOff | null>(null);
  const [signForm, setSignForm] = useState({ status: 'ACCEPTED', representative_name: '', representative_title: '', notes: '' });
  const [bugForm, setBugForm] = useState({ title: '', module: '', severity: 'MEDIUM', repro_steps: '', expected: '', actual: '', owner: '' });
  const [showBugForm, setShowBugForm] = useState(false);

  const load = async () => {
    try {
      const res: any = await apiClient.get('/golive');
      setState(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.status === 403 ? 'Menu ini hanya untuk admin (izin Pemeliharaan Sistem / Audit Keamanan).' : errMsg(err, 'Gagal memuat data Go-Live dari server.'));
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const call = async (fn: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    try {
      const res: any = await fn();
      if (res?.data?.cases) setState(res.data);
      toast(res?.message || 'Tersimpan.', 'success');
      after?.();
    } catch (err: any) {
      toast(errMsg(err, 'Gagal menyimpan.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const roles = useMemo(() => Array.from(new Set((state?.cases || []).map((c) => c.role))), [state]);
  const cases = (state?.cases || []).filter((c) => roleFilter === 'ALL' || c.role === roleFilter);

  if (error) return <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">{error}</div>;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'READINESS', label: 'Kesiapan & Uji Sistem', icon: Rocket },
    { id: 'UAT', label: 'Skenario UAT', icon: ClipboardCheck },
    { id: 'SIGNOFF', label: 'Persetujuan', icon: PenLine },
    { id: 'BUGS', label: 'Catatan Bug', icon: Bug },
    { id: 'SOP', label: 'SOP & Kode Galat', icon: BookOpen },
  ];

  return (
    <div id="golive-page" className="space-y-6 pb-12">
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md">
        <h1 className="text-2xl font-black tracking-tight">Go-Live & QA</h1>
        <p className="text-xs text-emerald-100/90 mt-1 max-w-3xl">
          Pastikan sistem siap dipakai: uji kesiapan otomatis di server, uji skenario per peran (UAT), persetujuan para perwakilan, dan catatan bug.
          Semua tersimpan di server bersama nama petugas dan waktunya.
        </p>
        {state && (
          <div id="golive-gates" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {state.gates.map((g) => (
              <div key={g.id} className="bg-white/10 border border-white/15 rounded-2xl p-3 text-xs flex items-start gap-2">
                {g.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-300 shrink-0" />}
                <div>
                  <div className="font-bold">{g.label}</div>
                  <div className="text-emerald-100/80">{g.detail}</div>
                </div>
              </div>
            ))}
            <div className={`md:col-span-2 rounded-2xl p-3 text-sm font-black text-center ${state.ready ? 'bg-emerald-400 text-emerald-950' : 'bg-white/15 text-white'}`}>
              {state.ready ? 'SIAP GO-LIVE' : 'BELUM SIAP GO-LIVE — selesaikan butir yang bertanda silang'}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${tab === t.id ? 'bg-[#1F5C45] text-white border-[#1F5C45]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
        <button onClick={load} className="ml-auto p-2 rounded-xl border border-slate-200 bg-white cursor-pointer" title="Muat ulang"><RefreshCw className="w-4 h-4 text-slate-600" /></button>
      </div>

      {tab === 'READINESS' && (
        <SystemReadinessPanel initial={state?.self_test || null} onShowToast={toast} onDone={() => void load()} />
      )}

      {tab === 'UAT' && state && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">Peran:</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-slate-300 rounded-xl px-2 py-1.5 bg-white">
              <option value="ALL">Semua</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="text-slate-500">Uji tiap skenario di aplikasi ini dengan data sungguhan, lalu catat hasilnya.</span>
          </div>
          {cases.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 text-xs space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] text-slate-500">{c.id} · {c.role} · {c.module}</div>
                  <div className="font-bold text-slate-900 text-sm">{c.scenario}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${STATUS_CLS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              </div>
              <div className="text-slate-600"><b>Syarat:</b> {c.preconditions}</div>
              <ol className="text-slate-700 space-y-0.5">{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <div className="text-slate-600"><b>Hasil yang diharapkan:</b> {c.expected_result}</div>
              {c.status !== 'NOT_TESTED' && (
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  {c.actual_result && <div><b>Hasil:</b> {c.actual_result}</div>}
                  {c.notes && <div><b>Catatan:</b> {c.notes}</div>}
                  <div className="text-[11px] text-slate-500">Diuji {c.tester_name} · {fmt(c.tested_at)}</div>
                </div>
              )}
              <button onClick={() => { setEditCase(c); setCaseForm({ status: c.status === 'NOT_TESTED' ? 'PASS' : c.status, actual_result: c.actual_result || '', notes: c.notes || '' }); }}
                className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 font-bold hover:bg-emerald-50 cursor-pointer">
                Catat Hasil Uji
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'SIGNOFF' && state && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.signoffs.map((s) => (
            <div key={s.role} className="bg-white rounded-2xl border border-slate-200 p-4 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-slate-900 text-sm">{s.role}</div>
                  <div className="text-slate-500">{s.module}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${STATUS_CLS[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              </div>
              {s.status !== 'WAITING' && (
                <div className="text-slate-700">
                  <div><b>{s.representative_name}</b>{s.representative_title ? ` — ${s.representative_title}` : ''}</div>
                  {s.notes && <div>Catatan: {s.notes}</div>}
                  <div className="text-[11px] text-slate-500">Dicatat {s.recorded_by} · {fmt(s.signed_at)}</div>
                </div>
              )}
              <button onClick={() => { setEditSign(s); setSignForm({ status: s.status === 'WAITING' ? 'ACCEPTED' : s.status, representative_name: s.representative_name || '', representative_title: s.representative_title || '', notes: s.notes || '' }); }}
                className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 font-bold hover:bg-emerald-50 cursor-pointer">
                Catat Persetujuan
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'BUGS' && state && (
        <div className="space-y-3">
          <button onClick={() => setShowBugForm((v) => !v)} className="px-4 py-2 rounded-2xl bg-[#1F5C45] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Catat Bug Baru
          </button>
          {showBugForm && (
            <form
              onSubmit={(e) => { e.preventDefault(); void call(() => apiClient.post('/golive/bugs', bugForm), () => { setShowBugForm(false); setBugForm({ title: '', module: '', severity: 'MEDIUM', repro_steps: '', expected: '', actual: '', owner: '' }); }); }}
              className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <input required placeholder="Judul bug" value={bugForm.title} onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2 md:col-span-2" />
              <input required placeholder="Menu / modul" value={bugForm.module} onChange={(e) => setBugForm({ ...bugForm, module: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2" />
              <select value={bugForm.severity} onChange={(e) => setBugForm({ ...bugForm, severity: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2">
                {['BLOCKER', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea placeholder="Langkah memunculkan" value={bugForm.repro_steps} onChange={(e) => setBugForm({ ...bugForm, repro_steps: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2 md:col-span-2" rows={2} />
              <input placeholder="Seharusnya" value={bugForm.expected} onChange={(e) => setBugForm({ ...bugForm, expected: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2" />
              <input placeholder="Yang terjadi" value={bugForm.actual} onChange={(e) => setBugForm({ ...bugForm, actual: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2" />
              <input placeholder="Penanggung jawab (opsional)" value={bugForm.owner} onChange={(e) => setBugForm({ ...bugForm, owner: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2" />
              <button disabled={busy} className="px-4 py-2 rounded-xl bg-[#1F5C45] text-white font-bold cursor-pointer disabled:opacity-50">Simpan</button>
            </form>
          )}
          {state.bugs.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed border-slate-300 text-center text-xs text-slate-500">Belum ada bug yang dicatat.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase">
                  <tr><th className="text-left p-3">Bug</th><th className="text-left p-3">Tingkat</th><th className="text-left p-3">Dicatat</th><th className="text-left p-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...state.bugs].reverse().map((b) => (
                    <tr key={b.id}>
                      <td className="p-3">
                        <div className="font-mono text-[10px] text-slate-500">{b.id} · {b.module}</div>
                        <div className="font-bold text-slate-900">{b.title}</div>
                        {b.actual && <div className="text-slate-500">Terjadi: {b.actual}</div>}
                        {b.notes && <div className="text-slate-500">Catatan: {b.notes}</div>}
                      </td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${SEV_CLS[b.severity]}`}>{b.severity}</span></td>
                      <td className="p-3 text-slate-600">{b.created_by}<div className="text-[11px] text-slate-400">{fmt(b.created_at)}</div></td>
                      <td className="p-3">
                        <select value={b.status} disabled={busy}
                          onChange={(e) => void call(() => apiClient.patch(`/golive/bugs/${b.id}`, { status: e.target.value }))}
                          className="border border-slate-300 rounded-xl px-2 py-1 bg-white">
                          {BUG_STATUSES.map((s) => <option key={s} value={s}>{BUG_STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'SOP' && (
        <div className="space-y-4">
          {SOPS.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 text-xs space-y-2">
              <div className="font-black text-slate-900 text-sm">{s.title}</div>
              <div className="text-slate-500">Untuk: {s.audience} · {s.when}</div>
              <ol className="space-y-1.5">
                {s.steps.map((st, i) => (
                  <li key={st.title} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <b>{i + 1}. {st.title}</b> — {st.instruction}
                    <div className="text-emerald-800">✓ {st.check}</div>
                  </li>
                ))}
              </ol>
              <div className="text-amber-800"><b>Bila gagal:</b> {s.fallback}</div>
            </div>
          ))}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <div className="p-3 font-black text-xs text-slate-700 uppercase">Kode pesan yang sering muncul</div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {ERROR_CODES.map((e) => (
                  <tr key={e.code}><td className="p-3 font-mono font-bold text-slate-900">{e.code}</td><td className="p-3 text-slate-600">{e.meaning}</td><td className="p-3 text-slate-700">{e.action}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editCase && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditCase(null)}>
          <form onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); void call(() => apiClient.post(`/golive/uat/${editCase.id}`, caseForm), () => setEditCase(null)); }}
            className="bg-white rounded-3xl p-5 w-full max-w-lg space-y-3 text-xs">
            <div className="font-black text-sm text-slate-900">{editCase.id}: {editCase.scenario}</div>
            <select value={caseForm.status} onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2">
              <option value="PASS">Lulus</option>
              <option value="PASS_WITH_NOTE">Lulus dengan catatan</option>
              <option value="FAIL">Gagal</option>
              <option value="NOT_TESTED">Kosongkan (belum diuji)</option>
            </select>
            <textarea placeholder="Hasil yang terjadi (wajib bila gagal)" value={caseForm.actual_result} onChange={(e) => setCaseForm({ ...caseForm, actual_result: e.target.value })} rows={3} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            <textarea placeholder="Catatan (opsional)" value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditCase(null)} className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer">Batal</button>
              <button disabled={busy} className="px-4 py-2 rounded-xl bg-[#1F5C45] text-white font-bold cursor-pointer disabled:opacity-50">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {editSign && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditSign(null)}>
          <form onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); void call(() => apiClient.post('/golive/signoffs', { role: editSign.role, ...signForm }), () => setEditSign(null)); }}
            className="bg-white rounded-3xl p-5 w-full max-w-lg space-y-3 text-xs">
            <div className="font-black text-sm text-slate-900">Persetujuan: {editSign.role}</div>
            <p className="text-slate-500">Catat setelah perwakilan peran ini mencoba sistem dan menyatakan setuju. Nama Anda tercatat sebagai pencatat.</p>
            <select value={signForm.status} onChange={(e) => setSignForm({ ...signForm, status: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2">
              <option value="ACCEPTED">Disetujui</option>
              <option value="ACCEPTED_WITH_NOTES">Disetujui dengan catatan</option>
              <option value="REJECTED">Ditolak</option>
              <option value="WAITING">Kosongkan (menunggu)</option>
            </select>
            <input placeholder="Nama perwakilan yang menyetujui" value={signForm.representative_name} onChange={(e) => setSignForm({ ...signForm, representative_name: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            <input placeholder="Jabatan (opsional)" value={signForm.representative_title} onChange={(e) => setSignForm({ ...signForm, representative_title: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            <textarea placeholder="Catatan / alasan (wajib bila dengan catatan atau ditolak)" value={signForm.notes} onChange={(e) => setSignForm({ ...signForm, notes: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditSign(null)} className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer">Batal</button>
              <button disabled={busy} className="px-4 py-2 rounded-xl bg-[#1F5C45] text-white font-bold cursor-pointer disabled:opacity-50">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
