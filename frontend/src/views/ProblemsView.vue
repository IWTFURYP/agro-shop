<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { CROPS, PROBLEM_GROUPS } from '@/config';
import ProductCard from '@/components/ProductCard.vue';
import AppIcon from '@/components/AppIcon.vue';

// Підбір препаратів: культура → проблема → товари
const route = useRoute();
const router = useRouter();

const problems = ref([]);
const products = ref([]);
const loadingProducts = ref(false);
const search = ref('');

const crop = computed(() => route.query.crop || '');
const target = computed(() => route.query.target || '');

const normalize = (s) => s.toLowerCase().replace(/[’`ʼ]/g, "'");

// Розкладаємо проблеми по групах (бур'яни, хвороби, шкідники, живлення)
const groups = computed(() => {
  const result = PROBLEM_GROUPS.map((g) => ({ ...g, items: [] }));
  const other = { key: 'other', title: 'Інше', icon: 'info', items: [] };
  for (const p of problems.value) {
    const name = normalize(p.name);
    const group = result.find((g) => g.match.some((m) => name.includes(m)));
    (group || other).items.push(p);
  }
  return [...result, other].filter((g) => g.items.length);
});

async function loadProblems() {
  problems.value = await api.get('/problems', { crop: crop.value }).catch(() => []);
}

async function loadProducts() {
  if (!target.value) {
    products.value = [];
    return;
  }
  loadingProducts.value = true;
  try {
    const data = await api.get('/products', { target: target.value, crop: crop.value, limit: 24 });
    products.value = data.items;
  } finally {
    loadingProducts.value = false;
  }
}

watch(crop, loadProblems, { immediate: true });
watch([crop, target], loadProducts, { immediate: true });

function setQuery(patch) {
  const query = { ...route.query, ...patch };
  for (const k of Object.keys(query)) if (!query[k]) delete query[k];
  router.replace({ query });
}

function submitSearch() {
  const q = search.value.trim();
  if (q) router.push({ name: 'catalog', query: { search: crop.value ? `${q} ${crop.value}` : q } });
}
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs">
          <RouterLink to="/">Головна</RouterLink>
          <span>Підбір за проблемою</span>
        </nav>
        <span class="eyebrow">Підбір препаратів</span>
        <h1>Що турбує ваше поле чи сад?</h1>
        <p class="lead">Оберіть культуру й проблему — покажемо препарати, які з нею справляються.</p>
        <form class="psearch" @submit.prevent="submitSearch">
          <AppIcon name="search" :size="20" class="psearch__icon" />
          <input v-model="search" type="search" placeholder="Або опишіть своїми словами: «іржа на ячмені»" aria-label="Пошук за проблемою" />
          <button class="btn">Знайти</button>
        </form>
      </div>
    </section>

    <div class="container">
      <div class="step">
        <h2><span class="step__num">1</span> Культура</h2>
        <div class="crops">
          <button class="chip" :class="{ active: !crop }" @click="setQuery({ crop: '', target: '' })">Усі культури</button>
          <button
            v-for="c in CROPS"
            :key="c"
            class="chip"
            :class="{ active: crop === c }"
            @click="setQuery({ crop: c, target: '' })"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <div class="step">
        <h2><span class="step__num">2</span> Проблема</h2>
        <div v-if="!groups.length" class="muted">Для цієї культури поки немає підібраних препаратів.</div>
        <div class="groups">
          <div v-for="g in groups" :key="g.key" class="group">
            <h3><span class="group__icon"><AppIcon :name="g.icon" :size="20" /></span> {{ g.title }}</h3>
            <div class="group__items">
              <button
                v-for="p in g.items"
                :key="p.name"
                class="chip"
                :class="{ active: target === p.name }"
                @click="setQuery({ target: target === p.name ? '' : p.name })"
              >
                {{ p.name }} <small>{{ p.count }}</small>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="target" class="step">
        <h2>
          <span class="step__num">3</span>
          Препарати: {{ target }}<template v-if="crop"> · {{ crop }}</template>
        </h2>
        <div v-if="loadingProducts" class="spinner" />
        <div v-else-if="!products.length" class="empty card">
          Не знайшли препарат? Зателефонуйте нам — агроном підбере рішення.
        </div>
        <div v-else class="products-grid">
          <ProductCard v-for="p in products" :key="p.id" :product="p" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-hero { background: var(--c-sand); padding: 4px 0 44px; }
.lead { font-size: 17px; color: var(--c-muted); max-width: 640px; }
.psearch { position: relative; display: flex; gap: 8px; max-width: 640px; margin-top: 24px; }
.psearch__icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--c-muted); }
.psearch input {
  flex: 1;
  min-width: 0;
  height: 54px;
  padding: 0 16px 0 50px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  font: 400 15px var(--font-body);
  background: #fff;
}
.psearch input:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 4px rgba(47, 107, 60, 0.12); }

.step { margin-top: 44px; }
.step h2 { display: flex; align-items: center; gap: 12px; font-size: 22px; margin-bottom: 18px; }
.step__num {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--c-primary);
  color: #fff;
  font-size: 15px;
  flex-shrink: 0;
}
.crops { display: flex; flex-wrap: wrap; gap: 8px; }
.crops .chip { padding: 10px 18px; font-size: 14px; }
.groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.group {
  padding: 22px;
  border-radius: var(--radius-lg);
  background: #fff;
  box-shadow: 0 0 0 1px var(--c-border);
}
.group h3 { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.group__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.group__items { display: flex; flex-wrap: wrap; gap: 6px; }
@media (max-width: 560px) {
  .psearch { flex-direction: column; }
  .psearch input { flex: none; }
  .psearch__icon { top: 27px; }
}
</style>
