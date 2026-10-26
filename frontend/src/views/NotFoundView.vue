<script setup>
import AppIcon from '@/components/AppIcon.vue';
</script>

<template>
  <div class="container">
    <div class="empty nf">
      <div class="empty__icon"><AppIcon name="wheat" :size="32" /></div>
      <h1>404 — сторінку не знайдено</h1>
      <p>Можливо, сторінку було переміщено або видалено.</p>
      <RouterLink to="/" class="btn">На головну</RouterLink>
      <RouterLink to="/catalog" class="btn btn--outline">До каталогу</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.nf { padding: 80px 16px; }
.nf .btn { margin: 0 6px; }
</style>
