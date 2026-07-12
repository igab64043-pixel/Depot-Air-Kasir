/**
 * Design tokens — Kasir Depot Air Isi Ulang
 * Warna utama: #2563EB (Biru), Background: #F8FAFC
 */
const colors = {
  light: {
    // Brand utama
    primary: '#2563EB',
    primaryForeground: '#FFFFFF',
    primaryLight: '#EFF6FF',
    primaryDark: '#1D4ED8',
    primaryMuted: '#BFDBFE',

    // Permukaan layar
    background: '#F8FAFC',
    foreground: '#0F172A',
    card: '#FFFFFF',
    cardForeground: '#0F172A',

    // Sekunder
    secondary: '#F1F5F9',
    secondaryForeground: '#334155',

    // Redup/placeholder
    muted: '#F1F5F9',
    mutedForeground: '#64748B',

    // Status
    success: '#10B981',
    successLight: '#ECFDF5',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    destructive: '#EF4444',
    destructiveLight: '#FEF2F2',
    destructiveForeground: '#FFFFFF',
    info: '#3B82F6',
    infoLight: '#EFF6FF',

    // Sidebar (navy gelap)
    sidebar: '#1E3A5F',
    sidebarHeader: '#162D4A',
    sidebarForeground: '#E2E8F0',
    sidebarMuted: '#94A3B8',
    sidebarActiveBg: '#2563EB',
    sidebarBorder: '#243B55',

    // Border & input
    border: '#E2E8F0',
    input: '#CBD5E1',

    // Level member
    gold: '#F59E0B',
    goldLight: '#FEF3C7',
    silver: '#94A3B8',
    silverLight: '#F1F5F9',
    regular: '#64748B',
    regularLight: '#EFF6FF',

    // Legacy (untuk useColors hook)
    text: '#0F172A',
    tint: '#2563EB',
    accent: '#F1F5F9',
    accentForeground: '#1A1A1A',
  },
  radius: 10,
};

export default colors;
