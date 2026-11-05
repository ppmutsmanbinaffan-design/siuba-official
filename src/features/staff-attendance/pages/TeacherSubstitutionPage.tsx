import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  RefreshCw, 
  Search, 
  BookOpen, 
  ArrowRight, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { User, Staff, AcademicSubstitution, TeachingSession } from '../../../types';
import { StaffAttendanceApi } from '../api/staffAttendanceApi';
import { TeacherSubstitutionCard } from '../components/TeacherSubstitutionCard';
import { TeacherSubstitutionModal } from '../components/TeacherSubstitutionModal';
import { ResponsiveTable, Column } from '../../../components/ui/ResponsiveTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState, EmptyState } from '../../../components/ui/LoadingState';
import { formatDateIndonesian } from '../utils/staffAttendanceUtils';

interface TeacherSubstitutionPageProps {
  currentUser: User;
  staffList: Staff[];
  onNavigate: (view: string, params?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeacherSubstitutionPage: React.FC<TeacherSubstitutionPageProps> = ({
  currentUser,
  staffList,
  onNavigate,
  showToast,
}) => {
  const [substitutions, setSubstitutions] = useState<AcademicSubstitution[]>([]);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().substring(0, 10);
      const [subsRes, sessionsRes] = await Promise.all([
        StaffAttendanceApi.getTeacherSubstitutions(),
        StaffAttendanceApi.getTeachingSessions(today),
      ]);

      if (subsRes.data) setSubstitutions(subsRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
    } catch (err: any) {
      showToast('Gagal memuat data guru pengganti: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper map for staff names
  const staffMap = useMemo(() => {
    const map = new Map<number, string>();
    staffList.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [staffList]);

  // Filtered substitutions
  const filteredSubstitutions = useMemo(() => {
    return substitutions.filter((sub) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const origName = (staffMap.get(sub.original_teacher_id) || '').toLowerCase();
        const subName = (staffMap.get(sub.substitute_teacher_id) || '').toLowerCase();
        const reason = sub.reason.toLowerCase();
        if (!origName.includes(q) && !subName.includes(q) && !reason.includes(q)) return false;
      }
      return true;
    });
  }, [substitutions, searchQuery, staffMap]);

  const columns: Column<AcademicSubstitution>[] = [
    {
      key: 'date',
      header: 'Tanggal & Sesi',
      render: (sub) => (
        <div>
          <div className="font-mono text-xs font-bold text-zinc-200">
            {formatDateIndonesian(sub.date)}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">Jadwal #{sub.academic_schedule_id}</div>
        </div>
      ),
    },
    {
      key: 'original_teacher',
      header: 'Guru Utama',
      render: (sub) => (
        <span className="font-medium text-xs text-zinc-300">
          {staffMap.get(sub.original_teacher_id) || `Staf #${sub.original_teacher_id}`}
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
      key: 'substitute_teacher',
      header: 'Guru Pengganti',
      render: (sub) => (
        <span className="font-bold text-xs text-cyan-300">
          {staffMap.get(sub.substitute_teacher_id) || `Staf #${sub.substitute_teacher_id}`}
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
                Delegasi Resmi Guru Pengganti
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kelola penugasan guru pengganti untuk jadwal mengajar yang berhalangan hadir.
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
            Tugaskan Guru Pengganti
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama guru utama atau pengganti..."
          className="pl-9 text-xs"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState text="Memuat daftar penugasan guru pengganti..." />
      ) : filteredSubstitutions.length === 0 ? (
        <EmptyState
          title="Belum Ada Guru Pengganti"
          description={
            searchQuery
              ? 'Tidak ditemukan data penggantian yang cocok dengan pencarian Anda.'
              : 'Belum ada penugasan guru pengganti yang didaftarkan.'
          }
          actionLabel="Tugaskan Guru Pengganti"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <ResponsiveTable
          data={filteredSubstitutions}
          columns={columns}
          keyExtractor={(s) => s.id}
          renderMobileCard={(sub) => (
            <TeacherSubstitutionCard
              substitution={sub}
              originalTeacherName={staffMap.get(sub.original_teacher_id)}
              substituteTeacherName={staffMap.get(sub.substitute_teacher_id)}
            />
          )}
        />
      )}

      {/* Substitution Form Modal */}
      <TeacherSubstitutionModal
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
