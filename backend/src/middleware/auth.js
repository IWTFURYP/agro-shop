const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils');

function readToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function requireAdmin(req, _res, next) {
  const token = readToken(req);
  if (!token) throw new HttpError(401, 'Потрібна авторизація');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Сесія завершилась, увійдіть знову');
  }
  // Токен покупця не дає доступу до адмін-панелі
  if (payload.role === 'customer') throw new HttpError(403, 'Недостатньо прав');
  req.admin = payload;
  next();
}

function signToken(admin) {
  return jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/* ---------- Покупці ---------- */

function signCustomerToken(customer) {
  return jwt.sign({ id: customer.id, role: 'customer' }, config.jwtSecret, { expiresIn: '30d' });
}

function decodeCustomer(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return payload.role === 'customer' ? payload : null;
  } catch {
    return null;
  }
}

function requireCustomer(req, _res, next) {
  const customer = decodeCustomer(req);
  if (!customer) throw new HttpError(401, 'Увійдіть в особистий кабінет');
  req.customer = customer;
  next();
}

// Не вимагає входу, але якщо покупець увійшов — додає req.customer
function optionalCustomer(req, _res, next) {
  req.customer = decodeCustomer(req);
  next();
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

module.exports = {
  requireAdmin,
  signToken,
  signCustomerToken,
  requireCustomer,
  optionalCustomer,
  loginRateLimit,
  registerFailedLogin,
  clearFailedLogins,
};
