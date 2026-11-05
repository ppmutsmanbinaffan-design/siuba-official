import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Check } from 'lucide-react';

interface Props {
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
  isExporting?: boolean;
}

export const ReportExportDropdown: React.FC<Props> = ({
  onExportCsv,
  onExportXlsx,
  isExporting = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef} id="report-export-dropdown">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#1F5C45] hover:bg-[#12372A] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
      >
        <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
        <span>{isExporting ? 'Mengekspor...' : 'Export Data'}</span>
        <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Format Unduhan
          </div>

          {onExportXlsx && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportXlsx();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-bold">Excel (.xlsx / html)</div>
                <div className="text-[10px] text-zinc-400">Format spreadsheet rapi</div>
              </div>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportCsv();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-bold">CSV Raw Data</div>
                <div className="text-[10px] text-zinc-400">Kompatibel sistem data</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
