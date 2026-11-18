import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { staffApi } from '../api/staffApi';
import { StaffForm, StaffFormData } from '../components/StaffForm';
import { NewAccountNotice, NewAccountInfo } from '../components/NewAccountNotice';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export interface StaffCreatePageProps {
  onNavigateBack: () => void;
  onSuccess: (staffId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StaffCreatePage: React.FC<StaffCreatePageProps> = ({
  onNavigateBack,
  onSuccess,
  onShowToast,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState<{ staffId: number; staffName: string; account: NewAccountInfo } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    staffApi.getUsers().then(setUsers).catch(() => {});
  }, []);

  const handleSubmit = async (formData: StaffFormData) => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const created = await staffApi.createStaff({
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
        user_id: formData.account_mode === 'link' ? formData.user_id : null,
        rfid_uid: formData.rfid_uid,
        photo: formData.photo,
        create_account: formData.account_mode === 'create',
        account_username: formData.account_mode === 'create' ? formData.account_username : undefined,
        account_role: formData.account_mode === 'create' ? formData.account_role : undefined,
      });

      onShowToast(`SDM "${created.name}" berhasil didaftarkan.`, 'success');
      const acc = (created as any).new_account as NewAccountInfo | undefined;
      if (acc) setNewAccount({ staffId: created.id, staffName: created.name, account: acc });
      else onSuccess(created.id);
    } catch (err: any) {
      const fieldErrs = err?.fieldErrors && Object.keys(err.fieldErrors).length ? err.fieldErrors : err?.errors;
      if (err.status === 422 && fieldErrs) {
        setErrors(fieldErrs);
        onShowToast('Mohon periksa kembali isian formulir SDM.', 'error');
      } else {
        onShowToast(err.message || 'Gagal mendaftarkan data SDM.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Tambah SDM Baru"
        subtitle="Daftarkan ustadz, guru, musyrif, atau staff baru ke sistem master pesantren."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onNavigateBack}
          >
            Kembali
          </Button>
        }
      />

      <StaffForm
        users={users}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={onNavigateBack}
        errors={errors}
      />
      {newAccount && (
        <NewAccountNotice staffName={newAccount.staffName} account={newAccount.account}
          onClose={() => { const id = newAccount.staffId; setNewAccount(null); onSuccess(id); }} />
      )}
    </div>
  );
};
