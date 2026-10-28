<script setup>
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCustomerStore } from '@/stores/customer';
import { useToastStore } from '@/stores/toast';
import AppIcon from '@/components/AppIcon.vue';

const customer = useCustomerStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const mode = ref(route.query.mode === 'register' ? 'register' : 'login');
const form = reactive({ name: '', email: '', phone: '', password: '' });
const errors = ref({});
const error = ref('');
const loading = ref(false);

watch(mode, () => {
  errors.value = {};
  error.value = '';
});

function redirect() {
  const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//')
    ? route.query.redirect
    : '/account';
  router.replace(target);
}

async function submit() {
  errors.value = {};
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'login') {
      await customer.login(form.email, form.password);
      toast.success(`Вітаємо, ${customer.profile.name}!`);
    } else {
      await customer.register(form);
      toast.success('Обліковий запис створено');
    }
    redirect();
  } catch (err) {
    errors.value = err.fields || {};
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <div class="auth">
      <div class="auth__info">
        <span class="eyebrow">Особистий кабінет</span>
        <h1>{{ mode === 'login' ? 'Вхід у кабінет' : 'Реєстрація' }}</h1>
        <ul class="perks">
          <li><AppIcon name="refresh" :size="18" /> Повторюйте минулі замовлення в один клік — щосезону</li>
          <li><AppIcon name="receipt" :size="18" /> Історія та статуси всіх замовлень</li>
          <li><AppIcon name="user" :size="18" /> Дані для доставки заповнюються автоматично</li>
        </ul>
        <p class="muted demo">
          Для перевірки можна увійти тестовим покупцем:<br />
          <code>demo@agromarket.ua</code> / <code>demo12345</code>
        </p>
      </div>

      <form class="auth__card card card--pad" novalidate @submit.prevent="submit">
        <div class="switch">
          <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">Вхід</button>
          <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">Реєстрація</button>
        </div>
        <div v-if="error" class="alert alert--error">{{ error }}</div>

        <div v-if="mode === 'register'" class="field">
          <label for="a-name">Ім'я та прізвище</label>
          <input id="a-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" autocomplete="name" />
          <span v-if="errors.name" class="error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="a-email">Email</label>
          <input id="a-email" v-model="form.email" class="input" :class="{ invalid: errors.email }" type="email" autocomplete="email" />
          <span v-if="errors.email" class="error">{{ errors.email }}</span>
        </div>
        <div v-if="mode === 'register'" class="field">
          <label for="a-phone">Телефон</label>
          <input id="a-phone" v-model="form.phone" class="input" :class="{ invalid: errors.phone }" type="tel" placeholder="+380" autocomplete="tel" />
          <span v-if="errors.phone" class="error">{{ errors.phone }}</span>
        </div>
        <div class="field">
          <label for="a-pass">Пароль</label>
          <input
            id="a-pass"
            v-model="form.password"
            class="input"
            :class="{ invalid: errors.password }"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          />
          <span v-if="errors.password" class="error">{{ errors.password }}</span>
          <span v-else-if="mode === 'register'" class="hint">Мінімум 8 символів</span>
        </div>
        <button class="btn btn--lg btn--block" :disabled="loading">
          {{ loading ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Зареєструватися' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: 1fr minmax(0, 440px);
  gap: 48px;
  align-items: center;
  max-width: 1000px;
  margin: 48px auto 0;
}
.perks { list-style: none; padding: 0; margin: 20px 0; display: flex; flex-direction: column; gap: 12px; }
.perks li { display: flex; gap: 10px; align-items: center; }
.perks .icon { color: var(--c-primary); }
.demo { font-size: 13px; }
.demo code { background: var(--c-primary-soft); padding: 1px 6px; border-radius: 4px; }
.auth__card { display: flex; flex-direction: column; gap: 14px; border-radius: var(--radius-lg); box-shadow: var(--shadow); }
.switch { display: flex; padding: 4px; border-radius: 999px; background: #f0f2ec; }
.switch button {
  flex: 1;
  padding: 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: 600 14px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
}
.switch button.active { background: #fff; color: var(--c-text); box-shadow: var(--shadow-xs); }
@media (max-width: 860px) {
  .auth { grid-template-columns: minmax(0, 1fr); gap: 24px; margin-top: 16px; }
}
</style>
