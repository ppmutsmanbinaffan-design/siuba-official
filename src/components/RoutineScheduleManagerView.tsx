import React, { useState } from 'react';
import { 
  Activity, 
  ActivitySupervisor, 
  PrayerTimeCalendar, 
  RoutineSchedule, 
  RoutineScheduleOverride, 
  User 
} from '../types';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  UserCheck, 
  SlidersHorizontal 
} from 'lucide-react';

interface RoutineScheduleManagerViewProps {
  activities?: Activity[];
  routineSchedules?: RoutineSchedule[];
  routineOverrides?: RoutineScheduleOverride[];
  prayerCalendars?: PrayerTimeCalendar[];
  activitySupervisors?: ActivitySupervisor[];
  users?: User[];
  onUpdateRoutineSchedules: (newSchedules: RoutineSchedule[]) => void;
  onUpdateRoutineOverrides: (newOverrides: RoutineScheduleOverride[]) => void;
  onUpdatePrayerCalendars: (newCalendars: PrayerTimeCalendar[]) => void;
  onUpdateSupervisors: (newSupervisors: ActivitySupervisor[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RoutineScheduleManagerView: React.FC<RoutineScheduleManagerViewProps> = ({
  activities = [],
  routineSchedules = [],
  routineOverrides = [],
  prayerCalendars = [],
  activitySupervisors = [],
  users = [],
  onUpdateRoutineSchedules,
  onUpdateRoutineOverrides,
  onUpdatePrayerCalendars,
  onUpdateSupervisors,
  onShowToast,
}) => {
  const safeActivities = activities || [];
  const safeRoutineSchedules = routineSchedules || [];
  const safeRoutineOverrides = routineOverrides || [];
  const safePrayerCalendars = prayerCalendars || [];
  const safeActivitySupervisors = activitySupervisors || [];
  const safeUsers = users || [];

  const [activeTab, setActiveTab] = useState<'schedules' | 'overrides' | 'prayers' | 'supervisors'>('schedules');

  // Modal State
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);

  // Form State for Schedule
  const [selectedActivityId, setSelectedActivityId] = useState<number>(safeActivities[0]?.id || 1);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'selected_days'>('daily');
  const [startTime, setStartTime] = useState<string>('04:30');
  const [presentUntil, setPresentUntil] = useState<string>('04:45');
  const [lateUntil, setLateUntil] = useState<string>('05:00');
  const [endTime, setEndTime] = useState<string>('05:30');

  // Form State for Override
  const [overrideScheduleId, setOverrideScheduleId] = useState<number>(safeRoutineSchedules[0]?.id || 1);
  const [overrideDate, setOverrideDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [overrideType, setOverrideType] = useState<'cancel' | 'time_change' | 'special'>('time_change');
  const [newStartTime, setNewStartTime] = useState<string>('04:15');
  const [newEndTime, setNewEndTime] = useState<string>('05:15');
  const [overrideReason, setOverrideReason] = useState<string>('Penyesuaian Waktu');

  // Create Routine Schedule
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const act = safeActivities.find((a) => a && a.id === selectedActivityId);
    if (!act) return;

    const newSch: RoutineSchedule = {
      id: Date.now(),
      activity_id: act.id,
      activity_name: act.name,
      frequency,
      start_time: startTime,
      present_until: presentUntil,
      late_until: lateUntil,
      end_time: endTime,
      auto_generate_session: true,
      location: act.location,
      participant_type: act.participant_type,
      is_active: true,
    };

    onUpdateRoutineSchedules([...safeRoutineSchedules, newSch]);
    setShowScheduleModal(false);
    onShowToast(`Jadwal rutin untuk ${act.name} berhasil disimpan!`, 'success');
  };

  // Create Override
  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const newOv: RoutineScheduleOverride = {
      id: Date.now(),
      routine_schedule_id: overrideScheduleId,
      override_date: overrideDate,
      override_type: overrideType,
      new_start_time: overrideType === 'time_change' ? newStartTime : undefined,
      new_end_time: overrideType === 'time_change' ? newEndTime : undefined,
      reason: overrideReason,
    };

    onUpdateRoutineOverrides([...routineOverrides, newOv]);
    setShowOverrideModal(false);
    onShowToast(`Override tanggal ${overrideDate} berhasil ditambahkan!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <SlidersHorizontal className="w-4 h-4 text-[#C9A227]" /> Routine Engine Configuration
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Kelola Jadwal Rutin & Pengawasan</h1>
            <p className="text-emerald-100/90 text-sm mt-1">
              Konfigurasi frekuensi harian, override khusus (Ramadhan/Ujian), Kalender Waktu Shalat, dan Petugas Pengawas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'schedules' && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#12372A] font-bold px-4 py-2.5 rounded-2xl text-xs transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#1F5C45]" /> Tambah Jadwal Rutin
              </button>
            )}

            {activeTab === 'overrides' && (
              <button
                onClick={() => setShowOverrideModal(true)}
                className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#12372A] font-bold px-4 py-2.5 rounded-2xl text-xs transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#1F5C45]" /> Tambah Override Tanggal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'schedules', label: 'Jadwal Rutin' },
          { id: 'overrides', label: 'Override & Penyesuaian' },
          { id: 'prayers', label: 'Kalender Waktu Shalat' },
          { id: 'supervisors', label: 'Petugas Pengawas (Musyrif)' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Schedules List */}
      {activeTab === 'schedules' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Konfigurasi Jadwal Kegiatan Rutin</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-3">Kegiatan</th>
                  <th className="p-3">Frekuensi</th>
                  <th className="p-3">Jam Masuk (Hadir)</th>
                  <th className="p-3">Batas Telat</th>
                  <th className="p-3">Selesai</th>
                  <th className="p-3">Peserta</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeRoutineSchedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{sch.activity_name}</div>
                      <div className="text-[11px] text-slate-400">{sch.location || '-'}</div>
                    </td>
                    <td className="p-3 uppercase font-semibold text-emerald-800 bg-emerald-50 rounded px-2 py-1 inline-block my-2">
                      {sch.frequency} {sch.day_of_week ? `(${sch.day_of_week})` : ''}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{sch.start_time} - {sch.present_until}</td>
                    <td className="p-3 font-mono text-amber-800">{sch.late_until}</td>
                    <td className="p-3 font-mono text-slate-500">{sch.end_time}</td>
                    <td className="p-3 capitalize text-slate-600">{sch.participant_type || 'all'}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Overrides List */}
      {activeTab === 'overrides' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Daftar Pengecualian Jadwal (Overrides)</h2>

          {safeRoutineOverrides.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
              Belum ada pengecualian jadwal yang dikonfigurasi.
            </div>
          ) : (
            <div className="space-y-2">
              {safeRoutineOverrides.map((ov) => {
                const sch = safeRoutineSchedules.find((s) => s.id === ov.routine_schedule_id);
                return (
                  <div key={ov.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{sch?.activity_name || 'Jadwal Rutin'}</div>
                      <div className="text-slate-500 mt-0.5">Tanggal: <strong className="text-slate-800">{ov.override_date}</strong> | Tipe: <strong className="uppercase">{ov.override_type}</strong></div>
                      <div className="text-amber-800 mt-1">Alasan: {ov.reason}</div>
                    </div>

                    {ov.override_type === 'time_change' && (
                      <div className="bg-amber-100 text-amber-900 font-mono font-bold px-3 py-1.5 rounded-lg text-xs">
                        {ov.new_start_time} - {ov.new_end_time}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Prayer Times Calendar */}
      {activeTab === 'prayers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Kalender Waktu Shalat Lokal (Simulasi / API)</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Subuh</th>
                  <th className="p-3">Dzuhur</th>
                  <th className="p-3">Ashar</th>
                  <th className="p-3">Maghrib</th>
                  <th className="p-3">Isya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safePrayerCalendars.map((pc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition font-mono">
                    <td className="p-3 font-sans font-bold text-slate-900">{pc.date}</td>
                    <td className="p-3 text-indigo-700 font-semibold">{pc.subuh}</td>
                    <td className="p-3 text-amber-700 font-semibold">{pc.dzuhur}</td>
                    <td className="p-3 text-orange-700 font-semibold">{pc.ashar}</td>
                    <td className="p-3 text-rose-700 font-semibold">{pc.maghrib}</td>
                    <td className="p-3 text-blue-700 font-semibold">{pc.isya}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Supervisors */}
      {activeTab === 'supervisors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Penugasan Musyrif & Petugas Pengawas</h2>

          <div className="space-y-2">
            {safeActivitySupervisors.map((sup) => {
              const act = safeActivities.find((a) => a.id === sup.activity_id);
              return (
                <div key={sup.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">{sup.user_name}</div>
                    <div className="text-slate-500 mt-0.5">Peran: <strong className="text-slate-700">{sup.role_type}</strong></div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded">
                    {act?.name || 'Kegiatan'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Add Schedule */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Tambah Jadwal Rutin</h3>

            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Kegiatan Master</label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {safeActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Frekuensi Berulang</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="daily">Setiap Hari (Daily)</option>
                  <option value="weekly">Mingguan (Weekly)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Mulai (Hadir)</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    placeholder="04:30"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Toleransi Tepat</label>
                  <input
                    type="text"
                    value={presentUntil}
                    onChange={(e) => setPresentUntil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    placeholder="04:45"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Terlambat</label>
                  <input
                    type="text"
                    value={lateUntil}
                    onChange={(e) => setLateUntil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    placeholder="05:00"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Selesai Sesi</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    placeholder="05:30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white font-bold text-xs"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Override */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Tambah Pengecualian Jadwal</h3>

            <form onSubmit={handleSaveOverride} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Jadwal Rutin</label>
                <select
                  value={overrideScheduleId}
                  onChange={(e) => setOverrideScheduleId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium"
                >
                  {routineSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.activity_name} ({s.start_time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Berlaku</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Penyesuaian</label>
                <select
                  value={overrideType}
                  onChange={(e) => setOverrideType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium"
                >
                  <option value="time_change">Perubahan Jam Mulai / Selesai</option>
                  <option value="cancel">Dibatalkan (Libur / Acara Khusus)</option>
                </select>
              </div>

              {overrideType === 'time_change' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jam Baru Mulai</label>
                    <input
                      type="text"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jam Baru Selesai</label>
                    <input
                      type="text"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Penyesuaian</label>
                <input
                  type="text"
                  placeholder="e.g. Bulan Suci Ramadhan"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white font-bold text-xs"
                >
                  Simpan Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
