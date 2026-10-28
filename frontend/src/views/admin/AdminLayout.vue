<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { SHOP } from '@/config';
import AppIcon from '@/components/AppIcon.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const menuOpen = ref(false);

const links = [
  { to: '/admin', label: 'Огляд', icon: 'gauge', exact: true },
  { to: '/admin/orders', label: 'Замовлення', icon: 'receipt' },
  { to: '/admin/requests', label: 'Заявки', icon: 'phone-call' },
  { to: '/admin/products', label: 'Товари', icon: 'package' },
  { to: '/admin/categories', label: 'Категорії', icon: 'layout-grid' },
  { to: '/admin/collections', label: 'Сезонні добірки', icon: 'calendar-days' },
  { to: '/admin/articles', label: 'Статті', icon: 'book-open' },
  { to: '/admin/brands', label: 'Виробники', icon: 'factory' },
];

onMounted(() => auth.fetchMe().catch(() => {}));
watch(() => route.fullPath, () => (menuOpen.value = false));

function logout() {
  auth.logout();
  router.push('/admin/login');
}
</script>

<template>
  <div class="admin">
    <aside class="admin__side" :class="{ open: menuOpen }">
      <RouterLink to="/admin" class="admin__brand"><AppIcon name="sprout" :size="22" /> {{ SHOP.name }} <small>адмін</small></RouterLink>
      <nav>
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="admin__link"
          :class="{ active: l.exact ? route.path === l.to : route.path.startsWith(l.to) }"
        >
          <AppIcon :name="l.icon" :size="18" /> {{ l.label }}
        </RouterLink>
      </nav>
      <div class="admin__side-bottom">
        <a href="/" target="_blank" class="admin__link"><AppIcon name="globe" :size="18" /> Відкрити сайт</a>
        <button class="admin__link" @click="logout"><AppIcon name="log-out" :size="18" /> Вийти</button>
      </div>
    </aside>

    <div class="admin__main">
      <header class="admin__top">
        <button class="admin__burger" aria-label="Меню" @click="menuOpen = !menuOpen"><AppIcon name="menu" :size="24" /></button>
        <h1>{{ route.meta.title }}</h1>
        <span class="muted admin__user"><AppIcon name="users" :size="16" /> {{ auth.user?.username }}</span>
      </header>
      <div class="admin__content">
        <RouterView />
      </div>
    </div>
    <div v-if="menuOpen" class="admin__overlay" @click="menuOpen = false" />
  </div>
</template>

<style scoped>
.admin {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.admin__side {
  background: var(--c-primary-dark);
  color: #c4dabd;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.admin__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 800 18px var(--font-head);
  color: #fff;
  padding: 0 12px 20px;
}
.admin__brand .icon { color: var(--c-accent); }
.admin__user { display: inline-flex; align-items: center; gap: 6px; }
.admin__brand small { font: 500 12px var(--font-body); color: #8fa889; }
.admin__link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #c4dabd;
  font: 500 15px var(--font-body);
  text-align: left;
  cursor: pointer;
}
.admin__link:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
.admin__link.active { background: var(--c-primary); color: #fff; }
.admin__side-bottom { margin-top: auto; }

.admin__main { min-width: 0; background: var(--c-bg); }
.admin__top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 28px;
  background: #fff;
  border-bottom: 1px solid var(--c-border);
}
.admin__top h1 { margin: 0; font-size: 22px; flex: 1; }
.admin__burger {
  display: none;
  border: 0;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
}
.admin__content { padding: 28px; }
.admin__overlay { display: none; }

@media (max-width: 860px) {
  .admin { grid-template-columns: 1fr; }
  .admin__side {
    position: fixed;
    left: 0;
    top: 0;
    width: 250px;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.2s;
  }
  .admin__side.open { transform: none; }
  .admin__burger { display: block; }
  .admin__content { padding: 16px; }
  .admin__top { padding: 14px 16px; }
  .admin__overlay { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 90; }
}
</style>

<style>
/* Спільні стилі сторінок адмінки */
.admin-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.admin-toolbar .input,
.admin-toolbar .select { width: auto; min-width: 200px; }
.admin-toolbar .spacer { flex: 1; }
.admin-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--c-border);
  flex-shrink: 0;
}
.admin-actions { display: flex; gap: 6px; justify-content: flex-end; }
.admin-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 40, 18, 0.45);
  display: grid;
  place-items: center;
  z-index: 300;
  padding: 16px;
}
.admin-modal {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 28px;
}
.admin-modal h3 { margin-bottom: 18px; }
.icon-pick { display: flex; flex-wrap: wrap; gap: 6px; }
.icon-pick__btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: #fff;
  color: var(--c-text);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.icon-pick__btn:hover { border-color: var(--c-primary); }
.icon-pick__btn.active { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.admin-subtable { display: flex; flex-direction: column; gap: 8px; }
.admin-subtable__row { display: flex; gap: 8px; align-items: center; }
.admin-modal__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
</style>
