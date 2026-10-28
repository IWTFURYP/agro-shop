import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, getCustomerToken, setCustomerToken } from '@/api';

// Покупець, що увійшов в особистий кабінет
export const useCustomerStore = defineStore('customer', () => {
  const token = ref(getCustomerToken());
  const profile = ref(null);

  const isLoggedIn = computed(() => Boolean(token.value));

  function applySession(data) {
    setCustomerToken(data.token);
    token.value = data.token;
    profile.value = data.customer;
  }

  async function login(email, password) {
    applySession(await api.post('/account/login', { email, password }));
  }

  async function register(form) {
    applySession(await api.post('/account/register', form));
  }

  async function fetchProfile() {
    if (!token.value) return null;
    profile.value = await api.get('/account/me');
    return profile.value;
  }

  async function updateProfile(data) {
    profile.value = await api.put('/account/me', data);
  }

  function logout() {
    setCustomerToken(null);
    token.value = null;
    profile.value = null;
  }

  return { token, profile, isLoggedIn, login, register, fetchProfile, updateProfile, logout };
});
