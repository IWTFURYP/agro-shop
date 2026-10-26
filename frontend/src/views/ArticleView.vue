<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { SHOP } from '@/config';
import { formatDate } from '@/utils/format';
import { renderMarkdown } from '@/utils/markdown';
import { setSeo } from '@/composables/useSeo';
import ProductImage from '@/components/ProductImage.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const article = ref(null);
const loading = ref(true);
const error = ref('');

const html = computed(() => renderMarkdown(article.value?.content));
const readingTime = computed(() => Math.max(1, Math.round((article.value?.content || '').split(/\s+/).length / 180)));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const a = await api.get(`/articles/${route.params.slug}`);
    article.value = a;
    setSeo({
      title: a.title,
      description: a.excerpt,
      image: a.cover_url,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.excerpt,
        image: a.cover_url || undefined,
        datePublished: a.published_at.replace(' ', 'T') + 'Z',
        dateModified: a.updated_at.replace(' ', 'T') + 'Z',
        author: { '@type': 'Organization', name: SHOP.name },
        publisher: { '@type': 'Organization', name: SHOP.name },
      },
    });
  } catch (err) {
    error.value = err.status === 404 ? 'Статтю не знайдено' : err.message;
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.slug, (slug) => slug && load(), { immediate: true });
</script>

<template>
  <div v-if="loading" class="container narrow"><div class="skeleton" style="height: 420px; margin-top: 40px" /></div>
  <div v-else-if="error" class="container empty">
    <div class="empty__icon"><AppIcon name="book-open" :size="30" /></div>
    <h2>{{ error }}</h2>
    <RouterLink to="/articles" class="btn">Усі статті</RouterLink>
  </div>
  <article v-else-if="article">
    <header class="container narrow">
      <nav class="breadcrumbs">
        <RouterLink to="/">Головна</RouterLink>
        <span><RouterLink to="/articles">Поради агронома</RouterLink></span>
      </nav>
      <div class="meta">
        <RouterLink
          v-for="t in article.tags.split(',').filter((x) => x.trim())"
          :key="t"
          :to="{ name: 'articles', query: { tag: t.trim() } }"
          class="badge badge--yellow"
        >
          {{ t.trim() }}
        </RouterLink>
      </div>
      <h1>{{ article.title }}</h1>
      <p class="excerpt">{{ article.excerpt }}</p>
      <p class="info muted">
        <AppIcon name="calendar-days" :size="16" /> {{ formatDate(article.published_at).split(',')[0] }}
        <span>·</span>
        <AppIcon name="clock" :size="16" /> {{ readingTime }} хв читання
      </p>
    </header>

    <div v-if="article.cover_url" class="container cover-wrap">
      <div class="cover">
        <ProductImage :src="article.cover_url" :alt="article.title" icon="book-open" cover />
      </div>
    </div>

    <div class="container narrow">
      <!-- eslint-disable-next-line vue/no-v-html — HTML формується безпечним renderMarkdown -->
      <div class="prose" v-html="html" />

      <div class="cta">
        <div>
          <h3>Маєте питання щодо свого поля?</h3>
          <p>Агроном безкоштовно допоможе підібрати препарати та розрахувати потребу.</p>
        </div>
        <div class="cta__actions">
          <a :href="SHOP.phoneHref" class="btn btn--accent"><AppIcon name="phone" :size="18" /> {{ SHOP.phone }}</a>
          <RouterLink to="/problems" class="btn btn--glass">Підбір за проблемою</RouterLink>
        </div>
      </div>
    </div>

    <section v-if="article.more?.length" class="container more">
      <h2>Читайте також</h2>
      <div class="more__grid">
        <RouterLink v-for="a in article.more" :key="a.id" :to="`/articles/${a.slug}`" class="more__item">
          <div class="more__img"><ProductImage :src="a.cover_url" :alt="a.title" icon="book-open" cover /></div>
          <h3>{{ a.title }}</h3>
        </RouterLink>
      </div>
    </section>
  </article>
</template>

<style scoped>
.narrow { max-width: 800px; }
.meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
h1 { font-size: clamp(30px, 4.5vw, 48px); line-height: 1.1; }
.excerpt { font-size: 19px; color: var(--c-muted); line-height: 1.6; }
.info { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.cover-wrap { max-width: 1060px; margin: 32px auto 40px; }
.cover { aspect-ratio: 16 / 8; border-radius: var(--radius-lg); overflow: hidden; background: var(--c-primary-light); }
.cta {
  margin: 48px 0 0;
  padding: 32px;
  border-radius: var(--radius-lg);
  background: linear-gradient(140deg, #2f6b3c, #1b3f25);
  color: #d8e4d5;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}
.cta h3 { color: #fff; margin-bottom: 6px; }
.cta p { margin: 0; }
.cta__actions { display: flex; gap: 10px; flex-wrap: wrap; }
.more { margin-top: 64px; }
.more__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.more__item { color: var(--c-text); }
.more__item:hover { color: var(--c-primary); }
.more__img { aspect-ratio: 16 / 10; border-radius: var(--radius); overflow: hidden; background: var(--c-primary-light); margin-bottom: 12px; }
.more__item h3 { font-size: 17px; }
@media (max-width: 760px) {
  .more__grid { grid-template-columns: 1fr; }
  .cta { padding: 24px; }
  .cover { aspect-ratio: 16 / 10; border-radius: var(--radius); }
}
</style>
