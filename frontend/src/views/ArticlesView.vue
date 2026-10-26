<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { formatDate } from '@/utils/format';
import ProductImage from '@/components/ProductImage.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const result = ref({ items: [], page: 1, pages: 1 });
const loading = ref(true);
const error = ref('');

const tags = computed(() => {
  const set = new Set();
  for (const a of result.value.items) for (const t of a.tags.split(',')) if (t.trim()) set.add(t.trim());
  return [...set];
});

async function load() {
  loading.value = true;
  try {
    result.value = await api.get('/articles', { page: route.query.page, tag: route.query.tag });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch(() => route.fullPath, () => route.name === 'articles' && load(), { immediate: true });
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs">
          <RouterLink to="/">Головна</RouterLink>
          <span>Поради агронома</span>
        </nav>
        <span class="eyebrow">Блог</span>
        <h1>Поради агронома</h1>
        <p class="lead">Практичні статті про захист рослин, живлення та технології вирощування польових культур.</p>
        <div v-if="tags.length || route.query.tag" class="tags">
          <RouterLink to="/articles" class="chip" :class="{ active: !route.query.tag }">Усі</RouterLink>
          <RouterLink
            v-for="t in tags"
            :key="t"
            :to="{ name: 'articles', query: { tag: t } }"
            class="chip"
            :class="{ active: route.query.tag === t }"
          >
            {{ t }}
          </RouterLink>
        </div>
      </div>
    </section>

    <div class="container">
      <div v-if="loading" class="grid">
        <div v-for="i in 3" :key="i" class="skeleton" style="height: 380px" />
      </div>
      <div v-else-if="error" class="alert alert--error">{{ error }}</div>
      <div v-else-if="!result.items.length" class="empty">
        <div class="empty__icon"><AppIcon name="book-open" :size="30" /></div>
        Статей поки немає
      </div>
      <div v-else class="grid">
        <RouterLink
          v-for="(a, i) in result.items"
          :key="a.id"
          v-reveal="(i % 3) * 80"
          :to="`/articles/${a.slug}`"
          class="acard"
          :class="{ 'acard--wide': i === 0 && result.page === 1 && !route.query.tag }"
        >
          <div class="acard__img">
            <ProductImage :src="a.cover_url" :alt="a.title" icon="book-open" cover />
          </div>
          <div class="acard__body">
            <div class="acard__meta">
              <span>{{ formatDate(a.published_at).split(',')[0] }}</span>
              <span v-if="a.tags" class="acard__tag">{{ a.tags.split(',')[0] }}</span>
            </div>
            <h2>{{ a.title }}</h2>
            <p>{{ a.excerpt }}</p>
            <span class="link-arrow">Читати <AppIcon name="arrow-right" :size="16" /></span>
          </div>
        </RouterLink>
      </div>
      <PaginationBar :page="result.page" :pages="result.pages" @change="(p) => router.push({ query: { ...route.query, page: p } })" />
    </div>
  </div>
</template>

<style scoped>
.page-hero { background: var(--c-sand); padding: 4px 0 40px; margin-bottom: 40px; }
.lead { font-size: 17px; color: var(--c-muted); max-width: 640px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.acard {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: #fff;
  box-shadow: 0 0 0 1px var(--c-border);
  overflow: hidden;
  color: var(--c-text);
  transition: box-shadow 0.3s var(--ease), transform 0.3s var(--ease);
}
.acard:hover { box-shadow: var(--shadow-lg); transform: translateY(-4px); color: var(--c-text); }
.acard__img { aspect-ratio: 16 / 10; background: var(--c-primary-light); }
.acard__body { padding: 22px 24px 26px; display: flex; flex-direction: column; flex: 1; }
.acard__meta { display: flex; gap: 10px; align-items: center; font-size: 13px; color: var(--c-muted); }
.acard__tag { color: var(--c-accent-hover); font-weight: 600; }
.acard h2 { font-size: 20px; margin: 8px 0; }
.acard p { color: var(--c-muted); font-size: 14px; flex: 1; }
.acard .link-arrow { color: var(--c-primary); }
.acard--wide { grid-column: 1 / -1; flex-direction: row; }
.acard--wide .acard__img { flex: 1.2; aspect-ratio: auto; min-height: 340px; }
.acard--wide .acard__body { flex: 1; padding: 40px; justify-content: center; }
.acard--wide h2 { font-size: 30px; }
.acard--wide p { flex: 0; font-size: 16px; }
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr 1fr; }
  .acard--wide { flex-direction: column; }
  .acard--wide .acard__img { min-height: 0; aspect-ratio: 16 / 9; }
  .acard--wide .acard__body { padding: 24px; }
  .acard--wide h2 { font-size: 22px; }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
