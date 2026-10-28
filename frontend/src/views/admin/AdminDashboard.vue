<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { onMounted, reactive, ref } from 'vue';
import { api } from '@/api';
import { ORDER_STATUSES } from '@/config';
import { formatDate, formatPrice } from '@/utils/format';
import { useToastStore } from '@/stores/toast';

const toast = useToastStore();
const stats = ref(null);
const error = ref('');

const pwd = reactive({ current_password: '', new_password: '' });
const pwdErrors = ref({});
const pwdSaving = ref(false);

onMounted(async () => {
  try {
    stats.value = await api.get('/admin/stats');
  } catch (err) {
    error.value = err.message;
  }
});

async function changePassword() {
  pwdErrors.value = {};
  pwdSaving.value = true;
  try {
    await api.post('/auth/change-password', pwd);
    toast.success('Пароль змінено');
    pwd.current_password = '';
    pwd.new_password = '';
  } catch (err) {
    pwdErrors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    pwdSaving.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-else-if="!stats" class="spinner" />
    <template v-else>
      <div class="tiles">
        <RouterLink to="/admin/orders?status=new" class="tile card">
          <span>Нові замовлення</span>
          <strong>{{ stats.orders_new }}</strong>
          <small>усього: {{ stats.orders_total }}</small>
        </RouterLink>
        <RouterLink to="/admin/requests" class="tile card">
          <span>Нові заявки</span>
          <strong>{{ stats.requests_new }}</strong>
          <small>консультації, протруювання</small>
        </RouterLink>
        <RouterLink to="/admin/products" class="tile card">
          <span>Товари на сайті</span>
          <strong>{{ stats.products_active }}</strong>
          <small>усього: {{ stats.products }}, немає в наявності: {{ stats.products_out_of_stock }}</small>
        </RouterLink>
        <div class="tile card">
          <span>Сума виконаних замовлень</span>
          <strong>{{ formatPrice(stats.revenue_completed) }}</strong>
        </div>
      </div>

      <div v-if="stats.products_without_image" class="alert alert--warn photos-hint">
        <AppIcon name="image" :size="18" /> {{ stats.products_without_image }} товарів ще без фото. Відкрийте товар → вставте посилання
        на фото в поле «Посилання на головне фото».
      </div>

      <div class="grid2">
        <section class="card">
          <h3 class="card-title">Останні замовлення</h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>№</th><th>Клієнт</th><th>Сума</th><th>Статус</th><th>Дата</th></tr>
              </thead>
              <tbody>
                <tr v-for="o in stats.latest_orders" :key="o.id">
                  <td><RouterLink :to="`/admin/orders?open=${o.id}`">{{ o.number }}</RouterLink></td>
                  <td>{{ o.customer_name }}<br /><small class="muted">{{ o.phone }}</small></td>
                  <td>{{ formatPrice(o.total) }}</td>
                  <td><span class="badge" :class="`badge--${ORDER_STATUSES[o.status]?.color}`">{{ ORDER_STATUSES[o.status]?.label }}</span></td>
                  <td class="muted">{{ formatDate(o.created_at) }}</td>
                </tr>
                <tr v-if="!stats.latest_orders.length"><td colspan="5" class="muted">Замовлень ще немає</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card card--pad">
          <h3>Змінити пароль</h3>
          <form class="pwd" @submit.prevent="changePassword">
            <div class="field">
              <label>Поточний пароль</label>
              <input v-model="pwd.current_password" class="input" type="password" autocomplete="current-password" />
              <span v-if="pwdErrors.current_password" class="error">{{ pwdErrors.current_password }}</span>
            </div>
            <div class="field">
              <label>Новий пароль (мін. 8 символів)</label>
              <input v-model="pwd.new_password" class="input" type="password" autocomplete="new-password" />
              <span v-if="pwdErrors.new_password" class="error">{{ pwdErrors.new_password }}</span>
            </div>
            <button class="btn" :disabled="pwdSaving">Зберегти</button>
          </form>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.tile {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--c-text);
}
.tile span { color: var(--c-muted); font-size: 14px; }
.tile strong { font: 800 30px var(--font-head); color: var(--c-primary-dark); }
.tile small { color: var(--c-muted); }
a.tile:hover { border-color: var(--c-primary); color: var(--c-text); }
.photos-hint { margin-bottom: 20px; }
.grid2 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  align-items: start;
}
.card-title { padding: 20px 20px 0; }
.pwd { display: flex; flex-direction: column; gap: 14px; }
@media (max-width: 1000px) {
  .grid2 { grid-template-columns: 1fr; }
}
</style>
