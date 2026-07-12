/**
 * Halaman Login — Masuk dengan username dan password
 * User dummy: admin/1234 (Admin), kasir/1234 (Kasir)
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/db/database';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const db = useDatabase();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(db, username, password);
      if (!user) {
        setError('Username atau password salah');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      await login({ id: user.id, username: user.username, nama: user.nama, role: user.role });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(main)/beranda');
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Judul */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="water-drop" size={44} color="#2563EB" />
            </View>
            <Text style={styles.appTitle}>KASIR DEPOT AIR</Text>
            <Text style={styles.appSubtitle}>ISI ULANG</Text>
            <Text style={styles.appTagline}>Manajemen Penjualan Offline</Text>
          </View>

          {/* Kartu Login */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk ke Sistem</Text>
            <Text style={styles.cardSubtitle}>Masukkan kredensial Anda untuk melanjutkan</Text>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputWrap, error ? styles.inputError : null]}>
                <MaterialIcons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan username"
                  placeholderTextColor="#CBD5E1"
                  value={username}
                  onChangeText={v => { setUsername(v); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, error ? styles.inputError : null]}>
                <MaterialIcons name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Masukkan password"
                  placeholderTextColor="#CBD5E1"
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(s => !s)}
                  style={styles.eyeBtn}
                  activeOpacity={0.6}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pesan error */}
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Tombol Login */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.loginBtnText}>Masuk</Text>
              }
            </TouchableOpacity>

            {/* Hint akun demo */}
            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>Akun Demo:</Text>
              <Text style={styles.hintText}>admin / 1234  •  kasir / 1234</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.footerText}>v1.0.0  •  Sistem Kasir Offline</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  appSubtitle: {
    color: '#93C5FD',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginTop: 2,
  },
  appTagline: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  hintBox: {
    marginTop: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
    marginBottom: 2,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#3B82F6',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
