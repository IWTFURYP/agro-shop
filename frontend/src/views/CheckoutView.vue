<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';
import { REGIONS, DELIVERY_METHODS, PAYMENT_METHODS } from '@/config';
import { formatPrice } from '@/utils/format';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import { useCustomerStore } from '@/stores/customer';
import { useCartSync } from '@/composables/useCartSync';

const cart = useCartStore();
const toast = useToastStore();
const router = useRouter();
const customer = useCustomerStore();
const { notice, sync } = useCartSync();

const form = reactive({
  name: '',
  phone: '',
  email: '',
  company: '',
  edrpou: '',
  region: '',
  city: '',
  delivery_method: 'nova_poshta',
  delivery_address: '',
  payment_method: 'invoice',
  comment: '',
});
const isCompany = ref(false);
const errors = ref({});
const sending = ref(false);

// Для покупця з кабінету підставляємо дані профілю
onMounted(async () => {
  sync();
  if (!customer.isLoggedIn) return;
  const p = customer.profile || (await customer.fetchProfile().catch(() => null));
  if (!p) return;
  for (const key of ['name', 'phone', 'region', 'city', 'delivery_address', 'company', 'edrpou']) {
    if (!form[key] && p[key]) form[key] = p[key];
  }
  if (!form.email) form.email = p.email;
  if (p.company || p.edrpou) isCompany.value = true;
});

const needsAddress = computed(() => form.delivery_method !== 'pickup');
const addressLabel = computed(() =>
  form.delivery_method === 'nova_poshta' ? 'Відділення Нової Пошти' : 'Адреса доставки',
);

async function submit() {
  errors.value = {};
  sending.value = true;
  try {
    const payload = {
      ...form,
      company: isCompany.value ? form.company : '',
      edrpou: isCompany.value ? form.edrpou : '',
      items: cart.items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
    };
    const order = await api.post('/orders', payload);
    cart.clear();
    sessionStorage.setItem('agro_last_order', JSON.stringify(order));
    router.replace({ name: 'order-success' });
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
    if (errors.value.items) toast.error(errors.value.items);
    // Залишки змінилися — підтягуємо актуальні дані
    if (err.status === 409) sync();
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span><RouterLink to="/cart">Кошик</RouterLink></span>
      <span>Оформлення</span>
    </nav>
    <h1>Оформлення замовлення</h1>

    <div v-if="!cart.items.length" class="empty card">
      <div class="empty__icon"><AppIcon name="shopping-cart" :size="30" /></div>
      <h3>Кошик порожній</h3>
      <RouterLink to="/catalog" class="btn">До каталогу</RouterLink>
    </div>

    <div v-if="notice" class="alert alert--warn checkout-notice"><AppIcon name="alert" :size="18" /> {{ notice }}</div>
    <p v-if="cart.items.length && !customer.isLoggedIn" class="checkout-login muted">
      <AppIcon name="user" :size="16" />
      Маєте кабінет? <RouterLink :to="{ name: 'account-login', query: { redirect: '/checkout' } }">Увійдіть</RouterLink>,
      щоб дані заповнились автоматично, а замовлення збереглося в історії.
    </p>
    <form v-if="cart.items.length" class="checkout" novalidate @submit.prevent="submit">
      <div class="checkout__main">
        <section class="card card--pad">
          <h3><span class="step">1</span> Контактні дані</h3>
          <div class="form-grid">
            <div class="field">
              <label for="c-name">Ім’я та прізвище <span class="req">*</span></label>
              <input id="c-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" autocomplete="name" />
              <span v-if="errors.name" class="error">{{ errors.name }}</span>
            </div>
            <div class="field">
              <label for="c-phone">Телефон <span class="req">*</span></label>
              <input id="c-phone" v-model="form.phone" class="input" :class="{ invalid: errors.phone }" type="tel" placeholder="+380" autocomplete="tel" />
              <span v-if="errors.phone" class="error">{{ errors.phone }}</span>
            </div>
            <div class="field">
              <label for="c-email">Email</label>
              <input id="c-email" v-model="form.email" class="input" :class="{ invalid: errors.email }" type="email" autocomplete="email" />
              <span v-if="errors.email" class="error">{{ errors.email }}</span>
            </div>
            <div class="field checkbox-field">
              <label class="checkbox">
                <input v-model="isCompany" type="checkbox" />
                Купую як юридична особа / ФГ / ФОП
              </label>
            </div>
            <template v-if="isCompany">
              <div class="field">
                <label for="c-company">Назва підприємства</label>
                <input id="c-company" v-model="form.company" class="input" placeholder="ТОВ «Агро…»" />
              </div>
              <div class="field">
                <label for="c-edrpou">ЄДРПОУ / ІПН</label>
                <input id="c-edrpou" v-model="form.edrpou" class="input" :class="{ invalid: errors.edrpou }" inputmode="numeric" />
                <span v-if="errors.edrpou" class="error">{{ errors.edrpou }}</span>
              </div>
            </template>
          </div>
        </section>

        <section class="card card--pad">
          <h3><span class="step">2</span> Доставка</h3>
          <div class="options">
            <label v-for="(label, key) in DELIVERY_METHODS" :key="key" class="option" :class="{ active: form.delivery_method === key }">
              <input v-model="form.delivery_method" type="radio" :value="key" />
              {{ label }}
            </label>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="c-region">Область</label>
              <select id="c-region" v-model="form.region" class="select">
                <option value="">— Оберіть —</option>
                <option v-for="r in REGIONS" :key="r">{{ r }}</option>
              </select>
            </div>
            <div class="field">
              <label for="c-city">Населений пункт <span v-if="needsAddress" class="req">*</span></label>
              <input id="c-city" v-model="form.city" class="input" :class="{ invalid: errors.city }" />
              <span v-if="errors.city" class="error">{{ errors.city }}</span>
            </div>
            <div v-if="needsAddress" class="field full">
              <label for="c-address">{{ addressLabel }} <span class="req">*</span></label>
              <input id="c-address" v-model="form.delivery_address" class="input" :class="{ invalid: errors.delivery_address }" :placeholder="form.delivery_method === 'nova_poshta' ? 'Напр. Відділення №1' : 'Вулиця, будинок / назва господарства'" />
              <span v-if="errors.delivery_address" class="error">{{ errors.delivery_address }}</span>
            </div>
          </div>
        </section>

        <section class="card card--pad">
          <h3><span class="step">3</span> Оплата</h3>
          <div class="options">
            <label v-for="(label, key) in PAYMENT_METHODS" :key="key" class="option" :class="{ active: form.payment_method === key }">
              <input v-model="form.payment_method" type="radio" :value="key" />
              {{ label }}
            </label>
          </div>
          <div class="field">
            <label for="c-comment">Коментар до замовлення</label>
            <textarea id="c-comment" v-model="form.comment" class="textarea" rows="3" placeholder="Бажана дата доставки, потреба в консультації тощо" />
          </div>
        </section>
      </div>

      <aside class="summary card card--pad">
        <h3>Ваше замовлення</h3>
        <ul class="summary__list">
          <li v-for="item in cart.items" :key="item.id">
            <span>{{ item.name }} <small class="muted">× {{ item.quantity }}</small></span>
            <strong>{{ item.price == null ? 'за запитом' : formatPrice(cart.priceOf(item) * item.quantity) }}</strong>
          </li>
        </ul>
        <div v-if="cart.savings > 0" class="summary__save">
          <span>Оптова знижка</span>
          <strong>−{{ formatPrice(cart.savings) }}</strong>
        </div>
        <div class="summary__total">
          <span>Разом</span>
          <strong>{{ formatPrice(cart.total) }}</strong>
        </div>
        <p v-if="cart.hasPriceOnRequest" class="alert alert--warn">
          Ціну для частини товарів уточнить менеджер.
        </p>
        <button class="btn btn--lg btn--block" :disabled="sending">
          {{ sending ? 'Оформлюємо…' : 'Підтвердити замовлення' }}
        </button>
        <p class="muted summary__note">
          Після оформлення менеджер зв’яжеться з вами для підтвердження наявності та умов доставки.
        </p>
      </aside>
    </form>
  </div>
</template>

<style scoped>
.checkout-notice { margin-bottom: 16px; }
.checkout-login { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: -8px 0 20px; font-size: 14px; }
.checkout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}
.checkout__main { display: flex; flex-direction: column; gap: 20px; }
.checkout h3 { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.step {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 15px;
}
.checkbox-field { justify-content: flex-end; padding-bottom: 10px; }

.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}
.option input { accent-color: var(--c-primary); width: 17px; height: 17px; }
.option.active { border-color: var(--c-primary); background: var(--c-primary-soft); }

.summary { position: sticky; top: calc(var(--header-h) + 20px); display: flex; flex-direction: column; gap: 14px; }
.summary h3 { margin: 0; }
.summary__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}
.summary__list li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.summary__list strong { white-space: nowrap; }
.summary__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 14px;
  border-top: 1px solid var(--c-border);
}
.summary__total strong { font: 800 24px var(--font-head); color: var(--c-primary-dark); }
.summary__note { font-size: 13px; margin: 0; }
.summary__save { display: flex; justify-content: space-between; color: #8a5f0d; font-size: 14px; }
.summary .alert { margin: 0; }

@media (max-width: 900px) {
  .checkout { grid-template-columns: 1fr; }
  .summary { position: static; }
}
</style>
