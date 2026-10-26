const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');

const config = require('./config');
const { db } = require('./db');
const { seedIfEmpty } = require('./seed');
const { HttpError } = require('./utils');

seedIfEmpty(db);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', require('./routes/catalog'));
app.use('/api', require('./routes/content'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/assistant', require('./assistant'));

app.use('/api', () => {
  throw new HttpError(404, 'Маршрут API не знайдено');
});

app.use(require('./routes/seo'));

// Після `npm run build` бекенд сам віддає зібраний фронтенд (режим production).
if (fs.existsSync(path.join(config.frontendDist, 'index.html'))) {
  app.use(express.static(config.frontendDist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некоректний JSON у запиті' });
  }
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 ? 'Внутрішня помилка сервера' : err.message,
    fields: err.fields,
  });
});

app.listen(config.port, () => {
  console.log(`✅ API запущено: http://localhost:${config.port}/api`);
});
