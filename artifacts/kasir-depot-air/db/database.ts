/**
 * Database module — Kasir Depot Air Isi Ulang
 * Menggunakan expo-sqlite dengan async API (v14+)
 * Semua operasi CRUD untuk tabel: users, produk, member, voucher, transaksi
 */
import * as SQLite from 'expo-sqlite';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'kasir';
  nama: string;
  created_at: string;
};

export type Produk = {
  id: number;
  nama: string;
  harga: number;
  satuan: string;
  aktif: number;
  created_at: string;
};

export type Member = {
  id: number;
  nama: string;
  no_hp: string;
  poin: number;
  created_at: string;
};

export type Voucher = {
  id: number;
  kode: string;
  jenis: 'persen' | 'nominal';
  nilai: number;
  kuota: number;
  digunakan: number;
  expired: string;
  aktif: number;
  created_at: string;
};

export type Transaksi = {
  id: number;
  nomor: string;
  kasir_id: number;
  kasir_nama: string;
  total: number;
  diskon: number;
  grand_total: number;
  metode_bayar: string;
  voucher_kode: string | null;
  member_id: number | null;
  member_nama: string | null;
  poin_didapat: number;
  created_at: string;
};

export type TransaksiItem = {
  id: number;
  transaksi_id: number;
  produk_id: number;
  produk_nama: string;
  harga: number;
  qty: number;
  subtotal: number;
};

export type CartItem = {
  produk_id: number;
  produk_nama: string;
  harga: number;
  qty: number;
};

// ─── INISIALISASI DATABASE ────────────────────────────────────────────────────

/** Membuat semua tabel dan mengisi data dummy jika database baru */
export async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL mode untuk performa lebih baik
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Buat semua tabel
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      nama TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS produk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      harga INTEGER NOT NULL,
      satuan TEXT DEFAULT 'galon',
      aktif INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS member (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      no_hp TEXT UNIQUE NOT NULL,
      poin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS voucher (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode TEXT UNIQUE NOT NULL,
      jenis TEXT NOT NULL,
      nilai INTEGER NOT NULL,
      kuota INTEGER NOT NULL,
      digunakan INTEGER DEFAULT 0,
      expired TEXT NOT NULL,
      aktif INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor TEXT UNIQUE NOT NULL,
      kasir_id INTEGER NOT NULL,
      kasir_nama TEXT NOT NULL,
      total INTEGER NOT NULL,
      diskon INTEGER DEFAULT 0,
      grand_total INTEGER NOT NULL,
      metode_bayar TEXT DEFAULT 'Tunai',
      voucher_kode TEXT,
      member_id INTEGER,
      member_nama TEXT,
      poin_didapat INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transaksi_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL,
      produk_id INTEGER NOT NULL,
      produk_nama TEXT NOT NULL,
      harga INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pengaturan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // Cek apakah data sudah ada
  const count = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM users');
  if ((count?.c ?? 0) === 0) {
    await seedData(db);
  }
}

/** Isi data dummy untuk semua tabel */
async function seedData(db: SQLite.SQLiteDatabase): Promise<void> {
  // === USERS ===
  await db.runAsync('INSERT INTO users (username,password,role,nama) VALUES (?,?,?,?)',
    ['admin', '1234', 'admin', 'Administrator']);
  await db.runAsync('INSERT INTO users (username,password,role,nama) VALUES (?,?,?,?)',
    ['kasir', '1234', 'kasir', 'Kasir 1']);

  // === PRODUK ===
  await db.runAsync('INSERT INTO produk (nama,harga,satuan) VALUES (?,?,?)',
    ['Isi Ulang', 5000, 'galon']);
  await db.runAsync('INSERT INTO produk (nama,harga,satuan) VALUES (?,?,?)',
    ['Galon', 70000, 'buah']);
  await db.runAsync('INSERT INTO produk (nama,harga,satuan) VALUES (?,?,?)',
    ['Galon + Isi Ulang', 75000, 'paket']);

  // === PENGATURAN ===
  await db.runAsync('INSERT INTO pengaturan (key,value) VALUES (?,?)', ['nama_toko', 'Depot Air Segar']);

  // === MEMBERS (berbagai level poin) ===
  await db.runAsync('INSERT INTO member (nama,no_hp,poin) VALUES (?,?,?)', ['Budi Santoso', '08123456789', 250]);
  await db.runAsync('INSERT INTO member (nama,no_hp,poin) VALUES (?,?,?)', ['Siti Rahayu', '08234567890', 120]);
  await db.runAsync('INSERT INTO member (nama,no_hp,poin) VALUES (?,?,?)', ['Ahmad Fauzi', '08345678901', 45]);
  await db.runAsync('INSERT INTO member (nama,no_hp,poin) VALUES (?,?,?)', ['Dewi Kusuma', '08456789012', 0]);
  await db.runAsync('INSERT INTO member (nama,no_hp,poin) VALUES (?,?,?)', ['Rudi Hartono', '08567890123', 180]);

  // === VOUCHERS ===
  const d = new Date();
  const futureDate = new Date(d.getFullYear(), d.getMonth() + 3, d.getDate())
    .toISOString().split('T')[0];
  const pastDate = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate())
    .toISOString().split('T')[0];

  await db.runAsync('INSERT INTO voucher (kode,jenis,nilai,kuota,digunakan,expired,aktif) VALUES (?,?,?,?,?,?,?)',
    ['DISKON10', 'persen', 10, 50, 12, futureDate, 1]);
  await db.runAsync('INSERT INTO voucher (kode,jenis,nilai,kuota,digunakan,expired,aktif) VALUES (?,?,?,?,?,?,?)',
    ['HEMAT5K', 'nominal', 5000, 30, 8, futureDate, 1]);
  await db.runAsync('INSERT INTO voucher (kode,jenis,nilai,kuota,digunakan,expired,aktif) VALUES (?,?,?,?,?,?,?)',
    ['LEBARAN20', 'persen', 20, 100, 100, pastDate, 0]);

  // === TRANSAKSI DUMMY (7 hari terakhir) ===
  const kasirId = 2;
  const kasirNama = 'Kasir 1';
  const produkList = [
    { id: 1, nama: 'Isi Ulang', harga: 5000 },
    { id: 2, nama: 'Galon', harga: 70000 },
    { id: 3, nama: 'Galon + Isi Ulang', harga: 75000 },
  ];
  const metodes = ['Tunai', 'QRIS', 'Transfer'];

  const pad = (n: number) => String(n).padStart(2, '0');

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const numTx = i === 0 ? 3 : 2 + (i % 3);

    for (let j = 0; j < numTx; j++) {
      const prod = produkList[j % 3];
      const qty = 1 + (j % 2);
      const total = prod.harga * qty;
      const nomor = `TRX${dateStr.replace(/-/g, '')}${pad(j + 1)}`;
      const metode = metodes[j % 3];
      const createdAt = `${dateStr} ${pad(9 + j)}:${pad(j * 10)}:00`;

      const res = await db.runAsync(
        `INSERT INTO transaksi (nomor,kasir_id,kasir_nama,total,diskon,grand_total,metode_bayar,created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [nomor, kasirId, kasirNama, total, 0, total, metode, createdAt]
      );
      const txId = res.lastInsertRowId;

      await db.runAsync(
        `INSERT INTO transaksi_item (transaksi_id,produk_id,produk_nama,harga,qty,subtotal)
         VALUES (?,?,?,?,?,?)`,
        [txId, prod.id, prod.nama, prod.harga, qty, total]
      );
    }
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

/** Format angka ke Rupiah: 5000 → "Rp 5.000" */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** Format tanggal+waktu: "2026-07-12 09:30:00" → "12 Jul 2026, 09:30" */
export function formatDateTime(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Format tanggal saja */
export function formatDate(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Tanggal hari ini dalam format YYYY-MM-DD */
export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Level member berdasarkan poin. 1 poin = Rp 1.000 */
export function getMemberLevel(poin: number): { level: string; color: string; bgColor: string } {
  if (poin >= 200) return { level: 'Gold', color: '#92400E', bgColor: '#FEF3C7' };
  if (poin >= 50) return { level: 'Silver', color: '#374151', bgColor: '#E2E8F0' };
  return { level: 'Regular', color: '#1E3A5F', bgColor: '#EFF6FF' };
}

/** Status voucher berdasarkan data */
export function getVoucherStatus(v: Voucher): { status: string; color: string; bgColor: string } {
  const today = getTodayStr();
  if (!v.aktif) return { status: 'Nonaktif', color: '#64748B', bgColor: '#F1F5F9' };
  if (v.expired < today) return { status: 'Kadaluarsa', color: '#991B1B', bgColor: '#FEF2F2' };
  if (v.digunakan >= v.kuota) return { status: 'Habis', color: '#92400E', bgColor: '#FEF3C7' };
  return { status: 'Aktif', color: '#065F46', bgColor: '#ECFDF5' };
}

/** Generate nomor transaksi unik berbasis waktu */
export function generateNomor(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `TRX${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ─── USER ─────────────────────────────────────────────────────────────────────

/** Login: cari user dengan username dan password */
export async function loginUser(db: SQLite.SQLiteDatabase, username: string, password: string): Promise<User | null> {
  return await db.getFirstAsync<User>(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username.trim().toLowerCase(), password]
  );
}

export async function getUsers(db: SQLite.SQLiteDatabase): Promise<User[]> {
  return await db.getAllAsync<User>('SELECT * FROM users ORDER BY id');
}

export async function updatePassword(db: SQLite.SQLiteDatabase, userId: number, newPassword: string): Promise<void> {
  await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
}

// ─── PRODUK ───────────────────────────────────────────────────────────────────

export async function getProduk(db: SQLite.SQLiteDatabase, onlyActive = true): Promise<Produk[]> {
  if (onlyActive) {
    return await db.getAllAsync<Produk>('SELECT * FROM produk WHERE aktif = 1 ORDER BY id');
  }
  return await db.getAllAsync<Produk>('SELECT * FROM produk ORDER BY id');
}

export async function addProduk(db: SQLite.SQLiteDatabase, nama: string, harga: number, satuan: string): Promise<void> {
  await db.runAsync('INSERT INTO produk (nama,harga,satuan) VALUES (?,?,?)', [nama.trim(), harga, satuan.trim()]);
}

export async function updateProduk(db: SQLite.SQLiteDatabase, id: number, nama: string, harga: number, satuan: string): Promise<void> {
  await db.runAsync('UPDATE produk SET nama=?,harga=?,satuan=? WHERE id=?', [nama.trim(), harga, satuan.trim(), id]);
}

export async function softDeleteProduk(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE produk SET aktif=0 WHERE id=?', [id]);
}

// ─── MEMBER ───────────────────────────────────────────────────────────────────

export async function getMembers(db: SQLite.SQLiteDatabase, search?: string): Promise<Member[]> {
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    return await db.getAllAsync<Member>(
      'SELECT * FROM member WHERE nama LIKE ? OR no_hp LIKE ? ORDER BY nama',
      [q, q]
    );
  }
  return await db.getAllAsync<Member>('SELECT * FROM member ORDER BY nama');
}

export async function getMemberByPhone(db: SQLite.SQLiteDatabase, phone: string): Promise<Member | null> {
  return await db.getFirstAsync<Member>('SELECT * FROM member WHERE no_hp = ?', [phone.trim()]);
}

export async function getMemberCount(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM member');
  return row?.c ?? 0;
}

export async function addMember(db: SQLite.SQLiteDatabase, nama: string, noHp: string): Promise<void> {
  await db.runAsync('INSERT INTO member (nama,no_hp,poin) VALUES (?,?,0)', [nama.trim(), noHp.trim()]);
}

export async function updateMember(db: SQLite.SQLiteDatabase, id: number, nama: string, noHp: string, poin: number): Promise<void> {
  await db.runAsync('UPDATE member SET nama=?,no_hp=?,poin=? WHERE id=?', [nama.trim(), noHp.trim(), poin, id]);
}

export async function deleteMember(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM member WHERE id=?', [id]);
}

export async function addPoinMember(db: SQLite.SQLiteDatabase, id: number, poin: number): Promise<void> {
  await db.runAsync('UPDATE member SET poin=poin+? WHERE id=?', [poin, id]);
}

// ─── VOUCHER ──────────────────────────────────────────────────────────────────

export async function getVouchers(db: SQLite.SQLiteDatabase): Promise<Voucher[]> {
  return await db.getAllAsync<Voucher>('SELECT * FROM voucher ORDER BY created_at DESC');
}

export async function addVoucher(db: SQLite.SQLiteDatabase, data: Omit<Voucher, 'id' | 'created_at'>): Promise<void> {
  await db.runAsync(
    'INSERT INTO voucher (kode,jenis,nilai,kuota,digunakan,expired,aktif) VALUES (?,?,?,?,0,?,?)',
    [data.kode.trim().toUpperCase(), data.jenis, data.nilai, data.kuota, data.expired, data.aktif ?? 1]
  );
}

export async function updateVoucher(db: SQLite.SQLiteDatabase, id: number, data: Partial<Voucher>): Promise<void> {
  await db.runAsync(
    'UPDATE voucher SET kode=?,jenis=?,nilai=?,kuota=?,expired=?,aktif=? WHERE id=?',
    [data.kode, data.jenis, data.nilai, data.kuota, data.expired, data.aktif ?? 1, id]
  );
}

export async function deleteVoucher(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM voucher WHERE id=?', [id]);
}

/** Validasi kode voucher dan hitung diskon */
export async function validateVoucher(
  db: SQLite.SQLiteDatabase,
  kode: string,
  total: number
): Promise<{ valid: boolean; diskon: number; message: string; voucher?: Voucher }> {
  const v = await db.getFirstAsync<Voucher>(
    'SELECT * FROM voucher WHERE kode=? AND aktif=1',
    [kode.trim().toUpperCase()]
  );
  if (!v) return { valid: false, diskon: 0, message: 'Kode voucher tidak ditemukan' };

  const today = getTodayStr();
  if (v.expired < today) return { valid: false, diskon: 0, message: 'Voucher sudah kadaluarsa' };
  if (v.digunakan >= v.kuota) return { valid: false, diskon: 0, message: 'Kuota voucher sudah habis' };

  const diskon = v.jenis === 'persen'
    ? Math.floor(total * v.nilai / 100)
    : Math.min(v.nilai, total);

  const label = v.jenis === 'persen' ? `${v.nilai}%` : formatRupiah(v.nilai);
  return { valid: true, diskon, message: `Hemat ${label}`, voucher: v };
}

export async function useVoucher(db: SQLite.SQLiteDatabase, kode: string): Promise<void> {
  await db.runAsync('UPDATE voucher SET digunakan=digunakan+1 WHERE kode=?', [kode.toUpperCase()]);
}

// ─── TRANSAKSI ────────────────────────────────────────────────────────────────

export async function createTransaksi(
  db: SQLite.SQLiteDatabase,
  data: {
    kasirId: number;
    kasirNama: string;
    items: CartItem[];
    total: number;
    diskon: number;
    grandTotal: number;
    metodeBayar: string;
    voucherKode: string | null;
    memberId: number | null;
    memberNama: string | null;
    poinDidapat: number;
  }
): Promise<{ id: number; nomor: string }> {
  const nomor = generateNomor();

  const res = await db.runAsync(
    `INSERT INTO transaksi (nomor,kasir_id,kasir_nama,total,diskon,grand_total,metode_bayar,voucher_kode,member_id,member_nama,poin_didapat)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [nomor, data.kasirId, data.kasirNama, data.total, data.diskon, data.grandTotal,
      data.metodeBayar, data.voucherKode, data.memberId, data.memberNama, data.poinDidapat]
  );
  const txId = res.lastInsertRowId;

  for (const item of data.items) {
    await db.runAsync(
      `INSERT INTO transaksi_item (transaksi_id,produk_id,produk_nama,harga,qty,subtotal)
       VALUES (?,?,?,?,?,?)`,
      [txId, item.produk_id, item.produk_nama, item.harga, item.qty, item.harga * item.qty]
    );
  }

  // Tandai voucher digunakan
  if (data.voucherKode) {
    await useVoucher(db, data.voucherKode);
  }

  // Tambah poin member: grandTotal / 1000 (1 poin = Rp 1.000)
  if (data.memberId && data.poinDidapat > 0) {
    await addPoinMember(db, data.memberId, data.poinDidapat);
  }

  return { id: txId, nomor };
}

export async function getTransaksi(db: SQLite.SQLiteDatabase, limit = 100): Promise<Transaksi[]> {
  return await db.getAllAsync<Transaksi>(
    'SELECT * FROM transaksi ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function getTransaksiByDateRange(
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<Transaksi[]> {
  return await db.getAllAsync<Transaksi>(
    `SELECT * FROM transaksi
     WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
     ORDER BY created_at DESC`,
    [startDate, endDate]
  );
}

export async function getTransaksiItems(db: SQLite.SQLiteDatabase, transaksiId: number): Promise<TransaksiItem[]> {
  return await db.getAllAsync<TransaksiItem>(
    'SELECT * FROM transaksi_item WHERE transaksi_id=?',
    [transaksiId]
  );
}

// ─── STATISTIK ────────────────────────────────────────────────────────────────

/** Statistik hari ini */
export async function getTodayStats(db: SQLite.SQLiteDatabase): Promise<{
  totalPenjualan: number;
  jumlahTransaksi: number;
  produkTerjual: number;
}> {
  const today = getTodayStr();

  const stats = await db.getFirstAsync<{ total: number; count: number }>(
    `SELECT COALESCE(SUM(grand_total),0) as total, COUNT(*) as count
     FROM transaksi WHERE date(created_at) = date(?)`,
    [today]
  );

  const produk = await db.getFirstAsync<{ qty: number }>(
    `SELECT COALESCE(SUM(ti.qty),0) as qty
     FROM transaksi_item ti
     JOIN transaksi t ON ti.transaksi_id = t.id
     WHERE date(t.created_at) = date(?)`,
    [today]
  );

  return {
    totalPenjualan: stats?.total ?? 0,
    jumlahTransaksi: stats?.count ?? 0,
    produkTerjual: produk?.qty ?? 0,
  };
}

/** Penjualan 7 hari terakhir untuk grafik */
export async function getWeeklySales(db: SQLite.SQLiteDatabase): Promise<
  { label: string; total: number; date: string }[]
> {
  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(grand_total),0) as total FROM transaksi WHERE date(created_at) = date(?)`,
      [dateStr]
    );
    result.push({ label: dayLabels[d.getDay()], total: row?.total ?? 0, date: dateStr });
  }
  return result;
}

// ─── PENGATURAN ───────────────────────────────────────────────────────────────

export async function getSetting(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM pengaturan WHERE key=?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: SQLite.SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO pengaturan (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value]
  );
}

// ─── BACKUP ───────────────────────────────────────────────────────────────────

/** Export semua data ke string JSON */
export async function exportDatabase(db: SQLite.SQLiteDatabase): Promise<string> {
  const [users, produk, members, vouchers, transaksi, items, pengaturan] = await Promise.all([
    db.getAllAsync('SELECT * FROM users'),
    db.getAllAsync('SELECT * FROM produk'),
    db.getAllAsync('SELECT * FROM member'),
    db.getAllAsync('SELECT * FROM voucher'),
    db.getAllAsync('SELECT * FROM transaksi'),
    db.getAllAsync('SELECT * FROM transaksi_item'),
    db.getAllAsync('SELECT * FROM pengaturan'),
  ]);
  return JSON.stringify(
    { version: 1, timestamp: new Date().toISOString(), users, produk, members, vouchers, transaksi, items, pengaturan },
    null, 2
  );
}
