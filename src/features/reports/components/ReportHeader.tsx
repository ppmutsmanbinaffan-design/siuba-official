import React from 'react';
import { ChevronLeft, Download, Printer, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { ReportExportDropdown } from './ReportExportDropdown';

interface SubTabOption {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  categoryName: string;
  title: string;
  description: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'teal' | 'purple' | 'rose';
  subTabs?: SubTabOption[];
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
  onBackToHub?: () => void;
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
  onPrint?: () => void;
  isExporting?: boolean;
}

export const ReportHeader: React.FC<Props> = ({
  categoryName,
  title,
  description,
  badgeColor = 'emerald',
  subTabs = [],
  activeSubTab,
  onSubTabChange,
  onBackToHub,
  onExportCsv,
  onExportXlsx,
  onPrint,
  isExporting = false,
}) => {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'teal':
        return 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'rose':
        return 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4" id="report-header">
      {/* Top row: Breadcrumb + Title + Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors pr-2 border-r border-zinc-200 dark:border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Pusat Laporan
              </button>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle()}`}>
              {categoryName}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

        {/* Export & Print actions */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              title="Cetak Laporan Resmi"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
          )}

          {(onExportCsv || onExportXlsx) && (
            <ReportExportDropdown
              onExportCsv={onExportCsv}
              onExportXlsx={onExportXlsx}
              isExporting={isExporting}
            />
          )}
        </div>
      </div>

      {/* Sub-Tabs (if any) */}
      {subTabs.length > 0 && (
        <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 overflow-x-auto no-scrollbar">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSubTabChange && onSubTabChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeSubTab === tab.id
                      ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
