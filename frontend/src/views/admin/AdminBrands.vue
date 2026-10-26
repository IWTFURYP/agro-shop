<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import { useToastStore } from '@/stores/toast';

const toast = useToastStore();
const brands = ref([]);
const loading = ref(true);
const editing = ref(null);
const errors = ref({});
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    brands.value = await api.get('/admin/brands');
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function open(brand = null) {
  errors.value = {};
  editing.value = brand ? { ...brand } : { name: '', country: '', logo_url: '', website: '', description: '' };
}

async function save() {
  saving.value = true;
  errors.value = {};
  try {
    if (editing.value.id) await api.put(`/admin/brands/${editing.value.id}`, editing.value);
    else await api.post('/admin/brands', editing.value);
    toast.success('Збережено');
    editing.value = null;
    load();
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}

async function remove(brand) {
  if (!confirm(`Видалити виробника «${brand.name}»? Товари залишаться без виробника.`)) return;
  try {
    await api.delete(`/admin/brands/${brand.id}`);
    toast.success('Видалено');
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <span class="muted">Виробники та партнери (показуються на головній)</span>
      <span class="spacer" />
      <button class="btn" @click="open()">+ Додати виробника</button>
    </div>

    <div class="card">
      <div v-if="loading" class="spinner" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Логотип</th><th>Назва</th><th>Країна</th><th>Товарів</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="b in brands" :key="b.id">
              <td>
                <img v-if="b.logo_url" :src="b.logo_url" :alt="b.name" class="logo" />
                <span v-else class="muted">—</span>
              </td>
              <td><strong>{{ b.name }}</strong></td>
              <td>{{ b.country }}</td>
              <td>{{ b.product_count }}</td>
              <td>
                <div class="admin-actions">
                  <button class="btn btn--outline btn--sm" @click="open(b)">Змінити</button>
                  <button class="btn btn--ghost btn--sm" aria-label="Видалити" @click="remove(b)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!brands.length"><td colspan="5" class="muted">Виробників ще немає</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editing" class="admin-modal-backdrop" @click.self="editing = null">
      <form class="admin-modal card" @submit.prevent="save">
        <h3>{{ editing.id ? 'Редагування виробника' : 'Новий виробник' }}</h3>
        <div class="form-grid">
          <div class="field">
            <label>Назва <span class="req">*</span></label>
            <input v-model="editing.name" class="input" :class="{ invalid: errors.name }" />
            <span v-if="errors.name" class="error">{{ errors.name }}</span>
          </div>
          <div class="field">
            <label>Країна</label>
            <input v-model="editing.country" class="input" />
          </div>
          <div class="field full">
            <label>Посилання на логотип</label>
            <input v-model.trim="editing.logo_url" class="input" :class="{ invalid: errors.logo_url }" placeholder="https://…" />
            <span v-if="errors.logo_url" class="error">{{ errors.logo_url }}</span>
          </div>
          <div class="field full">
            <label>Сайт виробника</label>
            <input v-model.trim="editing.website" class="input" :class="{ invalid: errors.website }" placeholder="https://…" />
            <span v-if="errors.website" class="error">{{ errors.website }}</span>
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
.logo { max-height: 36px; max-width: 100px; object-fit: contain; }
</style>
