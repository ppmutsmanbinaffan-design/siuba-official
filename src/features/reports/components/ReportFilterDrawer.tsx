import React from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  title?: string;
  children: React.ReactNode;
}

export const ReportFilterDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  title = 'Filter Laporan',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="report-filter-drawer">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Controls Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {children}
          </div>

          {/* Bottom Actions */}
          <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-3">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 py-3 px-4 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Filter
            </button>
            <button
              type="button"
              onClick={() => {
                onApply();
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
