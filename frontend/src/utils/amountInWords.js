// Сума прописом українською для накладних: 45480.5 → «Сорок п'ять тисяч чотириста вісімдесят гривень 50 копійок»

const ONES_M = ['', 'один', 'два', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"];
const ONES_F = ['', 'одна', 'дві', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"];
const TEENS = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', "п'ятнадцять", 'шістнадцять', 'сімнадцять', 'вісімнадцять', "дев'ятнадцять"];
const TENS = ['', '', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"];
const HUNDREDS = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"];

function plural(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// Число 0–999 словами; feminine — для тисяч і гривень («одна», «дві»)
function triad(n, feminine) {
  const words = [HUNDREDS[Math.floor(n / 100)]];
  const rest = n % 100;
  if (rest >= 10 && rest < 20) words.push(TEENS[rest - 10]);
  else words.push(TENS[Math.floor(rest / 10)], (feminine ? ONES_F : ONES_M)[rest % 10]);
  return words.filter(Boolean).join(' ');
}

const SCALES = [
  { forms: ['гривня', 'гривні', 'гривень'], feminine: true },
  { forms: ['тисяча', 'тисячі', 'тисяч'], feminine: true },
  { forms: ['мільйон', 'мільйони', 'мільйонів'], feminine: false },
  { forms: ['мільярд', 'мільярди', 'мільярдів'], feminine: false },
];

export function amountInWords(amount) {
  const kopecks = Math.round(amount * 100);
  let hryvnias = Math.floor(kopecks / 100);
  const kop = kopecks % 100;
  if (hryvnias === 0) return `Нуль гривень ${String(kop).padStart(2, '0')} копійок`;

  const parts = [];
  for (let i = 0; hryvnias > 0 && i < SCALES.length; i++) {
    const n = hryvnias % 1000;
    hryvnias = Math.floor(hryvnias / 1000);
    if (n === 0 && i > 0) continue;
    const words = triad(n, SCALES[i].feminine);
    const unit = i === 0 ? '' : plural(n, SCALES[i].forms);
    parts.unshift([words, unit].filter(Boolean).join(' '));
  }
  const total = Math.floor(kopecks / 100);
  let text = `${parts.join(' ')} ${plural(total, SCALES[0].forms)}`;
  text += ` ${String(kop).padStart(2, '0')} ${plural(kop, ['копійка', 'копійки', 'копійок'])}`;
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/\s+/g, ' ');
}
