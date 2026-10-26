import { SHOP } from '@/config';

// Встановлює заголовок сторінки, meta description, Open Graph та структуровані дані (JSON-LD)
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLd(data) {
  document.getElementById('seo-jsonld')?.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'seo-jsonld';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

const clip = (text, max = 160) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

export function setSeo({ title, description, image, type = 'website', jsonLd } = {}) {
  const fullTitle = title ? `${title} — ${SHOP.name}` : `${SHOP.name} — ${SHOP.tagline}`;
  const desc = clip(description || SHOP.seoDescription);
  const url = window.location.origin + window.location.pathname + window.location.search;

  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:site_name', SHOP.name);
  setMeta('property', 'og:image', image ? new URL(image, window.location.origin).href : '');
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  setCanonical(url);
  setJsonLd(jsonLd);
}
