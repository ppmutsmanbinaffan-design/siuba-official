import React from 'react';
import { Users, CheckCircle2, Clock, CalendarDays, AlertTriangle, LogOut, FileText, Sparkles } from 'lucide-react';
import { StaffDailySummary } from '../types';

interface StaffDailySummaryKpiProps {
  summary: StaffDailySummary;
  onFilterClick?: (status: string) => void;
}

export const StaffDailySummaryKpi: React.FC<StaffDailySummaryKpiProps> = ({ summary, onFilterClick }) => {
  const cards = [
    {
      id: 'expected',
      label: 'Total Expected SDM',
      value: summary.total_expected,
      subtext: 'Staf aktif terdaftar',
      icon: Users,
      color: 'text-zinc-300',
      bg: 'bg-zinc-900/80 border-zinc-800',
      filter: 'all',
    },
    {
      id: 'present',
      label: 'Hadir Tepat Waktu',
      value: summary.total_present,
      subtext: 'Check-in sebelum batas',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      filter: 'present',
    },
    {
      id: 'late',
      label: 'Terlambat',
      value: summary.total_late,
      subtext: 'Melebihi toleransi jadwal',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      filter: 'late',
    },
    {
      id: 'absence',
      label: 'Izin / Sakit / Cuti / Dinas',
      value: summary.total_permission + summary.total_sick + summary.total_leave + summary.total_official_duty,
      subtext: `${summary.total_permission} Izin • ${summary.total_sick} Sakit • ${summary.total_leave + summary.total_official_duty} Cuti/Dinas`,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      filter: 'absence',
    },
    {
      id: 'not_checked_in',
      label: 'Belum Check-in',
      value: summary.total_not_checked_in,
      subtext: 'Belum ada catatan masuk',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      filter: 'not_checked_in',
    },
    {
      id: 'checked_out',
      label: 'Sudah Check-out',
      value: `${summary.total_checked_out} / ${summary.total_checked_in}`,
      subtext: `${summary.total_early_leave} Pulang cepat`,
      icon: LogOut,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/30',
      filter: 'checked_out',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onFilterClick && onFilterClick(c.filter)}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer hover:border-zinc-700 active:scale-[0.98] ${c.bg}`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-semibold text-zinc-400 truncate">{c.label}</span>
              <Icon className={`w-4 h-4 shrink-0 ${c.color}`} />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">{c.value}</div>
            <div className="text-[11px] text-zinc-500 mt-1 truncate">{c.subtext}</div>
          </div>
        );
      })}
    </div>
  );
};
