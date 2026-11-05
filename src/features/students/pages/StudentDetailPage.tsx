import React, { useState, useEffect } from 'react';
import { Student, UserRole } from '../../../types';
import { studentApi } from '../api/studentApi';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { DetailSection, DetailField } from '../../../components/common/DetailField';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { 
  ArrowLeft, 
  Edit3, 
  User, 
  BookOpen, 
  Home, 
  Phone, 
  Calendar, 
  CreditCard, 
  QrCode, 
  Radio, 
  Clock, 
  ShieldCheck, 
  Printer, 
  AlertCircle 
} from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';
import { authService } from '../../../services/authService';

export interface StudentDetailPageProps {
  studentId: number;
  userRole?: UserRole;
  userPermissions?: string[];
  onNavigateBack: () => void;
  onNavigateEdit: (studentId: number) => void;
  onNavigateCardPrint?: (studentId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({
  studentId,
  userRole,
  userPermissions,
  onNavigateBack,
  onNavigateEdit,
  onNavigateCardPrint,
  onShowToast,
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'attendance' | 'card'>('profile');

  const currentUser = authService.getState().user;
  const effectivePermissions = userPermissions || currentUser?.permissions;
  const effectiveRole = userRole || currentUser?.role;
  const canEdit = hasPermission(effectiveRole, 'students.update', effectivePermissions) || hasPermission(effectiveRole, 'students.edit', effectivePermissions);
  const canPrintCard = hasPermission(effectiveRole, 'students.cards', effectivePermissions);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    studentApi
      .getStudentById(studentId)
      .then((data) => {
        if (isMounted) setStudent(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Data santri tidak ditemukan.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12">
        <LoadingState message="Memuat detail profil santri..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Data Santri Tidak Ditemukan</h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{error || 'ID santri tidak valid atau telah dihapus.'}</p>
        </div>
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />} onClick={onNavigateBack}>
          Kembali ke Daftar Santri
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Summary */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <PersonAvatar
              name={student.name}
              photoUrl={student.photo}
              gender={student.gender}
              size="xl"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {student.name}
                </h1>
                <StatusBadge status={student.status} type="student" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mt-1 font-mono">
                <span>NIS: {student.student_number}</span>
                {student.nisn && (
                  <>
                    <span>•</span>
                    <span>NISN: {student.nisn}</span>
                  </>
                )}
                <span>•</span>
                <span className="font-sans font-medium text-emerald-700 dark:text-emerald-400">
                  {student.classroom_name || 'Tanpa Kelas'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={onNavigateBack}
            >
              Kembali
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1 sm:flex-none"
                icon={<Edit3 className="w-4 h-4" />}
                onClick={() => onNavigateEdit(student.id)}
              >
                Edit Santri
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil Lengkap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'academic'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Akademik & Asrama</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'card'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Kartu & Identitas</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Profil Lengkap */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <DetailSection title="Data Pribadi Santri" icon={<User className="w-4 h-4" />}>
            <DetailField label="Nama Lengkap" value={student.name} copyable />
            <DetailField label="Nama Panggilan" value={student.nickname} />
            <DetailField label="Nomor Induk Santri (NIS)" value={student.student_number} copyable />
            <DetailField label="NISN" value={student.nisn} copyable />
            <DetailField
              label="Jenis Kelamin"
              value={
                student.gender === 'male' || student.gender === 'L'
                  ? 'Laki-laki (Ikhwan)'
                  : 'Perempuan (Akhwat)'
              }
            />
            <DetailField
              label="Tempat & Tanggal Lahir"
              value={`${student.birth_place || '-'}, ${student.birth_date || '-'}`}
            />
          </DetailSection>

          <DetailSection title="Orang Tua / Wali & Domisili" icon={<Phone className="w-4 h-4" />}>
            <DetailField label="Nama Orang Tua / Wali" value={student.guardian_name} />
            <DetailField
              label="No. WhatsApp / HP Wali"
              value={student.guardian_phone}
              copyable
              copyValue={student.guardian_phone}
            />
            <DetailField
              label="Alamat Asal Santri"
              value={student.address}
              className="sm:col-span-2"
            />
          </DetailSection>
        </div>
      )}

      {/* Tab 2: Akademik & Asrama */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <DetailSection title="Penempatan Kelas & Asrama" icon={<BookOpen className="w-4 h-4" />}>
            <DetailField label="Kelas Saat Ini" value={student.classroom_name || 'Belum ditentukan'} />
            <DetailField label="Kamar Asrama" value={student.dormitory_room_name || 'Belum ditentukan'} />
            <DetailField label="Tahun Angkatan" value={student.generation_year} />
            <DetailField label="Tahun Masuk" value={student.entry_year} />
            <DetailField label="Status Santri" value={<StatusBadge status={student.status} type="student" />} />
            <DetailField
              label="Terakhir Diperbarui"
              value={student.updated_at ? new Date(student.updated_at).toLocaleString('id-ID') : '-'}
            />
          </DetailSection>
        </div>
      )}

      {/* Tab 3: Kartu & Identitas RFID / QR */}
      {activeTab === 'card' && (
        <div className="space-y-6">
          <DetailSection
            title="Kartu Digital & Identitas Tap"
            description="Kredensial identifikasi santri pada scanner gerbang, asrama, dan ruang kelas."
            icon={<CreditCard className="w-4 h-4" />}
            action={
              canPrintCard && onNavigateCardPrint ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => onNavigateCardPrint(student.id)}
                >
                  Cetak Kartu
                </Button>
              ) : undefined
            }
          >
            <DetailField
              label="RFID Card UID"
              value={student.rfid_uid ? student.rfid_uid : 'Belum Ditautkan'}
              copyable={Boolean(student.rfid_uid)}
              icon={<Radio className="w-3.5 h-3.5" />}
            />
            <DetailField
              label="QR Code Identitas Token"
              value={
                student.qr_token
                  ? `${student.qr_token.slice(0, 4)}••••${student.qr_token.slice(-3)}`
                  : 'Belum Digenerate'
              }
              badge={
                student.qr_token ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Aktif
                  </span>
                ) : undefined
              }
              icon={<QrCode className="w-3.5 h-3.5" />}
            />
          </DetailSection>
        </div>
      )}
    </div>
  );
};
