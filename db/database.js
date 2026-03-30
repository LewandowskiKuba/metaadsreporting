import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'metrics.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    currency   TEXT DEFAULT 'PLN',
    status     INTEGER DEFAULT 1,
    synced_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_metrics (
    account_id      TEXT    NOT NULL,
    date            TEXT    NOT NULL,
    spend           REAL    DEFAULT 0,
    impressions     INTEGER DEFAULT 0,
    reach           INTEGER DEFAULT 0,
    clicks          INTEGER DEFAULT 0,
    unique_clicks   INTEGER DEFAULT 0,
    outbound_clicks INTEGER DEFAULT 0,
    leads           INTEGER DEFAULT 0,
    calls           INTEGER DEFAULT 0,
    purchase_value  REAL    DEFAULT 0,
    PRIMARY KEY (account_id, date)
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'viewer',
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_accounts (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, account_id)
  );
`);

export default db;
