import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  UserX, 
  Radio, 
  BookOpen, 
  Award, 
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { DashboardAttentionItem } from '../types';

interface Props {
  items: DashboardAttentionItem[];
  onAction: (tab: string, params?: any) => void;
}

export const AttentionItemsSection: React.FC<Props> = ({ items, onAction }) => {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs flex items-center justify-between gap-4" id="attention-items-empty">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1F5C45]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Semua Operasional Berjalan Normal
            </h3>
            <p className="text-xs text-zinc-500">
              Tidak ada anomali atau sesi santri & SDM yang memerlukan tindakan segera saat ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (cat: DashboardAttentionItem['category']) => {
    switch (cat) {
      case 'santri':
        return <Clock className="w-4 h-4 text-[#1F5C45]" />;
      case 'sdm_daily':
        return <UserX className="w-4 h-4 text-[#2F7D5A]" />;
      case 'teaching':
        return <BookOpen className="w-4 h-4 text-amber-600" />;
      case 'training':
        return <Award className="w-4 h-4 text-teal-600" />;
      case 'device':
        return <Radio className="w-4 h-4 text-rose-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getSeverityBadge = (severity: DashboardAttentionItem['severity']) => {
    switch (severity) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
            MENDESAK
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            PERHATIAN
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-4" id="dashboard-section-attention">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              Perlu Perhatian
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                {items.length}
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              Anomali operasional absensi santri, staf harian, KBM, dan ekskul hari ini.
            </p>
          </div>
        </div>
      </div>

      {/* Attention Item List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onAction(item.targetTab, item.targetParams)}
            className="flex items-start justify-between gap-3.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200 hover:border-[#1F5C45]/60 hover:bg-white transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                {getCategoryIcon(item.category)}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-zinc-900 group-hover:text-[#1F5C45] transition-colors">
                    {item.title}
                  </h4>
                  {getSeverityBadge(item.severity)}
                </div>
                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 group-hover:bg-[#1F5C45] group-hover:text-white group-hover:border-[#1F5C45] transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
