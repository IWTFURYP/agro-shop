const { db, transaction } = require('../db');
const {
  HttpError, uniqueSlug, isValidImageUrl, str, optionalNumber, searchTokens,
} = require('../utils');

const SELECT_FROM = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands     b ON b.id = p.brand_id
`;
const SELECT_COLUMNS = `
  SELECT p.*,
         c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
         b.name AS brand_name,    b.slug AS brand_slug
`;

const SORTS = {
  popular: 'p.is_featured DESC, p.stock > 0 DESC, p.id DESC',
  new: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price IS NULL, p.price ASC',
  price_desc: 'p.price IS NULL, p.price DESC',
  name: 'p.name COLLATE NOCASE ASC',
};

const splitList = (text) => (text ? text.split(',').map((s) => s.trim()).filter(Boolean) : []);

function serialize(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    short_description: row.short_description,
    description: row.description,
    active_ingredient: row.active_ingredient,
    formulation: row.formulation,
    packaging: row.packaging,
    unit: row.unit,
    price: row.price,
    old_price: row.old_price,
    stock: row.stock,
    in_stock: row.stock > 0,
    crops: splitList(row.crops),
    targets: splitList(row.targets),
    rate_min: row.rate_min,
    rate_max: row.rate_max,
    rate_unit: row.rate_unit,
    package_size: row.package_size,
    image_url: row.image_url,
    is_featured: Boolean(row.is_featured),
    is_active: Boolean(row.is_active),
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, slug: row.category_slug, icon: row.category_icon }
      : null,
    brand: row.brand_id ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug } : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    price_tiers: [],
    ...extra,
  };
}

// Оптові ціни для списку товарів одним запитом
function attachTiers(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const rows = db
    .prepare(
      `SELECT product_id, min_qty, price FROM product_price_tiers
       WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY min_qty`,
    )
    .all(...ids);
  const byProduct = new Map();
  for (const r of rows) {
    if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, []);
    byProduct.get(r.product_id).push({ min_qty: r.min_qty, price: r.price });
  }
  for (const p of products) p.price_tiers = byProduct.get(p.id) || [];
  return products;
}

// Ціна за одиницю з урахуванням оптових знижок
function unitPrice(basePrice, tiers, quantity) {
  if (basePrice == null) return null;
  let price = basePrice;
  for (const t of tiers) if (quantity >= t.min_qty && t.price < price) price = t.price;
  return price;
}

function getTiers(productId) {
  return db
    .prepare('SELECT min_qty, price FROM product_price_tiers WHERE product_id = ? ORDER BY min_qty')
    .all(productId);
}

// id категорії разом з усіма її підкатегоріями
function categoryWithChildren(slug) {
  const root = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (!root) return [];
  const ids = [root.id];
  const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?');
  for (let i = 0; i < ids.length; i++) {
    for (const c of children.all(ids[i])) ids.push(c.id);
  }
  return ids;
}

function buildFilters(query, { includeInactive = false } = {}) {
  const where = [];
  const params = [];

  if (!includeInactive) where.push('p.is_active = 1');

  // Кожне слово запиту має знайтися хоча б в одному з полів
  for (const token of searchTokens(query.search)) {
    const q = `%${token}%`;
    where.push(`(ulower(p.name) LIKE ? OR ulower(p.active_ingredient) LIKE ? OR ulower(p.sku) LIKE ?
                 OR ulower(p.crops) LIKE ? OR ulower(p.targets) LIKE ? OR ulower(c.name) LIKE ?)`);
    params.push(q, q, q, q, q, q);
  }
  if (query.category) {
    const ids = categoryWithChildren(String(query.category));
    if (!ids.length) where.push('0');
    else {
      where.push(`p.category_id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
  }
  if (query.collection) {
    where.push(`p.id IN (SELECT cp.product_id FROM collection_products cp
                JOIN collections col ON col.id = cp.collection_id WHERE col.slug = ?)`);
    params.push(String(query.collection));
  }
  if (query.skus) {
    const skus = String(query.skus).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 60);
    where.push(skus.length ? `p.sku IN (${skus.map(() => '?').join(',')})` : '0');
    params.push(...skus);
  }
  if (query.brand) {
    const slugs = String(query.brand).split(',').filter(Boolean);
    where.push(`b.slug IN (${slugs.map(() => '?').join(',')})`);
    params.push(...slugs);
  }
  if (query.crop) {
    where.push('ulower(p.crops) LIKE ?');
    params.push(`%${String(query.crop).toLowerCase()}%`);
  }
  if (query.target) {
    where.push('ulower(p.targets) LIKE ?');
    params.push(`%${String(query.target).toLowerCase().replace(/[’`ʼ]/g, "'")}%`);
  }
  const minPrice = Number(query.minPrice);
  if (query.minPrice !== undefined && query.minPrice !== '' && Number.isFinite(minPrice)) {
    where.push('p.price >= ?');
    params.push(minPrice);
  }
  const maxPrice = Number(query.maxPrice);
  if (query.maxPrice !== undefined && query.maxPrice !== '' && Number.isFinite(maxPrice)) {
    where.push('p.price <= ?');
    params.push(maxPrice);
  }
  if (query.inStock === '1' || query.inStock === 'true') where.push('p.stock > 0');
  if (query.featured === '1' || query.featured === 'true') where.push('p.is_featured = 1');

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

function listProducts(query, { page, limit, offset }, options) {
  const { whereSql, params } = buildFilters(query, options);
  const orderBy = SORTS[query.sort] || SORTS.popular;

  const { total } = db.prepare(`SELECT COUNT(*) AS total ${SELECT_FROM} ${whereSql}`).get(...params);
  const rows = db
    .prepare(`${SELECT_COLUMNS} ${SELECT_FROM} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return {
    items: attachTiers(rows.map((r) => serialize(r))),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

function getProductBy(field, value, { includeInactive = false } = {}) {
  const column = field === 'id' ? 'p.id' : 'p.slug';
  const row = db
    .prepare(`${SELECT_COLUMNS} ${SELECT_FROM} WHERE ${column} = ? ${includeInactive ? '' : 'AND p.is_active = 1'}`)
    .get(value);
  if (!row) return null;
  return serialize(row, {
    images: db
      .prepare('SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order, id')
      .all(row.id)
      .map((r) => r.url),
    documents: db
      .prepare('SELECT title, url FROM product_documents WHERE product_id = ? ORDER BY sort_order, id')
      .all(row.id),
    price_tiers: getTiers(row.id),
  });
}

function getRelated(product, limit = 4) {
  if (!product.category) return [];
  const rows = db
    .prepare(
      `${SELECT_COLUMNS} ${SELECT_FROM} WHERE p.is_active = 1 AND p.category_id = ? AND p.id != ?
       ORDER BY p.is_featured DESC, RANDOM() LIMIT ?`,
    )
    .all(product.category.id, product.id, limit);
  return attachTiers(rows.map((r) => serialize(r)));
}

function countValues(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    for (const v of splitList(row[field])) counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'uk'))
    .map(([name, count]) => ({ name, count }));
}

// Дані для бічної панелі фільтрів каталогу
function getFilterOptions(query) {
  const { whereSql, params } = buildFilters({
    category: query.category, search: query.search, collection: query.collection,
  });
  const from = `${SELECT_FROM} ${whereSql}`;

  const brands = db
    .prepare(
      `SELECT b.id, b.name, b.slug, COUNT(*) AS count ${from} ${whereSql ? 'AND' : 'WHERE'} b.id IS NOT NULL
       GROUP BY b.id ORDER BY b.name`,
    )
    .all(...params);
  const price = db.prepare(`SELECT MIN(p.price) AS min, MAX(p.price) AS max ${from}`).get(...params);
  const rows = db.prepare(`SELECT p.crops, p.targets ${from}`).all(...params);

  return {
    brands,
    crops: countValues(rows, 'crops'),
    targets: countValues(rows, 'targets'),
    price: { min: price.min ?? 0, max: price.max ?? 0 },
  };
}

// Проблеми (бур'яни, хвороби, шкідники) для сторінки «Підбір за проблемою»
function getProblems(crop) {
  const { whereSql, params } = buildFilters({ crop });
  const rows = db.prepare(`SELECT p.targets ${SELECT_FROM} ${whereSql}`).all(...params);
  return countValues(rows, 'targets');
}

function parseList(value, max) {
  return (Array.isArray(value) ? value : String(value || '').split(','))
    .map((c) => str(c, max))
    .filter(Boolean)
    .join(', ');
}

function parseProductInput(body) {
  const errors = {};
  const data = {
    name: str(body.name, 200),
    sku: str(body.sku, 64),
    short_description: str(body.short_description, 500),
    description: str(body.description, 20000),
    active_ingredient: str(body.active_ingredient, 300),
    formulation: str(body.formulation, 100),
    packaging: str(body.packaging, 100),
    unit: str(body.unit, 20) || 'шт',
    crops: parseList(body.crops, 60),
    targets: parseList(body.targets, 80),
    image_url: str(body.image_url, 2000),
    price: optionalNumber(body.price),
    old_price: optionalNumber(body.old_price),
    stock: optionalNumber(body.stock) ?? 0,
    rate_min: optionalNumber(body.rate_min),
    rate_max: optionalNumber(body.rate_max),
    rate_unit: str(body.rate_unit, 20),
    package_size: optionalNumber(body.package_size),
    category_id: optionalNumber(body.category_id),
    brand_id: optionalNumber(body.brand_id),
    is_featured: body.is_featured ? 1 : 0,
    is_active: body.is_active === undefined || body.is_active ? 1 : 0,
  };
  const images = (Array.isArray(body.images) ? body.images : [])
    .map((u) => str(u, 2000))
    .filter(Boolean)
    .slice(0, 20);
  const tiers = (Array.isArray(body.price_tiers) ? body.price_tiers : [])
    .filter((t) => t && (t.min_qty !== '' || t.price !== ''))
    .map((t) => ({ min_qty: Number(t.min_qty), price: Number(t.price) }))
    .slice(0, 10);
  const documents = (Array.isArray(body.documents) ? body.documents : [])
    .map((d) => ({ title: str(d?.title, 200), url: str(d?.url, 2000) }))
    .filter((d) => d.title || d.url)
    .slice(0, 20);

  if (!data.name) errors.name = 'Вкажіть назву товару';
  if (Number.isNaN(data.price) || (data.price != null && data.price < 0)) errors.price = 'Некоректна ціна';
  if (Number.isNaN(data.old_price) || (data.old_price != null && data.old_price < 0)) {
    errors.old_price = 'Некоректна стара ціна';
  }
  if (!Number.isInteger(data.stock) || data.stock < 0) errors.stock = 'Залишок має бути цілим числом ≥ 0';
  for (const f of ['rate_min', 'rate_max', 'package_size']) {
    if (Number.isNaN(data[f]) || (data[f] != null && data[f] <= 0)) errors[f] = 'Має бути числом більше 0';
  }
  if (data.rate_min != null && data.rate_max != null && data.rate_min > data.rate_max) {
    errors.rate_max = 'Максимальна норма менша за мінімальну';
  }
  if (!isValidImageUrl(data.image_url)) errors.image_url = 'Посилання має починатися з http(s):// або /';
  const badImage = images.findIndex((u) => !isValidImageUrl(u));
  if (badImage !== -1) errors.images = `Некоректне посилання №${badImage + 1}`;
  if (tiers.some((t) => !Number.isInteger(t.min_qty) || t.min_qty < 2 || !(t.price >= 0))) {
    errors.price_tiers = 'Оптова ціна: кількість — ціле число від 2, ціна ≥ 0';
  }
  const badDoc = documents.findIndex((d) => !d.title || !d.url || !isValidImageUrl(d.url));
  if (badDoc !== -1) errors.documents = `Документ №${badDoc + 1}: вкажіть назву та коректне посилання`;
  if (data.category_id != null && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(data.category_id)) {
    errors.category_id = 'Категорію не знайдено';
  }
  if (data.brand_id != null && !db.prepare('SELECT 1 FROM brands WHERE id = ?').get(data.brand_id)) {
    errors.brand_id = 'Виробника не знайдено';
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте правильність заповнення полів', errors);

  return { data, images, tiers, documents };
}

const PRODUCT_COLUMNS = [
  'category_id', 'brand_id', 'name', 'slug', 'sku', 'short_description', 'description',
  'active_ingredient', 'formulation', 'packaging', 'unit', 'price', 'old_price', 'stock',
  'crops', 'targets', 'rate_min', 'rate_max', 'rate_unit', 'package_size',
  'image_url', 'is_featured', 'is_active',
];

function replaceRelations(productId, { images, tiers, documents }) {
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  const insertImage = db.prepare('INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)');
  images.forEach((url, i) => insertImage.run(productId, url, i));

  db.prepare('DELETE FROM product_price_tiers WHERE product_id = ?').run(productId);
  const insertTier = db.prepare('INSERT INTO product_price_tiers (product_id, min_qty, price) VALUES (?, ?, ?)');
  for (const t of tiers) insertTier.run(productId, t.min_qty, t.price);

  db.prepare('DELETE FROM product_documents WHERE product_id = ?').run(productId);
  const insertDoc = db.prepare(
    'INSERT INTO product_documents (product_id, title, url, sort_order) VALUES (?, ?, ?, ?)',
  );
  documents.forEach((d, i) => insertDoc.run(productId, d.title, d.url, i));
}

function createProduct(body) {
  const parsed = parseProductInput(body);
  parsed.data.slug = uniqueSlug('products', body.slug || parsed.data.name);
  return transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO products (${PRODUCT_COLUMNS.join(', ')})
         VALUES (${PRODUCT_COLUMNS.map(() => '?').join(', ')})`,
      )
      .run(...PRODUCT_COLUMNS.map((c) => parsed.data[c]));
    replaceRelations(lastInsertRowid, parsed);
    return getProductBy('id', lastInsertRowid, { includeInactive: true });
  });
}

function updateProduct(id, body) {
  const existing = db.prepare('SELECT id, slug FROM products WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Товар не знайдено');
  const parsed = parseProductInput(body);
  parsed.data.slug = body.slug && body.slug !== existing.slug
    ? uniqueSlug('products', body.slug, id)
    : existing.slug;
  return transaction(() => {
    db.prepare(
      `UPDATE products SET ${PRODUCT_COLUMNS.map((c) => `${c} = ?`).join(', ')},
       updated_at = datetime('now') WHERE id = ?`,
    ).run(...PRODUCT_COLUMNS.map((c) => parsed.data[c]), id);
    replaceRelations(id, parsed);
    return getProductBy('id', id, { includeInactive: true });
  });
}

module.exports = {
  listProducts,
  getProductBy,
  getRelated,
  getFilterOptions,
  getProblems,
  getTiers,
  unitPrice,
  createProduct,
  updateProduct,
};
