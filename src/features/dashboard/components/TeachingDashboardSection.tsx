import React from 'react';
import { 
  BookOpen, 
  ChevronRight
} from 'lucide-react';
import { StaffIntegratedDashboardData } from '../../../types';

interface Props {
  data: StaffIntegratedDashboardData['teaching'];
  dateStr: string;
  onDrilldown: (tab: string, params?: any) => void;
}

export const TeachingDashboardSection: React.FC<Props> = ({ data, dateStr, onDrilldown }) => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-5" id="dashboard-section-teaching">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                Realisasi Mengajar Hari Ini
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                KBM Guru
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Pelaksanaan jam pelajaran kelas, kehadiran guru terjadwal, dan guru pengganti (Inval).
            </p>
          </div>
        </div>

        {/* Teaching Attendance Rate */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-amber-50/70 border border-amber-200 rounded-xl px-4 py-2">
          <div>
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Tingkat Mengajar Guru
            </div>
            <div className="text-[11px] text-amber-700">
              Sesi Terlaksana ÷ Sesi Eligible
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800">
            {data.teaching_attendance_rate !== null ? `${data.teaching_attendance_rate}%` : '-'}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* 1. Sesi Terjadwal */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr })}
          className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-scheduled"
        >
          <div className="text-[11px] font-medium text-zinc-500 truncate">Terjadwal</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            {data.scheduled_sessions}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 group-hover:text-zinc-600 flex items-center">
            Total Sesi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 2. Hadir Mengajar */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr, status: 'present' })}
          className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200 hover:border-[#1F5C45] transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-present"
        >
          <div className="text-[11px] font-medium text-[#1F5C45] truncate">Hadir Mengajar</div>
          <div className="text-xl sm:text-2xl font-black text-[#1F5C45] mt-1">
            {data.attended_sessions}
          </div>
          <div className="text-[10px] text-[#2F7D5A] mt-0.5 group-hover:underline flex items-center">
            {data.on_time_sessions} Tepat Waktu <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 3. Terlambat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr, status: 'late' })}
          className="bg-amber-50/50 rounded-xl p-3 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-late"
        >
          <div className="text-[11px] font-medium text-amber-700 truncate">Terlambat Masuk</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {data.late_sessions}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5 group-hover:underline flex items-center">
            Lihat Sesi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 4. Guru Pengganti */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr, substitution_filter: 'only' })}
          className="bg-purple-50/50 rounded-xl p-3 border border-purple-200 hover:border-purple-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-substituted"
        >
          <div className="text-[11px] font-medium text-purple-700 truncate">Guru Pengganti</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {data.substituted_sessions}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5 group-hover:underline flex items-center">
            Inval Sesi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 5. Dibatalkan */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr, session_status: 'cancelled' })}
          className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 hover:border-rose-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-cancelled"
        >
          <div className="text-[11px] font-medium text-rose-700 truncate">Dibatalkan</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {data.cancelled_sessions}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5 group-hover:underline flex items-center">
            Libur/Batal <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 6. Belum Tercatat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr, status: 'unrecorded' })}
          className="bg-zinc-100 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-unrecorded"
        >
          <div className="text-[11px] font-medium text-zinc-600 truncate">Belum Tercatat</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-800 mt-1">
            {data.unrecorded_sessions}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 group-hover:underline flex items-center">
            Sesi KBM <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 7. Perlu Ditinjau */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'teaching', date_from: dateStr, date_to: dateStr, review_status: 'needs_review' })}
          className="bg-red-50/70 rounded-xl p-3 border border-red-200 hover:border-red-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-teaching-needs-review"
        >
          <div className="text-[11px] font-medium text-red-700 truncate">Perlu Ditinjau</div>
          <div className="text-xl sm:text-2xl font-black text-red-700 mt-1">
            {data.needs_review_sessions}
          </div>
          <div className="text-[10px] text-red-600 mt-0.5 group-hover:underline flex items-center">
            Verifikasi Selesai <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
