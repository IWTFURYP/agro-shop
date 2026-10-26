import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api';

// Дерево категорій потрібне в шапці, на головній і в каталозі — завантажуємо один раз
export const useCatalogStore = defineStore('catalog', () => {
  const categories = ref([]);
  let pending = null;

  function loadCategories(force = false) {
    if (!force && categories.value.length) return Promise.resolve(categories.value);
    if (!pending) {
      pending = api
        .get('/categories')
        .then((data) => (categories.value = data))
        .finally(() => (pending = null));
    }
    return pending;
  }

  function findBySlug(slug, list = categories.value) {
    for (const c of list) {
      if (c.slug === slug) return c;
      const found = findBySlug(slug, c.children || []);
      if (found) return found;
    }
    return null;
  }

  return { categories, loadCategories, findBySlug };
});
