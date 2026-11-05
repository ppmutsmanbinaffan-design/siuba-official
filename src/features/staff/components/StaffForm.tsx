import React, { useState, useEffect, useRef } from 'react';
import { Staff, StaffType, StaffEmploymentStatus, User } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { PersonAvatar } from '../../../components/common/PersonAvatar';
import { 
  User as UserIcon, 
  Briefcase, 
  Phone, 
  Mail, 
  Upload, 
  Check, 
  X, 
  ShieldCheck, 
  Radio, 
  Clock 
} from 'lucide-react';

export interface StaffFormData {
  staff_number: string;
  name: string;
  gender: 'male' | 'female' | 'L' | 'P';
  staff_type: StaffType;
  employment_status: StaffEmploymentStatus;
  phone: string;
  email: string;
  department: string;
  position: string;
  join_date: string;
  requires_daily_attendance: boolean;
  is_active: boolean;
  user_id: number | null;
  rfid_uid: string;
  photo?: string;
}

export interface StaffFormProps {
  initialData?: Partial<Staff>;
  users: User[];
  isSubmitting?: boolean;
  onSubmit: (formData: StaffFormData) => Promise<void>;
  onCancel: () => void;
  errors?: Record<string, string[]>;
}

export const StaffForm: React.FC<StaffFormProps> = ({
  initialData,
  users,
  isSubmitting = false,
  onSubmit,
  onCancel,
  errors = {},
}) => {
  const isEdit = Boolean(initialData?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<StaffFormData>({
    staff_number: initialData?.staff_number || '',
    name: initialData?.name || '',
    gender: (initialData?.gender as any) || 'male',
    staff_type: initialData?.staff_type || 'teacher',
    employment_status: initialData?.employment_status || 'permanent',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    department: initialData?.department || '',
    position: initialData?.position || '',
    join_date: initialData?.join_date || new Date().toISOString().substring(0, 10),
    requires_daily_attendance: initialData?.requires_daily_attendance !== undefined ? initialData.requires_daily_attendance : true,
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    user_id: initialData?.user_id ?? null,
    rfid_uid: initialData?.rfid_uid || '',
    photo: initialData?.photo || '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.photo || '');

  useEffect(() => {
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

  const handleChange = (field: keyof StaffFormData, value: any) => {
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
    if (!formData.name.trim()) errs.name = 'Nama lengkap SDM wajib diisi.';
    if (!formData.staff_number.trim()) errs.staff_number = 'Nomor SDM / NIP wajib diisi.';
    if (!formData.phone.trim()) errs.phone = 'Nomor HP / WhatsApp wajib diisi.';

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
      {/* 1. Identitas Pribadi */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Identitas Pribadi SDM</h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Data identitas pengajar, musyrif, atau staff pesantren.</p>
          </div>
        </div>

        {/* Photo Upload preview */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700">
          <PersonAvatar
            name={formData.name || 'SDM'}
            photoUrl={photoPreview}
            gender={formData.gender}
            size="xl"
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Foto Resmi SDM
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Format JPG atau PNG, rasio pas foto resmi. Maksimal 2MB.
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
            label="Nomor SDM / NIP"
            required
            value={formData.staff_number}
            onChange={(e) => handleChange('staff_number', e.target.value)}
            placeholder="Contoh: STF260001 / NIPY202001"
            error={fieldErrors.staff_number}
            helperText="Nomor induk unik resmi pengajar atau staff."
          />

          <Input
            label="Nama Lengkap & Gelar"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Contoh: Ustadz Dr. Muhammad Rasyid, Lc., M.Pd"
            error={fieldErrors.name}
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
            label="No. WhatsApp / HP"
            required
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="081234567890"
            error={fieldErrors.phone}
          />

          <Input
            label="Email Resmi / Pribadi"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="nama@pesantren.id"
            error={fieldErrors.email}
          />
        </div>
      </div>

      {/* 2. Kepegawaian & Penugasan */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Kepegawaian & Penugasan</h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Struktur divisi, tipe jabatan, dan aturan presensi harian.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipe SDM"
            required
            value={formData.staff_type}
            onChange={(e) => handleChange('staff_type', e.target.value as StaffType)}
            options={[
              { value: 'teacher', label: 'Guru / Ustadz Pengajar' },
              { value: 'musyrif', label: 'Musyrif / Pembina Asrama' },
              { value: 'trainer', label: 'Pelatih Ekstrakurikuler' },
              { value: 'general_staff', label: 'Staff Administrasi / TU' },
              { value: 'security', label: 'Petugas Keamanan / Security' },
              { value: 'cleaning', label: 'Petugas Kebersihan' },
            ]}
            error={fieldErrors.staff_type}
          />

          <Select
            label="Status Kepegawaian"
            required
            value={formData.employment_status}
            onChange={(e) => handleChange('employment_status', e.target.value as StaffEmploymentStatus)}
            options={[
              { value: 'permanent', label: 'Pegawai Tetap' },
              { value: 'contract', label: 'Kontrak' },
              { value: 'honorary', label: 'Honorer' },
              { value: 'internship', label: 'Magang' },
            ]}
            error={fieldErrors.employment_status}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Departemen / Unit"
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            placeholder="Contoh: Kepengasuhan / TIK"
            error={fieldErrors.department}
          />

          <Input
            label="Jabatan / Posisi"
            value={formData.position}
            onChange={(e) => handleChange('position', e.target.value)}
            placeholder="Contoh: Kepala Asrama / Guru Fiqih"
            error={fieldErrors.position}
          />

          <Input
            label="Tanggal Bergabung"
            type="date"
            value={formData.join_date}
            onChange={(e) => handleChange('join_date', e.target.value)}
            error={fieldErrors.join_date}
          />
        </div>

        {/* Attendance requirement toggle & Active toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.requires_daily_attendance}
              onChange={(e) => handleChange('requires_daily_attendance', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
            />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Wajib Presensi Harian
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                SDM ini memiliki kewajiban check-in & check-out kerja harian.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
            />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Status SDM Aktif
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                SDM aktif dapat mengajar, ditugaskan jadwal, dan absen di gerbang/kantor.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 3. Akun Sistem & Kredensial */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Akun Sistem & Kredensial</h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Tautkan akun login SIUBA dan kartu RFID untuk tapping.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tautkan Akun Pengguna (Login)"
            value={formData.user_id ? String(formData.user_id) : ''}
            onChange={(e) => handleChange('user_id', e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: '-- Belum Ditautkan Akun --' },
              ...users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email}) - [${u.role}]` })),
            ]}
            error={fieldErrors.user_id}
            helperText="Memungkinkan staff login ke aplikasi SIUBA."
          />

          <Input
            label="RFID Card UID"
            value={formData.rfid_uid}
            onChange={(e) => handleChange('rfid_uid', e.target.value)}
            placeholder="Contoh: STF-E20011"
            icon={<Radio className="w-4 h-4 text-zinc-400" />}
            error={fieldErrors.rfid_uid}
            helperText="Nomor UID kartu RFID fisik staff."
          />
        </div>
      </div>

      {/* Action Buttons */}
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
          {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan SDM' : 'Tambah SDM'}
        </Button>
      </div>
    </form>
  );
};
