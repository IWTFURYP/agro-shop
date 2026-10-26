<script setup>
import { computed } from 'vue';
import { formatPrice } from '@/utils/format';
import { qty } from '@/utils/units';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import ProductImage from './ProductImage.vue';
import AppIcon from './AppIcon.vue';

const props = defineProps({ product: { type: Object, required: true } });

const cart = useCartStore();
const toast = useToastStore();

const discount = computed(() => {
  const { price, old_price: old } = props.product;
  return price && old && old > price ? Math.round((1 - price / old) * 100) : 0;
});
// Найнижча оптова ціна для підказки «опт від …»
const bestTier = computed(() => {
  const tiers = props.product.price_tiers || [];
  return tiers.length ? tiers[tiers.length - 1] : null;
});
const inCart = computed(() => cart.has(props.product.id));

function addToCart() {
  cart.add(props.product);
  toast.success(`«${props.product.name}» додано в кошик`);
}
</script>

<template>
  <article class="pcard">
    <RouterLink :to="`/product/${product.slug}`" class="pcard__image" :aria-label="product.name">
      <ProductImage :src="product.image_url" :alt="product.name" :icon="product.category?.icon || 'sprout'" />
      <div class="pcard__badges">
        <span v-if="discount" class="badge badge--red">−{{ discount }}%</span>
        <span v-if="product.is_featured" class="badge badge--dark">Хіт</span>
        <span v-if="bestTier" class="badge badge--yellow"><AppIcon name="percent" :size="12" /> Опт</span>
      </div>
    </RouterLink>

    <div class="pcard__body">
      <div class="pcard__meta">
        <span class="pcard__cat">{{ product.category?.name }}</span>
        <span class="pcard__stock" :class="product.in_stock ? 'in' : 'out'">
          {{ product.in_stock ? 'В наявності' : 'Під замовлення' }}
        </span>
      </div>
      <RouterLink :to="`/product/${product.slug}`" class="pcard__title">{{ product.name }}</RouterLink>
      <p v-if="product.packaging" class="pcard__sub">{{ product.packaging }}</p>
      <p v-else-if="product.brand" class="pcard__sub">{{ product.brand.name }}</p>

      <div class="pcard__footer">
        <div class="pcard__price">
          <s v-if="discount">{{ formatPrice(product.old_price) }}</s>
          <strong :class="{ request: product.price == null }">{{ formatPrice(product.price) }}</strong>
          <small v-if="bestTier">від {{ qty(bestTier.min_qty, product.unit) }} — {{ formatPrice(bestTier.price) }}</small>
        </div>
        <button
          class="pcard__buy"
          :class="{ added: inCart }"
          :aria-label="product.price == null ? 'Запитати ціну' : 'Додати в кошик'"
          @click="addToCart"
        >
          <AppIcon :name="inCart ? 'check' : 'plus'" :size="20" :stroke-width="2.2" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pcard {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--c-surface);
  border-radius: var(--radius);
  box-shadow: 0 0 0 1px var(--c-border);
  overflow: hidden;
  transition: box-shadow 0.3s var(--ease), transform 0.3s var(--ease);
}
.pcard:hover {
  box-shadow: 0 0 0 1px transparent, var(--shadow-lg);
  transform: translateY(-4px);
}
.pcard__image {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #f6f7f3;
  overflow: hidden;
}
.pcard__image :deep(.pimg) { transition: transform 0.5s var(--ease); }
.pcard:hover .pcard__image :deep(.pimg) { transform: scale(1.04); }
.pcard__badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pcard__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 16px 18px 18px;
  gap: 4px;
}
.pcard__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--c-muted);
}
.pcard__cat { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pcard__stock { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-weight: 500; }
.pcard__stock::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pcard__stock.in { color: var(--c-primary); }
.pcard__stock.out { color: #a8770f; }
.pcard__title {
  margin-top: 2px;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--c-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pcard__title::after { content: ''; position: absolute; inset: 0; } /* вся картка клікабельна */
.pcard__title:hover { color: var(--c-primary); }
.pcard__sub {
  margin: 0;
  font-size: 13px;
  color: var(--c-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pcard__footer {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}
.pcard__price { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.pcard__price s { font-size: 13px; color: var(--c-muted); }
.pcard__price strong { font: 800 20px/1.2 var(--font-head); letter-spacing: -0.02em; color: var(--c-text); }
.pcard__price strong.request { font-size: 15px; font-weight: 700; color: var(--c-muted); }
.pcard__price small { font-size: 12px; color: #8a5f0d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pcard__buy {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.2s, transform 0.2s var(--ease);
}
.pcard__buy:hover { background: var(--c-primary-hover); transform: scale(1.08); }
.pcard__buy.added { background: var(--c-primary-light); color: var(--c-primary-dark); }

@media (max-width: 560px) {
  .pcard__body { padding: 12px; }
  .pcard__title { font-size: 14px; }
  .pcard__price strong { font-size: 16px; }
  .pcard__price small { display: none; }
  .pcard__buy { width: 38px; height: 38px; }
  .pcard__cat { display: none; }
  .pcard__badges { top: 8px; left: 8px; }
}
</style>
