import { useRouter } from 'vue-router';
import { api } from '@/api';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';

// «Повторити замовлення»: кладе в кошик ті самі товари за поточними цінами,
// з урахуванням того, що є на складі.
export function useReorder() {
  const cart = useCartStore();
  const toast = useToastStore();
  const router = useRouter();

  async function reorder(orderId) {
    const order = await api.get(`/account/orders/${orderId}`);
    const lines = order.items.filter((i) => i.product_id);
    const fresh = lines.length
      ? (await api.get('/products', { ids: lines.map((i) => i.product_id).join(','), limit: 48 })).items
      : [];
    const byId = new Map(fresh.map((p) => [p.id, p]));

    const skipped = [];
    const partial = [];
    let added = 0;
    for (const line of order.items) {
      const product = byId.get(line.product_id);
      if (!product) {
        skipped.push(line.product_name);
        continue;
      }
      const n = cart.add(product, line.quantity);
      if (!n) skipped.push(line.product_name);
      else if (n < line.quantity) partial.push(`${line.product_name} (${n} з ${line.quantity})`);
      added += n ? 1 : 0;
    }

    if (added) toast.success(`Додано в кошик позицій: ${added}. Ціни — актуальні на сьогодні`);
    if (partial.length) toast.error(`Не вистачає на складі: ${partial.join(', ')}`);
    if (skipped.length) toast.error(`Недоступні зараз: ${skipped.join(', ')}`);
    if (added) router.push('/cart');
  }

  return { reorder };
}
