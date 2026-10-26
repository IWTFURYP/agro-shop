const express = require('express');
const { db } = require('../db');
const { HttpError, parsePagination } = require('../utils');
const products = require('../models/products');

const router = express.Router();

/* ---------- Пошук за проблемою ---------- */

router.get('/problems', (req, res) => {
  res.json(products.getProblems(req.query.crop));
});

/* ---------- Сезонні добірки ---------- */

router.get('/collections', (_req, res) => {
  res.json(
    db.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM collection_products cp JOIN products p ON p.id = cp.product_id
                    WHERE cp.collection_id = c.id AND p.is_active = 1) AS product_count
       FROM collections c WHERE c.is_active = 1 ORDER BY c.sort_order, c.id`,
    ).all(),
  );
});

router.get('/collections/:slug', (req, res) => {
  const collection = db.prepare('SELECT * FROM collections WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!collection) throw new HttpError(404, 'Добірку не знайдено');
  res.json(collection);
});

/* ---------- Статті ---------- */

const ARTICLE_LIST_COLUMNS = 'id, title, slug, excerpt, cover_url, tags, published_at';

router.get('/articles', (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 9, 30);
  const where = ['is_published = 1'];
  const params = [];
  if (req.query.tag) {
    where.push('ulower(tags) LIKE ?');
    params.push(`%${String(req.query.tag).toLowerCase()}%`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM articles ${whereSql}`).get(...params);
  const items = db
    .prepare(`SELECT ${ARTICLE_LIST_COLUMNS} FROM articles ${whereSql} ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/articles/:slug', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE slug = ? AND is_published = 1').get(req.params.slug);
  if (!article) throw new HttpError(404, 'Статтю не знайдено');
  const more = db
    .prepare(`SELECT ${ARTICLE_LIST_COLUMNS} FROM articles WHERE is_published = 1 AND id != ? ORDER BY published_at DESC LIMIT 3`)
    .all(article.id);
  res.json({ ...article, more });
});

module.exports = router;
