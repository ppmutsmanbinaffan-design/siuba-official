import React from 'react';
import { Classroom, DormitoryRoom } from '../../../types';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { RotateCcw } from 'lucide-react';

export interface StudentFilterValues {
  status: string;
  classroom_id: string;
  dormitory_room_id: string;
  gender: string;
}

export interface StudentFiltersProps {
  filters: StudentFilterValues;
  classrooms: Classroom[];
  dormitoryRooms: DormitoryRoom[];
  onChange: (key: keyof StudentFilterValues, value: string) => void;
  onReset: () => void;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
  filters,
  classrooms,
  dormitoryRooms,
  onChange,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      <Select
        label="Status Santri"
        value={filters.status}
        onChange={(e) => onChange('status', e.target.value)}
        options={[
          { value: 'all', label: 'Semua Status' },
          { value: 'active', label: 'Aktif' },
          { value: 'inactive', label: 'Nonaktif' },
          { value: 'graduated', label: 'Lulus' },
          { value: 'transferred', label: 'Pindah' },
          { value: 'resigned', label: 'Keluar' },
        ]}
      />

      <Select
        label="Kelas"
        value={filters.classroom_id}
        onChange={(e) => onChange('classroom_id', e.target.value)}
        options={[
          { value: 'all', label: 'Semua Kelas' },
          ...classrooms.map((c) => ({ value: String(c.id), label: `${c.name} (${c.academic_year || '2026/2027'})` })),
        ]}
      />

      <Select
        label="Jenis Kelamin"
        value={filters.gender}
        onChange={(e) => onChange('gender', e.target.value)}
        options={[
          { value: 'all', label: 'Semua (Ikhwan & Akhwat)' },
          { value: 'male', label: 'Laki-laki (Ikhwan)' },
          { value: 'female', label: 'Perempuan (Akhwat)' },
        ]}
      />

      <Select
        label="Asrama / Kamar"
        value={filters.dormitory_room_id}
        onChange={(e) => onChange('dormitory_room_id', e.target.value)}
        options={[
          { value: 'all', label: 'Semua Kamar' },
          ...dormitoryRooms.map((r) => ({ value: String(r.id), label: `${r.name} (${r.dormitory_name})` })),
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
