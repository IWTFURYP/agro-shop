<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { ORDER_STATUSES, DELIVERY_METHODS, PAYMENT_METHODS } from '@/config';
import { formatDate, formatPrice } from '@/utils/format';
import { useReorder } from '@/composables/useReorder';
import ProductImage from '@/components/ProductImage.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const { reorder } = useReorder();
const order = ref(null);
const error = ref('');
const busy = ref(false);

// Етапи для шкали статусу замовлення
const STEPS = ['new', 'processing', 'shipped', 'completed'];

onMounted(async () => {
  try {
    order.value = await api.get(`/account/orders/${route.params.id}`);
  } catch (err) {
    error.value = err.message;
  }
});

async function doReorder() {
  busy.value = true;
  try {
    await reorder(order.value.id);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span><RouterLink to="/account">Кабінет</RouterLink></span>
      <span>Замовлення</span>
    </nav>
    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-else-if="!order" class="spinner" />
    <template v-else>
      <div class="head">
        <div>
          <h1>Замовлення № {{ order.number }}</h1>
          <p class="muted">від {{ formatDate(order.created_at) }}</p>
        </div>
        <button class="btn" type="button" :disabled="busy" @click="doReorder">
          <AppIcon name="refresh" :size="18" /> Повторити замовлення
        </button>
      </div>

      <div v-if="order.status === 'cancelled'" class="alert alert--error">Замовлення скасовано</div>
      <ol v-else class="steps">
        <li
          v-for="(s, i) in STEPS"
          :key="s"
          :class="{ done: STEPS.indexOf(order.status) >= i, current: order.status === s }"
        >
          <span class="steps__dot"><AppIcon v-if="STEPS.indexOf(order.status) >= i" name="check" :size="14" :stroke-width="3" /></span>
          {{ ORDER_STATUSES[s].label }}
        </li>
      </ol>

      <div class="grid">
        <section class="card">
          <div v-for="i in order.items" :key="i.id" class="line">
            <div class="line__img"><ProductImage :src="i.image_url" :alt="i.product_name" /></div>
            <div class="line__info">
              <RouterLink v-if="i.slug && i.is_active" :to="`/product/${i.slug}`">{{ i.product_name }}</RouterLink>
              <span v-else>{{ i.product_name }}</span>
              <small class="muted">{{ i.packaging }} · {{ formatPrice(i.price) }}<template v-if="i.price != null"> × {{ i.quantity }} {{ i.unit }}</template></small>
            </div>
            <strong>{{ i.price == null ? 'за запитом' : formatPrice(i.price * i.quantity) }}</strong>
          </div>
          <div class="total">Разом: <strong>{{ formatPrice(order.total) }}</strong></div>
        </section>
        <aside class="card card--pad details">
          <h3>Доставка й оплата</h3>
          <dl>
            <dt>Отримувач</dt><dd>{{ order.customer_name }}, {{ order.phone }}</dd>
            <template v-if="order.company"><dt>Компанія</dt><dd>{{ order.company }}</dd></template>
            <dt>Доставка</dt>
            <dd>{{ DELIVERY_METHODS[order.delivery_method] }}<br />{{ [order.city, order.delivery_address].filter(Boolean).join(', ') }}</dd>
            <dt>Оплата</dt><dd>{{ PAYMENT_METHODS[order.payment_method] }}</dd>
            <template v-if="order.comment"><dt>Коментар</dt><dd>{{ order.comment }}</dd></template>
          </dl>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.head h1 { margin-bottom: 4px; }
.steps { list-style: none; display: flex; gap: 8px; padding: 0; margin: 24px 0; flex-wrap: wrap; }
.steps li { flex: 1; min-width: 120px; display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 12px; background: #f0f2ec; color: var(--c-muted); font-weight: 600; font-size: 14px; }
.steps li.done { background: var(--c-primary-light); color: var(--c-primary-dark); }
.steps li.current { background: var(--c-primary); color: #fff; }
.steps__dot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: var(--c-primary); flex-shrink: 0; }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
.line { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--c-border); }
.line__img { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; background: #f6f7f3; flex-shrink: 0; }
.line__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.line__info a, .line__info span { font-weight: 600; color: var(--c-text); }
.total { padding: 16px 20px; text-align: right; font-size: 18px; }
.details dl { display: grid; grid-template-columns: 1fr; gap: 2px; margin: 0; font-size: 14px; }
.details dt { color: var(--c-muted); margin-top: 10px; font-size: 13px; }
.details dd { margin: 0; }
@media (max-width: 900px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
