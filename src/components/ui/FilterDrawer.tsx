import React, { useEffect } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  activeFilterCount?: number;
  activeCount?: number;
  onReset?: () => void;
  onApply?: () => void;
  children: React.ReactNode;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Filter & Parameter Pencarian',
  activeFilterCount,
  activeCount,
  onReset,
  onApply,
  children,
}) => {
  const effectiveCount = activeFilterCount !== undefined ? activeFilterCount : (activeCount !== undefined ? activeCount : 0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#1F5C45]/10 dark:bg-[#1F5C45]/20 text-[#1F5C45] dark:text-[#2F7D5A] border border-[#1F5C45]/20">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
                {effectiveCount > 0 && (
                  <span className="text-xs font-semibold text-[#1F5C45] dark:text-[#2F7D5A]">
                    {effectiveCount} filter aktif
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup filter"
              className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-zinc-700 dark:text-zinc-300">
            {children}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/90 flex items-center justify-between gap-3">
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={onReset}
              >
                Reset
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (onApply) onApply();
                  onClose();
                }}
              >
                Terapkan Filter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

