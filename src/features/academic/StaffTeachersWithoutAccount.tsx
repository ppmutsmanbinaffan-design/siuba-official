import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { NewAccountNotice, NewAccountInfo } from '../staff/components/NewAccountNotice';

interface StaffRow {
  id: number;
  name: string;
  staff_number: string;
  user_id?: number | null;
}

/**
 * Guru di KBM = SDM yang punya akun login. SDM berjenis Guru yang dibuat di Master SDM tanpa akun
 * tidak bisa diberi jadwal mengajar; panel ini menampilkannya dan membuatkan akunnya sekali klik.
 */
export const StaffTeachersWithoutAccount: React.FC<{
  knownTeacherCount: number;
  onChanged?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ knownTeacherCount, onChanged, onShowToast }) => {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ name: string; account: NewAccountInfo } | null>(null);

  const load = async () => {
    try {
      const res: any = await apiClient.get('/staff', { staff_type: 'teacher', is_active: 'true', per_page: 500 });
      setRows(((res?.data || []) as StaffRow[]).filter((s) => !s.user_id));
    } catch {
      setRows([]); // tanpa izin melihat SDM: panel disembunyikan
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownTeacherCount]);

  const createAccount = async (s: StaffRow) => {
    setBusyId(s.id);
    try {
      const res: any = await apiClient.patch(`/staff/${s.id}`, { create_account: true, account_role: 'guru' });
      const acc = res?.data?.new_account;
      if (acc) setNotice({ name: s.name, account: acc });
      onShowToast(`Akun guru untuk ${s.name} dibuat; sekarang bisa diberi jadwal mengajar.`, 'success');
      await load();
      onChanged?.();
    } catch (e: any) {
      onShowToast(e?.message || 'Gagal membuat akun. Buka Master SDM → Edit untuk mengatur username.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0 && !notice) return null;

  return (
    <>
      {rows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-xs text-amber-900 space-y-2" data-testid="staff-teachers-without-account">
          <p className="font-bold">
            {rows.length} SDM berjenis Guru di Master SDM belum punya akun login, jadi belum muncul di daftar guru KBM
            dan belum bisa diberi jadwal mengajar.
          </p>
          <div className="flex flex-wrap gap-2">
            {rows.map((s) => (
              <button
                key={s.id}
                disabled={busyId !== null}
                onClick={() => void createAccount(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl font-bold disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {busyId === s.id ? 'Membuat akun…' : `Buatkan akun guru: ${s.name}`}
              </button>
            ))}
          </div>
          <p className="text-amber-800">Username memakai nomor SDM; password awal ditampilkan sekali setelah akun dibuat.</p>
        </div>
      )}
      {notice && <NewAccountNotice staffName={notice.name} account={notice.account} onClose={() => setNotice(null)} />}
    </>
  );
};
