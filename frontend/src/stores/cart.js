import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { unitPrice } from '@/utils/pricing';

const STORAGE_KEY = 'agro_cart';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const useCartStore = defineStore('cart', () => {
  // Елемент кошика: { id, slug, name, price, price_tiers, stock, unit, packaging, image_url, quantity }
  const items = ref(load());

  watch(
    items,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* ігноруємо, кошик просто не збережеться */
      }
    },
    { deep: true },
  );

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0));
  // Ціна з урахуванням оптової знижки для поточної кількості
  const priceOf = (item) => unitPrice(item.price, item.price_tiers, item.quantity);
  const total = computed(() =>
    items.value.reduce((sum, i) => sum + (priceOf(i) ?? 0) * i.quantity, 0),
  );
  const savings = computed(() =>
    items.value.reduce((sum, i) => sum + ((i.price ?? 0) - (priceOf(i) ?? 0)) * i.quantity, 0),
  );
  const hasPriceOnRequest = computed(() => items.value.some((i) => i.price == null));

  // Скільки можна замовити: для товарів з ціною — не більше залишку на складі.
  // «Ціна за запитом» (техніка) — це заявка, обмеження немає.
  const maxQty = (item) => (item.price != null && Number.isInteger(item.stock) ? item.stock : 100000);

  // Додає товар у кошик. Повертає, скільки одиниць реально додано (0 — немає на складі).
  function add(product, quantity = 1) {
    const existing = items.value.find((i) => i.id === product.id);
    const limit = maxQty(product);
    const current = existing?.quantity ?? 0;
    const added = Math.max(0, Math.min(quantity, limit - current));
    if (!added) return 0;
    if (existing) {
      existing.quantity += added;
      Object.assign(existing, { price: product.price, price_tiers: product.price_tiers || [], stock: product.stock });
      return added;
    }
    items.value.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      price_tiers: product.price_tiers || [],
      stock: product.stock,
      unit: product.unit,
      packaging: product.packaging,
      image_url: product.image_url,
      quantity: added,
    });
    return added;
  }

  function setQuantity(id, quantity) {
    const item = items.value.find((i) => i.id === id);
    if (item) item.quantity = Math.min(maxQty(item), Math.max(1, Math.floor(quantity) || 1));
  }

  // Оновлює ціни й залишки актуальними даними з сервера.
  // Повертає назви товарів, які зникли з продажу або кількість яких зменшено.
  function refresh(freshProducts) {
    const byId = new Map(freshProducts.map((p) => [p.id, p]));
    const removed = [];
    const reduced = [];
    items.value = items.value.filter((item) => {
      const p = byId.get(item.id);
      if (!p || (p.price != null && p.stock <= 0)) {
        removed.push(item.name);
        return false;
      }
      Object.assign(item, {
        name: p.name, slug: p.slug, price: p.price, price_tiers: p.price_tiers || [], stock: p.stock,
        unit: p.unit, packaging: p.packaging, image_url: p.image_url,
      });
      if (item.quantity > maxQty(item)) {
        item.quantity = maxQty(item);
        reduced.push(item.name);
      }
      return true;
    });
    return { removed, reduced };
  }

  function remove(id) {
    items.value = items.value.filter((i) => i.id !== id);
  }

  function clear() {
    items.value = [];
  }

  function has(id) {
    return items.value.some((i) => i.id === id);
  }

  return { items, count, total, savings, priceOf, hasPriceOnRequest, maxQty, add, setQuantity, refresh, remove, clear, has };
});
