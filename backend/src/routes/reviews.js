const express = require('express');
const { db } = require('../db');
const { HttpError, str } = require('../utils');
const { optionalCustomer } = require('../middleware/auth');

const router = express.Router();

function findProduct(slug) {
  const product = db.prepare('SELECT id FROM products WHERE slug = ? AND is_active = 1').get(slug);
  if (!product) throw new HttpError(404, 'Товар не знайдено');
  return product;
}

// Опубліковані відгуки та розподіл оцінок (скільки 5★, 4★ …)
router.get('/products/:slug/reviews', (req, res) => {
  const { id } = findProduct(req.params.slug);
  const items = db
    .prepare(
      `SELECT id, author_name, rating, text, admin_reply, created_at FROM reviews
       WHERE product_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 100`,
    )
    .all(id);
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: items.filter((r) => r.rating === rating).length,
  }));
  const avg = items.length ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10 : null;
  res.json({ items, count: items.length, avg, distribution });
});

// Не більше 5 відгуків на годину з однієї IP — захист від спаму
const recent = new Map();
function checkSpam(ip) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (list.length >= 5) throw new HttpError(429, 'Забагато відгуків. Спробуйте пізніше');
  list.push(now);
  recent.set(ip, list);
}

// Новий відгук потрапляє на модерацію і з'являється на сайті після схвалення
router.post('/products/:slug/reviews', optionalCustomer, (req, res) => {
  const { id } = findProduct(req.params.slug);
  const body = req.body || {};
  const rating = Number(body.rating);
  let authorName = str(body.author_name, 80);
  if (req.customer) {
    const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(req.customer.id);
    if (customer && !authorName) authorName = customer.name;
  }
  const text = str(body.text, 3000);

  const errors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Оберіть оцінку від 1 до 5';
  if (authorName.length < 2) errors.author_name = "Вкажіть ім'я";
  if (text.length < 10) errors.text = 'Напишіть хоча б кілька слів (від 10 символів)';
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте відгук', errors);
  checkSpam(req.ip);

  db.prepare(
    'INSERT INTO reviews (product_id, customer_id, author_name, rating, text) VALUES (?, ?, ?, ?, ?)',
  ).run(id, req.customer?.id ?? null, authorName, rating, text);
  res.status(201).json({ ok: true, status: 'pending' });
});

module.exports = router;
