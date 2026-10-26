<script setup>
import AppIcon, { ICON_CHOICES } from '@/components/AppIcon.vue';
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api';
import { useToastStore } from '@/stores/toast';
import { useCatalogStore } from '@/stores/catalog';

const toast = useToastStore();
const catalog = useCatalogStore();
const categories = ref([]);
const loading = ref(true);
const editing = ref(null);
const errors = ref({});
const saving = ref(false);

// Батьківські категорії показуємо одразу над їхніми підкатегоріями
const ordered = computed(() => {
  const roots = categories.value.filter((c) => !c.parent_id);
  return roots.flatMap((r) => [r, ...categories.value.filter((c) => c.parent_id === r.id)]);
});

async function load() {
  loading.value = true;
  try {
    categories.value = await api.get('/admin/categories');
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function open(category = null) {
  errors.value = {};
  editing.value = category
    ? { ...category, parent_id: category.parent_id ?? '' }
    : { name: '', slug: '', parent_id: '', icon: '', description: '', image_url: '', sort_order: categories.value.length };
}

async function save() {
  saving.value = true;
  errors.value = {};
  const payload = { ...editing.value, parent_id: editing.value.parent_id || null };
  try {
    if (editing.value.id) await api.put(`/admin/categories/${editing.value.id}`, payload);
    else await api.post('/admin/categories', payload);
    toast.success('Категорію збережено');
    editing.value = null;
    load();
    catalog.loadCategories(true).catch(() => {});
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}

async function remove(category) {
  if (!confirm(`Видалити категорію «${category.name}»? Товари залишаться, але без категорії.`)) return;
  try {
    await api.delete(`/admin/categories/${category.id}`);
    toast.success('Категорію видалено');
    load();
    catalog.loadCategories(true).catch(() => {});
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <span class="muted">Категорії та підкатегорії каталогу</span>
      <span class="spacer" />
      <button class="btn" @click="open()">+ Додати категорію</button>
    </div>

    <div class="card">
      <div v-if="loading" class="spinner" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Назва</th><th>Slug</th><th>Товарів</th><th>Порядок</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="c in ordered" :key="c.id">
              <td :class="{ sub: c.parent_id }"><AppIcon :name="c.icon" :size="18" class="cat-icon" /> <strong>{{ c.name }}</strong></td>
              <td class="muted">{{ c.slug }}</td>
              <td>{{ c.product_count }}</td>
              <td>{{ c.sort_order }}</td>
              <td>
                <div class="admin-actions">
                  <button class="btn btn--outline btn--sm" @click="open(c)">Змінити</button>
                  <button class="btn btn--ghost btn--sm" aria-label="Видалити" @click="remove(c)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editing" class="admin-modal-backdrop" @click.self="editing = null">
      <form class="admin-modal card" @submit.prevent="save">
        <h3>{{ editing.id ? 'Редагування категорії' : 'Нова категорія' }}</h3>
        <div class="form-grid">
          <div class="field full">
            <label>Назва <span class="req">*</span></label>
            <input v-model="editing.name" class="input" :class="{ invalid: errors.name }" />
            <span v-if="errors.name" class="error">{{ errors.name }}</span>
          </div>
          <div class="field">
            <label>Батьківська категорія</label>
            <select v-model="editing.parent_id" class="select">
              <option value="">— Верхній рівень —</option>
              <option v-for="c in categories.filter((x) => !x.parent_id && x.id !== editing.id)" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <span v-if="errors.parent_id" class="error">{{ errors.parent_id }}</span>
          </div>
          <div class="field full">
            <label>Іконка</label>
            <div class="icon-pick">
              <button
                v-for="ic in ICON_CHOICES"
                :key="ic"
                type="button"
                class="icon-pick__btn"
                :class="{ active: editing.icon === ic }"
                :title="ic"
                @click="editing.icon = ic"
              >
                <AppIcon :name="ic" :size="18" />
              </button>
            </div>
          </div>
          <div class="field">
            <label>Slug (URL)</label>
            <input v-model="editing.slug" class="input" placeholder="автоматично" />
          </div>
          <div class="field">
            <label>Порядок сортування</label>
            <input v-model.number="editing.sort_order" class="input" type="number" />
          </div>
          <div class="field full">
            <label>Посилання на зображення</label>
            <input v-model.trim="editing.image_url" class="input" :class="{ invalid: errors.image_url }" placeholder="https://…" />
            <span v-if="errors.image_url" class="error">{{ errors.image_url }}</span>
          </div>
          <div class="field full">
            <label>Опис</label>
            <textarea v-model="editing.description" class="textarea" rows="3" />
          </div>
        </div>
        <div class="admin-modal__actions">
          <button type="button" class="btn btn--ghost" @click="editing = null">Скасувати</button>
          <button class="btn" :disabled="saving">Зберегти</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.sub { padding-left: 36px; }
.cat-icon { color: var(--c-primary); margin-right: 4px; }
</style>
