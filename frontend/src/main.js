import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { setUnauthorizedHandler } from './api';
import { useAuthStore } from './stores/auth';
import { reveal } from './directives/reveal';
import './assets/main.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.directive('reveal', reveal);

// Якщо токен адміністратора прострочений — виходимо й ведемо на сторінку входу
setUnauthorizedHandler(() => {
  useAuthStore(pinia).logout();
  if (router.currentRoute.value.path.startsWith('/admin')) {
    router.push({ name: 'admin-login', query: { redirect: router.currentRoute.value.fullPath } });
  }
});

app.mount('#app');
