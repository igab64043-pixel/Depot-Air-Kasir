/**
 * Entry point — Cek status login dan arahkan ke halaman yang sesuai
 */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  // Tampilkan loading saat cek sesi
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563EB' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Sudah login → halaman utama
  if (user) {
    return <Redirect href="/(main)/beranda" />;
  }

  // Belum login → halaman login
  return <Redirect href="/login" />;
}
