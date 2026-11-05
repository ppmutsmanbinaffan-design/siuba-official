import React, { useState, useEffect, useRef } from 'react';
import { Student, StudentStatus, Classroom, DormitoryRoom } from '../../../types';
import { Input, Textarea } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { 
  User, 
  BookOpen, 
  Home, 
  Phone, 
  Camera, 
  Upload, 
  Check, 
  AlertCircle, 
  X,
  Sparkles
} from 'lucide-react';

export interface StudentFormData {
  student_number: string;
  nisn: string;
  name: string;
  nickname: string;
  gender: 'male' | 'female' | 'L' | 'P';
  birth_place: string;
  birth_date: string;
  classroom_id: number | null;
  dormitory_room_id: number | null;
  generation_year: number;
  entry_year: number;
  photo?: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
  status: StudentStatus;
  rfid_uid?: string;
}

export interface StudentFormProps {
  initialData?: Partial<Student>;
  classrooms: Classroom[];
  dormitoryRooms: DormitoryRoom[];
  isSubmitting?: boolean;
  onSubmit: (formData: StudentFormData) => Promise<void>;
  onCancel: () => void;
  errors?: Record<string, string[]>;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  initialData,
  classrooms,
  dormitoryRooms,
  isSubmitting = false,
  onSubmit,
  onCancel,
  errors = {},
}) => {
  const isEdit = Boolean(initialData?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<StudentFormData>({
    student_number: initialData?.student_number || '',
    nisn: initialData?.nisn || '',
    name: initialData?.name || '',
    nickname: initialData?.nickname || '',
    gender: (initialData?.gender as any) || 'male',
    birth_place: initialData?.birth_place || '',
    birth_date: initialData?.birth_date || '',
    classroom_id: initialData?.classroom_id || (classrooms[0]?.id ?? null),
    dormitory_room_id: initialData?.dormitory_room_id || (dormitoryRooms[0]?.id ?? null),
    generation_year: initialData?.generation_year || new Date().getFullYear(),
    entry_year: initialData?.entry_year || new Date().getFullYear(),
    photo: initialData?.photo || '',
    guardian_name: initialData?.guardian_name || '',
    guardian_phone: initialData?.guardian_phone || '',
    address: initialData?.address || '',
    status: initialData?.status || 'active',
    rfid_uid: initialData?.rfid_uid || '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.photo || '');

  useEffect(() => {
    // Map 422 backend error arrays to single field error messages
    const mapped: Record<string, string> = {};
    if (errors && typeof errors === 'object') {
      Object.entries(errors).forEach(([field, msgs]) => {
        if (Array.isArray(msgs) && msgs.length > 0) {
          mapped[field] = String(msgs[0]);
        } else if (typeof msgs === 'string') {
          mapped[field] = msgs;
        }
      });
    }
    setFieldErrors(mapped);
  }, [errors]);

  const handleChange = (field: keyof StudentFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: 'Ukuran foto maksimal 2MB.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      handleChange('photo', result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    handleChange('photo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateBasic = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Nama lengkap santri wajib diisi.';
    if (!formData.student_number.trim()) errs.student_number = 'NIS wajib diisi.';
    if (!formData.gender) errs.gender = 'Jenis kelamin wajib dipilih.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateBasic()) return;

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Identitas Santri */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Identitas Santri</h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Data pribadi dan nomor induk resmi santri.</p>
          </div>
        </div>

        {/* Photo Upload preview */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700">
          <PersonAvatar
            name={formData.name || 'Santri'}
            photoUrl={photoPreview}
            gender={formData.gender}
            size="xl"
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Foto Profil Santri
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Format JPG atau PNG, rasio 1:1 atau 3:4. Maksimal 2MB.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Pilih Foto
              </Button>
              {photoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 dark:text-rose-400"
                  icon={<X className="w-3.5 h-3.5" />}
                  onClick={handleRemovePhoto}
                >
                  Hapus
                </Button>
              )}
            </div>
            {fieldErrors.photo && (
              <p className="text-xs text-rose-700 dark:text-rose-300">{fieldErrors.photo}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="NIS (Nomor Induk Santri)"
            required
            value={formData.student_number}
            onChange={(e) => handleChange('student_number', e.target.value)}
            placeholder="Contoh: UBA260001"
            error={fieldErrors.student_number}
            helperText="Nomor induk unik resmi pesantren."
          />

          <Input
            label="NISN (Nasional)"
            value={formData.nisn}
            onChange={(e) => handleChange('nisn', e.target.value)}
            placeholder="Contoh: 0089123451"
            error={fieldErrors.nisn}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nama Lengkap"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nama lengkap sesuai ijazah/akta"
            error={fieldErrors.name}
          />

          <Input
            label="Nama Panggilan"
            value={formData.nickname}
            onChange={(e) => handleChange('nickname', e.target.value)}
            placeholder="Nama panggilan sehari-hari"
            error={fieldErrors.nickname}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Jenis Kelamin"
            required
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value as any)}
            options={[
              { value: 'male', label: 'Laki-laki (Ikhwan)' },
              { value: 'female', label: 'Perempuan (Akhwat)' },
            ]}
            error={fieldErrors.gender}
          />

          <Input
            label="Tempat Lahir"
            value={formData.birth_place}
            onChange={(e) => handleChange('birth_place', e.target.value)}
            placeholder="Kota kelahiran"
            error={fieldErrors.birth_place}
          />

          <Input
            label="Tanggal Lahir"
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleChange('birth_date', e.target.value)}
            error={fieldErrors.birth_date}
          />
        </div>
      </div>

      {/* 2. Penempatan Akademik & Asrama */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Akademik & Asrama</h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Penempatan kelas belajar, kamar asrama, dan status aktif.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Kelas"
            value={formData.classroom_id ? String(formData.classroom_id) : ''}
            onChange={(e) => handleChange('classroom_id', e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: '-- Belum Ditentukan --' },
              ...classrooms.map((c) => ({ value: String(c.id), label: `${c.name} (${c.academic_year || '2026/2027'})` })),
            ]}
            error={fieldErrors.classroom_id}
          />

          <Select
            label="Asrama / Kamar"
            value={formData.dormitory_room_id ? String(formData.dormitory_room_id) : ''}
            onChange={(e) => handleChange('dormitory_room_id', e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: '-- Belum Ditentukan --' },
              ...dormitoryRooms.map((r) => ({ value: String(r.id), label: `${r.name} (${r.dormitory_name})` })),
            ]}
            error={fieldErrors.dormitory_room_id}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Tahun Angkatan"
            type="number"
            value={formData.generation_year}
            onChange={(e) => handleChange('generation_year', Number(e.target.value))}
            error={fieldErrors.generation_year}
          />

          <Input
            label="Tahun Masuk"
            type="number"
            value={formData.entry_year}
            onChange={(e) => handleChange('entry_year', Number(e.target.value))}
            error={fieldErrors.entry_year}
          />

          <Select
            label="Status Santri"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as StudentStatus)}
            options={[
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Nonaktif' },
              { value: 'graduated', label: 'Lulus' },
              { value: 'transferred', label: 'Pindah' },
              { value: 'resigned', label: 'Keluar' },
            ]}
            error={fieldErrors.status}
          />
        </div>
      </div>

      {/* 3. Kontak & Wali */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Kontak & Orang Tua / Wali</h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Informasi wali untuk notifikasi presensi dan administrasi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nama Orang Tua / Wali"
            value={formData.guardian_name}
            onChange={(e) => handleChange('guardian_name', e.target.value)}
            placeholder="Nama ayah / ibu / wali santri"
            error={fieldErrors.guardian_name}
          />

          <Input
            label="No. WhatsApp / HP Wali"
            type="tel"
            value={formData.guardian_phone}
            onChange={(e) => handleChange('guardian_phone', e.target.value)}
            placeholder="081234567890"
            error={fieldErrors.guardian_phone}
            helperText="Nomor aktif untuk penerimaan laporan absensi."
          />
        </div>

        <Textarea
          label="Alamat Lengkap"
          rows={3}
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Alamat domisili asal santri (Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten)"
          error={fieldErrors.address}
        />
      </div>

      {/* Action Buttons: Desktop inline, Mobile sticky/full-width */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="w-full sm:w-auto"
          isLoading={isSubmitting}
          icon={<Check className="w-4 h-4" />}
        >
          {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Santri'}
        </Button>
      </div>
    </form>
  );
};
