import React, { useEffect, useState } from 'react';
import { KeyRound, Link2, UserX } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

/**
 * Akun login SDM: buat akun milik SDM ini sendiri (nama dari data SDM, pilih peran),
 * atau tautkan akun yang belum dipakai SDM lain. Daftar memakai username & peran, bukan nama orang lain.
 */
export type AccountMode = 'none' | 'create' | 'link';

export interface LinkableAccount {
  id: number;
  username: string;
  name: string;
  is_active: boolean;
  role_label: string;
  is_example: boolean;
}

interface Props {
  staffId?: number;
  staffNumber: string;
  staffType: string;
  linkedUsername?: string | null;
  linkedRoleLabel?: string;
  mode: AccountMode;
  userId: number | null;
  accountUsername: string;
  accountRole: string;
  errors: Record<string, string>;
  onChange: (patch: { account_mode?: AccountMode; user_id?: number | null; account_username?: string; account_role?: string }) => void;
}

const DEFAULT_ROLE: Record<string, string> = {
  teacher: 'guru', trainer: 'pelatih', musyrif: 'musyrif', general_staff: 'operator', administration: 'operator',
  security: 'petugas-absensi', cleaning: 'petugas-absensi', employee: 'petugas-absensi',
};

export const StaffAccountSection: React.FC<Props> = (p) => {
  const [accounts, setAccounts] = useState<LinkableAccount[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient.get(`/staff/linkable-accounts${p.staffId ? `?staff_id=${p.staffId}` : ''}`)
      .then((res: any) => {
        setAccounts(res?.data?.accounts || []);
        setRoles(res?.data?.roles || []);
        setCanCreate(!!res?.data?.can_create_account);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [p.staffId]);

  // peran default mengikuti tipe SDM selama belum dipilih manual
  useEffect(() => {
    if (p.mode === 'create' && !p.accountRole && roles.length) {
      const want = DEFAULT_ROLE[p.staffType] || 'guru';
      p.onChange({ account_role: roles.some((r) => r.value === want) ? want : roles[0].value });
    }
  }, [p.mode, roles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const radio = (value: AccountMode, icon: React.ReactNode, title: string, desc: string, disabled = false) => (
    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${p.mode === value ? 'border-emerald-500 bg-emerald-50/60' : 'border-zinc-200 hover:bg-zinc-50'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input type="radio" name="account_mode" className="mt-1" checked={p.mode === value} disabled={disabled}
        onChange={() => p.onChange({ account_mode: value, user_id: value === 'link' ? p.userId : null })} />
      <div>
        <div className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">{icon}{title}</div>
        <div className="text-xs text-zinc-700">{desc}</div>
      </div>
    </label>
  );

  const input = 'w-full mt-1 px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600';

  return (
    <div className="space-y-3" data-testid="staff-account-section">
      <div className="text-sm font-semibold text-zinc-800">Akun Login SIUBA</div>
      {p.linkedUsername && (
        <div className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
          Saat ini tertaut ke akun <b>{p.linkedUsername}</b>{p.linkedRoleLabel ? <> · peran <b>{p.linkedRoleLabel}</b></> : null}.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {radio('none', <UserX className="w-4 h-4 text-zinc-600" />, 'Tanpa akun login', 'Hanya data pegawai & kartu presensi.')}
        {radio('create', <KeyRound className="w-4 h-4 text-emerald-700" />, 'Buat akun untuk SDM ini',
          canCreate ? 'Akun atas nama SDM ini sendiri; Anda memilih perannya.' : 'Perlu izin Manajemen Pengguna (Super Admin).', !canCreate || !!p.linkedUsername)}
        {radio('link', <Link2 className="w-4 h-4 text-sky-700" />, 'Tautkan akun yang ada', 'Akun yang belum dipakai SDM lain.')}
      </div>

      {p.mode === 'create' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-zinc-800">Username login
            <input className={input} value={p.accountUsername} placeholder={(p.staffNumber || 'nip.guru').toLowerCase()}
              onChange={(e) => p.onChange({ account_username: e.target.value.toLowerCase().replace(/\s+/g, '.') })} />
            <span className="block mt-1 font-normal text-zinc-600">Kosongkan untuk memakai Nomor SDM / NIP.</span>
            {p.errors.account_username && <span className="block mt-1 text-rose-700">{p.errors.account_username}</span>}
          </label>
          <label className="block text-xs font-bold text-zinc-800">Peran (hak akses)
            <select className={input} value={p.accountRole} onChange={(e) => p.onChange({ account_role: e.target.value })}>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {p.errors.account_role && <span className="block mt-1 text-rose-700">{p.errors.account_role}</span>}
          </label>
          <p className="sm:col-span-2 text-xs text-zinc-700">
            Nama akun = nama SDM ini. Password awal dibuat acak dan ditampilkan <b>sekali</b> setelah disimpan — catat lalu berikan ke yang bersangkutan.
          </p>
        </div>
      )}

      {p.mode === 'link' && (
        <label className="block text-xs font-bold text-zinc-800">Pilih akun
          <select className={input} value={p.userId ? String(p.userId) : ''} onChange={(e) => p.onChange({ user_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{loaded ? (accounts.length ? '-- Pilih akun --' : '-- Tidak ada akun yang bebas --') : 'Memuat...'}</option>
            {accounts.filter((a) => !a.is_example).map((a) => (
              <option key={a.id} value={a.id}>{a.username} — {a.role_label}{a.name ? ` (${a.name})` : ''}{a.is_active ? '' : ' [nonaktif]'}</option>
            ))}
            {accounts.some((a) => a.is_example) && (
              <optgroup label="Akun contoh bawaan (sebaiknya jangan dipakai)">
                {accounts.filter((a) => a.is_example).map((a) => (
                  <option key={a.id} value={a.id}>{a.username} — {a.role_label}</option>
                ))}
              </optgroup>
            )}
          </select>
          {p.errors.user_id && <span className="block mt-1 text-rose-700">{p.errors.user_id}</span>}
        </label>
      )}
    </div>
  );
};

export default StaffAccountSection;
