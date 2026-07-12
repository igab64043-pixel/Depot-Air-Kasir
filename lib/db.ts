import Database from 'better-sqlite3';
const db = new Database('kasir.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    point INTEGER DEFAULT 0
  );
`);

export function addPoint(memberId: number) {
  db.prepare('UPDATE members SET point = point + 1 WHERE id = ?').run(memberId);
}

export function getMembers() {
  return db.prepare('SELECT * FROM members ORDER BY point DESC').all();
}

export function addMember(name: string, phone: string) {
  db.prepare('INSERT INTO members (name, phone) VALUES (?,?)').run(name, phone);
}

export default db;
