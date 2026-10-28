<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api';
import { CROPS } from '@/config';
import { useToastStore } from '@/stores/toast';
import AppIcon, { ICON_CHOICES } from '@/components/AppIcon.vue';

const toast = useToastStore();
const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

const steps = ref([]);
const products = ref([]);
const loading = ref(true);
const crop = ref('');
const editing = ref(null);
const errors = ref({});
const saving = ref(false);
const productSearch = ref('');

const crops = computed(() => [...new Set(steps.value.map((s) => s.crop))]);
const visible = computed(() => (crop.value ? steps.value.filter((s) => s.crop === crop.value) : steps.value));
const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase().trim();
  return q ? products.value.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q)) : products.value;
});
const cropSuggestions = computed(() => [...new Set([...crops.value, ...CROPS])]);

async function load() {
  loading.value = true;
  try {
    steps.value = await api.get('/admin/calendar');
    if (!crop.value && crops.value.length) crop.value = crops.value[0];
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  load();
  products.value = (await api.get('/admin/products', { limit: 100, sort: 'name' }).catch(() => ({ items: [] }))).items;
});

const period = (s) => (s.month_from === s.month_to ? MONTHS[s.month_from - 1] : `${MONTHS[s.month_from - 1]} – ${MONTHS[s.month_to - 1]}`);

function open(step = null) {
  errors.value = {};
  productSearch.value = '';
  editing.value = step
    ? { ...step, product_ids: [...step.product_ids] }
    : {
        crop: crop.value || '', month_from: new Date().getMonth() + 1, month_to: new Date().getMonth() + 1,
        stage: '', title: '', description: '', icon: 'sprout', sort_order: (visible.value.at(-1)?.sort_order ?? 0) + 1, product_ids: [],
      };
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
    if (editing.value.id) await api.put(`/admin/calendar/${editing.value.id}`, editing.value);
    else await api.post('/admin/calendar', editing.value);
    toast.success('Етап збережено');
    crop.value = editing.value.crop;
    editing.value = null;
    load();
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}

async function remove(step) {
  if (!confirm(`Видалити етап «${step.title}»?`)) return;
  try {
    await api.delete(`/admin/calendar/${step.id}`);
    load();
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <div class="crops">
        <button v-for="c in crops" :key="c" type="button" class="chip" :class="{ active: crop === c }" @click="crop = c">{{ c }}</button>
      </div>
      <span class="spacer" />
      <a :href="`/calendar?crop=${encodeURIComponent(crop)}`" target="_blank" class="btn btn--ghost btn--sm"><AppIcon name="eye" :size="16" /> На сайті</a>
      <button class="btn" type="button" @click="open()">+ Додати етап</button>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Порядок</th><th>Період</th><th>Етап</th><th>Товари</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="s in visible" :key="s.id">
              <td class="muted">{{ s.sort_order }}</td>
              <td class="nowrap">{{ period(s) }}</td>
              <td>
                <strong><AppIcon :name="s.icon || 'sprout'" :size="16" class="ic" /> {{ s.title }}</strong>
                <br /><small class="muted">{{ s.stage }}</small>
              </td>
              <td class="muted">{{ s.products.map((p) => p.name).join(', ') || '—' }}</td>
              <td>
                <div class="admin-actions">
                  <button class="btn btn--outline btn--sm" type="button" @click="open(s)">Змінити</button>
                  <button class="btn btn--ghost btn--sm" type="button" aria-label="Видалити" @click="remove(s)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!visible.length"><td colspan="5" class="muted">Етапів ще немає</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editing" class="admin-modal-backdrop" @click.self="editing = null">
      <form class="admin-modal card wide" novalidate @submit.prevent="save">
        <h3>{{ editing.id ? 'Редагування етапу' : 'Новий етап' }}</h3>
        <div class="form-grid">
          <div class="field">
            <label>Культура <span class="req">*</span></label>
            <input v-model="editing.crop" class="input" :class="{ invalid: errors.crop }" list="crop-list" />
            <datalist id="crop-list"><option v-for="c in cropSuggestions" :key="c" :value="c" /></datalist>
            <span v-if="errors.crop" class="error">{{ errors.crop }}</span>
          </div>
          <div class="field">
            <label>Фаза / етап розвитку</label>
            <input v-model="editing.stage" class="input" placeholder="Напр. Кущіння" />
          </div>
          <div class="field">
            <label>З місяця</label>
            <select v-model.number="editing.month_from" class="select">
              <option v-for="(m, i) in MONTHS" :key="m" :value="i + 1">{{ m }}</option>
            </select>
          </div>
          <div class="field">
            <label>По місяць</label>
            <select v-model.number="editing.month_to" class="select">
              <option v-for="(m, i) in MONTHS" :key="m" :value="i + 1">{{ m }}</option>
            </select>
          </div>
          <div class="field full">
            <label>Назва етапу <span class="req">*</span></label>
            <input v-model="editing.title" class="input" :class="{ invalid: errors.title }" placeholder="Напр. Фунгіцидний захист" />
            <span v-if="errors.title" class="error">{{ errors.title }}</span>
          </div>
          <div class="field full">
            <label>Опис</label>
            <textarea v-model="editing.description" class="textarea" rows="3" />
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
                @click="editing.icon = ic"
              >
                <AppIcon :name="ic" :size="18" />
              </button>
            </div>
          </div>
          <div class="field">
            <label>Порядок показу</label>
            <input v-model.number="editing.sort_order" class="input" type="number" />
          </div>
          <div class="field full">
            <label>Рекомендовані товари (обрано: {{ editing.product_ids.length }})</label>
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
.crops { display: flex; flex-wrap: wrap; gap: 6px; }
.spacer { flex: 1; }
.nowrap { white-space: nowrap; }
.ic { color: var(--c-primary); }
.wide { max-width: 720px; }
.plist { max-height: 240px; overflow-y: auto; border: 1px solid var(--c-border); border-radius: var(--radius-sm); padding: 6px 12px; }
.plist__item { padding: 6px 0; border-bottom: 1px solid #f2f3ef; }
.plist__item:last-child { border-bottom: 0; }
</style>
