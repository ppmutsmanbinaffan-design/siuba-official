import React from 'react';
import { AlertTriangle, Sparkles, RefreshCw, X } from 'lucide-react';
import { CardOrientation } from '../../../types';

export interface CardOrientationChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldOrientation: CardOrientation;
  newOrientation: CardOrientation;
  onConfirm: (strategy: 'relative' | 'reset') => void;
}

export const CardOrientationChangeModal: React.FC<CardOrientationChangeModalProps> = ({
  isOpen,
  onClose,
  oldOrientation,
  newOrientation,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white">
                Penyesuaian Orientasi Kartu
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {oldOrientation === 'landscape' ? 'Landscape (85.5 × 54 mm)' : 'Portrait (54 × 85.5 mm)'} ➔ {newOrientation === 'landscape' ? 'Landscape' : 'Portrait'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Anda mengubah orientasi kartu ke <strong className="text-zinc-900 dark:text-white">{newOrientation === 'landscape' ? 'Landscape' : 'Portrait'}</strong>. Karena ukuran rasio kanvas berubah, posisi elemen di dalam template perlu disesuaikan.
          </p>

          <div className="space-y-3">
            {/* Option 1: Relative Scaling */}
            <div
              onClick={() => onConfirm('relative')}
              className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-[#1F5C45] dark:hover:border-[#2F7D5A] bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#1F5C45] dark:group-hover:text-[#2F7D5A]">
                <Sparkles className="w-4 h-4 text-[#1F5C45] dark:text-[#2F7D5A]" />
                Pertahankan Posisi Relatif (Disarankan)
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Koordinat elemen (X, Y, W, H) akan diskalakan secara proporsional sesuai rasio kanvas baru.
              </p>
            </div>

            {/* Option 2: Reset to Standard Positions */}
            <div
              onClick={() => onConfirm('reset')}
              className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-[#1F5C45] dark:hover:border-[#2F7D5A] bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#1F5C45] dark:group-hover:text-[#2F7D5A]">
                <RefreshCw className="w-4 h-4 text-[#C9A227]" />
                Reset Posisi Elemen Standar
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Mengatur ulang seluruh posisi elemen (foto, nama, NIS, QR) ke layout default standar {newOrientation}.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
