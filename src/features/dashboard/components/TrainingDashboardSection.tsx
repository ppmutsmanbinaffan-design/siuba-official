import React from 'react';
import { 
  Award, 
  ChevronRight
} from 'lucide-react';
import { StaffIntegratedDashboardData } from '../../../types';

interface Props {
  data: StaffIntegratedDashboardData['training'];
  dateStr: string;
  onDrilldown: (tab: string, params?: any) => void;
}

export const TrainingDashboardSection: React.FC<Props> = ({ data, dateStr, onDrilldown }) => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-5" id="dashboard-section-training">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                Realisasi Ekstrakurikuler Hari Ini
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                Ekskul Pelatih
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Pelaksanaan latihan bela diri, olahraga, seni, kepanduan, dan jurnal materi pelatih.
            </p>
          </div>
        </div>

        {/* Training Attendance & Realization Rates */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-2">
            <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              Kehadiran Pelatih
            </div>
            <div className="text-2xl font-black text-teal-700">
              {data.training_attendance_rate !== null ? `${data.training_attendance_rate}%` : '-'}
            </div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2">
            <div className="text-[11px] font-bold text-[#1F5C45] uppercase tracking-wider">
              Realisasi Jurnal
            </div>
            <div className="text-2xl font-black text-[#1F5C45]">
              {data.realization_rate !== null ? `${data.realization_rate}%` : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* 1. Sesi Terjadwal */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr })}
          className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-scheduled"
        >
          <div className="text-[11px] font-medium text-zinc-500 truncate">Terjadwal</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            {data.total_sessions}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 group-hover:text-zinc-600 flex items-center">
            Total Sesi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 2. Pelatih Hadir */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, status: 'present' })}
          className="bg-teal-50/50 rounded-xl p-3 border border-teal-200 hover:border-teal-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-trainer-attended"
        >
          <div className="text-[11px] font-medium text-teal-700 truncate">Pelatih Hadir</div>
          <div className="text-xl sm:text-2xl font-black text-teal-700 mt-1">
            {data.trainer_attended}
          </div>
          <div className="text-[10px] text-teal-600 mt-0.5 group-hover:underline flex items-center">
            {data.trainer_on_time} Tepat Waktu <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 3. Pelatih Terlambat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, status: 'late' })}
          className="bg-amber-50/50 rounded-xl p-3 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-trainer-late"
        >
          <div className="text-[11px] font-medium text-amber-700 truncate">Pelatih Terlambat</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {data.trainer_late}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5 group-hover:underline flex items-center">
            Lihat Sesi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 4. Pelatih Pengganti */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, substitution_filter: 'only' })}
          className="bg-purple-50/50 rounded-xl p-3 border border-purple-200 hover:border-purple-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-substituted"
        >
          <div className="text-[11px] font-medium text-purple-700 truncate">Pelatih Pengganti</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {data.trainer_substituted}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5 group-hover:underline flex items-center">
            Substitusi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 5. Terlaksana (Jurnal Realized) */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, realization_filter: 'realized' })}
          className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200 hover:border-[#1F5C45] transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-realized"
        >
          <div className="text-[11px] font-medium text-[#1F5C45] truncate">Terlaksana</div>
          <div className="text-xl sm:text-2xl font-black text-[#1F5C45] mt-1">
            {data.realized_sessions}
          </div>
          <div className="text-[10px] text-[#2F7D5A] mt-0.5 group-hover:underline flex items-center">
            Jurnal Terisi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 6. Dibatalkan */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, session_status: 'cancelled' })}
          className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 hover:border-rose-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-cancelled"
        >
          <div className="text-[11px] font-medium text-rose-700 truncate">Dibatalkan</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {data.cancelled_sessions}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5 group-hover:underline flex items-center">
            Dibatalkan <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 7. Belum Tercatat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, status: 'unrecorded' })}
          className="bg-zinc-100 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-unrecorded"
        >
          <div className="text-[11px] font-medium text-zinc-600 truncate">Belum Tercatat</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-800 mt-1">
            {data.unrecorded_sessions}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 group-hover:underline flex items-center">
            Sesi Ekskul <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 8. Perlu Ditinjau */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'training', date_from: dateStr, date_to: dateStr, review_status: 'needs_review' })}
          className="bg-red-50/70 rounded-xl p-3 border border-red-200 hover:border-red-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-training-needs-review"
        >
          <div className="text-[11px] font-medium text-red-700 truncate">Perlu Ditinjau</div>
          <div className="text-xl sm:text-2xl font-black text-red-700 mt-1">
            {data.needs_review_count}
          </div>
          <div className="text-[10px] text-red-600 mt-0.5 group-hover:underline flex items-center">
            Jurnal/Presensi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
