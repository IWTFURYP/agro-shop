<script setup>
import AppIcon from './AppIcon.vue';
import { reactive, ref } from 'vue';
import { api } from '@/api';
import { REGIONS } from '@/config';
import { useToastStore } from '@/stores/toast';

// Універсальна форма заявки: консультація, протруювання насіння, зворотний дзвінок
const props = defineProps({
  type: { type: String, default: 'consultation' },
  title: { type: String, default: '' },
  submitText: { type: String, default: 'Надіслати заявку' },
  showCrop: Boolean,
  compact: Boolean,
});

const toast = useToastStore();
const form = reactive({ name: '', phone: '', region: '', crop: '', area: '', message: '' });
const errors = ref({});
const sending = ref(false);
const sent = ref(false);

async function submit() {
  sending.value = true;
  errors.value = {};
  try {
    await api.post('/requests', { ...form, type: props.type });
    sent.value = true;
    toast.success('Заявку надіслано! Ми зв’яжемося з вами найближчим часом');
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    sending.value = false;
  }
}

function reset() {
  Object.assign(form, { name: '', phone: '', region: '', crop: '', area: '', message: '' });
  sent.value = false;
}
</script>

<template>
  <div class="rform">
    <h3 v-if="title">{{ title }}</h3>
    <div v-if="sent" class="rform__done">
      <div class="rform__done-icon"><AppIcon name="check" :size="30" :stroke-width="2.5" /></div>
      <p><strong>Дякуємо, заявку прийнято!</strong><br />Наш менеджер зателефонує вам найближчим часом.</p>
      <button class="btn btn--outline btn--sm" @click="reset">Надіслати ще одну</button>
    </div>
    <form v-else class="form-grid" :class="{ 'rform--compact': compact }" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="rf-name">Ваше ім’я <span class="req">*</span></label>
        <input id="rf-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" autocomplete="name" />
        <span v-if="errors.name" class="error">{{ errors.name }}</span>
      </div>
      <div class="field">
        <label for="rf-phone">Телефон <span class="req">*</span></label>
        <input id="rf-phone" v-model="form.phone" class="input" :class="{ invalid: errors.phone }" type="tel" placeholder="+380" autocomplete="tel" />
        <span v-if="errors.phone" class="error">{{ errors.phone }}</span>
      </div>
      <template v-if="!compact">
        <div class="field">
          <label for="rf-region">Область</label>
          <select id="rf-region" v-model="form.region" class="select">
            <option value="">— Оберіть —</option>
            <option v-for="r in REGIONS" :key="r">{{ r }}</option>
          </select>
        </div>
        <div v-if="showCrop" class="field">
          <label for="rf-crop">Культура</label>
          <input id="rf-crop" v-model="form.crop" class="input" placeholder="Напр. пшениця" />
        </div>
        <div v-if="showCrop" class="field">
          <label for="rf-area">Обсяг (т насіння або га)</label>
          <input id="rf-area" v-model="form.area" class="input" placeholder="Напр. 120 т" />
        </div>
        <div class="field full">
          <label for="rf-msg">Коментар</label>
          <textarea id="rf-msg" v-model="form.message" class="textarea" rows="3" placeholder="Опишіть ваше питання" />
        </div>
      </template>
      <div class="full">
        <button class="btn btn--lg btn--block" :disabled="sending">
          {{ sending ? 'Надсилаємо…' : submitText }}
        </button>
        <p class="rform__note">Натискаючи кнопку, ви погоджуєтесь на обробку персональних даних.</p>
      </div>
    </form>
  </div>
</template>

<style scoped>
.rform__done {
  text-align: center;
  padding: 24px 8px;
}
.rform__done-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--c-primary-light);
  color: var(--c-primary);
}
.rform__note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--c-muted);
  text-align: center;
}
</style>
