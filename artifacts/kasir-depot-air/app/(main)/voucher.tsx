/**
 * Halaman Voucher — Kelola kode diskon
 * Hanya Admin yang dapat mengakses halaman ini
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import { getVouchers, addVoucher, updateVoucher, deleteVoucher, type Voucher } from '@/db/database';

type VoucherJenis = 'persen' | 'nominal';

function formatVoucherNilai(jenis: string, nilai: number): string {
  return jenis === 'persen' ? `${nilai}%` : `Rp ${nilai.toLocaleString('id-ID')}`;
}

export default function VoucherScreen() {
  const db = useDatabase();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [voucherList, setVoucherList] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editVoucher, setEditVoucher] = useState<Voucher | null>(null);
  const [fKode, setFKode] = useState('');
  const [fJenis, setFJenis] = useState<VoucherJenis>('persen');
  const [fNilai, setFNilai] = useState('');
  const [fKuota, setFKuota] = useState('');
  const [fExpired, setFExpired] = useState('');
  const [saving, setSaving] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <AppHeader title="Voucher" />
        <View style={styles.accessDenied}>
          <MaterialIcons name="lock" size={48} color="#CBD5E1" />
          <Text style={styles.accessTitle}>Akses Ditolak</Text>
          <Text style={styles.accessSub}>Hanya admin yang dapat mengelola voucher</Text>
        </View>
      </View>
    );
  }

  const loadVouchers = useCallback(async () => {
    const data = await getVouchers(db);
    setVoucherList(data);
    setLoading(false);
  }, [db]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  function openAdd() {
    setEditVoucher(null);
    setFKode(''); setFJenis('persen'); setFNilai(''); setFKuota(''); setFExpired('');
    setModalVisible(true);
  }

  function openEdit(v: Voucher) {
    setEditVoucher(v);
    setFKode(v.kode);
    setFJenis(v.jenis as VoucherJenis);
    setFNilai(String(v.nilai));
    setFKuota(String(v.kuota));
    setFExpired(v.expired);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!fKode.trim() || !fNilai || !fKuota || !fExpired) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(fExpired);
    if (!dateOk) {
      Alert.alert('Format Salah', 'Tanggal kedaluwarsa: YYYY-MM-DD');
      return;
    }
    const nilai = Number(fNilai);
    if (fJenis === 'persen' && (nilai <= 0 || nilai > 100)) {
      Alert.alert('Error', 'Diskon persen harus antara 1-100');
      return;
    }
    setSaving(true);
    try {
      const data = {
        kode: fKode.trim().toUpperCase(),
        jenis: fJenis,
        nilai,
        kuota: Number(fKuota),
        digunakan: editVoucher?.digunakan ?? 0,
        expired: fExpired,
        aktif: editVoucher?.aktif ?? 1,
      };
      if (editVoucher) {
        await updateVoucher(db, editVoucher.id, data);
      } else {
        await addVoucher(db, data);
      }
      setModalVisible(false);
      await loadVouchers();
    } catch (e: any) {
      const isUnique = String(e?.message).includes('UNIQUE');
      Alert.alert('Error', isUnique ? 'Kode voucher sudah ada' : 'Gagal menyimpan voucher');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(v: Voucher) {
    Alert.alert(
      'Hapus Voucher',
      `Hapus voucher "${v.kode}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await deleteVoucher(db, v.id);
            await loadVouchers();
          },
        },
      ]
    );
  }

  async function toggleAktif(v: Voucher) {
    await updateVoucher(db, v.id, { ...v, aktif: v.aktif === 1 ? 0 : 1 });
    await loadVouchers();
  }

  const today = new Date().toISOString().split('T')[0];
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Voucher"
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <MaterialIcons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: bottomPad + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ringkasan */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.summaryVal}>{voucherList.filter(v => v.aktif === 1).length}</Text>
            <Text style={styles.summaryLbl}>Aktif</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.summaryVal, { color: '#065F46' }]}>
              {voucherList.filter(v => v.expired >= today && v.aktif === 1 && v.digunakan < v.kuota).length}
            </Text>
            <Text style={styles.summaryLbl}>Tersedia</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.summaryVal, { color: '#991B1B' }]}>
              {voucherList.filter(v => v.expired < today || v.digunakan >= v.kuota).length}
            </Text>
            <Text style={styles.summaryLbl}>Kadaluwarsa</Text>
          </View>
        </View>

        {/* List Voucher */}
        {loading ? (
          <Text style={styles.loadingText}>Memuat...</Text>
        ) : voucherList.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="local-offer" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum ada voucher</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddText}>+ Buat Voucher Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          voucherList.map(v => {
            const isExpired = v.expired < today;
            const isHabis = v.digunakan >= v.kuota;
            const isValid = !isExpired && !isHabis && v.aktif === 1;
            return (
              <View key={v.id} style={[styles.voucherCard, !isValid && styles.voucherCardDim]}>
                {/* Header */}
                <View style={styles.voucherHeader}>
                  <View style={styles.voucherKodeRow}>
                    <MaterialIcons name="local-offer" size={16} color={isValid ? '#2563EB' : '#94A3B8'} />
                    <Text style={[styles.voucherKode, { color: isValid ? '#0F172A' : '#94A3B8' }]}>
                      {v.kode}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {
                    backgroundColor: isValid ? '#ECFDF5' : isExpired ? '#FEF2F2' : isHabis ? '#FFF7ED' : '#F1F5F9'
                  }]}>
                    <Text style={[styles.statusText, {
                      color: isValid ? '#065F46' : isExpired ? '#991B1B' : isHabis ? '#9A3412' : '#475569'
                    }]}>
                      {isExpired ? 'Kadaluwarsa' : isHabis ? 'Habis' : v.aktif === 0 ? 'Nonaktif' : 'Aktif'}
                    </Text>
                  </View>
                </View>

                {/* Detail */}
                <View style={styles.voucherDetail}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Diskon</Text>
                    <Text style={styles.detailValue}>{formatVoucherNilai(v.jenis, v.nilai)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Terpakai</Text>
                    <Text style={styles.detailValue}>{v.digunakan}/{v.kuota}×</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Berlaku</Text>
                    <Text style={[styles.detailValue, isExpired && { color: '#EF4444' }]}>s/d {v.expired}</Text>
                  </View>
                </View>

                {/* Aksi */}
                <View style={styles.voucherActions}>
                  <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleAktif(v)}>
                    <MaterialIcons
                      name={v.aktif === 1 ? 'toggle-on' : 'toggle-off'}
                      size={24}
                      color={v.aktif === 1 ? '#2563EB' : '#94A3B8'}
                    />
                    <Text style={[styles.toggleText, { color: v.aktif === 1 ? '#2563EB' : '#94A3B8' }]}>
                      {v.aktif === 1 ? 'Aktif' : 'Nonaktif'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.iconActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(v)}>
                      <MaterialIcons name="edit" size={16} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(v)}>
                      <MaterialIcons name="delete" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Tambah/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editVoucher ? 'Edit Voucher' : 'Buat Voucher'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Kode */}
              <Text style={styles.fLabel}>Kode Voucher *</Text>
              <TextInput
                style={styles.fInput}
                placeholder="Misal: DISKON10"
                placeholderTextColor="#CBD5E1"
                value={fKode}
                onChangeText={v => setFKode(v.toUpperCase())}
                autoCapitalize="characters"
              />

              {/* Jenis */}
              <Text style={styles.fLabel}>Jenis Diskon *</Text>
              <View style={styles.jenisRow}>
                {(['persen', 'nominal'] as VoucherJenis[]).map(j => (
                  <TouchableOpacity
                    key={j}
                    style={[styles.jenisBtn, fJenis === j && styles.jenisBtnActive]}
                    onPress={() => setFJenis(j)}
                  >
                    <Text style={[styles.jenisBtnText, fJenis === j && styles.jenisBtnTextActive]}>
                      {j === 'persen' ? 'Persentase (%)' : 'Nominal (Rp)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Nilai */}
              <Text style={styles.fLabel}>Nilai Diskon * {fJenis === 'persen' ? '(1–100%)' : '(Rp)'}</Text>
              <TextInput
                style={styles.fInput}
                placeholder={fJenis === 'persen' ? '10' : '5000'}
                placeholderTextColor="#CBD5E1"
                value={fNilai}
                onChangeText={setFNilai}
                keyboardType="numeric"
              />

              {/* Kuota */}
              <Text style={styles.fLabel}>Kuota Penggunaan *</Text>
              <TextInput
                style={styles.fInput}
                placeholder="Misal: 100"
                placeholderTextColor="#CBD5E1"
                value={fKuota}
                onChangeText={setFKuota}
                keyboardType="numeric"
              />

              {/* Expired */}
              <Text style={styles.fLabel}>Tanggal Kedaluwarsa * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.fInput}
                placeholder="2026-12-31"
                placeholderTextColor="#CBD5E1"
                value={fExpired}
                onChangeText={setFExpired}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Voucher'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  accessTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#64748B' },
  accessSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  addBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 4,
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  summaryVal: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D4ED8' },
  summaryLbl: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#64748B', marginTop: 2 },
  loadingText: {
    textAlign: 'center', fontSize: 14, fontFamily: 'Inter_500Medium', color: '#94A3B8', marginTop: 24,
  },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#94A3B8' },
  emptyAddBtn: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  emptyAddText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#2563EB' },
  voucherCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 10, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  voucherCardDim: { opacity: 0.65 },
  voucherHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  voucherKodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voucherKode: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  voucherDetail: { flexDirection: 'row', marginBottom: 10 },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#94A3B8', marginBottom: 2 },
  detailValue: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#0F172A', textAlign: 'center' },
  voucherActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10,
  },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  iconActions: { flexDirection: 'row', gap: 6 },
  editBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  fLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151', marginTop: 12, marginBottom: 6 },
  fInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  jenisRow: { flexDirection: 'row', gap: 8 },
  jenisBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center',
  },
  jenisBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  jenisBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },
  jenisBtnTextActive: { color: '#2563EB', fontFamily: 'Inter_700Bold' },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
