<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  pages: { type: Number, required: true },
});
const emit = defineEmits(['change']);

// 1 … 4 5 [6] 7 8 … 20
const items = computed(() => {
  const { page, pages } = props;
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) result.push('…');
    result.push(p);
  });
  return result;
});
</script>

<template>
  <nav v-if="pages > 1" class="pager" aria-label="Сторінки">
    <button :disabled="page <= 1" @click="emit('change', page - 1)">‹</button>
    <template v-for="(p, i) in items" :key="i">
      <span v-if="p === '…'" class="pager__gap">…</span>
      <button v-else :class="{ active: p === page }" @click="emit('change', p)">{{ p }}</button>
    </template>
    <button :disabled="page >= pages" @click="emit('change', page + 1)">›</button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 32px;
  flex-wrap: wrap;
}
.pager button {
  min-width: 40px;
  height: 40px;
  padding: 0 10px;
  border: 1.5px solid var(--c-border);
  border-radius: 10px;
  background: #fff;
  color: var(--c-text);
  font: 600 14px var(--font-body);
  cursor: pointer;
}
.pager button:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
.pager button.active { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.pager button:disabled { opacity: 0.4; cursor: default; }
.pager__gap { align-self: center; color: var(--c-muted); }
</style>
