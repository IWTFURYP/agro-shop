import { defineStore } from 'pinia';
import { ref } from 'vue';

// Стан інтерфейсу, спільний для кількох компонентів (бокове меню відкривається з шапки й нижньої панелі)
export const useUiStore = defineStore('ui', () => {
  const drawerOpen = ref(false);
  const openDrawer = () => (drawerOpen.value = true);
  const closeDrawer = () => (drawerOpen.value = false);
  return { drawerOpen, openDrawer, closeDrawer };
});
