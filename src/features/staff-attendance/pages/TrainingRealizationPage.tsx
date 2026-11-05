import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileCheck, 
  RefreshCw, 
  Search, 
  Award, 
  Clock, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Edit3,
  Calendar
} from 'lucide-react';
import { User, TrainingSession } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { TrainingRealizationModal } from '../components/TrainingRealizationModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { formatRealizationStatus, formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TrainingRealizationPageProps {
  currentUser: User;
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TrainingRealizationPage: React.FC<TrainingRealizationPageProps> = ({
  currentUser,
  onNavigate,
  showToast,
}) => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSessionForRealization, setSelectedSessionForRealization] = useState<TrainingSession | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StaffAttendanceApi.getTrainingSessions();
      if (res.data) setSessions(res.data);
    } catch (err: any) {
      showToast('Gagal memuat data jurnal realisasi: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEkskul = (s.extracurricular_name || '').toLowerCase().includes(q);
        const matchesCoach = (s.coach_name || '').toLowerCase().includes(q);
        const matchesTopic = (s.topic || '').toLowerCase().includes(q);
        if (!matchesEkskul && !matchesCoach && !matchesTopic) return false;
      }

      if (statusFilter !== 'all' && s.realization_status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [sessions, searchQuery, statusFilter]);

  const columns: Column<TrainingSession>[] = [
    {
      key: 'session',
      header: 'Tanggal & Ekskul',
      render: (s) => (
        <div>
          <div className="font-bold text-xs text-purple-300">
            {s.extracurricular_name}
          </div>
          <div className="font-mono text-[11px] text-zinc-400">
            {formatDateIndonesian(s.session_date)} ({s.scheduled_start_at} - {s.scheduled_end_at})
          </div>
        </div>
      ),
    },
    {
      key: 'coach',
      header: 'Pelatih',
      render: (s) => (
        <div className="text-xs text-zinc-300 font-medium">
          {s.actual_coach_name || s.coach_name}
        </div>
      ),
    },
    {
      key: 'topic',
      header: 'Materi / Topik Latihan',
      render: (s) => (
        <div className="max-w-xs truncate text-xs text-zinc-200" title={s.topic}>
          {s.topic || <span className="text-zinc-500 italic">Belum diisi</span>}
        </div>
      ),
    },
    {
      key: 'students',
      header: 'Presensi Santri',
      render: (s) => (
        <span className="font-mono text-xs text-zinc-300">
          {s.student_present_count !== undefined
            ? `${s.student_present_count} / ${s.student_eligible_count || '—'} Hadir`
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Jurnal',
      render: (s) => {
        const info = formatRealizationStatus(s.realization_status);
        return (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.badgeClass}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (s) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSelectedSessionForRealization(s)}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1 px-2.5 h-auto"
        >
          <Edit3 className="w-3 h-3 mr-1" />
          {s.realization_status === 'realized' ? 'Edit Jurnal' : 'Isi Jurnal'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Jurnal Realisasi Ekstrakurikuler
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pencatatan materi latihan, rekap kehadiran santri, dan kendala sarana kegiatan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadData}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('training-attendance')}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold"
          >
            Presensi Pelatih
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ekskul, nama pelatih, atau topik materi..."
            className="pl-9 text-xs"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs w-44"
        >
          <option value="all">Semua Status Jurnal</option>
          <option value="submitted">Sudah Diisi (Submitted)</option>
          <option value="pending">Belum Diisi (Pending)</option>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="Memuat jurnal realisasi ekstrakurikuler..." />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Tidak Ada Jurnal"
          description="Tidak ditemukan sesi yang sesuai dengan kriteria pencarian Anda."
        />
      ) : (
        <ResponsiveTable
          data={filteredSessions}
          columns={columns}
          keyExtractor={(s) => s.id}
        />
      )}

      {/* Realization Modal */}
      {selectedSessionForRealization && (
        <TrainingRealizationModal
          isOpen={Boolean(selectedSessionForRealization)}
          onClose={() => setSelectedSessionForRealization(null)}
          session={selectedSessionForRealization}
          currentUser={currentUser}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            setSelectedSessionForRealization(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
