<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { SHOP } from '@/config';
import { useUiStore } from '@/stores/ui';
import { useCartStore } from '@/stores/cart';
import { useCatalogStore } from '@/stores/catalog';
import AppLogo from './AppLogo.vue';
import AppIcon from './AppIcon.vue';

// Бокове меню (як у великих маркетплейсах): каталог, сад, усі розділи, кошик і контакти.
// Відкривається кнопкою ☰ у шапці або «Меню» на нижній панелі телефона.
const ui = useUiStore();
const cart = useCartStore();
const catalog = useCatalogStore();
const route = useRoute();

const catalogOpen = ref(false);
const panel = ref(null);

const LINKS = [
  { to: '/problems', icon: 'search', label: 'Підбір препарату за проблемою' },
  { to: '/services', icon: 'flask-conical', label: 'Протруювання насіння' },
  { to: '/articles', icon: 'book-open', label: 'Поради агронома' },
  { to: '/about', icon: 'users', label: 'Про компанію' },
  { to: '/contacts', icon: 'truck', label: 'Доставка та оплата' },
];

// Закриваємо меню після переходу на іншу сторінку
watch(() => route.fullPath, () => ui.closeDrawer());

watch(
  () => ui.drawerOpen,
  async (open) => {
    document.body.classList.toggle('drawer-open', open);
    if (open) {
      catalog.loadCategories().catch(() => {});
      await nextTick();
      panel.value?.focus();
    } else {
      catalogOpen.value = false;
    }
  },
);

function onKey(e) {
  if (e.key === 'Escape' && ui.drawerOpen) ui.closeDrawer();
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.body.classList.remove('drawer-open');
});
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="ui.drawerOpen" class="drawer" @click.self="ui.closeDrawer()">
        <aside ref="panel" class="drawer__panel" role="dialog" aria-modal="true" aria-label="Меню" tabindex="-1">
          <header class="drawer__top">
            <AppLogo light />
            <button type="button" class="drawer__close" aria-label="Закрити меню" @click="ui.closeDrawer()">
              <AppIcon name="x" :size="22" />
            </button>
          </header>

          <div class="drawer__body">
            <button type="button" class="drawer__catalog" :aria-expanded="catalogOpen" @click="catalogOpen = !catalogOpen">
              <AppIcon name="layout-grid" :size="22" /> Каталог товарів
              <AppIcon :name="catalogOpen ? 'chevron-up' : 'chevron-down'" :size="18" class="drawer__chev" />
            </button>
            <ul v-if="catalogOpen" class="drawer__group drawer__cats">
              <li v-for="cat in catalog.categories" :key="cat.id">
                <RouterLink :to="`/catalog/${cat.slug}`" class="drawer__link">
                  <AppIcon :name="cat.icon" :size="20" />
                  <span>{{ cat.name }}</span>
                  <small>{{ cat.product_count }}</small>
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/catalog" class="drawer__link drawer__link--all">
                  <AppIcon name="arrow-right" :size="20" /> <span>Усі товари</span>
                </RouterLink>
              </li>
            </ul>

            <RouterLink to="/sad" class="drawer__promo drawer__promo--green">
              <span class="drawer__promo-icon"><AppIcon name="apple" :size="22" /></span>
              <span><strong>Яблуневий сад</strong><small>Програма захисту на сезон з розрахунком на вашу площу</small></span>
            </RouterLink>
            <RouterLink to="/sad/journal" class="drawer__promo drawer__promo--yellow">
              <span class="drawer__promo-icon"><AppIcon name="cloud-rain" :size="22" /></span>
              <span><strong>Щоденник і погода</strong><small>Коли й чим обприскувати наступного разу</small></span>
            </RouterLink>

            <ul class="drawer__group">
              <li>
                <RouterLink to="/cart" class="drawer__link">
                  <AppIcon name="shopping-cart" :size="20" /><span>Кошик</span>
                  <span v-if="cart.count" class="drawer__badge">{{ cart.count > 99 ? '99+' : cart.count }}</span>
                </RouterLink>
              </li>
              <li v-for="l in LINKS" :key="l.to">
                <RouterLink :to="l.to" class="drawer__link"><AppIcon :name="l.icon" :size="20" /><span>{{ l.label }}</span></RouterLink>
              </li>
            </ul>

            <div class="drawer__group drawer__contacts">
              <span class="drawer__caption">Зв’язатися з нами</span>
              <a :href="SHOP.phoneHref" class="drawer__phone"><AppIcon name="phone-call" :size="20" /> {{ SHOP.phone }}</a>
              <a :href="`mailto:${SHOP.email}`" class="drawer__contact"><AppIcon name="mail" :size="18" /> {{ SHOP.email }}</a>
              <span class="drawer__contact"><AppIcon name="clock" :size="18" /> {{ SHOP.workHours }}</span>
              <span class="drawer__contact"><AppIcon name="map-pin" :size="18" /> {{ SHOP.address }}</span>
              <div v-if="SHOP.viber || SHOP.telegram" class="drawer__msg">
                <a v-if="SHOP.viber" :href="SHOP.viber" class="btn btn--outline btn--sm" target="_blank" rel="noopener">Viber</a>
                <a v-if="SHOP.telegram" :href="SHOP.telegram" class="btn btn--outline btn--sm" target="_blank" rel="noopener">Telegram</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(12, 20, 14, 0.5);
}
.drawer__panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(380px, 88vw);
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.25);
  outline: none;
}
.drawer__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 14px 20px;
  background: var(--c-primary-dark);
}
.drawer__close {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: transparent;
  color: #fff;
  cursor: pointer;
}
.drawer__close:hover { background: rgba(255, 255, 255, 0.12); }
.drawer__body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.drawer__catalog {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border: 0;
  border-radius: 14px;
  background: var(--c-primary);
  color: #fff;
  font: 700 17px var(--font-head);
  cursor: pointer;
}
.drawer__catalog:hover { background: var(--c-primary-dark); }
.drawer__chev { margin-left: 4px; opacity: 0.8; }

.drawer__promo {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 14px;
  color: var(--c-text);
  transition: transform 0.15s;
}
.drawer__promo:hover { color: var(--c-text); transform: translateY(-1px); }
.drawer__promo strong { display: block; font-size: 16px; }
.drawer__promo small { display: block; font-size: 13px; color: var(--c-muted); line-height: 1.35; }
.drawer__promo--green { background: var(--c-primary-soft); }
.drawer__promo--yellow { background: var(--c-accent-light); }
.drawer__promo-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--c-primary);
}
.drawer__promo--yellow .drawer__promo-icon { color: #8a5f0d; }

.drawer__group {
  list-style: none;
  margin: 0;
  padding: 4px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--c-border);
}
.drawer__link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 12px;
  border-radius: 10px;
  color: var(--c-text);
  font-size: 15px;
}
.drawer__link:hover,
.drawer__link.router-link-exact-active { background: var(--c-primary-soft); color: var(--c-primary-dark); }
.drawer__link .icon { color: var(--c-muted); flex-shrink: 0; }
.drawer__link span { flex: 1; }
.drawer__link small { color: var(--c-muted); }
.drawer__link--all { color: var(--c-primary); font-weight: 600; }
.drawer__badge {
  flex: none !important;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--c-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.drawer__contacts { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; }
.drawer__caption { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-muted); }
.drawer__phone { display: inline-flex; align-items: center; gap: 10px; font: 800 20px var(--font-head); color: var(--c-text); white-space: nowrap; }
.drawer__phone .icon { color: var(--c-primary); }
.drawer__contact { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: var(--c-muted); }
.drawer__contact .icon { flex-shrink: 0; margin-top: 2px; color: var(--c-primary); }
.drawer__msg { display: flex; gap: 8px; }

.drawer-enter-active,
.drawer-leave-active { transition: background 0.25s; }
.drawer-enter-active .drawer__panel,
.drawer-leave-active .drawer__panel { transition: transform 0.28s var(--ease); }
.drawer-enter-from,
.drawer-leave-to { background: rgba(12, 20, 14, 0); }
.drawer-enter-from .drawer__panel,
.drawer-leave-to .drawer__panel { transform: translateX(-100%); }
</style>

<style>
body.drawer-open { overflow: hidden; }
</style>
