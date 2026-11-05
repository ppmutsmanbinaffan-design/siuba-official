import React from 'react';
import { LoadingState, EmptyState } from './LoadingState';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  // Mobile Card Renderer - If provided, renders on mobile (<md) instead of squished table
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  className?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Tidak ada catatan yang ditemukan.',
  renderMobileCard,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalRecords,
  className = '',
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Desktop Table (Hidden on Mobile if renderMobileCard is present) */}
      <div className={`${renderMobileCard ? 'hidden md:block' : 'block'} bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden`}>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 sm:px-5 py-3 ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-normal text-zinc-800 dark:text-zinc-200">
              {data.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 sm:px-5 py-3.5 text-zinc-800 dark:text-zinc-200 ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(item, index) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile Card List (Visible only on Mobile if renderMobileCard is defined) */}
      {renderMobileCard && (
        <div className="block md:hidden space-y-3">
          {data.map((item, index) => (
            <React.Fragment key={keyExtractor(item)}>
              {renderMobileCard(item, index)}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 shadow-xs">
          <div>
            {totalRecords !== undefined ? (
              <span>Menampilkan halaman <strong className="text-zinc-900 dark:text-zinc-100">{currentPage}</strong> dari <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong> ({totalRecords} total data)</span>
            ) : (
              <span>Halaman <strong className="text-zinc-900 dark:text-zinc-100">{currentPage}</strong> dari <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {currentPage}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Halaman selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

