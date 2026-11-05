import React, { useState } from 'react';
import { 
  AttendanceRecord, 
  AttendanceSession, 
  PrayerSummaryCard, 
  Student 
} from '../types';
import { DailyAttendanceTimelineService } from '../services/dailyAttendanceTimelineService';
import { 
  MoonStar, 
  Sun, 
  CloudSun, 
  Sunset, 
  Moon, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download,
  Search,
  Filter
} from 'lucide-react';

interface PrayerMonitoringViewProps {
  simulatedTime?: string;
  sessions?: AttendanceSession[];
  records?: AttendanceRecord[];
  students?: Student[];
}

export const PrayerMonitoringView: React.FC<PrayerMonitoringViewProps> = ({
  simulatedTime = new Date().toISOString(),
  sessions = [],
  records = [],
  students = [],
}) => {
  const safeSessions = sessions || [];
  const safeRecords = records || [];
  const safeStudents = students || [];

  const [selectedDate, setSelectedDate] = useState<string>(simulatedTime.slice(0, 10));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const prayerCards: PrayerSummaryCard[] = DailyAttendanceTimelineService.getPrayerSummaryCards({
    date: selectedDate,
    sessions: safeSessions,
    records: safeRecords,
    students: safeStudents,
  });

  const prayerIcons: Record<string, React.ReactNode> = {
    'PRAYER-SUBUH': <MoonStar className="w-6 h-6 text-indigo-400" />,
    'PRAYER-DZUHUR': <Sun className="w-6 h-6 text-amber-400" />,
    'PRAYER-ASHAR': <CloudSun className="w-6 h-6 text-orange-400" />,
    'PRAYER-MAGHRIB': <Sunset className="w-6 h-6 text-rose-400" />,
    'PRAYER-ISYA': <Moon className="w-6 h-6 text-blue-400" />,
  };

  // Active students filter
  let filteredStudents = safeStudents.filter(
    (s) => s && s.is_active && (s.status === 'active' || !s.status) && !s.deleted_at
  );

  if (genderFilter !== 'all') {
    filteredStudents = filteredStudents.filter((s) => {
      if (!s) return false;
      const g = s.gender === 'male' || s.gender === 'L' ? 'male' : 'female';
      return g === genderFilter;
    });
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredStudents = filteredStudents.filter(
      (s) => s && ((s.name || '').toLowerCase().includes(q) || (s.student_number || '').toLowerCase().includes(q))
    );
  }

  // Get Session IDs for 5 prayers on selected date
  const prayerSessionsMap = new Map<string, AttendanceSession | undefined>();
  ['PRAYER-SUBUH', 'PRAYER-DZUHUR', 'PRAYER-ASHAR', 'PRAYER-MAGHRIB', 'PRAYER-ISYA'].forEach((pCode) => {
    const sess = safeSessions.find(
      (s) => s && s.session_date === selectedDate && (s.activity_code === pCode || (s.activity_name && s.activity_name.toLowerCase().includes(pCode.toLowerCase().replace('prayer-', ''))))
    );
    prayerSessionsMap.set(pCode, sess);
  });

  // Get record status helper
  const getPrayerRecordStatus = (studentId: number, prayerCode: string) => {
    const sess = prayerSessionsMap.get(prayerCode);
    if (!sess) return { code: '-', bg: 'bg-slate-100 text-slate-400' };

    const rec = safeRecords.find((r) => r && r.attendance_session_id === sess.id && r.student_id === studentId);

    if (!rec) {
      if (sess.status === 'closed') return { code: 'A', label: 'Alpha', bg: 'bg-rose-100 text-rose-800 font-bold' };
      return { code: '?', label: 'Belum', bg: 'bg-slate-100 text-slate-500' };
    }

    if (rec.status === 'present') return { code: 'H', label: 'Hadir', bg: 'bg-emerald-100 text-emerald-800 font-bold' };
    if (rec.status === 'late') return { code: 'T', label: `Terlambat (${rec.late_minutes}m)`, bg: 'bg-amber-100 text-amber-800 font-bold' };
    if (rec.status === 'permission') return { code: 'I', label: 'Izin', bg: 'bg-blue-100 text-blue-800 font-semibold' };
    if (rec.status === 'sick') return { code: 'S', label: 'Sakit', bg: 'bg-amber-100 text-amber-800 font-semibold' };
    if (rec.status === 'dispensation') return { code: 'D', label: 'Dispensasi', bg: 'bg-purple-100 text-purple-800 font-semibold' };
    return { code: 'A', label: 'Alpha', bg: 'bg-rose-100 text-rose-800 font-bold' };
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'NIS,Nama Santri,Kelas,Asrama,Subuh,Dzuhur,Ashar,Maghrib,Isya\n';

    filteredStudents.forEach((st) => {
      const sub = getPrayerRecordStatus(st.id, 'PRAYER-SUBUH').code;
      const dzu = getPrayerRecordStatus(st.id, 'PRAYER-DZUHUR').code;
      const ash = getPrayerRecordStatus(st.id, 'PRAYER-ASHAR').code;
      const mag = getPrayerRecordStatus(st.id, 'PRAYER-MAGHRIB').code;
      const isy = getPrayerRecordStatus(st.id, 'PRAYER-ISYA').code;

      csvContent += `"${st.student_number}","${st.name}","${st.classroom_name || '-'}","${st.dormitory_room_name || '-'}","${sub}","${dzu}","${ash}","${mag}","${isy}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `monitoring_shalat_5_waktu_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1F5C45] via-[#1A503C] to-[#12382A] text-white rounded-3xl p-6 shadow-md border border-[#164735]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <MoonStar className="w-4 h-4 text-[#C9A227]" /> Boarding School Prayer Engine
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Monitoring Shalat 5 Waktu Jamaah</h1>
            <p className="text-emerald-100/90 text-sm mt-1">
              Rekapitulasi tingkat kehadiran shalat Subuh, Dzuhur, Ashar, Maghrib, dan Isya per santri.
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

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#12372A] font-bold px-4 py-2 rounded-2xl text-xs transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#1F5C45]" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* 5 Prayer Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {prayerCards.map((card) => {
          return (
            <div
              key={card.prayer_code}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    {prayerIcons[card.prayer_code] || <Sun className="w-6 h-6 text-amber-500" />}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      card.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : card.status === 'closed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <h2 className="font-bold text-slate-900 text-sm">{card.prayer_name}</h2>
                <div className="text-xs text-slate-500 font-mono mb-3">{card.time_range}</div>

                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-extrabold text-slate-900">{card.attendance_rate}%</span>
                  <span className="text-xs text-slate-500">
                    {card.present + card.late} / {card.total_students} Santri
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${card.attendance_rate}%` }}
                  />
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-[10px] text-center font-medium">
                <div className="bg-emerald-50 text-emerald-800 p-1 rounded">Hadir: {card.present}</div>
                <div className="bg-amber-50 text-amber-800 p-1 rounded">Lemb: {card.late}</div>
                <div className="bg-rose-50 text-rose-800 p-1 rounded">Alpha: {card.absent}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Matriks Kehadiran Shalat Santri</h3>
            <p className="text-xs text-slate-500">
              Tingkat kehadiran individual 5 waktu shalat berjamaah untuk tanggal {selectedDate}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari santri / NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-xs font-medium">
              <button
                onClick={() => setGenderFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${genderFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setGenderFilter('male')}
                className={`px-2.5 py-1 rounded-md transition ${genderFilter === 'male' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Putra
              </button>
              <button
                onClick={() => setGenderFilter('female')}
                className={`px-2.5 py-1 rounded-md transition ${genderFilter === 'female' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Putri
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="p-3">#</th>
                <th className="p-3">Santri</th>
                <th className="p-3">Kelas / Kamar</th>
                <th className="p-3 text-center">Subuh</th>
                <th className="p-3 text-center">Dzuhur</th>
                <th className="p-3 text-center">Ashar</th>
                <th className="p-3 text-center">Maghrib</th>
                <th className="p-3 text-center">Isya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada data santri ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const sub = getPrayerRecordStatus(st.id, 'PRAYER-SUBUH');
                  const dzu = getPrayerRecordStatus(st.id, 'PRAYER-DZUHUR');
                  const ash = getPrayerRecordStatus(st.id, 'PRAYER-ASHAR');
                  const mag = getPrayerRecordStatus(st.id, 'PRAYER-MAGHRIB');
                  const isy = getPrayerRecordStatus(st.id, 'PRAYER-ISYA');

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{st.student_number}</div>
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>{st.classroom_name || '-'}</div>
                        <div className="text-[11px] text-slate-400">{st.dormitory_room_name || '-'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${sub.bg}`} title={sub.label}>
                          {sub.code}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${dzu.bg}`} title={dzu.label}>
                          {dzu.code}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${ash.bg}`} title={ash.label}>
                          {ash.code}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${mag.bg}`} title={mag.label}>
                          {mag.code}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${isy.bg}`} title={isy.label}>
                          {isy.code}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-700">Keterangan Status:</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> H = Hadir</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> T = Terlambat</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> I = Izin</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> S = Sakit</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> D = Dispensasi</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> A = Alpha</span>
        </div>
      </div>
    </div>
  );
};
