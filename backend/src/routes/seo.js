const express = require('express');
const { db } = require('../db');

const router = express.Router();

function siteUrl(req) {
  return (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

// Карта сайту для Google: усі сторінки, категорії, товари, статті та добірки
router.get('/sitemap.xml', (req, res) => {
  const base = siteUrl(req);
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/catalog', priority: '0.9' },
    { loc: '/problems', priority: '0.7' },
    { loc: '/calendar', priority: '0.7' },
    { loc: '/articles', priority: '0.7' },
    { loc: '/services', priority: '0.6' },
    { loc: '/about', priority: '0.5' },
    { loc: '/contacts', priority: '0.5' },
  ];
  for (const c of db.prepare('SELECT slug FROM categories').all()) {
    urls.push({ loc: `/catalog/${c.slug}`, priority: '0.8' });
  }
  for (const p of db.prepare('SELECT slug, updated_at FROM products WHERE is_active = 1').all()) {
    urls.push({ loc: `/product/${p.slug}`, lastmod: p.updated_at.slice(0, 10), priority: '0.8' });
  }
  for (const a of db.prepare('SELECT slug, updated_at FROM articles WHERE is_published = 1').all()) {
    urls.push({ loc: `/articles/${a.slug}`, lastmod: a.updated_at.slice(0, 10), priority: '0.6' });
  }
  for (const c of db.prepare('SELECT slug FROM collections WHERE is_active = 1').all()) {
    urls.push({ loc: `/catalog?collection=${encodeURIComponent(c.slug)}`, priority: '0.6' });
  }

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${escapeXml(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
    )
    .join('\n');
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Disallow: /admin', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /account', 'Disallow: /compare', '', `Sitemap: ${siteUrl(req)}/sitemap.xml`, ''].join('\n'),
  );
});

module.exports = router;
