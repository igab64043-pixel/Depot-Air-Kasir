/**
 * AppHeader — Header atas setiap halaman
 * Tombol hamburger untuk buka sidebar, judul halaman, nama user
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';

type Props = {
  title: string;
  rightAction?: React.ReactNode;
};

export default function AppHeader({ title, rightAction }: Props) {
  const { openSidebar } = useSidebar();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad + 10 }]}>
      {/* Tombol hamburger */}
      <TouchableOpacity onPress={openSidebar} style={styles.menuBtn} activeOpacity={0.7}>
        <MaterialIcons name="menu" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Judul halaman */}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {/* Kanan: aksi kustom atau info user */}
      <View style={styles.rightSection}>
        {rightAction ?? (
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>
              {user?.role === 'admin' ? 'Admin' : 'Kasir'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  menuBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 4,
  },
  rightSection: {
    minWidth: 44,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  roleChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
