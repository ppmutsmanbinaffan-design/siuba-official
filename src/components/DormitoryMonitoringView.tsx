import React, { useState } from 'react';
import { 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  Dormitory, 
  DormitoryRoom, 
  Student 
} from '../types';
import { DailyAttendanceTimelineService } from '../services/dailyAttendanceTimelineService';
import { RoutineAttendanceAttentionService } from '../services/routineAttendanceAttentionService';
import { 
  Home, 
  Building2, 
  AlertTriangle, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Search, 
  ShieldAlert, 
  Sparkles,
  BedDouble
} from 'lucide-react';

interface DormitoryMonitoringViewProps {
  simulatedTime?: string;
  dormitories?: Dormitory[];
  dormitoryRooms?: DormitoryRoom[];
  students?: Student[];
  sessions?: AttendanceSession[];
  records?: AttendanceRecord[];
  participants?: AttendanceSessionParticipant[];
}

export const DormitoryMonitoringView: React.FC<DormitoryMonitoringViewProps> = ({
  simulatedTime = new Date().toISOString(),
  dormitories = [],
  dormitoryRooms = [],
  students = [],
  sessions = [],
  records = [],
  participants = [],
}) => {
  const safeDormitories = dormitories || [];
  const safeDormitoryRooms = dormitoryRooms || [];
  const safeStudents = students || [];
  const safeSessions = sessions || [];
  const safeRecords = records || [];
  const safeParticipants = participants || [];

  const [selectedDate, setSelectedDate] = useState<string>(simulatedTime.slice(0, 10));
  const [selectedDormitoryId, setSelectedDormitoryId] = useState<number | 'all'>('all');

  const dormSummaries = DailyAttendanceTimelineService.getDormitorySummaryCards({
    date: selectedDate,
    dormitories: safeDormitories,
    dormitoryRooms: safeDormitoryRooms,
    students: safeStudents,
    sessions: safeSessions,
    records: safeRecords,
  });

  const attentionAlerts = RoutineAttendanceAttentionService.getAttentionAlerts({
    date: selectedDate,
    sessions: safeSessions,
    records: safeRecords,
    participants: safeParticipants,
    students: safeStudents,
    minMissedThreshold: 2,
  });

  // Filter rooms if dormitory selected
  const filteredRooms = safeDormitoryRooms.filter((r) => {
    if (!r) return false;
    if (selectedDormitoryId === 'all') return true;
    return r.dormitory_id === selectedDormitoryId;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Home className="w-4 h-4 text-emerald-300" /> Musyrif & Boarding House Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monitoring Kebersihan & Apel Asrama</h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
              Pengawasan kehadiran harian santri untuk Apel Malam, Piket Kebersihan Kamar, Belajar Malam, dan Jadwal Makan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/25 border border-white/15 rounded-2xl px-3 py-1.5 text-sm backdrop-blur-xs">
              <Calendar className="w-4 h-4 mr-2 text-[#C9A227]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Dormitory Cards & Attention Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dormitory Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-800" />
              Ringkasan Kehadiran Asrama
            </h2>

            <select
              value={selectedDormitoryId}
              onChange={(e) => setSelectedDormitoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer outline-none"
            >
              <option value="all" className="text-slate-900 bg-white font-medium">Semua Asrama</option>
              {dormitories.map((d) => (
                <option key={d.id} value={d.id} className="text-slate-900 bg-white font-medium">{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dormSummaries.map((dorm) => (
              <div key={dorm.dormitory_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{dorm.dormitory_name}</h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{dorm.total_residents} Santri Penghuni Aktif</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 font-extrabold text-sm px-3 py-1 rounded-full border border-emerald-200">
                    {dorm.overall_rate}%
                  </span>
                </div>

                <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  {dorm.activity_summaries.length === 0 ? (
                    <div className="text-slate-500 font-medium text-center py-2">Belum ada sesi asrama untuk tanggal ini.</div>
                  ) : (
                    dorm.activity_summaries.map((act, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-slate-800 font-semibold truncate max-w-[180px]">{act.activity_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{act.recorded} / {act.total}</span>
                          <span className="font-extrabold text-emerald-800 w-12 text-right">{act.rate}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-emerald-700" />
              Daftar Kamar Asrama ({filteredRooms.length} Kamar)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredRooms.map((room) => {
                const roomStudents = students.filter((s) => s.dormitory_room_id === room.id && s.is_active);
                return (
                  <div key={room.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{room.name}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">Supervisor: {room.supervisor}</div>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                        {roomStudents.length} / {room.capacity} Santri
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Attention Alerts (Musyrif Alert) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-base mb-1">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Santri Perlu Perhatian (Musyrif)
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Daftar santri dengan $\ge 2$ ketidak-hadiran atau belum tercatat pada sesi rutin hari ini ({selectedDate}).
            </p>

            {attentionAlerts.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                Semua santri tertib tercatat dalam kegiatan rutin hari ini!
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {attentionAlerts.map((alert) => (
                  <div key={alert.student_id} className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 text-xs space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{alert.student_name}</div>
                        <div className="text-slate-500 text-[11px]">NIS: {alert.student_number} | {alert.dormitory_room_name || '-'}</div>
                      </div>
                      <span className="bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded text-[10px]">
                        {alert.total_missed_events} Missed
                      </span>
                    </div>

                    <div className="text-[11px] text-rose-900 font-medium">
                      Detail Kegiatan:
                      <ul className="list-disc list-inside text-rose-700 mt-0.5">
                        {alert.missed_activities.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
