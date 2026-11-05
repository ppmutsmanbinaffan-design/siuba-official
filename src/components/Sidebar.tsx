import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2,
  Wifi,
  MoreVertical,
  LogOut,
  Settings,
  User as UserIcon,
  Shield,
  X,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';
import { getVisibleNavigation } from '../config/navigationRegistry';
import { isDemoAuthEnabled } from '../utils/devTools';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  openSessionCount: number;
  pendingExcuseCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  isLoadingAuth?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  allUsers,
  openSessionCount,
  pendingExcuseCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
  isLoadingAuth = false,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format user initials
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const clean = name.replace(/^(Ustadz|Ustadzah|Dr\.|Drs\.|Ir\.|H\.|Hj\.)\s+/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format readable role label
  const formatRoleLabel = (role: string): string => {
    switch (role?.toLowerCase()) {
      case 'super-admin':
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrator';
      case 'pimpinan':
        return 'Pimpinan Pondok';
      case 'kepala-sekolah':
        return 'Kepala Sekolah';
      case 'kepala-asrama':
        return 'Kepala Asrama';
      case 'guru':
      case 'teacher':
        return 'Guru / Pengajar';
      case 'musyrif':
        return 'Musyrif Asrama';
      case 'pelatih':
        return 'Pelatih Ekskul';
      case 'petugas-absensi':
      case 'petugas-masjid':
        return 'Petugas Absensi';
      case 'operator':
        return 'Operator Sistem';
      case 'kesantrian':
        return 'Divisi Kesantrian';
      case 'academic':
        return 'Divisi Akademik';
      case 'panitia-psb':
      case 'panitia_psb':
      case 'panitia-ppdb':
      case 'panitia_ppdb':
        return 'Panitia PSB';
      default:
        return role ? role.charAt(0).toUpperCase() + role.slice(1).replace(/[-_]/g, ' ') : 'Pengguna';
    }
  };

  // Dynamic operational badges (Strictly functional, 0 sprint or version badges)
  const dynamicBadges: Record<string, string | undefined> = {
    'qr-scanner': openSessionCount > 0 ? '⚡ Scan' : undefined,
    sessions: openSessionCount > 0 ? `${openSessionCount} Aktif` : undefined,
    excuses: pendingExcuseCount > 0 ? `${pendingExcuseCount} Pending` : undefined,
  };

  // Filter navigation registry according to user's permissions
  const navSections = currentUser 
    ? getVisibleNavigation(currentUser, dynamicBadges)
    : [];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        id="sidebar-container"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-[#12372A] text-zinc-100 flex flex-col shrink-0 border-r border-[#1a4a39] shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Clean Brand Header (NO version badge) */}
        <div id="brand-header" className="p-4 border-b border-[#1a4a39] flex items-center justify-between bg-[#12372A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A227] flex items-center justify-center text-zinc-950 font-black shadow-md shadow-amber-500/20 shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-base text-white">SIUBA</span>
              </div>
              <p className="text-xs text-emerald-200/70 font-medium line-clamp-1">
                Pesantren Utsman Bin Affan
              </p>
            </div>
          </div>

          {/* Close Button on Mobile Drawer */}
          <button
            onClick={onCloseMobile}
            aria-label="Tutup Menu Navigasi"
            className="lg:hidden p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-[#1a4a39] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Local LAN Status Banner */}
        <div id="lan-status-badge" className="mx-3 my-2.5 p-2.5 rounded-xl bg-[#0e2c22] border border-[#1a4a39] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <div>
              <p className="font-semibold text-[11px] text-white">LAN Server 192.168.1.10</p>
              <p className="text-[10px] text-emerald-300/60">Offline-First Terhubung</p>
            </div>
          </div>
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Navigation List */}
        <div id="nav-list" className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-[#1a4a39]">
          {isLoadingAuth || !currentUser ? (
            // Skeleton loader during auth initialization to prevent showing unpermitted menu
            <div className="space-y-3 p-2">
              <div className="h-3 w-16 bg-[#1a4a39] rounded animate-pulse mb-3" />
              <div className="h-9 w-full bg-[#1a4a39]/60 rounded-xl animate-pulse" />
              <div className="h-9 w-full bg-[#1a4a39]/60 rounded-xl animate-pulse" />
              <div className="h-9 w-full bg-[#1a4a39]/60 rounded-xl animate-pulse" />
              <div className="h-3 w-20 bg-[#1a4a39] rounded animate-pulse mt-4 mb-3" />
              <div className="h-9 w-full bg-[#1a4a39]/60 rounded-xl animate-pulse" />
              <div className="h-9 w-full bg-[#1a4a39]/60 rounded-xl animate-pulse" />
            </div>
          ) : (
            navSections.map((section) => (
              <div key={section.category} className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300/50">
                  {section.category}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-btn-${item.id}`}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all min-h-[42px] cursor-pointer ${
                        isActive
                          ? 'bg-[#1F5C45] text-white font-bold shadow-xs border border-emerald-400/30'
                          : 'text-emerald-100/80 hover:bg-[#1a4a39] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EADAA2]' : 'text-emerald-300/70'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          isActive 
                            ? 'bg-[#12372A] text-[#EADAA2] border border-[#C9A227]/40' 
                            : 'bg-[#C9A227]/20 text-[#EADAA2] border border-[#C9A227]/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Minimal User Panel (Compact, Professional & Role-Aware) */}
        <div id="user-footer" ref={userMenuRef} className="p-3 border-t border-[#1a4a39] bg-[#0e2c22] relative">
          {currentUser ? (
            <>
              {/* Compact User Card */}
              <div 
                id="user-card-button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center justify-between p-2 rounded-xl bg-[#12372A]/70 hover:bg-[#12372A] border border-[#1a4a39] cursor-pointer transition-all min-h-[52px]"
                role="button"
                tabIndex={0}
                aria-label={`Akun pengguna: ${currentUser.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Initials Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#1F5C45] border border-emerald-400/30 text-emerald-100 font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                    {getInitials(currentUser.name)}
                  </div>
                  
                  {/* Name & Primary Role */}
                  <div className="min-w-0 flex-1">
                    <p 
                      className="text-xs font-bold text-white truncate leading-tight"
                      title={currentUser.name}
                    >
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-emerald-300/70 truncate capitalize mt-0.5">
                      {formatRoleLabel(currentUser.role)}
                    </p>
                  </div>
                </div>

                {/* Popover trigger icon */}
                <div className="p-1 rounded-lg text-emerald-300/60 hover:text-white shrink-0 ml-1">
                  <MoreVertical className="w-4 h-4" />
                </div>
              </div>

              {/* User Actions Popover Dropdown */}
              {isUserMenuOpen && (
                <div 
                  id="user-actions-popover"
                  className="absolute bottom-full left-3 right-3 mb-2 bg-[#12372A] border border-[#1a4a39] rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="px-3 py-2 border-b border-[#1a4a39] mb-1">
                    <p className="text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider">
                      Akun Terautentikasi
                    </p>
                    <p className="font-bold text-white truncate text-xs mt-0.5">{currentUser.name}</p>
                    <p className="text-[11px] text-emerald-300/80 capitalize">{formatRoleLabel(currentUser.role)}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('settings');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-100 hover:bg-[#1F5C45] hover:text-white transition-all cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-emerald-300" />
                    <span>Pengaturan Akun</span>
                  </button>

                  {/* Dev-Only Role Switcher (Visible ONLY when VITE_ENABLE_DEMO_AUTH=true in DEV mode) */}
                  {isDemoAuthEnabled() && allUsers.length > 1 && (
                    <div className="pt-1 border-t border-[#1a4a39]/80 px-2 py-1">
                      <p className="text-[10px] font-semibold text-amber-300/70 mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-amber-400" />
                        <span>Dev Role Switcher</span>
                      </p>
                      <select
                        value={currentUser.id}
                        onChange={(e) => {
                          const found = allUsers.find((u) => u.id === Number(e.target.value));
                          if (found) {
                            setCurrentUser(found);
                            setIsUserMenuOpen(false);
                          }
                        }}
                        className="w-full bg-[#0e2c22] border border-[#1a4a39] text-white text-[11px] rounded-lg p-1.5 focus:outline-none"
                      >
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id} className="bg-[#12372A] text-white">
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {onLogout && (
                    <div className="pt-1 border-t border-[#1a4a39]">
                      <button
                        id="btn-user-popover-logout"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-all cursor-pointer text-left font-medium"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Keluar dari Akun</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-10 bg-[#1a4a39]/40 rounded-xl animate-pulse" />
          )}
        </div>
      </aside>
    </>
  );
};
