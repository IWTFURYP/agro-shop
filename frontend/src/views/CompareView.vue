<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '@/api';
import { formatPrice } from '@/utils/format';
import { pricePerHa, formatPerHa } from '@/utils/pricing';
import { useCompareStore } from '@/stores/compare';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import ProductImage from '@/components/ProductImage.vue';
import StarRating from '@/components/StarRating.vue';
import AppIcon from '@/components/AppIcon.vue';

const compare = useCompareStore();
const cart = useCartStore();
const toast = useToastStore();
const products = ref([]);
const loading = ref(false);
const onlyDiff = ref(false);

async function load() {
  if (!compare.ids.length) {
    products.value = [];
    return;
  }
  loading.value = true;
  try {
    const data = await api.get('/products', { ids: compare.ids.join(','), limit: 10 });
    // Зберігаємо порядок, у якому товари додавали до порівняння
    products.value = compare.ids.map((id) => data.items.find((p) => p.id === id)).filter(Boolean);
  } finally {
    loading.value = false;
  }
}
watch(() => compare.ids.join(','), load, { immediate: true });

const perHa = (p) => pricePerHa(p);
// Найдешевша обробка гектара серед порівнюваних — підсвічуємо
const bestPerHa = computed(() => {
  const values = products.value.map((p) => perHa(p)?.min).filter((v) => v != null);
  return values.length > 1 ? Math.min(...values) : null;
});

const ROWS = [
  { label: 'Ціна', value: (p) => formatPrice(p.price) + (p.price != null ? ` / ${p.unit}` : '') },
  { label: 'Обробка 1 га', value: (p) => formatPerHa(perHa(p)) || '—', key: 'perha' },
  { label: 'Категорія', value: (p) => p.category?.name || '—' },
  { label: 'Діюча речовина', value: (p) => p.active_ingredient || '—' },
  { label: 'Препаративна форма', value: (p) => p.formulation || '—' },
  { label: 'Упаковка', value: (p) => p.packaging || '—' },
  {
    label: 'Норма витрати',
    value: (p) => (p.rate_min != null ? `${p.rate_min}${p.rate_max > p.rate_min ? `–${p.rate_max}` : ''} ${p.rate_unit}` : '—'),
  },
  { label: 'Культури', value: (p) => p.crops.join(', ') || '—' },
  { label: 'Проти', value: (p) => p.targets.join(', ') || '—' },
  { label: 'Виробник', value: (p) => p.brand?.name || '—' },
  { label: 'Оптові ціни', value: (p) => p.price_tiers.map((t) => `від ${t.min_qty} — ${formatPrice(t.price)}`).join('; ') || '—' },
  { label: 'Наявність', value: (p) => (p.in_stock ? `в наявності (${p.stock})` : p.price == null ? 'під замовлення' : 'немає') },
];

// «Лише відмінності»: ховаємо рядки, де в усіх товарів однакове значення
const visibleRows = computed(() =>
  onlyDiff.value && products.value.length > 1
    ? ROWS.filter((r) => new Set(products.value.map((p) => r.value(p))).size > 1)
    : ROWS,
);

function addToCart(p) {
  if (cart.add(p)) toast.success(`«${p.name}» додано в кошик`);
  else toast.error('Немає в наявності');
}
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span>Порівняння товарів</span>
    </nav>
    <div class="head">
      <h1>Порівняння товарів</h1>
      <div v-if="products.length" class="head__actions">
        <label class="checkbox"><input v-model="onlyDiff" type="checkbox" /> Лише відмінності</label>
        <button class="btn btn--ghost btn--sm" type="button" @click="compare.clear()"><AppIcon name="trash" :size="16" /> Очистити</button>
      </div>
    </div>

    <div v-if="loading && !products.length" class="spinner" />
    <div v-else-if="!products.length" class="empty card">
      <div class="empty__icon"><AppIcon name="scale" :size="30" /></div>
      <h3>Список порівняння порожній</h3>
      <p>Натисніть <AppIcon name="scale" :size="16" /> на картці товару, щоб додати його сюди. Можна порівняти до 4 товарів — наприклад, кілька фунгіцидів за ціною обробки гектара.</p>
      <RouterLink to="/catalog/fungicides" class="btn">Перейти до фунгіцидів</RouterLink>
    </div>

    <div v-else class="table-scroll card">
      <table class="cmp">
        <thead>
          <tr>
            <th class="cmp__label" />
            <th v-for="p in products" :key="p.id" class="cmp__product">
              <button class="cmp__remove" type="button" :aria-label="`Прибрати ${p.name}`" @click="compare.remove(p.id)">
                <AppIcon name="x" :size="16" />
              </button>
              <RouterLink :to="`/product/${p.slug}`" class="cmp__img">
                <ProductImage :src="p.image_url" :alt="p.name" :icon="p.category?.icon || 'sprout'" />
              </RouterLink>
              <RouterLink :to="`/product/${p.slug}`" class="cmp__name">{{ p.name }}</RouterLink>
              <span v-if="p.rating.count" class="cmp__rating">
                <StarRating :value="p.rating.avg" :size="13" /> {{ p.rating.avg }}
              </span>
              <button class="btn btn--sm" type="button" :disabled="p.price != null && !p.in_stock" @click="addToCart(p)">
                <AppIcon name="shopping-cart" :size="15" /> В кошик
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.label">
            <th class="cmp__label">{{ row.label }}</th>
            <td
              v-for="p in products"
              :key="p.id"
              :class="{ best: row.key === 'perha' && bestPerHa != null && perHa(p)?.min === bestPerHa }"
            >
              {{ row.value(p) }}
              <span v-if="row.key === 'perha' && bestPerHa != null && perHa(p)?.min === bestPerHa" class="badge badge--green">найвигідніше</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="products.length" class="muted note">
      Вартість обробки гектара = ціна упаковки ÷ обʼєм упаковки × норма витрати (мінімальна–максимальна за етикеткою).
    </p>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.head h1 { margin: 0; }
.head__actions { display: flex; align-items: center; gap: 16px; }
.table-scroll { overflow-x: auto; }
.cmp { width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed; min-width: 640px; }
.cmp th,
.cmp td { padding: 12px 16px; border-bottom: 1px solid var(--c-border); text-align: left; vertical-align: top; }
.cmp__label { width: 180px; min-width: 150px; color: var(--c-muted); font-weight: 500; position: sticky; left: 0; background: #fff; z-index: 1; }
.cmp td { min-width: 200px; }
.cmp__product { position: relative; min-width: 200px; vertical-align: top; }
.cmp__product > * { display: flex; }
.cmp__img { width: 100%; height: 170px; border-radius: 12px; overflow: hidden; background: #f6f7f3; margin-bottom: 10px; }
.cmp__name { font: 700 15px/1.3 var(--font-head); color: var(--c-text); margin-bottom: 6px; }
.cmp__rating { align-items: center; gap: 6px; font-size: 12px; color: var(--c-muted); margin-bottom: 8px; font-weight: 500; }
.cmp__product .btn { width: fit-content; }
.cmp__remove {
  position: absolute;
  top: 18px;
  right: 22px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: var(--c-muted);
  place-items: center;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
}
.cmp__remove:hover { color: var(--c-danger); }
td.best { background: var(--c-primary-soft); font-weight: 600; }
td .badge { margin-left: 6px; }
.note { font-size: 13px; margin-top: 12px; }
</style>
