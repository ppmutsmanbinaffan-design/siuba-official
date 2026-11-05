import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ActiveFilterChip } from '../types';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateChange?: (from: string, to: string) => void;
  activeChips?: ActiveFilterChip[];
  onRemoveChip?: (key: string) => void;
  onResetFilters?: () => void;
  onOpenMobileDrawer?: () => void;
  children?: React.ReactNode; // Custom dropdown filters on desktop
}

export const ReportFilterBar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateChange,
  activeChips = [],
  onRemoveChip,
  onResetFilters,
  onOpenMobileDrawer,
  children,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  const handleDatePreset = (preset: 'today' | '7days' | 'this_month') => {
    if (!onDateChange) return;
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);

    if (preset === 'today') {
      onDateChange(todayStr, todayStr);
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      onDateChange(d7.toISOString().substring(0, 10), todayStr);
    } else if (preset === 'this_month') {
      const firstDay = todayStr.substring(0, 7) + '-01';
      onDateChange(firstDay, todayStr);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-3.5" id="report-filter-bar">
      {/* Top Filter Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIS, kelas, staf, mapel..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-[#1F5C45] focus:ring-2 focus:ring-[#1F5C45]/20 transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Presets and Pickers */}
        {onDateChange && dateFrom && dateTo && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Presets */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => handleDatePreset('today')}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-all"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('7days')}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-all"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('this_month')}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-all"
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Range Inputs */}
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-2xl">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateChange(e.target.value, dateTo)}
                className="text-xs bg-transparent text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
              />
              <span className="text-zinc-400 text-xs">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateChange(dateFrom, e.target.value)}
                className="text-xs bg-transparent text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Mobile Filter Button */}
        {onOpenMobileDrawer && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700 transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Semua Filter</span>
            {activeChips.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#1F5C45] text-white text-[10px] font-black flex items-center justify-center">
                {activeChips.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Desktop Inline Selectors */}
      {children && (
        <div className="hidden lg:flex items-center gap-2.5 flex-wrap border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
          {children}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
          <span className="text-[11px] font-bold text-zinc-400">Filter Aktif:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium"
            >
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{chip.label}:</span>
              <span>{chip.valueDisplay}</span>
              {onRemoveChip && (
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.key)}
                  className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 ml-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};
