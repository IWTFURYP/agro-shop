<script setup>
import { ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';

// Показує фото за посиланням або акуратну заглушку, якщо фото ще немає / не завантажилось
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  icon: { type: String, default: 'sprout' },
  cover: Boolean,
});

const failed = ref(false);
watch(() => props.src, () => (failed.value = false));
</script>

<template>
  <div class="pimg">
    <img v-if="src && !failed" :src="src" :alt="alt" :class="{ cover }" loading="lazy" @error="failed = true" />
    <div v-else class="pimg__placeholder" role="img" :aria-label="alt || 'Фото незабаром'">
      <span class="pimg__icon"><AppIcon :name="icon" :size="28" :stroke-width="1.5" /></span>
      <span class="pimg__text">Фото незабаром</span>
    </div>
  </div>
</template>

<style scoped>
.pimg {
  container-type: size;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.pimg img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.pimg img.cover { object-fit: cover; }
.pimg__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 50% 40%, #fff 0%, transparent 65%),
    linear-gradient(160deg, #f4f6f0, #ebefe6);
  color: var(--c-primary);
}
.pimg__icon {
  width: min(64px, 40cqmin);
  height: min(64px, 40cqmin);
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  box-shadow: 0 4px 14px -6px rgba(24, 34, 26, 0.2);
}
.pimg__icon :deep(svg) { width: 45%; height: 45%; }
.pimg__text { font-size: 12px; color: var(--c-muted); }
@container (max-width: 120px) {
  .pimg__text { display: none; }
}
</style>
