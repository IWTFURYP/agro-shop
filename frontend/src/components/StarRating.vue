<script setup>
import { computed, ref } from 'vue';

// Зірочки рейтингу: показ середньої оцінки або вибір оцінки (editable)
const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 16 },
  editable: Boolean,
});
const emit = defineEmits(['update:value']);

const hover = ref(0);
const shown = computed(() => hover.value || props.value || 0);
const LABELS = ['', 'Погано', 'Так собі', 'Нормально', 'Добре', 'Чудово'];

// Частка заповнення кожної зірки (для середньої оцінки на кшталт 4,5)
const fills = computed(() => [1, 2, 3, 4, 5].map((n) => Math.max(0, Math.min(1, shown.value - n + 1))));
</script>

<template>
  <span
    class="stars"
    :class="{ 'stars--edit': editable }"
    :role="editable ? 'radiogroup' : 'img'"
    :aria-label="editable ? 'Оцінка' : `Оцінка ${value} з 5`"
    @mouseleave="hover = 0"
  >
    <component
      :is="editable ? 'button' : 'span'"
      v-for="(fill, i) in fills"
      :key="i"
      class="star"
      :type="editable ? 'button' : undefined"
      :role="editable ? 'radio' : undefined"
      :aria-checked="editable ? value === i + 1 : undefined"
      :aria-label="editable ? `${i + 1} — ${LABELS[i + 1]}` : undefined"
      :style="{ width: `${size}px`, height: `${size}px` }"
      @mouseenter="editable && (hover = i + 1)"
      @click="editable && emit('update:value', i + 1)"
    >
      <svg viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true">
        <defs>
          <linearGradient :id="`star-${$.uid}-${i}`">
            <stop :offset="`${fill * 100}%`" stop-color="var(--c-accent)" />
            <stop :offset="`${fill * 100}%`" stop-color="#dfe3d8" />
          </linearGradient>
        </defs>
        <path
          :fill="`url(#star-${$.uid}-${i})`"
          d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
          stroke-linejoin="round"
        />
      </svg>
    </component>
    <span v-if="editable && shown" class="stars__label">{{ LABELS[shown] }}</span>
  </span>
</template>

<style scoped>
.stars { display: inline-flex; align-items: center; gap: 1px; vertical-align: middle; }
.star { display: inline-grid; place-items: center; padding: 0; border: 0; background: none; }
.stars--edit .star { cursor: pointer; transition: transform 0.15s; }
.stars--edit .star:hover { transform: scale(1.15); }
.stars__label { margin-left: 8px; font-size: 13px; color: var(--c-muted); }
</style>
