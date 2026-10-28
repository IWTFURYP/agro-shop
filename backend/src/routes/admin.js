const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const {
  HttpError,
  uniqueSlug,
  isValidImageUrl,
  str,
  optionalNumber,
  parsePagination,
  oneOf,
} = require('../utils');
const { transaction } = require('../db');
const products = require('../models/products');

const router = express.Router();
router.use(requireAdmin);

const ORDER_STATUSES = ['new', 'processing', 'shipped', 'completed', 'cancelled'];
const REQUEST_STATUSES = ['new', 'in_progress', 'done'];

function toId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Некоректний ідентифікатор');
  return id;
}

/* ---------- Статистика ---------- */

router.get('/stats', (_req, res) => {
  const one = (sql) => db.prepare(sql).get();
  res.json({
    products: one('SELECT COUNT(*) AS n FROM products').n,
    products_active: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1').n,
    products_out_of_stock: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock = 0').n,
    products_without_image: one("SELECT COUNT(*) AS n FROM products WHERE image_url = ''").n,
    orders_total: one('SELECT COUNT(*) AS n FROM orders').n,
    orders_new: one("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'").n,
    revenue_completed: one("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status = 'completed'").s,
    requests_new: one("SELECT COUNT(*) AS n FROM service_requests WHERE status = 'new'").n,
    latest_orders: db
      .prepare('SELECT id, number, customer_name, phone, total, status, created_at FROM orders ORDER BY id DESC LIMIT 5')
      .all(),
  });
});

/* ---------- Товари ---------- */

router.get('/products', (req, res) => {
  res.json(products.listProducts(req.query, parsePagination(req.query, 20, 100), { includeInactive: true }));
});

router.get('/products/:id', (req, res) => {
  const product = products.getProductBy('id', toId(req.params.id), { includeInactive: true });
  if (!product) throw new HttpError(404, 'Товар не знайдено');
  res.json(product);
});

router.post('/products', (req, res) => {
  res.status(201).json(products.createProduct(req.body || {}));
});

router.put('/products/:id', (req, res) => {
  res.json(products.updateProduct(toId(req.params.id), req.body || {}));
});

// Швидка зміна окремих полів зі списку (активність, хіт, залишок, ціна)
router.patch('/products/:id', (req, res) => {
  const id = toId(req.params.id);
  const body = req.body || {};
  const sets = [];
  const params = [];
  if ('is_active' in body) { sets.push('is_active = ?'); params.push(body.is_active ? 1 : 0); }
  if ('is_featured' in body) { sets.push('is_featured = ?'); params.push(body.is_featured ? 1 : 0); }
  if ('stock' in body) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) throw new HttpError(400, 'Некоректний залишок');
    sets.push('stock = ?'); params.push(stock);
  }
  if ('price' in body) {
    const price = optionalNumber(body.price);
    if (Number.isNaN(price) || (price != null && price < 0)) throw new HttpError(400, 'Некоректна ціна');
    sets.push('price = ?'); params.push(price);
  }
  if (!sets.length) throw new HttpError(400, 'Немає полів для оновлення');
  const { changes } = db
    .prepare(`UPDATE products SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .run(...params, id);
  if (!changes) throw new HttpError(404, 'Товар не знайдено');
  res.json(products.getProductBy('id', id, { includeInactive: true }));
});

router.delete('/products/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Товар не знайдено');
  res.status(204).end();
});

/* ---------- Категорії ---------- */

function parseCategory(body, id = null) {
  const data = {
    name: str(body.name, 120),
    description: str(body.description, 2000),
    icon: str(body.icon, 40),
    image_url: str(body.image_url, 2000),
    parent_id: optionalNumber(body.parent_id),
    sort_order: optionalNumber(body.sort_order) ?? 0,
  };
  const errors = {};
  if (!data.name) errors.name = 'Вкажіть назву';
  if (!isValidImageUrl(data.image_url)) errors.image_url = 'Некоректне посилання';
  if (Number.isNaN(data.sort_order)) errors.sort_order = 'Має бути числом';
  if (data.parent_id != null) {
    if (data.parent_id === id) errors.parent_id = 'Категорія не може бути батьківською сама для себе';
    else if (!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(data.parent_id)) {
      errors.parent_id = 'Батьківську категорію не знайдено';
    }
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте поля', errors);
  return data;
}

router.get('/categories', (_req, res) => {
  res.json(
    db.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.sort_order, c.name`,
    ).all(),
  );
});

router.post('/categories', (req, res) => {
  const data = parseCategory(req.body || {});
  const slug = uniqueSlug('categories', req.body.slug || data.name);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO categories (parent_id, name, slug, description, icon, image_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(data.parent_id, data.name, slug, data.description, data.icon, data.image_url, data.sort_order);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(lastInsertRowid));
});

router.put('/categories/:id', (req, res) => {
  const id = toId(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Категорію не знайдено');
  const data = parseCategory(req.body || {}, id);
  const slug = req.body.slug && req.body.slug !== existing.slug ? uniqueSlug('categories', req.body.slug, id) : existing.slug;
  db.prepare(
    `UPDATE categories SET parent_id = ?, name = ?, slug = ?, description = ?, icon = ?, image_url = ?, sort_order = ?
     WHERE id = ?`,
  ).run(data.parent_id, data.name, slug, data.description, data.icon, data.image_url, data.sort_order, id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

router.delete('/categories/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM categories WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Категорію не знайдено');
  res.status(204).end();
});

/* ---------- Виробники / бренди ---------- */

function parseBrand(body) {
  const data = {
    name: str(body.name, 120),
    country: str(body.country, 60),
    logo_url: str(body.logo_url, 2000),
    website: str(body.website, 300),
    description: str(body.description, 2000),
  };
  const errors = {};
  if (!data.name) errors.name = 'Вкажіть назву';
  if (!isValidImageUrl(data.logo_url)) errors.logo_url = 'Некоректне посилання';
  if (data.website && !isValidImageUrl(data.website)) errors.website = 'Некоректне посилання';
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте поля', errors);
  return data;
}

function assertUniqueBrandName(name, id = null) {
  if (db.prepare('SELECT 1 FROM brands WHERE name = ? AND id IS NOT ?').get(name, id)) {
    throw new HttpError(409, 'Виробник з такою назвою вже існує', { name: 'Назва вже використовується' });
  }
}

router.get('/brands', (_req, res) => {
  res.json(
    db.prepare(
      `SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count
       FROM brands b ORDER BY b.name`,
    ).all(),
  );
});

router.post('/brands', (req, res) => {
  const data = parseBrand(req.body || {});
  assertUniqueBrandName(data.name);
  const slug = uniqueSlug('brands', data.name);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO brands (name, slug, country, logo_url, website, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run(data.name, slug, data.country, data.logo_url, data.website, data.description);
  res.status(201).json(db.prepare('SELECT * FROM brands WHERE id = ?').get(lastInsertRowid));
});

router.put('/brands/:id', (req, res) => {
  const id = toId(req.params.id);
  const data = parseBrand(req.body || {});
  assertUniqueBrandName(data.name, id);
  const { changes } = db
    .prepare('UPDATE brands SET name = ?, country = ?, logo_url = ?, website = ?, description = ? WHERE id = ?')
    .run(data.name, data.country, data.logo_url, data.website, data.description, id);
  if (!changes) throw new HttpError(404, 'Виробника не знайдено');
  res.json(db.prepare('SELECT * FROM brands WHERE id = ?').get(id));
});

router.delete('/brands/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM brands WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Виробника не знайдено');
  res.status(204).end();
});

/* ---------- Замовлення ---------- */

router.get('/orders', (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = [];
  const params = [];
  const status = oneOf(req.query.status, ORDER_STATUSES);
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (req.query.search) {
    const q = `%${String(req.query.search).toLowerCase()}%`;
    where.push('(ulower(o.customer_name) LIKE ? OR o.phone LIKE ? OR o.number LIKE ? OR ulower(o.company) LIKE ?)');
    params.push(q, q, q, q);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`).get(...params);
  const items = db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS items_count
       FROM orders o ${whereSql} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);
  res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/orders/:id', (req, res) => {
  const id = toId(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw new HttpError(404, 'Замовлення не знайдено');
  order.items = db
    .prepare(
      `SELECT i.*, p.slug AS product_slug, p.image_url
       FROM order_items i LEFT JOIN products p ON p.id = i.product_id
       WHERE i.order_id = ? ORDER BY i.id`,
    )
    .all(id);
  res.json(order);
});

router.patch('/orders/:id', (req, res) => {
  const id = toId(req.params.id);
  const status = oneOf(req.body?.status, ORDER_STATUSES);
  if (!status) throw new HttpError(400, 'Некоректний статус');
  const { changes } = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  if (!changes) throw new HttpError(404, 'Замовлення не знайдено');
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(id));
});

router.delete('/orders/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM orders WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Замовлення не знайдено');
  res.status(204).end();
});

/* ---------- Заявки ---------- */

router.get('/requests', (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const status = oneOf(req.query.status, REQUEST_STATUSES);
  const whereSql = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM service_requests ${whereSql}`).get(...params);
  const items = db
    .prepare(`SELECT * FROM service_requests ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.patch('/requests/:id', (req, res) => {
  const id = toId(req.params.id);
  const status = oneOf(req.body?.status, REQUEST_STATUSES);
  if (!status) throw new HttpError(400, 'Некоректний статус');
  const { changes } = db.prepare('UPDATE service_requests SET status = ? WHERE id = ?').run(status, id);
  if (!changes) throw new HttpError(404, 'Заявку не знайдено');
  res.json(db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id));
});

router.delete('/requests/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM service_requests WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Заявку не знайдено');
  res.status(204).end();
});

/* ---------- Статті ---------- */

function parseArticle(body) {
  const data = {
    title: str(body.title, 200),
    excerpt: str(body.excerpt, 500),
    content: str(body.content, 100000),
    cover_url: str(body.cover_url, 2000),
    tags: String(body.tags || '').split(',').map((t) => str(t, 40)).filter(Boolean).join(', '),
    is_published: body.is_published === undefined || body.is_published ? 1 : 0,
    published_at: str(body.published_at, 30),
  };
  const errors = {};
  if (!data.title) errors.title = 'Вкажіть заголовок';
  if (!isValidImageUrl(data.cover_url)) errors.cover_url = 'Некоректне посилання';
  if (data.published_at && Number.isNaN(Date.parse(data.published_at))) errors.published_at = 'Некоректна дата';
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте поля', errors);
  if (!data.published_at) data.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return data;
}

router.get('/articles', (_req, res) => {
  res.json(db.prepare('SELECT id, title, slug, tags, is_published, published_at FROM articles ORDER BY published_at DESC, id DESC').all());
});

router.get('/articles/:id', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(toId(req.params.id));
  if (!article) throw new HttpError(404, 'Статтю не знайдено');
  res.json(article);
});

router.post('/articles', (req, res) => {
  const d = parseArticle(req.body || {});
  const slug = uniqueSlug('articles', req.body.slug || d.title);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO articles (title, slug, excerpt, content, cover_url, tags, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(d.title, slug, d.excerpt, d.content, d.cover_url, d.tags, d.is_published, d.published_at);
  res.status(201).json(db.prepare('SELECT * FROM articles WHERE id = ?').get(lastInsertRowid));
});

router.put('/articles/:id', (req, res) => {
  const id = toId(req.params.id);
  const existing = db.prepare('SELECT slug FROM articles WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Статтю не знайдено');
  const d = parseArticle(req.body || {});
  const slug = req.body.slug && req.body.slug !== existing.slug ? uniqueSlug('articles', req.body.slug, id) : existing.slug;
  db.prepare(
    `UPDATE articles SET title = ?, slug = ?, excerpt = ?, content = ?, cover_url = ?, tags = ?,
       is_published = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(d.title, slug, d.excerpt, d.content, d.cover_url, d.tags, d.is_published, d.published_at, id);
  res.json(db.prepare('SELECT * FROM articles WHERE id = ?').get(id));
});

router.delete('/articles/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM articles WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Статтю не знайдено');
  res.status(204).end();
});

/* ---------- Сезонні добірки ---------- */

function parseCollection(body) {
  const data = {
    title: str(body.title, 120),
    subtitle: str(body.subtitle, 120),
    description: str(body.description, 1000),
    image_url: str(body.image_url, 2000),
    icon: str(body.icon, 40),
    is_active: body.is_active === undefined || body.is_active ? 1 : 0,
    sort_order: optionalNumber(body.sort_order) ?? 0,
  };
  const productIds = [...new Set((Array.isArray(body.product_ids) ? body.product_ids : []).map(Number))]
    .filter((n) => Number.isInteger(n) && n > 0);
  const errors = {};
  if (!data.title) errors.title = 'Вкажіть назву';
  if (!isValidImageUrl(data.image_url)) errors.image_url = 'Некоректне посилання';
  if (Number.isNaN(data.sort_order)) errors.sort_order = 'Має бути числом';
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте поля', errors);
  return { data, productIds };
}

function saveCollectionProducts(collectionId, productIds) {
  db.prepare('DELETE FROM collection_products WHERE collection_id = ?').run(collectionId);
  const insert = db.prepare(
    `INSERT INTO collection_products (collection_id, product_id, sort_order)
     SELECT ?, id, ? FROM products WHERE id = ?`,
  );
  productIds.forEach((pid, i) => insert.run(collectionId, i, pid));
}

function getCollection(id) {
  const c = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!c) return null;
  c.product_ids = db
    .prepare('SELECT product_id FROM collection_products WHERE collection_id = ? ORDER BY sort_order')
    .all(id)
    .map((r) => r.product_id);
  return c;
}

router.get('/collections', (_req, res) => {
  res.json(
    db.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id = c.id) AS product_count
       FROM collections c ORDER BY c.sort_order, c.id`,
    ).all(),
  );
});

router.get('/collections/:id', (req, res) => {
  const c = getCollection(toId(req.params.id));
  if (!c) throw new HttpError(404, 'Добірку не знайдено');
  res.json(c);
});

router.post('/collections', (req, res) => {
  const { data, productIds } = parseCollection(req.body || {});
  const slug = uniqueSlug('collections', req.body.slug || data.title);
  const id = transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO collections (title, slug, subtitle, description, image_url, icon, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(data.title, slug, data.subtitle, data.description, data.image_url, data.icon, data.is_active, data.sort_order);
    saveCollectionProducts(lastInsertRowid, productIds);
    return lastInsertRowid;
  });
  res.status(201).json(getCollection(id));
});

router.put('/collections/:id', (req, res) => {
  const id = toId(req.params.id);
  const existing = db.prepare('SELECT slug FROM collections WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Добірку не знайдено');
  const { data, productIds } = parseCollection(req.body || {});
  const slug = req.body.slug && req.body.slug !== existing.slug ? uniqueSlug('collections', req.body.slug, id) : existing.slug;
  transaction(() => {
    db.prepare(
      `UPDATE collections SET title = ?, slug = ?, subtitle = ?, description = ?, image_url = ?, icon = ?,
         is_active = ?, sort_order = ? WHERE id = ?`,
    ).run(data.title, slug, data.subtitle, data.description, data.image_url, data.icon, data.is_active, data.sort_order, id);
    saveCollectionProducts(id, productIds);
  });
  res.json(getCollection(id));
});

router.delete('/collections/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM collections WHERE id = ?').run(toId(req.params.id));
  if (!changes) throw new HttpError(404, 'Добірку не знайдено');
  res.status(204).end();
});

module.exports = router;
