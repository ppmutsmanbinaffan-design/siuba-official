import { useEffect, useState } from 'react';
import { apiClient, isOfflineError } from '../../services/apiClient';

/**
 * Laporan SDM menghitung dari cache browser (localStorage). Hook ini mengisi cache itu dengan data SERVER
 * untuk rentang tanggal yang dipilih, lalu menaikkan `version` agar laporan dihitung ulang.
 * Tanpa ini laporan membaca data lama / data contoh bawaan, bukan data sungguhan.
 */
const KEYS = {
  staff: 'siuba_staff_master',
  records: 'siuba_staff_attendance_records',
  absences: 'siuba_staff_absence_requests',
  teaching: 'siuba_teaching_sessions',
  training: 'siuba_training_sessions',
  assignments: 'siuba_extracurricular_staff_assignments',
  extracurriculars: 'siuba_extracurriculars',
};

export function useServerStaffReportData(
  dateFrom: string,
  dateTo: string,
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void
) {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res: any = await apiClient.get('/reports/staff-dataset', { from: dateFrom, to: dateTo });
        if (cancelled) return;
        const d = res?.data || {};
        const put = (k: string, v: unknown) => {
          try {
            localStorage.setItem(k, JSON.stringify(Array.isArray(v) ? v : []));
          } catch {
            /* penyimpanan penuh: laporan tetap memakai data terakhir */
          }
        };
        put(KEYS.staff, d.staff);
        put(KEYS.records, d.records);
        put(KEYS.absences, d.absences);
        put(KEYS.teaching, d.teaching_sessions);
        put(KEYS.training, d.training_sessions);
        put(KEYS.assignments, d.extracurricular_assignments);
        put(KEYS.extracurriculars, d.extracurriculars);
        setError(null);
        if (d.clipped) {
          onShowToast?.(`Rentang laporan dibatasi maksimal 93 hari (${d.from} s/d ${d.to}).`, 'info');
        }
        setVersion((v) => v + 1);
      } catch (err: any) {
        if (cancelled) return;
        const msg = isOfflineError(err)
          ? 'Server tidak terjangkau: laporan memakai data terakhir yang tersimpan di perangkat ini.'
          : err?.message || 'Gagal memuat data laporan dari server.';
        setError(msg);
        onShowToast?.(msg, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [dateFrom, dateTo]);

  return { version, loading, error };
}
