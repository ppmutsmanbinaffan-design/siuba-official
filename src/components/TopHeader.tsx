import React, { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff, Shield, Server, Bell, RefreshCw, Smartphone, Menu, LogOut } from 'lucide-react';
import { User, ServerConnectivityState } from '../types';
import { ServerConnectivityService } from '../services/serverConnectivityService';
import { OfflineStorageService } from '../services/offlineStorageService';

interface TopHeaderProps {
  activeTabTitle: string;
  currentUser: User;
  simulatedTime: string;
  setSimulatedTime: (time: string) => void;
  onResetData?: () => void;
  onOpenSyncCenter?: () => void;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTabTitle,
  currentUser,
  simulatedTime,
  setSimulatedTime,
  onResetData,
  onOpenSyncCenter,
  onToggleSidebar,
  onLogout,
}) => {
  const [currentClock, setCurrentClock] = useState<string>('');
  const [serverState, setServerState] = useState<ServerConnectivityState>('SERVER_ONLINE');
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentClock(timeStr);
      const pendingRecords = OfflineStorageService.getPendingRecords() || [];
      const pending = Array.isArray(pendingRecords)
        ? pendingRecords.filter(p => p && (p.sync_status === 'pending' || p.sync_status === 'syncing')).length
        : 0;
      setPendingCount(pending);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const unsubscribe = ServerConnectivityService.subscribe((state) => {
      setServerState(state);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <header id="top-header" className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3.5 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-10">
      {/* Left Title & Status + Hamburger */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {onToggleSidebar && (
          <button
            id="btn-toggle-sidebar-mobile"
            onClick={onToggleSidebar}
            aria-label="Buka Menu"
            className="lg:hidden p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5 text-[#1F5C45] dark:text-[#2F7D5A]" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
            {activeTabTitle}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:flex items-center gap-1.5 font-medium truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-[#1F5C45] shrink-0"></span>
            <span>Sistem Absensi Santri Pesantren &bull; PWA & Offline Sync Ready</span>
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* PWA / Sync Status Pill */}
        {onOpenSyncCenter && (
          <button
            id="btn-header-sync-status"
            onClick={onOpenSyncCenter}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all min-h-[40px] cursor-pointer ${
              serverState === 'SERVER_ONLINE'
                ? pendingCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
            }`}
            title="Klik untuk membuka Pusat Sinkronisasi & PWA"
          >
            {serverState === 'SERVER_ONLINE' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">LAN Server</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                    ⟳ {pendingCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="font-bold text-[11px]">Offline</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </>
            )}
          </button>
        )}

        {/* Timezone Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-[#1F5C45] dark:text-[#2F7D5A]" />
          <div>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{currentClock || '04:25:00'} WIB</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-1 font-medium">(Asia/Jakarta)</span>
          </div>
        </div>

        {/* Current Role Badge & Logout */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-xl bg-[#1F5C45] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left mr-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none truncate max-w-[100px]">{currentUser.name}</p>
            <p className="text-[10px] text-[#1F5C45] dark:text-[#2F7D5A] font-semibold leading-tight mt-0.5">{currentUser.role}</p>
          </div>

          {onLogout && (
            <button
              id="btn-header-logout"
              onClick={onLogout}
              title="Keluar dari akun"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all text-xs font-semibold min-h-[40px] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


