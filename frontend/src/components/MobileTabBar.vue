<script setup>
import { useRoute } from 'vue-router';
import { SHOP } from '@/config';
import { useCartStore } from '@/stores/cart';
import { useCustomerStore } from '@/stores/customer';
import AppIcon from './AppIcon.vue';

// Нижня панель навігації на телефонах, як у мобільних застосунках
const cart = useCartStore();
const customer = useCustomerStore();
const route = useRoute();
// Пошук на телефоні завжди видно в шапці, тому на панелі — особистий кабінет
</script>

<template>
  <nav class="tabbar" aria-label="Мобільна навігація">
    <RouterLink to="/" class="tab" :class="{ active: route.name === 'home' }">
      <AppIcon name="home" :size="22" />
      <span>Головна</span>
    </RouterLink>
    <RouterLink to="/catalog" class="tab" :class="{ active: route.name === 'catalog' || route.name === 'product' }">
      <AppIcon name="layout-grid" :size="22" />
      <span>Каталог</span>
    </RouterLink>
    <RouterLink
      :to="customer.isLoggedIn ? '/account' : '/account/login'"
      class="tab"
      :class="{ active: String(route.name).startsWith('account') }"
    >
      <AppIcon name="user" :size="22" />
      <span>Кабінет</span>
    </RouterLink>
    <RouterLink to="/cart" class="tab" :class="{ active: route.name === 'cart' || route.name === 'checkout' }">
      <span class="tab__icon">
        <AppIcon name="shopping-cart" :size="22" />
        <span v-if="cart.count" class="tab__count">{{ cart.count > 99 ? '99+' : cart.count }}</span>
      </span>
      <span>Кошик</span>
    </RouterLink>
    <a :href="SHOP.phoneHref" class="tab tab--call">
      <AppIcon name="phone-call" :size="22" />
      <span>Дзвінок</span>
    </a>
  </nav>
</template>

<style scoped>
.tabbar { display: none; }

@media (max-width: 760px) {
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-top: 1px solid var(--c-border);
  }
  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px 0;
    border: 0;
    background: none;
    color: var(--c-muted);
    font: 500 11px var(--font-body);
    cursor: pointer;
  }
  .tab.active { color: var(--c-primary); }
  .tab--call { color: var(--c-primary); }
  .tab__icon { position: relative; display: inline-flex; }
  .tab__count {
    position: absolute;
    top: -6px;
    right: -10px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--c-accent);
    color: #2b1f05;
    font-size: 10px;
    font-weight: 700;
    display: grid;
    place-items: center;
  }
}
</style>
