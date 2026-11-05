import React, { useState } from 'react';
import { Sidebar } from '../Sidebar';
import { TopHeader } from '../TopHeader';
import { ToastProvider } from '../ui/Toast';
import { User } from '../../types';

export interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTabTitle: string;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  openSessionCount: number;
  pendingExcuseCount?: number;
  simulatedTime: string;
  setSimulatedTime: (time: string) => void;
  onResetData: () => void;
  onOpenSyncCenter?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  activeTabTitle,
  currentUser,
  setCurrentUser,
  allUsers,
  openSessionCount,
  pendingExcuseCount = 0,
  simulatedTime,
  setSimulatedTime,
  onResetData,
  onOpenSyncCenter,
  children,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#F7F8F7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans antialiased">
        {/* Responsive Sidebar (Fixed Drawer on Mobile, Sticky on Desktop) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          allUsers={allUsers}
          openSessionCount={openSessionCount}
          pendingExcuseCount={pendingExcuseCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area - Critical CSS: min-w-0 to prevent horizontal overflow */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Navbar */}
          <TopHeader
            activeTabTitle={activeTabTitle}
            currentUser={currentUser}
            simulatedTime={simulatedTime}
            setSimulatedTime={setSimulatedTime}
            onResetData={onResetData}
            onOpenSyncCenter={onOpenSyncCenter}
            onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          {/* Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto bg-[#F7F8F7] dark:bg-zinc-950 min-w-0 pb-12">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};
