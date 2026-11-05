/**
 * SIUBA Design Tokens (v1.0.9)
 * Final Visual Stabilization & Layout Consistency
 * Islamic Pesantren Aesthetic: Clean Light Canvas (#F7F8F7), Pure White Cards (#FFFFFF),
 * Islamic Forest Green (#12372A / #1F5C45 / #2F7D5A), and Dignified Gold Accent (#C9A227).
 */

export const SIUBA_TOKENS = {
  colors: {
    primaryDarkGreen: '#12372A', // Sidebar & Deep Green Brand Header
    primary: '#1F5C45',          // Primary Actions & Buttons
    primaryMedium: '#2F7D5A',    // Highlights & Secondary Brand Elements
    primaryLight: '#E8F3EE',     // Subtle Green Tint
    goldAccent: '#C9A227',       // SIUBA Islamic Gold Accent
    goldHover: '#B28E1D',        // Gold hover state
    goldLight: '#FDF7E7',        // Subtle Gold Tint

    background: '#F7F8F7',       // Main App & Page Canvas
    surface: '#FFFFFF',          // Clean White Cards & Modals
    surfaceSubtle: '#F9FAFB',    // Secondary Surface / Table Headers
    border: '#E5E7EB',           // Crisp Standard Dividers & Card Outlines
    borderStrong: '#D1D5DB',     // Input & Active Control Borders

    textPrimary: '#1F2937',      // High-contrast primary typography
    textSecondary: '#6B7280',    // Clean secondary labels & descriptions
    textMuted: '#9CA3AF',        // Watermarks & placeholder typography

    semantic: {
      success: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      },
      warning: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      },
      danger: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      },
      info: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
      },
      neutral: {
        bg: 'bg-zinc-100',
        text: 'text-zinc-700',
        border: 'border-zinc-200',
        dot: 'bg-zinc-400',
      },
      gold: {
        bg: 'bg-[#FDF7E7]',
        text: 'text-[#927318]',
        border: 'border-[#EADAA2]',
        dot: 'bg-[#C9A227]',
      },
    },
  },
  radii: {
    card: 'rounded-2xl',      // 16px
    modal: 'rounded-2xl',     // 16px
    button: 'rounded-xl',     // 12px
    input: 'rounded-xl',      // 12px
    badge: 'rounded-full',    // Pill standard
    avatar: 'rounded-xl',
  },
  spacing: {
    pagePaddingMobile: 'p-3.5',
    pagePaddingTablet: 'p-5',
    pagePaddingDesktop: 'p-6 lg:p-8',
    fieldGap: 'space-y-4',
    sectionGap: 'space-y-6',
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
} as const;

