import React, { useState, useEffect } from 'react';
import { Staff, UserRole } from '../../../types';
import { staffApi } from '../api/staffApi';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { DetailSection, DetailField } from '../../../components/common/DetailField';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { 
  ArrowLeft, 
  Edit3, 
  User as UserIcon, 
  Briefcase, 
  Phone, 
  Calendar, 
  CreditCard, 
  QrCode, 
  Radio, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  Mail
} from 'lucide-react';
import { hasPermission } from '../../../components/auth/PermissionGuard';

export interface StaffDetailPageProps {
  staffId: number;
  userRole?: UserRole;
  onNavigateBack: () => void;
  onNavigateEdit: (staffId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const staffTypeLabelMap: Record<string, string> = {
  teacher: 'Guru / Ustadz Pengajar',
  musyrif: 'Musyrif / Pembina Asrama',
  trainer: 'Pelatih Ekstrakurikuler',
  general_staff: 'Staff Administrasi / TU',
  security: 'Petugas Keamanan / Security',
  cleaning: 'Petugas Kebersihan',
};

const employmentStatusLabelMap: Record<string, string> = {
  permanent: 'Pegawai Tetap (PNS/Yayasan)',
  contract: 'Pegawai Kontrak',
  honorary: 'Guru / Pegawai Honorer',
  internship: 'Magang / Praktikan',
};

export const StaffDetailPage: React.FC<StaffDetailPageProps> = ({
  staffId,
  userRole,
  onNavigateBack,
  onNavigateEdit,
  onShowToast,
}) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'employment' | 'credentials'>('profile');

  const canEdit = hasPermission(userRole, 'staff.edit');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    staffApi
      .getStaffById(staffId)
      .then((data) => {
        if (isMounted) setStaff(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Data SDM tidak ditemukan.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12">
        <LoadingState message="Memuat detail profil SDM..." />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Data SDM Tidak Ditemukan</h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{error || 'ID SDM tidak valid atau telah dihapus.'}</p>
        </div>
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />} onClick={onNavigateBack}>
          Kembali ke Daftar SDM
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
              name={staff.name}
              photoUrl={staff.photo}
              gender={staff.gender}
              size="xl"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {staff.name}
                </h1>
                <StatusBadge status={Boolean(staff.is_active)} type="staff" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                <span className="font-mono font-semibold">NIP/Nomor: {staff.staff_number}</span>
                <span>•</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {staffTypeLabelMap[staff.staff_type] || staff.staff_type}
                </span>
                {staff.position && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-600 dark:text-zinc-400 truncate">{staff.position}</span>
                  </>
                )}
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
                onClick={() => onNavigateEdit(staff.id)}
              >
                Edit SDM
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
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
            <UserIcon className="w-4 h-4" />
            <span>Profil & Kontak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('employment')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'employment'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Kepegawaian & Tugas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'credentials'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Akun & Kredensial</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Profil & Kontak */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <DetailSection title="Data Pribadi SDM" icon={<UserIcon className="w-4 h-4" />}>
            <DetailField label="Nama Lengkap & Gelar" value={staff.name} copyable />
            <DetailField label="Nomor SDM / NIP" value={staff.staff_number} copyable />
            <DetailField
              label="Jenis Kelamin"
              value={
                staff.gender === 'male' || staff.gender === 'L'
                  ? 'Laki-laki (Ikhwan)'
                  : 'Perempuan (Akhwat)'
              }
            />
            <DetailField
              label="Status Keaktifan"
              value={<StatusBadge status={Boolean(staff.is_active)} type="staff" />}
            />
          </DetailSection>

          <DetailSection title="Kontak Resmi & Komunikasi" icon={<Phone className="w-4 h-4" />}>
            <DetailField
              label="No. WhatsApp / HP"
              value={staff.phone}
              copyable
              copyValue={staff.phone}
              icon={<Phone className="w-3.5 h-3.5" />}
            />
            <DetailField
              label="Email"
              value={staff.email || '-'}
              copyable={Boolean(staff.email)}
              icon={<Mail className="w-3.5 h-3.5" />}
            />
          </DetailSection>
        </div>
      )}

      {/* Tab 2: Kepegawaian & Tugas */}
      {activeTab === 'employment' && (
        <div className="space-y-6">
          <DetailSection title="Struktur Kepegawaian" icon={<Briefcase className="w-4 h-4" />}>
            <DetailField
              label="Tipe SDM"
              value={staffTypeLabelMap[staff.staff_type] || staff.staff_type}
            />
            <DetailField
              label="Status Kepegawaian"
              value={employmentStatusLabelMap[staff.employment_status] || staff.employment_status}
            />
            <DetailField label="Departemen / Divisi" value={staff.department || '-'} />
            <DetailField label="Jabatan Resmi" value={staff.position || '-'} />
            <DetailField label="Tanggal Mulai Bergabung" value={staff.join_date || '-'} />
            <DetailField
              label="Kewajiban Presensi Harian"
              value={
                staff.requires_daily_attendance ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <Clock className="w-3.5 h-3.5" /> Wajib Presensi Harian
                  </span>
                ) : (
                  <span className="text-zinc-600 dark:text-zinc-400">Berdasarkan Sesi Saja (Opsional Harian)</span>
                )
              }
            />
          </DetailSection>
        </div>
      )}

      {/* Tab 3: Akun & Kredensial */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          <DetailSection
            title="Akun Login & Kredensial Tap"
            description="Kredensial identifikasi dan hak akses sistem SIUBA."
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            <DetailField
              label="Akun Login Sistem"
              value={staff.user_id ? `User ID #${staff.user_id} (Ditautkan)` : 'Belum Ditautkan Akun Login'}
              badge={
                staff.user_id ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Tersambung
                  </span>
                ) : undefined
              }
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
            />
            <DetailField
              label="RFID Card UID"
              value={staff.rfid_uid || 'Belum Ditautkan Kartu'}
              copyable={Boolean(staff.rfid_uid)}
              icon={<Radio className="w-3.5 h-3.5" />}
            />
            <DetailField
              label="QR Code Identitas Token"
              value={
                staff.qr_token
                  ? `${staff.qr_token.slice(0, 4)}••••${staff.qr_token.slice(-3)}`
                  : 'Belum Digenerate'
              }
              icon={<QrCode className="w-3.5 h-3.5" />}
            />
          </DetailSection>
        </div>
      )}
    </div>
  );
};
