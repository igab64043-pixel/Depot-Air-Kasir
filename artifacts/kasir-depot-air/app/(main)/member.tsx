/**
 * Halaman Member — Daftar, tambah, edit, hapus member
 * Akses: Admin dan Kasir
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Modal, Alert, Platform,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import {
  getMembers, addMember, updateMember, deleteMember,
  getMemberLevel, type Member,
} from '@/db/database';

const LEVEL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Regular: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Regular' },
  Silver:  { bg: '#F1F5F9', text: '#475569', label: 'Silver' },
  Gold:    { bg: '#FEF9C3', text: '#92400E', label: 'Gold' },
};

export default function MemberScreen() {
  const db = useDatabase();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [memberList, setMemberList] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formHP, setFormHP] = useState('');
  const [formPoin, setFormPoin] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    const data = await getMembers(db);
    setMemberList(data);
    setLoading(false);
  }, [db]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Filter berdasarkan search
  const filtered = search.trim()
    ? memberList.filter(m =>
        m.nama.toLowerCase().includes(search.toLowerCase()) ||
        m.no_hp.includes(search)
      )
    : memberList;

  function openAdd() {
    setEditMember(null);
    setFormNama('');
    setFormHP('');
    setFormPoin('0');
    setModalVisible(true);
  }

  function openEdit(m: Member) {
    setEditMember(m);
    setFormNama(m.nama);
    setFormHP(m.no_hp);
    setFormPoin(String(m.poin));
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formNama.trim()) { Alert.alert('Error', 'Nama tidak boleh kosong'); return; }
    if (!formHP.trim()) { Alert.alert('Error', 'No HP tidak boleh kosong'); return; }
    setSaving(true);
    try {
      if (editMember) {
        await updateMember(db, editMember.id, formNama.trim(), formHP.trim(), Number(formPoin) || 0);
      } else {
        await addMember(db, formNama.trim(), formHP.trim());
      }
      setModalVisible(false);
      await loadMembers();
    } catch (e: any) {
      const isUnique = String(e?.message).includes('UNIQUE');
      Alert.alert('Error', isUnique ? 'No HP sudah terdaftar' : 'Gagal menyimpan data member');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(m: Member) {
    Alert.alert(
      'Hapus Member',
      `Apakah Anda yakin ingin menghapus ${m.nama}? Data tidak dapat dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await deleteMember(db, m.id);
            await loadMembers();
          },
        },
      ]
    );
  }

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const currentLevelPoin = getMemberLevel(Number(formPoin) || 0);

  function renderMember({ item: m }: { item: Member }) {
    const levelInfo = getMemberLevel(m.poin);
    const ls = LEVEL_STYLE[levelInfo.level] ?? LEVEL_STYLE.Regular;
    const isAdmin = user?.role === 'admin';
    return (
      <View style={styles.memberRow}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{m.nama.charAt(0).toUpperCase()}</Text>
        </View>

        {/* Info */}
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberNama} numberOfLines={1}>{m.nama}</Text>
            <View style={[styles.levelBadge, { backgroundColor: ls.bg }]}>
              <Text style={[styles.levelText, { color: ls.text }]}>{ls.label}</Text>
            </View>
          </View>
          <Text style={styles.memberHP}>{m.no_hp}</Text>
          <Text style={styles.memberPoin}>{m.poin} poin</Text>
        </View>

        {/* Aksi */}
        {isAdmin && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(m)}>
              <MaterialIcons name="edit" size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(m)}>
              <MaterialIcons name="delete" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Member"
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau no HP..."
          placeholderTextColor="#CBD5E1"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Statistik level */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{filtered.length} member</Text>
        <View style={styles.levelChips}>
          {['Regular', 'Silver', 'Gold'].map(lv => (
            <View key={lv} style={[styles.chip, { backgroundColor: LEVEL_STYLE[lv].bg }]}>
              <Text style={[styles.chipText, { color: LEVEL_STYLE[lv].text }]}>
                {lv}: {memberList.filter(m => getMemberLevel(m.poin).level === lv).length}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderMember}
        contentContainerStyle={{ paddingBottom: bottomPad + 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{loading ? 'Memuat...' : 'Belum ada member'}</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddText}>+ Tambah Member Pertama</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal Tambah/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editMember ? 'Edit Member' : 'Tambah Member'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Nama */}
                <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Masukkan nama"
                  placeholderTextColor="#CBD5E1"
                  value={formNama}
                  onChangeText={setFormNama}
                />

                {/* No HP */}
                <Text style={styles.fieldLabel}>No HP *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="08xx-xxxx-xxxx"
                  placeholderTextColor="#CBD5E1"
                  value={formHP}
                  onChangeText={setFormHP}
                  keyboardType="phone-pad"
                />

                {/* Poin (hanya edit) */}
                {editMember && (
                  <>
                    <Text style={styles.fieldLabel}>Poin</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="0"
                      placeholderTextColor="#CBD5E1"
                      value={formPoin}
                      onChangeText={setFormPoin}
                      keyboardType="numeric"
                    />
                    {/* Info level */}
                    <View style={styles.levelInfo}>
                      <Text style={styles.levelInfoText}>
                        Level saat ini: {currentLevelPoin.level}
                      </Text>
                      <Text style={styles.levelInfoSub}>
                        Regular: 0–49 poin  |  Silver: 50–199 poin  |  Gold: 200+ poin
                      </Text>
                    </View>
                  </>
                )}

                {/* Tombol simpan */}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  addBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 4,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 10,
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#0F172A',
  },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8,
  },
  summaryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748B' },
  levelChips: { flexDirection: 'row', gap: 4 },
  chip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 10, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1, gap: 10,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  memberInfo: { flex: 1 },
  memberNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  memberNama: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#0F172A', flexShrink: 1 },
  levelBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  levelText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  memberHP: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748B', marginTop: 2 },
  memberPoin: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#7C3AED', marginTop: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#94A3B8' },
  emptyAddBtn: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  emptyAddText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#2563EB' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  fieldLabel: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151', marginBottom: 6, marginTop: 12,
  },
  fieldInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  levelInfo: {
    backgroundColor: '#F5F3FF', borderRadius: 8, padding: 10, marginTop: 12,
  },
  levelInfoText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6D28D9' },
  levelInfoSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#7C3AED', marginTop: 2 },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
