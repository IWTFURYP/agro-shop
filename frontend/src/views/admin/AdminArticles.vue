<script setup>
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import { formatDate } from '@/utils/format';
import { useToastStore } from '@/stores/toast';
import AppIcon from '@/components/AppIcon.vue';

const toast = useToastStore();
const articles = ref([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    articles.value = await api.get('/admin/articles');
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function remove(a) {
  if (!confirm(`Видалити статтю «${a.title}»?`)) return;
  try {
    await api.delete(`/admin/articles/${a.id}`);
    toast.success('Статтю видалено');
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <span class="muted">Статті з розділу «Поради агронома» — допомагають сайту знаходитись у Google</span>
      <span class="spacer" />
      <RouterLink to="/admin/articles/new" class="btn">+ Нова стаття</RouterLink>
    </div>
    <div class="card">
      <div v-if="loading" class="spinner" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Заголовок</th><th>Теги</th><th>Дата</th><th>Статус</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="a in articles" :key="a.id">
              <td><RouterLink :to="`/admin/articles/${a.id}`"><strong>{{ a.title }}</strong></RouterLink></td>
              <td class="muted">{{ a.tags }}</td>
              <td class="muted">{{ formatDate(a.published_at).split(',')[0] }}</td>
              <td>
                <span class="badge" :class="a.is_published ? 'badge--green' : 'badge--gray'">
                  {{ a.is_published ? 'Опубліковано' : 'Чернетка' }}
                </span>
              </td>
              <td>
                <div class="admin-actions">
                  <a v-if="a.is_published" :href="`/articles/${a.slug}`" target="_blank" class="btn btn--ghost btn--sm" title="Переглянути"><AppIcon name="eye" :size="16" /></a>
                  <RouterLink :to="`/admin/articles/${a.id}`" class="btn btn--outline btn--sm">Змінити</RouterLink>
                  <button class="btn btn--ghost btn--sm" aria-label="Видалити" @click="remove(a)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!articles.length"><td colspan="5" class="muted">Статей ще немає</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
