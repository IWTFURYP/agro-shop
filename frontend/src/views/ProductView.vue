<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { SHOP } from '@/config';
import { formatPrice } from '@/utils/format';
import { unitPrice, nextTier } from '@/utils/pricing';
import { qty } from '@/utils/units';
import { setSeo } from '@/composables/useSeo';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import { useAssistantStore } from '@/stores/assistant';
import ProductImage from '@/components/ProductImage.vue';
import ProductCard from '@/components/ProductCard.vue';
import QtyInput from '@/components/QtyInput.vue';
import RateCalculator from '@/components/RateCalculator.vue';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const cart = useCartStore();
const toast = useToastStore();
const assistant = useAssistantStore();

const product = ref(null);
const loading = ref(true);
const error = ref('');
const quantity = ref(1);
const activeImage = ref(0);
const tab = ref('description');

const gallery = computed(() => {
  if (!product.value) return [];
  return [product.value.image_url, ...(product.value.images || [])].filter(Boolean);
});

const specs = computed(() => {
  const p = product.value;
  if (!p) return [];
  return [
    ['Артикул', p.sku],
    ['Виробник', p.brand?.name],
    ['Діюча речовина', p.active_ingredient],
    ['Препаративна форма', p.formulation],
    ['Упаковка', p.packaging],
    ['Одиниця продажу', p.unit],
    ['Норма витрати', p.rate_min != null ? `${p.rate_min}${p.rate_max > p.rate_min ? `–${p.rate_max}` : ''} ${p.rate_unit}` : ''],
    ['Культури', p.crops.join(', ')],
    ['Проти', p.targets.join(', ')],
  ].filter(([, v]) => v);
});

const discount = computed(() => {
  const p = product.value;
  return p?.price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
});
const currentPrice = computed(() => unitPrice(product.value?.price, product.value?.price_tiers, quantity.value));
const upsell = computed(() => nextTier(product.value?.price, product.value?.price_tiers, quantity.value));
const hasCalculator = computed(() => product.value?.rate_min != null && product.value?.rate_unit);

function updateSeo(p) {
  const url = window.location.origin + window.location.pathname;
  setSeo({
    title: p.name,
    description: p.short_description || `${p.name}. ${p.active_ingredient}. Купити з доставкою по Україні.`,
    image: p.image_url,
    type: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.sku || undefined,
      description: p.short_description || p.description,
      image: p.image_url ? [new URL(p.image_url, window.location.origin).href] : undefined,
      brand: p.brand ? { '@type': 'Brand', name: p.brand.name } : undefined,
      category: p.category?.name,
      offers:
        p.price != null
          ? {
              '@type': 'Offer',
              url,
              priceCurrency: 'UAH',
              price: p.price,
              availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
            }
          : undefined,
    },
  });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    product.value = await api.get(`/products/${route.params.slug}`);
    updateSeo(product.value);
    quantity.value = 1;
    activeImage.value = 0;
    tab.value = 'description';
  } catch (err) {
    error.value = err.status === 404 ? 'Товар не знайдено або він більше не продається' : err.message;
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.slug, (slug) => slug && load(), { immediate: true });

function addToCart(qty = quantity.value) {
  cart.add(product.value, qty);
  toast.success(`Додано в кошик: ${product.value.name} × ${qty}`);
}
</script>

<template>
  <div class="container">
    <div v-if="loading" class="product product--loading">
      <div class="skeleton" style="aspect-ratio: 1" />
      <div><div class="skeleton" style="height: 320px" /></div>
    </div>
    <div v-else-if="error" class="empty">
      <div class="empty__icon"><AppIcon name="wheat" :size="32" /></div>
      <h2>{{ error }}</h2>
      <RouterLink to="/catalog" class="btn">До каталогу</RouterLink>
    </div>

    <template v-else-if="product">
      <nav class="breadcrumbs">
        <RouterLink to="/">Головна</RouterLink>
        <span><RouterLink to="/catalog">Каталог</RouterLink></span>
        <span v-if="product.category"><RouterLink :to="`/catalog/${product.category.slug}`">{{ product.category.name }}</RouterLink></span>
        <span>{{ product.name }}</span>
      </nav>

      <div class="product">
        <div class="gallery">
          <div class="gallery__main">
            <ProductImage :src="gallery[activeImage]" :alt="product.name" :icon="product.category?.icon || 'sprout'" />
            <div class="gallery__badges">
              <span v-if="discount" class="badge badge--red">−{{ discount }}%</span>
              <span v-if="product.is_featured" class="badge badge--dark">Хіт продажів</span>
            </div>
          </div>
          <div v-if="gallery.length > 1" class="gallery__thumbs">
            <button
              v-for="(url, i) in gallery"
              :key="url + i"
              class="gallery__thumb"
              :class="{ active: i === activeImage }"
              :aria-label="`Фото ${i + 1}`"
              @click="activeImage = i"
            >
              <ProductImage :src="url" :alt="`${product.name} — фото ${i + 1}`" />
            </button>
          </div>
        </div>

        <div class="info">
          <div class="info__top">
            <span class="badge" :class="product.in_stock ? 'badge--green' : 'badge--yellow'">
              <AppIcon :name="product.in_stock ? 'check' : 'clock'" :size="13" />
              {{ product.in_stock ? 'В наявності' : 'Під замовлення' }}
            </span>
            <span v-if="product.sku" class="muted">Артикул: {{ product.sku }}</span>
          </div>
          <h1>{{ product.name }}</h1>
          <p v-if="product.short_description" class="info__short">{{ product.short_description }}</p>

          <dl class="info__facts">
            <template v-if="product.active_ingredient"><dt>Діюча речовина</dt><dd>{{ product.active_ingredient }}</dd></template>
            <template v-if="product.packaging"><dt>Упаковка</dt><dd>{{ product.packaging }}</dd></template>
            <template v-if="product.brand"><dt>Виробник</dt><dd>{{ product.brand.name }}</dd></template>
            <template v-if="product.crops.length"><dt>Культури</dt><dd>{{ product.crops.join(', ') }}</dd></template>
          </dl>

          <div v-if="product.targets.length" class="targets">
            <span class="targets__label">Проти:</span>
            <RouterLink v-for="t in product.targets" :key="t" :to="{ name: 'catalog', query: { target: t } }" class="chip">{{ t }}</RouterLink>
          </div>

          <div class="buy">
            <div class="buy__price">
              <s v-if="discount">{{ formatPrice(product.old_price) }}</s>
              <strong>{{ formatPrice(currentPrice) }}</strong>
              <small v-if="product.price != null">за {{ product.unit }}</small>
              <span v-if="currentPrice < product.price" class="badge badge--yellow">оптова ціна</span>
            </div>

            <div v-if="product.price_tiers.length" class="tiers">
              <div class="tiers__row" :class="{ active: currentPrice === product.price }">
                <span>{{ product.price_tiers[0].min_qty > 2 ? `1–${qty(product.price_tiers[0].min_qty - 1, product.unit)}` : qty(1, product.unit) }}</span>
                <strong>{{ formatPrice(product.price) }}</strong>
              </div>
              <div
                v-for="(t, i) in product.price_tiers"
                :key="t.min_qty"
                class="tiers__row"
                :class="{ active: currentPrice === t.price && currentPrice !== product.price }"
              >
                <span>
                  {{ product.price_tiers[i + 1] ? `${t.min_qty}–${qty(product.price_tiers[i + 1].min_qty - 1, product.unit)}` : `від ${qty(t.min_qty, product.unit)}` }}
                </span>
                <strong>{{ formatPrice(t.price) }}</strong>
              </div>
            </div>

            <div class="buy__actions">
              <QtyInput v-model="quantity" />
              <button class="btn btn--lg" @click="addToCart()">
                <AppIcon name="shopping-cart" :size="18" />
                {{ product.price == null ? 'Запитати ціну' : 'В кошик' }}
              </button>
            </div>
            <p v-if="product.price != null && quantity > 1" class="buy__sum">
              Сума: <strong>{{ formatPrice(currentPrice * quantity) }}</strong>
            </p>
            <p v-if="upsell" class="buy__upsell">
              <AppIcon name="percent" :size="16" />
              Ще {{ qty(upsell.min_qty - quantity, product.unit) }} — і ціна буде {{ formatPrice(upsell.price) }} за {{ product.unit }}
            </p>
            <p v-if="product.price == null" class="buy__note">
              Додайте товар у кошик і оформіть заявку — менеджер підготує комерційну пропозицію.
            </p>
          </div>

          <div class="help">
            <span class="help__icon"><AppIcon name="users" :size="22" /></span>
            <div>
              <strong>Потрібна консультація агронома?</strong>
              <p>Телефонуйте: <a :href="SHOP.phoneHref">{{ SHOP.phone }}</a></p>
            </div>
            <button
              v-if="assistant.enabled"
              type="button"
              class="btn btn--outline btn--sm help__ai"
              @click="assistant.ask(`Розкажи про товар «${product.name}»: для чого він, як застосовувати і скільки потрібно на мою площу?`)"
            >
              <AppIcon name="sparkles" :size="16" /> Запитати AI
            </button>
          </div>
        </div>
      </div>

      <div class="details">
        <div class="tabs">
          <div class="tabs__head" role="tablist">
            <button :class="{ active: tab === 'description' }" role="tab" @click="tab = 'description'">Опис</button>
            <button :class="{ active: tab === 'specs' }" role="tab" @click="tab = 'specs'">Характеристики</button>
            <button v-if="product.documents?.length" :class="{ active: tab === 'docs' }" role="tab" @click="tab = 'docs'">
              Документи <small>{{ product.documents.length }}</small>
            </button>
            <button :class="{ active: tab === 'delivery' }" role="tab" @click="tab = 'delivery'">Доставка та оплата</button>
          </div>
          <div class="tabs__body">
            <div v-if="tab === 'description'" class="description">
              {{ product.description || 'Опис товару незабаром з’явиться.' }}
            </div>
            <table v-else-if="tab === 'specs'" class="specs">
              <tr v-for="[k, v] in specs" :key="k">
                <th>{{ k }}</th>
                <td>{{ v }}</td>
              </tr>
            </table>
            <ul v-else-if="tab === 'docs'" class="docs">
              <li v-for="d in product.documents" :key="d.url">
                <a :href="d.url" target="_blank" rel="noopener" class="doc">
                  <span class="doc__icon"><AppIcon name="file-text" :size="22" /></span>
                  <span class="doc__title">{{ d.title }}</span>
                  <AppIcon name="download" :size="18" class="doc__dl" />
                </a>
              </li>
            </ul>
            <div v-else class="delivery">
              <p><AppIcon name="truck" :size="18" /> Доставка по всій Україні: Нова Пошта або власним транспортом (для великих партій).</p>
              <p><AppIcon name="map-pin" :size="18" /> Самовивіз зі складу — у робочий час.</p>
              <p><AppIcon name="receipt" :size="18" /> Оплата: безготівковий розрахунок з ПДВ, на картку або при отриманні.</p>
            </div>
          </div>
        </div>

        <aside v-if="hasCalculator" class="details__side">
          <RateCalculator :product="product" @add="addToCart" />
        </aside>
      </div>

      <section v-if="product.related?.length" class="section section--tight">
        <h2>Схожі товари</h2>
        <div class="products-grid">
          <ProductCard v-for="p in product.related" :key="p.id" :product="p" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.product {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 48px;
  align-items: start;
}
.product--loading { margin-top: 64px; }
.gallery { position: sticky; top: calc(var(--header-h) + 20px); }
.gallery__main {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-lg);
  background: #f6f7f3;
  overflow: hidden;
}
.gallery__badges { position: absolute; top: 18px; left: 18px; display: flex; gap: 8px; }
.gallery__thumbs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 12px;
}
.gallery__thumb {
  aspect-ratio: 1 / 1;
  padding: 0;
  background: #f6f7f3;
  border: 2px solid transparent;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
}
.gallery__thumb.active { border-color: var(--c-primary); }

.info__top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 13px; }
.info h1 { font-size: clamp(26px, 3vw, 38px); margin-bottom: 12px; }
.info__short { color: var(--c-muted); font-size: 17px; }
.info__facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 20px;
  margin: 0 0 18px;
  font-size: 14px;
}
.info__facts dt { color: var(--c-muted); }
.info__facts dd { margin: 0; font-weight: 500; }

.targets { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 22px; }
.targets__label { font-size: 13px; color: var(--c-muted); margin-right: 4px; }
.targets .chip { padding: 5px 12px; font-size: 12px; }

.buy {
  padding: 24px;
  border-radius: var(--radius-lg);
  background: #fff;
  box-shadow: 0 0 0 1px var(--c-border), var(--shadow);
}
.buy__price { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.buy__price s { color: var(--c-muted); }
.buy__price strong { font: 800 36px var(--font-head); letter-spacing: -0.03em; }
.buy__price small { color: var(--c-muted); }
.buy__actions { display: flex; gap: 12px; flex-wrap: wrap; }
.buy__actions .btn { flex: 1; }
.buy__sum { margin: 14px 0 0; }
.buy__upsell {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--c-accent-light);
  color: #6f4a08;
  font-size: 14px;
  font-weight: 500;
}
.buy__note { margin: 12px 0 0; font-size: 13px; color: var(--c-muted); }

.tiers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}
.tiers__row {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  font-size: 13px;
  transition: all 0.2s;
}
.tiers__row span { color: var(--c-muted); }
.tiers__row strong { font-family: var(--font-head); font-size: 16px; }
.tiers__row.active { border-color: var(--c-primary); background: var(--c-primary-soft); }

.help {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 16px;
  padding: 16px 20px;
  border-radius: var(--radius);
  background: var(--c-primary-soft);
}
.help__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--c-primary);
  flex-shrink: 0;
}
.help p { margin: 0; font-size: 14px; }
.help__ai { margin-left: auto; }

.details {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 32px;
  align-items: start;
  margin-top: 56px;
}
.details:not(:has(.details__side)) { grid-template-columns: minmax(0, 1fr); }
.tabs__head {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: #f0f2ec;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
}
.tabs__head button {
  padding: 10px 20px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: 600 14px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.tabs__head button small { opacity: 0.6; }
.tabs__head button.active { background: #fff; color: var(--c-text); box-shadow: var(--shadow-xs); }
.tabs__body { padding: 28px 4px; }
.description { white-space: pre-line; line-height: 1.8; font-size: 16px; max-width: 760px; }
.specs { border-collapse: collapse; width: 100%; max-width: 760px; }
.specs th,
.specs td { padding: 12px 0; border-bottom: 1px solid var(--c-border); text-align: left; font-size: 15px; }
.specs th { width: 40%; color: var(--c-muted); font-weight: 500; }
.docs { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; max-width: 640px; }
.doc {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  color: var(--c-text);
  font-weight: 500;
}
.doc:hover { border-color: var(--c-primary); color: var(--c-primary-dark); }
.doc__icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--c-danger-light);
  color: var(--c-danger);
}
.doc__title { flex: 1; }
.doc__dl { color: var(--c-muted); }
.delivery p { display: flex; gap: 10px; align-items: flex-start; }
.delivery .icon { color: var(--c-primary); margin-top: 3px; }
.details__side { position: sticky; top: calc(var(--header-h) + 20px); }

@media (max-width: 1000px) {
  .details { grid-template-columns: minmax(0, 1fr); }
  .details__side { position: static; order: -1; }
}
@media (max-width: 860px) {
  .product { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .gallery { position: static; }
  .buy { padding: 20px; }
  .buy__price strong { font-size: 30px; }
}
</style>
