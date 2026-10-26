// AI-помічник для покупців на базі Claude (Anthropic API).
// Шукає товари в каталозі, рахує норму витрати, показує картки товарів
// і за згодою клієнта залишає заявку на дзвінок менеджера.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
require('../config');
const { db } = require('../db');
const products = require('../models/products');
const { HttpError, str, normalizePhone } = require('../utils');

const MODEL = process.env.ASSISTANT_MODEL || 'claude-opus-5-5';
// Глибина «роздумів» моделі: low — швидко й дешево, high — ретельніше
const EFFORT = process.env.ASSISTANT_EFFORT || 'low';
const ENABLED = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = ENABLED ? new Anthropic() : null;
// Серверний запасний варіант на випадок відмови моделі (не підтримується моделями Haiku)
const USE_FALLBACKS = !MODEL.startsWith('claude-haiku');

const MAX_MESSAGE_LENGTH = 1500;
const MAX_USER_TURNS = 40;
const MAX_TOOL_ROUNDS = 8;
const CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CONVERSATIONS = 1000;

const knowledge = fs.readFileSync(path.join(__dirname, 'knowledge.md'), 'utf8');

const SYSTEM_PROMPT = `Ти — AI-помічник інтернет-магазину агротоварів. Магазин продає засоби захисту рослин (гербіциди, фунгіциди, інсектициди, протруйники, ад'юванти), насіння польових культур, мінеральні добрива, мікродобрива та сільгосптехніку. Клієнти — фермери, агрономи, керівники господарств і приватні покупці.

Твоє завдання — допомогти клієнту знайти потрібний товар, розібратися з проблемою на полі, порахувати потрібну кількість і за потреби зв'язатися з менеджером.

Як працювати:
- Відповідай мовою клієнта (за замовчуванням — українською). Пиши коротко й по суті, як досвідчений консультант: 2–6 речень або короткий список.
- Товари, ціни, наявність, норми витрати й оптові ціни бери тільки з інструментів. Ніколи не вигадуй товарів, цін чи норм. Якщо в каталозі немає потрібного — чесно скажи й запропонуй консультацію агронома.
- Коли рекомендуєш конкретні товари, виклич show_products з їхніми slug, щоб клієнт побачив картки з кнопкою «в кошик». Не більше 4 товарів за раз.
- Для розрахунку «скільки потрібно на N га» (або на N т насіння для протруйників) використовуй calculate_need.
- Якщо клієнт описує проблему (хвороба, шкідник, бур'ян, дефіцит елемента) — уточни культуру, якщо вона неочевидна, і шукай за назвою проблеми та культурою.
- Нагадуй дотримуватися інструкції на етикетці, регламентів і засобів індивідуального захисту, коли мова про застосування пестицидів. Не давай порад, що суперечать етикетці, і не рекомендуй змішувати препарати без перевірки сумісності.
- Якщо питання складне (діагностика за описом, нетипова ситуація, великий обсяг закупівлі, техніка, індивідуальна ціна) — запропонуй безкоштовну консультацію агронома або менеджера.
- Заявку на дзвінок створюй через create_callback_request тільки тоді, коли клієнт сам назвав ім'я й телефон і погодився, щоб йому передзвонили. У полі message коротко опиши, що саме потрібно клієнту.
- Оформити замовлення клієнт може сам: додати товари в кошик і перейти до оформлення. Ти не оформлюєш замовлення і не приймаєш оплату.
- На питання, не пов'язані з магазином, сільським господарством чи покупкою, відповідай коротко й ввічливо повертай розмову до допомоги з покупкою.

Форматування: без таблиць і заголовків (вікно чату вузьке). Можна використовувати **жирний**, списки "- " та посилання на сторінки сайту у форматі [текст](/шлях). Ціни пиши з «грн».

Інформація про магазин:
${knowledge}`;

const TOOLS = [
  {
    name: 'search_products',
    description:
      'Пошук товарів у каталозі магазину. Шукає за назвою, діючою речовиною, культурою, проблемою (хвороба, шкідник, бур\'ян) і категорією. Повертає до 10 товарів з цінами, наявністю, нормами витрати та оптовими цінами. Можна викликати кілька разів з різними запитами.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Текст пошуку: назва, діюча речовина, проблема, культура. Напр. "септоріоз пшениця" або "гліфосат"' },
        category: {
          type: 'string',
          description: 'Slug категорії (необов\'язково): zzr, herbicides, fungicides, insecticides, seed-treatment, adjuvants, seeds, seeds-corn, seeds-sunflower, seeds-wheat, seeds-rapeseed, fertilizers, micro, machinery',
        },
        crop: { type: 'string', description: 'Культура для фільтра, напр. "Пшениця", "Соняшник" (необов\'язково)' },
        in_stock_only: { type: 'boolean', description: 'Тільки товари в наявності' },
      },
    },
    eager_input_streaming: true,
  },
  {
    name: 'get_product',
    description: 'Повна інформація про один товар за його slug: опис, характеристики, норма витрати, оптові ціни, документи.',
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Slug товару з результатів search_products' } },
      required: ['slug'],
    },
    eager_input_streaming: true,
  },
  {
    name: 'calculate_need',
    description:
      'Розраховує, скільки препарату/насіння/добрива потрібно на задану площу (га) або масу насіння (т, для протруйників), скільки це упаковок і орієнтовну вартість з урахуванням оптових цін. Працює для товарів, у яких вказана норма витрати.',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug товару' },
        amount: { type: 'number', description: 'Площа в гектарах або маса насіння в тоннах (залежно від одиниці норми товару)' },
        rate: { type: 'number', description: 'Норма витрати на 1 га або 1 т. Якщо не вказати — береться максимальна рекомендована.' },
      },
      required: ['slug', 'amount'],
    },
    eager_input_streaming: true,
  },
  {
    name: 'show_products',
    description: 'Показує клієнту в чаті картки товарів з фото, ціною та кнопкою «в кошик». Викликай, коли рекомендуєш конкретні товари.',
    input_schema: {
      type: 'object',
      properties: {
        slugs: { type: 'array', items: { type: 'string' }, description: 'Slug товарів (до 4)' },
      },
      required: ['slugs'],
    },
    eager_input_streaming: true,
  },
  {
    name: 'create_callback_request',
    description:
      'Створює заявку на дзвінок менеджера або агронома. Викликай лише коли клієнт сам надав ім\'я та телефон і погодився на дзвінок.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Ім\'я клієнта' },
        phone: { type: 'string', description: 'Телефон клієнта, як він його написав' },
        message: { type: 'string', description: 'Коротко: що потрібно клієнту (товари, обсяги, питання)' },
        crop: { type: 'string', description: 'Культура, якщо відома' },
        region: { type: 'string', description: 'Область, якщо відома' },
      },
      required: ['name', 'phone', 'message'],
    },
    eager_input_streaming: true,
  },
];

/* ---------- Інструменти ---------- */

function compactProduct(p) {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category?.name,
    brand: p.brand?.name,
    price: p.price ?? 'ціна за запитом',
    old_price: p.old_price ?? undefined,
    unit: p.unit,
    packaging: p.packaging || undefined,
    active_ingredient: p.active_ingredient || undefined,
    crops: p.crops,
    targets: p.targets,
    in_stock: p.in_stock,
    rate: p.rate_min != null ? `${p.rate_min}–${p.rate_max} ${p.rate_unit}` : undefined,
    price_tiers: p.price_tiers.length ? p.price_tiers : undefined,
    url: `/product/${p.slug}`,
  };
}

const isString = (v) => typeof v === 'string';
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

const handlers = {
  search_products(input) {
    if (input.query != null && !isString(input.query)) throw new Error('query must be a string');
    const query = {
      search: str(input.query, 200),
      category: isString(input.category) ? input.category : undefined,
      crop: isString(input.crop) ? input.crop : undefined,
      inStock: input.in_stock_only === true ? '1' : undefined,
    };
    const result = products.listProducts(query, { page: 1, limit: 10, offset: 0 });
    return { total_found: result.total, products: result.items.map(compactProduct) };
  },

  get_product(input) {
    if (!isString(input.slug)) throw new Error('slug is required');
    const p = products.getProductBy('slug', input.slug);
    if (!p) return { error: 'Товар не знайдено' };
    return {
      ...compactProduct(p),
      short_description: p.short_description,
      description: p.description.slice(0, 2000),
      formulation: p.formulation || undefined,
      package_size: p.package_size ?? undefined,
      documents: p.documents,
    };
  },

  calculate_need(input) {
    if (!isString(input.slug) || !isFiniteNumber(input.amount) || input.amount <= 0) {
      throw new Error('slug and positive amount are required');
    }
    if (input.rate != null && (!isFiniteNumber(input.rate) || input.rate <= 0)) {
      throw new Error('rate must be a positive number');
    }
    const p = products.getProductBy('slug', input.slug);
    if (!p) return { error: 'Товар не знайдено' };
    if (p.rate_min == null || !p.package_size) {
      return { error: 'Для цього товару норма витрати не вказана — порадь консультацію агронома' };
    }
    const [amountUnit, basis = 'га'] = p.rate_unit.split('/').map((s) => s.trim());
    const rate = input.rate ?? p.rate_max ?? p.rate_min;
    const total = input.amount * rate;
    const packs = Math.ceil(total / p.package_size - 1e-9);
    const unitPrice = products.unitPrice(p.price, p.price_tiers, packs);
    return {
      product: p.name,
      amount: `${input.amount} ${basis}`,
      rate_used: `${rate} ${p.rate_unit}`,
      recommended_rate: `${p.rate_min}–${p.rate_max} ${p.rate_unit}`,
      rate_outside_recommended: rate < p.rate_min || rate > p.rate_max,
      total_needed: `${Math.round(total * 100) / 100} ${amountUnit}`,
      packages: `${packs} × ${p.unit} (${p.packaging || p.unit})`,
      unit_price: unitPrice ?? 'ціна за запитом',
      total_cost: unitPrice == null ? 'уточнює менеджер' : Math.round(unitPrice * packs * 100) / 100,
      wholesale_applied: unitPrice != null && unitPrice < p.price,
    };
  },

  show_products(input, ctx) {
    if (!Array.isArray(input.slugs)) throw new Error('slugs must be an array');
    const shown = [];
    for (const slug of input.slugs.filter(isString).slice(0, 4)) {
      const p = products.getProductBy('slug', slug);
      if (p) shown.push(p);
    }
    if (shown.length) ctx.send('products', { items: shown });
    return { shown: shown.map((p) => p.slug), not_found: input.slugs.length - shown.length };
  },

  create_callback_request(input) {
    const phone = normalizePhone(input.phone);
    const name = str(input.name, 120);
    if (name.length < 2) return { error: 'Потрібне ім\'я клієнта' };
    if (!phone) return { error: 'Некоректний телефон. Попроси клієнта вказати номер у форматі +380XXXXXXXXX' };
    db.prepare(
      `INSERT INTO service_requests (type, name, phone, region, crop, message)
       VALUES ('ai_assistant', ?, ?, ?, ?, ?)`,
    ).run(name, phone, str(input.region, 60), str(input.crop, 120), str(input.message, 2000));
    return { ok: true, note: 'Заявку створено. Менеджер зателефонує в робочий час.' };
  },
};

async function runTool(block, ctx) {
  const handler = handlers[block.name];
  if (!handler) return { content: `Невідомий інструмент ${block.name}`, is_error: true };
  if (!block.input || typeof block.input !== 'object' || Array.isArray(block.input)) {
    return { content: JSON.stringify({ INVALID_JSON: JSON.stringify(block.input) }), is_error: true };
  }
  try {
    return { content: JSON.stringify(await handler(block.input, ctx)) };
  } catch (err) {
    return { content: `Помилка: ${err.message}`, is_error: true };
  }
}

/* ---------- Розмови (зберігаються в пам'яті сервера) ---------- */

const conversations = new Map();

function cleanupConversations() {
  const now = Date.now();
  for (const [id, c] of conversations) {
    if (now - c.updatedAt > CONVERSATION_TTL_MS) conversations.delete(id);
  }
  while (conversations.size > MAX_CONVERSATIONS) {
    conversations.delete(conversations.keys().next().value);
  }
}
setInterval(cleanupConversations, 10 * 60 * 1000).unref();

// Захист від надмірних витрат: не більше 30 повідомлень за 15 хвилин з однієї IP
const usage = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = usage.get(ip);
  if (!entry || entry.resetAt <= now) {
    usage.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > 30) throw new HttpError(429, 'Забагато повідомлень. Спробуйте трохи пізніше або зателефонуйте нам');
}

/* ---------- Маршрути ---------- */

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({ enabled: ENABLED });
});

router.post('/chat', async (req, res) => {
  if (!ENABLED) throw new HttpError(503, 'AI-помічник ще не налаштований');
  const message = str(req.body?.message, MAX_MESSAGE_LENGTH);
  if (!message) throw new HttpError(400, 'Порожнє повідомлення');
  checkRateLimit(req.ip);

  let id = isString(req.body?.conversation_id) ? req.body.conversation_id : '';
  let conversation = conversations.get(id);
  if (!conversation) {
    id = crypto.randomUUID();
    conversation = { messages: [], userTurns: 0, busy: false, updatedAt: Date.now() };
    conversations.set(id, conversation);
  }
  if (conversation.busy) throw new HttpError(409, 'Зачекайте, помічник ще відповідає на попереднє повідомлення');
  if (conversation.userTurns >= MAX_USER_TURNS) {
    throw new HttpError(400, 'Розмова занадто довга — почніть нову', { conversation: 'limit' });
  }

  // Відповідь передається потоком (Server-Sent Events), щоб текст з'являвся поступово
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  let closed = false;
  let currentStream = null;
  res.on('close', () => {
    closed = true;
    currentStream?.abort();
  });
  const send = (event, data) => {
    if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  conversation.busy = true;
  conversation.updatedAt = Date.now();
  const turnStart = conversation.messages.length;
  conversation.messages.push({ role: 'user', content: message });
  send('meta', { conversation_id: id });

  let completed = false;
  try {
    let sentText = false;
    for (let round = 0; round < MAX_TOOL_ROUNDS && !closed; round++) {
      let roundText = false;

      const params = {
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: EFFORT },
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages: conversation.messages,
      };
      if (USE_FALLBACKS) {
        params.betas = ['server-side-fallback-2026-07-01'];
        params.fallbacks = 'default';
      }

      currentStream = client.beta.messages.stream(params);
      currentStream.on('text', (delta) => {
        // Текст нового раунду (після виклику інструментів) — з нового абзацу
        if (!roundText && sentText) delta = `\n\n${delta}`;
        roundText = sentText = true;
        send('text', { delta });
      });
      const response = await currentStream.finalMessage();
      currentStream = null;

      if (response.stop_reason === 'refusal') {
        send('text', { delta: 'Вибачте, на це питання я не можу відповісти. Зателефонуйте нам — менеджер допоможе.' });
        break;
      }

      const toolUses = response.content.filter((b) => b.type === 'tool_use');
      if (toolUses.length === 0) {
        conversation.messages.push({ role: 'assistant', content: response.content });
        completed = true;
        break;
      }
      // Виклик інструмента обрізано лімітом токенів — не виконуємо його
      if (response.stop_reason === 'max_tokens') break;

      conversation.messages.push({ role: 'assistant', content: response.content });
      const results = [];
      for (const block of toolUses) {
        send('tool', { name: block.name });
        const { content, is_error } = await runTool(block, { send });
        results.push({ type: 'tool_result', tool_use_id: block.id, content, ...(is_error ? { is_error } : {}) });
      }
      // Усі результати інструментів — одним повідомленням
      conversation.messages.push({ role: 'user', content: results });
    }

    if (completed) {
      conversation.userTurns += 1;
      send('done', {});
    } else if (!closed) {
      send('error', { message: 'Не вдалося завершити відповідь. Спробуйте переформулювати питання.' });
    }
  } catch (err) {
    if (!closed) {
      console.error('[assistant]', err);
      let text = 'Помічник тимчасово недоступний. Спробуйте пізніше або зателефонуйте нам.';
      if (err instanceof Anthropic.RateLimitError) text = 'Помічник зараз перевантажений. Спробуйте за хвилину.';
      else if (err instanceof Anthropic.AuthenticationError) text = 'AI-помічник неправильно налаштований (ключ API).';
      send('error', { message: text });
    }
  } finally {
    // Незавершений хід прибираємо з кінця історії, щоб наступне питання почалося з чистого стану
    if (!completed) conversation.messages.length = turnStart;
    conversation.busy = false;
    conversation.updatedAt = Date.now();
    res.end();
  }
});

module.exports = router;
module.exports.ENABLED = ENABLED;
module.exports.MODEL = MODEL;
