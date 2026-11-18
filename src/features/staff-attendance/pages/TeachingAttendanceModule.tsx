import React, { useCallback, useState } from 'react';
import { Staff, User } from '../../../types';
import { TeachingAttendancePage } from './TeachingAttendancePage';
import { TeachingSessionDetailPage } from './TeachingSessionDetailPage';
import { TeachingQrScannerPage } from './TeachingQrScannerPage';
import { TeacherSubstitutionPage } from './TeacherSubstitutionPage';

type TeachingView = 'teaching-attendance' | 'teaching-session-detail' | 'teaching-qr-scanner' | 'teacher-substitution';

interface TeachingAttendanceModuleProps {
  currentUser: User;
  staffList: Staff[];
}

/**
 * Presensi mengajar guru (KBM) — tahap 19.
 * Mengatur perpindahan antara daftar sesi, detail & jurnal, scanner QR guru, dan guru pengganti.
 */
export const TeachingAttendanceModule: React.FC<TeachingAttendanceModuleProps> = ({ currentUser, staffList }) => {
  const [view, setView] = useState<{ name: TeachingView; sessionId?: number }>({ name: 'teaching-attendance' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast((t) => (t && t.msg === msg ? null : t)), 5000);
  }, []);

  const onNavigate = useCallback((name: string, params?: any) => {
    setView({ name: name as TeachingView, sessionId: params?.sessionId ?? params?.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div id="teaching-attendance-module" className="space-y-4">
      {toast && (
        <div
          role="status"
          className={`px-4 py-3 rounded-2xl text-sm font-semibold border flex items-start justify-between gap-3 ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <span>{toast.msg}</span>
          <button type="button" onClick={() => setToast(null)} className="font-bold opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {view.name === 'teaching-attendance' && (
        <TeachingAttendancePage currentUser={currentUser} staffList={staffList} onNavigate={onNavigate} showToast={showToast} />
      )}
      {view.name === 'teaching-session-detail' && view.sessionId != null && (
        <TeachingSessionDetailPage
          sessionId={view.sessionId}
          currentUser={currentUser}
          staffList={staffList}
          onNavigate={onNavigate}
          showToast={showToast}
        />
      )}
      {view.name === 'teaching-qr-scanner' && view.sessionId != null && (
        <TeachingQrScannerPage sessionId={view.sessionId} currentUser={currentUser} onNavigate={onNavigate} showToast={showToast} />
      )}
      {view.name === 'teacher-substitution' && (
        <TeacherSubstitutionPage currentUser={currentUser} staffList={staffList} onNavigate={onNavigate} showToast={showToast} />
      )}
    </div>
  );
};
