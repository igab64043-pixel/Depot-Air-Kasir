/**
 * Halaman Beranda — Dashboard utama
 * Statistik hari ini, grafik penjualan 7 hari, akses cepat, transaksi terakhir
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import {
  getTodayStats, getWeeklySales, getMemberCount,
  getTransaksi, formatRupiah, formatDateTime, getTodayStr,
  type Transaksi,
} from '@/db/database';

function formatShort(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `${Math.floor(n / 1000)}rb`;
  return String(n);
}

export default function BerandaScreen() {
  const db = useDatabase();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({ totalPenjualan: 0, jumlahTransaksi: 0, produkTerjual: 0 });
  const [memberCount, setMemberCount] = useState(0);
  const [weeklySales, setWeeklySales] = useState<{ label: string; total: number; date: string }[]>([]);
  const [recentTx, setRecentTx] = useState<Transaksi[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const today = getTodayStr();

  const loadData = useCallback(async () => {
    const [s, w, mc, tx] = await Promise.all([
      getTodayStats(db),
      getWeeklySales(db),
      getMemberCount(db),
      getTransaksi(db, 5),
    ]);
    setStats(s);
    setWeeklySales(w);
    setMemberCount(mc);
    setRecentTx(tx);
  }, [db]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const STAT_CARDS = [
    {
      label: 'Total Penjualan',
      value: formatRupiah(stats.totalPenjualan),
      icon: 'payments' as const,
      bg: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      label: 'Transaksi Hari Ini',
      value: String(stats.jumlahTransaksi),
      icon: 'receipt-long' as const,
      bg: '#ECFDF5',
      iconColor: '#10B981',
    },
    {
      label: 'Member Terdaftar',
      value: String(memberCount),
      icon: 'people' as const,
      bg: '#F5F3FF',
      iconColor: '#7C3AED',
    },
    {
      label: 'Produk Terjual',
      value: String(stats.produkTerjual),
      icon: 'water-drop' as const,
      bg: '#FFF7ED',
      iconColor: '#EA580C',
    },
  ];

  const MAX_BAR = 80;
  const maxSales = Math.max(...weeklySales.map(d => d.total), 1);

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <AppHeader title="Beranda" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      >
        {/* Tanggal hari ini */}
        <Text style={styles.dateText}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>

        {/* 4 Kartu Statistik */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((card, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <View style={[styles.statIcon, { backgroundColor: card.iconColor + '20' }]}>
                <MaterialIcons name={card.icon} size={20} color={card.iconColor} />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Cepat */}
        <Text style={styles.sectionTitle}>Akses Cepat</Text>
        <View style={styles.quickMenu}>
          {[
            { label: 'Transaksi', icon: 'point-of-sale', route: '/(main)/transaksi', color: '#2563EB' },
            { label: 'Member', icon: 'people', route: '/(main)/member', color: '#7C3AED' },
            { label: 'Riwayat', icon: 'history', route: '/(main)/riwayat', color: '#0891B2' },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.quickItem}
              onPress={() => router.replace(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + '15' }]}>
                <MaterialIcons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grafik Penjualan 7 Hari */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Penjualan 7 Hari Terakhir</Text>
          <View style={styles.chartArea}>
            {weeklySales.map((day, idx) => {
              const barH = Math.max(4, (day.total / maxSales) * MAX_BAR);
              const isToday = day.date === today;
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barValue}>{day.total > 0 ? formatShort(day.total) : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.bar,
                      { height: barH, backgroundColor: isToday ? '#2563EB' : '#BFDBFE' }
                    ]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && { color: '#2563EB', fontFamily: 'Inter_700Bold' }]}>
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: '#BFDBFE' }]} />
            <Text style={styles.legendText}>Hari lalu</Text>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB', marginLeft: 12 }]} />
            <Text style={styles.legendText}>Hari ini</Text>
          </View>
        </View>

        {/* Transaksi Terakhir */}
        <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>
        <View style={styles.txCard}>
          {/* Header tabel */}
          <View style={[styles.txRow, styles.txHeader]}>
            <Text style={[styles.txCol, styles.txHeaderText, { flex: 1.6 }]}>No. Transaksi</Text>
            <Text style={[styles.txCol, styles.txHeaderText, { flex: 1 }]}>Total</Text>
            <Text style={[styles.txCol, styles.txHeaderText, { flex: 0.8 }]}>Metode</Text>
          </View>
          {recentTx.length === 0 ? (
            <View style={styles.emptyRow}>
              <MaterialIcons name="receipt-long" size={32} color="#CBD5E1" />
              <Text style={styles.emptyText}>Belum ada transaksi hari ini</Text>
            </View>
          ) : (
            recentTx.map((tx, i) => (
              <View key={tx.id} style={[styles.txRow, i % 2 === 1 && styles.txRowAlt]}>
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.txNomor} numberOfLines={1}>{tx.nomor}</Text>
                  <Text style={styles.txTime}>{formatDateTime(tx.created_at)}</Text>
                </View>
                <Text style={[styles.txCol, styles.txTotal]}>{formatRupiah(tx.grand_total)}</Text>
                <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                  <View style={[styles.metodeBadge, {
                    backgroundColor: tx.metode_bayar === 'Tunai' ? '#ECFDF5' :
                      tx.metode_bayar === 'QRIS' ? '#EFF6FF' : '#FFF7ED'
                  }]}>
                    <Text style={[styles.metodeText, {
                      color: tx.metode_bayar === 'Tunai' ? '#065F46' :
                        tx.metode_bayar === 'QRIS' ? '#1D4ED8' : '#9A3412'
                    }]}>{tx.metode_bayar}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
          {recentTx.length > 0 && (
            <TouchableOpacity
              style={styles.lihatSemua}
              onPress={() => router.replace('/(main)/riwayat' as any)}
            >
              <Text style={styles.lihatSemuaText}>Lihat Semua Transaksi</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginBottom: 10,
  },
  quickMenu: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 8,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginBottom: 2,
    height: 14,
  },
  barTrack: {
    width: 24,
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  txRowAlt: { backgroundColor: '#F8FAFC' },
  txHeader: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
  },
  txHeaderText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txCol: {
    flex: 1,
  },
  txNomor: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  txTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    marginTop: 1,
  },
  txTotal: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  metodeBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metodeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyRow: {
    alignItems: 'center',
    padding: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
  },
  lihatSemua: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  lihatSemuaText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
  },
});
