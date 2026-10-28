const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils');

function requireAdmin(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Потрібна авторизація');
  try {
    req.admin = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Сесія завершилась, увійдіть знову');
  }
  next();
}

function signToken(admin) {
  return jwt.sign({ id: admin.id, username: admin.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Простий захист від перебору паролів: не більше 10 спроб за 15 хвилин з однієї IP.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function loginRateLimit(req, _res, next) {
  const now = Date.now();
  const entry = attempts.get(req.ip);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    throw new HttpError(429, 'Забагато спроб входу. Спробуйте через 15 хвилин');
  }
  next();
}

function registerFailedLogin(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

function clearFailedLogins(ip) {
  attempts.delete(ip);
}

module.exports = { requireAdmin, signToken, loginRateLimit, registerFailedLogin, clearFailedLogins };
