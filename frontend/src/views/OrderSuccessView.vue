<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { SHOP } from '@/config';
import { formatPrice } from '@/utils/format';

let order = null;
try {
  order = JSON.parse(sessionStorage.getItem('agro_last_order') || 'null');
} catch {
  order = null;
}
</script>

<template>
  <div class="container">
    <div class="success card card--pad">
      <div class="success__icon"><AppIcon name="check" :size="36" :stroke-width="2.5" /></div>
      <h1>Дякуємо за замовлення!</h1>
      <template v-if="order">
        <p class="success__number">Номер замовлення: <strong>№ {{ order.number }}</strong></p>
        <ul class="success__items">
          <li v-for="(item, i) in order.items" :key="i">
            <span>{{ item.name }} × {{ item.quantity }}</span>
            <span>{{ item.price == null ? 'ціна за запитом' : formatPrice(item.price * item.quantity) }}</span>
          </li>
        </ul>
        <p class="success__total">Разом: <strong>{{ formatPrice(order.total) }}</strong></p>
        <p v-if="order.has_price_on_request" class="muted">Вартість товарів «за запитом» уточнить менеджер.</p>
      </template>
      <p>
        Наш менеджер зв’яжеться з вами найближчим часом для підтвердження замовлення.<br />
        Маєте питання? Телефонуйте: <a :href="SHOP.phoneHref">{{ SHOP.phone }}</a>
      </p>
      <div class="success__actions">
        <RouterLink to="/catalog" class="btn">Продовжити покупки</RouterLink>
        <RouterLink to="/" class="btn btn--outline">На головну</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success {
  max-width: 640px;
  margin: 48px auto;
  text-align: center;
}
.success__icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--c-primary-light);
  color: var(--c-primary);
}
.success__number { font-size: 18px; }
.success__items {
  list-style: none;
  padding: 16px;
  margin: 16px 0;
  background: var(--c-primary-soft);
  border-radius: var(--radius-sm);
  text-align: left;
}
.success__items li { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 14px; }
.success__total { font-size: 18px; }
.success__actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 24px; }
</style>
