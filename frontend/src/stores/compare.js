import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

const STORAGE_KEY = 'agro_compare';
export const MAX_COMPARE = 4;

function load() {
  try {
    const ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

// Список товарів для порівняння (зберігається в браузері)
export const useCompareStore = defineStore('compare', () => {
  const ids = ref(load());

  watch(
    ids,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* ігноруємо */
      }
    },
    { deep: true },
  );

  const count = computed(() => ids.value.length);
  const has = (id) => ids.value.includes(id);

  // Повертає false, якщо список уже заповнений
  function toggle(id) {
    if (has(id)) {
      ids.value = ids.value.filter((x) => x !== id);
      return true;
    }
    if (ids.value.length >= MAX_COMPARE) return false;
    ids.value.push(id);
    return true;
  }

  function remove(id) {
    ids.value = ids.value.filter((x) => x !== id);
  }

  function clear() {
    ids.value = [];
  }

  return { ids, count, has, toggle, remove, clear };
});
