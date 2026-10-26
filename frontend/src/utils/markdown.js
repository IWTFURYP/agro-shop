// Мінімальний і безпечний перетворювач тексту статей у HTML.
// Підтримує: ## заголовки, ### підзаголовки, списки "- ", "1. ", > цитати,
// **жирний**, *курсив*, [посилання](адреса). Весь інший HTML екранується.

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function safeHref(url) {
  const u = url.trim();
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  if (/^https?:\/\//i.test(u) || /^mailto:|^tel:/i.test(u)) return u;
  return null;
}

function inline(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, rawUrl) => {
    // rawUrl уже екранований; повертаємо апострофи для перевірки адреси
    const href = safeHref(rawUrl.replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    if (!href) return label;
    const external = /^https?:/i.test(href);
    return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  return html;
}

export function renderMarkdown(source = '') {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    let m;
    if (!line) {
      flushParagraph();
      closeList();
    } else if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushParagraph();
      closeList();
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/)) || (m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushParagraph();
      const type = /^\d/.test(line) ? 'ol' : 'ul';
      if (list !== type) {
        closeList();
        out.push(`<${type}>`);
        list = type;
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushParagraph();
      closeList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}
