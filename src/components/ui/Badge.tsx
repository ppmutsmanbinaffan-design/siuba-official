import React from 'react';
import { CheckCircle2, Clock, FileText, AlertCircle, XCircle, Briefcase, HelpCircle, AlertTriangle } from 'lucide-react';

export type AttendanceSemanticStatus = 
  | 'hadir' | 'present' | 'active' | 'sukses' | 'approved'
  | 'terlambat' | 'late' | 'pending' | 'needs review' | 'needs_review'
  | 'izin' | 'excused' | 'dinas' | 'duty'
  | 'sakit' | 'sick' | 'cuti' | 'leave' | 'inactive' | 'nonaktif'
  | 'alpa' | 'absent' | 'alpha' | 'rejected' | 'transferred' | 'keluar';

export type GeneralSemanticVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: GeneralSemanticVariant;
  status?: AttendanceSemanticStatus | string;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  size = 'md',
  icon,
  className = '',
}) => {
  let resolvedLabel = children;
  let resolvedIcon = icon;
  let styleClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';

  if (status) {
    const s = String(status).toLowerCase().trim();
    if (s === 'hadir' || s === 'present' || s === 'active' || s === 'aktif' || s === 'sukses' || s === 'approved') {
      styleClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (!resolvedIcon) resolvedIcon = <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = s === 'active' || s === 'aktif' ? 'Aktif' : s === 'approved' ? 'Approved' : 'Hadir';
    } else if (s === 'terlambat' || s === 'late' || s === 'pending' || s === 'needs review' || s === 'needs_review') {
      styleClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      if (!resolvedIcon) resolvedIcon = s === 'pending' || s.includes('review') ? <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" /> : <Clock className="w-3 h-3 text-amber-600 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = s === 'pending' ? 'Pending' : s.includes('review') ? 'Needs Review' : 'Terlambat';
    } else if (s === 'izin' || s === 'excused' || s === 'dinas' || s === 'duty') {
      styleClasses = 'bg-sky-50 text-sky-700 border-sky-200';
      if (!resolvedIcon) resolvedIcon = s === 'dinas' || s === 'duty' ? <Briefcase className="w-3 h-3 text-sky-600 shrink-0" /> : <FileText className="w-3 h-3 text-sky-600 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = s === 'dinas' || s === 'duty' ? 'Dinas' : 'Izin';
    } else if (s === 'sakit' || s === 'sick') {
      styleClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      if (!resolvedIcon) resolvedIcon = <AlertCircle className="w-3 h-3 text-slate-600 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = 'Sakit';
    } else if (s === 'cuti' || s === 'leave' || s === 'inactive' || s === 'nonaktif') {
      styleClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';
      if (!resolvedIcon) resolvedIcon = <Briefcase className="w-3 h-3 text-zinc-500 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = s === 'inactive' || s === 'nonaktif' ? 'Nonaktif' : 'Cuti';
    } else if (s === 'alpa' || s === 'absent' || s === 'alpha' || s === 'rejected' || s === 'transferred' || s === 'keluar') {
      styleClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      if (!resolvedIcon) resolvedIcon = <XCircle className="w-3 h-3 text-rose-600 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = s === 'rejected' ? 'Rejected' : s === 'transferred' ? 'Pindah' : s === 'keluar' ? 'Keluar' : 'Alpha';
    } else {
      styleClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';
      if (!resolvedIcon) resolvedIcon = <HelpCircle className="w-3 h-3 text-zinc-500 shrink-0" />;
      if (!resolvedLabel) resolvedLabel = status;
    }
  } else if (variant) {
    switch (variant) {
      case 'success':
        styleClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'warning':
        styleClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'danger':
        styleClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'info':
        styleClasses = 'bg-sky-50 text-sky-700 border-sky-200';
        break;
      case 'gold':
        styleClasses = 'bg-[#FDF7E7] text-[#927318] border-[#EADAA2]';
        break;
      default:
        styleClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide whitespace-nowrap select-none ${sizeClass} ${styleClasses} ${className}`}
    >
      {resolvedIcon && <span className="shrink-0">{resolvedIcon}</span>}
      <span>{resolvedLabel}</span>
    </span>
  );
};

