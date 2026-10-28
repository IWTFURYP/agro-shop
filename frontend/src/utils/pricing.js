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
