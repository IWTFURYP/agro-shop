<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { renderMarkdown } from '@/utils/markdown';
import { useToastStore } from '@/stores/toast';
import ProductImage from '@/components/ProductImage.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const isNew = computed(() => !route.params.id);
const loading = ref(true);
const saving = ref(false);
const errors = ref({});
const preview = ref(false);

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_url: '',
  tags: '',
  is_published: true,
  published_at: '',
});

const html = computed(() => renderMarkdown(form.content));

onMounted(async () => {
  try {
    if (!isNew.value) {
      const a = await api.get(`/admin/articles/${route.params.id}`);
      Object.assign(form, { ...a, is_published: Boolean(a.is_published) });
    }
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  errors.value = {};
  try {
    const saved = isNew.value
      ? await api.post('/admin/articles', form)
      : await api.put(`/admin/articles/${route.params.id}`, form);
    toast.success('Статтю збережено');
    Object.assign(form, { slug: saved.slug, published_at: saved.published_at });
    if (isNew.value) router.replace(`/admin/articles/${saved.id}`);
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="loading" class="spinner" />
  <form v-else class="aform" novalidate @submit.prevent="save">
    <section class="card card--pad aform__main">
      <div class="field">
        <label>Заголовок <span class="req">*</span></label>
        <input v-model="form.title" class="input title-input" :class="{ invalid: errors.title }" placeholder="Напр. Як захистити пшеницю від септоріозу" />
        <span v-if="errors.title" class="error">{{ errors.title }}</span>
      </div>
      <div class="field">
        <label>Короткий опис (показується в списку статей і в Google)</label>
        <textarea v-model="form.excerpt" class="textarea" rows="2" maxlength="500" />
        <span class="hint">{{ form.excerpt.length }}/160 символів оптимально для Google</span>
      </div>
      <div class="field">
        <div class="content-head">
          <label>Текст статті</label>
          <div class="switch">
            <button type="button" :class="{ active: !preview }" @click="preview = false">Редагування</button>
            <button type="button" :class="{ active: preview }" @click="preview = true">Перегляд</button>
          </div>
        </div>
        <textarea v-if="!preview" v-model="form.content" class="textarea content" rows="22" />
        <!-- eslint-disable-next-line vue/no-v-html — HTML формується безпечним renderMarkdown -->
        <div v-else class="prose preview" v-html="html" />
        <details class="help">
          <summary>Як форматувати текст</summary>
          <ul>
            <li><code>## Заголовок</code> — підзаголовок розділу, <code>### Менший заголовок</code></li>
            <li><code>- пункт</code> — список, <code>1. пункт</code> — нумерований список</li>
            <li><code>**жирний**</code>, <code>*курсив*</code>, <code>&gt; цитата</code></li>
            <li><code>[текст посилання](/catalog/fungicides)</code> — посилання на сторінку сайту або <code>https://…</code></li>
            <li>Порожній рядок — новий абзац</li>
          </ul>
        </details>
      </div>
    </section>

    <aside class="aform__side">
      <section class="card card--pad side-fields">
        <label class="checkbox"><input v-model="form.is_published" type="checkbox" /> Опубліковано</label>
        <div class="field">
          <label>Дата публікації</label>
          <input v-model="form.published_at" class="input" :class="{ invalid: errors.published_at }" placeholder="автоматично" />
          <span v-if="errors.published_at" class="error">{{ errors.published_at }}</span>
        </div>
        <div class="field">
          <label>Теги (через кому)</label>
          <input v-model="form.tags" class="input" placeholder="Пшениця, Хвороби" />
        </div>
        <div class="field">
          <label>Slug (адреса)</label>
          <input v-model="form.slug" class="input" placeholder="автоматично" />
        </div>
        <div class="field">
          <label>Посилання на обкладинку</label>
          <div class="cover"><ProductImage :src="form.cover_url" icon="image" cover /></div>
          <input v-model.trim="form.cover_url" class="input" :class="{ invalid: errors.cover_url }" placeholder="https://…" />
          <span v-if="errors.cover_url" class="error">{{ errors.cover_url }}</span>
        </div>
      </section>
      <button class="btn btn--lg btn--block" :disabled="saving">{{ saving ? 'Збереження…' : 'Зберегти' }}</button>
      <RouterLink to="/admin/articles" class="btn btn--ghost btn--block">← До списку</RouterLink>
      <a v-if="!isNew && form.is_published && form.slug" :href="`/articles/${form.slug}`" target="_blank" class="btn btn--outline btn--block">Переглянути на сайті</a>
    </aside>
  </form>
</template>

<style scoped>
.aform { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.aform__main { display: flex; flex-direction: column; gap: 18px; }
.aform__side { position: sticky; top: 20px; display: flex; flex-direction: column; gap: 10px; }
.side-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 6px; }
.title-input { font: 700 20px var(--font-head); }
.content { font-family: ui-monospace, Consolas, monospace; font-size: 14px; line-height: 1.6; }
.content-head { display: flex; justify-content: space-between; align-items: center; }
.switch { display: flex; padding: 3px; border-radius: 999px; background: #f0f2ec; }
.switch button {
  padding: 5px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: 600 13px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
}
.switch button.active { background: #fff; color: var(--c-text); box-shadow: var(--shadow-xs); }
.preview { padding: 16px 20px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); min-height: 300px; }
.help { font-size: 13px; color: var(--c-muted); }
.help summary { cursor: pointer; font-weight: 600; }
.help code { background: var(--c-primary-soft); padding: 1px 5px; border-radius: 4px; }
.cover { aspect-ratio: 16 / 9; border-radius: var(--radius-sm); overflow: hidden; background: #f6f7f3; }
@media (max-width: 1000px) {
  .aform { grid-template-columns: 1fr; }
  .aform__side { position: static; }
}
</style>
