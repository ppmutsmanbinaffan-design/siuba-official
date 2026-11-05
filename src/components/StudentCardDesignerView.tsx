import React from 'react';
import { 
  Student, 
  Classroom, 
  Dormitory, 
  DormitoryRoom 
} from '../types';
import { StudentCardHubPage } from '../features/student-card';

export interface StudentCardDesignerViewProps {
  students: Student[];
  classrooms: Classroom[];
  dormitories: Dormitory[];
  dormitoryRooms: DormitoryRoom[];
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentCardDesignerView: React.FC<StudentCardDesignerViewProps> = ({
  students,
  classrooms,
  dormitories,
  dormitoryRooms,
  onShowToast,
}) => {
  return (
    <StudentCardHubPage
      students={students}
      classrooms={classrooms}
      dormitories={dormitories}
      dormitoryRooms={dormitoryRooms}
      onShowToast={onShowToast}
    />
  );
};
