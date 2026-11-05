import React from 'react';
import { CheckCircle2, Clock, FileText, AlertCircle, Users, Activity, Sparkles, XCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

interface SessionSummaryKpiProps {
  totalEligible: number;
  recordedCount: number;
  unrecordedCount: number;
  presentCount: number;
  lateCount: number;
  permissionCount: number;
  sickCount: number;
  dispensationCount: number;
  absentCount: number;
  completionRate?: number;
  title?: string;
  className?: string;
}

export const SessionSummaryKpi: React.FC<SessionSummaryKpiProps> = ({
  totalEligible,
  recordedCount,
  unrecordedCount,
  presentCount,
  lateCount,
  permissionCount,
  sickCount,
  dispensationCount,
  absentCount,
  completionRate,
  title,
  className = '',
}) => {
  const calculatedRate = completionRate !== undefined
    ? completionRate
    : totalEligible > 0
    ? Math.round((recordedCount / totalEligible) * 100)
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-700" />
            {title}
          </h3>
          <span className="text-xs font-bold text-slate-600">
            Progres: <strong className="text-emerald-700 font-black">{calculatedRate}%</strong>
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 flex shadow-inner">
        {totalEligible > 0 && (
          <>
            <div
              style={{ width: `${(presentCount / totalEligible) * 100}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Hadir: ${presentCount}`}
            />
            <div
              style={{ width: `${(lateCount / totalEligible) * 100}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Terlambat: ${lateCount}`}
            />
            <div
              style={{ width: `${((permissionCount + sickCount + dispensationCount) / totalEligible) * 100}%` }}
              className="bg-sky-500 transition-all duration-500"
              title={`Izin/Sakit/Disp: ${permissionCount + sickCount + dispensationCount}`}
            />
            <div
              style={{ width: `${(absentCount / totalEligible) * 100}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Alpha: ${absentCount}`}
            />
          </>
        )}
      </div>

      {/* Metric Cards Grid: 2 on Mobile, 3 on Tablet, 6 on Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Peserta / Snapshot */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold">Peserta Sesi</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{totalEligible}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Snapshot</span>
          </div>
        </div>

        {/* Hadir */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">Hadir Tepat</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">{presentCount}</span>
            <span className="text-[10px] text-emerald-700 font-bold">
              {totalEligible > 0 ? Math.round((presentCount / totalEligible) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Terlambat */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-700">{lateCount}</span>
            <span className="text-[10px] text-amber-700 font-bold">
              {totalEligible > 0 ? Math.round((lateCount / totalEligible) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Izin / Sakit / Dispensasi */}
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-xs font-bold">Izin / Sakit</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-sky-700">
              {permissionCount + sickCount + dispensationCount}
            </span>
            <span className="text-[10px] text-sky-700 font-bold">
              {permissionCount}I / {sickCount}S
            </span>
          </div>
        </div>

        {/* Alpha / Belum Tercatat */}
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold">Alpha (Absen)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-rose-700">{absentCount}</span>
            <span className="text-[10px] text-rose-700 font-bold">
              {totalEligible > 0 ? Math.round((absentCount / totalEligible) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Belum Absen */}
        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-bold">Belum Absen</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-purple-700">{unrecordedCount}</span>
            <span className="text-[10px] text-purple-700 font-bold">
              {totalEligible > 0 ? Math.round((unrecordedCount / totalEligible) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
