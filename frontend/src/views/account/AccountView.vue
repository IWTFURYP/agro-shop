<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { ORDER_STATUSES, REGIONS, DELIVERY_METHODS } from '@/config';
import { formatDate, formatPrice } from '@/utils/format';
import { useCustomerStore } from '@/stores/customer';
import { useToastStore } from '@/stores/toast';
import { useReorder } from '@/composables/useReorder';
import AppIcon from '@/components/AppIcon.vue';

const customer = useCustomerStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();
const { reorder } = useReorder();

const tab = ref(['orders', 'profile', 'password'].includes(route.query.tab) ? route.query.tab : 'orders');
const orders = ref([]);
const loadingOrders = ref(true);
const reordering = ref(null);

const profile = reactive({ name: '', phone: '', company: '', edrpou: '', region: '', city: '', delivery_address: '' });
const profileErrors = ref({});
const savingProfile = ref(false);

const pwd = reactive({ current_password: '', new_password: '' });
const pwdErrors = ref({});

watch(tab, (t) => router.replace({ query: t === 'orders' ? {} : { tab: t } }));

onMounted(async () => {
  try {
    const [p, list] = await Promise.all([customer.fetchProfile(), api.get('/account/orders')]);
    Object.assign(profile, p);
    orders.value = list;
  } catch (err) {
    toast.error(err.message);
  } finally {
    loadingOrders.value = false;
  }
});

async function doReorder(order) {
  reordering.value = order.id;
  try {
    await reorder(order.id);
  } catch (err) {
    toast.error(err.message);
  } finally {
    reordering.value = null;
  }
}

async function saveProfile() {
  profileErrors.value = {};
  savingProfile.value = true;
  try {
    await customer.updateProfile(profile);
    toast.success('Профіль збережено');
  } catch (err) {
    profileErrors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  pwdErrors.value = {};
  try {
    await api.post('/account/change-password', pwd);
    toast.success('Пароль змінено');
    Object.assign(pwd, { current_password: '', new_password: '' });
  } catch (err) {
    pwdErrors.value = err.fields || {};
    toast.error(err.message);
  }
}

function logout() {
  customer.logout();
  router.push('/');
}
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span>Особистий кабінет</span>
    </nav>

    <div class="head">
      <div>
        <h1>Вітаємо, {{ customer.profile?.name || '…' }}</h1>
        <p class="muted">{{ customer.profile?.email }}</p>
      </div>
      <button class="btn btn--ghost" type="button" @click="logout"><AppIcon name="log-out" :size="18" /> Вийти</button>
    </div>

    <div class="tabs" role="tablist">
      <button :class="{ active: tab === 'orders' }" role="tab" @click="tab = 'orders'">
        <AppIcon name="receipt" :size="16" /> Мої замовлення <small>{{ orders.length }}</small>
      </button>
      <button :class="{ active: tab === 'profile' }" role="tab" @click="tab = 'profile'"><AppIcon name="user" :size="16" /> Профіль</button>
      <button :class="{ active: tab === 'password' }" role="tab" @click="tab = 'password'"><AppIcon name="shield-check" :size="16" /> Пароль</button>
    </div>

    <section v-if="tab === 'orders'">
      <div v-if="loadingOrders" class="spinner" />
      <div v-else-if="!orders.length" class="empty card">
        <div class="empty__icon"><AppIcon name="receipt" :size="30" /></div>
        <h3>Замовлень ще немає</h3>
        <p>Замовлення, оформлені після входу в кабінет, з'являться тут.</p>
        <RouterLink to="/catalog" class="btn">До каталогу</RouterLink>
      </div>
      <div v-else class="orders">
        <article v-for="o in orders" :key="o.id" class="order card">
          <div class="order__main">
            <div class="order__top">
              <RouterLink :to="`/account/orders/${o.id}`" class="order__number">№ {{ o.number }}</RouterLink>
              <span class="badge" :class="`badge--${ORDER_STATUSES[o.status]?.color}`">{{ ORDER_STATUSES[o.status]?.label }}</span>
            </div>
            <p class="order__items">{{ o.items_preview }}</p>
            <p class="muted order__meta">
              {{ formatDate(o.created_at) }} · {{ o.items_count }} поз. · {{ DELIVERY_METHODS[o.delivery_method] }}
            </p>
          </div>
          <div class="order__side">
            <strong>{{ formatPrice(o.total) }}<template v-if="o.has_price_on_request"> +</template></strong>
            <div class="order__actions">
              <RouterLink :to="`/account/orders/${o.id}`" class="btn btn--ghost btn--sm">Деталі</RouterLink>
              <button class="btn btn--outline btn--sm" type="button" :disabled="reordering === o.id" @click="doReorder(o)">
                <AppIcon name="refresh" :size="15" /> Повторити
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <form v-else-if="tab === 'profile'" class="card card--pad panel" novalidate @submit.prevent="saveProfile">
      <p class="muted">Ці дані автоматично підставлятимуться під час оформлення замовлення.</p>
      <div class="form-grid">
        <div class="field">
          <label>Ім'я та прізвище</label>
          <input v-model="profile.name" class="input" :class="{ invalid: profileErrors.name }" />
          <span v-if="profileErrors.name" class="error">{{ profileErrors.name }}</span>
        </div>
        <div class="field">
          <label>Телефон</label>
          <input v-model="profile.phone" class="input" :class="{ invalid: profileErrors.phone }" type="tel" />
          <span v-if="profileErrors.phone" class="error">{{ profileErrors.phone }}</span>
        </div>
        <div class="field">
          <label>Підприємство / ФГ</label>
          <input v-model="profile.company" class="input" />
        </div>
        <div class="field">
          <label>ЄДРПОУ / ІПН</label>
          <input v-model="profile.edrpou" class="input" :class="{ invalid: profileErrors.edrpou }" inputmode="numeric" />
          <span v-if="profileErrors.edrpou" class="error">{{ profileErrors.edrpou }}</span>
        </div>
        <div class="field">
          <label>Область</label>
          <select v-model="profile.region" class="select">
            <option value="">— Оберіть —</option>
            <option v-for="r in REGIONS" :key="r">{{ r }}</option>
          </select>
        </div>
        <div class="field">
          <label>Населений пункт</label>
          <input v-model="profile.city" class="input" />
        </div>
        <div class="field full">
          <label>Адреса або відділення Нової Пошти</label>
          <input v-model="profile.delivery_address" class="input" />
        </div>
      </div>
      <button class="btn" :disabled="savingProfile">Зберегти</button>
    </form>

    <form v-else class="card card--pad panel panel--narrow" novalidate @submit.prevent="changePassword">
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
      <button class="btn">Змінити пароль</button>
    </form>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.head h1 { margin-bottom: 4px; }
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 24px 0;
  border-radius: 999px;
  background: #f0f2ec;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
}
.tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: 600 14px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
  white-space: nowrap;
}
.tabs button small { opacity: 0.6; }
@media (max-width: 560px) {
  .tabs { width: 100%; }
  .tabs button { flex: 1; justify-content: center; padding: 10px 8px; font-size: 13px; }
  .tabs button .icon { display: none; }
}
.tabs button.active { background: #fff; color: var(--c-text); box-shadow: var(--shadow-xs); }
.orders { display: flex; flex-direction: column; gap: 12px; }
.order { display: flex; gap: 20px; justify-content: space-between; align-items: center; padding: 18px 22px; }
.order__main { min-width: 0; }
.order__top { display: flex; align-items: center; gap: 10px; }
.order__number { font: 700 17px var(--font-head); color: var(--c-text); }
.order__items { margin: 6px 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 640px; }
.order__meta { margin: 0; font-size: 13px; }
.order__side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.order__side strong { font: 800 20px var(--font-head); }
.order__actions { display: flex; gap: 6px; }
.panel { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.panel .form-grid { width: 100%; }
.panel--narrow { max-width: 440px; }
.panel--narrow .field { width: 100%; }
@media (max-width: 640px) {
  .order { flex-direction: column; align-items: stretch; }
  .order__side { align-items: flex-start; }
}
</style>
