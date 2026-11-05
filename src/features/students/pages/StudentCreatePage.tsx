import React, { useState, useEffect } from 'react';
import { Classroom, DormitoryRoom } from '../../../types';
import { studentApi } from '../api/studentApi';
import { StudentForm, StudentFormData } from '../components/StudentForm';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export interface StudentCreatePageProps {
  onNavigateBack: () => void;
  onSuccess: (studentId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StudentCreatePage: React.FC<StudentCreatePageProps> = ({
  onNavigateBack,
  onSuccess,
  onShowToast,
}) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [dormitoryRooms, setDormitoryRooms] = useState<DormitoryRoom[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    Promise.all([studentApi.getClassrooms(), studentApi.getDormitoryRooms()])
      .then(([classes, rooms]) => {
        setClassrooms(classes);
        setDormitoryRooms(rooms);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (formData: StudentFormData) => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const created = await studentApi.createStudent({
        student_number: formData.student_number,
        nisn: formData.nisn,
        name: formData.name,
        nickname: formData.nickname,
        gender: formData.gender,
        birth_place: formData.birth_place,
        birth_date: formData.birth_date,
        classroom_id: formData.classroom_id,
        dormitory_room_id: formData.dormitory_room_id,
        generation_year: formData.generation_year,
        entry_year: formData.entry_year,
        photo: formData.photo,
        guardian_name: formData.guardian_name,
        guardian_phone: formData.guardian_phone,
        address: formData.address,
        status: formData.status,
        rfid_uid: formData.rfid_uid,
      });

      onShowToast(`Santri "${created.name}" berhasil ditambahkan.`, 'success');
      onSuccess(created.id);
    } catch (err: any) {
      if (err.status === 422 && err.errors) {
        setErrors(err.errors);
        onShowToast('Mohon periksa kembali isian formulir santri.', 'error');
      } else {
        onShowToast(err.message || 'Gagal menambahkan data santri.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Tambah Santri Baru"
        subtitle="Daftarkan data santri baru ke dalam sistem master SIUBA."
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

      <StudentForm
        classrooms={classrooms}
        dormitoryRooms={dormitoryRooms}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={onNavigateBack}
        errors={errors}
      />
    </div>
  );
};
