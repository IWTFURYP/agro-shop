<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { ORDER_STATUSES, DELIVERY_METHODS, PAYMENT_METHODS } from '@/config';
import { formatDate, formatPrice } from '@/utils/format';
import { useToastStore } from '@/stores/toast';
import PaginationBar from '@/components/PaginationBar.vue';

const route = useRoute();
const toast = useToastStore();
const result = ref({ items: [], total: 0, page: 1, pages: 1 });
const loading = ref(true);
const filters = ref({ status: route.query.status || '', search: '', page: 1 });
const opened = ref(null);

let searchTimer;

async function load() {
  loading.value = true;
  try {
    result.value = await api.get('/admin/orders', filters.value);
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

watch(() => [filters.value.status, filters.value.page], load);
watch(
  () => filters.value.search,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.value.page = 1;
      load();
    }, 300);
  },
);

onMounted(() => {
  load();
  if (route.query.open) openOrder(route.query.open);
});

async function openOrder(id) {
  try {
    opened.value = await api.get(`/admin/orders/${id}`);
  } catch (err) {
    toast.error(err.message);
  }
}

async function setStatus(order, status) {
  try {
    const updated = await api.patch(`/admin/orders/${order.id}`, { status });
    order.status = updated.status;
    const row = result.value.items.find((o) => o.id === order.id);
    if (row) row.status = updated.status;
    toast.success(`Статус: ${ORDER_STATUSES[status].label}`);
  } catch (err) {
    toast.error(err.message);
  }
}

async function remove(order) {
  if (!confirm(`Видалити замовлення № ${order.number}?`)) return;
  try {
    await api.delete(`/admin/orders/${order.id}`);
    opened.value = null;
    toast.success('Замовлення видалено');
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <input v-model="filters.search" class="input" type="search" placeholder="Пошук: №, ім’я, телефон, компанія" />
      <select v-model="filters.status" class="select" @change="filters.page = 1">
        <option value="">Усі статуси</option>
        <option v-for="(s, key) in ORDER_STATUSES" :key="key" :value="key">{{ s.label }}</option>
      </select>
    </div>

    <div class="card">
      <div v-if="loading" class="spinner" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>№</th><th>Дата</th><th>Клієнт</th><th>Доставка</th><th>Позицій</th><th>Сума</th><th>Статус</th></tr>
          </thead>
          <tbody>
            <tr v-for="o in result.items" :key="o.id" class="row" @click="openOrder(o.id)">
              <td><strong>{{ o.number }}</strong></td>
              <td class="muted">{{ formatDate(o.created_at) }}</td>
              <td>
                {{ o.customer_name }}<br />
                <small class="muted">{{ o.phone }}<template v-if="o.company"> · {{ o.company }}</template></small>
              </td>
              <td class="muted">{{ DELIVERY_METHODS[o.delivery_method] }}<br /><small>{{ o.city }}</small></td>
              <td>{{ o.items_count }}</td>
              <td class="nowrap">
                {{ formatPrice(o.total) }}
                <small v-if="o.has_price_on_request" class="muted" title="Є товари з ціною за запитом">+ ?</small>
              </td>
              <td><span class="badge" :class="`badge--${ORDER_STATUSES[o.status]?.color}`">{{ ORDER_STATUSES[o.status]?.label }}</span></td>
            </tr>
            <tr v-if="!result.items.length"><td colspan="7" class="muted">Замовлень не знайдено</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <PaginationBar :page="result.page" :pages="result.pages" @change="(p) => (filters.page = p)" />

    <div v-if="opened" class="admin-modal-backdrop" @click.self="opened = null">
      <div class="admin-modal card order">
        <div class="order__head">
          <h3>Замовлення № {{ opened.number }}</h3>
          <button class="btn btn--ghost btn--icon" aria-label="Закрити" @click="opened = null"><AppIcon name="x" /></button>
        </div>
        <p class="muted">{{ formatDate(opened.created_at) }}</p>

        <div class="statuses">
          <button
            v-for="(s, key) in ORDER_STATUSES"
            :key="key"
            class="btn btn--sm"
            :class="opened.status === key ? '' : 'btn--outline'"
            @click="setStatus(opened, key)"
          >
            {{ s.label }}
          </button>
        </div>

        <dl class="details">
          <dt>Клієнт</dt><dd>{{ opened.customer_name }}</dd>
          <dt>Телефон</dt><dd><a :href="`tel:${opened.phone}`">{{ opened.phone }}</a></dd>
          <template v-if="opened.email"><dt>Email</dt><dd><a :href="`mailto:${opened.email}`">{{ opened.email }}</a></dd></template>
          <template v-if="opened.company"><dt>Компанія</dt><dd>{{ opened.company }} <span v-if="opened.edrpou" class="muted">(ЄДРПОУ {{ opened.edrpou }})</span></dd></template>
          <dt>Доставка</dt>
          <dd>{{ DELIVERY_METHODS[opened.delivery_method] }}<br />{{ [opened.region && `${opened.region} обл.`, opened.city, opened.delivery_address].filter(Boolean).join(', ') }}</dd>
          <dt>Оплата</dt><dd>{{ PAYMENT_METHODS[opened.payment_method] }}</dd>
          <template v-if="opened.comment"><dt>Коментар</dt><dd class="comment">{{ opened.comment }}</dd></template>
        </dl>

        <table class="table items">
          <thead><tr><th>Товар</th><th>Ціна</th><th>К-сть</th><th>Сума</th></tr></thead>
          <tbody>
            <tr v-for="i in opened.items" :key="i.id">
              <td>
                <a v-if="i.product_slug" :href="`/product/${i.product_slug}`" target="_blank">{{ i.product_name }}</a>
                <span v-else>{{ i.product_name }}</span>
                <br /><small class="muted">{{ i.sku }} {{ i.packaging }}</small>
              </td>
              <td class="nowrap">{{ formatPrice(i.price) }}</td>
              <td>{{ i.quantity }} {{ i.unit }}</td>
              <td class="nowrap">{{ i.price == null ? '—' : formatPrice(i.price * i.quantity) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="order__total">Разом: <strong>{{ formatPrice(opened.total) }}</strong></p>

        <div class="admin-modal__actions">
          <button class="btn btn--ghost btn--sm" @click="remove(opened)"><AppIcon name="trash" :size="16" /> Видалити</button>
          <button class="btn" @click="opened = null">Закрити</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row { cursor: pointer; }
.nowrap { white-space: nowrap; }
.order { max-width: 760px; }
.order__head { display: flex; justify-content: space-between; align-items: center; }
.order__head h3 { margin: 0; }
.statuses { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 20px; }
.details {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 16px;
  margin: 0 0 20px;
  font-size: 14px;
}
.details dt { color: var(--c-muted); }
.details dd { margin: 0; }
.comment { white-space: pre-line; }
.items { margin-top: 8px; }
.order__total { text-align: right; font-size: 18px; margin: 16px 0 0; }
</style>
