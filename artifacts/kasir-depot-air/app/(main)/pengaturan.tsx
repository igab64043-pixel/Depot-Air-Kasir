/**
 * Halaman Pengaturan — Konfigurasi sistem
 * Hanya Admin: nama toko, ganti password, produk CRUD, backup data
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import {
  getSetting, setSetting,
  getProduk, addProduk, updateProduk, softDeleteProduk,
  updatePassword, exportDatabase,
  type Produk,
} from '@/db/database';

export default function PengaturanScreen() {
  const db = useDatabase();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <AppHeader title="Pengaturan" />
        <View style={styles.accessDenied}>
          <MaterialIcons name="lock" size={48} color="#CBD5E1" />
          <Text style={styles.accessTitle}>Akses Ditolak</Text>
          <Text style={styles.accessSub}>Hanya admin yang dapat mengakses pengaturan</Text>
        </View>
      </View>
    );
  }

  // ── NAMA TOKO ──
  const [namaToko, setNamaToko] = useState('');
  const [namaTokoInput, setNamaTokoInput] = useState('');
  const [savingNama, setSavingNama] = useState(false);

  // ── GANTI PASSWORD ──
  const [pwLama, setPwLama] = useState('');
  const [pwBaru, setPwBaru] = useState('');
  const [pwKonfirmasi, setPwKonfirmasi] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // ── PRODUK ──
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [produkModal, setProdukModal] = useState(false);
  const [editProduk, setEditProduk] = useState<Produk | null>(null);
  const [pNama, setPNama] = useState('');
  const [pHarga, setPHarga] = useState('');
  const [pSatuan, setPSatuan] = useState('galon');
  const [savingProduk, setSavingProduk] = useState(false);

  // ── BACKUP ──
  const [backupModal, setBackupModal] = useState(false);
  const [backupData, setBackupData] = useState('');
  const [loadingBackup, setLoadingBackup] = useState(false);

  const loadData = useCallback(async () => {
    const [nama, produk] = await Promise.all([
      getSetting(db, 'nama_toko'),
      getProduk(db, false),
    ]);
    setNamaToko(nama ?? 'Depot Air');
    setNamaTokoInput(nama ?? 'Depot Air');
    setProdukList(produk);
  }, [db]);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveNamaToko() {
    if (!namaTokoInput.trim()) return;
    setSavingNama(true);
    await setSetting(db, 'nama_toko', namaTokoInput.trim());
    setNamaToko(namaTokoInput.trim());
    setSavingNama(false);
    Alert.alert('Berhasil', 'Nama toko berhasil disimpan');
  }

  async function savePassword() {
    if (!pwLama.trim() || !pwBaru.trim() || !pwKonfirmasi.trim()) {
      Alert.alert('Error', 'Semua field password harus diisi');
      return;
    }
    if (pwBaru !== pwKonfirmasi) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return;
    }
    if (pwBaru.length < 4) {
      Alert.alert('Error', 'Password baru minimal 4 karakter');
      return;
    }
    setSavingPw(true);
    try {
      // Verify password lama
      const { loginUser } = await import('@/db/database');
      const valid = await loginUser(db, user!.username, pwLama);
      if (!valid) {
        Alert.alert('Error', 'Password lama tidak sesuai');
        return;
      }
      await updatePassword(db, user!.id, pwBaru);
      setPwLama(''); setPwBaru(''); setPwKonfirmasi('');
      Alert.alert('Berhasil', 'Password berhasil diubah');
    } catch {
      Alert.alert('Error', 'Gagal mengubah password');
    } finally {
      setSavingPw(false);
    }
  }

  function openAddProduk() {
    setEditProduk(null);
    setPNama(''); setPHarga(''); setPSatuan('galon');
    setProdukModal(true);
  }

  function openEditProduk(p: Produk) {
    setEditProduk(p);
    setPNama(p.nama);
    setPHarga(String(p.harga));
    setPSatuan(p.satuan);
    setProdukModal(true);
  }

  async function saveProdukForm() {
    if (!pNama.trim() || !pHarga) {
      Alert.alert('Error', 'Nama dan harga harus diisi');
      return;
    }
    const harga = Number(pHarga);
    if (harga <= 0) {
      Alert.alert('Error', 'Harga harus lebih dari 0');
      return;
    }
    setSavingProduk(true);
    try {
      if (editProduk) {
        await updateProduk(db, editProduk.id, pNama.trim(), harga, pSatuan.trim() || 'galon');
      } else {
        await addProduk(db, pNama.trim(), harga, pSatuan.trim() || 'galon');
      }
      setProdukModal(false);
      await loadData();
    } catch {
      Alert.alert('Error', 'Gagal menyimpan produk');
    } finally {
      setSavingProduk(false);
    }
  }

  function confirmNonaktifProduk(p: Produk) {
    Alert.alert(
      'Nonaktifkan Produk',
      `Nonaktifkan "${p.nama}"? Produk tidak akan muncul di kasir.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Nonaktifkan',
          style: 'destructive',
          onPress: async () => {
            await softDeleteProduk(db, p.id);
            await loadData();
          },
        },
      ]
    );
  }

  async function handleBackup() {
    setLoadingBackup(true);
    try {
      const json = await exportDatabase(db);
      setBackupData(json);
      setBackupModal(true);
    } catch {
      Alert.alert('Error', 'Gagal mengekspor data');
    } finally {
      setLoadingBackup(false);
    }
  }

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const SATUAN_OPTIONS = ['galon', 'buah', 'paket', 'botol', 'liter'];

  return (
    <View style={styles.container}>
      <AppHeader title="Pengaturan" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
      >

        {/* ══ SEKSI: NAMA TOKO ══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="store" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Nama Toko</Text>
          </View>
          <Text style={styles.sectionSub}>Nama ini akan tampil di seluruh aplikasi</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={namaTokoInput}
              onChangeText={setNamaTokoInput}
              placeholder="Nama toko"
              placeholderTextColor="#CBD5E1"
            />
            <TouchableOpacity
              style={[styles.saveRowBtn, savingNama && { opacity: 0.6 }]}
              onPress={saveNamaToko}
              disabled={savingNama}
            >
              {savingNama
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.saveRowBtnText}>Simpan</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ══ SEKSI: GANTI PASSWORD ══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="lock-reset" size={18} color="#7C3AED" />
            <Text style={styles.sectionTitle}>Ganti Password</Text>
          </View>
          <Text style={styles.sectionSub}>Ganti password akun {user?.nama}</Text>

          <Text style={styles.fieldLabel}>Password Lama</Text>
          <TextInput
            style={styles.input}
            value={pwLama}
            onChangeText={setPwLama}
            placeholder="Password lama"
            placeholderTextColor="#CBD5E1"
            secureTextEntry={!showPw}
          />

          <Text style={styles.fieldLabel}>Password Baru</Text>
          <TextInput
            style={styles.input}
            value={pwBaru}
            onChangeText={setPwBaru}
            placeholder="Minimal 4 karakter"
            placeholderTextColor="#CBD5E1"
            secureTextEntry={!showPw}
          />

          <Text style={styles.fieldLabel}>Konfirmasi Password Baru</Text>
          <TextInput
            style={styles.input}
            value={pwKonfirmasi}
            onChangeText={setPwKonfirmasi}
            placeholder="Ulangi password baru"
            placeholderTextColor="#CBD5E1"
            secureTextEntry={!showPw}
          />

          <TouchableOpacity
            style={styles.showPwBtn}
            onPress={() => setShowPw(s => !s)}
          >
            <MaterialIcons name={showPw ? 'visibility-off' : 'visibility'} size={16} color="#64748B" />
            <Text style={styles.showPwText}>{showPw ? 'Sembunyikan' : 'Tampilkan'} password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionBtn, styles.purpleBtn, savingPw && { opacity: 0.6 }]}
            onPress={savePassword}
            disabled={savingPw}
          >
            {savingPw
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.sectionBtnText}>Ganti Password</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ══ SEKSI: PRODUK ══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="inventory-2" size={18} color="#0891B2" />
              <Text style={styles.sectionTitle}>Kelola Produk</Text>
            </View>
            <TouchableOpacity style={styles.addProdukBtn} onPress={openAddProduk}>
              <MaterialIcons name="add" size={18} color="#0891B2" />
              <Text style={styles.addProdukBtnText}>Tambah</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSub}>{produkList.filter(p => p.aktif === 1).length} produk aktif, {produkList.filter(p => p.aktif === 0).length} nonaktif</Text>

          {produkList.map(p => (
            <View key={p.id} style={[styles.produkRow, p.aktif === 0 && styles.produkRowDim]}>
              <View style={styles.produkInfo}>
                <Text style={styles.produkNama}>{p.nama}</Text>
                <Text style={styles.produkMeta}>
                  Rp {p.harga.toLocaleString('id-ID')} / {p.satuan}
                  {p.aktif === 0 && ' • Nonaktif'}
                </Text>
              </View>
              <View style={styles.produkActions}>
                <TouchableOpacity style={styles.miniEditBtn} onPress={() => openEditProduk(p)}>
                  <MaterialIcons name="edit" size={14} color="#0891B2" />
                </TouchableOpacity>
                {p.aktif === 1 && (
                  <TouchableOpacity style={styles.miniDeleteBtn} onPress={() => confirmNonaktifProduk(p)}>
                    <MaterialIcons name="block" size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {produkList.length === 0 && (
            <Text style={styles.emptyText}>Belum ada produk. Tambah produk pertama.</Text>
          )}
        </View>

        {/* ══ SEKSI: BACKUP ══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="cloud-download" size={18} color="#EA580C" />
            <Text style={styles.sectionTitle}>Backup Data</Text>
          </View>
          <Text style={styles.sectionSub}>
            Ekspor semua data ke format JSON. Simpan teks yang muncul untuk backup manual.
          </Text>
          <TouchableOpacity
            style={[styles.sectionBtn, styles.orangeBtn, loadingBackup && { opacity: 0.6 }]}
            onPress={handleBackup}
            disabled={loadingBackup}
          >
            {loadingBackup
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <>
                <MaterialIcons name="download" size={16} color="#FFFFFF" />
                <Text style={styles.sectionBtnText}>Ekspor Data</Text>
              </>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal Tambah/Edit Produk */}
      <Modal visible={produkModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editProduk ? 'Edit Produk' : 'Tambah Produk'}</Text>
                <TouchableOpacity onPress={() => setProdukModal(false)}>
                  <MaterialIcons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Nama Produk *</Text>
              <TextInput
                style={styles.input}
                placeholder="Misal: Isi Ulang"
                placeholderTextColor="#CBD5E1"
                value={pNama}
                onChangeText={setPNama}
              />

              <Text style={styles.fieldLabel}>Harga (Rp) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Misal: 5000"
                placeholderTextColor="#CBD5E1"
                value={pHarga}
                onChangeText={setPHarga}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Satuan</Text>
              <View style={styles.satuanRow}>
                {SATUAN_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.satuanChip, pSatuan === s && styles.satuanChipActive]}
                    onPress={() => setPSatuan(s)}
                  >
                    <Text style={[styles.satuanChipText, pSatuan === s && styles.satuanChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.sectionBtn, { marginTop: 20, marginBottom: 8 }, savingProduk && { opacity: 0.6 }]}
                onPress={saveProdukForm}
                disabled={savingProduk}
              >
                {savingProduk
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.sectionBtnText}>Simpan Produk</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Backup Data */}
      <Modal visible={backupModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.backupModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Data Backup</Text>
              <TouchableOpacity onPress={() => setBackupModal(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.backupNote}>
              Salin semua teks di bawah ini dan simpan di tempat aman (Notes, Email, dsb.)
            </Text>
            <ScrollView style={styles.backupScroll} showsVerticalScrollIndicator>
              <Text style={styles.backupText} selectable>{backupData}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.sectionBtn, { marginTop: 12 }]}
              onPress={() => setBackupModal(false)}
            >
              <Text style={styles.sectionBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  accessTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#64748B' },
  accessSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#94A3B8' },

  section: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  sectionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748B', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Inter_400Regular', color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  saveRowBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  saveRowBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  sectionBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  purpleBtn: { backgroundColor: '#7C3AED' },
  orangeBtn: { backgroundColor: '#EA580C' },
  sectionBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  showPwBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 16 },
  showPwText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },

  addProdukBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addProdukBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0891B2' },
  produkRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 8,
    padding: 10, marginBottom: 8,
  },
  produkRowDim: { opacity: 0.5 },
  produkInfo: { flex: 1 },
  produkNama: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  produkMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#64748B', marginTop: 2 },
  produkActions: { flexDirection: 'row', gap: 6 },
  miniEditBtn: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: '#E0F7FA',
    justifyContent: 'center', alignItems: 'center',
  },
  miniDeleteBtn: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  backupModalBox: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, height: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  backupNote: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748B', marginBottom: 10 },
  backupScroll: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 },
  backupText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#374151', lineHeight: 18 },

  satuanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  satuanChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  satuanChipActive: { borderColor: '#0891B2', backgroundColor: '#E0F7FA' },
  satuanChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#64748B' },
  satuanChipTextActive: { color: '#0891B2', fontFamily: 'Inter_700Bold' },
});
