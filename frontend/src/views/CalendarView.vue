<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { formatPrice } from '@/utils/format';
import { formatPerHa, pricePerHa } from '@/utils/pricing';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import ProductImage from '@/components/ProductImage.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const toast = useToastStore();

const crops = ref([]);
const steps = ref([]);
const loading = ref(true);
const crop = computed(() => route.query.crop || crops.value[0]?.crop || '');

const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
const currentMonth = new Date().getMonth() + 1;

const period = (s) => (s.month_from === s.month_to ? MONTHS[s.month_from - 1] : `${MONTHS[s.month_from - 1]} – ${MONTHS[s.month_to - 1].toLowerCase()}`);

// Чи припадає поточний місяць на етап (з урахуванням переходу через Новий рік)
function isNow(s) {
  return s.month_from <= s.month_to
    ? currentMonth >= s.month_from && currentMonth <= s.month_to
    : currentMonth >= s.month_from || currentMonth <= s.month_to;
}

// Смуга на шкалі року: позиція й ширина у відсотках
function bar(s) {
  const len = ((s.month_to - s.month_from + 12) % 12) + 1;
  return { left: `${((s.month_from - 1) / 12) * 100}%`, width: `${(Math.min(len, 13 - s.month_from) / 12) * 100}%` };
}

async function loadSteps() {
  if (!crop.value) return;
  loading.value = true;
  try {
    steps.value = await api.get('/calendar', { crop: crop.value });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  crops.value = await api.get('/calendar/crops').catch(() => []);
  if (!crops.value.length) loading.value = false;
  loadSteps();
});
watch(crop, loadSteps);

function addToCart(p) {
  if (cart.add(p)) toast.success(`«${p.name}» додано в кошик`);
  else toast.error('Немає в наявності');
}

function addStep(step) {
  const n = step.products.filter((p) => cart.add(p)).length;
  if (n) toast.success(`Додано в кошик товарів: ${n}`);
  else toast.error('Товари цього етапу зараз недоступні');
}
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs">
          <RouterLink to="/">Головна</RouterLink>
          <span>Календар обробок</span>
        </nav>
        <span class="eyebrow">Технологія вирощування</span>
        <h1>Календар обробок</h1>
        <p class="lead">Оберіть культуру — покажемо, що й коли застосовувати протягом сезону, з препаратами з нашого каталогу.</p>
        <div class="crops">
          <button
            v-for="c in crops"
            :key="c.crop"
            type="button"
            class="chip"
            :class="{ active: crop === c.crop }"
            @click="router.replace({ query: { crop: c.crop } })"
          >
            {{ c.crop }} <small>{{ c.steps }}</small>
          </button>
        </div>
      </div>
    </section>

    <div class="container">
      <div v-if="steps.length" class="year card" aria-hidden="true">
        <div class="year__months">
          <span v-for="(m, i) in MONTHS" :key="m" :class="{ now: i + 1 === currentMonth }">{{ m.slice(0, 3) }}</span>
        </div>
        <div v-for="s in steps" :key="s.id" class="year__row">
          <span class="year__bar" :class="{ now: isNow(s) }" :style="bar(s)" :title="`${s.title}: ${period(s)}`" />
        </div>
      </div>

      <div v-if="loading" class="spinner" />
      <div v-else-if="!steps.length" class="empty card">Для цієї культури календар ще не заповнено.</div>
      <ol v-else class="timeline">
        <li v-for="(s, i) in steps" :key="s.id" v-reveal="(i % 3) * 60" class="step" :class="{ 'step--now': isNow(s) }">
          <div class="step__marker">
            <span class="step__icon"><AppIcon :name="s.icon || 'sprout'" :size="20" /></span>
          </div>
          <div class="step__body card">
            <div class="step__head">
              <span class="step__period"><AppIcon name="calendar-days" :size="15" /> {{ period(s) }}</span>
              <span v-if="s.stage" class="badge badge--gray">{{ s.stage }}</span>
              <span v-if="isNow(s)" class="badge badge--yellow">Актуально зараз</span>
            </div>
            <h3>{{ s.title }}</h3>
            <p class="muted">{{ s.description }}</p>
            <div v-if="s.products.length" class="step__products">
              <article v-for="p in s.products" :key="p.id" class="sp">
                <RouterLink :to="`/product/${p.slug}`" class="sp__img">
                  <ProductImage :src="p.image_url" :alt="p.name" :icon="p.category?.icon || 'sprout'" />
                </RouterLink>
                <div class="sp__info">
                  <RouterLink :to="`/product/${p.slug}`" class="sp__name">{{ p.name }}</RouterLink>
                  <small class="muted">{{ p.packaging }}</small>
                  <span class="sp__price">
                    {{ formatPrice(p.price) }}
                    <small v-if="pricePerHa(p)">{{ formatPerHa(pricePerHa(p)) }}</small>
                  </span>
                </div>
                <button
                  class="sp__add"
                  type="button"
                  :disabled="p.price != null && !p.in_stock"
                  :aria-label="`Додати ${p.name} в кошик`"
                  @click="addToCart(p)"
                >
                  <AppIcon :name="cart.has(p.id) ? 'check' : 'plus'" :size="18" />
                </button>
              </article>
              <button v-if="s.products.length > 1" class="btn btn--outline btn--sm" type="button" @click="addStep(s)">
                <AppIcon name="shopping-cart" :size="15" /> Додати весь етап у кошик
              </button>
            </div>
          </div>
        </li>
      </ol>
      <p class="muted note">
        Календар орієнтовний: строки залежать від регіону, погоди та стану посівів. Норми та сумісність препаратів
        уточнюйте за етикеткою або в нашого агронома.
      </p>
    </div>
  </div>
</template>

<style scoped>
.page-hero { background: var(--c-sand); padding: 4px 0 36px; margin-bottom: 32px; }
.lead { font-size: 17px; color: var(--c-muted); max-width: 640px; }
.crops { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.crops .chip { padding: 10px 18px; font-size: 14px; }

.year { padding: 16px 20px; margin-bottom: 32px; }
.year__months { display: grid; grid-template-columns: repeat(12, 1fr); font-size: 12px; color: var(--c-muted); margin-bottom: 8px; }
.year__months span { text-align: center; }
.year__months .now { color: var(--c-primary-dark); font-weight: 700; }
.year__row { position: relative; height: 10px; margin: 4px 0; background: repeating-linear-gradient(90deg, #f3f4ef 0 calc(100% / 12 - 2px), #fff calc(100% / 12 - 2px) calc(100% / 12)); border-radius: 4px; }
.year__bar { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: #b7cfb0; }
.year__bar.now { background: var(--c-primary); }

.timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 18px; position: relative; }
.timeline::before { content: ''; position: absolute; left: 23px; top: 8px; bottom: 8px; width: 2px; background: var(--c-border); }
.step { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 16px; }
.step__marker { position: relative; z-index: 1; }
.step__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  border: 2px solid var(--c-border);
  color: var(--c-primary);
}
.step--now .step__icon { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.step__body { padding: 20px 22px; }
.step--now .step__body { border-color: var(--c-primary); box-shadow: 0 0 0 1px var(--c-primary); }
.step__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.step__period { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; color: var(--c-primary-dark); }
.step__body h3 { margin: 10px 0 6px; font-size: 19px; }
.step__body > p { margin: 0 0 14px; }
.step__products { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.sp {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
}
.sp__img { width: 52px; height: 52px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: #f6f7f3; }
.sp__info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.sp__name { font-weight: 600; color: var(--c-text); }
.sp__info small { font-size: 12px; }
.sp__price { font-family: var(--font-head); font-weight: 700; font-size: 14px; }
.sp__price small { margin-left: 6px; font: 600 12px var(--font-body); color: var(--c-primary); }
.sp__add {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.sp__add:disabled { background: #e8eae4; color: #a3aa9c; cursor: not-allowed; }
.note { font-size: 13px; margin-top: 24px; }
@media (max-width: 560px) {
  .timeline::before { left: 17px; }
  .step { grid-template-columns: 36px minmax(0, 1fr); gap: 10px; }
  .step__icon { width: 36px; height: 36px; }
  .step__body { padding: 16px; }
  .year { display: none; }
}
</style>
