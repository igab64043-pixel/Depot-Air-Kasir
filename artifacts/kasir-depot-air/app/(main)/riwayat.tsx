/**
 * Halaman Riwayat Transaksi — Daftar semua transaksi
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, Platform, TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import { getTransaksi, formatRupiah, formatDateTime, type Transaksi } from '@/db/database';

const METODE_COLOR: Record<string, { bg: string; text: string }> = {
  Tunai: { bg: '#ECFDF5', text: '#065F46' },
  QRIS: { bg: '#EFF6FF', text: '#1D4ED8' },
  Transfer: { bg: '#FFF7ED', text: '#9A3412' },
};

export default function RiwayatScreen() {
  const db = useDatabase();
  const insets = useSafeAreaInsets();

  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const data = await getTransaksi(db, 200);
    setTransaksiList(data);
    setLoading(false);
  }, [db]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function renderItem({ item: tx, index }: { item: Transaksi; index: number }) {
    const mc = METODE_COLOR[tx.metode_bayar] ?? { bg: '#F1F5F9', text: '#374151' };
    return (
      <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
        {/* Nomor & Waktu */}
        <View style={styles.colMain}>
          <Text style={styles.nomor} numberOfLines={1}>{tx.nomor}</Text>
          <Text style={styles.waktu}>{formatDateTime(tx.created_at)}</Text>
          <Text style={styles.kasir} numberOfLines={1}>Kasir: {tx.kasir_nama}</Text>
        </View>

        {/* Total */}
        <View style={styles.colTotal}>
          <Text style={styles.total}>{formatRupiah(tx.grand_total)}</Text>
          {tx.diskon > 0 && (
            <Text style={styles.diskon}>-{formatRupiah(tx.diskon)}</Text>
          )}
        </View>

        {/* Metode & Member */}
        <View style={styles.colRight}>
          <View style={[styles.metodeBadge, { backgroundColor: mc.bg }]}>
            <Text style={[styles.metodeText, { color: mc.text }]}>{tx.metode_bayar}</Text>
          </View>
          {tx.member_nama ? (
            <Text style={styles.memberText} numberOfLines={1}>{tx.member_nama}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Riwayat Transaksi" />

      {/* Ringkasan jumlah */}
      {!loading && (
        <View style={styles.summaryBar}>
          <MaterialIcons name="receipt-long" size={14} color="#2563EB" />
          <Text style={styles.summaryText}>
            {transaksiList.length} transaksi tercatat
          </Text>
        </View>
      )}

      {/* Header kolom */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, { flex: 1.8 }]}>Transaksi</Text>
        <Text style={[styles.headerText, { flex: 0.9, textAlign: 'right' }]}>Total</Text>
        <Text style={[styles.headerText, { flex: 0.9, textAlign: 'right' }]}>Metode</Text>
      </View>

      <FlatList
        data={transaksiList}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        contentContainerStyle={{ paddingBottom: bottomPad + 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="inbox" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySubtitle}>Transaksi yang dibuat akan muncul di sini</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  summaryText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowAlt: { backgroundColor: '#F8FAFC' },
  colMain: { flex: 1.8 },
  colTotal: { flex: 0.9, alignItems: 'flex-end' },
  colRight: { flex: 0.9, alignItems: 'flex-end' },
  nomor: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  waktu: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    marginTop: 1,
  },
  kasir: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginTop: 1,
  },
  total: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  diskon: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#10B981',
    marginTop: 1,
  },
  metodeBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metodeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  memberText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#7C3AED',
    marginTop: 3,
    maxWidth: 80,
    textAlign: 'right',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#94A3B8',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#CBD5E1',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
