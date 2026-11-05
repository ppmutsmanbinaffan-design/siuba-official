import React from 'react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export interface Forbidden403Props {
  onBackToDashboard?: () => void;
  requiredPermission?: string;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  onBackToDashboard,
  requiredPermission,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-md shadow-rose-950/5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 uppercase">
            Error 403 • Akses Ditolak
          </span>
          <h2 className="text-xl font-black text-slate-900">
            Anda Tidak Memiliki Izin
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Akun Anda tidak memiliki hak akses yang diperlukan untuk membuka modul ini. Silakan hubungi Administrator SIUBA jika Anda memerlukan otorisasi.
          </p>
          {requiredPermission && (
            <p className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Required Permission: <code className="text-emerald-700 font-bold">{requiredPermission}</code>
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => window.history.back()}
          >
            Kembali
          </Button>
          {onBackToDashboard && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Home className="w-4 h-4" />}
              onClick={onBackToDashboard}
            >
              Ke Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export interface NotFound404Props {
  onBackToDashboard?: () => void;
}

export const NotFound404: React.FC<NotFound404Props> = ({ onBackToDashboard }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-md shadow-amber-950/5">
          <span className="text-2xl font-black font-mono">404</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Halaman yang Anda tuju tidak tersedia atau telah dipindahkan. Periksa kembali tautan URL Anda.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => window.history.back()}
          >
            Kembali
          </Button>
          {onBackToDashboard && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Home className="w-4 h-4" />}
              onClick={onBackToDashboard}
            >
              Ke Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
