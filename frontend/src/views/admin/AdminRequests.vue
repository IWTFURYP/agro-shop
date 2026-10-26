<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { onMounted, ref, watch } from 'vue';
import { api } from '@/api';
import { REQUEST_TYPES, REQUEST_STATUSES } from '@/config';
import { formatDate } from '@/utils/format';
import { useToastStore } from '@/stores/toast';
import PaginationBar from '@/components/PaginationBar.vue';

const toast = useToastStore();
const result = ref({ items: [], total: 0, page: 1, pages: 1 });
const loading = ref(true);
const filters = ref({ status: '', page: 1 });

async function load() {
  loading.value = true;
  try {
    result.value = await api.get('/admin/requests', filters.value);
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

watch(() => [filters.value.status, filters.value.page], load);
onMounted(load);

async function setStatus(item, status) {
  try {
    Object.assign(item, await api.patch(`/admin/requests/${item.id}`, { status }));
  } catch (err) {
    toast.error(err.message);
  }
}

async function remove(item) {
  if (!confirm(`Видалити заявку від ${item.name}?`)) return;
  try {
    await api.delete(`/admin/requests/${item.id}`);
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <select v-model="filters.status" class="select" @change="filters.page = 1">
        <option value="">Усі статуси</option>
        <option v-for="(s, key) in REQUEST_STATUSES" :key="key" :value="key">{{ s.label }}</option>
      </select>
      <span class="muted">Заявки на консультацію, протруювання насіння та зворотний дзвінок</span>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="!result.items.length" class="empty card">
      <div class="empty__icon"><AppIcon name="inbox" :size="30" /></div>
      Заявок поки немає
    </div>
    <div v-else class="list">
      <article v-for="r in result.items" :key="r.id" class="req card">
        <div class="req__head">
          <span class="badge badge--gray">{{ REQUEST_TYPES[r.type] || r.type }}</span>
          <span class="muted">{{ formatDate(r.created_at) }}</span>
          <span class="spacer" />
          <select class="select status" :value="r.status" @change="setStatus(r, $event.target.value)">
            <option v-for="(s, key) in REQUEST_STATUSES" :key="key" :value="key">{{ s.label }}</option>
          </select>
          <button class="btn btn--ghost btn--sm" title="Видалити" @click="remove(r)"><AppIcon name="trash" :size="16" /></button>
        </div>
        <div class="req__body">
          <strong>{{ r.name }}</strong>
          <a :href="`tel:${r.phone}`"><AppIcon name="phone" :size="15" /> {{ r.phone }}</a>
          <span v-if="r.region" class="muted"><AppIcon name="map-pin" :size="15" /> {{ r.region }} обл.</span>
          <span v-if="r.crop"><AppIcon name="wheat" :size="15" /> {{ r.crop }}</span>
          <span v-if="r.area"><AppIcon name="gauge" :size="15" /> {{ r.area }}</span>
        </div>
        <p v-if="r.message" class="req__msg">{{ r.message }}</p>
      </article>
    </div>
    <PaginationBar :page="result.page" :pages="result.pages" @change="(p) => (filters.page = p)" />
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 12px; }
.req { padding: 16px 20px; }
.req__head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; }
.spacer { flex: 1; }
.status { width: auto; padding: 6px 10px; font-size: 13px; }
.req__body { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
.req__msg {
  margin: 10px 0 0;
  padding: 10px 14px;
  background: var(--c-primary-soft);
  border-radius: var(--radius-sm);
  white-space: pre-line;
  font-size: 14px;
}
</style>
