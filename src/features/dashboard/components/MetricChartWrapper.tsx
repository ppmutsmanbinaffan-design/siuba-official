import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'teal' | 'purple' | 'gold';
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  id?: string;
}

export const MetricChartWrapper: React.FC<Props> = ({
  title,
  subtitle,
  badgeText,
  badgeColor = 'emerald',
  children,
  rightAction,
  id,
}) => {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'gold':
        return 'bg-amber-50 text-[#C9A227] border-amber-200';
      case 'blue':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'teal':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'purple':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-emerald-50 text-[#1F5C45] border-emerald-200';
    }
  };

  return (
    <div
      id={id}
      className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">
              {title}
            </h3>
            {badgeText && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle()}`}>
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>

      {/* Chart Canvas / Body */}
      <div className="w-full relative min-h-[220px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};
