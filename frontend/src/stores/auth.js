import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, getToken, setToken } from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken());
  const user = ref(null);

  const isLoggedIn = computed(() => Boolean(token.value));

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password });
    setToken(data.token);
    token.value = data.token;
    user.value = data.user;
  }

  async function fetchMe() {
    if (!token.value) return null;
    user.value = await api.get('/auth/me');
    return user.value;
  }

  function logout() {
    setToken(null);
    token.value = null;
    user.value = null;
  }

  return { token, user, isLoggedIn, login, fetchMe, logout };
});
