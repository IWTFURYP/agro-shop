// Ціна за одиницю з урахуванням оптових знижок (така сама логіка, як на сервері)
export function unitPrice(basePrice, tiers = [], quantity = 1) {
  if (basePrice == null) return null;
  let price = basePrice;
  for (const t of tiers) if (quantity >= t.min_qty && t.price < price) price = t.price;
  return price;
}

// Наступний оптовий поріг: «ще 3 шт — і ціна буде 3 790 грн»
export function nextTier(basePrice, tiers = [], quantity = 1) {
  if (basePrice == null) return null;
  return tiers.find((t) => t.min_qty > quantity && t.price < unitPrice(basePrice, tiers, quantity)) || null;
}

// Вартість обробки 1 гектара: ціна упаковки ÷ обʼєм упаковки × норма витрати.
// Повертає { min, max } (для мінімальної та максимальної норми) або null, якщо порахувати не можна.
export function pricePerHa(product, price = product?.price) {
  if (!product || price == null || !product.package_size || product.rate_min == null) return null;
  const basis = (product.rate_unit || '').split('/')[1]?.trim() || 'га';
  if (basis !== 'га') return null;
  const perUnit = price / product.package_size;
  const max = product.rate_max ?? product.rate_min;
  return { min: perUnit * product.rate_min, max: perUnit * max };
}

export function formatPerHa(range) {
  if (!range) return '';
  const f = (n) => Math.round(n).toLocaleString('uk-UA');
  return Math.round(range.min) === Math.round(range.max)
    ? `≈ ${f(range.min)} грн/га`
    : `≈ ${f(range.min)}–${f(range.max)} грн/га`;
}
