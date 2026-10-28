<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api } from '@/api';
import AppIcon from './AppIcon.vue';

// Поле «Населений пункт» з підказками: вводите перші літери — бачите міста й села України
// з областю, районом і громадою. Дані — довідник КАТОТТГ на сервері (/api/settlements).
const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'settlement' },
  invalid: Boolean,
  placeholder: { type: String, default: 'Почніть вводити назву міста чи села' },
  quick: { type: Array, default: () => ['Київ', 'Харків', 'Одеса', 'Дніпро', 'Львів', 'Вінниця', 'Черкаси', 'Чернівці'] },
});
const emit = defineEmits(['update:modelValue', 'select']);

const query = ref(props.modelValue);
const items = ref([]);
const open = ref(false);
const active = ref(-1);
const loading = ref(false);
let timer = null;
let requestId = 0;

watch(() => props.modelValue, (v) => {
  if (v !== query.value) query.value = v;
});

async function load(q) {
  const id = ++requestId;
  loading.value = true;
  try {
    const result = await api.get('/settlements', { q, limit: 10 });
    if (id !== requestId) return; // відповідь на старіший запит — ігноруємо
    items.value = result;
    active.value = result.length ? 0 : -1;
    open.value = true;
  } catch {
    if (id === requestId) items.value = [];
  } finally {
    if (id === requestId) loading.value = false;
  }
}

function onInput(e) {
  query.value = e.target.value;
  emit('update:modelValue', query.value);
  clearTimeout(timer);
  if (query.value.trim().length < 2) {
    items.value = [];
    open.value = false;
    return;
  }
  timer = setTimeout(() => load(query.value), 150);
}

function choose(item) {
  query.value = item.value;
  emit('update:modelValue', item.value);
  emit('select', item);
  open.value = false;
  items.value = [];
}

async function chooseQuick(name) {
  const [first] = await api.get('/settlements', { q: name, limit: 1 }).catch(() => []);
  if (first) choose(first);
}

function onKeydown(e) {
  if (!open.value || !items.value.length) {
    if (e.key === 'ArrowDown' && query.value.trim().length >= 2) load(query.value);
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    active.value = (active.value + 1) % items.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    active.value = (active.value - 1 + items.value.length) % items.value.length;
  } else if (e.key === 'Enter' && active.value >= 0) {
    e.preventDefault();
    choose(items.value[active.value]);
  } else if (e.key === 'Escape') {
    open.value = false;
  }
}

function onFocus(e) {
  if (items.value.length) open.value = true;
  // На телефоні піднімаємо поле вгору, щоб підказки не ховала клавіатура
  if (window.innerWidth < 760) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
}

function onBlur() {
  // Даємо час спрацювати кліку по підказці
  setTimeout(() => (open.value = false), 150);
}

// Виділяємо жирним ту частину назви, яку вже ввели (як у великих магазинах)
const typed = computed(() =>
  query.value.trim().toLocaleLowerCase('uk').replace(/^(с\.|м\.|смт\.?|с-ще\.?|село|місто|селище)\s*/, '').split(/[\s,]+/)[0].replace(/[’ʼ`]/g, "'"),
);
function parts(name) {
  const lower = name.toLocaleLowerCase('uk').replace(/[’ʼ`]/g, "'");
  const at = typed.value ? lower.indexOf(typed.value) : -1;
  if (at < 0) return [name, '', ''];
  return [name.slice(0, at), name.slice(at, at + typed.value.length), name.slice(at + typed.value.length)];
}

const listId = computed(() => `${props.id}-list`);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="settlement">
    <div class="settlement__box">
      <AppIcon name="map-pin" :size="18" class="settlement__icon" />
      <input
        :id="id"
        :value="query"
        class="input settlement__input"
        :class="{ invalid }"
        type="text"
        role="combobox"
        autocomplete="off"
        :placeholder="placeholder"
        aria-autocomplete="list"
        :aria-expanded="open && items.length > 0"
        :aria-controls="listId"
        :aria-activedescendant="open && active >= 0 ? `${id}-opt-${active}` : undefined"
        @input="onInput"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
      />
      <span v-if="loading" class="settlement__spinner" aria-hidden="true" />
    </div>

    <ul v-show="open && items.length" :id="listId" class="settlement__list" role="listbox">
      <li
        v-for="(item, i) in items"
        :id="`${id}-opt-${i}`"
        :key="`${item.title}-${item.details}`"
        role="option"
        :aria-selected="i === active"
        class="settlement__option"
        :class="{ active: i === active }"
        @mousedown.prevent="choose(item)"
        @mouseenter="active = i"
      >
        <span class="settlement__name">
          {{ item.type }}
          <template v-for="(p, k) in parts(item.name)" :key="k"><b v-if="k === 1">{{ p }}</b><template v-else>{{ p }}</template></template>
        </span>
        <span class="settlement__details">{{ item.details }}</span>
      </li>
    </ul>
    <p v-if="open && !loading && !items.length && query.trim().length >= 2" class="settlement__empty">
      Нічого не знайдено — перевірте назву або впишіть як є.
    </p>

    <div v-if="!query.trim() && quick.length" class="settlement__quick">
      <button v-for="c in quick" :key="c" type="button" class="chip" @click="chooseQuick(c)">{{ c }}</button>
    </div>
  </div>
</template>

<style scoped>
.settlement { position: relative; }
.settlement__box { position: relative; }
.settlement__icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--c-muted); pointer-events: none; }
.settlement__input { padding-left: 40px; width: 100%; }
.settlement__spinner {
  position: absolute;
  right: 14px;
  top: 50%;
  width: 16px;
  height: 16px;
  margin-top: -8px;
  border: 2px solid var(--c-border);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.settlement__list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 320px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
}
.settlement__option { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; cursor: pointer; }
.settlement__option.active { background: var(--c-primary-soft); }
.settlement__name { color: var(--c-text); font-size: 15px; }
.settlement__name b { font-weight: 800; }
.settlement__details { font-size: 13px; color: var(--c-muted); }
.settlement__empty {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  font-size: 14px;
  color: var(--c-muted);
}
.settlement__quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.settlement__quick .chip { padding: 6px 12px; font-size: 13px; }
</style>
