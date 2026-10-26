const express = require('express');
const { db } = require('../db');
const { HttpError, parsePagination } = require('../utils');
const products = require('../models/products');

const router = express.Router();

// Категорії у вигляді дерева з кількістю активних товарів (включно з підкатегоріями)
router.get('/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS own_count
       FROM categories c ORDER BY c.sort_order, c.name`,
    )
    .all();
  const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent_id && byId.get(node.parent_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const withCounts = (node) => {
    node.product_count = node.own_count + node.children.reduce((s, c) => s + withCounts(c), 0);
    delete node.own_count;
    return node.product_count;
  };
  roots.forEach(withCounts);
  res.json(roots);
});

router.get('/categories/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) throw new HttpError(404, 'Категорію не знайдено');
  const parent = category.parent_id
    ? db.prepare('SELECT id, name, slug FROM categories WHERE id = ?').get(category.parent_id)
    : null;
  const children = db
    .prepare('SELECT id, name, slug, icon FROM categories WHERE parent_id = ? ORDER BY sort_order, name')
    .all(category.id);
  res.json({ ...category, parent, children });
});

router.get('/brands', (_req, res) => {
  res.json(db.prepare('SELECT * FROM brands ORDER BY name').all());
});

router.get('/products', (req, res) => {
  res.json(products.listProducts(req.query, parsePagination(req.query, 12, 48)));
});

router.get('/products/filters', (req, res) => {
  res.json(products.getFilterOptions(req.query));
});

router.get('/products/:slug', (req, res) => {
  const product = products.getProductBy('slug', req.params.slug);
  if (!product) throw new HttpError(404, 'Товар не знайдено');
  res.json({ ...product, related: products.getRelated(product) });
});

module.exports = router;
