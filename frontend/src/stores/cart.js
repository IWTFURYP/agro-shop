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
  // Елемент кошика: { id, slug, name, price, price_tiers, unit, packaging, image_url, quantity }
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

  function add(product, quantity = 1) {
    const existing = items.value.find((i) => i.id === product.id);
    if (existing) {
      existing.quantity += quantity;
      existing.price = product.price;
      existing.price_tiers = product.price_tiers || [];
      return;
    }
    items.value.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      price_tiers: product.price_tiers || [],
      unit: product.unit,
      packaging: product.packaging,
      image_url: product.image_url,
      quantity,
    });
  }

  function setQuantity(id, quantity) {
    const item = items.value.find((i) => i.id === id);
    if (item) item.quantity = Math.max(1, Math.floor(quantity) || 1);
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

  return { items, count, total, savings, priceOf, hasPriceOnRequest, add, setQuantity, remove, clear, has };
});
