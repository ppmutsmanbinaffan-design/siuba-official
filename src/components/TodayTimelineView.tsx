import React, { useState } from 'react';
import { 
  Activity, 
  ActivityCategory, 
  AttendanceMethod, 
  AttendanceRecord, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  DormitoryRoom, 
  DutyRoster,
  HalaqahMember, 
  PrayerTimeCalendar, 
  RoutineSchedule, 
  RoutineScheduleOverride, 
  Student, 
  User 
} from '../types';
import { DailyAttendanceTimelineService } from '../services/dailyAttendanceTimelineService';
import { RoutineSessionGenerator } from '../services/routineSessionGenerator';
import { AttendanceEngine } from '../services/attendanceEngine';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Lock, 
  UserCheck, 
  Filter, 
  RefreshCw, 
  MapPin, 
  QrCode, 
  CreditCard, 
  Edit3, 
  Sparkles,
  Users,
  ChevronDown
} from 'lucide-react';

interface TodayTimelineViewProps {
  simulatedTime: string;
  sessions: AttendanceSession[];
  activities: Activity[];
  categories: ActivityCategory[];
  records: AttendanceRecord[];
  participants: AttendanceSessionParticipant[];
  students: Student[];
  dormitoryRooms: DormitoryRoom[];
  halaqahMembers: HalaqahMember[];
  dutyRosters?: DutyRoster[];
  routineSchedules: RoutineSchedule[];
  routineOverrides: RoutineScheduleOverride[];
  prayerCalendars: PrayerTimeCalendar[];
  currentUser: User;
  onUpdateSessions: (newSessions: AttendanceSession[]) => void;
  onUpdateRecords: (newRecords: AttendanceRecord[]) => void;
  onUpdateParticipants: (newParticipants: AttendanceSessionParticipant[]) => void;
  onOpenSession: (sessionId: number) => void;
  onCloseSession: (sessionId: number) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TodayTimelineView: React.FC<TodayTimelineViewProps> = ({
  simulatedTime,
  sessions,
  activities,
  categories,
  records,
  participants,
  students,
  dormitoryRooms,
  halaqahMembers,
  dutyRosters = [],
  routineSchedules,
  routineOverrides,
  prayerCalendars,
  currentUser,
  onUpdateSessions,
  onUpdateRecords,
  onUpdateParticipants,
  onOpenSession,
  onCloseSession,
  onShowToast,
}) => {
  const currentDateStr = simulatedTime.slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(currentDateStr);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Filtered Timeline Items
  const timelineItems = DailyAttendanceTimelineService.getDailyTimeline({
    date: selectedDate,
    sessions,
    activities,
    categories,
    records,
    simulatedTime,
  });

  const categoryFilteredItems = timelineItems.filter((item) => {
    if (activeCategoryFilter === 'ALL') return true;
    if (activeCategoryFilter === 'IBADAH') return item.category_code === 'IBADAH';
    if (activeCategoryFilter === 'AKADEMIK') return item.category_code === 'AKADEMIK';
    if (activeCategoryFilter === 'TAHFIDZ') return item.category_code === 'TAHFIDZ';
    if (activeCategoryFilter === 'ASRAMA') return item.category_code === 'ASRAMA' || item.category_code === 'APEL' || item.category_code === 'KEBERSIHAN';
    if (activeCategoryFilter === 'OTHER') return item.category_code === 'MAKAN' || item.category_code === 'MUHADHARAH' || item.category_code === 'KEGIATAN_RUTIN' || item.category_code === 'EKSTRAKURIKULER';
    return true;
  });

  // Handle Idempotent Session Generation
  const handleGenerateTodaySessions = () => {
    const { result, newSessions, newParticipants } = RoutineSessionGenerator.generateRoutineSessionsForDate({
      date: selectedDate,
      routineSchedules,
      routineOverrides,
      prayerCalendars,
      activities,
      students,
      dormitoryRooms,
      halaqahMembers,
      dutyRosters,
      existingSessions: sessions,
      existingParticipants: participants,
      currentUser,
    });

    if (newSessions.length > 0) {
      onUpdateSessions([...sessions, ...newSessions]);
      onUpdateParticipants([...participants, ...newParticipants]);
      onShowToast(`Berhasil membuat ${newSessions.length} sesi kegiatan rutin baru untuk tanggal ${selectedDate}!`, 'success');
    } else {
      onShowToast(`Semua sesi kegiatan rutin untuk ${selectedDate} sudah tersedia (${result.existing} ada, 0 baru).`, 'info');
    }
  };

  // Student Daily Timeline
  const studentTimeline = selectedStudentId
    ? DailyAttendanceTimelineService.getStudentDailyTimeline({
        studentId: selectedStudentId,
        date: selectedDate,
        sessions,
        activities,
        categories,
        records,
        participants,
      })
    : [];

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-[#C9A227]" /> Server Time: {simulatedTime}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Timeline Kegiatan Rutin & Ibadah</h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
              Alur kronologis otomatis untuk Shalat 5 Waktu, KBM Akademik, Tahfidz Al-Qur'an, dan Kegiatan Asrama.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-black/25 border border-white/15 rounded-2xl px-3 py-1.5 text-sm backdrop-blur-xs">
              <Calendar className="w-4 h-4 mr-2 text-[#C9A227]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            <button
              onClick={handleGenerateTodaySessions}
              className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#12372A] font-bold px-4 py-2.5 rounded-2xl shadow-xs transition-all active:scale-95 text-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#1F5C45]" />
              Generate Sesi Rutin
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Filter Kategori Kegiatan</h3>
            <p className="text-[11px] text-slate-500 font-medium">Pilih kategori untuk menyaring daftar sesi hari ini</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <select
            value={activeCategoryFilter}
            onChange={(e) => setActiveCategoryFilter(e.target.value)}
            className="w-full appearance-none bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs sm:text-sm font-semibold shadow-2xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none cursor-pointer transition-all"
          >
            {[
              { id: 'ALL', label: 'Semua Kegiatan', count: timelineItems.length },
              { id: 'IBADAH', label: 'Shalat 5 Waktu', count: timelineItems.filter((i) => i.category_code === 'IBADAH').length },
              { id: 'AKADEMIK', label: 'Akademik KBM', count: timelineItems.filter((i) => i.category_code === 'AKADEMIK').length },
              { id: 'TAHFIDZ', label: 'Tahfidz Al-Qur\'an', count: timelineItems.filter((i) => i.category_code === 'TAHFIDZ').length },
              { id: 'ASRAMA', label: 'Asrama & Apel', count: timelineItems.filter((i) => i.category_code === 'ASRAMA' || i.category_code === 'APEL' || i.category_code === 'KEBERSIHAN').length },
              { id: 'OTHER', label: 'Makan / Rutin', count: timelineItems.filter((i) => i.category_code === 'MAKAN' || i.category_code === 'MUHADHARAH' || i.category_code === 'KEGIATAN_RUTIN').length },
            ].map((cat) => (
              <option key={cat.id} value={cat.id} className="text-slate-900 bg-white font-medium py-1">
                {cat.label} ({cat.count} sesi)
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Timeline List (2 cols on large) */}
        <div className="lg:col-span-2 space-y-4">
          {categoryFilteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">Belum Ada Sesi Kegiatan</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Klik tombol <strong className="text-emerald-800">Generate Sesi Rutin</strong> di atas untuk membuat jadwal otomatis 5 Waktu Shalat, Tahfidz, dan Asrama untuk tanggal {selectedDate}.
              </p>
              <button
                onClick={handleGenerateTodaySessions}
                className="mt-4 inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-4 py-2 rounded-lg text-sm shadow transition"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Generate Sesi Sekarang
              </button>
            </div>
          ) : (
            categoryFilteredItems.map((item) => {
              const { session, activity, category_name, derived_status, recorded_count, total_participants, attendance_rate } = item;

              // Color badge styling
              let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
              let statusLabel = 'Akan Datang';

              if (derived_status === 'ongoing') {
                statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse';
                statusLabel = 'Berlangsung';
              } else if (derived_status === 'ready') {
                statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                statusLabel = 'Siap Dibuka';
              } else if (derived_status === 'completed') {
                statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                statusLabel = 'Selesai';
              } else if (derived_status === 'overdue') {
                statusBadgeClass = 'bg-red-100 text-red-800 border-red-300';
                statusLabel = 'Perlu Ditutup';
              } else if (derived_status === 'cancelled') {
                statusBadgeClass = 'bg-slate-200 text-slate-600 line-through';
                statusLabel = 'Dibatalkan';
              }

              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-2xl border transition-all hover:shadow-md p-5 relative overflow-hidden ${
                    session.status === 'open' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-3 py-1 rounded-lg text-xs tracking-wider uppercase">
                        {session.start_at} – {session.end_at}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      Kode: {session.session_code}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900">{activity.name}</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        {session.participant_count} Santri Terdaftar
                      </span>
                    </div>
                  </div>

                  {/* Attendance Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Progres Kehadiran ({recorded_count}/{total_participants} Santri)</span>
                      <span className="font-bold text-emerald-800">{attendance_rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, attendance_rate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-400">
                      Status DB: <strong className="uppercase text-slate-700">{session.status}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.status === 'draft' && (
                        <button
                          onClick={() => onOpenSession(session.id)}
                          className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-3 py-1.5 rounded-lg text-xs shadow-sm transition"
                        >
                          <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          Buka Sesi
                        </button>
                      )}

                      {session.status === 'open' && (
                        <button
                          onClick={() => onCloseSession(session.id)}
                          className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-medium px-3 py-1.5 rounded-lg text-xs shadow-sm transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Tutup & Auto-Alpha
                        </button>
                      )}

                      <button
                        onClick={() => onOpenSession(session.id)}
                        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                        Kelola Absensi
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Student Individual Daily Inspector */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              Cek Timeline Santri ({selectedDate})
            </h2>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Santri</label>
              <select
                value={selectedStudentId || ''}
                onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">-- Pilih Santri --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_number}) - {s.classroom_name || 'Tanpa Kelas'}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudentObj && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 mb-4 text-xs space-y-1">
                <div className="font-bold text-slate-900">{selectedStudentObj.name}</div>
                <div className="text-slate-600">NIS: {selectedStudentObj.student_number} | Kamar: {selectedStudentObj.dormitory_room_name || '-'}</div>
                <div className="text-slate-600">Total Kegiatan Hari Ini: <strong>{studentTimeline.length} sesi</strong></div>
              </div>
            )}

            {selectedStudentId ? (
              studentTimeline.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  Santri tidak terdaftar pada sesi manapun pada tanggal {selectedDate}.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {studentTimeline.map((item, idx) => {
                    let badgeBg = 'bg-slate-100 text-slate-600';
                    let label = 'Belum Absen';

                    if (item.status === 'present') {
                      badgeBg = 'bg-emerald-100 text-emerald-800 font-bold';
                      label = 'Hadir';
                    } else if (item.status === 'late') {
                      badgeBg = 'bg-amber-100 text-amber-800 font-bold';
                      label = `Terlambat (${item.record?.late_minutes || 0}m)`;
                    } else if (item.status === 'permission') {
                      badgeBg = 'bg-blue-100 text-blue-800 font-semibold';
                      label = 'Izin';
                    } else if (item.status === 'sick') {
                      badgeBg = 'bg-amber-100 text-amber-800 font-semibold';
                      label = 'Sakit';
                    } else if (item.status === 'dispensation') {
                      badgeBg = 'bg-purple-100 text-purple-800 font-semibold';
                      label = 'Dispensasi';
                    } else if (item.status === 'absent') {
                      badgeBg = 'bg-rose-100 text-rose-800 font-bold';
                      label = 'Alpha';
                    } else if (item.status === 'excused') {
                      badgeBg = 'bg-cyan-100 text-cyan-800 font-semibold';
                      label = 'Izin Terdaftar';
                    }

                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="font-bold text-slate-800">{item.activity.name}</div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${badgeBg}`}>
                            {label}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] flex justify-between">
                          <span>Waktu: {item.session.start_at} – {item.session.end_at}</span>
                          {item.record && <span>Method: {item.record.method.toUpperCase()}</span>}
                        </div>
                        {item.excuse_reason && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1">
                            {item.excuse_reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">
                Pilih santri dari dropdown di atas untuk melihat alur kehadiran lengkap harian.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
