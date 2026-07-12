/**
 * Halaman Laporan — Laporan penjualan dengan filter rentang tanggal
 * Hanya dapat diakses oleh Admin
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, RefreshControl, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import {
  getTransaksiByDateRange, formatRupiah, formatDateTime, getTodayStr, type Transaksi,
} from '@/db/database';

type Filter = 'hari' | 'minggu' | 'bulan' | 'custom';

function getPadded(n: number) { return String(n).padStart(2, '0'); }
function dateToStr(d: Date) {
  return `${d.getFullYear()}-${getPadded(d.getMonth() + 1)}-${getPadded(d.getDate())}`;
}

export default function LaporanScreen() {
  const db = useDatabase();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<Filter>('hari');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <AppHeader title="Laporan" />
        <View style={styles.accessDenied}>
          <MaterialIcons name="lock" size={48} color="#CBD5E1" />
          <Text style={styles.accessTitle}>Akses Ditolak</Text>
          <Text style={styles.accessSubtitle}>Hanya admin yang dapat melihat laporan</Text>
        </View>
      </View>
    );
  }

  function getDateRange(): { start: string; end: string } {
    const today = getTodayStr();
    const d = new Date();
    switch (filter) {
      case 'hari': return { start: today, end: today };
      case 'minggu': {
        const s = new Date(d); s.setDate(d.getDate() - 6);
        return { start: dateToStr(s), end: today };
      }
      case 'bulan': {
        const s = new Date(d.getFullYear(), d.getMonth(), 1);
        return { start: dateToStr(s), end: today };
      }
      case 'custom':
        return { start: customStart || today, end: customEnd || today };
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const data = await getTransaksiByDateRange(db, start, end);
    setTransaksiList(data);
    setLoading(false);
  }, [db, filter, customStart, customEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Hitung statistik
  const stats = transaksiList.reduce(
    (acc, t) => ({
      total: acc.total + t.grand_total,
      count: acc.count + 1,
      tunai: acc.tunai + (t.metode_bayar === 'Tunai' ? t.grand_total : 0),
      qris: acc.qris + (t.metode_bayar === 'QRIS' ? t.grand_total : 0),
      transfer: acc.transfer + (t.metode_bayar === 'Transfer' ? t.grand_total : 0),
      diskon: acc.diskon + t.diskon,
    }),
    { total: 0, count: 0, tunai: 0, qris: 0, transfer: 0, diskon: 0 }
  );
  const rataRata = stats.count > 0 ? Math.floor(stats.total / stats.count) : 0;

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'hari', label: 'Hari Ini' },
    { key: 'minggu', label: '7 Hari' },
    { key: 'bulan', label: 'Bulan Ini' },
    { key: 'custom', label: 'Kustom' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Laporan Penjualan" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      >
        {/* Filter tombol */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input tanggal kustom */}
        {filter === 'custom' && (
          <View style={styles.customDateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Dari Tanggal</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#CBD5E1"
                value={customStart}
                onChangeText={setCustomStart}
              />
            </View>
            <Text style={styles.dateSeparator}>—</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Sampai Tanggal</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#CBD5E1"
                value={customEnd}
                onChangeText={setCustomEnd}
              />
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={loadData}>
              <Text style={styles.applyBtnText}>Tampilkan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Kartu statistik */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.statValue}>{formatRupiah(stats.total)}</Text>
            <Text style={styles.statLabel}>Total Pendapatan</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statValue, { color: '#065F46' }]}>{stats.count}</Text>
            <Text style={styles.statLabel}>Jml Transaksi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
            <Text style={[styles.statValue, { color: '#6D28D9' }]}>{formatRupiah(rataRata)}</Text>
            <Text style={styles.statLabel}>Rata-rata</Text>
          </View>
        </View>

        {/* Breakdown metode bayar */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Breakdown Pembayaran</Text>
          {[
            { label: 'Tunai', amount: stats.tunai, color: '#065F46', bg: '#ECFDF5' },
            { label: 'QRIS', amount: stats.qris, color: '#1D4ED8', bg: '#EFF6FF' },
            { label: 'Transfer', amount: stats.transfer, color: '#9A3412', bg: '#FFF7ED' },
            { label: 'Total Diskon', amount: stats.diskon, color: '#6D28D9', bg: '#F5F3FF' },
          ].map(item => (
            <View key={item.label} style={styles.breakdownRow}>
              <View style={[styles.breakdownDot, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 10, color: item.color, fontFamily: 'Inter_700Bold' }}>
                  {item.label[0]}
                </Text>
              </View>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={[styles.breakdownAmt, { color: item.color }]}>{formatRupiah(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Tabel transaksi */}
        <Text style={styles.sectionTitle}>Detail Transaksi</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerTxt, { flex: 1.6 }]}>Transaksi</Text>
            <Text style={[styles.headerTxt, { flex: 1, textAlign: 'right' }]}>Total</Text>
            <Text style={[styles.headerTxt, { flex: 0.8, textAlign: 'right' }]}>Metode</Text>
          </View>
          {transaksiList.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyText}>
                {loading ? 'Memuat data...' : 'Tidak ada transaksi dalam periode ini'}
              </Text>
            </View>
          ) : (
            transaksiList.map((tx, i) => (
              <View key={tx.id} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.txNomor} numberOfLines={1}>{tx.nomor}</Text>
                  <Text style={styles.txSub}>{formatDateTime(tx.created_at)}</Text>
                  {tx.member_nama ? <Text style={styles.txMember}>{tx.member_nama}</Text> : null}
                </View>
                <Text style={[styles.txTotal, { flex: 1 }]}>{formatRupiah(tx.grand_total)}</Text>
                <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                  <Text style={styles.txMetode}>{tx.metode_bayar}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  accessDenied: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  accessTitle: {
    fontSize: 18, fontFamily: 'Inter_700Bold', color: '#64748B',
  },
  accessSubtitle: {
    fontSize: 13, fontFamily: 'Inter_400Regular', color: '#94A3B8',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#2563EB',
    fontFamily: 'Inter_700Bold',
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748B',
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  dateSeparator: {
    fontSize: 14,
    color: '#64748B',
    paddingBottom: 8,
  },
  applyBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 0,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  breakdownDot: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
  },
  breakdownAmt: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTxt: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  txNomor: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  txSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 1 },
  txMember: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#7C3AED', marginTop: 1 },
  txTotal: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#0F172A', textAlign: 'right' },
  txMetode: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#374151' },
  emptyTable: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
