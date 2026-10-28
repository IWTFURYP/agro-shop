<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '@/api';
import { ORCHARD_PHASES, ORCHARD_TOOLS, ORCHARD_RULES } from '@/data/orchardProgram';
import { formatPrice } from '@/utils/format';
import { unitPrice } from '@/utils/pricing';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import ProductCard from '@/components/ProductCard.vue';
import ProductImage from '@/components/ProductImage.vue';
import RequestForm from '@/components/RequestForm.vue';
import AppIcon from '@/components/AppIcon.vue';

// Програма захисту яблуневого саду: етапи сезону + розрахунок препаратів на площу саду
const cart = useCartStore();
const toast = useToastStore();

const STORAGE_KEY = 'agro_orchard_area';
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
})();
const area = ref(saved?.area ?? 1);
const areaUnit = ref(saved?.unit === 'сотки' ? 'сотки' : 'га');
watch([area, areaUnit], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ area: area.value, unit: areaUnit.value }));
  } catch {
    /* площа просто не запам'ятається */
  }
});
const areaHa = computed(() => {
  const v = Number(String(area.value).replace(',', '.'));
  if (!Number.isFinite(v) || v <= 0) return 0;
  return areaUnit.value === 'га' ? v : v / 100;
});

const products = ref({});
const loading = ref(true);
const error = ref('');
// Позначені «за потреби» позиції та вимкнені обов'язкові: ключ «етап:артикул»
const toggled = ref(new Set());

const month = new Date().getMonth() + 1;
const currentPhase = ORCHARD_PHASES.find((p) => p.months.includes(month))?.key
  || (month === 12 || month <= 2 ? 'dormant' : null);

onMounted(async () => {
  const skus = [...new Set([...ORCHARD_PHASES.flatMap((p) => p.items.map((i) => i.sku)), ...ORCHARD_TOOLS])];
  try {
    const data = await api.get('/products', { skus: skus.join(','), limit: 48 });
    products.value = Object.fromEntries(data.items.map((p) => [p.sku, p]));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

const fmt = (n) => n.toLocaleString('uk-UA', { maximumFractionDigits: n < 10 ? 2 : 0 });

// Розрахунок одного рядка програми: скільки потрібно, скільки упаковок і за яку ціну
function calc(item, p) {
  const times = item.times || 1;
  const [amountUnit, basis] = (p.rate_unit || '').split('/');
  let packs = 1;
  let need = null;
  let rate = null;
  if (item.perHa != null) {
    packs = Math.max(1, Math.ceil(item.perHa * areaHa.value - 1e-9));
  } else if ((item.rate ?? p.rate_max) && basis === 'га' && p.package_size) {
    rate = item.rate ?? p.rate_max;
    need = rate * areaHa.value * times;
    packs = Math.max(1, Math.ceil(need / p.package_size - 1e-9));
  }
  const price = unitPrice(p.price, p.price_tiers, packs);
  // Скільки соток можна обробити однією упаковкою — корисно для маленьких садів
  const sotokPerPack = rate && p.package_size ? (p.package_size / rate) * 100 : null;
  return {
    times,
    rate,
    rateText: rate ? `${fmt(rate)} ${p.rate_unit}` : '',
    needText: need != null ? `${fmt(need)} ${amountUnit}` : `${packs} ${p.unit}`,
    packs,
    cost: price == null ? null : price * packs,
    sotokPerPack,
  };
}

const phases = computed(() =>
  ORCHARD_PHASES.map((phase) => {
    const rows = phase.items
      .map((item) => {
        const p = products.value[item.sku];
        if (!p) return null;
        const key = `${phase.key}:${item.sku}`;
        const selected = item.optional ? toggled.value.has(key) : !toggled.value.has(key);
        return { item, p, key, selected, ...calc(item, p) };
      })
      .filter(Boolean);
    const chosen = rows.filter((r) => r.selected);
    return {
      ...phase,
      rows,
      treatments: Math.max(0, ...chosen.map((r) => r.times)),
      total: chosen.reduce((s, r) => s + (r.cost ?? 0), 0),
      chosen,
    };
  }),
);

// Підсумок сезону: однакові препарати з різних етапів складаємо разом
const season = computed(() => {
  const need = new Map();
  for (const ph of phases.value) {
    for (const r of ph.chosen) {
      const entry = need.get(r.p.id) || { p: r.p, amount: 0, packs: 0, unitsOnly: r.rate == null };
      if (r.rate != null) entry.amount += r.rate * areaHa.value * r.times;
      else entry.packs += r.packs;
      need.set(r.p.id, entry);
    }
  }
  const lines = [...need.values()].map((e) => {
    const packs = e.unitsOnly ? e.packs : Math.max(1, Math.ceil(e.amount / e.p.package_size - 1e-9));
    const price = unitPrice(e.p.price, e.p.price_tiers, packs);
    return { p: e.p, packs, cost: price == null ? null : price * packs };
  });
  return {
    lines,
    total: lines.reduce((s, l) => s + (l.cost ?? 0), 0),
    treatments: phases.value.reduce((s, ph) => s + ph.treatments, 0),
  };
});

function toggle(key) {
  const set = new Set(toggled.value);
  set.has(key) ? set.delete(key) : set.add(key);
  toggled.value = set;
}

function addLines(lines, label) {
  const valid = lines.filter((l) => l.packs > 0);
  if (!areaHa.value) {
    toast.error('Вкажіть площу саду');
    return;
  }
  for (const l of valid) cart.add(l.p, l.packs);
  toast.success(`${label}: додано ${valid.length} ${valid.length === 1 ? 'товар' : 'товарів'} у кошик`);
}

const addPhase = (ph) => addLines(ph.chosen, ph.title);
const addSeason = () => addLines(season.value.lines, 'Програма на сезон');

const tools = computed(() => ORCHARD_TOOLS.map((sku) => products.value[sku]).filter(Boolean));

function scrollToPhase(key) {
  document.getElementById(`phase-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div>
    <section class="page-hero orchard-hero">
      <div class="container orchard-hero__grid">
        <div>
          <nav class="breadcrumbs">
            <RouterLink to="/">Головна</RouterLink>
            <span>Яблуневий сад</span>
          </nav>
          <span class="eyebrow">Яблуневий сад</span>
          <h1>Програма захисту яблуні на&nbsp;сезон</h1>
          <p class="lead">
            Від сплячих бруньок до листопаду: що, коли і скільки обприскувати проти парші, плодожерки, кліщів
            і гнилей. Вкажіть площу саду — порахуємо препарати й вартість.
          </p>
          <div class="orchard-hero__links">
            <RouterLink :to="{ name: 'catalog', query: { crop: 'Яблуня' } }" class="btn btn--outline btn--sm">
              Усі товари для яблуні <AppIcon name="arrow-right" :size="16" />
            </RouterLink>
            <RouterLink to="/catalog/seedlings" class="btn btn--ghost btn--sm"><AppIcon name="trees" :size="16" /> Саджанці</RouterLink>
          </div>
        </div>

        <aside class="calc card">
          <h2><AppIcon name="calculator" :size="20" /> Розрахунок на ваш сад</h2>
          <div class="calc__area">
            <label class="sr-only" for="orchard-area">Площа саду</label>
            <input id="orchard-area" v-model="area" class="input" type="number" min="0" step="any" inputmode="decimal" />
            <div class="seg" role="group" aria-label="Одиниця площі">
              <button v-for="u in ['сотки', 'га']" :key="u" type="button" :class="{ active: areaUnit === u }" @click="areaUnit = u">{{ u }}</button>
            </div>
          </div>
          <dl class="calc__sum">
            <div><dt>Обробок за сезон</dt><dd>≈ {{ season.treatments }}</dd></div>
            <div><dt>Препарати й добрива</dt><dd>{{ formatPrice(season.total) }}</dd></div>
          </dl>
          <button class="btn btn--block" type="button" :disabled="loading || !areaHa" @click="addSeason">
            <AppIcon name="shopping-cart" :size="18" /> Додати всю програму в кошик
          </button>
          <p class="calc__note">Розрахунок за верхньою нормою з етикетки, з округленням до цілих упаковок.</p>
          <p v-if="areaHa && areaHa < 0.5" class="calc__small">
            <AppIcon name="users" :size="16" />
            Для невеликого саду однієї упаковки вистачить на кілька сезонів або на кількох сусідів —
            об'єднуйтеся для спільної закупівлі чи запитайте менеджера про дрібну фасовку.
          </p>
        </aside>
      </div>
    </section>

    <div class="container">
      <nav class="phase-nav" aria-label="Етапи сезону">
        <button
          v-for="(ph, i) in phases"
          :key="ph.key"
          type="button"
          class="chip"
          :class="{ active: ph.key === currentPhase }"
          @click="scrollToPhase(ph.key)"
        >
          {{ i + 1 }}. {{ ph.title }}
        </button>
      </nav>

      <p v-if="error" class="alert alert--error">{{ error }}</p>

      <ol class="timeline">
        <li v-for="(ph, i) in phases" :id="`phase-${ph.key}`" :key="ph.key" class="phase" :class="{ 'phase--now': ph.key === currentPhase }">
          <span class="phase__dot"><AppIcon :name="ph.icon" :size="20" /></span>
          <article class="phase__card card">
            <header class="phase__head">
              <div>
                <div class="phase__meta">
                  <span class="badge badge--gray">Етап {{ i + 1 }}</span>
                  <span class="phase__period"><AppIcon name="calendar-days" :size="15" /> {{ ph.period }}</span>
                  <span v-if="ph.key === currentPhase" class="badge badge--yellow">Актуально зараз</span>
                </div>
                <h2>{{ ph.title }}</h2>
                <p class="muted">{{ ph.goal }}</p>
              </div>
            </header>

            <ul v-if="ph.warnings.length" class="phase__warn">
              <li v-for="w in ph.warnings" :key="w"><AppIcon name="alert" :size="16" /> {{ w }}</li>
            </ul>

            <div v-if="loading" class="skeleton" style="height: 120px" />
            <ul v-else class="rows">
              <li v-for="r in ph.rows" :key="r.key" class="row" :class="{ 'row--off': !r.selected }">
                <label class="row__check">
                  <input type="checkbox" :checked="r.selected" @change="toggle(r.key)" />
                  <span class="sr-only">Враховувати {{ r.p.name }}</span>
                </label>
                <RouterLink :to="`/product/${r.p.slug}`" class="row__img">
                  <ProductImage :src="r.p.image_url" :alt="r.p.name" :icon="r.p.category?.icon || 'sprout'" cover />
                </RouterLink>
                <div class="row__main">
                  <RouterLink :to="`/product/${r.p.slug}`" class="row__name">{{ r.p.name }}</RouterLink>
                  <span class="row__why">
                    {{ r.item.why }}
                    <span v-if="r.item.optional" class="badge badge--blue">за потреби</span>
                  </span>
                  <span class="row__rate muted">
                    <template v-if="r.rateText">{{ r.rateText }}<template v-if="r.times > 1"> × {{ r.times }} обробки</template> · </template>
                    {{ r.p.packaging || r.p.unit }}
                    <template v-if="r.sotokPerPack && areaHa < 0.5"> · 1 упаковки вистачить на ≈ {{ fmt(r.sotokPerPack / r.times) }} сот.</template>
                  </span>
                </div>
                <div class="row__calc">
                  <span class="muted">потрібно {{ r.needText }}</span>
                  <strong>{{ r.packs }} × {{ r.p.unit }}</strong>
                  <span>{{ r.cost == null ? 'ціна за запитом' : formatPrice(r.cost) }}</span>
                </div>
              </li>
            </ul>

            <footer class="phase__foot">
              <span>Етап: <strong>{{ formatPrice(ph.total) }}</strong></span>
              <button class="btn btn--outline btn--sm" type="button" :disabled="!ph.chosen.length || !areaHa" @click="addPhase(ph)">
                <AppIcon name="shopping-cart" :size="16" /> Додати етап у кошик
              </button>
            </footer>
          </article>
        </li>
      </ol>
    </div>

    <section class="section section--sand">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">Перед сезоном</span>
            <h2>Обприскувачі та садовий інвентар</h2>
          </div>
          <RouterLink to="/catalog/orchard" class="link-arrow">Усе для саду <AppIcon name="arrow-right" :size="18" /></RouterLink>
        </div>
        <div class="products-grid">
          <ProductCard v-for="p in tools" :key="p.id" :product="p" />
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">Поради агронома</span>
            <h2>Чотири правила здорового саду</h2>
          </div>
        </div>
        <div class="rules">
          <div v-for="rule in ORCHARD_RULES" :key="rule.title" class="rule">
            <span class="rule__icon"><AppIcon :name="rule.icon" :size="22" /></span>
            <h3>{{ rule.title }}</h3>
            <p>{{ rule.text }}</p>
          </div>
        </div>
        <p class="disclaimer muted">
          Схема орієнтовна й підходить для більшості сортів у Лісостепу. Терміни зсуваються залежно від погоди та регіону.
          Перед застосуванням читайте етикетку препарату й дотримуйтеся строків очікування.
        </p>
      </div>
    </section>

    <section class="section section--soft">
      <div class="container consult">
        <div>
          <span class="eyebrow">Консультація</span>
          <h2>Складемо схему саме для вашого саду</h2>
          <p class="muted">
            Розкажіть про сорти, вік дерев і що турбувало торік — агроном підбере препарати під ваш бюджет і
            розрахує потребу. Можна надіслати фото уражених листків чи плодів.
          </p>
          <RouterLink to="/articles" class="link-arrow">Читати статті про сад <AppIcon name="arrow-right" :size="16" /></RouterLink>
        </div>
        <div class="card card--pad">
          <RequestForm type="consultation" submit-text="Отримати схему захисту" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-hero { background: var(--c-sand); padding: 4px 0 44px; }
.lead { font-size: 17px; color: var(--c-muted); max-width: 640px; }
.orchard-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 40px;
  align-items: end;
}
.orchard-hero__links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }

.calc { padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); }
.calc h2 { display: flex; align-items: center; gap: 8px; font-size: 19px; margin: 0 0 16px; }
.calc h2 .icon { color: var(--c-primary); }
.calc__area { display: flex; gap: 8px; }
.calc__area .input { flex: 1; min-width: 0; font-size: 18px; font-weight: 600; }
.seg { display: flex; padding: 4px; border-radius: 999px; background: #f0f2ec; flex-shrink: 0; }
.seg button {
  border: 0;
  background: transparent;
  padding: 0 16px;
  border-radius: 999px;
  font: 600 14px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
}
.seg button.active { background: #fff; color: var(--c-text); box-shadow: var(--shadow-xs); }
.calc__sum { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }
.calc__sum div { padding: 12px 14px; border-radius: 12px; background: var(--c-primary-soft); }
.calc__sum dt { font-size: 12px; color: var(--c-muted); }
.calc__sum dd { margin: 2px 0 0; font: 800 20px var(--font-head); color: var(--c-text); }
.calc__note { margin: 10px 0 0; font-size: 12px; color: var(--c-muted); }
.calc__small { display: flex; gap: 8px; margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--c-accent-light); font-size: 13px; color: #6b4a0b; }
.calc__small .icon { flex-shrink: 0; margin-top: 2px; }

.phase-nav {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 24px 0 8px;
  scrollbar-width: none;
}
.phase-nav .chip { white-space: nowrap; flex-shrink: 0; }

.timeline { list-style: none; margin: 16px 0 72px; padding: 0; position: relative; }
.timeline::before {
  content: '';
  position: absolute;
  left: 23px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  background: var(--c-border);
}
.phase { position: relative; display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 16px; margin-bottom: 20px; scroll-margin-top: calc(var(--header-h) + 16px); }
.phase__dot {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  border: 2px solid var(--c-border);
  color: var(--c-primary);
}
.phase--now .phase__dot { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.phase__card { padding: 22px 24px; }
.phase--now .phase__card { border: 2px solid var(--c-primary); }
.phase__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.phase__period { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; }
.phase__head h2 { font-size: 22px; margin: 0 0 4px; }
.phase__head p { margin: 0; }
.phase__warn { list-style: none; margin: 14px 0 0; padding: 12px 14px; border-radius: 12px; background: var(--c-accent-light); display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: #6b4a0b; }
.phase__warn li { display: flex; gap: 8px; align-items: flex-start; }
.phase__warn .icon { flex-shrink: 0; margin-top: 2px; }

.rows { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.row {
  display: grid;
  grid-template-columns: 24px 56px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 10px 14px 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  transition: opacity 0.2s;
}
.row--off { opacity: 0.55; }
.row__check input { width: 18px; height: 18px; accent-color: var(--c-primary); }
.row__img { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; background: #f6f7f3; }
.row__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row__name { font-weight: 700; color: var(--c-text); }
.row__name:hover { color: var(--c-primary); }
.row__why { font-size: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.row__rate { font-size: 13px; }
.row__calc { display: flex; flex-direction: column; align-items: flex-end; text-align: right; font-size: 14px; white-space: nowrap; }
.row__calc .muted { font-size: 12px; }
.phase__foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }

.rules { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.rule { padding: 24px; border-radius: var(--radius-lg); background: var(--c-sand); }
.rule__icon { width: 48px; height: 48px; margin-bottom: 16px; border-radius: 14px; display: grid; place-items: center; background: #fff; color: var(--c-primary); }
.rule h3 { font-size: 17px; }
.rule p { margin: 0; font-size: 14px; color: var(--c-muted); }
.disclaimer { font-size: 13px; margin-top: 24px; max-width: 760px; }

.consult { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 40px; align-items: center; }


@media (max-width: 1000px) {
  .orchard-hero__grid, .consult { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .rules { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .timeline::before { left: 15px; }
  .phase { grid-template-columns: 32px minmax(0, 1fr); gap: 10px; }
  .phase__dot { width: 32px; height: 32px; }
  .phase__dot .icon { width: 16px; height: 16px; }
  .phase__card { padding: 16px; }
  .phase__head h2 { font-size: 19px; }
  .row { grid-template-columns: 22px minmax(0, 1fr); gap: 10px; }
  .row__img { display: none; }
  .row__calc { grid-column: 2; flex-direction: row; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; justify-content: flex-start; text-align: left; }
  .rules { grid-template-columns: 1fr; }
}
</style>
