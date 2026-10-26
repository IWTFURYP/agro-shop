import { defineStore } from 'pinia';
import { ref } from 'vue';

let nextId = 1;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);

  function show(message, type = 'success', timeout = 3500) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    setTimeout(() => dismiss(id), timeout);
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    dismiss,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error', 5000),
  };
});
