<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { onMounted, ref, watch } from 'vue';
import { api } from '@/api';
import { formatPrice } from '@/utils/format';
import { useToastStore } from '@/stores/toast';
import ProductImage from '@/components/ProductImage.vue';
import PaginationBar from '@/components/PaginationBar.vue';

const toast = useToastStore();
const result = ref({ items: [], total: 0, page: 1, pages: 1 });
const categories = ref([]);
const loading = ref(true);
const filters = ref({ search: '', category: '', sort: 'new', page: 1 });

let searchTimer;

async function load() {
  loading.value = true;
  try {
    result.value = await api.get('/admin/products', { ...filters.value, limit: 20 });
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

watch(() => [filters.value.category, filters.value.sort, filters.value.page], load);
watch(
  () => filters.value.search,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.value.page = 1;
      load();
    }, 300);
  },
);

onMounted(async () => {
  load();
  categories.value = await api.get('/admin/categories').catch(() => []);
});

async function patch(product, data) {
  try {
    Object.assign(product, await api.patch(`/admin/products/${product.id}`, data));
  } catch (err) {
    toast.error(err.message);
  }
}

async function remove(product) {
  if (!confirm(`Видалити товар «${product.name}»? Цю дію не можна скасувати.`)) return;
  try {
    await api.delete(`/admin/products/${product.id}`);
    toast.success('Товар видалено');
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <input v-model="filters.search" class="input" type="search" placeholder="Пошук за назвою, артикулом…" />
      <select v-model="filters.category" class="select" @change="filters.page = 1">
        <option value="">Усі категорії</option>
        <option v-for="c in categories" :key="c.id" :value="c.slug">{{ c.parent_id ? '— ' : '' }}{{ c.name }}</option>
      </select>
      <select v-model="filters.sort" class="select">
        <option value="new">Спочатку нові</option>
        <option value="name">За назвою</option>
        <option value="price_asc">Ціна ↑</option>
        <option value="price_desc">Ціна ↓</option>
      </select>
      <span class="spacer" />
      <RouterLink to="/admin/products/new" class="btn">+ Додати товар</RouterLink>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Товар</th>
              <th>Категорія</th>
              <th>Ціна</th>
              <th>Залишок</th>
              <th>Хіт</th>
              <th>На сайті</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7"><div class="spinner" /></td></tr>
            <tr v-for="p in loading ? [] : result.items" :key="p.id" :class="{ inactive: !p.is_active }">
              <td>
                <div class="pcell">
                  <div class="admin-thumb"><ProductImage :src="p.image_url" :icon="p.category?.icon || 'sprout'" /></div>
                  <div>
                    <RouterLink :to="`/admin/products/${p.id}`" class="pcell__name">{{ p.name }}</RouterLink>
                    <small class="muted">{{ p.sku }} {{ p.packaging ? `· ${p.packaging}` : '' }}</small>
                  </div>
                </div>
              </td>
              <td class="muted">{{ p.category?.name || '—' }}</td>
              <td class="nowrap">{{ formatPrice(p.price) }}</td>
              <td>
                <input
                  class="input stock"
                  :class="{ low: p.price != null && p.stock <= p.min_stock }"
                  type="number"
                  min="0"
                  :value="p.stock"
                  :title="p.price != null && p.stock <= p.min_stock ? `Закінчується (поріг ${p.min_stock})` : undefined"
                  @change="patch(p, { stock: Number($event.target.value) })"
                />
              </td>
              <td><input type="checkbox" :checked="p.is_featured" class="cb" @change="patch(p, { is_featured: $event.target.checked })" /></td>
              <td><input type="checkbox" :checked="p.is_active" class="cb" @change="patch(p, { is_active: $event.target.checked })" /></td>
              <td>
                <div class="admin-actions">
                  <a :href="`/product/${p.slug}`" target="_blank" class="btn btn--ghost btn--sm" title="Переглянути на сайті"><AppIcon name="eye" :size="16" /></a>
                  <RouterLink :to="`/admin/products/${p.id}`" class="btn btn--outline btn--sm">Змінити</RouterLink>
                  <button class="btn btn--ghost btn--sm" title="Видалити" @click="remove(p)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && !result.items.length"><td colspan="7" class="muted">Товарів не знайдено</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="muted total">Усього: {{ result.total }}</p>
    <PaginationBar :page="result.page" :pages="result.pages" @change="(p) => (filters.page = p)" />
  </div>
</template>

<style scoped>
.pcell { display: flex; gap: 12px; align-items: center; min-width: 260px; }
.pcell > div:last-child { display: flex; flex-direction: column; }
.pcell__name { font-weight: 600; color: var(--c-text); }
.pcell__name:hover { color: var(--c-primary); }
.stock { width: 80px; padding: 6px 8px; }
.stock.low { border-color: #e2b552; background: var(--c-accent-light); font-weight: 600; }
.cb { width: 18px; height: 18px; accent-color: var(--c-primary); cursor: pointer; }
.nowrap { white-space: nowrap; }
.inactive td { opacity: 0.55; }
.total { margin-top: 12px; font-size: 14px; }
</style>
