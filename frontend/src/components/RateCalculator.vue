<script setup>
import { computed, ref, watch } from 'vue';
import { formatPrice } from '@/utils/format';
import { unitPrice } from '@/utils/pricing';
import { qty } from '@/utils/units';
import AppIcon from './AppIcon.vue';

// Калькулятор норми витрати: площа (га) або маса насіння (т) × норма → кількість упаковок
const props = defineProps({ product: { type: Object, required: true } });
const emit = defineEmits(['add']);

const numberFormat = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });
const fmt = (n) => numberFormat.format(n);

const parts = computed(() => {
  const [amountUnit = '', basis = 'га'] = (props.product.rate_unit || '').split('/');
  return { amountUnit: amountUnit.trim(), basis: basis.trim() || 'га' };
});
const perTonne = computed(() => parts.value.basis === 'т');

const area = ref(perTonne.value ? 20 : 50);
const rate = ref(props.product.rate_max ?? props.product.rate_min);

watch(
  () => props.product.id,
  () => {
    rate.value = props.product.rate_max ?? props.product.rate_min;
  },
);

const step = computed(() => {
  const span = (props.product.rate_max ?? 0) - (props.product.rate_min ?? 0);
  if (span <= 0) return 0.01;
  return span >= 50 ? 5 : span >= 5 ? 0.5 : span >= 0.5 ? 0.05 : 0.01;
});
const hasRange = computed(() => props.product.rate_max > props.product.rate_min);

const total = computed(() => Math.max(0, Number(area.value) || 0) * (Number(rate.value) || 0));
const packs = computed(() => (props.product.package_size ? Math.ceil(total.value / props.product.package_size - 1e-9) : 0));
const price = computed(() => unitPrice(props.product.price, props.product.price_tiers, packs.value));
const cost = computed(() => (price.value == null ? null : price.value * packs.value));
</script>

<template>
  <div class="calc">
    <div class="calc__head">
      <span class="calc__icon"><AppIcon name="calculator" :size="22" /></span>
      <div>
        <h3>Калькулятор норми витрати</h3>
        <p>Порахуйте, скільки потрібно на ваші {{ perTonne ? 'тонни насіння' : 'гектари' }}</p>
      </div>
    </div>

    <div class="calc__grid">
      <label class="field">
        <span class="label">{{ perTonne ? 'Маса насіння, т' : 'Площа, га' }}</span>
        <input v-model.number="area" class="input" type="number" min="0" step="1" inputmode="decimal" />
      </label>
      <label class="field">
        <span class="label">Норма, {{ product.rate_unit }}</span>
        <input v-model.number="rate" class="input" type="number" min="0" :step="step" inputmode="decimal" />
      </label>
    </div>
    <div v-if="hasRange" class="calc__range">
      <input v-model.number="rate" type="range" :min="product.rate_min" :max="product.rate_max" :step="step" aria-label="Норма витрати" />
      <div class="calc__range-labels">
        <span>{{ fmt(product.rate_min) }}</span>
        <span>рекомендовано {{ fmt(product.rate_min) }}–{{ fmt(product.rate_max) }} {{ product.rate_unit }}</span>
        <span>{{ fmt(product.rate_max) }}</span>
      </div>
    </div>

    <div class="calc__result">
      <div>
        <span>Потрібно препарату</span>
        <strong>{{ fmt(total) }} {{ parts.amountUnit }}</strong>
      </div>
      <div v-if="packs">
        <span>Упаковок ({{ product.packaging || product.unit }})</span>
        <strong>{{ qty(packs, product.unit) }}</strong>
      </div>
      <div v-if="packs && cost != null">
        <span>Орієнтовна вартість</span>
        <strong>{{ formatPrice(cost) }}</strong>
      </div>
    </div>

    <button v-if="packs" class="btn btn--block" type="button" @click="emit('add', packs)">
      <AppIcon name="shopping-cart" :size="18" /> Додати {{ qty(packs, product.unit) }} в кошик
    </button>
    <p class="calc__note">Розрахунок орієнтовний. Точну норму уточнюйте в інструкції або в нашого агронома.</p>
  </div>
</template>

<style scoped>
.calc {
  padding: 28px;
  border-radius: var(--radius-lg);
  background: var(--c-sand);
}
.calc__head { display: flex; gap: 14px; align-items: center; margin-bottom: 20px; }
.calc__head h3 { margin: 0; }
.calc__head p { margin: 2px 0 0; font-size: 14px; color: var(--c-muted); }
.calc__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--c-primary);
  flex-shrink: 0;
}
.calc__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.calc__range { margin-top: 14px; }
.calc__range input { width: 100%; accent-color: var(--c-primary); }
.calc__range-labels { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--c-muted); }
.calc__result {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 20px 0 16px;
}
.calc__result > div {
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.calc__result span { font-size: 12px; color: var(--c-muted); }
.calc__result strong { font: 800 20px var(--font-head); letter-spacing: -0.02em; }
.calc__note { margin: 10px 0 0; font-size: 12px; color: var(--c-muted); }
@media (max-width: 560px) {
  .calc { padding: 20px; }
}
</style>
