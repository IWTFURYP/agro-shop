const { db } = require('./db');

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z',
  и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '', "'": '', '’': '',
  ö: 'o', ü: 'u', ä: 'a', é: 'e', è: 'e', ß: 'ss',
};

function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'item';
}

const SLUG_TABLES = new Set(['products', 'categories', 'brands', 'articles', 'collections']);

// Повертає slug, якого ще немає в таблиці (додає -2, -3 ...).
function uniqueSlug(table, source, excludeId = null) {
  if (!SLUG_TABLES.has(table)) throw new Error(`Unknown table ${table}`);
  const base = slugify(source);
  const stmt = db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id IS NOT ?`);
  let slug = base;
  for (let i = 2; stmt.get(slug, excludeId); i++) slug = `${base}-${i}`;
  return slug;
}

// Посилання на зображення: http(s)://... або шлях від кореня сайту (/images/foto.jpg)
function isValidImageUrl(value) {
  if (!value) return true;
  if (value.startsWith('/')) return !value.startsWith('//');
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function str(value, max = 1000) {
  if (value == null) return '';
  return String(value).trim().slice(0, max);
}

function optionalNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith('380')) return `+${digits}`;
  return null;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parsePagination(query, defaultLimit = 12, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

// Перевіряє, що поле є непорожнім рядком у переліку дозволених значень.
function oneOf(value, allowed) {
  return allowed.includes(value) ? value : null;
}

const STOP_WORDS = new Set(['в', 'у', 'на', 'для', 'від', 'проти', 'та', 'і', 'й', 'з', 'із', 'по', 'при', 'як']);

// Розбиває пошуковий запит на "основи" слів, щоб «септоріоз пшениці»
// знаходив товари з «Пшениця» та «септоріоз» (відкидаємо закінчення).
function searchTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .split(/[^a-zа-яіїєґ0-9'-]+/i)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .slice(0, 6)
    .map((w) => (w.length > 5 ? w.slice(0, w.length - 2) : w));
}

module.exports = {
  searchTokens,
  HttpError,
  slugify,
  uniqueSlug,
  isValidImageUrl,
  str,
  optionalNumber,
  normalizePhone,
  isEmail,
  parsePagination,
  oneOf,
};
