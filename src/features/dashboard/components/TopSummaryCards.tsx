import React from 'react';
import { Users, Briefcase, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { DashboardTopSummary } from '../types';

interface Props {
  data: DashboardTopSummary;
  onDrilldown: (tab: string, params?: any) => void;
}

export const TopSummaryCards: React.FC<Props> = ({ data, onDrilldown }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="top-summary-cards">
      {/* 1. Santri Aktif */}
      <div 
        onClick={() => onDrilldown('students')}
        className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs hover:border-[#1F5C45]/50 hover:shadow-xs transition-all cursor-pointer"
        id="stat-card-active-students"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1F5C45]">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1 group-hover:text-[#1F5C45] transition-colors">
            Data Master <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            {data.activeStudents}
          </div>
          <div className="text-xs font-medium text-zinc-500 mt-0.5">
            Santri Aktif Terdaftar
          </div>
        </div>
      </div>

      {/* 2. SDM Aktif */}
      <div 
        onClick={() => onDrilldown('staff-master')}
        className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs hover:border-[#1F5C45]/50 hover:shadow-xs transition-all cursor-pointer"
        id="stat-card-active-staff"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#2F7D5A]">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1 group-hover:text-[#2F7D5A] transition-colors">
            Data SDM <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            {data.activeStaff}
          </div>
          <div className="text-xs font-medium text-zinc-500 mt-0.5">
            SDM & Guru Aktif
          </div>
        </div>
      </div>

      {/* 3. Sesi Santri Hari Ini */}
      <div 
        onClick={() => onDrilldown('sessions')}
        className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs hover:border-[#1F5C45]/50 hover:shadow-xs transition-all cursor-pointer"
        id="stat-card-student-sessions"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1F5C45]">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1 group-hover:text-[#1F5C45] transition-colors">
            Sesi Hari Ini <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              {data.todayStudentSessions}
            </div>
            <div className="text-xs font-medium text-zinc-500 mt-0.5">
              Sesi Absensi Santri
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-[#1F5C45]">
              {data.studentAttendanceRate}% Hadir
            </span>
          </div>
        </div>
      </div>

      {/* 4. Kehadiran SDM Hari Ini */}
      <div 
        onClick={() => onDrilldown('staff-attendance')}
        className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs hover:border-[#C9A227]/50 hover:shadow-xs transition-all cursor-pointer"
        id="stat-card-staff-presence"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#C9A227]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1 group-hover:text-amber-700 transition-colors">
            Presensi SDM <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            {data.staffPresenceRate !== null ? `${data.staffPresenceRate}%` : '-'}
          </div>
          <div className="text-xs font-medium text-zinc-500 mt-0.5">
            Kehadiran SDM Hari Ini
          </div>
        </div>
      </div>
    </div>
  );
};
