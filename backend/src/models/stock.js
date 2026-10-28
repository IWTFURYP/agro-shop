// Облік залишків: списання товару при замовленні та повернення при скасуванні.
const { db } = require('../db');
const { HttpError } = require('../utils');

// Перевіряє, чи вистачає товару. items: [{ id, name, price, stock, quantity }].
// Товари «ціна за запитом» (техніка тощо) — це заявки, залишок для них не перевіряється.
function assertAvailable(items) {
  const problems = items
    .filter((i) => i.price != null && i.quantity > i.stock)
    .map((i) => (i.stock > 0 ? `«${i.name}»: в наявності лише ${i.stock}` : `«${i.name}»: немає в наявності`));
  if (problems.length) {
    throw new HttpError(409, 'Недостатньо товару на складі. Змініть кількість у кошику', {
      items: problems.join('; '),
      stock: items.filter((i) => i.price != null && i.quantity > i.stock).map((i) => ({ id: i.id, stock: i.stock })),
    });
  }
}

// Списує товар (викликати всередині транзакції). Повертає кількість, що списана для кожної позиції.
function deduct(productId, quantity) {
  const { changes } = db
    .prepare("UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock >= ?")
    .run(quantity, productId, quantity);
  if (!changes) throw new HttpError(409, 'Товар щойно закінчився на складі. Оновіть кошик');
}

// Повертає на склад усе, що було списано за замовленням
function releaseOrder(orderId) {
  const order = db.prepare('SELECT stock_reserved FROM orders WHERE id = ?').get(orderId);
  if (!order?.stock_reserved) return;
  const items = db.prepare('SELECT product_id, reserved_qty FROM order_items WHERE order_id = ? AND reserved_qty > 0').all(orderId);
  const restore = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  for (const i of items) if (i.product_id) restore.run(i.reserved_qty, i.product_id);
  db.prepare('UPDATE orders SET stock_reserved = 0 WHERE id = ?').run(orderId);
}

// Повторно списує товар (коли скасоване замовлення відновлюють)
function reserveOrder(orderId) {
  const order = db.prepare('SELECT stock_reserved FROM orders WHERE id = ?').get(orderId);
  if (!order || order.stock_reserved) return;
  const items = db
    .prepare(
      `SELECT i.product_id AS id, i.product_name AS name, i.reserved_qty AS quantity, p.stock, 0 AS price
       FROM order_items i JOIN products p ON p.id = i.product_id
       WHERE i.order_id = ? AND i.reserved_qty > 0`,
    )
    .all(orderId);
  assertAvailable(items);
  for (const i of items) deduct(i.id, i.quantity);
  db.prepare('UPDATE orders SET stock_reserved = 1 WHERE id = ?').run(orderId);
}

module.exports = { assertAvailable, deduct, releaseOrder, reserveOrder };
