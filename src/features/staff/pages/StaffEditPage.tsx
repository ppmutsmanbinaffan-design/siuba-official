import React, { useState, useEffect } from 'react';
import { Staff, User } from '../../../types';
import { staffApi } from '../api/staffApi';
import { StaffForm, StaffFormData } from '../components/StaffForm';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export interface StaffEditPageProps {
  staffId: number;
  onNavigateBack: () => void;
  onSuccess: (staffId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StaffEditPage: React.FC<StaffEditPageProps> = ({
  staffId,
  onNavigateBack,
  onSuccess,
  onShowToast,
}) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([staffApi.getStaffById(staffId), staffApi.getUsers()])
      .then(([staffData, userData]) => {
        if (isMounted) {
          setStaff(staffData);
          setUsers(userData);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Gagal memuat data SDM.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  const handleSubmit = async (formData: StaffFormData) => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const updated = await staffApi.updateStaff(staffId, {
        staff_number: formData.staff_number,
        name: formData.name,
        gender: formData.gender,
        staff_type: formData.staff_type,
        employment_status: formData.employment_status,
        phone: formData.phone,
        email: formData.email,
        department: formData.department,
        position: formData.position,
        join_date: formData.join_date,
        requires_daily_attendance: formData.requires_daily_attendance,
        is_active: formData.is_active,
        user_id: formData.user_id,
        rfid_uid: formData.rfid_uid,
        photo: formData.photo,
      });

      onShowToast(`Perubahan data SDM "${updated.name}" berhasil disimpan.`, 'success');
      onSuccess(updated.id);
    } catch (err: any) {
      if (err.status === 422 && err.errors) {
        setErrors(err.errors);
        onShowToast('Mohon periksa kembali isian formulir SDM.', 'error');
      } else {
        onShowToast(err.message || 'Gagal menyimpan perubahan SDM.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 max-w-4xl mx-auto">
        <LoadingState message="Memuat formulir edit SDM..." />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center space-y-4 max-w-4xl mx-auto">
        <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Data SDM Gagal Dimuat</h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{error || 'SDM tidak ditemukan.'}</p>
        </div>
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />} onClick={onNavigateBack}>
          Kembali ke Daftar SDM
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Edit SDM: ${staff.name}`}
        subtitle="Perbarui data identitas, status kepegawaian, jabatan, atau akun sistem."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onNavigateBack}
          >
            Batal & Kembali
          </Button>
        }
      />

      <StaffForm
        initialData={staff}
        users={users}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={onNavigateBack}
        errors={errors}
      />
    </div>
  );
};
