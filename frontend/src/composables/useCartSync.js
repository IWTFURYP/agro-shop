import { ref } from 'vue';
import { api } from '@/api';
import { useCartStore } from '@/stores/cart';

// Оновлює кошик актуальними цінами й залишками з сервера
export function useCartSync() {
  const cart = useCartStore();
  const notice = ref('');

  async function sync() {
    if (!cart.items.length) return;
    try {
      const data = await api.get('/products', { ids: cart.items.map((i) => i.id).join(','), limit: 48 });
      const { removed, reduced } = cart.refresh(data.items);
      const parts = [];
      if (removed.length) parts.push(`Немає в наявності, прибрано з кошика: ${removed.join(', ')}.`);
      if (reduced.length) parts.push(`Кількість зменшено до наявної на складі: ${reduced.join(', ')}.`);
      notice.value = parts.join(' ');
    } catch {
      /* без зв'язку з сервером залишаємо кошик як є */
    }
  }

  return { notice, sync };
}
