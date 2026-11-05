import React from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface StaffNeedsReviewCardProps {
  type: 'teaching' | 'training';
  title: string;
  subtitle: string;
  reason: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const StaffNeedsReviewCard: React.FC<StaffNeedsReviewCardProps> = ({
  type,
  title,
  subtitle,
  reason,
  actionLabel = 'Tinjau Sekarang',
  onAction,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-200">{title}</h4>
            <p className="text-xs text-amber-400/80 font-mono">{subtitle}</p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          Perlu Ditinjau
        </span>
      </div>

      <p className="text-xs text-amber-200/90 leading-relaxed pl-1">
        {reason}
      </p>

      {onAction && (
        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
            className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 min-h-[36px]"
          >
            {actionLabel}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};
