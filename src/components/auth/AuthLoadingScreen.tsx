import React from 'react';
import { Loader2 } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-[#0c0d0e] text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#1F5C45] text-white font-black flex items-center justify-center text-2xl shadow-xl shadow-[#1F5C45]/20 animate-pulse">
          UB
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-white tracking-tight">SIUBA</h2>
          <p className="text-xs text-zinc-400 font-medium">Memverifikasi sesi pengguna...</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memuat Sistem Pesantren...</span>
        </div>
      </div>
    </div>
  );
};
