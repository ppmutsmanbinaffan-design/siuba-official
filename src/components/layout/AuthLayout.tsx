import React from 'react';
import { CheckCircle2, ShieldCheck, QrCode, CreditCard, Sparkles } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#F7F8F7] text-zinc-900 flex flex-col justify-center items-center p-3.5 sm:p-6 lg:p-8 relative selection:bg-[#C9A227] selection:text-white">
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        {/* Left Side: Brand Visual & Identity (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-[#12372A] via-[#1a4a39] to-[#12372A] p-8 flex-col justify-between relative overflow-hidden border-r border-[#1a4a39]">
          {/* Subtle texture simulation */}
          <div className="absolute inset-0 bg-[radial-gradient(#C9A227_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C9A227] text-white font-black flex items-center justify-center text-xl shadow-md shadow-amber-900/20 shrink-0">
                UB
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">SIUBA</h1>
                <p className="text-[11px] text-[#EADAA2] font-bold uppercase tracking-wider">
                  Utsman Bin Affan
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#12372A]/80 border border-[#C9A227]/40 text-[#EADAA2] text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Pesantren Digital Edition v1.0.9</span>
              </div>
              <h2 className="text-lg font-black text-white leading-snug">
                Sistem Informasi & Presensi Terpadu Santri & SDM
              </h2>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Platform operasional pesantren terintegrasi untuk manajemen santri, kehadiran multi-metode (QR Scanner & RFID ESP32), KBM, asrama, dan pelaporan real-time.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-emerald-800/60 relative z-10">
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
              <div className="w-6 h-6 rounded-lg bg-emerald-800/80 flex items-center justify-center shrink-0">
                <QrCode className="w-3.5 h-3.5 text-[#EADAA2]" />
              </div>
              <span>Live QR Scanner & RFID Reader Engine</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
              <div className="w-6 h-6 rounded-lg bg-emerald-800/80 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-[#EADAA2]" />
              </div>
              <span>Studio Desain & Cetak Kartu CR80</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
              <div className="w-6 h-6 rounded-lg bg-emerald-800/80 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#EADAA2]" />
              </div>
              <span>Spatie RBAC & Multi-Role Security</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          {children}
        </div>
      </div>

      {/* Footer copyright */}
      <p className="mt-6 text-center text-xs text-zinc-500 font-medium">
        &copy; {new Date().getFullYear()} Pesantren Tahfidz Utsman Bin Affan. All rights reserved.
      </p>
    </div>
  );
};
