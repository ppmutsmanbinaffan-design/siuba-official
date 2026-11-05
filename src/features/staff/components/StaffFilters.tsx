import React from 'react';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { RotateCcw } from 'lucide-react';

export interface StaffFilterValues {
  staff_type: string;
  employment_status: string;
  is_active: string;
}

export interface StaffFiltersProps {
  filters: StaffFilterValues;
  onChange: (key: keyof StaffFilterValues, value: string) => void;
  onReset: () => void;
}

export const StaffFilters: React.FC<StaffFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      <Select
        label="Tipe SDM"
        value={filters.staff_type}
        onChange={(e) => onChange('staff_type', e.target.value)}
        options={[
          { value: 'all', label: 'Semua Tipe SDM' },
          { value: 'teacher', label: 'Guru / Ustadz Pengajar' },
          { value: 'musyrif', label: 'Musyrif / Pembina Asrama' },
          { value: 'trainer', label: 'Pelatih Ekstrakurikuler' },
          { value: 'general_staff', label: 'Staff Administrasi / TU' },
          { value: 'security', label: 'Petugas Keamanan / Security' },
          { value: 'cleaning', label: 'Petugas Kebersihan' },
        ]}
      />

      <Select
        label="Status Kepegawaian"
        value={filters.employment_status}
        onChange={(e) => onChange('employment_status', e.target.value)}
        options={[
          { value: 'all', label: 'Semua Status Kepegawaian' },
          { value: 'permanent', label: 'Pegawai Tetap' },
          { value: 'contract', label: 'Kontrak' },
          { value: 'honorary', label: 'Honorer' },
          { value: 'internship', label: 'Magang' },
        ]}
      />

      <Select
        label="Status Keaktifan"
        value={filters.is_active}
        onChange={(e) => onChange('is_active', e.target.value)}
        options={[
          { value: 'all', label: 'Semua Status' },
          { value: 'true', label: 'Aktif' },
          { value: 'false', label: 'Nonaktif' },
        ]}
      />

      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onReset}
        >
          Reset Filter
        </Button>
      </div>
    </div>
  );
};
