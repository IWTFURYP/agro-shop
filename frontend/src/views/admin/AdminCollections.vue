<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api';
import { useToastStore } from '@/stores/toast';
import AppIcon, { ICON_CHOICES } from '@/components/AppIcon.vue';
import ProductImage from '@/components/ProductImage.vue';

const toast = useToastStore();
const collections = ref([]);
const products = ref([]);
const loading = ref(true);
const editing = ref(null);
const errors = ref({});
const saving = ref(false);
const productSearch = ref('');

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase().trim();
  return q ? products.value.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q)) : products.value;
});

async function load() {
  loading.value = true;
  try {
    collections.value = await api.get('/admin/collections');
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  load();
  const data = await api.get('/admin/products', { limit: 100, sort: 'name' }).catch(() => ({ items: [] }));
  products.value = data.items;
});

async function open(c = null) {
  errors.value = {};
  productSearch.value = '';
  if (c) {
    editing.value = await api.get(`/admin/collections/${c.id}`);
    editing.value.is_active = Boolean(editing.value.is_active);
  } else {
    editing.value = {
      title: '', subtitle: '', description: '', image_url: '', icon: 'sprout',
      is_active: true, sort_order: collections.value.length, product_ids: [],
    };
  }
}

function toggleProduct(id) {
  const ids = editing.value.product_ids;
  const i = ids.indexOf(id);
  if (i === -1) ids.push(id);
  else ids.splice(i, 1);
}

async function save() {
  saving.value = true;
  errors.value = {};
  try {
    if (editing.value.id) await api.put(`/admin/collections/${editing.value.id}`, editing.value);
    else await api.post('/admin/collections', editing.value);
    toast.success('Добірку збережено');
    editing.value = null;
    load();
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}

async function remove(c) {
  if (!confirm(`Видалити добірку «${c.title}»? Товари залишаться в каталозі.`)) return;
  try {
    await api.delete(`/admin/collections/${c.id}`);
    toast.success('Добірку видалено');
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <span class="muted">Сезонні добірки показуються на головній сторінці</span>
      <span class="spacer" />
      <button class="btn" @click="open()">+ Нова добірка</button>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else class="cols">
      <article v-for="c in collections" :key="c.id" class="col card" :class="{ inactive: !c.is_active }">
        <div class="col__img"><ProductImage :src="c.image_url" :icon="c.icon || 'sprout'" cover /></div>
        <div class="col__body">
          <span class="muted col__sub">{{ c.subtitle }}</span>
          <h3>{{ c.title }}</h3>
          <p class="muted">{{ c.product_count }} товарів · {{ c.is_active ? 'показується' : 'прихована' }}</p>
          <div class="admin-actions">
            <a :href="`/catalog?collection=${c.slug}`" target="_blank" class="btn btn--ghost btn--sm" title="Переглянути"><AppIcon name="eye" :size="16" /></a>
            <button class="btn btn--outline btn--sm" @click="open(c)">Змінити</button>
            <button class="btn btn--ghost btn--sm" aria-label="Видалити" @click="remove(c)"><AppIcon name="trash" :size="16" /></button>
          </div>
        </div>
      </article>
      <div v-if="!collections.length" class="empty card">Добірок ще немає</div>
    </div>

    <div v-if="editing" class="admin-modal-backdrop" @click.self="editing = null">
      <form class="admin-modal card modal-wide" @submit.prevent="save">
        <h3>{{ editing.id ? 'Редагування добірки' : 'Нова добірка' }}</h3>
        <div class="form-grid">
          <div class="field">
            <label>Назва <span class="req">*</span></label>
            <input v-model="editing.title" class="input" :class="{ invalid: errors.title }" placeholder="Підготовка до посівної" />
            <span v-if="errors.title" class="error">{{ errors.title }}</span>
          </div>
          <div class="field">
            <label>Сезон / підпис</label>
            <input v-model="editing.subtitle" class="input" placeholder="Весна" />
          </div>
          <div class="field full">
            <label>Опис</label>
            <textarea v-model="editing.description" class="textarea" rows="2" />
          </div>
          <div class="field full">
            <label>Посилання на фото</label>
            <input v-model.trim="editing.image_url" class="input" :class="{ invalid: errors.image_url }" placeholder="https://…" />
            <span v-if="errors.image_url" class="error">{{ errors.image_url }}</span>
          </div>
          <div class="field full">
            <label>Іконка (якщо фото немає)</label>
            <div class="icon-pick">
              <button
                v-for="ic in ICON_CHOICES"
                :key="ic"
                type="button"
                class="icon-pick__btn"
                :class="{ active: editing.icon === ic }"
                @click="editing.icon = ic"
              >
                <AppIcon :name="ic" :size="18" />
              </button>
            </div>
          </div>
          <div class="field">
            <label>Порядок</label>
            <input v-model.number="editing.sort_order" class="input" type="number" />
          </div>
          <label class="checkbox"><input v-model="editing.is_active" type="checkbox" /> Показувати на сайті</label>

          <div class="field full">
            <label>Товари в добірці (обрано: {{ editing.product_ids.length }})</label>
            <input v-model="productSearch" class="input" type="search" placeholder="Пошук товару…" />
            <div class="plist">
              <label v-for="p in filteredProducts" :key="p.id" class="checkbox plist__item">
                <input type="checkbox" :checked="editing.product_ids.includes(p.id)" @change="toggleProduct(p.id)" />
                <span>{{ p.name }} <small class="muted">{{ p.sku }}</small></span>
              </label>
            </div>
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
.cols { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.col { overflow: hidden; }
.col.inactive { opacity: 0.6; }
.col__img { aspect-ratio: 16 / 8; background: var(--c-primary-light); }
.col__body { padding: 16px 18px; }
.col__body h3 { margin: 2px 0 4px; }
.col__body p { font-size: 13px; }
.col__sub { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.col .admin-actions { justify-content: flex-start; }
.modal-wide { max-width: 720px; }
.plist {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
}
.plist__item { padding: 6px 0; border-bottom: 1px solid #f2f3ef; }
.plist__item:last-child { border-bottom: 0; }
</style>
