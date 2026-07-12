/**
 * Halaman Transaksi / Kasir — Layout 2 kolom
 * Kiri: pilih produk & qty  |  Kanan: keranjang, voucher, member, pembayaran
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert,
  Modal, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import {
  getProduk, validateVoucher, getMemberByPhone,
  createTransaksi, formatRupiah, type Produk, type Member, type CartItem,
} from '@/db/database';

type MetodeBayar = 'Tunai' | 'QRIS' | 'Transfer';

export default function TransaksiScreen() {
  const db = useDatabase();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Produk & keranjang
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [qtys, setQtys] = useState<Record<number, number>>({});

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedDiskon, setAppliedDiskon] = useState(0);
  const [appliedKode, setAppliedKode] = useState<string | null>(null);
  const [voucherMsg, setVoucherMsg] = useState('');
  const [voucherOK, setVoucherOK] = useState(false);

  // Member
  const [memberPhone, setMemberPhone] = useState('');
  const [foundMember, setFoundMember] = useState<Member | null>(null);
  const [memberMsg, setMemberMsg] = useState('');

  // Pembayaran
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>('Tunai');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTxNomor, setLastTxNomor] = useState('');

  // Computed values
  const cartItems: CartItem[] = produkList
    .filter(p => (qtys[p.id] ?? 0) > 0)
    .map(p => ({ produk_id: p.id, produk_nama: p.nama, harga: p.harga, qty: qtys[p.id]! }));
  const total = cartItems.reduce((s, i) => s + i.harga * i.qty, 0);
  const grandTotal = Math.max(0, total - appliedDiskon);
  const poinDidapat = foundMember ? Math.floor(grandTotal / 1000) : 0;

  useEffect(() => {
    getProduk(db).then(setProdukList).catch(() => {});
  }, [db]);

  // Ubah qty produk
  function changeQty(produkId: number, delta: number) {
    const current = qtys[produkId] ?? 0;
    const next = Math.max(0, current + delta);
    setQtys(prev => ({ ...prev, [produkId]: next }));
    // Reset voucher jika qty berubah
    if (appliedKode) {
      setAppliedDiskon(0);
      setAppliedKode(null);
      setVoucherMsg('Voucher direset karena item berubah');
      setVoucherOK(false);
    }
  }

  // Validasi voucher
  async function handleCheckVoucher() {
    if (!voucherCode.trim()) return;
    if (total === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih produk terlebih dahulu');
      return;
    }
    const result = await validateVoucher(db, voucherCode, total);
    setVoucherMsg(result.message);
    setVoucherOK(result.valid);
    if (result.valid) {
      setAppliedDiskon(result.diskon);
      setAppliedKode(voucherCode.trim().toUpperCase());
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setAppliedDiskon(0);
      setAppliedKode(null);
    }
  }

  // Cari member berdasarkan no HP
  async function handleSearchMember() {
    if (!memberPhone.trim()) return;
    const m = await getMemberByPhone(db, memberPhone);
    if (m) {
      setFoundMember(m);
      setMemberMsg(`${m.nama} — ${m.poin} poin`);
    } else {
      setFoundMember(null);
      setMemberMsg('Member tidak ditemukan');
    }
  }

  // Proses pembayaran
  async function handleBayar() {
    if (cartItems.length === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih minimal 1 produk');
      return;
    }
    setProcessing(true);
    try {
      const result = await createTransaksi(db, {
        kasirId: user!.id,
        kasirNama: user!.nama,
        items: cartItems,
        total,
        diskon: appliedDiskon,
        grandTotal,
        metodeBayar,
        voucherKode: appliedKode,
        memberId: foundMember?.id ?? null,
        memberNama: foundMember?.nama ?? null,
        poinDidapat,
      });
      setLastTxNomor(result.nomor);
      setShowSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan transaksi');
    } finally {
      setProcessing(false);
    }
  }

  // Reset semua state setelah transaksi
  function resetAll() {
    setQtys({});
    setVoucherCode(''); setAppliedDiskon(0); setAppliedKode(null);
    setVoucherMsg(''); setVoucherOK(false);
    setMemberPhone(''); setFoundMember(null); setMemberMsg('');
    setMetodeBayar('Tunai');
    setShowSuccess(false);
  }

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <AppHeader title="Transaksi" />

      <View style={styles.body}>
        {/* ═══════════ KOLOM KIRI — PRODUK ═══════════ */}
        <View style={styles.leftCol}>
          <Text style={styles.colTitle}>Pilih Produk</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {produkList.map(p => {
              const qty = qtys[p.id] ?? 0;
              return (
                <View key={p.id} style={[styles.produkCard, qty > 0 && styles.produkCardActive]}>
                  <Text style={styles.produkNama} numberOfLines={2}>{p.nama}</Text>
                  <Text style={styles.produkHarga}>{formatRupiah(p.harga)}</Text>
                  {/* Kontrol qty */}
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                      onPress={() => changeQty(p.id, -1)}
                      disabled={qty === 0}
                    >
                      <MaterialIcons name="remove" size={16} color={qty === 0 ? '#CBD5E1' : '#2563EB'} />
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => changeQty(p.id, 1)}
                    >
                      <MaterialIcons name="add" size={16} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ═══════════ KOLOM KANAN — KERANJANG ═══════════ */}
        <View style={styles.rightCol}>
          <Text style={styles.colTitle}>Keranjang</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Item keranjang */}
            {cartItems.length === 0 ? (
              <View style={styles.emptyCart}>
                <MaterialIcons name="shopping-cart" size={32} color="#CBD5E1" />
                <Text style={styles.emptyCartText}>Kosong</Text>
              </View>
            ) : (
              cartItems.map(item => (
                <View key={item.produk_id} style={styles.cartItem}>
                  <Text style={styles.cartNama} numberOfLines={1}>{item.produk_nama}</Text>
                  <Text style={styles.cartQty}>×{item.qty}</Text>
                  <Text style={styles.cartSubtotal}>{formatRupiah(item.harga * item.qty)}</Text>
                </View>
              ))
            )}

            <View style={styles.divider} />

            {/* Voucher */}
            <Text style={styles.fieldLabel}>Kode Voucher</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="Kode voucher"
                placeholderTextColor="#CBD5E1"
                value={voucherCode}
                onChangeText={v => setVoucherCode(v.toUpperCase())}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.cekBtn} onPress={handleCheckVoucher}>
                <Text style={styles.cekBtnText}>Cek</Text>
              </TouchableOpacity>
            </View>
            {!!voucherMsg && (
              <Text style={[styles.feedbackMsg, { color: voucherOK ? '#10B981' : '#EF4444' }]}>
                {voucherMsg}
              </Text>
            )}

            <View style={styles.divider} />

            {/* Member */}
            <Text style={styles.fieldLabel}>No HP Member</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="No HP member"
                placeholderTextColor="#CBD5E1"
                value={memberPhone}
                onChangeText={setMemberPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.cekBtn} onPress={handleSearchMember}>
                <Text style={styles.cekBtnText}>Cari</Text>
              </TouchableOpacity>
            </View>
            {!!memberMsg && (
              <Text style={[styles.feedbackMsg, { color: foundMember ? '#10B981' : '#EF4444' }]}>
                {memberMsg}
              </Text>
            )}
            {foundMember && (
              <Text style={styles.poinInfo}>+{poinDidapat} poin akan ditambahkan</Text>
            )}

            <View style={styles.divider} />

            {/* Metode bayar */}
            <Text style={styles.fieldLabel}>Metode Pembayaran</Text>
            <View style={styles.metodeRow}>
              {(['Tunai', 'QRIS', 'Transfer'] as MetodeBayar[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.metodeBtn, metodeBayar === m && styles.metodeBtnActive]}
                  onPress={() => setMetodeBayar(m)}
                >
                  <Text style={[styles.metodeBtnText, metodeBayar === m && styles.metodeBtnTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Rincian total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
            </View>
            {appliedDiskon > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#10B981' }]}>Diskon</Text>
                <Text style={[styles.totalValue, { color: '#10B981' }]}>-{formatRupiah(appliedDiskon)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatRupiah(grandTotal)}</Text>
            </View>

            {/* Tombol Bayar */}
            <TouchableOpacity
              style={[styles.bayarBtn, (cartItems.length === 0 || processing) && styles.bayarBtnDisabled]}
              onPress={handleBayar}
              disabled={cartItems.length === 0 || processing}
              activeOpacity={0.85}
            >
              {processing
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <>
                  <MaterialIcons name="payment" size={18} color="#FFFFFF" />
                  <Text style={styles.bayarBtnText}>BAYAR {grandTotal > 0 ? formatRupiah(grandTotal) : ''}</Text>
                </>
              }
            </TouchableOpacity>

            <View style={{ height: bottomPad + 16 }} />
          </ScrollView>
        </View>
      </View>

      {/* ══════ MODAL SUKSES ══════ */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Transaksi Berhasil!</Text>
            <Text style={styles.successNomor}>{lastTxNomor}</Text>

            <View style={styles.receiptBox}>
              {cartItems.map((item, i) => (
                <View key={i} style={styles.receiptRow}>
                  <Text style={styles.receiptItem} numberOfLines={1}>{item.produk_nama} ×{item.qty}</Text>
                  <Text style={styles.receiptAmt}>{formatRupiah(item.harga * item.qty)}</Text>
                </View>
              ))}
              <View style={styles.receiptDivider} />
              {appliedDiskon > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptItem}>Diskon</Text>
                  <Text style={[styles.receiptAmt, { color: '#10B981' }]}>-{formatRupiah(appliedDiskon)}</Text>
                </View>
              )}
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptItem, { fontFamily: 'Inter_700Bold' }]}>Total</Text>
                <Text style={[styles.receiptAmt, { fontFamily: 'Inter_700Bold' }]}>{formatRupiah(grandTotal)}</Text>
              </View>
              <Text style={styles.receiptMetode}>{metodeBayar}</Text>
              {foundMember && poinDidapat > 0 && (
                <Text style={styles.receiptPoin}>+{poinDidapat} poin untuk {foundMember.nama}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.newTxBtn} onPress={resetAll} activeOpacity={0.85}>
              <Text style={styles.newTxBtnText}>Transaksi Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  body: { flex: 1, flexDirection: 'row', padding: 10, gap: 10 },
  leftCol: { flex: 0.44, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 },
  rightCol: { flex: 0.56, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 },
  colTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  produkCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  produkCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  produkNama: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  produkHarga: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: { borderColor: '#E2E8F0' },
  qtyNum: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyCartText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cartNama: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' },
  cartQty: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#64748B', marginHorizontal: 4 },
  cartSubtotal: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  inputField: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  cekBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  cekBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  feedbackMsg: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  poinInfo: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#7C3AED',
    marginBottom: 2,
  },
  metodeRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  metodeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metodeBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  metodeBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#64748B' },
  metodeBtnTextActive: { color: '#2563EB' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },
  totalValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  grandTotalRow: { paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 2, marginBottom: 10 },
  grandTotalLabel: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  grandTotalValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#2563EB' },
  bayarBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bayarBtnDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0 },
  bayarBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  // Modal sukses
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successIcon: { marginBottom: 12 },
  successTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  successNomor: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginBottom: 16,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptItem: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1, marginRight: 8 },
  receiptAmt: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  receiptDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  receiptMetode: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  receiptPoin: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#7C3AED',
    marginTop: 4,
    textAlign: 'center',
  },
  newTxBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  newTxBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
