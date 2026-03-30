import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';

const SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_TTL = '30d';

// ── JWT ───────────────────────────────────────────────────────────────────────

export function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// ── Password ──────────────────────────────────────────────────────────────────

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// ── Express middleware ────────────────────────────────────────────────────────

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// Check that req.user can access a given accountId
export function checkAccountAccess(req, res, next) {
  if (req.user.role === 'admin') return next();
  const { accountId } = req.params;
  const row = db.prepare(
    'SELECT 1 FROM user_accounts WHERE user_id = ? AND account_id = ?'
  ).get(req.user.userId, accountId);
  if (!row) return res.status(403).json({ error: 'Access denied' });
  next();
}

// ── Seed initial admin ────────────────────────────────────────────────────────

export function seedAdmin() {
  const existing = db.prepare('SELECT COUNT(*) as n FROM users').get();
  if (existing.n > 0) return;

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('[auth] No users exist — set ADMIN_EMAIL + ADMIN_PASSWORD in .env to create initial admin');
    return;
  }

  db.prepare(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(email, 'Admin', hashPassword(password), 'admin');

  console.log(`[auth] Initial admin created: ${email}`);
}
