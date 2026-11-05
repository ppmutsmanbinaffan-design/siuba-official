import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  RefreshCw, 
  Search, 
  Award, 
  ArrowRight, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { User, Staff, TrainerSubstitution, TrainingSession } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { TrainerSubstitutionCard } from '../components/TeacherSubstitutionCard';
import { TrainerSubstitutionModal } from '../components/TrainerSubstitutionModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TrainerSubstitutionPageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TrainerSubstitutionPage: React.FC<TrainerSubstitutionPageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [substitutions, setSubstitutions] = useState<TrainerSubstitution[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().substring(0, 10);
      const [subsRes, sessionsRes] = await Promise.all([
        StaffAttendanceApi.getTrainerSubstitutions(),
        StaffAttendanceApi.getTrainingSessions(today),
      ]);

      if (subsRes.data) setSubstitutions(subsRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
    } catch (err: any) {
      showToast('Gagal memuat data pelatih pengganti: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered substitutions
  const filteredSubstitutions = useMemo(() => {
    return substitutions.filter((sub) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEkskul = (sub.extracurricular_name || '').toLowerCase().includes(q);
        const matchesOrig = (sub.original_staff_name || '').toLowerCase().includes(q);
        const matchesSub = (sub.substitute_staff_name || '').toLowerCase().includes(q);
        const matchesReason = (sub.reason || '').toLowerCase().includes(q);
        if (!matchesEkskul && !matchesOrig && !matchesSub && !matchesReason) return false;
      }
      return true;
    });
  }, [substitutions, searchQuery]);

  const columns: Column<TrainerSubstitution>[] = [
    {
      key: 'date',
      header: 'Tanggal & Ekskul',
      render: (sub) => (
        <div>
          <div className="font-bold text-xs text-purple-300">
            {sub.extracurricular_name}
          </div>
          <div className="font-mono text-[11px] text-zinc-400">
            {formatDateIndonesian(sub.date)}
          </div>
        </div>
      ),
    },
    {
      key: 'original_coach',
      header: 'Pelatih Asli',
      render: (sub) => (
        <span className="font-medium text-xs text-zinc-300">
          {sub.original_staff_name}
        </span>
      ),
    },
    {
      key: 'arrow',
      header: '',
      className: 'w-8 text-center',
      render: () => <ArrowRight className="w-3.5 h-3.5 text-cyan-400 mx-auto" />,
    },
    {
      key: 'substitute_coach',
      header: 'Pelatih Pengganti',
      render: (sub) => (
        <span className="font-bold text-xs text-cyan-300">
          {sub.substitute_staff_name}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Alasan Penugasan',
      render: (sub) => (
        <p className="text-xs text-zinc-300 max-w-xs truncate" title={sub.reason}>
          {sub.reason}
        </p>
      ),
    },
    {
      key: 'assigned_by',
      header: 'Ditugaskan Oleh',
      render: (sub) => (
        <span className="text-xs text-zinc-400">{sub.assigned_by}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Delegasi Resmi Pelatih Pengganti
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kelola penugasan pelatih/instruktur pengganti untuk sesi latihan ekstrakurikuler.
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
            variant="default"
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-600 text-white hover:bg-cyan-500 font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tugaskan Pelatih Pengganti
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama ekskul atau nama pelatih..."
          className="pl-9 text-xs"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="Memuat daftar delegasi pelatih pengganti..." />
      ) : filteredSubstitutions.length === 0 ? (
        <EmptyState
          title="Belum Ada Pelatih Pengganti"
          description={
            searchQuery
              ? 'Tidak ditemukan data delegasi yang cocok dengan pencarian Anda.'
              : 'Belum ada delegasi pelatih pengganti yang didaftarkan.'
          }
          actionLabel="Tugaskan Pelatih Pengganti"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <ResponsiveTable
          data={filteredSubstitutions}
          columns={columns}
          keyExtractor={(s) => s.id}
          renderMobileCard={(sub) => <TrainerSubstitutionCard substitution={sub} />}
        />
      )}

      {/* Modal */}
      <TrainerSubstitutionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessions={sessions}
        staffList={staffList}
        currentUser={currentUser}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          loadData();
        }}
      />
    </div>
  );
};
