<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { SHOP, DELIVERY_METHODS, PAYMENT_METHODS } from '@/config';
import { formatDate } from '@/utils/format';
import { amountInWords } from '@/utils/amountInWords';

// Друкована форма замовлення: видаткова накладна або список для комплектування на складі
const route = useRoute();
const order = ref(null);
const error = ref('');
const type = computed(() => (route.query.type === 'picking' ? 'picking' : 'invoice'));

const money = (v) => (v == null ? '—' : v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pricedItems = computed(() => order.value?.items.filter((i) => i.price != null) || []);
const totalQty = computed(() => order.value?.items.reduce((s, i) => s + i.quantity, 0) || 0);
const date = computed(() => (order.value ? formatDate(order.value.created_at).split(',')[0] : ''));

const printNow = () => window.print();

onMounted(async () => {
  try {
    order.value = await api.get(`/admin/orders/${route.params.id}`);
    document.title = `${type.value === 'invoice' ? 'Накладна' : 'Комплектування'} № ${order.value.number}`;
    // Відкриваємо діалог друку, коли сторінка відмалювалась
    setTimeout(() => window.print(), 400);
  } catch (err) {
    error.value = err.message;
  }
});
</script>

<template>
  <div class="print-page">
    <div class="toolbar no-print">
      <RouterLink :to="{ name: 'admin-orders', query: { open: route.params.id } }" class="btn btn--ghost btn--sm">← До замовлення</RouterLink>
      <RouterLink :to="{ query: { type: 'invoice' } }" class="btn btn--sm" :class="type === 'invoice' ? '' : 'btn--outline'">Накладна</RouterLink>
      <RouterLink :to="{ query: { type: 'picking' } }" class="btn btn--sm" :class="type === 'picking' ? '' : 'btn--outline'">Список для складу</RouterLink>
      <button class="btn btn--sm" type="button" @click="printNow">Друкувати</button>
    </div>

    <p v-if="error" class="alert alert--error">{{ error }}</p>
    <p v-else-if="!order">Завантаження…</p>

    <!-- ВИДАТКОВА НАКЛАДНА -->
    <article v-else-if="type === 'invoice'" class="doc">
      <h1>Видаткова накладна № {{ order.number }}</h1>
      <p class="center">від {{ date }} р.</p>

      <table class="parties">
        <tr>
          <th>Постачальник:</th>
          <td>
            <strong>{{ SHOP.legal.name }}</strong>, код ЄДРПОУ {{ SHOP.legal.edrpou }}<br />
            р/р {{ SHOP.legal.iban }} в {{ SHOP.legal.bank }}<br />
            {{ SHOP.address }}, тел. {{ SHOP.phone }}<br />
            {{ SHOP.legal.taxNote }}
          </td>
        </tr>
        <tr>
          <th>Покупець:</th>
          <td>
            <strong>{{ order.company || order.customer_name }}</strong>
            <template v-if="order.edrpou">, код {{ order.edrpou }}</template><br />
            <template v-if="order.company">{{ order.customer_name }}, </template>тел. {{ order.phone }}
            <template v-if="order.city"><br />{{ [order.region && `${order.region} обл.`, order.city, order.delivery_address].filter(Boolean).join(', ') }}</template>
          </td>
        </tr>
        <tr>
          <th>Умови:</th>
          <td>{{ PAYMENT_METHODS[order.payment_method] }}; {{ DELIVERY_METHODS[order.delivery_method] }}</td>
        </tr>
      </table>

      <table class="items">
        <thead>
          <tr><th>№</th><th>Артикул</th><th>Товар</th><th>Од.</th><th>К-сть</th><th>Ціна, грн</th><th>Сума, грн</th></tr>
        </thead>
        <tbody>
          <tr v-for="(i, n) in order.items" :key="i.id">
            <td class="num">{{ n + 1 }}</td>
            <td>{{ i.sku }}</td>
            <td>{{ i.product_name }}<template v-if="i.packaging"> ({{ i.packaging }})</template></td>
            <td>{{ i.unit }}</td>
            <td class="num">{{ i.quantity }}</td>
            <td class="num">{{ money(i.price) }}</td>
            <td class="num">{{ i.price == null ? 'за домовленістю' : money(i.price * i.quantity) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="6" class="num">Разом:</td><td class="num"><strong>{{ money(order.total) }}</strong></td></tr>
        </tfoot>
      </table>

      <p>
        Всього найменувань {{ order.items.length }}, на суму {{ money(order.total) }} грн.<br />
        <strong>{{ amountInWords(order.total) }}</strong>
        <template v-if="pricedItems.length < order.items.length"><br /><em>Вартість позицій «за домовленістю» узгоджується окремо.</em></template>
      </p>

      <div class="signs">
        <div>Від постачальника<span class="line" />підпис</div>
        <div>Отримав(ла)<span class="line" />підпис</div>
      </div>
    </article>

    <!-- СПИСОК ДЛЯ КОМПЛЕКТУВАННЯ НА СКЛАДІ -->
    <article v-else class="doc">
      <h1>Комплектування замовлення № {{ order.number }}</h1>
      <p class="center">від {{ date }} р. · {{ DELIVERY_METHODS[order.delivery_method] }}</p>

      <table class="parties">
        <tr><th>Клієнт:</th><td><strong>{{ order.customer_name }}</strong>, тел. {{ order.phone }}<template v-if="order.company"> · {{ order.company }}</template></td></tr>
        <tr v-if="order.delivery_method !== 'pickup'">
          <th>Адреса:</th>
          <td>{{ [order.region && `${order.region} обл.`, order.city, order.delivery_address].filter(Boolean).join(', ') }}</td>
        </tr>
        <tr v-if="order.comment"><th>Коментар:</th><td><strong>{{ order.comment }}</strong></td></tr>
      </table>

      <table class="items picking">
        <thead>
          <tr><th class="check">✓</th><th>Артикул</th><th>Товар</th><th>Упаковка</th><th>К-сть</th><th>Од.</th></tr>
        </thead>
        <tbody>
          <tr v-for="i in order.items" :key="i.id">
            <td class="check"><span class="box" /></td>
            <td><strong>{{ i.sku }}</strong></td>
            <td>{{ i.product_name }}</td>
            <td>{{ i.packaging }}</td>
            <td class="num big">{{ i.quantity }}</td>
            <td>{{ i.unit }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="4" class="num">Усього одиниць:</td><td class="num big">{{ totalQty }}</td><td /></tr>
        </tfoot>
      </table>

      <div class="signs">
        <div>Скомплектував<span class="line" />дата, підпис</div>
        <div>Перевірив<span class="line" />дата, підпис</div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.print-page { background: #e9ebe6; min-height: 100vh; padding: 24px 16px; }
.print-page { overflow-x: auto; }
.toolbar { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.doc {
  max-width: 210mm;
  margin: 0 auto;
  padding: 18mm 16mm;
  background: #fff;
  color: #000;
  font: 13px/1.45 'Times New Roman', Times, serif;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}
.doc h1 { font: 700 18px 'Times New Roman', serif; text-align: center; margin: 0; color: #000; letter-spacing: 0; }
.center { text-align: center; margin: 4px 0 18px; }
.parties { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.parties th { width: 110px; text-align: left; vertical-align: top; padding: 4px 8px 4px 0; font-weight: 400; color: #333; }
.parties td { padding: 4px 0; }
.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
.items th, .items td { border: 1px solid #000; padding: 5px 6px; text-align: left; }
.items th { background: #f0f0f0; font-weight: 700; text-align: center; }
.items .num { text-align: right; white-space: nowrap; }
.items tfoot td { border: 0; padding-top: 6px; }
.picking .big { font-size: 16px; font-weight: 700; }
.check { width: 34px; text-align: center !important; }
.box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #000; }
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; font-size: 12px; }
.signs div { display: flex; flex-direction: column; }
.line { display: block; border-bottom: 1px solid #000; height: 28px; margin-bottom: 2px; }

@media screen and (max-width: 760px) {
  .print-page { padding: 12px 8px; }
  .doc { padding: 10mm 6mm; }
}
@media print {
  .no-print { display: none !important; }
  .print-page { background: #fff; padding: 0; }
  .doc { box-shadow: none; padding: 0; max-width: none; }
}
</style>

<style>
@page { size: A4; margin: 15mm 14mm; }
</style>
