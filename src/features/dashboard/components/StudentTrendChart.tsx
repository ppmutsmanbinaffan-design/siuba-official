import React, { useState } from 'react';
import { MetricChartWrapper } from './MetricChartWrapper';
import { StudentTrendPoint } from '../types';

interface Props {
  trends: StudentTrendPoint[];
  onSelectDate?: (date: string) => void;
}

export const StudentTrendChart: React.FC<Props> = ({ trends, onSelectDate }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!trends || trends.length === 0) {
    return (
      <MetricChartWrapper
        title="Trend Kehadiran Santri"
        subtitle="Riwayat kehadiran 7 hari terakhir"
        badgeText="Santri"
        badgeColor="emerald"
        id="chart-student-trend"
      >
        <div className="text-center py-12 text-zinc-400 text-xs">
          Belum ada data riwayat presensi santri.
        </div>
      </MetricChartWrapper>
    );
  }

  // Determine max value for vertical scaling
  const maxVal = Math.max(...trends.map((t) => Math.max(t.present + t.late + t.absent, 10)), 10);
  const chartHeight = 160;

  return (
    <MetricChartWrapper
      title="Trend Kehadiran Santri"
      subtitle="Perbandingan kehadiran tepat waktu, terlambat, dan alpha 7 hari terakhir"
      badgeText="Santri"
      badgeColor="emerald"
      id="chart-student-trend"
      rightAction={
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F5C45] inline-block" />
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
        {/* Bars Container */}
        <div className="w-full h-44 flex items-end justify-between gap-2 px-2 border-b border-zinc-100 pb-2">
          {trends.map((point, idx) => {
            const total = point.present + point.late + point.absent;
            const presentHeight = total > 0 ? (point.present / maxVal) * chartHeight : 0;
            const lateHeight = total > 0 ? (point.late / maxVal) * chartHeight : 0;
            const absentHeight = total > 0 ? (point.absent / maxVal) * chartHeight : 0;
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
                    <div className="text-emerald-400 font-semibold">Hadir: {point.present}</div>
                    <div className="text-amber-400">Terlambat: {point.late}</div>
                    <div className="text-rose-400">Alpha: {point.absent}</div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">Rate: {point.rate}%</div>
                  </div>
                )}

                {/* Rate Tag */}
                <span className="text-[10px] font-black text-[#1F5C45] mb-1 opacity-80 group-hover:opacity-100">
                  {point.rate}%
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
                      className="w-full bg-[#1F5C45] hover:bg-[#2F7D5A]"
                    />
                  )}
                  {total === 0 && (
                    <div className="w-full h-1 bg-zinc-200 rounded-full" />
                  )}
                </div>

                {/* Label Date */}
                <div className="text-[10px] font-medium text-zinc-500 mt-2 truncate w-full text-center group-hover:text-zinc-900">
                  {point.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MetricChartWrapper>
  );
};
