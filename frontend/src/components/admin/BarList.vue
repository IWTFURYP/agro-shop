<script setup>
import { computed } from 'vue';

// Горизонтальні смуги для рейтингів (топ товарів, категорії):
// назва та значення — текстом, смуга лише показує пропорцію.
const props = defineProps({
  items: { type: Array, required: true }, // [{ label, value, sub }]
  format: { type: Function, default: (v) => String(v) },
});

const max = computed(() => Math.max(...props.items.map((i) => i.value), 1));
</script>

<template>
  <ol class="bars">
    <li v-for="(item, i) in items" :key="i" class="row" :title="`${item.label}: ${format(item.value)}`">
      <div class="row__text">
        <span class="row__label">{{ item.label }}</span>
        <strong class="row__value">{{ format(item.value) }}</strong>
      </div>
      <div class="row__track"><span class="row__bar" :style="{ width: `${(item.value / max) * 100}%` }" /></div>
      <small v-if="item.sub" class="row__sub">{{ item.sub }}</small>
    </li>
  </ol>
</template>

<style scoped>
.bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.row__text { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.row__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row__value { flex-shrink: 0; font-family: var(--font-head); }
.row__track { height: 8px; margin-top: 5px; border-radius: 4px; background: #f0f2ec; }
.row__bar { display: block; height: 100%; min-width: 2px; border-radius: 0 4px 4px 0; background: var(--c-chart, #2e8b47); }
.row__sub { display: block; margin-top: 3px; font-size: 12px; color: var(--c-muted); }
</style>
