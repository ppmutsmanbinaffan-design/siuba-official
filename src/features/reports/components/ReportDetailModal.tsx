import React from 'react';
import { X, Calendar, Clock, User, CheckCircle2, AlertCircle, MapPin, Radio, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: Record<string, any>;
}

export const ReportDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="report-detail-modal">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Key-Value Pairs */}
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(data).map(([key, val]) => {
              if (val === null || val === undefined) return null;
              return (
                <div 
                  key={key}
                  className="flex items-start justify-between gap-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs"
                >
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right break-words max-w-[60%]">
                    {typeof val === 'boolean' ? (val ? 'Ya' : 'Tidak') : String(val)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Close Button */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
