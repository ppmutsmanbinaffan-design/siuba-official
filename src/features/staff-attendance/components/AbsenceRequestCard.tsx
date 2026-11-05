import React from 'react';
import { Calendar, FileText, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { StaffAbsenceRequest } from '../../../types';
import { formatAbsenceType, formatAbsenceStatus, formatDateIndonesian } from '../utils/staffAttendanceUtils';
import { Button } from '../../../components/ui/Button';

interface AbsenceRequestCardProps {
  request: StaffAbsenceRequest;
  onApprove?: (request: StaffAbsenceRequest) => void;
  onReject?: (request: StaffAbsenceRequest) => void;
  canApprove?: boolean;
}

export const AbsenceRequestCard: React.FC<AbsenceRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  canApprove = false,
}) => {
  const typeInfo = formatAbsenceType(request.type);
  const statusInfo = formatAbsenceStatus(request.status);
  const isPending = request.status === 'pending';

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3">
      {/* Header: Staff Name + Type Badge + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-zinc-100 truncate">{request.staff_name}</h4>
          <span className="text-xs text-zinc-400 font-mono">{request.staff_number}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${typeInfo.badgeClass}`}>
            {typeInfo.label}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Date & Reason */}
      <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>
            {formatDateIndonesian(request.start_at.substring(0, 10))} s/d {formatDateIndonesian(request.end_at.substring(0, 10))}
          </span>
        </div>

        <p className="text-zinc-400 leading-relaxed pt-1 border-t border-zinc-800/40">
          <span className="text-zinc-500 font-medium">Alasan: </span>
          {request.reason}
        </p>

        {request.approved_by && (
          <div className="text-[11px] text-emerald-400 pt-1 border-t border-zinc-800/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Disetujui oleh: {request.approved_by}</span>
          </div>
        )}
      </div>

      {/* Action Buttons for Approver */}
      {isPending && canApprove && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(request)}
              className="text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10 min-h-[36px]"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Tolak
            </Button>
          )}

          {onApprove && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onApprove(request)}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white min-h-[36px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Setujui
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
