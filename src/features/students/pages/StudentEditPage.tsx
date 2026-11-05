import React, { useState, useEffect } from 'react';
import { Student, Classroom, DormitoryRoom } from '../../../types';
import { studentApi } from '../api/studentApi';
import { StudentForm, StudentFormData } from '../components/StudentForm';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export interface StudentEditPageProps {
  studentId: number;
  onNavigateBack: () => void;
  onSuccess: (studentId: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const StudentEditPage: React.FC<StudentEditPageProps> = ({
  studentId,
  onNavigateBack,
  onSuccess,
  onShowToast,
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [dormitoryRooms, setDormitoryRooms] = useState<DormitoryRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      studentApi.getStudentById(studentId),
      studentApi.getClassrooms(),
      studentApi.getDormitoryRooms(),
    ])
      .then(([studentData, classData, roomData]) => {
        if (isMounted) {
          setStudent(studentData);
          setClassrooms(classData);
          setDormitoryRooms(roomData);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Gagal memuat data santri.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const handleSubmit = async (formData: StudentFormData) => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const updated = await studentApi.updateStudent(studentId, {
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

      onShowToast(`Perubahan data santri "${updated.name}" berhasil disimpan.`, 'success');
      onSuccess(updated.id);
    } catch (err: any) {
      if (err.status === 422 && err.errors) {
        setErrors(err.errors);
        onShowToast('Mohon periksa kembali isian formulir santri.', 'error');
      } else {
        onShowToast(err.message || 'Gagal menyimpan perubahan santri.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 max-w-4xl mx-auto">
        <LoadingState message="Memuat formulir edit santri..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center space-y-4 max-w-4xl mx-auto">
        <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Data Santri Gagal Dimuat</h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{error || 'Santri tidak ditemukan.'}</p>
        </div>
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />} onClick={onNavigateBack}>
          Kembali ke Daftar Santri
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Edit Santri: ${student.name}`}
        subtitle="Perbarui identitas, penempatan kelas/asrama, atau kontak wali santri."
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

      <StudentForm
        initialData={student}
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
