const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

// SQLite-функція LOWER() працює лише з латиницею, тому для пошуку
// українською реєструємо власну функцію з повною підтримкою Unicode.
db.function('ulower', { deterministic: true }, (value) =>
  value == null ? null : String(value).toLowerCase().replace(/[’`ʼ]/g, "'"),
);

// УВАГА: у базі зберігаються лише ПОСИЛАННЯ на зображення (image_url, url),
// а не самі файли.
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '',
    image_url   TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS brands (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    country     TEXT NOT NULL DEFAULT '',
    logo_url    TEXT NOT NULL DEFAULT '',
    website     TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS products (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    brand_id          INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    name              TEXT    NOT NULL,
    slug              TEXT    NOT NULL UNIQUE,
    sku               TEXT    NOT NULL DEFAULT '',
    short_description TEXT    NOT NULL DEFAULT '',
    description       TEXT    NOT NULL DEFAULT '',
    active_ingredient TEXT    NOT NULL DEFAULT '',
    formulation       TEXT    NOT NULL DEFAULT '',
    packaging         TEXT    NOT NULL DEFAULT '',
    unit              TEXT    NOT NULL DEFAULT 'шт',
    price             REAL,
    old_price         REAL,
    stock             INTEGER NOT NULL DEFAULT 0,
    crops             TEXT    NOT NULL DEFAULT '',
    image_url         TEXT    NOT NULL DEFAULT '',
    is_featured       INTEGER NOT NULL DEFAULT 0,
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand_id);
  CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active, is_featured);

  CREATE TABLE IF NOT EXISTS product_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url        TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    number           TEXT    UNIQUE,
    customer_name    TEXT    NOT NULL,
    phone            TEXT    NOT NULL,
    email            TEXT    NOT NULL DEFAULT '',
    company          TEXT    NOT NULL DEFAULT '',
    edrpou           TEXT    NOT NULL DEFAULT '',
    region           TEXT    NOT NULL DEFAULT '',
    city             TEXT    NOT NULL DEFAULT '',
    delivery_method  TEXT    NOT NULL,
    delivery_address TEXT    NOT NULL DEFAULT '',
    payment_method   TEXT    NOT NULL,
    comment          TEXT    NOT NULL DEFAULT '',
    total            REAL    NOT NULL DEFAULT 0,
    has_price_on_request INTEGER NOT NULL DEFAULT 0,
    status           TEXT    NOT NULL DEFAULT 'new',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT    NOT NULL,
    sku          TEXT    NOT NULL DEFAULT '',
    packaging    TEXT    NOT NULL DEFAULT '',
    unit         TEXT    NOT NULL DEFAULT 'шт',
    price        REAL,
    quantity     INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS service_requests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    email      TEXT NOT NULL DEFAULT '',
    region     TEXT NOT NULL DEFAULT '',
    crop       TEXT NOT NULL DEFAULT '',
    area       TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Оптові ціни: від min_qty одиниць діє ціна price
  CREATE TABLE IF NOT EXISTS product_price_tiers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_qty    INTEGER NOT NULL,
    price      REAL    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_price_tiers_product ON product_price_tiers(product_id);

  -- Сертифікати, інструкції (лише посилання на PDF)
  CREATE TABLE IF NOT EXISTS product_documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    url        TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_product_documents_product ON product_documents(product_id);

  -- Статті / поради агронома
  CREATE TABLE IF NOT EXISTS articles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    slug         TEXT    NOT NULL UNIQUE,
    excerpt      TEXT    NOT NULL DEFAULT '',
    content      TEXT    NOT NULL DEFAULT '',
    cover_url    TEXT    NOT NULL DEFAULT '',
    tags         TEXT    NOT NULL DEFAULT '',
    is_published INTEGER NOT NULL DEFAULT 1,
    published_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Сезонні добірки товарів
  CREATE TABLE IF NOT EXISTS collections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    subtitle    TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    image_url   TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS collection_products (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
  );

  -- Покупці з особистим кабінетом
  CREATE TABLE IF NOT EXISTS customers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,
    phone            TEXT NOT NULL DEFAULT '',
    password_hash    TEXT NOT NULL,
    company          TEXT NOT NULL DEFAULT '',
    edrpou           TEXT NOT NULL DEFAULT '',
    region           TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    delivery_address TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Відгуки про товари (публікуються після модерації)
  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    author_name TEXT    NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text        TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'pending',
    admin_reply TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, status);

  -- Календар обробок: етапи сезону для кожної культури
  CREATE TABLE IF NOT EXISTS calendar_steps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    crop        TEXT    NOT NULL,
    month_from  INTEGER NOT NULL CHECK (month_from BETWEEN 1 AND 12),
    month_to    INTEGER NOT NULL CHECK (month_to BETWEEN 1 AND 12),
    stage       TEXT    NOT NULL DEFAULT '',
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS calendar_step_products (
    step_id    INTEGER NOT NULL REFERENCES calendar_steps(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (step_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Міграції: додаємо нові колонки до вже існуючої бази, не втрачаючи даних
function addColumn(table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Норма витрати на 1 га (у базових одиницях rate_unit) та об'єм однієї упаковки
addColumn('products', 'rate_min', 'REAL');
addColumn('products', 'rate_max', 'REAL');
addColumn('products', 'rate_unit', "TEXT NOT NULL DEFAULT ''");
addColumn('products', 'package_size', 'REAL');
// Проблеми, які вирішує товар: бур'яни, хвороби, шкідники (через кому)
addColumn('products', 'targets', "TEXT NOT NULL DEFAULT ''");
// Поріг «закінчується на складі» для нагадувань в адмінці
addColumn('products', 'min_stock', 'INTEGER NOT NULL DEFAULT 5');
// Замовлення зареєстрованого покупця та чи списано товар зі складу
addColumn('orders', 'customer_id', 'INTEGER REFERENCES customers(id) ON DELETE SET NULL');
addColumn('orders', 'stock_reserved', 'INTEGER NOT NULL DEFAULT 0');
// Скільки одиниць позиції списано зі складу (для повернення при скасуванні)
addColumn('order_items', 'reserved_qty', 'INTEGER NOT NULL DEFAULT 0');
db.exec('CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)');

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, transaction };
