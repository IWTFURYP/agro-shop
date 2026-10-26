<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { setSeo } from '@/composables/useSeo';
import { pluralize } from '@/utils/format';
import { useCatalogStore } from '@/stores/catalog';
import ProductCard from '@/components/ProductCard.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();

const result = ref({ items: [], total: 0, page: 1, pages: 1 });
const filters = ref({ brands: [], crops: [], targets: [], price: { min: 0, max: 0 } });
const collection = ref(null);
const loading = ref(true);
const error = ref('');
const showFilters = ref(false);

const price = ref({ min: '', max: '' });

const SORT_OPTIONS = {
  popular: 'Спочатку популярні',
  price_asc: 'Від дешевих до дорогих',
  price_desc: 'Від дорогих до дешевих',
  new: 'Новинки',
  name: 'За назвою',
};

const categorySlug = computed(() => route.params.category || '');
const category = computed(() => (categorySlug.value ? catalog.findBySlug(categorySlug.value) : null));
const parentCategory = computed(() =>
  category.value?.parent_id ? catalog.categories.find((c) => c.id === category.value.parent_id) : null,
);
const selectedBrands = computed(() => (route.query.brand ? String(route.query.brand).split(',') : []));
const hasActiveFilters = computed(() =>
  ['brand', 'crop', 'target', 'minPrice', 'maxPrice', 'inStock', 'search', 'collection'].some((k) => route.query[k]),
);
const title = computed(() => {
  if (route.query.search) return `Результати пошуку «${route.query.search}»`;
  if (collection.value) return collection.value.title;
  if (route.query.target) return `Препарати: ${route.query.target}`;
  return category.value?.name || 'Каталог товарів';
});

function updateQuery(patch, resetPage = true) {
  const query = { ...route.query, ...patch };
  if (resetPage) delete query.page;
  for (const k of Object.keys(query)) if (query[k] === '' || query[k] == null) delete query[k];
  router.push({ query });
}

function toggleBrand(slug) {
  const set = new Set(selectedBrands.value);
  set.has(slug) ? set.delete(slug) : set.add(slug);
  updateQuery({ brand: [...set].join(',') });
}

function applyPrice() {
  updateQuery({ minPrice: price.value.min, maxPrice: price.value.max });
}

function goToPage(page) {
  updateQuery({ page }, false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFilters() {
  router.push({ name: 'catalog', params: route.params });
}

async function load() {
  loading.value = true;
  error.value = '';
  const params = { ...route.query, category: categorySlug.value, limit: 12 };
  try {
    const [products, filterData, collectionData] = await Promise.all([
      api.get('/products', params),
      api.get('/products/filters', {
        category: categorySlug.value, search: route.query.search, collection: route.query.collection,
      }),
      route.query.collection ? api.get(`/collections/${route.query.collection}`).catch(() => null) : null,
    ]);
    result.value = products;
    filters.value = filterData;
    collection.value = collectionData;
    setSeo({
      title: title.value,
      description: collection.value?.description || category.value?.description || undefined,
    });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.fullPath,
  () => {
    if (route.name !== 'catalog') return;
    price.value = { min: route.query.minPrice || '', max: route.query.maxPrice || '' };
    load();
  },
  { immediate: true },
);


catalog.loadCategories().catch(() => {});
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span><RouterLink to="/catalog">Каталог</RouterLink></span>
      <span v-if="parentCategory"><RouterLink :to="`/catalog/${parentCategory.slug}`">{{ parentCategory.name }}</RouterLink></span>
      <span v-if="category">{{ category.name }}</span>
    </nav>

    <div class="catalog-head">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="collection?.description" class="muted">{{ collection.description }}</p>
        <p v-else-if="category?.description && !route.query.search" class="muted">{{ category.description }}</p>
      </div>
    </div>

    <div v-if="category?.children?.length" class="subcats">
      <RouterLink v-for="sub in category.children" :key="sub.id" :to="`/catalog/${sub.slug}`" class="subcats__item">
        <AppIcon :name="sub.icon" :size="18" /> {{ sub.name }} <small>{{ sub.product_count }}</small>
      </RouterLink>
    </div>

    <div class="catalog">
      <aside class="sidebar" :class="{ 'sidebar--open': showFilters }">
        <div class="sidebar__head">
          <h3>Фільтри</h3>
          <button class="btn btn--ghost btn--icon sidebar__close" aria-label="Закрити" @click="showFilters = false"><AppIcon name="x" /></button>
        </div>

        <div class="fblock">
          <h4>Категорії</h4>
          <RouterLink :to="{ name: 'catalog', query: route.query.search ? { search: route.query.search } : {} }" class="ftree__link" :class="{ active: !categorySlug }">
            Усі товари
          </RouterLink>
          <div v-for="cat in catalog.categories" :key="cat.id" class="ftree">
            <RouterLink :to="`/catalog/${cat.slug}`" class="ftree__link" :class="{ active: categorySlug === cat.slug }">
              <span class="ftree__name"><AppIcon :name="cat.icon" :size="17" /> {{ cat.name }}</span> <small>{{ cat.product_count }}</small>
            </RouterLink>
            <div v-if="cat.children.length && (categorySlug === cat.slug || cat.children.some((c) => c.slug === categorySlug))" class="ftree__children">
              <RouterLink v-for="sub in cat.children" :key="sub.id" :to="`/catalog/${sub.slug}`" class="ftree__link" :class="{ active: categorySlug === sub.slug }">
                {{ sub.name }} <small>{{ sub.product_count }}</small>
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="fblock">
          <h4>Ціна, грн</h4>
          <form class="price" @submit.prevent="applyPrice">
            <input v-model="price.min" class="input" type="number" min="0" :placeholder="`від ${Math.floor(filters.price.min)}`" />
            <span>—</span>
            <input v-model="price.max" class="input" type="number" min="0" :placeholder="`до ${Math.ceil(filters.price.max)}`" />
            <button class="btn btn--sm">OK</button>
          </form>
        </div>

        <div class="fblock">
          <label class="checkbox">
            <input type="checkbox" :checked="route.query.inStock === '1'" @change="updateQuery({ inStock: $event.target.checked ? '1' : '' })" />
            Тільки в наявності
          </label>
        </div>

        <div v-if="filters.crops.length" class="fblock">
          <h4>Культура</h4>
          <div class="chips">
            <button
              v-for="c in filters.crops"
              :key="c.name"
              class="chip"
              :class="{ active: route.query.crop === c.name }"
              @click="updateQuery({ crop: route.query.crop === c.name ? '' : c.name })"
            >
              {{ c.name }}
            </button>
          </div>
        </div>

        <div v-if="filters.targets.length" class="fblock">
          <h4>Проблема</h4>
          <div class="chips">
            <button
              v-for="t in filters.targets.slice(0, 18)"
              :key="t.name"
              class="chip"
              :class="{ active: route.query.target === t.name }"
              @click="updateQuery({ target: route.query.target === t.name ? '' : t.name })"
            >
              {{ t.name }}
            </button>
          </div>
        </div>

        <div v-if="filters.brands.length" class="fblock">
          <h4>Виробник</h4>
          <label v-for="b in filters.brands" :key="b.id" class="checkbox fbrand">
            <input type="checkbox" :checked="selectedBrands.includes(b.slug)" @change="toggleBrand(b.slug)" />
            {{ b.name }} <small class="muted">({{ b.count }})</small>
          </label>
        </div>

        <button v-if="hasActiveFilters" class="btn btn--outline btn--block" @click="resetFilters">Скинути фільтри</button>
      </aside>

      <section class="results">
        <div class="toolbar">
          <button class="btn btn--outline btn--sm toolbar__filters" @click="showFilters = true"><AppIcon name="sliders" :size="16" /> Фільтри</button>
          <span class="muted">
            Знайдено {{ result.total }} {{ pluralize(result.total, 'товар', 'товари', 'товарів') }}
          </span>
          <select class="select toolbar__sort" :value="route.query.sort || 'popular'" @change="updateQuery({ sort: $event.target.value })">
            <option v-for="(label, value) in SORT_OPTIONS" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>

        <div v-if="loading" class="products-grid">
          <div v-for="i in 6" :key="i" class="skeleton" style="aspect-ratio: 3 / 4" />
        </div>
        <div v-else-if="error" class="alert alert--error">{{ error }}</div>
        <div v-else-if="!result.items.length" class="empty card">
          <div class="empty__icon"><AppIcon name="search" :size="30" /></div>
          <h3>Нічого не знайдено</h3>
          <p>Спробуйте змінити параметри пошуку або скористайтеся підбором за проблемою.</p>
          <button class="btn btn--outline" @click="resetFilters">Скинути фільтри</button>
          <RouterLink to="/problems" class="btn" style="margin-left: 8px">Підбір за проблемою</RouterLink>
        </div>
        <template v-else>
          <div class="products-grid">
            <ProductCard v-for="p in result.items" :key="p.id" :product="p" />
          </div>
          <PaginationBar :page="result.page" :pages="result.pages" @change="goToPage" />
        </template>
      </section>
    </div>
    <div v-if="showFilters" class="overlay" @click="showFilters = false" />
  </div>
</template>

<style scoped>
.catalog-head { margin-bottom: 16px; }
.catalog-head h1 { margin-bottom: 4px; }

.subcats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.subcats__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  color: var(--c-text);
  font-weight: 500;
}
.subcats__item small { color: var(--c-muted); }
.subcats__item:hover { border-color: var(--c-primary); color: var(--c-primary); }

.catalog {
  display: grid;
  grid-template-columns: 270px 1fr;
  gap: 28px;
  align-items: start;
}
.sidebar {
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  padding: 22px;
  position: sticky;
  top: calc(var(--header-h) + 20px);
  max-height: calc(100vh - var(--header-h) - 40px);
  overflow-y: auto;
}
.sidebar__head { display: flex; justify-content: space-between; align-items: center; }
.sidebar__head h3 { margin: 0; }
.sidebar__close { display: none; }
.fblock {
  padding: 16px 0;
  border-bottom: 1px solid var(--c-border);
}
.fblock:last-of-type { border-bottom: 0; margin-bottom: 8px; }
.fblock h4 { font-size: 14px; margin-bottom: 10px; color: var(--c-text); }

.ftree__link {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--c-text);
  font-size: 14px;
}
.ftree__link small { color: var(--c-muted); }
.ftree__name { display: inline-flex; align-items: center; gap: 8px; }
.ftree__name .icon { color: var(--c-primary); }
.ftree__link:hover { background: var(--c-primary-soft); color: var(--c-primary); }
.ftree__link.active { background: var(--c-primary-light); color: var(--c-primary-dark); font-weight: 600; }
.ftree__children { padding-left: 16px; }

.price { display: flex; align-items: center; gap: 6px; }
.price .input { padding: 8px 10px; font-size: 14px; min-width: 0; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fbrand { padding: 4px 0; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.toolbar__sort { width: auto; min-width: 220px; }
.toolbar__filters { display: none; }

.overlay { display: none; }

@media (max-width: 900px) {
  .catalog { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(320px, 88vw);
    max-height: none;
    border-radius: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.25s;
  }
  .sidebar--open { transform: none; }
  .sidebar__close { display: inline-flex; }
  .toolbar__filters { display: inline-flex; }
  .toolbar { flex-wrap: wrap; }
  .toolbar .muted { order: 3; width: 100%; }
  .toolbar__sort { min-width: 0; flex: 1; }
  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 150;
  }
}
</style>
