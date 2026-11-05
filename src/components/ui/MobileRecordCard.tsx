import React from 'react';

export interface MobileRecordCardProps {
  avatar?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  attributes?: { label: string; value: React.ReactNode }[];
  tags?: React.ReactNode[];
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileRecordCard: React.FC<MobileRecordCardProps> = ({
  avatar,
  title,
  subtitle,
  badge,
  attributes = [],
  tags = [],
  actions,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-3.5 transition-all ${
        onClick ? 'cursor-pointer hover:border-zinc-300 hover:shadow-sm active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Header Row: Avatar, Title & Subtitle, Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {avatar && <div className="shrink-0">{avatar}</div>}
          <div className="min-w-0">
            <div className="font-bold text-sm text-zinc-900 truncate">{title}</div>
            {subtitle && (
              <div className="text-xs text-zinc-500 font-medium truncate mt-0.5">{subtitle}</div>
            )}
          </div>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Attributes Grid (2-column key/value tiles) */}
      {attributes.length > 0 && (
        <div className={`grid gap-2 text-xs ${attributes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {attributes.map((attr, idx) => (
            <div key={idx} className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-150 min-w-0">
              <span className="text-[10px] text-zinc-500 block uppercase font-semibold tracking-wider">{attr.label}</span>
              <span className="font-semibold text-zinc-800 truncate block mt-0.5">
                {attr.value || '-'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tags / Identity tokens */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {tags.map((tag, idx) => (
            <React.Fragment key={idx}>{tag}</React.Fragment>
          ))}
        </div>
      )}

      {/* Actions row (Minimum 44px touch targets) */}
      {actions && (
        <div className="pt-2.5 border-t border-zinc-100 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

