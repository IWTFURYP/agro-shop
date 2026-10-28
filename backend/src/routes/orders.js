const express = require('express');
const { db, transaction } = require('../db');
const { HttpError, str, normalizePhone, isEmail, oneOf } = require('../utils');
const { getTiers, unitPrice } = require('../models/products');

const router = express.Router();

const DELIVERY_METHODS = ['nova_poshta', 'pickup', 'company_delivery'];
const PAYMENT_METHODS = ['invoice', 'card', 'cash_on_delivery'];

router.post('/', (req, res) => {
  const body = req.body || {};
  const errors = {};

  const order = {
    customer_name: str(body.name, 120),
    phone: normalizePhone(body.phone),
    email: str(body.email, 120),
    company: str(body.company, 200),
    edrpou: str(body.edrpou, 10),
    region: str(body.region, 60),
    city: str(body.city, 120),
    delivery_method: oneOf(body.delivery_method, DELIVERY_METHODS),
    delivery_address: str(body.delivery_address, 300),
    payment_method: oneOf(body.payment_method, PAYMENT_METHODS),
    comment: str(body.comment, 2000),
  };

  if (order.customer_name.length < 2) errors.name = "Вкажіть ім'я";
  if (!order.phone) errors.phone = 'Вкажіть номер у форматі +380XXXXXXXXX';
  if (order.email && !isEmail(order.email)) errors.email = 'Некоректний email';
  if (order.edrpou && !/^\d{8,10}$/.test(order.edrpou)) errors.edrpou = 'ЄДРПОУ / ІПН — 8–10 цифр';
  if (!order.delivery_method) errors.delivery_method = 'Оберіть спосіб доставки';
  if (!order.payment_method) errors.payment_method = 'Оберіть спосіб оплати';
  if (order.delivery_method && order.delivery_method !== 'pickup') {
    if (!order.city) errors.city = 'Вкажіть населений пункт';
    if (!order.delivery_address) errors.delivery_address = 'Вкажіть адресу або відділення';
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) errors.items = 'Кошик порожній';
  if (rawItems.length > 100) errors.items = 'Забагато позицій в одному замовленні';

  // Об'єднуємо однакові товари й перевіряємо кількість
  const quantities = new Map();
  for (const item of rawItems) {
    const id = Number(item?.product_id);
    const qty = Number(item?.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 100000) {
      errors.items = 'Некоректна кількість товару';
      break;
    }
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }

  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте дані замовлення', errors);

  // Ціни беремо ТІЛЬКИ з бази, а не з браузера клієнта
  const getProduct = db.prepare(
    'SELECT id, name, sku, packaging, unit, price FROM products WHERE id = ? AND is_active = 1',
  );
  const items = [];
  for (const [id, quantity] of quantities) {
    const product = getProduct.get(id);
    if (!product) {
      throw new HttpError(400, 'Деякі товари з кошика більше недоступні. Оновіть кошик', {
        items: `Товар #${id} недоступний`,
      });
    }
    // Оптова ціна залежить від кількості
    items.push({ ...product, price: unitPrice(product.price, getTiers(id), quantity), quantity });
  }

  const total = Math.round(items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0) * 100) / 100;
  const hasPriceOnRequest = items.some((i) => i.price == null) ? 1 : 0;

  const created = transaction(() => {
    const { lastInsertRowid: orderId } = db
      .prepare(
        `INSERT INTO orders (customer_name, phone, email, company, edrpou, region, city,
           delivery_method, delivery_address, payment_method, comment, total, has_price_on_request)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        order.customer_name, order.phone, order.email, order.company, order.edrpou, order.region,
        order.city, order.delivery_method, order.delivery_address, order.payment_method,
        order.comment, total, hasPriceOnRequest,
      );

    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const number = `${date}-${String(orderId).padStart(4, '0')}`;
    db.prepare('UPDATE orders SET number = ? WHERE id = ?').run(number, orderId);

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, sku, packaging, unit, price, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const i of items) {
      insertItem.run(orderId, i.id, i.name, i.sku, i.packaging, i.unit, i.price, i.quantity);
    }
    return { id: Number(orderId), number };
  });

  res.status(201).json({
    ...created,
    total,
    has_price_on_request: Boolean(hasPriceOnRequest),
    items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
  });
});

module.exports = router;
module.exports.DELIVERY_METHODS = DELIVERY_METHODS;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
