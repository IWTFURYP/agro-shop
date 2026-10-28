// Календар обробок: що й коли застосовувати протягом сезону для обраної культури.
const express = require('express');
const { db } = require('../db');
const products = require('../models/products');

const router = express.Router();

// Товари для кожного етапу одним запитом до каталогу
function attachProducts(steps, { includeInactive = false } = {}) {
  if (!steps.length) return steps;
  const links = db
    .prepare(
      `SELECT step_id, product_id FROM calendar_step_products
       WHERE step_id IN (${steps.map(() => '?').join(',')}) ORDER BY sort_order`,
    )
    .all(...steps.map((s) => s.id));
  const ids = [...new Set(links.map((l) => l.product_id))];
  const byId = new Map();
  if (ids.length) {
    const list = products.listProducts({ ids: ids.join(',') }, { page: 1, limit: 100, offset: 0 }, { includeInactive });
    for (const p of list.items) byId.set(p.id, p);
  }
  for (const step of steps) {
    step.product_ids = links.filter((l) => l.step_id === step.id).map((l) => l.product_id);
    step.products = step.product_ids.map((id) => byId.get(id)).filter(Boolean);
  }
  return steps;
}

router.get('/calendar/crops', (_req, res) => {
  res.json(
    db.prepare('SELECT crop, COUNT(*) AS steps FROM calendar_steps GROUP BY crop ORDER BY MIN(sort_order), crop').all(),
  );
});

router.get('/calendar', (req, res) => {
  const crop = String(req.query.crop || '');
  const steps = db
    .prepare('SELECT * FROM calendar_steps WHERE crop = ? ORDER BY sort_order, month_from, id')
    .all(crop);
  res.json(attachProducts(steps));
});

module.exports = router;
module.exports.attachProducts = attachProducts;
