const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });

const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Якщо секрет не задано в .env — генеруємо один раз і зберігаємо у файл,
// щоб адміністратора не "викидало" після кожного перезапуску сервера.
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(DATA_DIR, '.jwt-secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret);
  return secret;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  dbPath: process.env.DB_PATH ? path.resolve(ROOT, process.env.DB_PATH) : path.join(DATA_DIR, 'shop.db'),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: '7d',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin12345',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  frontendDist: path.join(ROOT, '..', 'frontend', 'dist'),
};
