<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { useToastStore } from '@/stores/toast';
import ProductImage from '@/components/ProductImage.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const isNew = computed(() => !route.params.id);
const loading = ref(true);
const saving = ref(false);
const errors = ref({});
const categories = ref([]);
const brands = ref([]);

const form = reactive({
  name: '',
  slug: '',
  sku: '',
  category_id: '',
  brand_id: '',
  short_description: '',
  description: '',
  active_ingredient: '',
  formulation: '',
  packaging: '',
  unit: 'шт',
  price: '',
  old_price: '',
  stock: 0,
  min_stock: 5,
  crops: '',
  targets: '',
  rate_min: '',
  rate_max: '',
  rate_unit: '',
  package_size: '',
  price_tiers: [],
  documents: [],
  image_url: '',
  images: [],
  is_featured: false,
  is_active: true,
});

const UNITS = ['шт', 'каністра', 'л', 'кг', 'т', 'п.о.', 'мішок', 'уп.'];
const RATE_UNITS = ['л/га', 'кг/га', 'т/га', 'тис. насінин/га', 'л/т', 'кг/т'];

onMounted(async () => {
  try {
    const [cats, brandList] = await Promise.all([api.get('/admin/categories'), api.get('/admin/brands')]);
    categories.value = cats;
    brands.value = brandList;
    if (!isNew.value) {
      const p = await api.get(`/admin/products/${route.params.id}`);
      Object.assign(form, {
        ...p,
        category_id: p.category?.id ?? '',
        brand_id: p.brand?.id ?? '',
        price: p.price ?? '',
        old_price: p.old_price ?? '',
        crops: p.crops.join(', '),
        targets: p.targets.join(', '),
        rate_min: p.rate_min ?? '',
        rate_max: p.rate_max ?? '',
        package_size: p.package_size ?? '',
        price_tiers: p.price_tiers.map((t) => ({ ...t })),
        documents: (p.documents || []).map((d) => ({ ...d })),
        images: [...(p.images || [])],
      });
    }
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
});

function addImage() {
  form.images.push('');
}

function removeImage(i) {
  form.images.splice(i, 1);
}

async function save() {
  saving.value = true;
  errors.value = {};
  const payload = {
    ...form,
    category_id: form.category_id || null,
    brand_id: form.brand_id || null,
    images: form.images.filter((u) => u.trim()),
  };
  try {
    const saved = isNew.value
      ? await api.post('/admin/products', payload)
      : await api.put(`/admin/products/${route.params.id}`, payload);
    toast.success(isNew.value ? 'Товар створено' : 'Зміни збережено');
    if (isNew.value) router.replace(`/admin/products/${saved.id}`);
    else Object.assign(form, { slug: saved.slug });
  } catch (err) {
    errors.value = err.fields || {};
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="loading" class="spinner" />
  <form v-else class="pform" novalidate @submit.prevent="save">
    <div class="pform__main">
      <section class="card card--pad">
        <h3>Основне</h3>
        <div class="form-grid">
          <div class="field full">
            <label>Назва товару <span class="req">*</span></label>
            <input v-model="form.name" class="input" :class="{ invalid: errors.name }" />
            <span v-if="errors.name" class="error">{{ errors.name }}</span>
          </div>
          <div class="field">
            <label>Категорія</label>
            <select v-model="form.category_id" class="select">
              <option value="">— Без категорії —</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parent_id ? '— ' : '' }}{{ c.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Виробник</label>
            <select v-model="form.brand_id" class="select">
              <option value="">— Не вказано —</option>
              <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Артикул</label>
            <input v-model="form.sku" class="input" />
          </div>
          <div class="field">
            <label>URL-адреса (slug)</label>
            <input v-model="form.slug" class="input" placeholder="створиться автоматично" />
          </div>
          <div class="field full">
            <label>Короткий опис (для картки товару)</label>
            <input v-model="form.short_description" class="input" maxlength="500" />
          </div>
          <div class="field full">
            <label>Повний опис</label>
            <textarea v-model="form.description" class="textarea" rows="8" />
          </div>
        </div>
      </section>

      <section class="card card--pad">
        <h3>Характеристики</h3>
        <div class="form-grid">
          <div class="field full">
            <label>Діюча речовина / склад</label>
            <input v-model="form.active_ingredient" class="input" placeholder="Напр. Гліфосат, 480 г/л" />
          </div>
          <div class="field">
            <label>Препаративна форма</label>
            <input v-model="form.formulation" class="input" placeholder="Напр. Концентрат емульсії" />
          </div>
          <div class="field">
            <label>Упаковка</label>
            <input v-model="form.packaging" class="input" placeholder="Напр. Каністра 20 л" />
          </div>
          <div class="field full">
            <label>Культури (через кому)</label>
            <input v-model="form.crops" class="input" placeholder="Пшениця, Кукурудза, Соняшник" />
          </div>
          <div class="field full">
            <label>Проблеми, які вирішує (через кому)</label>
            <input v-model="form.targets" class="input" placeholder="Септоріоз, Іржа, Бур'яни дводольні, Попелиця" />
            <span class="hint">Використовується в «Підборі за проблемою» та в пошуку. Пишіть однаково для різних товарів.</span>
          </div>
        </div>
      </section>

      <section class="card card--pad">
        <h3>Норма витрати (калькулятор)</h3>
        <p class="muted hint">Якщо заповнити — на сторінці товару з’явиться калькулятор «скільки потрібно на мої гектари».</p>
        <div class="form-grid rate-grid">
          <div class="field">
            <label>Норма від</label>
            <input v-model="form.rate_min" class="input" :class="{ invalid: errors.rate_min }" type="number" min="0" step="any" placeholder="1.5" />
            <span v-if="errors.rate_min" class="error">{{ errors.rate_min }}</span>
          </div>
          <div class="field">
            <label>Норма до</label>
            <input v-model="form.rate_max" class="input" :class="{ invalid: errors.rate_max }" type="number" min="0" step="any" placeholder="4" />
            <span v-if="errors.rate_max" class="error">{{ errors.rate_max }}</span>
          </div>
          <div class="field">
            <label>Одиниця норми</label>
            <input v-model="form.rate_unit" class="input" list="rate-units" placeholder="л/га" />
            <datalist id="rate-units"><option v-for="u in RATE_UNITS" :key="u" :value="u" /></datalist>
          </div>
          <div class="field">
            <label>Обсяг 1 одиниці продажу</label>
            <input v-model="form.package_size" class="input" :class="{ invalid: errors.package_size }" type="number" min="0" step="any" placeholder="20" />
            <span class="hint">У тих самих одиницях, що й норма: каністра 20 л → 20; 1 т добрива при кг/га → 1000</span>
          </div>
        </div>
      </section>

      <section class="card card--pad">
        <h3>Документи (інструкції, сертифікати)</h3>
        <p class="muted hint">Лише посилання на PDF-файли (з інтернету або з папки <code>frontend/public/docs</code>, напр. <code>/docs/instrukciya.pdf</code>).</p>
        <div class="admin-subtable">
          <div v-for="(d, i) in form.documents" :key="i" class="admin-subtable__row">
            <input v-model="d.title" class="input" placeholder="Назва, напр. «Інструкція із застосування»" />
            <input v-model.trim="d.url" class="input" placeholder="https://…/file.pdf" />
            <button type="button" class="btn btn--ghost btn--icon" aria-label="Прибрати" @click="form.documents.splice(i, 1)"><AppIcon name="x" :size="18" /></button>
          </div>
          <span v-if="errors.documents" class="error">{{ errors.documents }}</span>
          <button type="button" class="btn btn--outline btn--sm add-img" @click="form.documents.push({ title: '', url: '' })">+ Додати документ</button>
        </div>
      </section>

      <section class="card card--pad">
        <h3>Фото (лише посилання)</h3>
        <p class="muted hint">
          У базі зберігаються тільки посилання. Вставте повну адресу фото
          (<code>https://…/foto.jpg</code>) або шлях до файлу з папки <code>frontend/public/images</code>
          (<code>/images/foto.jpg</code>).
        </p>
        <div class="field">
          <label>Посилання на головне фото</label>
          <div class="img-row">
            <div class="admin-thumb big"><ProductImage :src="form.image_url" /></div>
            <input v-model.trim="form.image_url" class="input" :class="{ invalid: errors.image_url }" placeholder="https://…" />
          </div>
          <span v-if="errors.image_url" class="error">{{ errors.image_url }}</span>
        </div>
        <div class="field extra">
          <label>Додаткові фото (галерея)</label>
          <div v-for="(url, i) in form.images" :key="i" class="img-row">
            <div class="admin-thumb big"><ProductImage :src="url" /></div>
            <input v-model.trim="form.images[i]" class="input" placeholder="https://…" />
            <button type="button" class="btn btn--ghost btn--icon" aria-label="Прибрати" @click="removeImage(i)"><AppIcon name="x" :size="18" /></button>
          </div>
          <span v-if="errors.images" class="error">{{ errors.images }}</span>
          <button type="button" class="btn btn--outline btn--sm add-img" @click="addImage">+ Додати фото</button>
        </div>
      </section>
    </div>

    <aside class="pform__side">
      <section class="card card--pad">
        <h3>Ціна та наявність</h3>
        <div class="side-fields">
          <div class="field">
            <label>Ціна, грн</label>
            <input v-model="form.price" class="input" :class="{ invalid: errors.price }" type="number" min="0" step="0.01" placeholder="порожньо = ціна за запитом" />
            <span v-if="errors.price" class="error">{{ errors.price }}</span>
          </div>
          <div class="field">
            <label>Стара ціна (для знижки)</label>
            <input v-model="form.old_price" class="input" :class="{ invalid: errors.old_price }" type="number" min="0" step="0.01" />
            <span v-if="errors.old_price" class="error">{{ errors.old_price }}</span>
          </div>
          <div class="field">
            <label>Одиниця продажу</label>
            <input v-model="form.unit" class="input" list="units" />
            <datalist id="units"><option v-for="u in UNITS" :key="u" :value="u" /></datalist>
          </div>
          <div class="field">
            <label>Залишок на складі</label>
            <input v-model.number="form.stock" class="input" :class="{ invalid: errors.stock }" type="number" min="0" step="1" />
            <span v-if="errors.stock" class="error">{{ errors.stock }}</span>
          </div>
          <div class="field">
            <label>Нагадати, коли залишиться</label>
            <input v-model.number="form.min_stock" class="input" :class="{ invalid: errors.min_stock }" type="number" min="0" step="1" />
            <span v-if="errors.min_stock" class="error">{{ errors.min_stock }}</span>
            <span v-else class="hint">Товар потрапить у список «Закінчується» на головній адмінки</span>
          </div>
          <div class="field">
            <label>Оптові ціни</label>
            <div class="admin-subtable">
              <div v-for="(t, i) in form.price_tiers" :key="i" class="admin-subtable__row">
                <input v-model.number="t.min_qty" class="input" type="number" min="2" placeholder="від, шт" title="Від скількох одиниць" />
                <input v-model.number="t.price" class="input" type="number" min="0" step="0.01" placeholder="ціна" title="Ціна за одиницю" />
                <button type="button" class="btn btn--ghost btn--icon" aria-label="Прибрати" @click="form.price_tiers.splice(i, 1)"><AppIcon name="x" :size="18" /></button>
              </div>
              <span v-if="errors.price_tiers" class="error">{{ errors.price_tiers }}</span>
              <button type="button" class="btn btn--outline btn--sm add-img" @click="form.price_tiers.push({ min_qty: '', price: '' })">+ Оптова ціна</button>
            </div>
            <span class="hint">Напр.: від 10 шт — 3 800 грн, від 40 шт — 3 650 грн</span>
          </div>
          <label class="checkbox"><input v-model="form.is_active" type="checkbox" /> Показувати на сайті</label>
          <label class="checkbox"><input v-model="form.is_featured" type="checkbox" /> Хіт продажів (на головній)</label>
        </div>
      </section>
      <div class="side-actions">
        <button class="btn btn--lg btn--block" :disabled="saving">{{ saving ? 'Збереження…' : 'Зберегти' }}</button>
        <RouterLink to="/admin/products" class="btn btn--ghost btn--block">← До списку</RouterLink>
        <a v-if="!isNew && form.slug" :href="`/product/${form.slug}`" target="_blank" class="btn btn--outline btn--block">Переглянути на сайті</a>
      </div>
    </aside>
  </form>
</template>

<style scoped>
.pform {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: start;
}
.pform__main { display: flex; flex-direction: column; gap: 20px; }
.pform__side { position: sticky; top: 20px; display: flex; flex-direction: column; gap: 16px; }
.side-fields { display: flex; flex-direction: column; gap: 14px; }
.side-actions { display: flex; flex-direction: column; gap: 8px; }
.hint { font-size: 13px; }
.hint code { background: var(--c-primary-light); padding: 1px 6px; border-radius: 4px; }
.img-row { display: flex; gap: 10px; align-items: center; }
.admin-thumb.big { width: 56px; height: 56px; }
.extra { margin-top: 18px; gap: 10px; }
.add-img { align-self: flex-start; }
.rate-grid { margin-top: 12px; }
@media (max-width: 1000px) {
  .pform { grid-template-columns: 1fr; }
  .pform__side { position: static; }
}
</style>
