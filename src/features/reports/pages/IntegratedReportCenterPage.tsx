import React, { useState, useEffect } from 'react';
import { 
  User, 
  AttendanceSession, 
  AttendanceSessionParticipant, 
  AttendanceRecord, 
  Student, 
  Classroom, 
  Activity, 
  ActivityCategory,
  AttendanceDevice,
  AttendanceDeviceLog
} from '../../../types';
import { ReportCategory } from '../types';
import { ReportHubPage } from './ReportHubPage';
import { StudentReportPage } from './StudentReportPage';
import { StaffDailyReportPage } from './StaffDailyReportPage';
import { TeachingReportPage } from './TeachingReportPage';
import { TrainingReportPage } from './TrainingReportPage';
import { AbsenceReportPage } from './AbsenceReportPage';
import { DeviceReportPage } from './DeviceReportPage';

interface Props {
  currentUser: User;
  initialCategory?: ReportCategory;
  initialFilters?: Record<string, any>;
  sessions: AttendanceSession[];
  participants: AttendanceSessionParticipant[];
  records: AttendanceRecord[];
  students: Student[];
  classrooms?: Classroom[];
  categories?: ActivityCategory[];
  activities?: Activity[];
  devices?: AttendanceDevice[];
  deviceLogs?: AttendanceDeviceLog[];
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const IntegratedReportCenterPage: React.FC<Props> = ({
  currentUser,
  initialCategory = 'hub',
  initialFilters = {},
  sessions = [],
  participants = [],
  records = [],
  students = [],
  classrooms = [],
  categories = [],
  activities = [],
  devices = [],
  deviceLogs = [],
  onShowToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(initialCategory);
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>(initialFilters);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setCurrentFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat as ReportCategory);
    setCurrentFilters({});
  };

  const handleBackToHub = () => {
    setActiveCategory('hub');
    setCurrentFilters({});
  };

  switch (activeCategory) {
    case 'student':
      return (
        <StudentReportPage
          currentUser={currentUser}
          sessions={sessions}
          participants={participants}
          records={records}
          students={students}
          classrooms={classrooms}
          categories={categories}
          activities={activities}
          initialFilters={currentFilters}
          onBackToHub={handleBackToHub}
          onShowToast={onShowToast}
        />
      );

    case 'sdm_daily':
      return (
        <StaffDailyReportPage
          currentUser={currentUser}
          initialFilters={currentFilters}
          onBackToHub={handleBackToHub}
          onShowToast={onShowToast}
        />
      );

    case 'teaching':
      return (
        <TeachingReportPage
          currentUser={currentUser}
          initialFilters={currentFilters}
          onBackToHub={handleBackToHub}
          onShowToast={onShowToast}
        />
      );

    case 'training':
      return (
        <TrainingReportPage
          currentUser={currentUser}
          initialFilters={currentFilters}
          onBackToHub={handleBackToHub}
          onShowToast={onShowToast}
        />
      );

    case 'absence':
      return (
        <AbsenceReportPage
          currentUser={currentUser}
          initialFilters={currentFilters}
          onBackToHub={handleBackToHub}
          onShowToast={onShowToast}
        />
      );

    case 'device':
      return (
        <DeviceReportPage
          currentUser={currentUser}
          devices={devices}
          deviceLogs={deviceLogs}
          initialFilters={currentFilters}
          onBackToHub={handleBackToHub}
          onShowToast={onShowToast}
        />
      );

    case 'hub':
    default:
      return (
        <ReportHubPage
          currentUser={currentUser}
          onSelectCategory={handleSelectCategory}
        />
      );
  }
};
