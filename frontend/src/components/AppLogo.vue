<script setup>
import { SHOP } from '@/config';

defineProps({ light: Boolean });
</script>

<template>
  <RouterLink to="/" class="logo" :class="{ 'logo--light': light }" :aria-label="`${SHOP.name} — на головну`">
    <svg class="logo__icon" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" class="logo__bg" />
      <path d="M20 31V17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      <path d="M20 22c-5 0-8.5-3.5-8.5-8.5 5 0 8.5 3.5 8.5 8.5Z" fill="currentColor" />
      <path d="M20 19c0-5 3.5-8.5 8.5-8.5 0 5-3.5 8.5-8.5 8.5Z" fill="#d9a441" />
    </svg>
    <span class="logo__text">{{ SHOP.name }}</span>
  </RouterLink>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  flex-shrink: 0;
}
.logo__icon { width: 40px; height: 40px; }
.logo__bg { fill: var(--c-primary); }
.logo__text {
  font: 800 20px/1 var(--font-head);
  letter-spacing: -0.03em;
  color: var(--c-text);
}
.logo--light .logo__bg { fill: rgba(255, 255, 255, 0.12); }
.logo--light .logo__text { color: #fff; }
</style>
