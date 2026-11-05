import React from 'react';
import { Clock, LogOut, MoreVertical, Edit3, ShieldAlert, CheckCircle2, QrCode, Radio } from 'lucide-react';
import { StaffAttendanceRecord } from '../../../types';
import { StaffAttendanceStatusBadge } from './StaffAttendanceStatusBadge';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { formatStaffType, formatTimeWib } from '../utils/staffAttendanceUtils';
import { Button } from '../../../components/ui/Button';

interface StaffDailyCardProps {
  record: StaffAttendanceRecord;
  onCheckOut?: (record: StaffAttendanceRecord) => void;
  onCorrect?: (record: StaffAttendanceRecord) => void;
}

export const StaffDailyCard: React.FC<StaffDailyCardProps> = ({
  record,
  onCheckOut,
  onCorrect,
}) => {
  const isCheckedIn = Boolean(record.check_in_at);
  const isCheckedOut = Boolean(record.check_out_at);

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-lg space-y-3">
      {/* Top Header: Avatar + Staff Name + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PersonAvatar name={record.staff_name} className="w-10 h-10 rounded-xl shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-zinc-100 truncate">{record.staff_name}</h4>
            <p className="text-xs text-zinc-400 font-mono truncate">
              {record.staff_number} • {formatStaffType(record.staff_type)}
            </p>
          </div>
        </div>
        <StaffAttendanceStatusBadge status={record.status} size="sm" />
      </div>

      {/* Schedule & Timing Info */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs">
        <div>
          <span className="text-[11px] text-zinc-500 block">Jadwal Kerja</span>
          <span className="font-mono font-medium text-zinc-300">
            {formatTimeWib(record.scheduled_start_at)} – {formatTimeWib(record.scheduled_end_at)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-zinc-500 block">Check-in</span>
          <div className="flex items-center gap-1.5 font-mono font-semibold text-zinc-200">
            {record.check_in_method === 'rfid' ? (
              <Radio className="w-3 h-3 text-cyan-400" />
            ) : record.check_in_method === 'qr' ? (
              <QrCode className="w-3 h-3 text-emerald-400" />
            ) : null}
            <span>{formatTimeWib(record.check_in_at)}</span>
            {record.late_minutes && record.late_minutes > 0 ? (
              <span className="text-[10px] text-amber-400 font-normal">({record.late_minutes}m)</span>
            ) : null}
          </div>
        </div>

        <div className="col-span-2 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-500 block">Check-out</span>
            <span className="font-mono font-medium text-zinc-300">
              {isCheckedOut ? formatTimeWib(record.check_out_at) : 'Belum Check-out'}
            </span>
          </div>

          {record.early_leave_minutes && record.early_leave_minutes > 0 ? (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Pulang Awal {record.early_leave_minutes}m
            </span>
          ) : null}
        </div>
      </div>

      {/* Notes if any */}
      {record.notes && (
        <p className="text-[11px] text-zinc-400 italic bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-800/40 truncate">
          Catatan: {record.notes}
        </p>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {isCheckedIn && !isCheckedOut && onCheckOut && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCheckOut(record)}
            className="text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10 min-h-[36px]"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Check-out
          </Button>
        )}

        {onCorrect && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCorrect(record)}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 min-h-[36px]"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            Koreksi
          </Button>
        )}
      </div>
    </div>
  );
};
