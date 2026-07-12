/**
 * DatabaseContext — Provider SQLite untuk seluruh aplikasi
 * Membuka koneksi DB, membuat tabel, dan mengisi data dummy
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import { initializeDatabase } from '@/db/database';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

type DbContextType = SQLite.SQLiteDatabase | null;

const DatabaseContext = createContext<DbContextType>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function setup() {
      try {
        const database = await SQLite.openDatabaseAsync('kasir_depot.db');
        await initializeDatabase(database);
        if (mounted) setDb(database);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Gagal membuka database');
      }
    }
    setup();
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Memuat database...</Text>
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
}

/** Hook untuk mengambil instance database (harus ada di dalam DatabaseProvider) */
export function useDatabase(): SQLite.SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase harus digunakan di dalam DatabaseProvider');
  return db;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
