<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '@/api';
import { ORDER_STATUSES } from '@/config';
import { formatDate, formatPrice, pluralize } from '@/utils/format';
import { useToastStore } from '@/stores/toast';
import ColumnChart from '@/components/admin/ColumnChart.vue';
import BarList from '@/components/admin/BarList.vue';
import AppIcon from '@/components/AppIcon.vue';

const toast = useToastStore();
const PERIODS = [
  { days: 7, label: '7 днів' },
  { days: 30, label: '30 днів' },
  { days: 90, label: '90 днів' },
  { days: 365, label: 'Рік' },
];
const days = ref(30);
const stats = ref(null);
const loading = ref(false);
const metric = ref('revenue');

async function load() {
  loading.value = true;
  try {
    stats.value = await api.get('/admin/stats/sales', { days: days.value });
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(days, load);

const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
const FULL_MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

const series = computed(() =>
  (stats.value?.series || []).map((s) => {
    const value = metric.value === 'revenue' ? s.revenue : s.orders;
    if (stats.value.granularity === 'month') {
      const [y, m] = s.period.split('-').map(Number);
      return { label: MONTHS[m - 1], hint: `${FULL_MONTHS[m - 1]} ${y}`, value };
    }
    const [, m, d] = s.period.split('-').map(Number);
    return { label: `${d}.${String(m).padStart(2, '0')}`, hint: `${d} ${MONTHS[m - 1]}`, value };
  }),
);

const ordersWord = (n) => `${n} ${pluralize(n, 'замовлення', 'замовлення', 'замовлень')}`;
const formatMetric = (v) => (metric.value === 'revenue' ? formatPrice(v) : ordersWord(v));

// Зміна відносно попереднього такого самого періоду
function delta(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
const kpis = computed(() => {
  if (!stats.value) return [];
  const { totals, previous } = stats.value;
  return [
    { label: 'Виручка', value: formatPrice(totals.revenue), delta: delta(totals.revenue, previous.revenue) },
    { label: 'Замовлення', value: totals.orders, delta: delta(totals.orders, previous.orders) },
    { label: 'Середній чек', value: formatPrice(Math.round(totals.avg_check)), delta: delta(totals.avg_check, previous.orders ? previous.revenue / previous.orders : 0) },
  ];
});

const topProducts = computed(() =>
  (stats.value?.top_products || []).map((p) => ({
    label: p.name,
    value: p.revenue,
    sub: `${p.quantity} ${p.unit} · ${ordersWord(p.orders)}`,
  })),
);
const categories = computed(() => (stats.value?.by_category || []).map((c) => ({ label: c.name, value: c.revenue })));
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <div class="seg" role="group" aria-label="Період">
        <button v-for="p in PERIODS" :key="p.days" type="button" :class="{ active: days === p.days }" @click="days = p.days">{{ p.label }}</button>
      </div>
      <span class="muted">Скасовані замовлення не враховуються</span>
    </div>

    <div v-if="!stats" class="spinner" />
    <div v-else :class="{ loading }">
      <div class="kpis">
        <div v-for="k in kpis" :key="k.label" class="kpi card">
          <span class="kpi__label">{{ k.label }}</span>
          <strong class="kpi__value">{{ k.value }}</strong>
          <span v-if="k.delta != null" class="kpi__delta" :class="k.delta >= 0 ? 'up' : 'down'">
            <AppIcon :name="k.delta >= 0 ? 'trending-up' : 'trending-down'" :size="15" />
            {{ k.delta > 0 ? '+' : '' }}{{ k.delta }}% до попереднього періоду
          </span>
          <span v-else class="kpi__delta muted">немає даних для порівняння</span>
        </div>
      </div>

      <section class="card card--pad block">
        <div class="block__head">
          <h3>{{ metric === 'revenue' ? 'Виручка' : 'Кількість замовлень' }} {{ stats.granularity === 'month' ? 'по місяцях' : 'по днях' }}</h3>
          <div class="seg seg--sm" role="group" aria-label="Показник">
            <button type="button" :class="{ active: metric === 'revenue' }" @click="metric = 'revenue'">Виручка</button>
            <button type="button" :class="{ active: metric === 'orders' }" @click="metric = 'orders'">Замовлення</button>
          </div>
        </div>
        <ColumnChart :data="series" :format="formatMetric" :label="metric === 'revenue' ? 'Виручка за період' : 'Замовлення за період'" />
      </section>

      <div class="grid2">
        <section class="card card--pad block">
          <h3>Найпопулярніші товари</h3>
          <BarList v-if="topProducts.length" :items="topProducts" :format="formatPrice" />
          <p v-else class="muted">Продажів за період немає</p>
        </section>
        <section class="card card--pad block">
          <h3>Виручка за категоріями</h3>
          <BarList v-if="categories.length" :items="categories" :format="formatPrice" />
          <p v-else class="muted">Продажів за період немає</p>
          <h3 class="statuses-title">Статуси замовлень</h3>
          <div class="statuses">
            <span v-for="s in stats.statuses" :key="s.status" class="badge" :class="`badge--${ORDER_STATUSES[s.status]?.color}`">
              {{ ORDER_STATUSES[s.status]?.label }}: {{ s.n }}
            </span>
          </div>
        </section>
      </div>

      <section class="card block">
        <h3 class="card-title">Найактивніші клієнти</h3>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>#</th><th>Клієнт</th><th>Телефон</th><th>Замовлень</th><th>Сума</th><th>Останнє замовлення</th></tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in stats.top_customers" :key="c.phone">
                <td class="muted">{{ i + 1 }}</td>
                <td>
                  <strong>{{ c.name }}</strong>
                  <span v-if="c.customer_id" class="badge badge--green cab">кабінет</span>
                  <br v-if="c.company" /><small v-if="c.company" class="muted">{{ c.company }}</small>
                </td>
                <td><RouterLink :to="{ name: 'admin-orders', query: { search: c.phone } }">{{ c.phone }}</RouterLink></td>
                <td>{{ c.orders }}</td>
                <td class="nowrap"><strong>{{ formatPrice(c.revenue) }}</strong></td>
                <td class="muted">{{ formatDate(c.last_order).split(',')[0] }}</td>
              </tr>
              <tr v-if="!stats.top_customers.length"><td colspan="6" class="muted">Немає замовлень за період</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.loading { opacity: 0.6; transition: opacity 0.2s; }
.seg { display: inline-flex; padding: 3px; border-radius: 999px; background: #eceee8; }
.seg button {
  padding: 8px 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: 600 13px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
}
.seg button.active { background: #fff; color: var(--c-text); box-shadow: var(--shadow-xs); }
.seg--sm button { padding: 6px 12px; font-size: 12px; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.kpi { padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; }
.kpi__label { color: var(--c-muted); font-size: 14px; }
.kpi__value { font: 800 28px var(--font-head); letter-spacing: -0.02em; }
.kpi__delta { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; }
.kpi__delta.up { color: #2a6e35; }
.kpi__delta.down { color: #a3392e; }
.block { margin-bottom: 20px; }
.block h3 { margin-bottom: 16px; }
.block__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.block__head h3 { margin: 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.statuses-title { margin-top: 24px; }
.statuses { display: flex; flex-wrap: wrap; gap: 6px; }
.card-title { padding: 20px 20px 0; }
.cab { margin-left: 6px; font-size: 10px; }
.nowrap { white-space: nowrap; }
@media (max-width: 900px) {
  .kpis, .grid2 { grid-template-columns: 1fr; }
}
</style>
