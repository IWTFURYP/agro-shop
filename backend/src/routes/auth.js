const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { HttpError, str } = require('../utils');
const {
  requireAdmin,
  signToken,
  loginRateLimit,
  registerFailedLogin,
  clearFailedLogins,
} = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginRateLimit, (req, res) => {
  const username = str(req.body?.username, 60);
  const password = String(req.body?.password || '');
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    registerFailedLogin(req.ip);
    throw new HttpError(401, 'Невірний логін або пароль');
  }
  clearFailedLogins(req.ip);
  res.json({ token: signToken(admin), user: { id: admin.id, username: admin.username } });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ id: req.admin.id, username: req.admin.username });
});

router.post('/change-password', requireAdmin, (req, res) => {
  const current = String(req.body?.current_password || '');
  const next = String(req.body?.new_password || '');
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);

  if (!admin || !bcrypt.compareSync(current, admin.password_hash)) {
    throw new HttpError(400, 'Поточний пароль невірний', { current_password: 'Невірний пароль' });
  }
  if (next.length < 8) {
    throw new HttpError(400, 'Пароль занадто короткий', { new_password: 'Мінімум 8 символів' });
  }
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), admin.id);
  res.json({ ok: true });
});

module.exports = router;
