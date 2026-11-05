import React, { useState } from 'react';
import { MetricChartWrapper } from './MetricChartWrapper';
import { StaffIntegratedDashboardData } from '../../../types';

interface Props {
  trends: StaffIntegratedDashboardData['trends']['daily'];
  onSelectDate?: (date: string) => void;
}

export const StaffTrendChart: React.FC<Props> = ({ trends, onSelectDate }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!trends || trends.length === 0) {
    return (
      <MetricChartWrapper
        title="Trend Kehadiran SDM"
        subtitle="Riwayat presensi harian staf 7 hari terakhir"
        badgeText="SDM Harian"
        badgeColor="teal"
        id="chart-staff-trend"
      >
        <div className="text-center py-12 text-zinc-400 text-xs">
          Belum ada data presensi harian SDM.
        </div>
      </MetricChartWrapper>
    );
  }

  const maxVal = Math.max(...trends.map((t) => Math.max(t.expected, 10)), 10);
  const chartHeight = 160;

  return (
    <MetricChartWrapper
      title="Trend Kehadiran SDM"
      subtitle="Perbandingan kehadiran staf, keterlambatan, dan ketidakhadiran harian"
      badgeText="SDM Harian"
      badgeColor="teal"
      id="chart-staff-trend"
      rightAction={
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F7D5A] inline-block" />
            <span>Hadir</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Terlambat</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Alpha</span>
          </div>
        </div>
      }
    >
      <div className="w-full flex flex-col justify-end space-y-3 pt-2">
        <div className="w-full h-44 flex items-end justify-between gap-2 px-2 border-b border-zinc-100 pb-2">
          {trends.map((point, idx) => {
            const attendedCount = point.present;
            const lateCount = point.late;
            const absentCount = point.absent;

            const presentHeight = (attendedCount / maxVal) * chartHeight;
            const lateHeight = (lateCount / maxVal) * chartHeight;
            const absentHeight = (absentCount / maxVal) * chartHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={point.date}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectDate && onSelectDate(point.date)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
              >
                {/* Tooltip Hover Bubble */}
                {isHovered && (
                  <div className="absolute -top-16 z-20 bg-zinc-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none border border-zinc-800">
                    <div className="font-bold border-b border-zinc-700 pb-1 mb-1">{point.date}</div>
                    <div className="text-teal-400 font-semibold">Hadir: {point.present}</div>
                    <div className="text-amber-400">Terlambat: {point.late}</div>
                    <div className="text-rose-400">Alpha: {point.absent}</div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">Presence Rate: {point.presence_rate !== null ? `${point.presence_rate}%` : '-'}</div>
                  </div>
                )}

                {/* Rate Tag */}
                <span className="text-[10px] font-black text-[#2F7D5A] mb-1 opacity-80 group-hover:opacity-100">
                  {point.presence_rate !== null ? `${point.presence_rate}%` : '-'}
                </span>

                {/* Stacked Bar */}
                <div className="w-full max-w-[28px] flex flex-col rounded-t-lg overflow-hidden transition-all duration-200 group-hover:scale-105">
                  {absentHeight > 0 && (
                    <div
                      style={{ height: `${absentHeight}px` }}
                      className="w-full bg-rose-500 hover:bg-rose-400"
                    />
                  )}
                  {lateHeight > 0 && (
                    <div
                      style={{ height: `${lateHeight}px` }}
                      className="w-full bg-amber-500 hover:bg-amber-400"
                    />
                  )}
                  {presentHeight > 0 && (
                    <div
                      style={{ height: `${presentHeight}px` }}
                      className="w-full bg-[#2F7D5A] hover:bg-[#1F5C45]"
                    />
                  )}
                  {point.expected === 0 && (
                    <div className="w-full h-1 bg-zinc-200 rounded-full" />
                  )}
                </div>

                {/* Label Date */}
                <div className="text-[10px] font-medium text-zinc-500 mt-2 truncate w-full text-center group-hover:text-zinc-900">
                  {point.date.slice(5)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MetricChartWrapper>
  );
};
