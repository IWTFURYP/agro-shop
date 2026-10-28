<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { api } from '@/api';
import { formatDate } from '@/utils/format';
import { useCustomerStore } from '@/stores/customer';
import StarRating from './StarRating.vue';
import AppIcon from './AppIcon.vue';

// Відгуки про товар: підсумок оцінок, список опублікованих відгуків і форма нового
const props = defineProps({ slug: { type: String, required: true } });
const emit = defineEmits(['loaded']);

const customer = useCustomerStore();
const data = ref({ items: [], count: 0, avg: null, distribution: [] });
const loading = ref(true);
const showForm = ref(false);
const sending = ref(false);
const sent = ref(false);
const errors = ref({});
const form = reactive({ rating: 0, author_name: '', text: '' });

async function load() {
  loading.value = true;
  try {
    data.value = await api.get(`/products/${props.slug}/reviews`);
    emit('loaded', data.value);
  } catch {
    data.value = { items: [], count: 0, avg: null, distribution: [] };
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => props.slug, () => {
  sent.value = false;
  showForm.value = false;
  load();
});

function openForm() {
  showForm.value = true;
  if (!form.author_name && customer.profile?.name) form.author_name = customer.profile.name;
}

async function submit() {
  errors.value = {};
  sending.value = true;
  try {
    await api.post(`/products/${props.slug}/reviews`, form);
    sent.value = true;
    showForm.value = false;
    Object.assign(form, { rating: 0, text: '' });
  } catch (err) {
    errors.value = err.fields || { text: err.message };
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="reviews">
    <div v-if="loading" class="spinner" />
    <template v-else>
      <div class="summary">
        <div class="summary__score">
          <strong>{{ data.avg ?? '—' }}</strong>
          <StarRating :value="data.avg || 0" :size="20" />
          <span class="muted">{{ data.count ? `${data.count} відгуків` : 'Відгуків ще немає' }}</span>
        </div>
        <div v-if="data.count" class="summary__bars">
          <div v-for="d in data.distribution" :key="d.rating" class="bar-row">
            <span>{{ d.rating }}</span>
            <AppIcon name="star" :size="13" />
            <span class="bar"><span :style="{ width: `${(d.count / data.count) * 100}%` }" /></span>
            <span class="muted">{{ d.count }}</span>
          </div>
        </div>
        <div class="summary__action">
          <p class="muted">Купували цей товар? Поділіться досвідом з іншими аграріями.</p>
          <button v-if="!showForm" class="btn btn--outline" type="button" @click="openForm">
            <AppIcon name="message" :size="18" /> Написати відгук
          </button>
        </div>
      </div>

      <div v-if="sent" class="alert">
        <AppIcon name="check" :size="18" /> Дякуємо! Відгук з'явиться на сайті після перевірки модератором.
      </div>

      <form v-if="showForm" class="rform card card--pad" novalidate @submit.prevent="submit">
        <div class="field">
          <span class="label">Ваша оцінка <span class="req">*</span></span>
          <StarRating v-model:value="form.rating" :size="28" editable />
          <span v-if="errors.rating" class="error">{{ errors.rating }}</span>
        </div>
        <div class="field">
          <label for="rv-name">Ім'я <span class="req">*</span></label>
          <input id="rv-name" v-model="form.author_name" class="input" :class="{ invalid: errors.author_name }" maxlength="80" />
          <span v-if="errors.author_name" class="error">{{ errors.author_name }}</span>
        </div>
        <div class="field">
          <label for="rv-text">Відгук <span class="req">*</span></label>
          <textarea
            id="rv-text"
            v-model="form.text"
            class="textarea"
            :class="{ invalid: errors.text }"
            rows="4"
            maxlength="3000"
            placeholder="Як препарат спрацював на вашому полі? Яка культура, норма, результат?"
          />
          <span v-if="errors.text" class="error">{{ errors.text }}</span>
        </div>
        <div class="rform__actions">
          <button type="button" class="btn btn--ghost" @click="showForm = false">Скасувати</button>
          <button class="btn" :disabled="sending">{{ sending ? 'Надсилаємо…' : 'Надіслати відгук' }}</button>
        </div>
      </form>

      <ul v-if="data.items.length" class="list">
        <li v-for="r in data.items" :key="r.id" class="review">
          <div class="review__head">
            <span class="review__avatar">{{ r.author_name.charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ r.author_name }}</strong>
              <span class="muted">{{ formatDate(r.created_at).split(',')[0] }}</span>
            </div>
            <StarRating :value="r.rating" :size="15" class="review__stars" />
          </div>
          <p class="review__text">{{ r.text }}</p>
          <div v-if="r.admin_reply" class="review__reply">
            <strong>Відповідь магазину</strong>
            <p>{{ r.admin_reply }}</p>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
  margin-bottom: 24px;
}
.summary__score { display: flex; flex-direction: column; gap: 4px; }
.summary__score strong { font: 800 44px/1 var(--font-head); letter-spacing: -0.03em; }
.summary__score .muted { font-size: 13px; }
.summary__bars { display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
.bar-row { display: grid; grid-template-columns: 10px 14px 1fr 24px; gap: 6px; align-items: center; font-size: 13px; }
.bar-row .icon { color: var(--c-accent); }
.bar { height: 6px; border-radius: 999px; background: #eef0ea; overflow: hidden; }
.bar span { display: block; height: 100%; border-radius: 999px; background: var(--c-accent); }
.summary__action p { margin: 0 0 10px; font-size: 14px; }
.alert { margin-bottom: 20px; }
.rform { display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin-bottom: 24px; }
.rform__actions { display: flex; justify-content: flex-end; gap: 8px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; max-width: 760px; }
.review { padding: 18px 20px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; }
.review__head { display: flex; align-items: center; gap: 12px; }
.review__head div { display: flex; flex-direction: column; line-height: 1.3; }
.review__head .muted { font-size: 12px; }
.review__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--c-primary-light);
  color: var(--c-primary-dark);
  font-weight: 700;
}
.review__stars { margin-left: auto; }
.review__text { margin: 12px 0 0; white-space: pre-line; }
.review__reply {
  margin-top: 12px;
  padding: 12px 14px;
  border-left: 3px solid var(--c-primary);
  background: var(--c-primary-soft);
  border-radius: 0 10px 10px 0;
  font-size: 14px;
}
.review__reply p { margin: 4px 0 0; }
@media (max-width: 760px) {
  .summary { grid-template-columns: 1fr; gap: 16px; }
}
</style>
