// Пошук населених пунктів України для підказок у формі замовлення (як на великих маркетплейсах):
// користувач вводить «топо» → «с. Топорівці — Чернівецька обл., Чернівецький р-н, Топорівська громада».
// Довідник КАТОТТГ лежить у data/settlements.json і завантажується в пам'ять один раз.

const path = require('path');

const TYPES = {
  K: { short: 'м.', rank: 0 },
  M: { short: 'м.', rank: 1 },
  T: { short: 'смт', rank: 2 },
  X: { short: 'с-ще', rank: 3 },
  C: { short: 'с.', rank: 3 },
};

// Великі міста вгорі списку, коли їх назва збігається з початком запиту
const BIG_CITIES = new Set(['Київ', 'Харків', 'Одеса', 'Дніпро', 'Запоріжжя', 'Львів', 'Вінниця', 'Полтава', 'Черкаси', 'Чернівці']);

const normalize = (s) =>
  String(s || '')
    .toLocaleLowerCase('uk')
    .replace(/[’ʼ`ʹ‘]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();

// Префікси, які люди часто вводять: «с. Топорівці», «смт Кельменці», «місто Львів»
const PREFIX = /^(с\.|с\s|село\s|м\.|м\s|місто\s|смт\.?\s|с-ще\.?\s|селище\s)\s*/;

let index = null;

function load() {
  if (index) return index;
  const data = require(path.join(__dirname, '..', 'data', 'settlements.json'));
  index = data.items.map(([name, type, o, r, h]) => {
    const oblast = data.oblasts[o] || '';
    const raion = data.raions[r] || '';
    const hromada = data.hromadas[h] || '';
    const key = normalize(name);
    return {
      name,
      type,
      oblast,
      raion,
      hromada,
      key,
      // Початки слів у назві: «подільський» у «Кам'янець-Подільський»
      words: key.split(/[\s-]+/).slice(1),
      context: normalize(`${oblast} ${raion} ${hromada}`).split(' '),
    };
  });
  return index;
}

function describe(s) {
  const t = TYPES[s.type];
  const isSpecial = s.type === 'K';
  const oblast = s.oblast.includes('Республіка') ? s.oblast : s.oblast && `${s.oblast} обл.`;
  const parts = isSpecial
    ? ['місто зі спеціальним статусом']
    : [oblast, s.raion && `${s.raion} р-н`, s.hromada && s.name !== s.hromada && `${s.hromada} громада`].filter(Boolean);
  return {
    name: s.name,
    type: t.short,
    title: `${t.short} ${s.name}`,
    details: parts.join(', '),
    // Область у форматі списку областей на сайті
    region: isSpecial ? `м. ${s.name}` : s.oblast,
    raion: s.raion,
    // Що записати в поле «Населений пункт»
    value: isSpecial ? `м. ${s.name}` : `${t.short} ${s.name}${s.raion ? `, ${s.raion} р-н` : ''}`,
  };
}

function search(query, limit = 10) {
  const tokens = normalize(query).replace(PREFIX, '').split(/[\s,]+/).filter(Boolean);
  if (!tokens.length || tokens[0].length < 2) return [];
  const [first, ...rest] = tokens;
  const matches = [];
  for (const s of load()) {
    let score;
    if (s.key === first) score = 0;
    else if (s.key.startsWith(first)) score = 1;
    else if (s.words.some((w) => w.startsWith(first))) score = 3;
    else continue;
    // Решта слів запиту уточнюють область, район чи громаду: «топорівці черн»
    if (rest.length && !rest.every((t) => s.context.some((c) => c.startsWith(t)))) continue;
    matches.push({ s, score: score * 10 + TYPES[s.type].rank - (BIG_CITIES.has(s.name) ? 5 : 0) });
  }
  matches.sort((a, b) => a.score - b.score || a.s.name.length - b.s.name.length || a.s.name.localeCompare(b.s.name, 'uk'));
  return matches.slice(0, limit).map((m) => describe(m.s));
}

module.exports = { search, normalize };
