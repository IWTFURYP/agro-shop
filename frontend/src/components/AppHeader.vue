<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SHOP } from '@/config';
import { useCartStore } from '@/stores/cart';
import { useCatalogStore } from '@/stores/catalog';
import AppLogo from './AppLogo.vue';
import AppIcon from './AppIcon.vue';

const cart = useCartStore();
const catalog = useCatalogStore();
const route = useRoute();
const router = useRouter();

const search = ref('');
const searchInput = ref(null);
const megaOpen = ref(false);
const scrolled = ref(false);
const activeCat = ref(null);

const NAV = [
  { to: '/problems', label: 'Підбір за проблемою' },
  { to: '/services', label: 'Протруювання' },
  { to: '/articles', label: 'Поради агронома' },
  { to: '/about', label: 'Про нас' },
  { to: '/contacts', label: 'Контакти' },
];

// Прозора шапка поверх фото лише на головній, доки сторінку не прокрутили
const transparent = computed(() => route.name === 'home' && !scrolled.value && !megaOpen.value);
const megaCategory = computed(
  () => catalog.categories.find((c) => c.id === activeCat.value) || catalog.categories[0],
);

function onScroll() {
  scrolled.value = window.scrollY > 24;
}

onMounted(() => {
  catalog.loadCategories().catch(() => {});
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('focus-search', focusSearch);
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('focus-search', focusSearch);
});

watch(
  () => route.fullPath,
  () => {
    megaOpen.value = false;
    search.value = route.name === 'catalog' ? route.query.search || '' : '';
  },
  { immediate: true },
);

function focusSearch() {
  searchInput.value?.focus();
}

function submitSearch() {
  const q = search.value.trim();
  searchInput.value?.blur();
  router.push({ name: 'catalog', query: q ? { search: q } : {} });
}
</script>

<template>
  <header class="header" :class="{ 'header--transparent': transparent, 'header--scrolled': scrolled }">
    <div class="container header__bar">
      <AppLogo :light="transparent" />

      <nav class="header__nav" aria-label="Головне меню">
        <div class="mega-wrap" @mouseenter="megaOpen = true" @mouseleave="megaOpen = false">
          <RouterLink to="/catalog" class="nav-link nav-link--catalog" :class="{ open: megaOpen }" @focus="megaOpen = true">
            <AppIcon name="layout-grid" :size="18" />
            Каталог
            <AppIcon name="chevron-down" :size="16" class="chev" />
          </RouterLink>

          <Transition name="mega">
            <div v-if="megaOpen && catalog.categories.length" class="mega">
              <div class="container mega__inner">
                <ul class="mega__roots">
                  <li v-for="cat in catalog.categories" :key="cat.id">
                    <RouterLink
                      :to="`/catalog/${cat.slug}`"
                      class="mega__root"
                      :class="{ active: megaCategory?.id === cat.id }"
                      @mouseenter="activeCat = cat.id"
                    >
                      <span class="mega__root-icon"><AppIcon :name="cat.icon" :size="20" /></span>
                      <span>{{ cat.name }}</span>
                      <small>{{ cat.product_count }}</small>
                    </RouterLink>
                  </li>
                </ul>
                <div v-if="megaCategory" class="mega__panel">
                  <h3>{{ megaCategory.name }}</h3>
                  <p class="muted">{{ megaCategory.description }}</p>
                  <div v-if="megaCategory.children.length" class="mega__subs">
                    <RouterLink v-for="sub in megaCategory.children" :key="sub.id" :to="`/catalog/${sub.slug}`" class="mega__sub">
                      <AppIcon :name="sub.icon" :size="18" />
                      {{ sub.name }}
                      <small>{{ sub.product_count }}</small>
                    </RouterLink>
                  </div>
                  <RouterLink :to="`/catalog/${megaCategory.slug}`" class="link-arrow">
                    Усі товари категорії <AppIcon name="arrow-right" :size="16" />
                  </RouterLink>
                </div>
                <RouterLink to="/problems" class="mega__promo">
                  <AppIcon name="search" :size="22" />
                  <strong>Не знаєте, що обрати?</strong>
                  <span>Підберіть препарат за культурою та проблемою</span>
                </RouterLink>
              </div>
            </div>
          </Transition>
        </div>
        <RouterLink v-for="item in NAV" :key="item.to" :to="item.to" class="nav-link">{{ item.label }}</RouterLink>
      </nav>

      <form class="search" role="search" @submit.prevent="submitSearch">
        <AppIcon name="search" :size="18" class="search__icon" />
        <input
          ref="searchInput"
          v-model="search"
          class="search__input"
          type="search"
          placeholder="Препарат, культура або проблема…"
          aria-label="Пошук товарів"
        />
      </form>

      <div class="header__actions">
        <a :href="SHOP.phoneHref" class="icon-btn icon-btn--phone" :title="SHOP.phone">
          <AppIcon name="phone" :size="20" />
          <span class="phone-text">{{ SHOP.phone }}</span>
        </a>
        <RouterLink to="/cart" class="icon-btn" aria-label="Кошик">
          <AppIcon name="shopping-cart" :size="20" />
          <span v-if="cart.count" class="icon-btn__count">{{ cart.count > 99 ? '99+' : cart.count }}</span>
        </RouterLink>
      </div>
    </div>
  </header>
  <!-- Відступ під фіксовану шапку (на головній фото йде під шапку) -->
  <div v-if="route.name !== 'home'" class="header-spacer" />
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  border-bottom: 1px solid rgba(231, 233, 225, 0.8);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.header--scrolled { box-shadow: 0 6px 24px -12px rgba(24, 34, 26, 0.18); }
.header--transparent {
  background: linear-gradient(rgba(10, 20, 12, 0.45), transparent);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-bottom-color: transparent;
}
.header-spacer { height: var(--header-h); }

.header__bar {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 20px;
}

.header__nav {
  display: flex;
  align-items: center;
  gap: 2px;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--c-text);
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.nav-link:hover,
.nav-link.router-link-active { background: var(--c-primary-soft); color: var(--c-primary-dark); }
.nav-link--catalog {
  background: var(--c-primary);
  color: #fff;
  font-weight: 600;
  padding: 9px 16px;
}
.nav-link--catalog:hover,
.nav-link--catalog.open,
.nav-link--catalog.router-link-active { background: var(--c-primary-hover); color: #fff; }
.nav-link--catalog .chev { transition: transform 0.2s; }
.nav-link--catalog.open .chev { transform: rotate(180deg); }

.header--transparent .nav-link:not(.nav-link--catalog) { color: #fff; }
.header--transparent .nav-link:not(.nav-link--catalog):hover { background: rgba(255, 255, 255, 0.14); color: #fff; }

.mega-wrap { position: static; }
.mega {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid var(--c-border);
  box-shadow: var(--shadow-lg);
}
.mega__inner {
  display: grid;
  grid-template-columns: 300px 1fr 260px;
  gap: 32px;
  padding-top: 28px;
  padding-bottom: 32px;
}
.mega__roots { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.mega__root {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--c-text);
  font-weight: 600;
  font-size: 15px;
}
.mega__root small { margin-left: auto; color: var(--c-muted); font-weight: 500; }
.mega__root-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.mega__root.active,
.mega__root:hover { background: var(--c-sand); color: var(--c-text); }
.mega__root.active .mega__root-icon { background: var(--c-primary); color: #fff; }
.mega__panel h3 { font-size: 22px; margin-bottom: 6px; }
.mega__panel p { font-size: 14px; max-width: 520px; }
.mega__subs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 20px;
}
.mega__sub {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  color: var(--c-text);
  font-size: 14px;
  font-weight: 500;
}
.mega__sub .icon { color: var(--c-primary); }
.mega__sub small { margin-left: auto; color: var(--c-muted); }
.mega__sub:hover { border-color: var(--c-primary); color: var(--c-primary-dark); }
.mega__promo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  border-radius: var(--radius);
  background: var(--c-primary-dark);
  color: #e6efe4;
  font-size: 14px;
}
.mega__promo strong { font: 700 18px var(--font-head); color: #fff; }
.mega__promo .icon { color: var(--c-accent); }
.mega__promo:hover { color: #fff; background: #163520; }
.mega-enter-active,
.mega-leave-active { transition: opacity 0.2s, transform 0.25s var(--ease); }
.mega-enter-from,
.mega-leave-to { opacity: 0; transform: translateY(-6px); }

.search {
  position: relative;
  flex: 1;
  min-width: 120px;
  max-width: 300px;
  margin-left: auto;
}
.search__icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-muted);
  pointer-events: none;
}
.search__input {
  width: 100%;
  height: 42px;
  padding: 0 14px 0 40px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  font: 400 14px var(--font-body);
  color: var(--c-text);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.search__input:focus {
  outline: none;
  border-color: var(--c-primary);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(47, 107, 60, 0.12);
}
.header--transparent .search__input { border-color: rgba(255, 255, 255, 0.35); background: rgba(255, 255, 255, 0.14); color: #fff; }
.header--transparent .search__input::placeholder { color: rgba(255, 255, 255, 0.75); }
.header--transparent .search__icon { color: rgba(255, 255, 255, 0.8); }

.header__actions { display: flex; align-items: center; gap: 8px; }
.icon-btn {
  position: relative;
  height: 42px;
  min-width: 42px;
  padding: 0 11px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--c-border);
  background: #fff;
  color: var(--c-text);
  font-weight: 600;
  font-size: 14px;
  transition: all 0.15s;
}
.icon-btn:hover { border-color: var(--c-primary); color: var(--c-primary-dark); }
.header--transparent .icon-btn { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.35); color: #fff; }
.icon-btn__count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--c-accent);
  color: #2b1f05;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.phone-text { white-space: nowrap; }

@media (max-width: 1520px) {
  .phone-text { display: none; }
}
@media (max-width: 1160px) {
  .header__nav .nav-link:nth-child(n + 5) { display: none; }
}
@media (max-width: 1000px) {
  .header__nav .nav-link:not(.nav-link--catalog) { display: none; }
}
@media (max-width: 760px) {
  .header__nav,
  .icon-btn--phone,
  .header__actions { display: none; }
  .search { max-width: none; }
  .search__input { height: 40px; }
}
</style>
