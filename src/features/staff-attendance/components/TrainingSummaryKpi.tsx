import React from 'react';
import { Award, CheckCircle2, Clock, Users, FileCheck, AlertTriangle } from 'lucide-react';
import { TrainingAttendanceSummary } from '../types';

interface TrainingSummaryKpiProps {
  summary: TrainingAttendanceSummary;
  onFilterClick?: (status: string) => void;
}

export const TrainingSummaryKpi: React.FC<TrainingSummaryKpiProps> = ({ summary, onFilterClick }) => {
  const cards = [
    {
      id: 'sessions',
      label: 'Sesi Ekskul Hari Ini',
      value: summary.total_sessions,
      subtext: 'Jadwal latihan aktif',
      icon: Award,
      color: 'text-zinc-300',
      bg: 'bg-zinc-900/80 border-zinc-800',
      filter: 'all',
    },
    {
      id: 'present',
      label: 'Pelatih Hadir',
      value: summary.total_trainer_present,
      subtext: 'Tepat waktu di lokasi',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      filter: 'present',
    },
    {
      id: 'late',
      label: 'Pelatih Terlambat',
      value: summary.total_trainer_late,
      subtext: 'Masuk > toleransi',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      filter: 'late',
    },
    {
      id: 'substituted',
      label: 'Pelatih Pengganti',
      value: summary.total_trainer_substituted,
      subtext: 'Digantikan secara resmi',
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      filter: 'substituted',
    },
    {
      id: 'realized',
      label: 'Jurnal Terlaksana',
      value: summary.total_realized,
      subtext: 'Realisasi terverifikasi',
      icon: FileCheck,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      filter: 'realized',
    },
    {
      id: 'needs_review',
      label: 'Perlu Ditinjau',
      value: summary.total_needs_review,
      subtext: 'Absensi/Jurnal anomali',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      filter: 'needs_review',
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
