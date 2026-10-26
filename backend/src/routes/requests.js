const express = require('express');
const { db } = require('../db');
const { HttpError, str, normalizePhone, isEmail, oneOf } = require('../utils');

const router = express.Router();

// Заявки: протруювання насіння, консультація агронома, зворотний дзвінок
const REQUEST_TYPES = ['seed_treatment', 'consultation', 'callback'];

router.post('/', (req, res) => {
  const body = req.body || {};
  const data = {
    type: oneOf(body.type, REQUEST_TYPES),
    name: str(body.name, 120),
    phone: normalizePhone(body.phone),
    email: str(body.email, 120),
    region: str(body.region, 60),
    crop: str(body.crop, 120),
    area: str(body.area, 60),
    message: str(body.message, 2000),
  };

  const errors = {};
  if (!data.type) errors.type = 'Невідомий тип заявки';
  if (data.name.length < 2) errors.name = "Вкажіть ім'я";
  if (!data.phone) errors.phone = 'Вкажіть номер у форматі +380XXXXXXXXX';
  if (data.email && !isEmail(data.email)) errors.email = 'Некоректний email';
  if (Object.keys(errors).length) throw new HttpError(400, 'Перевірте дані заявки', errors);

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO service_requests (type, name, phone, email, region, crop, area, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(data.type, data.name, data.phone, data.email, data.region, data.crop, data.area, data.message);

  res.status(201).json({ id: Number(lastInsertRowid) });
});

module.exports = router;
module.exports.REQUEST_TYPES = REQUEST_TYPES;
