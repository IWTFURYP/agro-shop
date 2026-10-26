<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppLogo from '@/components/AppLogo.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
      ? route.query.redirect
      : '/admin';
    router.replace(redirect);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <form class="login__card card" @submit.prevent="submit">
      <AppLogo />
      <h2>Вхід в адмін-панель</h2>
      <div v-if="error" class="alert alert--error">{{ error }}</div>
      <div class="field">
        <label for="l-user">Логін</label>
        <input id="l-user" v-model="username" class="input" autocomplete="username" required />
      </div>
      <div class="field">
        <label for="l-pass">Пароль</label>
        <input id="l-pass" v-model="password" class="input" type="password" autocomplete="current-password" required />
      </div>
      <button class="btn btn--lg btn--block" :disabled="loading">{{ loading ? 'Вхід…' : 'Увійти' }}</button>
      <RouterLink to="/" class="login__back">← Повернутися на сайт</RouterLink>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #e7f5e1, #f7fbf4 50%, #fff4d6);
}
.login__card {
  width: 100%;
  max-width: 400px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.login__card h2 { margin: 8px 0 0; font-size: 22px; }
.login__back { text-align: center; font-size: 14px; color: var(--c-muted); }
</style>
