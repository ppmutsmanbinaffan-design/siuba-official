import React, { useState } from 'react';
import { MetricChartWrapper } from './MetricChartWrapper';
import { StaffIntegratedDashboardData } from '../../../types';

interface Props {
  trends: StaffIntegratedDashboardData['trends']['training'];
  onSelectDate?: (date: string) => void;
}

export const TrainingTrendChart: React.FC<Props> = ({ trends, onSelectDate }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!trends || trends.length === 0) {
    return (
      <MetricChartWrapper
        title="Trend Realisasi Ekstrakurikuler"
        subtitle="Riwayat pelaksanaan sesi latihan ekskul 7 hari terakhir"
        badgeText="Ekskul Pelatih"
        badgeColor="teal"
        id="chart-training-trend"
      >
        <div className="text-center py-12 text-zinc-400 text-xs">
          Belum ada data riwayat ekstrakurikuler.
        </div>
      </MetricChartWrapper>
    );
  }

  const maxVal = Math.max(...trends.map((t) => Math.max(t.scheduled, 10)), 10);
  const chartHeight = 160;

  return (
    <MetricChartWrapper
      title="Trend Realisasi Ekstrakurikuler"
      subtitle="Perbandingan sesi terlaksana, kehadiran pelatih, dan pembatalan 7 hari terakhir"
      badgeText="Ekskul Pelatih"
      badgeColor="teal"
      id="chart-training-trend"
      rightAction={
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            <span>Pelatih Hadir</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F5C45] inline-block" />
            <span>Terlaksana</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Batal</span>
          </div>
        </div>
      }
    >
      <div className="w-full flex flex-col justify-end space-y-3 pt-2">
        <div className="w-full h-44 flex items-end justify-between gap-2 px-2 border-b border-zinc-100 pb-2">
          {trends.map((point, idx) => {
            const attendedCount = point.trainer_attended;
            const cancelledCount = point.cancelled;
            const isHovered = hoveredIndex === idx;

            const attendedHeight = (attendedCount / maxVal) * chartHeight;
            const cancelledHeight = (cancelledCount / maxVal) * chartHeight;

            return (
              <div
                key={point.date}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectDate && onSelectDate(point.date)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
              >
                {isHovered && (
                  <div className="absolute -top-16 z-20 bg-zinc-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none border border-zinc-800">
                    <div className="font-bold border-b border-zinc-700 pb-1 mb-1">{point.date}</div>
                    <div className="text-teal-400 font-semibold">Pelatih Hadir: {point.trainer_attended}</div>
                    <div className="text-emerald-400">Terlaksana: {point.realized}</div>
                    <div className="text-rose-400">Batal: {point.cancelled}</div>
                    <div className="text-teal-400 text-[10px] mt-0.5">Rate: {point.attendance_rate !== null ? `${point.attendance_rate}%` : '-'}</div>
                  </div>
                )}

                <span className="text-[10px] font-black text-teal-700 mb-1 opacity-80 group-hover:opacity-100">
                  {point.attendance_rate !== null ? `${point.attendance_rate}%` : '-'}
                </span>

                <div className="w-full max-w-[28px] flex flex-col rounded-t-lg overflow-hidden transition-all duration-200 group-hover:scale-105">
                  {cancelledHeight > 0 && (
                    <div
                      style={{ height: `${cancelledHeight}px` }}
                      className="w-full bg-rose-500 hover:bg-rose-400"
                    />
                  )}
                  {attendedHeight > 0 && (
                    <div
                      style={{ height: `${attendedHeight}px` }}
                      className="w-full bg-teal-600 hover:bg-teal-500"
                    />
                  )}
                  {point.scheduled === 0 && (
                    <div className="w-full h-1 bg-zinc-200 rounded-full" />
                  )}
                </div>

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
