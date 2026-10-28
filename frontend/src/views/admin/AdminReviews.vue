<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { formatDate } from '@/utils/format';
import { useToastStore } from '@/stores/toast';
import StarRating from '@/components/StarRating.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const toast = useToastStore();
const STATUSES = {
  pending: { label: 'На модерації', color: 'yellow' },
  approved: { label: 'Опубліковано', color: 'green' },
  rejected: { label: 'Відхилено', color: 'red' },
};

const filters = ref({ status: route.query.status || '', page: 1 });
const result = ref({ items: [], total: 0, page: 1, pages: 1 });
const loading = ref(true);
const replying = ref(null);
const replyText = ref('');

async function load() {
  loading.value = true;
  try {
    result.value = await api.get('/admin/reviews', filters.value);
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => [filters.value.status, filters.value.page], load);

async function setStatus(r, status) {
  try {
    Object.assign(r, await api.patch(`/admin/reviews/${r.id}`, { status }));
    toast.success(status === 'approved' ? 'Відгук опубліковано' : 'Відгук відхилено');
  } catch (err) {
    toast.error(err.message);
  }
}

function startReply(r) {
  replying.value = r.id;
  replyText.value = r.admin_reply;
}

async function saveReply(r) {
  try {
    Object.assign(r, await api.patch(`/admin/reviews/${r.id}`, { admin_reply: replyText.value }));
    replying.value = null;
    toast.success('Відповідь збережено');
  } catch (err) {
    toast.error(err.message);
  }
}

async function remove(r) {
  if (!confirm(`Видалити відгук від ${r.author_name}?`)) return;
  try {
    await api.delete(`/admin/reviews/${r.id}`);
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
        <option value="">Усі відгуки</option>
        <option v-for="(s, key) in STATUSES" :key="key" :value="key">{{ s.label }}</option>
      </select>
      <span class="muted">Відгук з'являється на сайті лише після схвалення</span>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="!result.items.length" class="empty card">
      <div class="empty__icon"><AppIcon name="message" :size="30" /></div>
      Відгуків немає
    </div>
    <div v-else class="list">
      <article v-for="r in result.items" :key="r.id" class="rv card" :class="`rv--${r.status}`">
        <div class="rv__head">
          <span class="badge" :class="`badge--${STATUSES[r.status].color}`">{{ STATUSES[r.status].label }}</span>
          <StarRating :value="r.rating" :size="15" />
          <strong>{{ r.author_name }}</strong>
          <span class="muted">{{ formatDate(r.created_at) }}</span>
          <span class="spacer" />
          <a v-if="r.product_slug" :href="`/product/${r.product_slug}`" target="_blank" class="rv__product">{{ r.product_name }}</a>
        </div>
        <p class="rv__text">{{ r.text }}</p>

        <div v-if="replying === r.id" class="rv__reply-form">
          <textarea v-model="replyText" class="textarea" rows="3" placeholder="Відповідь магазину (буде видно під відгуком)" />
          <div class="rv__actions">
            <button class="btn btn--ghost btn--sm" type="button" @click="replying = null">Скасувати</button>
            <button class="btn btn--sm" type="button" @click="saveReply(r)">Зберегти відповідь</button>
          </div>
        </div>
        <div v-else-if="r.admin_reply" class="rv__reply"><strong>Відповідь магазину:</strong> {{ r.admin_reply }}</div>

        <div class="rv__actions">
          <button v-if="r.status !== 'approved'" class="btn btn--sm" type="button" @click="setStatus(r, 'approved')">
            <AppIcon name="check" :size="15" /> Опублікувати
          </button>
          <button v-if="r.status !== 'rejected'" class="btn btn--outline btn--sm" type="button" @click="setStatus(r, 'rejected')">
            <AppIcon name="x" :size="15" /> Відхилити
          </button>
          <button v-if="replying !== r.id" class="btn btn--ghost btn--sm" type="button" @click="startReply(r)">
            <AppIcon name="message" :size="15" /> {{ r.admin_reply ? 'Змінити відповідь' : 'Відповісти' }}
          </button>
          <button class="btn btn--ghost btn--sm" type="button" aria-label="Видалити" @click="remove(r)"><AppIcon name="trash" :size="15" /></button>
        </div>
      </article>
    </div>
    <PaginationBar :page="result.page" :pages="result.pages" @change="(p) => (filters.page = p)" />
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 12px; }
.rv { padding: 16px 20px; }
.rv--pending { border-left: 4px solid var(--c-accent); }
.rv__head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; }
.spacer { flex: 1; }
.rv__product { font-size: 13px; font-weight: 600; }
.rv__text { margin: 10px 0; white-space: pre-line; }
.rv__reply { margin-bottom: 10px; padding: 10px 14px; border-radius: 10px; background: var(--c-primary-soft); font-size: 14px; }
.rv__reply-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.rv__actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
</style>
