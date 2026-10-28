// Особистий кабінет покупця: реєстрація, вхід, профіль, історія замовлень.
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { HttpError, str, normalizePhone, isEmail } = require('../utils');
const {
  signCustomerToken,
  requireCustomer,
  loginRateLimit,
  registerFailedLogin,
  clearFailedLogins,
} = require('../middleware/auth');

const router = express.Router();

const PROFILE_FIELDS = 'id, name, email, phone, company, edrpou, region, city, delivery_address, created_at';

function getProfile(id) {
  const customer = db.prepare(`SELECT ${PROFILE_FIELDS} FROM customers WHERE id = ?`).get(id);
  if (!customer) throw new HttpError(401, 'Обліковий запис не знайдено. Увійдіть знову');
  return customer;
}

router.post('/register', (req, res) => {
  const body = req.body || {};
  const data = {
    name: str(body.name, 120),
    email: str(body.email, 120).toLowerCase(),
    phone: normalizePhone(body.phone),
  };
  const password = String(body.password || '');
  const errors = {};
  if (data.name.length < 2) errors.name = "Вкажіть ім'я";
  if (!isEmail(data.email)) errors.email = 'Некоректний email';
  if (!data.phone) errors.phone = 'Вкажіть номер у форматі +380XXXXXXXXX';
  if (password.length < 8) errors.password = 'Пароль — мінімум 8 символів';
  if (!errors.email && db.prepare('SELECT 1 FROM customers WHERE email = ?').get(data.email)) {
    errors.email = 'Цей email уже зареєстровано. Увійдіть у кабінет';
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте дані', errors);

  const { lastInsertRowid } = db
    .prepare('INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email, data.phone, bcrypt.hashSync(password, 10));


  const customer = getProfile(lastInsertRowid);
  res.status(201).json({ token: signCustomerToken(customer), customer });
});

router.post('/login', loginRateLimit, (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase();
  const password = String(req.body?.password || '');
  const row = db.prepare('SELECT id, password_hash FROM customers WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    registerFailedLogin(req.ip);
    throw new HttpError(401, 'Невірний email або пароль');
  }
  clearFailedLogins(req.ip);
  const customer = getProfile(row.id);
  res.json({ token: signCustomerToken(customer), customer });
});

router.get('/me', requireCustomer, (req, res) => {
  res.json(getProfile(req.customer.id));
});

router.put('/me', requireCustomer, (req, res) => {
  const body = req.body || {};
  const data = {
    name: str(body.name, 120),
    phone: normalizePhone(body.phone),
    company: str(body.company, 200),
    edrpou: str(body.edrpou, 10),
    region: str(body.region, 60),
    city: str(body.city, 120),
    delivery_address: str(body.delivery_address, 300),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = "Вкажіть ім'я";
  if (!data.phone) errors.phone = 'Вкажіть номер у форматі +380XXXXXXXXX';
  if (data.edrpou && !/^\d{8,10}$/.test(data.edrpou)) errors.edrpou = 'ЄДРПОУ / ІПН — 8–10 цифр';
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте дані', errors);
  db.prepare(
    `UPDATE customers SET name = ?, phone = ?, company = ?, edrpou = ?, region = ?, city = ?, delivery_address = ?
     WHERE id = ?`,
  ).run(data.name, data.phone, data.company, data.edrpou, data.region, data.city, data.delivery_address, req.customer.id);
  res.json(getProfile(req.customer.id));
});

router.post('/change-password', requireCustomer, (req, res) => {
  const current = String(req.body?.current_password || '');
  const next = String(req.body?.new_password || '');
  const row = db.prepare('SELECT password_hash FROM customers WHERE id = ?').get(req.customer.id);
  if (!row || !bcrypt.compareSync(current, row.password_hash)) {
    throw new HttpError(400, 'Поточний пароль невірний', { current_password: 'Невірний пароль' });
  }
  if (next.length < 8) throw new HttpError(400, 'Пароль занадто короткий', { new_password: 'Мінімум 8 символів' });
  db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), req.customer.id);
  res.json({ ok: true });
});

/* ---------- Історія замовлень ---------- */

router.get('/orders', requireCustomer, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.id, o.number, o.total, o.has_price_on_request, o.status, o.delivery_method, o.created_at,
              (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS items_count,
              (SELECT GROUP_CONCAT(i.product_name, ', ') FROM order_items i WHERE i.order_id = o.id) AS items_preview
       FROM orders o WHERE o.customer_id = ? ORDER BY o.id DESC`,
    )
    .all(req.customer.id);
  res.json(orders);
});

router.get('/orders/:id', requireCustomer, (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?')
    .get(Number(req.params.id), req.customer.id);
  if (!order) throw new HttpError(404, 'Замовлення не знайдено');
  // Поточний стан товарів — щоб «Повторити замовлення» знав, що досі продається
  order.items = db
    .prepare(
      `SELECT i.id, i.product_id, i.product_name, i.sku, i.packaging, i.unit, i.price, i.quantity,
              p.slug, p.image_url, p.is_active, p.stock, p.price AS current_price
       FROM order_items i LEFT JOIN products p ON p.id = i.product_id
       WHERE i.order_id = ? ORDER BY i.id`,
    )
    .all(order.id);
  delete order.stock_reserved;
  res.json(order);
});

module.exports = router;
