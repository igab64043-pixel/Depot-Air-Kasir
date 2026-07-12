/**
 * Layout (main) — Wrapper semua halaman utama
 * Menyediakan SidebarProvider dan render sidebar overlay di atas konten
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import Sidebar from '@/components/Sidebar';

function MainContent() {
  const { isOpen, closeSidebar } = useSidebar();
  return (
    <View style={styles.container}>
      <Slot />
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />
    </View>
  );
}

export default function MainLayout() {
  return (
    <SidebarProvider>
      <MainContent />
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
