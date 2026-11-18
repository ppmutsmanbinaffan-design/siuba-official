import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, Edit2, Plus, Power, Trash2, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { AcademicYear, Semester, SemesterCode } from '../../types';
import { todayLocalDate } from '../../utils/today';

/**
 * Tahap 27 — Tahun Ajaran & Semester.
 * Sumber kebenaran ada di server; setiap perubahan mengembalikan daftar terbaru
 * dan diteruskan ke App lewat onChanged.
 */

type YearRow = AcademicYear & { usage?: { assignments: number; schedules: number; events: number } };
type PeriodPayload = { academic_years: YearRow[]; semesters: Semester[] };

interface Props {
  academicYears: YearRow[];
  semesters: Semester[];
  onChanged: (years: AcademicYear[], semesters: Semester[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type YearForm = { id?: number; name: string; start_date: string; end_date: string; activate: boolean };
type SemForm = { id?: number; academic_year_id: number; code: SemesterCode; name: string; start_date: string; end_date: string };

const fmt = (d?: string) => {
  if (!d) return '-';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const errText = (err: any, fallback: string) => {
  if (err?.status === 403) return 'Anda tidak punya izin mengelola tahun ajaran (izin Master KBM).';
  const fe = err?.fieldErrors ? (Object.values(err.fieldErrors).flat()[0] as string | undefined) : undefined;
  const generic = !err?.message || /tidak valid|given data was invalid/i.test(err.message);
  return (generic ? fe : err.message) || fe || err?.message || fallback;
};

/** Usulan tahun ajaran berikutnya: lanjutan dari yang terakhir, atau tahun ajaran berjalan. */
const suggestYear = (years: YearRow[]): YearForm => {
  const latest = [...years].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
  let start: number;
  if (latest) start = Number(latest.name.slice(0, 4)) + 1;
  else {
    const t = todayLocalDate();
    const y = Number(t.slice(0, 4));
    start = Number(t.slice(5, 7)) >= 7 ? y : y - 1;
  }
  return { name: `${start}/${start + 1}`, start_date: `${start}-07-01`, end_date: `${start + 1}-06-30`, activate: !latest };
};

export const AcademicPeriodTab: React.FC<Props> = ({ academicYears, semesters, onChanged, onShowToast }) => {
  const [busy, setBusy] = useState(false);
  const [yearForm, setYearForm] = useState<YearForm | null>(null);
  const [semForm, setSemForm] = useState<SemForm | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'year' | 'semester'; id: number; label: string } | null>(null);

  // Muat ulang dari server saat tab dibuka (tahun ajaran bisa dibuat otomatis oleh penugasan/kalender).
  useEffect(() => {
    let alive = true;
    apiClient.get<PeriodPayload>('/academic/periods')
      .then((res: any) => { if (alive && res?.data?.academic_years) onChanged(res.data.academic_years, res.data.semesters); })
      .catch(() => undefined);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => [...academicYears].sort((a, b) => b.start_date.localeCompare(a.start_date)), [academicYears]);
  const activeYear = years.find((y) => y.is_active);
  const activeSem = semesters.find((s) => s.is_active && s.academic_year_id === activeYear?.id);

  const run = async (fn: () => Promise<any>, fallback: string) => {
    setBusy(true);
    try {
      const res: any = await fn();
      const data = res?.data as PeriodPayload | undefined;
      if (data?.academic_years) onChanged(data.academic_years, data.semesters);
      onShowToast(res?.message || 'Tersimpan.', 'success');
      return true;
    } catch (err: any) {
      onShowToast(errText(err, fallback), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearForm) return;
    const body = { name: yearForm.name.trim(), start_date: yearForm.start_date, end_date: yearForm.end_date };
    const ok = yearForm.id
      ? await run(() => apiClient.patch(`/academic/years/${yearForm.id}`, body), 'Tahun ajaran gagal disimpan.')
      : await run(() => apiClient.post('/academic/years', { ...body, activate: yearForm.activate, create_semesters: true }), 'Tahun ajaran gagal dibuat.');
    if (ok) setYearForm(null);
  };

  const saveSem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semForm) return;
    const body = { code: semForm.code, name: semForm.name.trim() || null, start_date: semForm.start_date, end_date: semForm.end_date };
    const ok = semForm.id
      ? await run(() => apiClient.patch(`/academic/semesters/${semForm.id}`, body), 'Semester gagal disimpan.')
      : await run(() => apiClient.post('/academic/semesters', { ...body, academic_year_id: semForm.academic_year_id }), 'Semester gagal ditambahkan.');
    if (ok) setSemForm(null);
  };

  const doDelete = async () => {
    if (!confirm) return;
    const url = confirm.kind === 'year' ? `/academic/years/${confirm.id}` : `/academic/semesters/${confirm.id}`;
    await run(() => apiClient.delete(url), 'Gagal menghapus.');
    setConfirm(null);
  };

  const input = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600';

  return (
    <div className="space-y-5" data-testid="academic-period-tab">
      {/* Ringkasan periode aktif */}
      <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${activeYear && activeSem ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Periode aktif</div>
          {activeYear ? (
            <div className="text-lg font-black text-slate-900">
              Tahun Ajaran {activeYear.name}
              <span className="font-semibold text-slate-700"> · {activeSem ? activeSem.name : 'belum ada semester aktif'}</span>
            </div>
          ) : (
            <div className="text-lg font-black text-amber-900">Belum ada tahun ajaran aktif</div>
          )}
          <p className="text-xs text-slate-700 mt-1 max-w-2xl">
            Penugasan mengajar, jadwal pelajaran, dan pembuatan sesi KBM otomatis memakai tahun ajaran & semester yang aktif.
            Ganti semester di sini saat pergantian semester.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setYearForm(suggestYear(years))}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#1F5C45] hover:bg-[#174634] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Tahun Ajaran
        </button>
      </div>

      {years.length === 0 && (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-3xl text-sm text-slate-700">
          <CalendarRange className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          Belum ada tahun ajaran. Klik <b>Tambah Tahun Ajaran</b> — Semester Ganjil & Genap dibuat otomatis.
        </div>
      )}

      {years.map((y) => {
        const sems = semesters.filter((s) => s.academic_year_id === y.id).sort((a, b) => a.start_date.localeCompare(b.start_date));
        const missing = (['GANJIL', 'GENAP'] as SemesterCode[]).filter((c) => !sems.some((s) => s.code === c));
        const used = y.usage ? y.usage.assignments + y.usage.schedules + y.usage.events : 0;
        return (
          <div key={y.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${y.is_active ? 'border-emerald-300' : 'border-slate-200'}`}>
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">Tahun Ajaran {y.name}</h3>
                  {y.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> AKTIF
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-700 mt-0.5">
                  {fmt(y.start_date)} – {fmt(y.end_date)}
                  {y.usage && used > 0 && (
                    <span className="text-slate-600"> · {y.usage.assignments} penugasan, {y.usage.schedules} jadwal, {y.usage.events} agenda</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!y.is_active && (
                  <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/academic/years/${y.id}/activate`), 'Gagal mengaktifkan.')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
                    <Power className="w-3.5 h-3.5" /> Aktifkan
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => setYearForm({ id: y.id, name: y.name, start_date: y.start_date, end_date: y.end_date, activate: false })}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 cursor-pointer">
                  <Edit2 className="w-3.5 h-3.5" /> Ubah
                </button>
                {!y.is_active && used === 0 && (
                  <button type="button" disabled={busy} onClick={() => setConfirm({ kind: 'year', id: y.id, label: `Tahun Ajaran ${y.name} beserta semesternya` })}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {sems.map((s) => (
                <div key={s.id} className={`p-4 rounded-2xl border ${s.is_active ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {s.name}
                        {s.is_active && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">AKTIF</span>}
                      </div>
                      <div className="text-xs text-slate-700">{fmt(s.start_date)} – {fmt(s.end_date)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Ubah ${s.name}`} disabled={busy}
                        onClick={() => setSemForm({ id: s.id, academic_year_id: y.id, code: s.code, name: s.name, start_date: s.start_date, end_date: s.end_date })}
                        className="p-1.5 rounded-lg text-slate-700 hover:bg-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                      {!s.is_active && (
                        <button type="button" aria-label={`Hapus ${s.name}`} disabled={busy}
                          onClick={() => setConfirm({ kind: 'semester', id: s.id, label: `${s.name} ${y.name}` })}
                          className="p-1.5 rounded-lg text-red-700 hover:bg-white cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                  {!s.is_active && (
                    <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/academic/semesters/${s.id}/activate`), 'Gagal mengaktifkan semester.')}
                      className="mt-3 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-white text-xs font-bold cursor-pointer disabled:opacity-50">
                      Jadikan semester aktif
                    </button>
                  )}
                </div>
              ))}
              {missing.map((code) => (
                <button key={code} type="button" disabled={busy}
                  onClick={() => setSemForm({
                    academic_year_id: y.id, code, name: code === 'GANJIL' ? 'Semester Ganjil' : 'Semester Genap',
                    start_date: code === 'GANJIL' ? y.start_date : `${y.name.slice(5, 9)}-01-01`,
                    end_date: code === 'GANJIL' ? `${y.name.slice(0, 4)}-12-31` : y.end_date,
                  })}
                  className="p-4 rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer">
                  <Plus className="w-4 h-4" /> Tambah {code === 'GANJIL' ? 'Semester Ganjil' : 'Semester Genap'}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal tahun ajaran */}
      {yearForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <form onSubmit={saveYear} className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">{yearForm.id ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran'}</h3>
              <button type="button" aria-label="Tutup" onClick={() => setYearForm(null)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-xs font-bold text-slate-800">Nama (format 2026/2027)
              <input className={input} value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="2026/2027" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-800">Mulai
                <input type="date" className={input} value={yearForm.start_date} onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })} required />
              </label>
              <label className="block text-xs font-bold text-slate-800">Selesai
                <input type="date" className={input} value={yearForm.end_date} onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })} required />
              </label>
            </div>
            {!yearForm.id && (
              <>
                <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  Semester Ganjil (sampai 31 Desember) dan Genap (mulai 1 Januari) dibuat otomatis. Tanggalnya bisa diubah sesudahnya.
                </p>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={yearForm.activate} onChange={(e) => setYearForm({ ...yearForm, activate: e.target.checked })} />
                  Langsung jadikan tahun ajaran aktif
                </label>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setYearForm(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 cursor-pointer">Batal</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-[#1F5C45] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal semester */}
      {semForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <form onSubmit={saveSem} className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">{semForm.id ? 'Ubah Semester' : 'Tambah Semester'}</h3>
              <button type="button" aria-label="Tutup" onClick={() => setSemForm(null)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-800">Jenis
                <select className={input} value={semForm.code} onChange={(e) => setSemForm({ ...semForm, code: e.target.value as SemesterCode })}>
                  <option value="GANJIL">Ganjil</option>
                  <option value="GENAP">Genap</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-800">Nama tampilan
                <input className={input} value={semForm.name} onChange={(e) => setSemForm({ ...semForm, name: e.target.value })} />
              </label>
              <label className="block text-xs font-bold text-slate-800">Mulai
                <input type="date" className={input} value={semForm.start_date} onChange={(e) => setSemForm({ ...semForm, start_date: e.target.value })} required />
              </label>
              <label className="block text-xs font-bold text-slate-800">Selesai
                <input type="date" className={input} value={semForm.end_date} onChange={(e) => setSemForm({ ...semForm, end_date: e.target.value })} required />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSemForm(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 cursor-pointer">Batal</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-[#1F5C45] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">Hapus?</h3>
            <p className="text-sm text-slate-700">{confirm.label} akan dihapus permanen.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 cursor-pointer">Batal</button>
              <button type="button" disabled={busy} onClick={doDelete} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer disabled:opacity-50">Ya, hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicPeriodTab;
