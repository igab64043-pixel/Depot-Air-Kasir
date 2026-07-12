/**
 * Sidebar — Navigasi utama aplikasi
 * Animasi slide dari kiri dengan overlay gelap
 * Item menu disaring berdasarkan role user
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const SIDEBAR_WIDTH = 260;

const MENU_ITEMS = [
  { nama: 'Beranda',    icon: 'home',          route: '/(main)/beranda',    roles: ['admin', 'kasir'] },
  { nama: 'Transaksi',  icon: 'receipt',       route: '/(main)/transaksi',  roles: ['admin', 'kasir'] },
  { nama: 'Riwayat',   icon: 'history',        route: '/(main)/riwayat',    roles: ['admin', 'kasir'] },
  { nama: 'Member',    icon: 'people',         route: '/(main)/member',     roles: ['admin', 'kasir'] },
  { nama: 'Laporan',   icon: 'bar-chart',      route: '/(main)/laporan',    roles: ['admin'] },
  { nama: 'Voucher',   icon: 'local-offer',    route: '/(main)/voucher',    roles: ['admin'] },
  { nama: 'Pengaturan',icon: 'settings',       route: '/(main)/pengaturan', roles: ['admin'] },
] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  function navigate(route: string) {
    onClose();
    router.replace(route as any);
  }

  async function handleLogout() {
    onClose();
    await logout();
    router.replace('/login');
  }

  const visibleItems = MENU_ITEMS.filter(item =>
    user ? item.roles.includes(user.role as any) : false
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <>
      {/* Overlay gelap */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Panel Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX }] }]}>
        {/* Header sidebar */}
        <View style={[styles.sidebarHeader, { paddingTop: topPad + 16 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialIcons name="water-drop" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logoTitle} numberOfLines={1}>KASIR DEPOT AIR</Text>
              <Text style={styles.logoSubtitle}>ISI ULANG</Text>
            </View>
          </View>
        </View>

        {/* Info user */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.nama ?? '-'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'Administrator' : 'Kasir'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Menu navigasi */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.menuSection}>
            <Text style={styles.menuLabel}>MENU</Text>
            {visibleItems.map((item) => {
              const isActive = pathname.includes(item.route.replace('/(main)/', ''));
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={20}
                    color={isActive ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                    {item.nama}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Tombol Logout */}
        <View style={[styles.sidebarFooter, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={20} color="#F87171" />
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 100,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#1E3A5F',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#162D4A',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    color: '#93C5FD',
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  roleBadge: {
    marginTop: 2,
    backgroundColor: '#243B55',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: '#93C5FD',
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#243B55',
    marginHorizontal: 16,
  },
  menuSection: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuLabel: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingBottom: 6,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: '#2563EB',
  },
  menuText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  menuTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#93C5FD',
  },
  sidebarFooter: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  logoutText: {
    color: '#F87171',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
