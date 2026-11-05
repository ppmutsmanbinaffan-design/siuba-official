import React from 'react';
import { 
  Users, 
  ChevronRight
} from 'lucide-react';
import { MetricSummary } from '../../../services/attendanceMetricService';

interface Props {
  metrics: MetricSummary;
  dateStr: string;
  onDrilldown: (tab: string, params?: any) => void;
}

export const StudentDashboardSection: React.FC<Props> = ({ metrics, dateStr, onDrilldown }) => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-5" id="dashboard-section-student">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1F5C45]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                Kehadiran Santri
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-[#1F5C45] border border-emerald-200">
                Santri
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Total sasaran presensi santri terjadwal dari sesi aktif dan terselesaikan.
            </p>
          </div>
        </div>

        {/* Attendance Rate Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2">
          <div>
            <div className="text-[11px] font-bold text-[#1F5C45] uppercase tracking-wider">
              Tingkat Kehadiran
            </div>
            <div className="text-[11px] text-[#2F7D5A]">
              (Hadir + Terlambat) ÷ Eligible
            </div>
          </div>
          <div className="text-2xl font-black text-[#1F5C45]">
            {metrics.totalEligible > 0 ? `${metrics.attendanceRate}%` : '-'}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* 1. Eligible */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr })}
          className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-eligible"
        >
          <div className="text-[11px] font-medium text-zinc-500 truncate">Eligible</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            {metrics.totalEligible}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 group-hover:text-zinc-600 flex items-center">
            Total Target <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 2. Hadir */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'present' })}
          className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200 hover:border-[#1F5C45] transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-present"
        >
          <div className="text-[11px] font-medium text-[#1F5C45] truncate">Hadir</div>
          <div className="text-xl sm:text-2xl font-black text-[#1F5C45] mt-1">
            {metrics.present}
          </div>
          <div className="text-[10px] text-[#2F7D5A] mt-0.5 group-hover:underline flex items-center">
            Tepat Waktu <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 3. Terlambat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'late' })}
          className="bg-amber-50/50 rounded-xl p-3 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-late"
        >
          <div className="text-[11px] font-medium text-amber-700 truncate">Terlambat</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {metrics.late}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5 group-hover:underline flex items-center">
            Lihat Data <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 4. Izin */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'permission' })}
          className="bg-blue-50/50 rounded-xl p-3 border border-blue-200 hover:border-blue-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-permission"
        >
          <div className="text-[11px] font-medium text-blue-700 truncate">Izin</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {metrics.permission}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5 group-hover:underline flex items-center">
            Perizinan <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 5. Sakit */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'sick' })}
          className="bg-purple-50/50 rounded-xl p-3 border border-purple-200 hover:border-purple-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-sick"
        >
          <div className="text-[11px] font-medium text-purple-700 truncate">Sakit</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {metrics.sick}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5 group-hover:underline flex items-center">
            Sakit/Klinik <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 6. Dispensasi */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'dispensation' })}
          className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-200 hover:border-indigo-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-dispensation"
        >
          <div className="text-[11px] font-medium text-indigo-700 truncate">Dispensasi</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
            {metrics.dispensation}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5 group-hover:underline flex items-center">
            Tugas Khusus <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 7. Alpha */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'absent' })}
          className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 hover:border-rose-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-absent"
        >
          <div className="text-[11px] font-medium text-rose-700 truncate">Alpha</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {metrics.absent}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5 group-hover:underline flex items-center">
            Tanpa Ket. <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 8. Belum Tercatat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'student', date_from: dateStr, date_to: dateStr, status: 'unrecorded' })}
          className="bg-zinc-100 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-student-unrecorded"
        >
          <div className="text-[11px] font-medium text-zinc-600 truncate">Belum Tercatat</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-800 mt-1">
            {metrics.unrecorded}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 group-hover:underline flex items-center">
            Sesi Terbuka <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
