// Демонстраційні дані для нових розділів: календар обробок, відгуки,
// тестовий покупець та історія замовлень (щоб графіки статистики не були порожніми).

const bcrypt = require('bcryptjs');

// Етапи сезону. months: [з якого, по який] місяць; skus — товари з каталогу.
const CALENDAR = {
  'Пшениця озима': [
    { months: [9, 10], stage: 'Перед сівбою', title: 'Протруювання насіння', icon: 'flask-conical', skus: ['SDT-001'],
      description: 'Захист насіння й сходів від сажкових хвороб, кореневих гнилей та пліснявіння. Протруюйте за 1–2 тижні до сівби.' },
    { months: [9, 10], stage: 'Сівба', title: 'Сівба та основне удобрення', icon: 'sprout', skus: ['SDW-001', 'FRT-003'],
      description: 'Оптимальні строки сівби — друга половина вересня — початок жовтня. Комплексне добриво вносять під передпосівну культивацію.' },
    { months: [3, 3], stage: 'Відновлення вегетації', title: 'Весняне підживлення азотом', icon: 'layers', skus: ['FRT-001', 'FRT-002'],
      description: 'Перше підживлення — по мерзлоталому ґрунту. Норма залежить від стану посівів після зимівлі.' },
    { months: [4, 4], stage: 'Кущіння', title: 'Гербіцидний захист', icon: 'leaf', skus: ['HRB-004', 'ADJ-001'],
      description: 'Контроль дводольних бурʼянів, поки вони молоді (2–6 листків). Додайте адʼювант для кращого прилипання.' },
    { months: [4, 5], stage: 'Вихід у трубку', title: 'Фунгіцидний захист (Т1) і мікродобрива', icon: 'microscope', skus: ['FNG-001', 'FNG-003', 'MCR-001'],
      description: 'Перша обробка проти септоріозу, борошнистої роси та іржі. Мікродобрива можна вносити в баковій суміші.' },
    { months: [5, 5], stage: 'Колосіння', title: 'Захист від шкідників', icon: 'bug', skus: ['INS-001'],
      description: 'Контроль клопа шкідливої черепашки, пʼявиць і попелиці при перевищенні економічного порогу шкодочинності.' },
    { months: [5, 6], stage: 'Прапорцевий листок — колос', title: 'Захист прапорцевого листка (Т2)', icon: 'shield-check', skus: ['FNG-002'],
      description: 'Прапорцевий листок формує до половини врожаю — його захист найважливіший.' },
    { months: [7, 8], stage: 'Після збирання', title: 'Обробка стерні', icon: 'wheat', skus: ['HRB-001'],
      description: 'Знищення багаторічних бурʼянів по стерні готує поле під наступну культуру.' },
  ],
  Кукурудза: [
    { months: [4, 4], stage: 'Перед сівбою', title: 'Протруювання насіння', icon: 'flask-conical', skus: ['SDT-002'],
      description: 'Інсектицидний протруйник захищає сходи від дротяника та інших ґрунтових шкідників.' },
    { months: [4, 5], stage: 'Сівба', title: 'Сівба та стартове удобрення', icon: 'sprout', skus: ['SDC-280', 'FRT-003'],
      description: 'Сійте, коли ґрунт на глибині загортання прогрівся до +10 °C.' },
    { months: [5, 6], stage: '3–7 листків', title: 'Післясходовий гербіцид', icon: 'leaf', skus: ['HRB-002', 'ADJ-001'],
      description: 'Контроль злакових і дводольних бурʼянів у фазі 3–7 листків культури.' },
    { months: [6, 6], stage: '6–8 листків', title: 'Позакореневе підживлення цинком', icon: 'sparkles', skus: ['MCR-003'],
      description: 'Кукурудза чутлива до нестачі цинку, особливо на холодних і лужних ґрунтах.' },
    { months: [6, 7], stage: 'Викидання волоті', title: 'Захист від кукурудзяного метелика', icon: 'bug', skus: ['INS-003'],
      description: 'Обробка в період масового відродження гусениць.' },
  ],
  Соняшник: [
    { months: [3, 4], stage: 'Підготовка поля', title: 'Знищення бурʼянів до сівби', icon: 'leaf', skus: ['HRB-001'],
      description: 'Гербіцид суцільної дії по вегетуючих бурʼянах до сівби культури.' },
    { months: [4, 5], stage: 'Сівба', title: 'Протруювання та сівба', icon: 'sprout', skus: ['SDT-002', 'SDS-110', 'FRT-003'],
      description: 'Оберіть гібрид під свою систему гербіцидного захисту (Clearfield або Express).' },
    { months: [5, 5], stage: '2–4 листки', title: 'Гербіцид по сходах', icon: 'shield-check', skus: ['HRB-003'],
      description: 'Для гібридів, стійких до імідазолінонів. Контролює також вовчок.' },
    { months: [6, 6], stage: 'Бутонізація', title: 'Підживлення бором', icon: 'sparkles', skus: ['MCR-002'],
      description: 'Бор необхідний для запилення та формування насіння.' },
    { months: [6, 7], stage: 'Цвітіння', title: 'Фунгіцидний захист', icon: 'microscope', skus: ['FNG-002'],
      description: 'Захист від фомозу, фомопсису та плямистостей листя.' },
    { months: [8, 9], stage: 'Перед збиранням', title: 'Десикація', icon: 'sun', skus: ['HRB-001'],
      description: 'Вирівнює дозрівання та прискорює збирання.' },
  ],
  'Ріпак озимий': [
    { months: [8, 8], stage: 'Сівба', title: 'Протруювання, сівба й удобрення', icon: 'sprout', skus: ['SDR-001', 'SDT-002', 'FRT-004'],
      description: 'Ріпак потребує сірки — внесіть сульфат амонію під сівбу.' },
    { months: [9, 10], stage: '4–6 листків', title: 'Осіння рострегуляція', icon: 'shield-check', skus: ['FNG-001'],
      description: 'Тебуконазол стримує ріст і готує рослини до зимівлі.' },
    { months: [3, 3], stage: 'Відновлення вегетації', title: 'Підживлення азотом і сіркою', icon: 'layers', skus: ['FRT-004', 'FRT-001'],
      description: 'Раннє весняне підживлення визначає потенціал урожаю.' },
    { months: [4, 4], stage: 'Бутонізація', title: 'Захист від ріпакового квіткоїда', icon: 'bug', skus: ['INS-001'],
      description: 'Обробка при появі шкідника на бутонах.' },
    { months: [4, 5], stage: 'Цвітіння', title: 'Бор і фунгіцид', icon: 'sparkles', skus: ['MCR-002', 'FNG-002'],
      description: 'Захист від склеротиніозу та живлення бором у критичну фазу.' },
  ],
};

const REVIEWS = [
  { sku: 'HRB-001', author: 'Олександр, ФГ «Колос»', rating: 5, text: 'Беремо вже третій сезон. Працює стабільно, бурʼяни по стерні вигорають за 10–12 днів. Доставили швидко.' },
  { sku: 'HRB-001', author: 'Іван', rating: 4, text: 'Нормальний гліфосат за адекватну ціну. На пирії краще брати максимальну норму.' },
  { sku: 'FNG-002', author: 'Агроном Наталія', rating: 5, text: 'Добре тримає септоріоз, помітний грінінг-ефект. На прапорцевий листок — те, що треба.' },
  { sku: 'FNG-002', author: 'Петро М.', rating: 5, text: 'Взяли оптом 30 каністр, ціна вийшла хороша. Менеджер допоміг з розрахунком.' },
  { sku: 'INS-001', author: 'Сергій', rating: 4, text: 'Швидко діє на черепашку. Запах сильний, працюйте в респіраторі.' },
  { sku: 'SDC-280', author: 'ТОВ «Агро-Поділля»', rating: 5, text: 'Гібрид показав 9,8 т/га на неполивних землях. Вологовіддача справді швидка.' },
  { sku: 'SDS-110', author: 'Микола', rating: 4, text: 'Рівні сходи, стійкий до вовчка. Олійність трохи нижча за заявлену, але загалом задоволені.' },
  { sku: 'MCR-002', author: 'Оксана', rating: 5, text: 'Бор на соняшнику дав помітний результат — кошики повніші. Рекомендую.' },
  { sku: 'FRT-001', author: 'Василь, ФГ', rating: 5, text: 'Селітра якісна, гранула рівна, не злежується. Привезли своїм транспортом прямо на поле.' },
  { sku: 'HRB-002', author: 'Андрій', rating: 3, text: 'Злакові бере добре, але на деяких дводольних довелося доробляти іншим препаратом.' },
  { sku: 'FNG-001', author: 'Руслан', rating: 5, text: 'Використовуємо на ріпаку восени для рострегуляції — зимує значно краще.' },
  { sku: 'MCR-001', author: 'Тетяна', rating: 4, text: 'Зручно вносити разом з фунгіцидом. Пшениця виглядає здоровішою.' },
];
const PENDING_REVIEWS = [
  { sku: 'HRB-004', author: 'Юрій', rating: 5, text: 'Підмаренник прибрало повністю, дуже задоволений результатом.' },
  { sku: 'INS-003', author: 'Гість', rating: 2, text: 'Дорого, хотілося б знижку на більший обʼєм.' },
];

const DEMO_CUSTOMERS = [
  { name: 'Петро Іваненко', phone: '+380671112233', company: 'ФГ «Іваненко»', region: 'Вінницька', city: 'Жмеринка' },
  { name: 'Олена Коваль', phone: '+380502223344', company: 'ТОВ «Агро-Поділля»', region: 'Хмельницька', city: 'Камʼянець-Подільський' },
  { name: 'Василь Мельник', phone: '+380973334455', company: '', region: 'Черкаська', city: 'Умань' },
  { name: 'Ігор Ткаченко', phone: '+380634445566', company: 'ПП «Степ»', region: 'Полтавська', city: 'Лубни' },
  { name: 'Наталія Бондар', phone: '+380685556677', company: 'СФГ «Нива»', region: 'Кіровоградська', city: 'Знамʼянка' },
  { name: 'Андрій Шевчук', phone: '+380996667788', company: '', region: 'Київська', city: 'Біла Церква' },
  { name: 'Сергій Кравець', phone: '+380937778899', company: 'ТОВ «Зерно Плюс»', region: 'Одеська', city: 'Балта' },
];

// Детермінований генератор випадкових чисел — демо-дані однакові при кожному запуску
function random(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function seedCalendar(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM calendar_steps').get().n > 0) return;
  const insertStep = db.prepare(
    `INSERT INTO calendar_steps (crop, month_from, month_to, stage, title, description, icon, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const link = db.prepare(
    'INSERT OR IGNORE INTO calendar_step_products (step_id, product_id, sort_order) SELECT ?, id, ? FROM products WHERE sku = ?',
  );
  let order = 0;
  for (const [crop, steps] of Object.entries(CALENDAR)) {
    for (const s of steps) {
      const { lastInsertRowid } = insertStep.run(crop, s.months[0], s.months[1], s.stage, s.title, s.description, s.icon, order++);
      s.skus.forEach((sku, i) => link.run(lastInsertRowid, i, sku));
    }
  }
}

function seedReviews(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n > 0) return;
  const insert = db.prepare(
    `INSERT INTO reviews (product_id, author_name, rating, text, status, created_at)
     SELECT id, ?, ?, ?, ?, datetime('now', ?) FROM products WHERE sku = ?`,
  );
  REVIEWS.forEach((r, i) => insert.run(r.author, r.rating, r.text, 'approved', `-${(i * 7) % 60 + 3} days`, r.sku));
  PENDING_REVIEWS.forEach((r) => insert.run(r.author, r.rating, r.text, 'pending', '-1 days', r.sku));
}

// Тестовий покупець для демонстрації особистого кабінету: demo@agromarket.ua / demo12345
function seedDemoCustomer(db) {
  const existing = db.prepare("SELECT id FROM customers WHERE email = 'demo@agromarket.ua'").get();
  if (existing) return existing.id;
  const c = DEMO_CUSTOMERS[0];
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO customers (name, email, phone, password_hash, company, region, city, delivery_address)
       VALUES (?, 'demo@agromarket.ua', ?, ?, ?, ?, ?, 'Відділення Нової Пошти №1')`,
    )
    .run(c.name, c.phone, bcrypt.hashSync('demo12345', 10), c.company, c.region, c.city);
  return lastInsertRowid;
}

// Історія замовлень за останні ~6 місяців (лише для свіжої бази)
function seedDemoOrders(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM orders').get().n > 0) return;
  const demoCustomerId = seedDemoCustomer(db);
  const rnd = random(42);
  const products = db
    .prepare('SELECT id, name, sku, packaging, unit, price FROM products WHERE price IS NOT NULL AND is_active = 1')
    .all();
  const tiers = db.prepare('SELECT min_qty, price FROM product_price_tiers WHERE product_id = ? ORDER BY min_qty');
  const insertOrder = db.prepare(
    `INSERT INTO orders (number, customer_id, customer_name, phone, company, region, city, delivery_method,
       delivery_address, payment_method, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, sku, packaging, unit, price, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const count = 85;
  const orders = [];
  for (let n = 0; n < count; n++) {
    // Більше замовлень ближче до сьогодні та навесні
    const daysAgo = Math.floor(Math.pow(rnd(), 1.4) * 180) + 1;
    const date = new Date(Date.now() - daysAgo * 86400000);
    date.setUTCHours(6 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
    const createdAt = date.toISOString().slice(0, 19).replace('T', ' ');
    const customerIndex = Math.floor(Math.pow(rnd(), 1.6) * DEMO_CUSTOMERS.length);
    const c = DEMO_CUSTOMERS[customerIndex];
    const lines = [];
    const lineCount = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < lineCount; k++) {
      const p = products[Math.floor(Math.pow(rnd(), 1.3) * products.length)];
      if (lines.some((l) => l.id === p.id)) continue;
      const quantity = p.unit === 'т' ? 1 + Math.floor(rnd() * 8) : 1 + Math.floor(rnd() * 24);
      let price = p.price;
      for (const t of tiers.all(p.id)) if (quantity >= t.min_qty && t.price < price) price = t.price;
      lines.push({ ...p, price, quantity });
    }
    const total = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
    const roll = rnd();
    const status = daysAgo <= 2 ? (roll < 0.6 ? 'new' : 'processing')
      : daysAgo <= 7 ? (roll < 0.5 ? 'shipped' : 'completed')
        : roll < 0.08 ? 'cancelled' : 'completed';
    const delivery = rnd() < 0.6 ? 'nova_poshta' : rnd() < 0.5 ? 'company_delivery' : 'pickup';
    orders.push({ createdAt, customerIndex, c, lines, total, status, delivery });
  }
  // Вставляємо за порядком дат, щоб id і номери йшли хронологічно, як у реальному магазині
  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  orders.forEach((o, i) => {
    const number = `D${o.createdAt.slice(2, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;
    const { lastInsertRowid } = insertOrder.run(
      number, o.customerIndex === 0 ? demoCustomerId : null, o.c.name, o.c.phone, o.c.company, o.c.region, o.c.city,
      o.delivery, o.delivery === 'pickup' ? '' : o.delivery === 'nova_poshta' ? 'Відділення №1' : 'Склад господарства',
      o.c.company ? 'invoice' : 'card', o.total, o.status, o.createdAt,
    );
    for (const l of o.lines) insertItem.run(lastInsertRowid, l.id, l.name, l.sku, l.packaging, l.unit, l.price, l.quantity);
  });
}

module.exports = { seedCalendar, seedReviews, seedDemoCustomer, seedDemoOrders };
