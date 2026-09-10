const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();

const FREE_SESSIONS = parseInt(process.env.FREE_SESSIONS) || 3;

// ── POST /api/auth/signup ──────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password)
    return res.status(400).json({ error: 'Champs manquants' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (6 min)' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (email, name, password) VALUES (?, ?, ?)');
    const result = stmt.run(email.toLowerCase().trim(), name.trim(), hash);
    const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: result.lastInsertRowid, email, name, sessions: 0, freeLeft: FREE_SESSIONS } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs manquants' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const freeLeft = user.subscribed ? Infinity : Math.max(0, FREE_SESSIONS - user.sessions);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '90d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, sessions: user.sessions, subscribed: !!user.subscribed, freeLeft } });
});

// ── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, sessions, subscribed FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const freeLeft = user.subscribed ? 999 : Math.max(0, FREE_SESSIONS - user.sessions);
  res.json({ ...user, subscribed: !!user.subscribed, freeLeft });
});

// ── Middleware auth ────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token manquant' });
  try {
    const payload = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = { router, requireAuth };
