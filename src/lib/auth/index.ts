/**
 * Admin Authentication.
 * Simple API-token-based auth for super admins.
 * No external dependencies — uses crypto for password hashing.
 */

import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

// ─── PASSWORD HASHING ─────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return hash === verify;
}

// ─── SETUP ─────────────────────────────────────────────────────

export function setupAdmins(admins: { email: string; name: string; password: string }[]) {
  const db = getDb();

  for (const admin of admins) {
    const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(admin.email);
    if (!existing) {
      const token = `marvvy_${uuid().replace(/-/g, '')}`;
      db.prepare(
        `INSERT INTO admins (id, email, name, password_hash, api_token, role)
         VALUES (?, ?, ?, ?, ?, 'super_admin')`
      ).run(uuid(), admin.email, admin.name, hashPassword(admin.password), token);
      console.log(`✅ Admin created: ${admin.email} | Token: ${token}`);
    }
  }
}

// ─── AUTHENTICATE ──────────────────────────────────────────────

export function authenticateByToken(token: string): {
  id: string;
  email: string;
  name: string;
  role: string;
} | null {
  const db = getDb();
  const admin = db
    .prepare('SELECT id, email, name, role FROM admins WHERE api_token = ? AND is_active = 1')
    .get(token) as any;

  if (admin) {
    db.prepare("UPDATE admins SET last_login = datetime('now') WHERE id = ?").run(admin.id);
    return admin;
  }
  return null;
}

export function authenticateByPassword(
  email: string,
  password: string
): { id: string; email: string; name: string; role: string; token: string } | null {
  const db = getDb();
  const admin = db
    .prepare('SELECT * FROM admins WHERE email = ? AND is_active = 1')
    .get(email) as any;

  if (!admin) return null;
  if (!verifyPassword(password, admin.password_hash)) return null;

  db.prepare("UPDATE admins SET last_login = datetime('now') WHERE id = ?").run(admin.id);

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    token: admin.api_token,
  };
}

// ─── MIDDLEWARE HELPER ─────────────────────────────────────────

export function requireAuth(request: Request): { admin: ReturnType<typeof authenticateByToken> } | { error: string; status: number } {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { error: 'Authorization required. Use Bearer <token>', status: 401 };
  }

  const admin = authenticateByToken(token);
  if (!admin) {
    return { error: 'Invalid or expired token', status: 403 };
  }

  return { admin };
}

// ─── LIST ADMINS ───────────────────────────────────────────────

export function listAdmins() {
  const db = getDb();
  return db
    .prepare('SELECT id, email, name, role, is_active, last_login, created_at FROM admins')
    .all();
}
