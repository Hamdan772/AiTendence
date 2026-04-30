const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dataDir = process.env.VERCEL
  ? path.join("/tmp", "attendra-data")
  : path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "attendance.db");

async function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT,
      parent_email TEXT,
      phone TEXT,
      parent_phone TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await ensureStudentFaceColumns(db);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_date TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ("present", "absent")),
      recorded_at TEXT NOT NULL,
      UNIQUE(session_id, student_id),
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS alert_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(student_id, session_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE
    );
  `);

  await seedDefaults(db);

  return db;
}

async function seedDefaults(db) {
  await ensureSetting(db, "cutoff_percent", "75");
  await ensureSetting(db, "notify_enabled", "0");
  await ensureSetting(db, "smtp_host", "");
  await ensureSetting(db, "smtp_port", "587");
  await ensureSetting(db, "smtp_user", "");
  await ensureSetting(db, "smtp_pass", "");
  await ensureSetting(db, "smtp_from", "");
  await ensureSetting(db, "admin_password_hash", "");
}

async function ensureSetting(db, key, value) {
  const row = await db.get("SELECT value FROM settings WHERE key = ?", key);
  if (!row) {
    await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", key, value);
  }
}

async function ensureStudentFaceColumns(db) {
  const columns = await db.all("PRAGMA table_info(students)");
  const hasFaceDescriptor = columns.some((column) => column.name === "face_descriptor");
  const hasFaceEnrolledAt = columns.some((column) => column.name === "face_enrolled_at");

  if (!hasFaceDescriptor) {
    await db.exec("ALTER TABLE students ADD COLUMN face_descriptor TEXT");
  }

  if (!hasFaceEnrolledAt) {
    await db.exec("ALTER TABLE students ADD COLUMN face_enrolled_at TEXT");
  }
}

module.exports = { initDb };
