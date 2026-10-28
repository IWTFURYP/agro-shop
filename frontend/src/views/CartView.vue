<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { formatPrice } from '@/utils/format';
import { useCartStore } from '@/stores/cart';
import ProductImage from '@/components/ProductImage.vue';
import QtyInput from '@/components/QtyInput.vue';

import { onMounted } from 'vue';
import { useCartSync } from '@/composables/useCartSync';

const cart = useCartStore();
const { notice, sync } = useCartSync();
onMounted(sync);
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span>Кошик</span>
    </nav>
    <h1>Кошик</h1>

    <div v-if="!cart.items.length" class="empty card">
      <div class="empty__icon"><AppIcon name="shopping-cart" :size="30" /></div>
      <h3>Ваш кошик порожній</h3>
      <p>Перегляньте каталог — у нас є все необхідне для вашого господарства.</p>
      <RouterLink to="/catalog" class="btn">Перейти до каталогу</RouterLink>
    </div>

    <div v-if="notice" class="alert alert--warn cart-notice"><AppIcon name="alert" :size="18" /> {{ notice }}</div>
    <div v-if="cart.items.length" class="cart">
      <div class="cart__items card">
        <div v-for="item in cart.items" :key="item.id" class="citem">
          <RouterLink :to="`/product/${item.slug}`" class="citem__img">
            <ProductImage :src="item.image_url" :alt="item.name" />
          </RouterLink>
          <div class="citem__info">
            <RouterLink :to="`/product/${item.slug}`" class="citem__name">{{ item.name }}</RouterLink>
            <span v-if="item.packaging" class="muted">{{ item.packaging }}</span>
            <span class="citem__unit">
              {{ formatPrice(cart.priceOf(item)) }}<template v-if="item.price != null"> / {{ item.unit }}</template>
              <s v-if="cart.priceOf(item) < item.price" class="muted">{{ formatPrice(item.price) }}</s>
              <span v-if="cart.priceOf(item) < item.price" class="badge badge--yellow">опт</span>
            </span>
          </div>
          <div class="citem__qty">
            <QtyInput :model-value="item.quantity" :max="cart.maxQty(item)" small @update:model-value="(q) => cart.setQuantity(item.id, q)" />
            <small v-if="item.price != null && item.quantity >= item.stock" class="muted">на складі {{ item.stock }}</small>
          </div>
          <strong class="citem__sum">
            {{ item.price == null ? '—' : formatPrice(cart.priceOf(item) * item.quantity) }}
          </strong>
          <button class="citem__remove" title="Видалити" aria-label="Видалити" @click="cart.remove(item.id)"><AppIcon name="trash" :size="18" /></button>
        </div>
        <div class="cart__clear">
          <button class="btn btn--ghost btn--sm" @click="cart.clear()">Очистити кошик</button>
        </div>
      </div>

      <aside class="summary card card--pad">
        <h3>Разом</h3>
        <div class="summary__row">
          <span>Товарів</span>
          <span>{{ cart.count }}</span>
        </div>
        <div v-if="cart.savings > 0" class="summary__row summary__save">
          <span>Оптова знижка</span>
          <span>−{{ formatPrice(cart.savings) }}</span>
        </div>
        <div class="summary__row summary__total">
          <span>До сплати</span>
          <strong>{{ formatPrice(cart.total) }}</strong>
        </div>
        <p v-if="cart.hasPriceOnRequest" class="alert alert--warn">
          У кошику є товари з ціною за запитом — менеджер уточнить вартість після оформлення.
        </p>
        <p class="muted summary__note">Вартість доставки розраховується окремо.</p>
        <RouterLink to="/checkout" class="btn btn--lg btn--block">Оформити замовлення</RouterLink>
        <RouterLink to="/catalog" class="btn btn--ghost btn--block">Продовжити покупки</RouterLink>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cart {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
.cart__items { padding: 8px 20px; }
.citem {
  display: grid;
  grid-template-columns: 80px 1fr auto 120px 32px;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--c-border);
}
.citem__img {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--c-border);
}
.citem__info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.citem__name { font-weight: 600; font-size: 15px; color: var(--c-text); }
.citem__name:hover { color: var(--c-primary); }
.citem__unit { color: var(--c-primary-dark); font-weight: 500; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.summary__save { color: #8a5f0d; }
.cart-notice { margin-bottom: 16px; }
.citem__qty { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.citem__qty small { font-size: 11px; }
.citem__sum { text-align: right; font-family: var(--font-head); }
.citem__remove {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-muted);
  cursor: pointer;
}
.citem__remove:hover { background: var(--c-danger-light); color: var(--c-danger); }
.cart__clear { padding: 12px 0; text-align: right; }

.summary { position: sticky; top: calc(var(--header-h) + 20px); display: flex; flex-direction: column; gap: 12px; }
.summary h3 { margin: 0; }
.summary__row { display: flex; justify-content: space-between; }
.summary__total { font-size: 18px; padding-top: 12px; border-top: 1px solid var(--c-border); }
.summary__total strong { font: 800 24px var(--font-head); color: var(--c-primary-dark); }
.summary__note { font-size: 13px; margin: 0; }
.summary .alert { margin: 0; }

@media (max-width: 900px) {
  .cart { grid-template-columns: 1fr; }
  .summary { position: static; }
}
@media (max-width: 600px) {
  .citem {
    grid-template-columns: 64px 1fr 32px;
    grid-template-areas: 'img info rm' 'img qty sum';
    gap: 8px 12px;
  }
  .citem__img { grid-area: img; width: 64px; height: 64px; }
  .citem__info { grid-area: info; }
  .citem__remove { grid-area: rm; }
  .citem__qty { grid-area: qty; align-items: flex-start; }
  .citem__sum { grid-column: 2 / 4; text-align: right; }
}
</style>
