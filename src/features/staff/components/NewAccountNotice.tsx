import React, { useState } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';

export interface NewAccountInfo {
  username: string;
  role_label: string;
  initial_password: string;
}

/** Tampilkan username & password awal akun SDM baru — satu kali saja, server tidak menyimpannya dalam bentuk terbaca. */
export const NewAccountNotice: React.FC<{ staffName: string; account: NewAccountInfo; onClose: () => void }> = ({ staffName, account, onClose }) => {
  const [copied, setCopied] = useState(false);
  const text = `Akun SIUBA ${staffName}\nUsername: ${account.username}\nPassword awal: ${account.initial_password}\nSegera ganti password setelah masuk.`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard tidak tersedia */ }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" data-testid="new-account-notice">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-700" />
          <h3 className="text-lg font-black text-zinc-900">Akun login dibuat</h3>
        </div>
        <p className="text-sm text-zinc-700">Untuk <b>{staffName}</b> dengan peran <b>{account.role_label}</b>.</p>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm space-y-1">
          <div>Username: <b>{account.username}</b></div>
          <div>Password awal: <b>{account.initial_password}</b></div>
        </div>
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          Password ini hanya ditampilkan <b>sekali</b>. Catat atau salin sekarang, berikan langsung ke yang bersangkutan, dan minta ia menggantinya setelah masuk.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={copy} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-800 flex items-center gap-1.5 cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />} {copied ? 'Tersalin' : 'Salin'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-bold cursor-pointer">Sudah saya catat</button>
        </div>
      </div>
    </div>
  );
};

export default NewAccountNotice;
