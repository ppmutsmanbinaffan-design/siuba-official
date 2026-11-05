import React from 'react';
import { 
  Briefcase, 
  ChevronRight
} from 'lucide-react';
import { StaffIntegratedDashboardData } from '../../../types';

interface Props {
  data: StaffIntegratedDashboardData['daily'];
  dateStr: string;
  onDrilldown: (tab: string, params?: any) => void;
}

export const StaffDailyDashboardSection: React.FC<Props> = ({ data, dateStr, onDrilldown }) => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs space-y-5" id="dashboard-section-staff-daily">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#2F7D5A]">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                Kehadiran SDM Harian
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-[#2F7D5A] border border-teal-200">
                SDM Harian
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Presensi gerbang/harian guru, musyrif, staf administrasi, dan manajemen pondok.
            </p>
          </div>
        </div>

        {/* Presence Rate */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-2">
          <div>
            <div className="text-[11px] font-bold text-[#2F7D5A] uppercase tracking-wider">
              Tingkat Kehadiran SDM
            </div>
            <div className="text-[11px] text-teal-700">
              (Hadir + Terlambat) ÷ Expected
            </div>
          </div>
          <div className="text-2xl font-black text-[#2F7D5A]">
            {data.presence_rate !== null ? `${data.presence_rate}%` : '-'}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 sm:gap-3">
        {/* 1. Expected */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr })}
          className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-expected"
        >
          <div className="text-[11px] font-medium text-zinc-500 truncate">Expected</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            {data.expected_today}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 group-hover:text-zinc-600 flex items-center">
            Jadwal Kerja <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 2. Hadir */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'present' })}
          className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200 hover:border-[#1F5C45] transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-present"
        >
          <div className="text-[11px] font-medium text-[#1F5C45] truncate">Hadir</div>
          <div className="text-xl sm:text-2xl font-black text-[#1F5C45] mt-1">
            {data.present}
          </div>
          <div className="text-[10px] text-[#2F7D5A] mt-0.5 group-hover:underline flex items-center">
            Tepat Waktu <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 3. Terlambat */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'late' })}
          className="bg-amber-50/50 rounded-xl p-3 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-late"
        >
          <div className="text-[11px] font-medium text-amber-700 truncate">Terlambat</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {data.late}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5 group-hover:underline flex items-center">
            {data.total_late_minutes}m total <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 4. Izin */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'permission' })}
          className="bg-blue-50/50 rounded-xl p-3 border border-blue-200 hover:border-blue-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-permission"
        >
          <div className="text-[11px] font-medium text-blue-700 truncate">Izin</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {data.permission}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5 group-hover:underline flex items-center">
            Izin Pribadi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 5. Sakit */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'sick' })}
          className="bg-purple-50/50 rounded-xl p-3 border border-purple-200 hover:border-purple-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-sick"
        >
          <div className="text-[11px] font-medium text-purple-700 truncate">Sakit</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {data.sick}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5 group-hover:underline flex items-center">
            Surat Sakit <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 6. Cuti */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'leave' })}
          className="bg-teal-50/50 rounded-xl p-3 border border-teal-200 hover:border-teal-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-leave"
        >
          <div className="text-[11px] font-medium text-teal-700 truncate">Cuti</div>
          <div className="text-xl sm:text-2xl font-black text-teal-700 mt-1">
            {data.leave}
          </div>
          <div className="text-[10px] text-teal-600 mt-0.5 group-hover:underline flex items-center">
            Cuti Resmi <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 7. Dinas */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'official_duty' })}
          className="bg-sky-50/50 rounded-xl p-3 border border-sky-200 hover:border-sky-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-duty"
        >
          <div className="text-[11px] font-medium text-sky-700 truncate">Dinas Luar</div>
          <div className="text-xl sm:text-2xl font-black text-sky-700 mt-1">
            {data.official_duty}
          </div>
          <div className="text-[10px] text-sky-600 mt-0.5 group-hover:underline flex items-center">
            Tugas Dinas <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 8. Alpha */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'absent' })}
          className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 hover:border-rose-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-absent"
        >
          <div className="text-[11px] font-medium text-rose-700 truncate">Alpha</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {data.absent}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5 group-hover:underline flex items-center">
            Tanpa Berita <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 9. Belum Check-in */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, attendance_status: 'not_checked_in' })}
          className="bg-zinc-100 rounded-xl p-3 border border-zinc-200 hover:border-zinc-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-not-in"
        >
          <div className="text-[11px] font-medium text-zinc-600 truncate">Belum Masuk</div>
          <div className="text-xl sm:text-2xl font-black text-zinc-800 mt-1">
            {data.not_checked_in}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 group-hover:underline flex items-center">
            Belum Scan <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>

        {/* 10. Belum Check-out */}
        <div 
          onClick={() => onDrilldown('report-center', { reportType: 'sdm_daily', date_from: dateStr, date_to: dateStr, check_out_filter: 'missing' })}
          className="bg-orange-50/50 rounded-xl p-3 border border-orange-200 hover:border-orange-400 transition-all cursor-pointer group shadow-2xs"
          id="kpi-staff-not-out"
        >
          <div className="text-[11px] font-medium text-orange-700 truncate">Belum Pulang</div>
          <div className="text-xl sm:text-2xl font-black text-orange-700 mt-1">
            {data.not_checked_out}
          </div>
          <div className="text-[10px] text-orange-600 mt-0.5 group-hover:underline flex items-center">
            Missing Out <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
